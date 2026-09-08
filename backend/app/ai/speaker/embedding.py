"""VoxShield AI — Speaker Voice Representation & Embedding Services."""

import hashlib
import math
import os
import time
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

from app.ai.base import BaseAIComponent
from app.ai.config import (
    ENGINE_LOCAL_DSP,
    ENGINE_MOCK_DEMO,
    ENGINE_REAL_PRETRAINED,
    ai_settings,
)
from app.ai.registry import ModelMetadata, model_registry
from app.ai.schemas import SpeakerEmbeddingResult
from app.ai.speaker.dsp_embedding import DSPSpeakerEmbeddingService
from app.ai.speaker.pretrained_embedding import PretrainedSpeakerEmbeddingService
from app.core.logging import logger


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


class LocalSpeakerEmbeddingService(SpeakerEmbeddingService):
    """Intelligent adapter orchestrating pretrained ONNX neural speaker encoders with honest DSP fallback."""

    def __init__(
        self,
        dimension: int = 192,
        model_name: Optional[str] = None,
        model_version: Optional[str] = None,
        device: str = "cpu",
        model_path: Optional[str] = None,
        fallback_mode: Optional[str] = None,
    ):
        dev = device or ai_settings.AI_DEVICE
        fb = fallback_mode or ai_settings.AI_FALLBACK_MODE
        path = model_path or ai_settings.SPEAKER_MODEL_PATH

        self.device = dev
        self.model_path = path
        self.fallback_mode = fb
        self.dimension = dimension

        self._active_engine: BaseAIComponent
        self._pretrained: Optional[PretrainedSpeakerEmbeddingService] = None
        self._dsp: DSPSpeakerEmbeddingService = DSPSpeakerEmbeddingService(dimension=dimension, device=dev)
        self._mock: MockSpeakerEmbeddingService = MockSpeakerEmbeddingService(dimension=dimension, device=dev)

        # 1. Attempt to load real pretrained model if checkpoint exists
        if path and os.path.exists(path):
            name = model_name or "ECAPA-TDNN-VoxCeleb-ONNX"
            ver = model_version or "ecapa-v1.0"
            self._pretrained = PretrainedSpeakerEmbeddingService(
                model_path=path,
                model_name=name,
                model_version=ver,
                dimension=dimension,
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

    def _resolve_fallback(self) -> BaseAIComponent:
        """Resolve fallback implementation when real neural weights are not present."""
        if self.fallback_mode == "none":
            logger.warning("Pretrained speaker model weights missing and AI_FALLBACK_MODE='none'. Model marked unavailable.")
            service = PretrainedSpeakerEmbeddingService(model_path=self.model_path or "missing.onnx", dimension=self.dimension, device=self.device)
            service.available = False
            service.status = "ADAPTER_READY_NO_WEIGHTS"
            return service
        elif self.fallback_mode == "mock":
            logger.info("Operating speaker encoder in MOCK_DEMO_MODEL mode.")
            return self._mock
        else:
            # Default fallback: LOCAL_DSP_ANALYZER
            logger.info("Pretrained speaker encoder weights not installed. Operating in LOCAL_DSP_ANALYZER mode.")
            return self._dsp

    def _register_in_model_registry(self) -> None:
        model_registry.register(
            "speaker_encoder",
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
                model_source="VoxCeleb 1 & 2 Speaker Verification Benchmark (ECAPA-TDNN / ResNet34)",
                description="Speaker voiceprint embedding extractor for cosine identity verification.",
            ),
        )

    async def extract_embedding(
        self,
        audio_bytes: bytes,
        sample_rate: int = 16000,
    ) -> SpeakerEmbeddingResult:
        result = await self._active_engine.extract_embedding(audio_bytes, sample_rate=sample_rate)
        if result.inference_time_ms is not None:
            model_registry.update_status(
                "speaker_encoder",
                available=self.available,
                status=self.status,
                engine_type=self.engine_type,
                inference_time_ms=result.inference_time_ms,
            )
        return result


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
            engine_type=ENGINE_MOCK_DEMO,
            framework="mock",
            available=True,
            status="MOCK",
        )
        self.dimension = dimension

    async def extract_embedding(
        self,
        audio_bytes: bytes,
        sample_rate: int = 16000,
    ) -> SpeakerEmbeddingResult:
        start_time = time.perf_counter()
        digest = hashlib.sha256(audio_bytes).hexdigest() if audio_bytes else "12345678" * 8
        raw_vector = []
        for i in range(self.dimension):
            chunk = digest[(i * 4) % (len(digest) - 4): (i * 4) % (len(digest) - 4) + 4]
            raw_val = (int(chunk, 16) / 0xFFFF) * 2.0 - 1.0
            raw_vector.append(raw_val)

        magnitude = math.sqrt(sum(x * x for x in raw_vector)) or 1.0
        normalized = [round(x / magnitude, 6) for x in raw_vector]
        elapsed_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

        return SpeakerEmbeddingResult(
            embedding=normalized,
            dimension=self.dimension,
            engine_type=self.engine_type,
            model_name=self.model_name,
            model_version=self.model_version,
            inference_time_ms=elapsed_ms,
            is_mock=True,
        )
