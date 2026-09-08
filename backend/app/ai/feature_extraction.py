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
        """Compute key physical acoustic features useful for synthetic artifact detection."""
        if len(waveform) < 256:
            return {
                "spectral_centroid": 0.0,
                "spectral_flatness": 0.0,
                "spectral_rolloff": 0.0,
                "zero_crossing_rate": 0.0,
                "rms_energy": 0.0,
            }

        # FFT
        n_fft = min(512, len(waveform))
        window = np.hanning(n_fft)
        slice_wf = waveform[:n_fft] * window
        fft_mag = np.abs(np.fft.rfft(slice_wf))
        freqs = np.fft.rfftfreq(n_fft, d=1.0 / sr)

        # 1. Spectral Centroid
        mag_sum = np.sum(fft_mag)
        centroid = float(np.sum(freqs * fft_mag) / max(mag_sum, 1e-6))

        # 2. Spectral Flatness (ratio of geometric to arithmetic mean)
        positive_mag = np.maximum(fft_mag, 1e-6)
        geo_mean = float(np.exp(np.mean(np.log(positive_mag))))
        arith_mean = float(np.mean(positive_mag))
        flatness = float(min(1.0, geo_mean / max(arith_mean, 1e-6)))

        # 3. Spectral Roll-off (frequency below which 85% energy resides)
        cumsum = np.cumsum(fft_mag)
        rolloff_threshold = 0.85 * (cumsum[-1] if len(cumsum) > 0 else 1.0)
        rolloff_idx = np.where(cumsum >= rolloff_threshold)[0]
        rolloff = float(freqs[rolloff_idx[0]]) if len(rolloff_idx) > 0 else float(freqs[-1])

        # 4. Zero Crossing Rate
        zcr = float(np.mean(np.abs(np.diff(np.sign(waveform)))) / 2.0)

        # 5. RMS Energy
        rms = float(np.sqrt(np.mean(waveform ** 2)))

        return {
            "spectral_centroid": round(centroid, 2),
            "spectral_flatness": round(flatness, 4),
            "spectral_rolloff": round(rolloff, 2),
            "zero_crossing_rate": round(zcr, 4),
            "rms_energy": round(rms, 4),
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
