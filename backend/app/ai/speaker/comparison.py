"""VoxShield AI — Speaker Voiceprint Comparison Service."""

import time
import uuid
from datetime import datetime, timezone
from typing import List, Optional
import numpy as np

from app.ai.base import BaseAIComponent
from app.ai.config import ENGINE_LOCAL_DSP, ENGINE_MOCK_DEMO
from app.ai.registry import ModelMetadata, model_registry
from app.ai.schemas import SpeakerComparisonResult


class SpeakerComparisonService(BaseAIComponent):
    """Computes cosine similarity between speaker embedding representations.
    
    CRITICAL PRIVACY INVARIANT:
    Raw voice embeddings are kept strictly internal or client-side.
    This service computes match metrics and returns probabilistic scores,
    never exposing raw vector representations in public responses.
    """

    def __init__(
        self,
        default_threshold: float = 0.75,
        model_name: str = "VoxShield-SpeakerCosineSimilarity",
        model_version: str = "cosine-v2.5",
        device: str = "cpu",
    ):
        super().__init__(
            model_name=model_name,
            model_version=model_version,
            device=device,
            engine_type=ENGINE_LOCAL_DSP,
            framework="dsp_numpy",
            available=True,
            status="LOADED",
        )
        self.default_threshold = default_threshold
        model_registry.register(
            "speaker_verification",
            ModelMetadata(
                model_name=self.model_name,
                version=self.model_version,
                engine_type=self.engine_type,
                framework=self.framework,
                device=self.device,
                input_sample_rate=16000,
                input_duration_sec=1.5,
                available=True,
                status="LOADED",
                model_source="Cosine similarity metric over normalized L2 vector embeddings",
                description="Pairwise cosine similarity and threshold decision for speaker verification.",
            ),
        )

    def compare(
        self,
        embedding_a: List[float],
        embedding_b: List[float],
        threshold: Optional[float] = None,
        is_mock: bool = False,
    ) -> SpeakerComparisonResult:
        """Synchronously compare two speaker embeddings using cosine similarity."""
        start_time = time.perf_counter()
        th = threshold if threshold is not None else self.default_threshold
        analysis_id = str(uuid.uuid4())

        if not embedding_a or not embedding_b or len(embedding_a) != len(embedding_b):
            return SpeakerComparisonResult(
                speaker_match_score=0.0,
                confidence=0.0,
                is_match=False,
                threshold_used=th,
                engine_type=ENGINE_MOCK_DEMO if is_mock else self.engine_type,
                model_name=self.model_name,
                model_version=self.model_version,
                inference_time_ms=0.0,
                is_mock=is_mock,
                analysis_id=analysis_id,
                timestamp=datetime.now(timezone.utc),
            )

        vec_a = np.array(embedding_a, dtype=np.float32)
        vec_b = np.array(embedding_b, dtype=np.float32)

        norm_a = np.linalg.norm(vec_a)
        norm_b = np.linalg.norm(vec_b)

        if norm_a < 1e-6 or norm_b < 1e-6:
            cosine_sim = 0.0
        else:
            cosine_sim = float(np.dot(vec_a, vec_b) / (norm_a * norm_b))

        match_score = round(max(0.0, min(1.0, cosine_sim)), 4) if cosine_sim >= 0 else 0.0
        is_match = match_score >= th
        margin = abs(match_score - th)
        confidence = round(min(0.99, max(0.5, 0.70 + margin * 1.0)), 4)
        elapsed_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

        return SpeakerComparisonResult(
            speaker_match_score=match_score,
            confidence=confidence,
            is_match=is_match,
            threshold_used=th,
            engine_type=ENGINE_MOCK_DEMO if is_mock else self.engine_type,
            model_name=self.model_name,
            model_version=self.model_version,
            inference_time_ms=elapsed_ms,
            is_mock=is_mock,
            analysis_id=analysis_id,
            timestamp=datetime.now(timezone.utc),
        )

    async def compare_embeddings(
        self,
        reference_embedding: List[float],
        suspect_embedding: List[float],
        threshold: float = 0.75,
    ) -> SpeakerComparisonResult:
        """Async interface matching abstract SpeakerComparisonService contract."""
        return self.compare(
            embedding_a=reference_embedding,
            embedding_b=suspect_embedding,
            threshold=threshold,
            is_mock=(self.engine_type == ENGINE_MOCK_DEMO),
        )


speaker_comparison_service = SpeakerComparisonService()
