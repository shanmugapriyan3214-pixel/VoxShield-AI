"""VoxShield AI — Speaker Embedding Extraction Service."""

import hashlib
import math
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
import numpy as np

from app.ai.base import BaseAIComponent
from app.ai.feature_extraction import audio_feature_extractor
from app.ai.schemas import SpeakerEmbeddingResult


class SpeakerEmbeddingService(BaseAIComponent, ABC):
    """Abstract interface for speaker voice representation extraction."""

    @abstractmethod
    async def extract_embedding(
        self,
        audio_bytes: bytes,
        sample_rate: int = 16000,
    ) -> SpeakerEmbeddingResult:
        """Extract a normalized unit speaker vector (kept strictly local)."""
        pass

    def get_status(self) -> Dict[str, Any]:
        return {
            "available": True,
            "model_name": self.model_name,
            "model_version": self.model_version,
            "device": self.device,
            "engine_type": self.engine_type,
        }


class LocalSpeakerEmbeddingService(SpeakerEmbeddingService):
    """Local speaker embedding model utilizing statistical MFCC projection to 192-d space."""

    def __init__(
        self,
        dimension: int = 192,
        model_name: str = "VoxShield-SpeakerEmbedding-Local",
        model_version: str = "local-ecapa-v1.0",
        device: str = "cpu",
        model_path: Optional[str] = None,
    ):
        super().__init__(
            model_name=model_name,
            model_version=model_version,
            device=device,
            engine_type="REAL_LOCAL_MODEL",
        )
        self.dimension = dimension
        self.model_path = model_path
        # Deterministic projection matrix for 96 features -> 192 dimensions
        rng = np.random.RandomState(42)
        self._projection_matrix = rng.randn(96, self.dimension).astype(np.float32)

    async def extract_embedding(
        self,
        audio_bytes: bytes,
        sample_rate: int = 16000,
    ) -> SpeakerEmbeddingResult:
        waveform, sr = audio_feature_extractor.extract_waveform(audio_bytes, target_sr=sample_rate)
        # Extract 24 MFCCs across time frames
        mfcc = audio_feature_extractor.extract_mfcc(waveform, sr=sr, n_mfcc=24)

        if mfcc.shape[1] == 0:
            vec = np.zeros(self.dimension, dtype=np.float32)
        else:
            # Statistical pooling: mean, std, skewness
            means = np.mean(mfcc, axis=1)  # 24
            stds = np.std(mfcc, axis=1)    # 24
            mins = np.min(mfcc, axis=1)    # 24
            maxs = np.max(mfcc, axis=1)    # 24
            pooled = np.concatenate([means, stds, mins, maxs])  # 96 features

            # Project deterministically up to target dimensions
            projected = np.dot(pooled, self._projection_matrix)
            # L2 normalize
            norm = np.linalg.norm(projected)
            vec = projected / max(norm, 1e-6)

        embedding_list = [round(float(x), 6) for x in vec]

        return SpeakerEmbeddingResult(
            embedding=embedding_list,
            dimension=self.dimension,
            model_version=self.model_version,
            is_mock=False,
        )


class MockSpeakerEmbeddingService(SpeakerEmbeddingService):
    """Simulated speaker embedding generator for development and unit testing."""

    def __init__(
        self,
        dimension: int = 192,
        model_name: str = "VoxShield-MockSpeaker",
        model_version: str = "mock-ecapa-v1.0",
        device: str = "cpu",
    ):
        super().__init__(
            model_name=model_name,
            model_version=model_version,
            device=device,
            engine_type="MOCK_DEMO_MODEL",
        )
        self.dimension = dimension

    async def extract_embedding(
        self,
        audio_bytes: bytes,
        sample_rate: int = 16000,
    ) -> SpeakerEmbeddingResult:
        digest = hashlib.sha256(audio_bytes).hexdigest() if audio_bytes else "12345678" * 8
        raw_vector = []
        for i in range(self.dimension):
            chunk = digest[(i * 4) % (len(digest) - 4): (i * 4) % (len(digest) - 4) + 4]
            raw_val = (int(chunk, 16) / 0xFFFF) * 2.0 - 1.0
            raw_vector.append(raw_val)

        magnitude = math.sqrt(sum(x * x for x in raw_vector)) or 1.0
        normalized = [round(x / magnitude, 6) for x in raw_vector]

        return SpeakerEmbeddingResult(
            embedding=normalized,
            dimension=self.dimension,
            model_version=self.model_version,
            is_mock=True,
        )
