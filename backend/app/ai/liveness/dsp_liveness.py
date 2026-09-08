"""VoxShield AI — Local DSP Acoustic Liveness & Anti-Spoofing Detector."""

import time
from typing import Optional
import numpy as np

from app.ai.config import ENGINE_LOCAL_DSP
from app.ai.feature_extraction import audio_feature_extractor
from app.ai.liveness.base import LivenessDetector
from app.ai.schemas import LivenessResult


class DSPLivenessDetector(LivenessDetector):
    """Detects replay attacks and synthetic transmission artifacts via acoustic DSP heuristics.
    
    ENGINE TYPE: LOCAL_DSP_ANALYZER (Not a trained neural anti-spoofing model).
    Measures acoustic frame energy variance and high-frequency spectral rolloff cutoff.
    """

    def __init__(
        self,
        model_name: str = "VoxShield-DSP-AcousticLiveness",
        model_version: str = "dsp-liveness-v2.5",
        device: str = "cpu",
    ):
        super().__init__(
            model_name=model_name,
            model_version=model_version,
            device=device,
            engine_type=ENGINE_LOCAL_DSP,
            framework="dsp_numpy",
            available=True,
            status="FALLBACK_DSP",
        )

    async def detect_liveness(
        self,
        audio_bytes: bytes,
        sample_rate: int = 16000,
    ) -> LivenessResult:
        start_time = time.perf_counter()
        waveform, sr = audio_feature_extractor.extract_waveform(audio_bytes, target_sr=sample_rate)

        if len(waveform) < 160:  # Less than 10ms
            return LivenessResult(
                liveness_score=0.5,
                replay_probability=0.5,
                confidence=0.5,
                room_acoustic_variance=0.0,
                engine_type=self.engine_type,
                model_name=self.model_name,
                model_version=self.model_version,
                inference_time_ms=0.0,
                is_mock=False,
            )

        # 1. Compute frame-by-frame energy and acoustic dynamics
        frame_size = 512
        hop_size = 256
        n_frames = max(1, (len(waveform) - frame_size) // hop_size + 1)

        frame_energies = []
        for i in range(n_frames):
            frame = waveform[i * hop_size : i * hop_size + frame_size]
            energy = float(np.sum(frame ** 2))
            frame_energies.append(energy)

        acoustic_variance = float(np.var(frame_energies)) if frame_energies else 0.0

        # 2. Extract global spectral features
        spec_feats = audio_feature_extractor.extract_spectral_features(waveform, sr=sr)
        flatness = spec_feats.get("spectral_flatness", 0.0)
        rolloff = spec_feats.get("spectral_rolloff", 0.0)

        # 3. Acoustic Heuristics for Liveness:
        # - Live acoustic speech has natural room resonance variance and high rolloff (> 3000 Hz)
        # - Loudspeaker replay cuts off high frequencies (rolloff < 2500 Hz)
        # - Direct DAC synthesis has unnaturally flat background without natural room noise
        liveness_score = 0.85

        if rolloff < 2500.0:
            liveness_score -= 0.30
        elif rolloff < 3500.0:
            liveness_score -= 0.10

        if acoustic_variance < 1e-5:
            liveness_score -= 0.25

        if flatness > 0.40:
            liveness_score -= 0.20

        liveness_score = round(max(0.05, min(0.99, liveness_score)), 4)
        replay_prob = round(1.0 - liveness_score, 4)
        elapsed_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

        return LivenessResult(
            liveness_score=liveness_score,
            replay_probability=replay_prob,
            confidence=0.88,
            room_acoustic_variance=round(acoustic_variance, 6),
            engine_type=self.engine_type,
            model_name=self.model_name,
            model_version=self.model_version,
            inference_time_ms=elapsed_ms,
            is_mock=False,
        )
