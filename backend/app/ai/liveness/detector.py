"""VoxShield AI — Local Liveness Detector (Intelligent Adapter & Registry)."""

import os
from typing import Optional

from app.ai.config import (
    ENGINE_LOCAL_DSP,
    ENGINE_MOCK_DEMO,
    ENGINE_REAL_PRETRAINED,
    ai_settings,
)
from app.ai.liveness.base import LivenessDetector
from app.ai.liveness.dsp_liveness import DSPLivenessDetector
from app.ai.liveness.mock import MockLivenessDetector
from app.ai.liveness.pretrained_liveness import PretrainedLivenessDetector
from app.ai.registry import ModelMetadata, model_registry
from app.ai.schemas import LivenessResult
from app.core.logging import logger


class LocalLivenessDetector(LivenessDetector):
    """Intelligent adapter orchestrating pretrained ONNX neural anti-spoofing with honest DSP fallback."""

    def __init__(
        self,
        model_name: Optional[str] = None,
        model_version: Optional[str] = None,
        device: str = "cpu",
        model_path: Optional[str] = None,
        fallback_mode: Optional[str] = None,
    ):
        dev = device or ai_settings.AI_DEVICE
        fb = fallback_mode or ai_settings.AI_FALLBACK_MODE
        path = model_path or ai_settings.LIVENESS_MODEL_PATH

        self.device = dev
        self.model_path = path
        self.fallback_mode = fb

        self._active_engine: LivenessDetector
        self._pretrained: Optional[PretrainedLivenessDetector] = None
        self._dsp: DSPLivenessDetector = DSPLivenessDetector(device=dev)
        self._mock: MockLivenessDetector = MockLivenessDetector(device=dev)

        # 1. Attempt to load real pretrained model if checkpoint exists
        if path and os.path.exists(path):
            name = model_name or "AcousticAntiSpoof-Replay-ONNX"
            ver = model_version or "replay-v1.0"
            self._pretrained = PretrainedLivenessDetector(
                model_path=path,
                model_name=name,
                model_version=ver,
                device=dev,
            )
            if self._pretrained.available:
                self._active_engine = self._pretrained
            else:
                self._active_engine = self._resolve_fallback()
        else:
            self._active_engine = self._resolve_fallback()

        super().__init__(
            model_name=self._active_engine.model_name,
            model_version=self._active_engine.model_version,
            device=self._active_engine.device,
            engine_type=self._active_engine.engine_type,
            framework=self._active_engine.framework,
            available=self._active_engine.available,
            status=self._active_engine.status,
        )

        # Register in central ModelRegistry
        self._register_in_model_registry()

    def _resolve_fallback(self) -> LivenessDetector:
        """Resolve fallback implementation when real neural weights are not present."""
        if self.fallback_mode == "none":
            logger.warning("Pretrained liveness model weights missing and AI_FALLBACK_MODE='none'. Model marked unavailable.")
            detector = PretrainedLivenessDetector(model_path=self.model_path or "missing.onnx", device=self.device)
            detector.available = False
            detector.status = "ADAPTER_READY_NO_WEIGHTS"
            return detector
        elif self.fallback_mode == "mock":
            logger.info("Operating liveness detector in MOCK_DEMO_MODEL mode.")
            return self._mock
        else:
            # Default fallback: LOCAL_DSP_ANALYZER
            logger.info("Pretrained liveness weights not installed. Operating in LOCAL_DSP_ANALYZER mode.")
            return self._dsp

    def _register_in_model_registry(self) -> None:
        model_registry.register(
            "liveness_detector",
            ModelMetadata(
                model_name=self.model_name,
                version=self.model_version,
                engine_type=self.engine_type,
                framework=self.framework,
                device=self.device,
                input_sample_rate=16000,
                input_duration_sec=1.5,
                available=self.available,
                status=self.status,
                model_source="ASVspoof Physical Access (PA) Replay Benchmark / Acoustic Impulse Analysis",
                description="Liveness and loudspeaker replay attack detection engine.",
            ),
        )

    async def detect_liveness(
        self,
        audio_bytes: bytes,
        sample_rate: int = 16000,
    ) -> LivenessResult:
        result = await self._active_engine.detect_liveness(audio_bytes, sample_rate=sample_rate)
        if result.inference_time_ms is not None:
            model_registry.update_status(
                "liveness_detector",
                available=self.available,
                status=self.status,
                engine_type=self.engine_type,
                inference_time_ms=result.inference_time_ms,
            )
        return result
