"""VoxShield AI — Audio Feature Extraction & Digital Signal Processing."""

import io
import math
import struct
import wave
from typing import Dict, List, Optional, Tuple, Union
import numpy as np


class AudioFeatureExtractor:
    """Model-agnostic digital signal processing and acoustic feature extraction."""

    def __init__(self, default_sr: int = 16000):
        self.default_sr = default_sr

    def extract_waveform(
        self,
        audio_bytes: bytes,
        target_sr: Optional[int] = None,
        trim_silence: bool = True,
    ) -> Tuple[np.ndarray, int]:
        """Decode audio bytes to 1D float32 normalized waveform array in [-1.0, 1.0]."""
        target_sr = target_sr or self.default_sr

        if not audio_bytes:
            return np.zeros(target_sr, dtype=np.float32), target_sr

        # 1. Attempt standard WAV container parsing
        if audio_bytes[:4] == b"RIFF" and b"WAVE" in audio_bytes[:16]:
            try:
                with wave.open(io.BytesIO(audio_bytes), "rb") as wf:
                    n_channels = wf.getnchannels()
                    sampwidth = wf.getsampwidth()
                    orig_sr = wf.getframerate()
                    n_frames = wf.getnframes()
                    frames = wf.readframes(n_frames)

                if sampwidth == 2:
                    raw_data = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
                elif sampwidth == 1:
                    raw_data = (np.frombuffer(frames, dtype=np.uint8).astype(np.float32) - 128.0) / 128.0
                elif sampwidth == 4:
                    raw_data = np.frombuffer(frames, dtype=np.int32).astype(np.float32) / 2147483648.0
                else:
                    raw_data = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0

                # Convert stereo to mono
                if n_channels > 1:
                    raw_data = raw_data.reshape(-1, n_channels).mean(axis=1)

                # Resample if needed
                if orig_sr != target_sr and len(raw_data) > 1:
                    raw_data = self._resample_linear(raw_data, orig_sr, target_sr)

                waveform = raw_data
            except Exception:
                waveform = self._fallback_parse_raw_pcm(audio_bytes)
        else:
            waveform = self._fallback_parse_raw_pcm(audio_bytes)

        # Trim low-energy silence if requested
        if trim_silence and len(waveform) > 1600:
            waveform = self._trim_silence(waveform, threshold=0.01)

        # Ensure normalized
        max_val = np.max(np.abs(waveform)) if len(waveform) > 0 else 0.0
        if max_val > 0.0:
            waveform = waveform / max(max_val, 1e-4)

        return waveform.astype(np.float32), target_sr

    def _fallback_parse_raw_pcm(self, audio_bytes: bytes) -> np.ndarray:
        """Interpret arbitrary byte buffers as 16-bit PCM samples."""
        n_samples = len(audio_bytes) // 2
        if n_samples == 0:
            return np.zeros(self.default_sr, dtype=np.float32)
        try:
            trimmed_bytes = audio_bytes[: n_samples * 2]
            return np.frombuffer(trimmed_bytes, dtype=np.int16).astype(np.float32) / 32768.0
        except Exception:
            return np.frombuffer(audio_bytes, dtype=np.uint8).astype(np.float32) / 255.0

    def _resample_linear(self, audio: np.ndarray, orig_sr: int, target_sr: int) -> np.ndarray:
        """Linear interpolation resampling."""
        if orig_sr == target_sr or len(audio) == 0:
            return audio
        duration = len(audio) / orig_sr
        target_len = int(round(duration * target_sr))
        if target_len <= 1:
            return audio
        orig_indices = np.linspace(0, len(audio) - 1, num=len(audio))
        target_indices = np.linspace(0, len(audio) - 1, num=target_len)
        return np.interp(target_indices, orig_indices, audio)

    def _trim_silence(self, audio: np.ndarray, threshold: float = 0.01, frame_length: int = 512) -> np.ndarray:
        """Trim silence from start and end based on RMS energy."""
        if len(audio) < frame_length * 2:
            return audio
        # Compute frame energy
        num_frames = len(audio) // frame_length
        energies = [
            np.sqrt(np.mean(audio[i * frame_length : (i + 1) * frame_length] ** 2))
            for i in range(num_frames)
        ]
        non_silent = [i for i, e in enumerate(energies) if e > threshold]
        if not non_silent:
            return audio
        start_idx = non_silent[0] * frame_length
        end_idx = min(len(audio), (non_silent[-1] + 1) * frame_length)
        return audio[start_idx:end_idx]

    def extract_log_mel_spectrogram(
        self,
        waveform: np.ndarray,
        sr: int = 16000,
        n_mels: int = 80,
        n_fft: int = 512,
        hop_length: int = 160,
    ) -> np.ndarray:
        """Compute log-mel filterbank spectrogram (shape: [n_mels, n_frames])."""
        if len(waveform) < n_fft:
            waveform = np.pad(waveform, (0, n_fft - len(waveform)))

        # Frame windowing with Hanning window
        window = np.hanning(n_fft)
        num_frames = 1 + (len(waveform) - n_fft) // hop_length
        frames = np.lib.stride_tricks.as_strided(
            waveform,
            shape=(num_frames, n_fft),
            strides=(waveform.strides[0] * hop_length, waveform.strides[0]),
        )
        windowed_frames = frames * window

        # Compute STFT magnitude spectrum
        fft_complex = np.fft.rfft(windowed_frames, n=n_fft)
        magnitude = np.abs(fft_complex) ** 2  # Power spectrum

        # Construct mel filterbank
        mel_fb = self._create_mel_filterbank(sr, n_fft, n_mels)

        # Apply mel filters and log scale
        mel_spectrogram = np.dot(magnitude, mel_fb.T)  # Shape: [num_frames, n_mels]
        log_mel = np.log(np.maximum(mel_spectrogram, 1e-6)).T  # Shape: [n_mels, num_frames]
        return log_mel.astype(np.float32)

    def _create_mel_filterbank(self, sr: int, n_fft: int, n_mels: int) -> np.ndarray:
        """Create triangular mel scale filterbank."""
        f_min = 0.0
        f_max = sr / 2.0

        def hz_to_mel(hz):
            return 2595.0 * np.log10(1.0 + hz / 700.0)

        def mel_to_hz(mel):
            return 700.0 * (10.0 ** (mel / 2595.0) - 1.0)

        mel_points = np.linspace(hz_to_mel(f_min), hz_to_mel(f_max), n_mels + 2)
        hz_points = mel_to_hz(mel_points)
        bin_points = np.floor((n_fft + 1) * hz_points / sr).astype(int)

        n_freqs = n_fft // 2 + 1
        filterbank = np.zeros((n_mels, n_freqs), dtype=np.float32)

        for m in range(1, n_mels + 1):
            f_m_minus = bin_points[m - 1]
            f_m = bin_points[m]
            f_m_plus = bin_points[m + 1]

            for k in range(f_m_minus, f_m):
                if f_m > f_m_minus:
                    filterbank[m - 1, k] = (k - f_m_minus) / (f_m - f_m_minus)
            for k in range(f_m, f_m_plus):
                if f_m_plus > f_m:
                    filterbank[m - 1, k] = (f_m_plus - k) / (f_m_plus - f_m)

        return filterbank

    def extract_mfcc(
        self,
        waveform: np.ndarray,
        sr: int = 16000,
        n_mfcc: int = 13,
        n_mels: int = 40,
    ) -> np.ndarray:
        """Extract Mel-Frequency Cepstral Coefficients (shape: [n_mfcc, n_frames])."""
        log_mel = self.extract_log_mel_spectrogram(waveform, sr=sr, n_mels=n_mels)
        # Apply Discrete Cosine Transform (DCT-II) across mel bins
        num_mels, num_frames = log_mel.shape
        mfcc = np.zeros((n_mfcc, num_frames), dtype=np.float32)

        for i in range(n_mfcc):
            factor = np.cos(math.pi * i * (np.arange(num_mels) + 0.5) / num_mels)
            mfcc[i, :] = np.dot(factor, log_mel)

        return mfcc

    def extract_spectral_features(self, waveform: np.ndarray, sr: int = 16000) -> Dict[str, float]:
        """Compute key physical acoustic features across frames for synthetic artifact detection."""
        if len(waveform) < 256:
            return {
                "spectral_centroid": 0.0,
                "spectral_bandwidth": 0.0,
                "spectral_flatness": 0.0,
                "spectral_rolloff": 0.0,
                "spectral_rolloff_95": 0.0,
                "spectral_flux": 0.0,
                "zero_crossing_rate": 0.0,
                "rms_energy": 0.0,
            }

        n_fft = min(512, len(waveform))
        hop_length = min(256, n_fft // 2)
        window = np.hanning(n_fft)
        freqs = np.fft.rfftfreq(n_fft, d=1.0 / sr)

        num_frames = max(1, (len(waveform) - n_fft) // hop_length + 1)
        centroids = []
        bandwidths = []
        flatnesses = []
        rolloffs_85 = []
        rolloffs_95 = []
        prev_mag = None
        flux_values = []

        for i in range(num_frames):
            frame = waveform[i * hop_length : i * hop_length + n_fft]
            if len(frame) < n_fft:
                frame = np.pad(frame, (0, n_fft - len(frame)))
            windowed = frame * window
            fft_mag = np.abs(np.fft.rfft(windowed))
            mag_sum = float(np.sum(fft_mag))

            # Skip near-silent frames
            if mag_sum < 1e-4:
                continue

            # 1. Centroid
            c = float(np.sum(freqs * fft_mag) / max(mag_sum, 1e-6))
            centroids.append(c)

            # 2. Bandwidth
            bw = float(np.sqrt(np.sum(((freqs - c) ** 2) * fft_mag) / max(mag_sum, 1e-6)))
            bandwidths.append(bw)

            # 3. Flatness
            pos_mag = np.maximum(fft_mag, 1e-6)
            geo_mean = float(np.exp(np.mean(np.log(pos_mag))))
            arith_mean = float(np.mean(pos_mag))
            flatnesses.append(float(min(1.0, geo_mean / max(arith_mean, 1e-6))))

            # 4. Roll-off (85% and 95%)
            cumsum = np.cumsum(fft_mag)
            total = cumsum[-1] if len(cumsum) > 0 else 1.0
            r85_idx = np.where(cumsum >= 0.85 * total)[0]
            rolloffs_85.append(float(freqs[r85_idx[0]]) if len(r85_idx) > 0 else float(freqs[-1]))
            r95_idx = np.where(cumsum >= 0.95 * total)[0]
            rolloffs_95.append(float(freqs[r95_idx[0]]) if len(r95_idx) > 0 else float(freqs[-1]))

            # 5. Spectral Flux
            if prev_mag is not None:
                diff = np.abs(fft_mag - prev_mag)
                flux_values.append(float(np.mean(diff) / max(np.mean(fft_mag), 1e-5)))
            prev_mag = fft_mag

        centroid = float(np.mean(centroids)) if centroids else 0.0
        bandwidth = float(np.mean(bandwidths)) if bandwidths else 0.0
        flatness = float(np.mean(flatnesses)) if flatnesses else 0.0
        rolloff_85 = float(np.mean(rolloffs_85)) if rolloffs_85 else 0.0
        rolloff_95 = float(np.mean(rolloffs_95)) if rolloffs_95 else 0.0
        spectral_flux = float(np.mean(flux_values)) if flux_values else 0.0

        # Zero Crossing Rate across full waveform
        zcr = float(np.mean(np.abs(np.diff(np.sign(waveform)))) / 2.0)
        # RMS Energy across full waveform
        rms = float(np.sqrt(np.mean(waveform ** 2)))

        return {
            "spectral_centroid": round(centroid, 2),
            "spectral_bandwidth": round(bandwidth, 2),
            "spectral_flatness": round(flatness, 4),
            "spectral_rolloff": round(rolloff_85, 2),
            "spectral_rolloff_95": round(rolloff_95, 2),
            "spectral_flux": round(spectral_flux, 4),
            "zero_crossing_rate": round(zcr, 4),
            "rms_energy": round(rms, 4),
        }

    def extract_pitch_f0(
        self,
        waveform: np.ndarray,
        sr: int = 16000,
        frame_len: int = 512,
        hop_len: int = 256,
        f_min: float = 70.0,
        f_max: float = 400.0,
    ) -> Dict[str, float]:
        """Estimate fundamental frequency (F0) contour and dynamics via normalized autocorrelation."""
        if len(waveform) < frame_len:
            return {
                "mean_f0": 0.0,
                "f0_std": 0.0,
                "f0_range": 0.0,
                "voiced_ratio": 0.0,
                "pitch_jump_rate": 0.0,
                "f0_jitter": 0.0,
                "f0_shimmer": 0.0,
            }

        min_lag = max(1, int(sr / f_max))
        max_lag = min(frame_len - 1, int(sr / f_min))

        num_frames = max(1, (len(waveform) - frame_len) // hop_len + 1)
        f0_estimates: List[float] = []
        frame_amplitudes: List[float] = []

        for i in range(num_frames):
            frame = waveform[i * hop_len : i * hop_len + frame_len]
            # Zero-mean the frame
            frame = frame - np.mean(frame)
            frame_energy = float(np.sum(frame ** 2))
            if frame_energy < 1e-4:
                continue  # Unvoiced / silence

            # Autocorrelation
            corr = np.correlate(frame, frame, mode="full")[frame_len - 1 :]
            norm_corr = corr / max(frame_energy, 1e-6)

            if max_lag < len(norm_corr):
                search_region = norm_corr[min_lag:max_lag]
                if len(search_region) > 0:
                    peak_idx = int(np.argmax(search_region))
                    peak_val = float(search_region[peak_idx])
                    if peak_val > 0.28:  # Voicing threshold
                        lag = min_lag + peak_idx
                        f0 = float(sr / lag)
                        f0_estimates.append(f0)
                        frame_amplitudes.append(float(np.sqrt(frame_energy / frame_len)))

        voiced_ratio = len(f0_estimates) / float(max(num_frames, 1))

        if len(f0_estimates) >= 2:
            f0_arr = np.array(f0_estimates)
            mean_f0 = float(np.mean(f0_arr))
            f0_std = float(np.std(f0_arr))
            f0_range = float(np.max(f0_arr) - np.min(f0_arr))
            diffs = np.abs(np.diff(f0_arr))
            pitch_jumps = int(np.sum(diffs > 35.0))
            jump_rate = float(pitch_jumps / max(len(diffs), 1))
            # Relative cycle-to-cycle F0 jitter
            rel_diffs = diffs / np.maximum(f0_arr[:-1], 1.0)
            f0_jitter = float(np.mean(rel_diffs))
            # Amplitude shimmer across consecutive voiced frames
            if len(frame_amplitudes) >= 2:
                amp_arr = np.array(frame_amplitudes)
                amp_diffs = np.abs(np.diff(amp_arr)) / np.maximum(amp_arr[:-1], 1e-4)
                f0_shimmer = float(np.mean(amp_diffs))
            else:
                f0_shimmer = 0.0
        elif len(f0_estimates) == 1:
            mean_f0 = float(f0_estimates[0])
            f0_std = 0.0
            f0_range = 0.0
            jump_rate = 0.0
            f0_jitter = 0.0
            f0_shimmer = 0.0
        else:
            mean_f0 = 0.0
            f0_std = 0.0
            f0_range = 0.0
            jump_rate = 0.0
            f0_jitter = 0.0
            f0_shimmer = 0.0

        return {
            "mean_f0": round(mean_f0, 2),
            "f0_std": round(f0_std, 2),
            "f0_range": round(f0_range, 2),
            "voiced_ratio": round(voiced_ratio, 4),
            "pitch_jump_rate": round(jump_rate, 4),
            "f0_jitter": round(f0_jitter, 5),
            "f0_shimmer": round(f0_shimmer, 5),
        }

    def extract_subband_energy(
        self,
        waveform: np.ndarray,
        sr: int = 16000,
    ) -> Dict[str, float]:
        """Compute relative energy distribution across acoustic subbands across full audio."""
        if len(waveform) < 256:
            return {"low_ratio": 0.33, "mid_ratio": 0.33, "high_ratio": 0.34}

        n_fft = min(1024, len(waveform))
        hop_length = n_fft // 2
        window = np.hanning(n_fft)
        freqs = np.fft.rfftfreq(n_fft, d=1.0 / sr)

        low_mask = freqs <= 1000.0
        mid_mask = (freqs > 1000.0) & (freqs <= 4000.0)
        high_mask = freqs > 4000.0

        num_frames = max(1, (len(waveform) - n_fft) // hop_length + 1)
        low_energies, mid_energies, high_energies = [], [], []

        for i in range(num_frames):
            frame = waveform[i * hop_length : i * hop_length + n_fft]
            if len(frame) < n_fft:
                frame = np.pad(frame, (0, n_fft - len(frame)))
            fft_mag = np.abs(np.fft.rfft(frame * window)) ** 2
            total = max(float(np.sum(fft_mag)), 1e-8)

            low_energies.append(float(np.sum(fft_mag[low_mask]) / total))
            mid_energies.append(float(np.sum(fft_mag[mid_mask]) / total))
            high_energies.append(float(np.sum(fft_mag[high_mask]) / total))

        low_e = float(np.mean(low_energies)) if low_energies else 0.33
        mid_e = float(np.mean(mid_energies)) if mid_energies else 0.33
        high_e = float(np.mean(high_energies)) if high_energies else 0.34

        return {
            "low_ratio": round(low_e, 4),
            "mid_ratio": round(mid_e, 4),
            "high_ratio": round(high_e, 4),
        }

    def split_into_windows(
        self,
        waveform: np.ndarray,
        sr: int = 16000,
        window_ms: int = 1500,
        hop_ms: int = 1000,
    ) -> List[np.ndarray]:
        """Chunk waveform into overlapping temporal windows for streaming analysis."""
        window_samples = int((window_ms / 1000.0) * sr)
        hop_samples = int((hop_ms / 1000.0) * sr)

        if len(waveform) <= window_samples:
            return [waveform]

        windows = []
        for start in range(0, len(waveform) - window_samples + 1, hop_samples):
            windows.append(waveform[start : start + window_samples])

        return windows

    def sliding_window_chunks(
        self,
        waveform: np.ndarray,
        window_size: int = 16000,
        hop_size: int = 8000,
    ) -> List[np.ndarray]:
        """Sample-based sliding window chunking."""
        if len(waveform) <= window_size:
            return [waveform]

        windows = []
        for start in range(0, len(waveform) - window_size + 1, hop_size):
            windows.append(waveform[start : start + window_size])

        return windows



# Global feature extractor instance
audio_feature_extractor = AudioFeatureExtractor()
