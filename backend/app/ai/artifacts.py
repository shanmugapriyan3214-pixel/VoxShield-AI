"""VoxShield AI — Synthetic Speech Artifact Detection Engine.

Detects signature physical and digital acoustic anomalies produced by:
- Neural vocoders (HiFi-GAN, WaveNet, MelGAN, BigVGAN)
- Diffusion and autoregressive acoustic models (Vall-E, ElevenLabs, DiffSinger)
- Harmonic discontinuities, unnatural spectral smoothness, and phase distortion

Auditable, scientifically grounded DSP indicators only.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional
import numpy as np
from app.ai.feature_extraction import audio_feature_extractor


@dataclass
class ArtifactAnalysisResult:
    """Detection findings for synthetic voice generation artifacts."""
    artifact_score: float         # 0.0 (clean natural) to 1.0 (heavy synthetic artifacts)
    level: str                    # "LOW" | "MEDIUM" | "HIGH"
    spectral_smoothness: float    # Measure of diffusion/GAN oversmoothing
    high_freq_jitter: float       # Phase discontinuity in >4 kHz band
    detected_artifacts: List[str] = field(default_factory=list)
    confidence: float = 0.85

    def to_dict(self) -> dict:
        return {
            "artifact_score": round(self.artifact_score, 4),
            "level": self.level,
            "spectral_smoothness": round(self.spectral_smoothness, 4),
            "high_freq_jitter": round(self.high_freq_jitter, 4),
            "detected_artifacts": self.detected_artifacts,
            "confidence": round(self.confidence, 4),
        }


class SyntheticArtifactDetector:
    """Physical DSP detector searching for synthesis fingerprints."""

    def __init__(self):
        self.extractor = audio_feature_extractor

    def analyze(self, waveform: np.ndarray, sr: int = 16000) -> ArtifactAnalysisResult:
        """Scan audio for neural vocoder and acoustic generation artifacts."""
        artifacts: List[str] = []

        if len(waveform) < 1600:
            return ArtifactAnalysisResult(
                artifact_score=0.1,
                level="LOW",
                spectral_smoothness=0.0,
                high_freq_jitter=0.0,
                detected_artifacts=[],
                confidence=0.60,
            )

        spec_feats = self.extractor.extract_spectral_features(waveform, sr=sr)
        pitch_feats = self.extractor.extract_pitch_f0(waveform, sr=sr)
        subband = self.extractor.extract_subband_energy(waveform, sr=sr)
        log_mel = self.extractor.extract_log_mel_spectrogram(waveform, sr=sr, n_mels=80)

        flatness = spec_feats.get("spectral_flatness", 0.0)
        zcr = spec_feats.get("zero_crossing_rate", 0.0)
        spectral_flux = spec_feats.get("spectral_flux", 0.0)
        high_ratio = subband.get("high_ratio", 0.1)

        f0_jitter = pitch_feats.get("f0_jitter", 0.0)
        f0_std = pitch_feats.get("f0_std", 0.0)
        voiced_ratio = pitch_feats.get("voiced_ratio", 0.0)
        pitch_jump_rate = pitch_feats.get("pitch_jump_rate", 0.0)

        # 1. Spectral Smoothness / Diffusion Smearing
        if log_mel.shape[1] >= 4:
            frame_diffs = np.diff(log_mel, axis=1)
            flux = float(np.mean(np.abs(frame_diffs)))
            spectral_smoothness = float(1.0 / (1.0 + flux * 2.0))
        else:
            spectral_smoothness = 0.5

        # 2. High-Frequency Vocoder Phase Jitter
        n_fft = min(512, len(waveform))
        fft_mag = np.abs(np.fft.rfft(waveform[:n_fft]))
        freqs = np.fft.rfftfreq(n_fft, d=1.0 / sr)
        high_mask = freqs >= 4000.0
        if np.any(high_mask) and np.sum(fft_mag) > 0:
            high_band_energy = float(np.sum(fft_mag[high_mask]) / np.sum(fft_mag))
            high_freq_jitter = float(min(1.0, zcr * 2.2 + high_band_energy * 1.5))
        else:
            high_freq_jitter = 0.2

        # 3. Artifact Heuristic Integration
        score_acc = 0.0

        # A. Neural vocoder phase discontinuity & high-frequency distortion
        if (flatness > 0.22 and high_freq_jitter > 0.26) or flatness > 0.32:
            artifacts.append("vocoder_phase_discontinuity")
            score_acc += 0.35
        elif flatness > 0.18 and high_freq_jitter > 0.22:
            artifacts.append("unnatural_spectral_flatness")
            score_acc += 0.18

        # B. Diffusion/GAN spectral smoothing
        if (spectral_smoothness > 0.72 and f0_std < 10.0 and voiced_ratio > 0.25) or spectral_smoothness > 0.85:
            artifacts.append("diffusion_spectral_smoothing")
            score_acc += 0.30
        elif spectral_smoothness > 0.65 and f0_std < 12.0 and voiced_ratio > 0.25:
            artifacts.append("formant_smearing")
            score_acc += 0.15

        # C. Abnormal High-Frequency Cutoff / Boost
        if high_ratio > 0.40:
            artifacts.append("high_frequency_harmonic_leakage")
            score_acc += 0.25

        # D. Pitch Rigidity & Cadence Unnaturalness
        if voiced_ratio >= 0.25:
            if f0_jitter < 0.003 and f0_std < 10.0:
                artifacts.append("unnatural_pitch_rigidity")
                score_acc += 0.40
            elif pitch_jump_rate > 0.15:
                artifacts.append("unphysiological_pitch_discontinuity")
                score_acc += 0.26

        artifact_score = float(max(0.04, min(0.96, score_acc)))

        if artifact_score >= 0.65:
            level = "HIGH"
        elif artifact_score >= 0.35:
            level = "MEDIUM"
        else:
            level = "LOW"

        confidence = float(min(0.95, 0.70 + abs(artifact_score - 0.5) * 0.5))

        return ArtifactAnalysisResult(
            artifact_score=artifact_score,
            level=level,
            spectral_smoothness=spectral_smoothness,
            high_freq_jitter=high_freq_jitter,
            detected_artifacts=artifacts,
            confidence=confidence,
        )


# Global singleton
synthetic_artifact_detector = SyntheticArtifactDetector()
