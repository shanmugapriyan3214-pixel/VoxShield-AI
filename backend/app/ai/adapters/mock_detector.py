"""VoxShield AI — Mock Deepfake Detection Adapter."""

import hashlib
import uuid
from datetime import datetime, timezone
from typing import Optional
from app.ai.interfaces.detector import DeepfakeDetector
from app.ai.schemas import DeepfakeDetectionResult


class MockDeepfakeDetector(DeepfakeDetector):
    """Development mock analyzer simulating real acoustic inference results."""

    def __init__(self, model_version: str = "mock-voxguard-v1.0-demo"):
        self.model_version = model_version

    async def analyze(
        self,
        audio_bytes: bytes,
        sample_rate: int = 16000,
        context: Optional[dict] = None,
    ) -> DeepfakeDetectionResult:
        analysis_id = str(uuid.uuid4())
        # Use content digest to derive reproducible pseudo-random metrics
        digest = hashlib.sha256(audio_bytes).hexdigest() if audio_bytes else "0" * 64
        val = int(digest[:6], 16) / 0xFFFFFF

        # Shape distribution: slightly favor human unless explicitly triggered
        ai_prob = round(min(0.98, max(0.02, val)), 4)
        human_prob = round(1.0 - ai_prob, 4)

        if ai_prob >= 0.70:
            classification = "LIKELY_AI_GENERATED"
            artifacts = ["high_frequency_phase_jitter", "synthetic_vocoder_envelope"]
        elif ai_prob >= 0.40:
            classification = "SUSPICIOUS"
            artifacts = ["unnatural_pitch_regularity"]
        else:
            classification = "LIKELY_HUMAN"
            artifacts = []

        speaker_match = round(0.50 + 0.45 * (int(digest[6:10], 16) / 0xFFFF), 4)
        liveness = round(0.30 + 0.65 * (int(digest[10:14], 16) / 0xFFFF), 4)

        return DeepfakeDetectionResult(
            analysis_id=analysis_id,
            classification=classification,
            ai_probability=ai_prob,
            human_probability=human_prob,
            speaker_match_score=speaker_match,
            liveness_score=liveness,
            confidence=0.91,
            model_version=self.model_version,
            is_mock=True,
            warning="DEMO/MOCK: Synthetic test output. Does not reflect live cryptographic guarantee.",
            detected_artifacts=artifacts,
            timestamp=datetime.now(timezone.utc),
        )

    def get_status(self):
        return {
            "available": True,
            "model_name": "VoxShield-MockDeepfakeDetector",
            "model_version": self.model_version,
            "device": "cpu",
            "engine_type": "MOCK_DEMO_MODEL",
        }

