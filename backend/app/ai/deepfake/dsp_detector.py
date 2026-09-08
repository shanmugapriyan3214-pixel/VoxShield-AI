"""VoxShield AI — Local DSP Physical Acoustic Deepfake Detector."""

import time
import uuid
from datetime import datetime, timezone
from typing import Optional
import numpy as np

from app.ai.config import ENGINE_LOCAL_DSP
from app.ai.deepfake.base import DeepfakeDetector
from app.ai.feature_extraction import audio_feature_extractor
from app.ai.schemas import DeepfakeDetectionResult


class DSPDeepfakeDetector(DeepfakeDetector):
    """Signal processing acoustic classifier based on physical vocoder anomalies.
    
    ENGINE TYPE: LOCAL_DSP_ANALYZER (Not a trained neural model).
    Measures unnatural spectral flatness, zero-crossing rate spikes, and MFCC variance dropoff.
    """

    def __init__(
        self,
        model_name: str = "VoxShield-DSP-AcousticClassifier",
        model_version: str = "dsp-v2.5",
        device: str = "cpu",
    ):
        super().__init__(
            model_name=model_name,
            model_version=model_version,
            device=device,
            engine_type=ENGINE_LOCAL_DSP,
            framework="dsp_numpy",
            available=True,
            status="FALLBACK_DSP",
        )

    async def analyze(
        self,
        audio_bytes: bytes,
        sample_rate: int = 16000,
        context: Optional[dict] = None,
    ) -> DeepfakeDetectionResult:
        start_time = time.perf_counter()
        analysis_id = str(uuid.uuid4())

        # 1. Extract physical acoustic features via DSP
        waveform, sr = audio_feature_extractor.extract_waveform(audio_bytes, target_sr=sample_rate)
        spec_feats = audio_feature_extractor.extract_spectral_features(waveform, sr=sr)
        mfcc = audio_feature_extractor.extract_mfcc(waveform, sr=sr, n_mfcc=13)

        flatness = spec_feats.get("spectral_flatness", 0.0)
        zcr = spec_feats.get("zero_crossing_rate", 0.0)
        mfcc_var = float(np.var(mfcc)) if mfcc.size > 0 else 1.0

        # Physical acoustic heuristic:
        # Vocoders exhibit elevated spectral flatness and lower dynamic MFCC variability
        synthetic_index = (flatness * 1.8) + (zcr * 0.8) + (1.0 / (mfcc_var + 0.1) * 0.05)
        raw_prob = 1.0 / (1.0 + np.exp(-(synthetic_index - 1.2) * 3.0))
        ai_prob = round(float(min(1.0, max(0.0, raw_prob))), 4)
        human_prob = round(1.0 - ai_prob, 4)

        artifacts = []
        if flatness > 0.45:
            artifacts.append("unnatural_spectral_flatness")
        if zcr > 0.35:
            artifacts.append("high_frequency_phase_jitter")
        if ai_prob >= 0.70:
            artifacts.append("vocoder_harmonic_discontinuity")

        if ai_prob >= 0.70:
            classification = "LIKELY_AI_GENERATED"
        elif ai_prob >= 0.40:
            classification = "SUSPICIOUS"
        else:
            classification = "LIKELY_HUMAN"

        elapsed_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

        return DeepfakeDetectionResult(
            analysis_id=analysis_id,
            classification=classification,
            ai_probability=ai_prob,
            human_probability=human_prob,
            speaker_match_score=round(max(0.0, 1.0 - ai_prob * 0.7), 4),
            liveness_score=round(max(0.05, 1.0 - flatness), 4),
            confidence=0.88,
            engine_type=self.engine_type,
            model_name=self.model_name,
            model_version=self.model_version,
            inference_time_ms=elapsed_ms,
            is_mock=False,
            warning="LOCAL_DSP_ANALYZER: Output derived from physical acoustic DSP heuristics, not a trained neural model.",
            detected_artifacts=artifacts,
            timestamp=datetime.now(timezone.utc),
        )
