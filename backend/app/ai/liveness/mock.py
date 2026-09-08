"""VoxShield AI — Mock Liveness Detector for Development and Testing."""

import hashlib
import time
from typing import Optional

from app.ai.config import ENGINE_MOCK_DEMO
from app.ai.liveness.base import LivenessDetector
from app.ai.schemas import LivenessResult


class MockLivenessDetector(LivenessDetector):
    """Deterministic simulated liveness detector."""

    def __init__(
        self,
        model_name: str = "VoxShield-MockLiveness",
        model_version: str = "mock-liveness-v1.0",
        device: str = "cpu",
    ):
        super().__init__(
            model_name=model_name,
            model_version=model_version,
            device=device,
            engine_type=ENGINE_MOCK_DEMO,
            framework="mock",
            available=True,
            status="MOCK",
        )

    async def detect_liveness(
        self,
        audio_bytes: bytes,
        sample_rate: int = 16000,
    ) -> LivenessResult:
        start_time = time.perf_counter()
        h = hashlib.sha256(audio_bytes).hexdigest() if audio_bytes else "12345678"
        val = int(h[:4], 16) / 0xFFFF
        liveness_score = round(0.70 + val * 0.25, 4)
        replay_prob = round(1.0 - liveness_score, 4)
        elapsed_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

        return LivenessResult(
            liveness_score=liveness_score,
            replay_probability=replay_prob,
            confidence=0.90,
            room_acoustic_variance=0.015,
            engine_type=self.engine_type,
            model_name=self.model_name,
            model_version=self.model_version,
            inference_time_ms=elapsed_ms,
            is_mock=True,
        )
