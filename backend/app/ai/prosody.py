"""VoxShield AI — Prosody & Speech Cadence Analysis Engine.

Evaluates supra-segmental acoustic attributes:
- Pitch variability (F0 dynamic standard deviation and pitch contour)
- Speaking rhythm and syllabic duration regularity
- Natural pause distribution vs robotic continuous flow
- Energy dynamic variance and phrase transitions

Principles:
- Does NOT assume unusual speech immediately means AI.
- Produces a calibrated anomaly score to feed multi-signal score fusion.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional
import numpy as np
from app.ai.feature_extraction import audio_feature_extractor


@dataclass
class ProsodyAnalysisResult:
    """Prosodic consistency and cadence evaluation output."""
    prosody_anomaly_score: float  # 0.0 (natural human) to 1.0 (highly synthetic cadence)
    pitch_variability: float     # F0 std in Hz
    mean_f0: float               # Mean pitch in Hz
    voiced_ratio: float          # Proportion of voiced frames
    rhythm_regularity: float     # Syllabic timing uniformity
    energy_dynamics: float       # Dynamic range across voiced frames
    rating: str                  # "NATURAL" | "SLIGHTLY_ANOMALOUS" | "HIGHLY_SUSPICIOUS"
    indicators: List[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "prosody_anomaly_score": round(self.prosody_anomaly_score, 4),
            "pitch_variability": round(self.pitch_variability, 2),
            "mean_f0": round(self.mean_f0, 2),
            "voiced_ratio": round(self.voiced_ratio, 4),
            "rhythm_regularity": round(self.rhythm_regularity, 4),
            "energy_dynamics": round(self.energy_dynamics, 4),
            "rating": self.rating,
            "indicators": self.indicators,
        }


class ProsodyAnalyzer:
    """Analyzes rhythmic and intonational naturalness of spoken voice."""

    def __init__(self):
        self.extractor = audio_feature_extractor

    def analyze(self, waveform: np.ndarray, sr: int = 16000) -> ProsodyAnalysisResult:
        """Compute prosodic features and anomaly scores."""
        indicators: List[str] = []

        if len(waveform) < 1600:  # < 100ms
            return ProsodyAnalysisResult(
                prosody_anomaly_score=0.2,
                pitch_variability=0.0,
                mean_f0=0.0,
                voiced_ratio=0.0,
                rhythm_regularity=0.0,
                energy_dynamics=0.0,
                rating="NATURAL",
                indicators=[],
            )

        # 1. Pitch / F0 dynamics
        pitch_data = self.extractor.extract_pitch_f0(waveform, sr=sr)
        mean_f0 = pitch_data["mean_f0"]
        f0_std = pitch_data["f0_std"]
        voiced_ratio = pitch_data["voiced_ratio"]
        pitch_jump_rate = pitch_data["pitch_jump_rate"]
        f0_jitter = pitch_data.get("f0_jitter", 0.0)

        # 2. Energy Dynamics across 50ms frames
        frame_len = int(0.05 * sr)
        num_frames = max(1, len(waveform) // frame_len)
        energies = np.array([
            float(np.sqrt(np.mean(waveform[i * frame_len : (i + 1) * frame_len] ** 2)))
            for i in range(num_frames)
        ])

        energy_var = float(np.var(energies)) if len(energies) > 1 else 0.0
        energy_dynamics = float(np.std(energies) / max(np.mean(energies), 1e-4)) if len(energies) > 1 else 0.0

        # 3. Syllabic Rhythm Regularity (Peak intervals in energy envelope)
        if len(energies) >= 8:
            energy_thresh = np.mean(energies) * 1.1
            peak_indices = [i for i, e in enumerate(energies) if e > energy_thresh]
            if len(peak_indices) >= 4:
                intervals = np.diff(peak_indices)
                # Low coefficient of variation in intervals means robotic / metronomic cadence
                interval_cv = float(np.std(intervals) / max(np.mean(intervals), 1e-3))
                rhythm_regularity = max(0.0, min(1.0, 1.0 - interval_cv))
            else:
                rhythm_regularity = 0.4
        else:
            rhythm_regularity = 0.3

        # 4. Synthesize Anomaly Indicators
        anomaly_acc = 0.0

        # A. Pitch Monotony & Micro-Jitter Rigidity (flat synthetic TTS pitch contour or lacking human tremor)
        if voiced_ratio > 0.30 and ((f0_std < 7.5 and mean_f0 > 80.0) or (f0_jitter < 0.003 and mean_f0 > 80.0)):
            indicators.append("unnatural_pitch_regularity")
            anomaly_acc += 0.35
        elif voiced_ratio > 0.30 and (f0_std < 12.0 or f0_jitter < 0.005):
            indicators.append("compressed_intonation_contour")
            anomaly_acc += 0.18

        # B. Pitch Discontinuity (synthetic concatenation artifacts)
        if pitch_jump_rate > 0.22:
            indicators.append("unphysiological_pitch_discontinuity")
            anomaly_acc += 0.28
        elif pitch_jump_rate > 0.14:
            anomaly_acc += 0.12

        # C. Mechanical Rhythm (abnormally steady syllable intervals)
        if rhythm_regularity > 0.82 and len(waveform) >= int(1.2 * sr):
            indicators.append("metronomic_syllable_cadence")
            anomaly_acc += 0.22

        # D. Dynamic Compression (flat robot-like energy)
        if energy_dynamics < 0.20 and voiced_ratio > 0.4:
            indicators.append("flat_amplitude_dynamics")
            anomaly_acc += 0.18

        prosody_anomaly_score = float(max(0.02, min(0.96, anomaly_acc)))

        if prosody_anomaly_score >= 0.60:
            rating = "HIGHLY_SUSPICIOUS"
        elif prosody_anomaly_score >= 0.30:
            rating = "SLIGHTLY_ANOMALOUS"
        else:
            rating = "NATURAL"

        return ProsodyAnalysisResult(
            prosody_anomaly_score=prosody_anomaly_score,
            pitch_variability=f0_std,
            mean_f0=mean_f0,
            voiced_ratio=voiced_ratio,
            rhythm_regularity=rhythm_regularity,
            energy_dynamics=energy_dynamics,
            rating=rating,
            indicators=indicators,
        )


# Global singleton
prosody_analyzer = ProsodyAnalyzer()
