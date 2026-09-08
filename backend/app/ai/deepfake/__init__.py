"""VoxShield AI — Deepfake Detection Module."""

from app.ai.deepfake.base import DeepfakeDetector
from app.ai.deepfake.mock import MockDeepfakeDetector
from app.ai.deepfake.local_model import LocalDeepfakeDetector

__all__ = [
    "DeepfakeDetector",
    "MockDeepfakeDetector",
    "LocalDeepfakeDetector",
]
