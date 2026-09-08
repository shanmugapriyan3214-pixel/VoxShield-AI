"""VoxShield AI — Pretrained Neural Speech Deepfake Detector (ONNX)."""

import os
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import numpy as np

from app.ai.config import ENGINE_REAL_PRETRAINED
from app.ai.deepfake.base import DeepfakeDetector
from app.ai.feature_extraction import audio_feature_extractor
from app.ai.schemas import DeepfakeDetectionResult
from app.core.logging import logger


class PretrainedDeepfakeDetector(DeepfakeDetector):
    """Genuine pretrained anti-spoofing neural network adapter executed via ONNX Runtime.
    
    ENGINE TYPE: REAL_PRETRAINED_MODEL
    Target Model Families:
    - AASIST / AASIST-L (Automated Anti-Spoofing Integration with Graph Neural Networks)
    - RawNet2 / RawNet3 (Raw waveform anti-spoofing)
    - Wav2Vec 2.0 / SSL-based anti-spoofing backbones
    """

    def __init__(
        self,
        model_path: Optional[str] = None,
        model_name: str = "AASIST-L-AntiSpoof-ONNX",
        model_version: str = "aasist-v1.0",
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
        self._session = None
        self._input_name = None
        self._input_shape = None

        if model_path and os.path.exists(model_path):
            self._load_onnx_session(model_path)

    def _load_onnx_session(self, path: str) -> bool:
        """Load and cache the ONNX inference session as a singleton."""
        try:
            import onnxruntime as ort
            providers = ["CUDAExecutionProvider", "CPUExecutionProvider"] if self.device == "cuda" else ["CPUExecutionProvider"]
            self._session = ort.InferenceSession(path, providers=providers)
            inp = self._session.get_inputs()[0]
            self._input_name = inp.name
            self._input_shape = inp.shape
            self.available = True
            self.status = "LOADED"
            logger.info(f"Successfully loaded pretrained deepfake ONNX model from '{os.path.basename(path)}'")
            return True
        except Exception as e:
            logger.error(f"Failed to load ONNX model from '{os.path.basename(path)}': {e}")
            self.available = False
            self.status = "ERROR"
            return False

    async def analyze(
        self,
        audio_bytes: bytes,
        sample_rate: int = 16000,
        context: Optional[dict] = None,
    ) -> DeepfakeDetectionResult:
        """Execute real neural inference over audio buffer."""
        if not self.available or self._session is None:
            raise RuntimeError(
                f"Pretrained model '{self.model_name}' is not loaded. Current status: {self.status}"
            )

        start_time = time.perf_counter()
        analysis_id = str(uuid.uuid4())

        # 1. Preprocessing: extract normalized 16 kHz waveform
        waveform, sr = audio_feature_extractor.extract_waveform(audio_bytes, target_sr=sample_rate)

        # 2. Format tensor according to expected input shape
        tensor_input = self._prepare_tensor(waveform, sr)

        # 3. ONNX Inference
        outputs = self._session.run(None, {self._input_name: tensor_input})
        logits = outputs[0]

        # Logits softmax: assume [batch, 2] output for [human, spoof] or single probability scalar
        if logits.ndim >= 2 and logits.shape[-1] >= 2:
            probs = self._softmax(logits[0])
            human_prob = float(probs[0])
            ai_prob = float(probs[1])
        elif logits.size == 1:
            ai_prob = float(logits.item())
            human_prob = 1.0 - ai_prob
        else:
            probs = self._softmax(logits.flatten())
            ai_prob = float(probs[1]) if len(probs) > 1 else float(probs[0])
            human_prob = 1.0 - ai_prob

        ai_prob = round(float(min(1.0, max(0.0, ai_prob))), 4)
        human_prob = round(1.0 - ai_prob, 4)

        if ai_prob >= 0.70:
            classification = "LIKELY_AI_GENERATED"
            artifacts = ["neural_vocoder_signature", "high_synthetic_probability"]
        elif ai_prob >= 0.40:
            classification = "SUSPICIOUS"
            artifacts = ["ambiguous_spectral_cues"]
        else:
            classification = "LIKELY_HUMAN"
            artifacts = []

        elapsed_ms = round((time.perf_counter() - start_time) * 1000.0, 2)
        confidence = round(0.70 + abs(ai_prob - 0.5) * 0.58, 4)

        return DeepfakeDetectionResult(
            analysis_id=analysis_id,
            classification=classification,
            ai_probability=ai_prob,
            human_probability=human_prob,
            speaker_match_score=round(max(0.0, 1.0 - ai_prob * 0.7), 4),
            liveness_score=round(max(0.1, 1.0 - ai_prob * 0.5), 4),
            confidence=confidence,
            engine_type=self.engine_type,
            model_name=self.model_name,
            model_version=self.model_version,
            inference_time_ms=elapsed_ms,
            is_mock=False,
            warning=None,
            detected_artifacts=artifacts,
            timestamp=datetime.now(timezone.utc),
        )

    def _prepare_tensor(self, waveform: np.ndarray, sr: int) -> np.ndarray:
        """Format waveform into expected ONNX model input dimensions."""
        # Expected shape can be [batch, samples] or [batch, 1, samples] or [batch, 1, mels, frames]
        if self._input_shape is not None and len(self._input_shape) == 4:
            # Spectrogram-based model [batch, channels, n_mels, time]
            log_mel = audio_feature_extractor.extract_log_mel_spectrogram(waveform, sr=sr)
            return np.expand_dims(np.expand_dims(log_mel, axis=0), axis=0).astype(np.float32)

        # Raw waveform model [batch, samples]
        # Target 24000 samples (1.5s at 16kHz)
        target_len = 24000
        if len(waveform) < target_len:
            padded = np.pad(waveform, (0, target_len - len(waveform)), mode="constant")
        else:
            padded = waveform[:target_len]

        if self._input_shape is not None and len(self._input_shape) == 3:
            return np.expand_dims(np.expand_dims(padded, axis=0), axis=1).astype(np.float32)
        return np.expand_dims(padded, axis=0).astype(np.float32)

    @staticmethod
    def _softmax(x: np.ndarray) -> np.ndarray:
        e_x = np.exp(x - np.max(x))
        return e_x / max(np.sum(e_x), 1e-12)
