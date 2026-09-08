"""VoxShield AI — Pretrained Neural Speaker Encoder (ONNX)."""

import os
import time
from typing import Optional
import numpy as np

from app.ai.base import BaseAIComponent
from app.ai.config import ENGINE_REAL_PRETRAINED
from app.ai.feature_extraction import audio_feature_extractor
from app.ai.schemas import SpeakerEmbeddingResult
from app.core.logging import logger


class PretrainedSpeakerEmbeddingService(BaseAIComponent):
    """Genuine pretrained deep speaker verification encoder executed via ONNX Runtime.
    
    ENGINE TYPE: REAL_PRETRAINED_MODEL
    Target Model Families:
    - ECAPA-TDNN (Emphasized Channel Attention, Propagation and Aggregation Time Delay Neural Network)
    - ResNet34-SE / x-vector
    - WavLM Large / Base speaker embedding checkpoints
    """

    def __init__(
        self,
        model_path: Optional[str] = None,
        model_name: str = "ECAPA-TDNN-VoxCeleb-ONNX",
        model_version: str = "ecapa-v1.0",
        dimension: int = 192,
        device: str = "cpu",
    ):
        super().__init__(
            model_name=model_name,
            model_version=model_version,
            device=device,
            engine_type=ENGINE_REAL_PRETRAINED,
            framework="onnxruntime",
            available=False,
            status="ADAPTER_READY_NO_WEIGHTS",
        )
        self.model_path = model_path
        self.dimension = dimension
        self._session = None
        self._input_name = None
        self._input_shape = None

        if model_path and os.path.exists(model_path):
            self._load_onnx_session(model_path)

    def _load_onnx_session(self, path: str) -> bool:
        """Load and cache the ONNX speaker encoder session as a singleton."""
        try:
            import onnxruntime as ort
            providers = ["CUDAExecutionProvider", "CPUExecutionProvider"] if self.device == "cuda" else ["CPUExecutionProvider"]
            self._session = ort.InferenceSession(path, providers=providers)
            inp = self._session.get_inputs()[0]
            self._input_name = inp.name
            self._input_shape = inp.shape
            self.available = True
            self.status = "LOADED"
            logger.info(f"Successfully loaded pretrained speaker encoder ONNX model from '{os.path.basename(path)}'")
            return True
        except Exception as e:
            logger.error(f"Failed to load speaker encoder ONNX model from '{os.path.basename(path)}': {e}")
            self.available = False
            self.status = "ERROR"
            return False

    async def extract_embedding(
        self,
        audio_bytes: bytes,
        sample_rate: int = 16000,
    ) -> SpeakerEmbeddingResult:
        """Extract a 192-d or 512-d unit-normalized speaker embedding vector."""
        if not self.available or self._session is None:
            raise RuntimeError(
                f"Pretrained speaker model '{self.model_name}' is not loaded. Current status: {self.status}"
            )

        start_time = time.perf_counter()

        waveform, sr = audio_feature_extractor.extract_waveform(audio_bytes, target_sr=sample_rate)
        tensor_input = self._prepare_tensor(waveform, sr)

        outputs = self._session.run(None, {self._input_name: tensor_input})
        raw_vec = outputs[0]

        # Flatten output to 1D vector
        vec = raw_vec.flatten()
        actual_dim = len(vec)

        # L2 normalization to unit hypersphere
        norm = np.linalg.norm(vec)
        norm_vec = vec / max(norm, 1e-6)
        embedding_list = [round(float(x), 6) for x in norm_vec]
        elapsed_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

        return SpeakerEmbeddingResult(
            embedding=embedding_list,
            dimension=actual_dim,
            engine_type=self.engine_type,
            model_name=self.model_name,
            model_version=self.model_version,
            inference_time_ms=elapsed_ms,
            is_mock=False,
        )

    def _prepare_tensor(self, waveform: np.ndarray, sr: int) -> np.ndarray:
        """Format waveform into expected input tensor for the speaker encoder."""
        if self._input_shape is not None and len(self._input_shape) == 3:
            # e.g. [batch, time_frames, n_mels] or [batch, n_mels, time_frames]
            log_mel = audio_feature_extractor.extract_log_mel_spectrogram(waveform, sr=sr, n_mels=80)
            if self._input_shape[1] == 80:
                return np.expand_dims(log_mel, axis=0).astype(np.float32)
            else:
                return np.expand_dims(log_mel.T, axis=0).astype(np.float32)

        # Default raw waveform tensor [batch, samples]
        target_len = 24000
        if len(waveform) < target_len:
            padded = np.pad(waveform, (0, target_len - len(waveform)), mode="constant")
        else:
            padded = waveform[:target_len]
        return np.expand_dims(padded, axis=0).astype(np.float32)
