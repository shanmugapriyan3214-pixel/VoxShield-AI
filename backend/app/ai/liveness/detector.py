"""VoxShield AI — Real Local Acoustic Liveness & Anti-Spoofing Detector."""

from typing import Optional
import numpy as np

from app.ai.feature_extraction import audio_feature_extractor
from app.ai.liveness.base import LivenessDetector
from app.ai.schemas import LivenessResult


class LocalLivenessDetector(LivenessDetector):
    """Detects replay attacks and synthetic acoustic transmission artifacts via DSP."""

    def __init__(
        self,
        model_name: str = "VoxShield-AcousticLiveness-Local",
        model_version: str = "liveness-dsp-v1.0",
        device: str = "cpu",
        model_path: Optional[str] = None,
    ):
        super().__init__(
            model_name=model_name,
            model_version=model_version,
            device=device,
            engine_type="REAL_LOCAL_MODEL",
        )
        self.model_path = model_path

    async def detect_liveness(
        self,
        audio_bytes: bytes,
        sample_rate: int = 16000,
    ) -> LivenessResult:
        waveform, sr = audio_feature_extractor.extract_waveform(audio_bytes, target_sr=sample_rate)

        if len(waveform) < 160:  # Less than 10ms
            return LivenessResult(
                liveness_score=0.5,
                replay_probability=0.5,
                confidence=0.5,
                room_acoustic_variance=0.0,
                model_version=self.model_version,
                is_mock=False,
            )

        # 1. Compute frame-by-frame energy and spectral dynamics
        frame_size = 512
        hop_size = 256
        n_frames = max(1, (len(waveform) - frame_size) // hop_size + 1)

        frame_energies = []
        for i in range(n_frames):
            frame = waveform[i * hop_size : i * hop_size + frame_size]
            energy = float(np.sum(frame ** 2))
            frame_energies.append(energy)

        # Acoustic variance over time
        acoustic_variance = float(np.var(frame_energies)) if frame_energies else 0.0

        # 2. Extract global spectral features
        spec_feats = audio_feature_extractor.extract_spectral_features(waveform, sr=sr)
        flatness = spec_feats.get("spectral_flatness", 0.0)
        rolloff = spec_feats.get("spectral_rolloff", 0.0)
        centroid = spec_feats.get("spectral_centroid", 0.0)

        # 3. Acoustic Heuristics for Liveness:
        # - Live acoustic vocal tracks have natural room resonance variance and high rolloff (> 3000 Hz)
        # - Re-recorded audio through low-end speakers loses high frequencies (rolloff < 2500 Hz)
        # - Direct DAC synthesis has unnaturally flat or static background without natural mic noise
        liveness_score = 0.85

        # Penalize low spectral rolloff (frequency cutoff often caused by mobile transducers)
        if rolloff < 2500.0:
            liveness_score -= 0.30
        elif rolloff < 3500.0:
            liveness_score -= 0.10

        # Extremely low acoustic variance indicates artificially sustained synthetic tone
        if acoustic_variance < 1e-5:
            liveness_score -= 0.25

        # Excessively high flatness indicates white/pink vocoder noise
        if flatness > 0.40:
            liveness_score -= 0.20

        liveness_score = round(max(0.05, min(0.99, liveness_score)), 4)
        replay_prob = round(1.0 - liveness_score, 4)

        return LivenessResult(
            liveness_score=liveness_score,
            replay_probability=replay_prob,
            confidence=0.88,
            room_acoustic_variance=round(acoustic_variance, 6),
            model_version=self.model_version,
            is_mock=False,
        )
