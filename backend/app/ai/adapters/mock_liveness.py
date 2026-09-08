"""VoxShield AI — Mock Liveness Detection Adapter."""

import hashlib
from app.ai.interfaces.liveness import LivenessDetector
from app.ai.schemas import LivenessResult


class MockLivenessDetector(LivenessDetector):
    """Simulates room impulse response and replay attack testing."""

    def __init__(self, model_version: str = "mock-liveness-v1.0"):
        self.model_version = model_version

    async def analyze_liveness(
        self,
        audio_bytes: bytes,
        sample_rate: int = 16000,
    ) -> LivenessResult:
        digest = hashlib.sha256(audio_bytes).hexdigest() if audio_bytes else "aabbccdd" * 8
        val = int(digest[-4:], 16) / 0xFFFF

        liveness_score = round(0.40 + 0.58 * val, 4)
        replay_prob = round(1.0 - liveness_score, 4)

        return LivenessResult(
            liveness_score=liveness_score,
            replay_probability=replay_prob,
            confidence=0.88,
            room_acoustic_variance=round(1.2 + 0.8 * val, 2),
            model_version=self.model_version,
            is_mock=True,
        )

    def get_status(self):
        return {
            "available": True,
            "model_name": "VoxShield-MockLiveness",
            "model_version": self.model_version,
            "device": "cpu",
            "engine_type": "MOCK_DEMO_MODEL",
        }

