"""VoxShield AI — Base AI Component Interface."""

from abc import ABC
from typing import Any, Dict


class BaseAIComponent(ABC):
    """Abstract foundation for all pluggable AI models and adapters."""

    def __init__(
        self,
        model_name: str,
        model_version: str,
        device: str = "cpu",
        engine_type: str = "MOCK_DEMO_MODEL",
    ):
        self.model_name = model_name
        self.model_version = model_version
        self.device = device
        self.engine_type = engine_type  # "REAL_LOCAL_MODEL" or "MOCK_DEMO_MODEL"

    def get_status(self) -> Dict[str, Any]:
        """Return non-sensitive model availability and health metadata."""
        return {
            "available": True,
            "model_name": self.model_name,
            "model_version": self.model_version,
            "device": self.device,
            "engine_type": self.engine_type,
        }
