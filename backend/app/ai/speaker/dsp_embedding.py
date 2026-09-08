"""VoxShield AI — DSP Statistical Speaker Embedding Service."""

import time
from typing import Optional
import numpy as np

from app.ai.base import BaseAIComponent
from app.ai.config import ENGINE_LOCAL_DSP
from app.ai.feature_extraction import audio_feature_extractor
from app.ai.schemas import SpeakerEmbeddingResult


class DSPSpeakerEmbeddingService(BaseAIComponent):
    """Statistical MFCC moment projection speaker representation.
    
    ENGINE TYPE: LOCAL_DSP_ANALYZER (Not a trained neural speaker encoder).
    Extracts 96 statistical features across 24 MFCCs and projects to 192 dimensions with L2 normalization.
    """

    def __init__(
        self,
        dimension: int = 192,
        model_name: str = "VoxShield-DSP-SpeakerProjection",
        model_version: str = "dsp-v2.5",
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
        self.dimension = dimension
        # Deterministic projection matrix for 96 features -> 192 dimensions
        rng = np.random.RandomState(42)
        self._projection_matrix = rng.randn(96, self.dimension).astype(np.float32)

    async def extract_embedding(
        self,
        audio_bytes: bytes,
        sample_rate: int = 16000,
    ) -> SpeakerEmbeddingResult:
        start_time = time.perf_counter()
        waveform, sr = audio_feature_extractor.extract_waveform(audio_bytes, target_sr=sample_rate)
        mfcc = audio_feature_extractor.extract_mfcc(waveform, sr=sr, n_mfcc=24)

        if mfcc.shape[1] == 0:
            vec = np.zeros(self.dimension, dtype=np.float32)
        else:
            means = np.mean(mfcc, axis=1)  # 24
            stds = np.std(mfcc, axis=1)    # 24
            mins = np.min(mfcc, axis=1)    # 24
            maxs = np.max(mfcc, axis=1)    # 24
            pooled = np.concatenate([means, stds, mins, maxs])  # 96 features

            projected = np.dot(pooled, self._projection_matrix)
            norm = np.linalg.norm(projected)
            vec = projected / max(norm, 1e-6)

        embedding_list = [round(float(x), 6) for x in vec]
        elapsed_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

        return SpeakerEmbeddingResult(
            embedding=embedding_list,
            dimension=self.dimension,
            engine_type=self.engine_type,
            model_name=self.model_name,
            model_version=self.model_version,
            inference_time_ms=elapsed_ms,
            is_mock=False,
        )
