"""VoxShield AI — Deepfake Detection Package."""

from app.ai.deepfake.base import DeepfakeDetector
from app.ai.deepfake.dsp_detector import DSPDeepfakeDetector
from app.ai.deepfake.local_model import LocalDeepfakeDetector
from app.ai.deepfake.mock import MockDeepfakeDetector
from app.ai.deepfake.pretrained_model import PretrainedDeepfakeDetector

__all__ = [
    "DeepfakeDetector",
    "DSPDeepfakeDetector",
    "LocalDeepfakeDetector",
    "MockDeepfakeDetector",
    "PretrainedDeepfakeDetector",
]
