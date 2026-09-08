"""VoxShield AI — Mock Deepfake Detector Adapter."""

import hashlib
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from app.ai.config import ENGINE_MOCK_DEMO
from app.ai.deepfake.base import DeepfakeDetector
from app.ai.schemas import DeepfakeDetectionResult


class MockDeepfakeDetector(DeepfakeDetector):
    """Development and demo mock analyzer simulating deepfake detection outputs."""

    def __init__(
        self,
        model_name: str = "VoxShield-MockDeepfakeDetector",
        model_version: str = "mock-voxguard-v1.0-demo",
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

    async def analyze(
        self,
        audio_bytes: bytes,
        sample_rate: int = 16000,
        context: Optional[dict] = None,
    ) -> DeepfakeDetectionResult:
        start_time = time.perf_counter()
        analysis_id = str(uuid.uuid4())
        ctx = context or {}
        scenario = ctx.get("demo_scenario", "").lower()

        # Deterministic simulation scenarios for demonstrations
        if scenario == "voice_clone":
            ai_prob = 0.96
            classification = "LIKELY_AI_GENERATED"
            artifacts = ["neural_vocoder_discontinuity", "diffusion_spectral_smoothing"]
            confidence = 0.95
        elif scenario == "suspicious":
            ai_prob = 0.58
            classification = "SUSPICIOUS"
            artifacts = ["unnatural_pitch_regularity"]
            confidence = 0.82
        elif scenario == "normal":
            ai_prob = 0.04
            classification = "LIKELY_HUMAN"
            artifacts = []
            confidence = 0.94
        else:
            # Reproducible derivation from content digest
            digest = hashlib.sha256(audio_bytes).hexdigest() if audio_bytes else "0" * 64
            val = int(digest[:6], 16) / 0xFFFFFF
            ai_prob = round(min(0.98, max(0.02, val)), 4)
            if ai_prob >= 0.70:
                classification = "LIKELY_AI_GENERATED"
                artifacts = ["high_frequency_phase_jitter", "synthetic_vocoder_envelope"]
            elif ai_prob >= 0.40:
                classification = "SUSPICIOUS"
                artifacts = ["unnatural_pitch_regularity"]
            else:
                classification = "LIKELY_HUMAN"
                artifacts = []
            confidence = 0.91

        human_prob = round(1.0 - ai_prob, 4)
        elapsed_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

        return DeepfakeDetectionResult(
            analysis_id=analysis_id,
            classification=classification,
            ai_probability=ai_prob,
            human_probability=human_prob,
            speaker_match_score=0.88 if classification == "LIKELY_HUMAN" else 0.42,
            liveness_score=0.85 if classification == "LIKELY_HUMAN" else 0.35,
            confidence=confidence,
            engine_type=self.engine_type,
            model_name=self.model_name,
            model_version=self.model_version,
            inference_time_ms=elapsed_ms,
            is_mock=True,
            warning="DEMO/MOCK: Simulated neural output. Does not constitute cryptographic or live guarantee.",
            detected_artifacts=artifacts,
            timestamp=datetime.now(timezone.utc),
        )
