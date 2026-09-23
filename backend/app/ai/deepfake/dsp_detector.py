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
        pitch_feats = audio_feature_extractor.extract_pitch_f0(waveform, sr=sr)
        subband = audio_feature_extractor.extract_subband_energy(waveform, sr=sr)
        mfcc = audio_feature_extractor.extract_mfcc(waveform, sr=sr, n_mfcc=13)

        flatness = spec_feats.get("spectral_flatness", 0.0)
        zcr = spec_feats.get("zero_crossing_rate", 0.0)
        spectral_flux = spec_feats.get("spectral_flux", 0.0)
        rolloff_95 = spec_feats.get("spectral_rolloff_95", 0.0)

        f0_jitter = pitch_feats.get("f0_jitter", 0.0)
        f0_std = pitch_feats.get("f0_std", 0.0)
        voiced_ratio = pitch_feats.get("voiced_ratio", 0.0)
        pitch_jump_rate = pitch_feats.get("pitch_jump_rate", 0.0)

        high_ratio = subband.get("high_ratio", 0.1)
        mfcc_var = float(np.var(mfcc)) if mfcc.size > 0 else 1.0

        artifacts = []
        synthetic_score = 0.0

        # Feature A: Pitch Micro-Jitter (Natural human speech has 0.5%–3.5% jitter; synthetic TTS has < 0.2% or erratic jumps)
        if voiced_ratio >= 0.25:
            if f0_jitter < 0.003 and f0_std < 10.0:
                artifacts.append("unnatural_pitch_rigidity")
                synthetic_score += 0.35
            elif f0_jitter < 0.005:
                artifacts.append("compressed_intonation_contour")
                synthetic_score += 0.18
            if pitch_jump_rate > 0.18:
                artifacts.append("unphysiological_pitch_discontinuity")
                synthetic_score += 0.25

        # Feature B: Spectral Flux & Diffusion Smoothing (Diffusion/GAN models exhibit unnatural inter-frame spectral uniformity)
        if spectral_flux > 0.0:
            if spectral_flux < 0.08:
                artifacts.append("diffusion_spectral_smoothing")
                synthetic_score += 0.30
            elif spectral_flux < 0.14:
                artifacts.append("synthetic_spectral_flux_uniformity")
                synthetic_score += 0.15

        # Feature C: High-Frequency Band Rolloff & Vocoder Energy Dispersion
        if high_ratio > 0.45:
            artifacts.append("high_frequency_harmonic_leakage")
            synthetic_score += 0.28
        elif high_ratio < 0.02 and len(waveform) > int(0.8 * sr):
            artifacts.append("abnormal_brickwall_cutoff")
            synthetic_score += 0.20

        # Feature D: Vocoder Phase Dispersion / Aperiodic Flatness
        if flatness > 0.28 and zcr > 0.18:
            artifacts.append("vocoder_phase_discontinuity")
            synthetic_score += 0.30
        elif flatness > 0.20:
            artifacts.append("unnatural_spectral_flatness")
            synthetic_score += 0.15

        # Feature E: Cepstral Dynamic Range
        if mfcc_var < 0.85:
            synthetic_score += 0.12

        # Synthetic probability calibration
        ai_prob = round(float(min(0.98, max(0.02, synthetic_score))), 4)
        human_prob = round(1.0 - ai_prob, 4)

        if ai_prob >= 0.65:
            classification = "LIKELY_AI_GENERATED"
        elif ai_prob >= 0.38:
            classification = "SUSPICIOUS"
        else:
            classification = "LIKELY_HUMAN"

        elapsed_ms = round((time.perf_counter() - start_time) * 1000.0, 2)
        confidence = round(0.70 + abs(ai_prob - 0.5) * 0.55, 4)

        return DeepfakeDetectionResult(
            analysis_id=analysis_id,
            classification=classification,
            ai_probability=ai_prob,
            human_probability=human_prob,
            speaker_match_score=round(max(0.0, 1.0 - ai_prob * 0.7), 4),
            liveness_score=round(max(0.05, 1.0 - (flatness * 1.2)), 4),
            confidence=confidence,
            engine_type=self.engine_type,
            model_name=self.model_name,
            model_version=self.model_version,
            inference_time_ms=elapsed_ms,
            is_mock=False,
            warning="LOCAL_DSP_ANALYZER: Output derived from physical acoustic DSP heuristics, not a trained neural model.",
            detected_artifacts=artifacts,
            timestamp=datetime.now(timezone.utc),
        )
