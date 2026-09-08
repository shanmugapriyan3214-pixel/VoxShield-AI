"""VoxShield AI — Base AI Component Interface."""

from abc import ABC
from typing import Any, Dict
from app.ai.config import (
    ENGINE_LOCAL_DSP,
    ENGINE_MOCK_DEMO,
    ENGINE_REAL_PRETRAINED,
)

__all__ = [
    "BaseAIComponent",
    "ENGINE_REAL_PRETRAINED",
    "ENGINE_LOCAL_DSP",
    "ENGINE_MOCK_DEMO",
]


class BaseAIComponent(ABC):
    """Abstract foundation for all pluggable AI models and adapters."""

    def __init__(
        self,
        model_name: str,
        model_version: str,
        device: str = "cpu",
        engine_type: str = ENGINE_MOCK_DEMO,
        framework: str = "custom",
        available: bool = True,
        status: str = "LOADED",
    ):
        self.model_name = model_name
        self.model_version = model_version
        self.device = device
        self.engine_type = engine_type  # REAL_PRETRAINED_MODEL | LOCAL_DSP_ANALYZER | MOCK_DEMO_MODEL
        self.framework = framework
        self.available = available
        self.status = status

    def get_status(self) -> Dict[str, Any]:
        """Return non-sensitive model availability and health metadata."""
        return {
            "available": self.available,
            "status": self.status,
            "model_name": self.model_name,
            "model_version": self.model_version,
            "device": self.device,
            "engine_type": self.engine_type,
            "framework": self.framework,
        }
