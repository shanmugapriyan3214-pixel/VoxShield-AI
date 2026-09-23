"""VoxShield AI — Audio Quality Assessment & Gating Engine.

Performs rigorous physical checks prior to AI/biometric inference:
- Duration validation (rejecting samples too short for reliable analysis)
- Clipping and dynamic range distortion detection
- Energy level and silence gating
- Noise floor and estimated Signal-to-Noise Ratio (SNR)
- Corrupted audio detection (NaNs, Infs, malformed frames)

If audio quality is insufficient, signals the pipeline to yield UNCERTAIN
rather than generating an inaccurate or false prediction.
"""

from dataclasses import dataclass, field
from typing import List, Tuple
import numpy as np


@dataclass
class AudioQualityReport:
    """Detailed acoustic signal quality audit."""
    is_acceptable: bool
    quality_score: float  # 0.0 (unusable) to 1.0 (studio quality)
    status: str           # "GOOD" | "ACCEPTABLE" | "POOR" | "INSUFFICIENT"
    duration_sec: float
    rms_energy: float
    peak_amplitude: float
    clipping_ratio: float
    estimated_snr_db: float
    issues: List[str] = field(default_factory=list)

    @property
    def snr_db(self) -> float:
        return self.estimated_snr_db

    def to_dict(self) -> dict:
        return {
            "is_acceptable": self.is_acceptable,
            "quality_score": round(self.quality_score, 4),
            "status": self.status,
            "duration_sec": round(self.duration_sec, 3),
            "rms_energy": round(self.rms_energy, 4),
            "peak_amplitude": round(self.peak_amplitude, 4),
            "clipping_ratio": round(self.clipping_ratio, 4),
            "estimated_snr_db": round(self.estimated_snr_db, 2),
            "snr_db": round(self.estimated_snr_db, 2),
            "issues": self.issues,
        }


class AudioQualityChecker:
    """Evaluates raw acoustic waveforms for physical recording integrity."""

    def __init__(
        self,
        min_duration_sec: float = 0.6,
        optimal_duration_sec: float = 1.5,
        max_clipping_ratio: float = 0.02,
        min_rms_energy: float = 0.005,
        min_peak_amplitude: float = 0.03,
        min_snr_db: float = 6.0,
    ):
        self.min_duration_sec = min_duration_sec
        self.optimal_duration_sec = optimal_duration_sec
        self.max_clipping_ratio = max_clipping_ratio
        self.min_rms_energy = min_rms_energy
        self.min_peak_amplitude = min_peak_amplitude
        self.min_snr_db = min_snr_db

    def evaluate(self, waveform: np.ndarray, sr: int = 16000) -> AudioQualityReport:
        """Run comprehensive signal quality diagnostic on 1D normalized float32 waveform."""
        issues: List[str] = []

        if len(waveform) == 0:
            return AudioQualityReport(
                is_acceptable=False,
                quality_score=0.0,
                status="INSUFFICIENT",
                duration_sec=0.0,
                rms_energy=0.0,
                peak_amplitude=0.0,
                clipping_ratio=0.0,
                estimated_snr_db=0.0,
                issues=["Audio buffer is empty or contains zero samples."],
            )

        # 1. Check for NaNs and Infs (Corruption)
        if np.any(np.isnan(waveform)) or np.any(np.isinf(waveform)):
            return AudioQualityReport(
                is_acceptable=False,
                quality_score=0.0,
                status="INSUFFICIENT",
                duration_sec=len(waveform) / max(sr, 1),
                rms_energy=0.0,
                peak_amplitude=0.0,
                clipping_ratio=0.0,
                estimated_snr_db=0.0,
                issues=["Corrupted audio stream: contains NaN or infinite values."],
            )

        duration_sec = len(waveform) / float(sr)
        peak_amplitude = float(np.max(np.abs(waveform)))
        rms_energy = float(np.sqrt(np.mean(waveform ** 2)))

        # 2. Duration Check
        if duration_sec < self.min_duration_sec:
            issues.append(f"Audio sample too short ({duration_sec:.2f}s < {self.min_duration_sec:.1f}s threshold).")
        elif duration_sec < self.optimal_duration_sec:
            issues.append(f"Brief audio sample ({duration_sec:.2f}s); confidence may be reduced.")

        # 3. Amplitude & Silence Check
        if peak_amplitude < self.min_peak_amplitude or rms_energy < self.min_rms_energy:
            issues.append(f"Audio is silent or extremely quiet (RMS: {rms_energy:.4f}, Peak: {peak_amplitude:.4f}).")

        # 4. Clipping & Distortion Check
        clipping_samples = np.sum(np.abs(waveform) >= 0.985)
        clipping_ratio = float(clipping_samples / len(waveform))
        if clipping_ratio > self.max_clipping_ratio:
            issues.append(f"Acoustic clipping detected ({clipping_ratio * 100:.1f}% samples clipped).")

        # 5. SNR (Signal-to-Noise Ratio) Estimation
        frame_len = min(512, len(waveform))
        num_frames = max(1, len(waveform) // frame_len)
        frame_energies = [
            float(np.mean(waveform[i * frame_len : (i + 1) * frame_len] ** 2))
            for i in range(num_frames)
        ]
        sorted_energies = sorted(frame_energies)
        noise_floor = np.mean(sorted_energies[: max(1, num_frames // 10)])  # bottom 10%
        signal_level = np.mean(sorted_energies[max(0, int(num_frames * 0.5)):])  # top 50%

        if noise_floor > 1e-9:
            estimated_snr_db = float(10.0 * np.log10(max(signal_level, 1e-9) / noise_floor))
        else:
            estimated_snr_db = 40.0

        if estimated_snr_db < self.min_snr_db:
            issues.append(f"High background noise detected (estimated SNR: {estimated_snr_db:.1f} dB).")

        # Quality scoring formula (bounded 0.0 to 1.0)
        score = 1.0
        if duration_sec < self.min_duration_sec:
            score -= 0.55
        elif duration_sec < self.optimal_duration_sec:
            score -= 0.15

        if peak_amplitude < self.min_peak_amplitude:
            score -= 0.40
        if clipping_ratio > self.max_clipping_ratio:
            score -= min(0.35, clipping_ratio * 2.5)
        if estimated_snr_db < self.min_snr_db:
            score -= min(0.30, (self.min_snr_db - estimated_snr_db) * 0.05)

        score = float(max(0.0, min(1.0, score)))

        if score >= 0.75:
            status = "GOOD"
        elif score >= 0.50:
            status = "ACCEPTABLE"
        elif score >= 0.25:
            status = "POOR"
        else:
            status = "INSUFFICIENT"

        # Hard failure threshold
        is_acceptable = (
            duration_sec >= self.min_duration_sec
            and rms_energy >= self.min_rms_energy
            and score >= 0.35
        )

        return AudioQualityReport(
            is_acceptable=is_acceptable,
            quality_score=score,
            status=status,
            duration_sec=duration_sec,
            rms_energy=rms_energy,
            peak_amplitude=peak_amplitude,
            clipping_ratio=clipping_ratio,
            estimated_snr_db=estimated_snr_db,
            issues=issues,
        )


# Global singleton
audio_quality_checker = AudioQualityChecker()
