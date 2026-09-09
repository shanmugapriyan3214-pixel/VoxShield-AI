"""VoxShield AI — Central Model Registry.

Tracks availability, framework, device, engine type, and operational status
of all pluggable deep learning models, DSP analyzers, and simulation components.

STRICT SECURITY INVARIANT:
Never exposes absolute filesystem paths, internal weights, secrets, or credentials.
"""

import os
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class ModelMetadata(BaseModel):
    """Safe, non-sensitive model registration record."""
    model_name: str
    version: str = "1.0.0"
    engine_type: str = Field(..., description="REAL_PRETRAINED_MODEL | LOCAL_DSP_ANALYZER | MOCK_DEMO_MODEL")
    framework: str = Field(default="onnxruntime", description="onnxruntime | dsp_numpy | mock")
    device: str = "cpu"
    input_sample_rate: int = 16000
    input_duration_sec: float = 1.5
    available: bool = True
    status: str = Field(default="LOADED", description="LOADED | ADAPTER_READY_NO_WEIGHTS | FALLBACK_DSP | MOCK | ERROR")
    inference_time_ms: Optional[float] = None

    @property
    def benchmark_avg_ms(self) -> Optional[float]:
        return self.inference_time_ms
    model_source: Optional[str] = None
    description: Optional[str] = None
    model_path: Optional[str] = None
    component_name: Optional[str] = None
    input_shape: Optional[str] = None
    output_shape: Optional[str] = None

    # Phase 4 Provenance Extensions
    provenance: Optional[str] = None
    type: Optional[str] = None
    engine: Optional[str] = None
    weights_installed: Optional[bool] = None
    weights_loaded: Optional[bool] = None
    inference_enabled: Optional[bool] = None

    def __init__(self, **data: Any):
        if "model_version" in data and "version" not in data:
            data["version"] = data.pop("model_version")
        if "provenance" not in data or data["provenance"] is None:
            data["provenance"] = data.get("engine_type")
        is_real = (data.get("provenance") == "REAL_PRETRAINED_MODEL")
        if "weights_installed" not in data or data["weights_installed"] is None:
            mp = data.get("model_path")
            data["weights_installed"] = bool(is_real and mp and os.path.exists(mp))
        if "weights_loaded" not in data or data["weights_loaded"] is None:
            avail = data.get("available", True)
            stat = data.get("status", "LOADED")
            data["weights_loaded"] = bool(is_real and avail and stat in ("LOADED", "READY", "ACTIVE"))
        if "inference_enabled" not in data or data["inference_enabled"] is None:
            data["inference_enabled"] = data.get("available", True)
        super().__init__(**data)

    def to_dict(self, mask_sensitive: bool = True) -> Dict[str, Any]:
        """Convert metadata to dictionary, safely formatted for public API reporting."""
        d = self.model_dump()
        prov = self.provenance or self.engine_type
        d["name"] = self.model_name
        d["provenance"] = prov
        d["engine"] = self.engine or (
            "ONNX Runtime" if "onnx" in self.framework.lower()
            else ("DSP Signal Processor" if "dsp" in self.framework.lower() else "Mock Simulation")
        )
        d["framework"] = self.framework
        d["device"] = self.device.upper()

        is_real = (prov == "REAL_PRETRAINED_MODEL")
        if self.weights_installed is not None:
            d["weights_installed"] = self.weights_installed
        else:
            d["weights_installed"] = bool(is_real and self.model_path and os.path.exists(self.model_path))

        if self.weights_loaded is not None:
            d["weights_loaded"] = self.weights_loaded
        else:
            d["weights_loaded"] = bool(is_real and self.available and self.status in ("LOADED", "READY", "ACTIVE"))

        if self.inference_enabled is not None:
            d["inference_enabled"] = self.inference_enabled
        else:
            d["inference_enabled"] = self.available

        if mask_sensitive and d.get("model_path"):
            d["model_path"] = "[RESTRICTED_SERVER_PATH]"
        return d


class ModelRegistry:
    """Central registry tracking runtime status of all VoxShield AI models."""

    def __init__(self):
        self._models: Dict[str, ModelMetadata] = {}

    def register(self, key_or_meta: Any, metadata: Optional[ModelMetadata] = None) -> None:
        """Register or update a model component in the registry."""
        if metadata is not None:
            self._models[str(key_or_meta)] = metadata
        elif isinstance(key_or_meta, ModelMetadata):
            # Infer key from model_name
            key = getattr(key_or_meta, "component_name", key_or_meta.model_name.lower().replace("-", "_"))
            self._models[key] = key_or_meta
        else:
            raise ValueError("Invalid arguments to register()")

    def get_model(self, key: str) -> Optional[ModelMetadata]:
        """Retrieve model metadata by key."""
        return self._models.get(key)

    def get(self, key: str) -> Optional[ModelMetadata]:
        """Alias for get_model."""
        return self.get_model(key)

    def update_status(
        self,
        key: str,
        available: bool,
        status: str,
        engine_type: Optional[str] = None,
        inference_time_ms: Optional[float] = None,
    ) -> None:
        """Update runtime availability and benchmark metrics."""
        if key in self._models:
            model = self._models[key]
            model.available = available
            model.status = status
            if engine_type:
                model.engine_type = engine_type
            if inference_time_ms is not None:
                model.inference_time_ms = inference_time_ms

    def record_benchmark(self, key: str, duration_ms: float) -> None:
        """Record inference timing, calculating a running average."""
        if key in self._models:
            model = self._models[key]
            if model.inference_time_ms is None:
                model.inference_time_ms = round(duration_ms, 2)
            else:
                model.inference_time_ms = round((model.inference_time_ms + duration_ms) / 2.0, 2)

    def get_status_report(self, mask_sensitive: bool = True) -> Dict[str, Any]:
        """Return clean, non-sensitive status report for all registered models.
        
        Guaranteed safe for public/audit consumption.
        """
        report = {}
        for key, meta in self._models.items():
            entry = meta.to_dict(mask_sensitive=mask_sensitive)
            report[key] = entry
        return report

    def get_summary(self, mask_sensitive: bool = True) -> Dict[str, Any]:
        """Alias for get_status_report."""
        return self.get_status_report(mask_sensitive=mask_sensitive)


# Global central model registry instance
model_registry = ModelRegistry()
