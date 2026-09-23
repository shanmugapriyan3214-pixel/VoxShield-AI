"""VoxShield AI — Acoustic Anti-Replay & Liveness Discrimination Engine.

Differentiates:
- LIVE HUMAN (in-situ direct mouth-to-mic acoustic transmission)
- AI-GENERATED AUDIO (synthetic vocoder/diffusion generation)
- RECORDED/REPLAYED AUDIO (loudspeaker acoustic playback through room air)

Avoids conflating replayed audio with AI-generated audio by reporting
a dedicated `replay_suspicion` signal.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional
import numpy as np


@dataclass
class ReplaySuspicionResult:
    """Findings for acoustic replay / loudspeaker playback detection."""
    replay_score: float             # 0.0 (live acoustic) to 1.0 (replayed speaker recording)
    is_replay_suspicious: bool
    reverberation_index: float      # Room acoustic convolution estimate
    channel_coloration: float       # Loudspeaker transfer function comb-filtering
    indicators: List[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "replay_score": round(self.replay_score, 4),
            "is_replay_suspicious": self.is_replay_suspicious,
            "reverberation_index": round(self.reverberation_index, 4),
            "channel_coloration": round(self.channel_coloration, 4),
            "indicators": self.indicators,
        }


class ReplaySuspicionDetector:
    """Analyzes physical room acoustic reverberation and loudspeaker frequency coloration."""

    def analyze(self, waveform: np.ndarray, sr: int = 16000) -> ReplaySuspicionResult:
        """Scan waveform for physical secondary transmission signatures."""
        indicators: List[str] = []

        if len(waveform) < 1600:
            return ReplaySuspicionResult(
                replay_score=0.05,
                is_replay_suspicious=False,
                reverberation_index=0.0,
                channel_coloration=0.0,
                indicators=[],
            )

        # 1. Decay / Reverberation analysis (Energy envelope decay rate after frame peaks)
        frame_len = int(0.025 * sr)  # 25ms
        num_frames = max(1, len(waveform) // frame_len)
        energies = np.array([
            float(np.sqrt(np.mean(waveform[i * frame_len : (i + 1) * frame_len] ** 2)))
            for i in range(num_frames)
        ])

        # Find energy dropoffs after peaks
        reverb_acc = 0.0
        if len(energies) >= 6:
            peak_indices = np.where(energies > np.mean(energies) * 1.5)[0]
            decay_slopes = []
            for p in peak_indices:
                if p + 2 < len(energies):
                    slope = energies[p] - energies[p + 1]
                    decay_slopes.append(slope)
            if decay_slopes:
                # Slower decay slopes indicate room reverberation
                avg_slope = float(np.mean(decay_slopes))
                if avg_slope < 0.02:
                    reverb_acc = 0.35
                    indicators.append("extended_room_impulse_decay")

        # 2. Loudspeaker frequency response peaks (comb-filtering resonance around 200–500 Hz)
        n_fft = min(512, len(waveform))
        fft_mag = np.abs(np.fft.rfft(waveform[:n_fft]))
        freqs = np.fft.rfftfreq(n_fft, d=1.0 / sr)

        box_resonance_mask = (freqs >= 180.0) & (freqs <= 600.0)
        total_mag = max(np.sum(fft_mag), 1e-6)
        low_mid_ratio = float(np.sum(fft_mag[box_resonance_mask]) / total_mag)

        coloration_acc = 0.0
        if low_mid_ratio > 0.52:
            coloration_acc = 0.30
            indicators.append("loudspeaker_acoustic_coloration")

        # 3. Combine replay score
        raw_replay = reverb_acc + coloration_acc
        replay_score = float(max(0.02, min(0.95, raw_replay)))
        is_suspicious = replay_score >= 0.50

        return ReplaySuspicionResult(
            replay_score=replay_score,
            is_replay_suspicious=is_suspicious,
            reverberation_index=round(reverb_acc, 4),
            channel_coloration=round(low_mid_ratio, 4),
            indicators=indicators,
        )


# Global singleton
replay_suspicion_detector = ReplaySuspicionDetector()
