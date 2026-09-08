"""VoxShield AI — Local Deepfake Voice Detector (Intelligent Adapter & Registry)."""

import os
from typing import Any, Dict, Optional

from app.ai.config import (
    ENGINE_LOCAL_DSP,
    ENGINE_MOCK_DEMO,
    ENGINE_REAL_PRETRAINED,
    ai_settings,
)
from app.ai.deepfake.base import DeepfakeDetector
from app.ai.deepfake.dsp_detector import DSPDeepfakeDetector
from app.ai.deepfake.mock import MockDeepfakeDetector
from app.ai.deepfake.pretrained_model import PretrainedDeepfakeDetector
from app.ai.registry import ModelMetadata, model_registry
from app.ai.schemas import DeepfakeDetectionResult
from app.core.logging import logger


class LocalDeepfakeDetector(DeepfakeDetector):
    """Orchestrates genuine ONNX neural model execution with transparent DSP fallback.
    
    AUDIT HONESTY INVARIANT:
    - If ONNX model weights exist -> Executes PretrainedDeepfakeDetector (REAL_PRETRAINED_MODEL)
    - If weights are missing & fallback=dsp -> Executes DSPDeepfakeDetector (LOCAL_DSP_ANALYZER)
    - If weights are missing & fallback=none -> Available=False (ADAPTER_READY_NO_WEIGHTS)
    - Under NO condition is a DSP or Mock algorithm reported as a REAL_PRETRAINED_MODEL.
    """

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
        path = model_path or ai_settings.DEEPFAKE_MODEL_PATH

        self.device = dev
        self.model_path = path
        self.fallback_mode = fb

        self._active_engine: DeepfakeDetector
        self._pretrained: Optional[PretrainedDeepfakeDetector] = None
        self._dsp: DSPDeepfakeDetector = DSPDeepfakeDetector(device=dev)
        self._mock: MockDeepfakeDetector = MockDeepfakeDetector(device=dev)

        # 1. Attempt to load real pretrained model if checkpoint exists
        if path and os.path.exists(path):
            name = model_name or "AASIST-L-AntiSpoof-ONNX"
            ver = model_version or "aasist-v1.0"
            self._pretrained = PretrainedDeepfakeDetector(
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

    def _resolve_fallback(self) -> DeepfakeDetector:
        """Resolve fallback implementation when real neural weights are not present."""
        if self.fallback_mode == "none":
            # Declare explicitly unavailable
            logger.warning("Pretrained deepfake model weights missing and AI_FALLBACK_MODE='none'. Model marked unavailable.")
            detector = PretrainedDeepfakeDetector(model_path=self.model_path or "missing.onnx", device=self.device)
            detector.available = False
            detector.status = "ADAPTER_READY_NO_WEIGHTS"
            return detector
        elif self.fallback_mode == "mock":
            logger.info("Operating deepfake detector in MOCK_DEMO_MODEL mode.")
            return self._mock
        else:
            # Default fallback: LOCAL_DSP_ANALYZER
            logger.info("Pretrained deepfake model weights not installed. Operating in LOCAL_DSP_ANALYZER mode.")
            return self._dsp

    def _register_in_model_registry(self) -> None:
        model_registry.register(
            "deepfake_detector",
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
                model_source="ASVspoof 2019/2021 Logical Access Benchmark (AASIST / RawNet2)",
                description="Speech anti-spoofing and synthetic voice clone detector.",
            ),
        )

    async def analyze(
        self,
        audio_bytes: bytes,
        sample_rate: int = 16000,
        context: Optional[dict] = None,
    ) -> DeepfakeDetectionResult:
        result = await self._active_engine.analyze(audio_bytes, sample_rate=sample_rate, context=context)
        # Update registry with latest inference benchmark timing
        if result.inference_time_ms is not None:
            model_registry.update_status(
                "deepfake_detector",
                available=self.available,
                status=self.status,
                engine_type=self.engine_type,
                inference_time_ms=result.inference_time_ms,
            )
        return result

    def _evaluate_acoustic_signatures(self, spec_feats: dict, mfcc: Any) -> float:
        """Physical heuristic compatibility bridge."""
        flatness = spec_feats.get("spectral_flatness", 0.0)
        zcr = spec_feats.get("zero_crossing_rate", 0.0)
        import numpy as np
        mfcc_var = float(np.var(mfcc)) if hasattr(mfcc, "size") and mfcc.size > 0 else 1.0
        synthetic_index = (flatness * 1.8) + (zcr * 0.8) + (1.0 / (mfcc_var + 0.1) * 0.05)
        prob = 1.0 / (1.0 + np.exp(-(synthetic_index - 1.2) * 3.0))
        return float(prob)
