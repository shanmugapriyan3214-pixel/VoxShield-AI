"""VoxShield AI — Multi-Signal AI Voice Authenticity & Decision Fusion Engine.

Implements the multi-signal AI detection architecture:
1. Audio Quality Gating (filters short, silent, or distorted audio into UNCERTAIN)
2. Multiple Independent Detection Signals:
   - Model Probability (AASIST-L / Neural network anti-spoofing)
   - Spectral Characteristics (flatness, centroid, bandwidth, harmonics)
   - Prosodic Dynamics (F0 variability, syllabic rhythm, energy dynamics)
   - Synthetic Artifacts (neural vocoder signatures, diffusion smearing)
   - Anti-Replay Suspicion (loudspeaker coloration and room reverberation)
3. Mathematical Weighted Ensemble Score Fusion
4. Three-Tier Decision: HUMAN, AI_GENERATED, or UNCERTAIN
5. Voice Trust Score (0–100) derived from evidence
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
import numpy as np

from app.ai.artifacts import synthetic_artifact_detector
from app.ai.feature_extraction import audio_feature_extractor
from app.ai.prosody import prosody_analyzer
from app.ai.quality import AudioQualityReport, audio_quality_checker
from app.ai.replay import replay_suspicion_detector


@dataclass
class MultiSignalVerdict:
    """Consolidated authenticity decision with explainable evidence."""
    classification: str          # "HUMAN" | "AI_GENERATED" | "UNCERTAIN"
    ai_probability: float        # 0.015 to 0.985 (calibrated and bounded)
    human_probability: float     # 0.015 to 0.985 (calibrated and bounded)
    confidence: float            # 0.0 to 1.0
    voice_trust_score: int       # 0 to 100
    audio_quality: Dict[str, Any]
    signals: Dict[str, str]      # e.g. {"spectral": "LOW", "prosody": "HIGH", ...}
    signal_scores: Dict[str, float]
    replay_suspicion: float      # 0.0 to 1.0
    detected_artifacts: List[str]
    evidence_summary: str
    diagnostics: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "classification": self.classification,
            "ai_probability": round(self.ai_probability, 4),
            "human_probability": round(self.human_probability, 4),
            "confidence": round(self.confidence, 4),
            "voice_trust_score": self.voice_trust_score,
            "audio_quality": self.audio_quality,
            "signals": self.signals,
            "signal_scores": {k: round(v, 4) for k, v in self.signal_scores.items()},
            "replay_suspicion": round(self.replay_suspicion, 4),
            "detected_artifacts": self.detected_artifacts,
            "evidence_summary": self.evidence_summary,
            "diagnostics": self.diagnostics,
        }


class MultiSignalAuthenticityEngine:
    """Ensemble decision engine fusing neural, spectral, prosodic, and artifact signals."""

    def __init__(
        self,
        weight_model: float = 0.40,
        weight_artifact: float = 0.25,
        weight_spectral: float = 0.20,
        weight_prosody: float = 0.15,
    ):
        self.w_model = weight_model
        self.w_artifact = weight_artifact
        self.w_spectral = weight_spectral
        self.w_prosody = weight_prosody
        # Normalize weights
        total = self.w_model + self.w_artifact + self.w_spectral + self.w_prosody
        self.w_model /= total
        self.w_artifact /= total
        self.w_spectral /= total
        self.w_prosody /= total

    def evaluate(
        self,
        waveform: np.ndarray,
        sr: int = 16000,
        model_ai_prob: float = 0.0,
        model_confidence: float = 0.85,
        temporal_prior: Optional[float] = None,
    ) -> MultiSignalVerdict:
        """Execute multi-signal analysis and ensemble decision fusion."""

        # 1. Step 1: Physical Audio Quality Assessment
        quality: AudioQualityReport = audio_quality_checker.evaluate(waveform, sr=sr)
        quality_dict = quality.to_dict()

        # Hard failure on unprocessable, severely degraded, or low SNR audio -> UNCERTAIN
        if not quality.is_acceptable or quality.status == "INSUFFICIENT" or quality.snr_db < 6.0 or quality.duration_sec < 0.6:
            reason = quality.issues[0] if quality.issues else (
                f"Low SNR ({quality.snr_db:.1f} dB < 6 dB)" if quality.snr_db < 6.0 else "Audio duration too brief (<0.6s)"
            )
            return MultiSignalVerdict(
                classification="UNCERTAIN",
                ai_probability=0.50,
                human_probability=0.50,
                confidence=0.35,
                voice_trust_score=50,
                audio_quality=quality_dict,
                signals={
                    "spectral": "UNCERTAIN",
                    "prosody": "UNCERTAIN",
                    "synthetic_artifacts": "UNCERTAIN",
                    "temporal_consistency": "UNCERTAIN",
                    "voice_consistency": "UNCERTAIN",
                },
                signal_scores={
                    "model_score": model_ai_prob,
                    "spectral_score": 0.50,
                    "prosody_score": 0.50,
                    "artifact_score": 0.50,
                    "replay_score": 0.0,
                },
                replay_suspicion=0.0,
                detected_artifacts=[],
                evidence_summary=f"⚠️ UNCERTAIN: {reason}. Continue speaking to improve analysis.",
                diagnostics={
                    "reason": reason,
                    "quality_status": quality.status,
                    "snr_db": round(quality.snr_db, 2),
                    "duration_sec": round(quality.duration_sec, 2),
                    "bounded_range": [0.015, 0.985],
                },
            )

        # 2. Signal 1: Spectral Analysis
        spec_feats = audio_feature_extractor.extract_spectral_features(waveform, sr=sr)
        flatness = spec_feats.get("spectral_flatness", 0.0)
        zcr = spec_feats.get("zero_crossing_rate", 0.0)
        flux = spec_feats.get("spectral_flux", 0.0)
        rolloff_95 = spec_feats.get("spectral_rolloff_95", 0.0)
        bandwidth = spec_feats.get("spectral_bandwidth", 0.0)

        # Multi-metric spectral anomaly score calibrated for natural speech
        spec_acc = 0.0
        if flatness > 0.35:
            spec_acc += 0.35
        elif flatness > 0.25:
            spec_acc += 0.18

        if zcr > 0.32:
            spec_acc += 0.25

        # Neural diffusion oversmoothing (unnaturally static frames across phonemes)
        if flux > 0.0 and flux < 0.05:
            spec_acc += 0.25
        elif flux > 0.0 and flux < 0.08:
            spec_acc += 0.12

        # Unnatural high-frequency energy beyond normal vocal tract acoustics
        if rolloff_95 > 7800.0:
            spec_acc += 0.20

        spectral_score = float(min(0.98, max(0.02, spec_acc)))

        # 3. Signal 2: Prosody & Speech Cadence
        prosody_res = prosody_analyzer.analyze(waveform, sr=sr)
        prosody_score = prosody_res.prosody_anomaly_score

        # 4. Signal 3: Synthetic Vocoder / Diffusion Artifacts
        artifact_res = synthetic_artifact_detector.analyze(waveform, sr=sr)
        artifact_score = artifact_res.artifact_score

        # 5. Signal 4: Anti-Replay Suspicion
        replay_res = replay_suspicion_detector.analyze(waveform, sr=sr)
        replay_score = replay_res.replay_score

        # All Detected Artifacts Collection
        detected_synthetic_artifacts = list(set(artifact_res.detected_artifacts + prosody_res.indicators))
        all_artifacts = list(set(detected_synthetic_artifacts + replay_res.indicators))

        # Physical acoustic synthetic evidence check
        has_physical_synthetic_evidence = (
            artifact_score >= 0.28
            or spectral_score >= 0.28
            or len(artifact_res.detected_artifacts) > 0
            or prosody_score >= 0.35
        )

        # 6. Consensus & False Positive Contributor Analysis (Parts 5 & 6)
        primary_contributor = None
        consensus = "STRONG_CONSENSUS"

        if model_ai_prob >= 0.70 and has_physical_synthetic_evidence:
            consensus = "STRONG_CONSENSUS_SYNTHETIC"
        elif model_ai_prob >= 0.50 and (artifact_score >= 0.30 or spectral_score >= 0.30 or len(artifact_res.detected_artifacts) > 0):
            consensus = "STRONG_CONSENSUS_SYNTHETIC"
        elif artifact_score >= 0.40 and (model_ai_prob >= 0.35 or prosody_score >= 0.30 or spectral_score >= 0.25):
            consensus = "STRONG_CONSENSUS_SYNTHETIC"
        elif model_ai_prob <= 0.28 and artifact_score <= 0.25 and spectral_score <= 0.25 and prosody_score <= 0.25:
            consensus = "STRONG_CONSENSUS_HUMAN"
        elif model_ai_prob >= 0.60 and not has_physical_synthetic_evidence:
            # AASIST neural model reports high score on human voice (pitch swing / vocal timbre), but acoustics show NO synthesis
            primary_contributor = "Primary false-positive contributor: AASIST model"
            consensus = "DISAGREEMENT"
        elif artifact_score >= 0.40 and model_ai_prob < 0.28:
            primary_contributor = "Primary false-positive contributor: acoustic artifact detector"
            consensus = "DISAGREEMENT"
        elif spectral_score >= 0.40 and model_ai_prob < 0.28:
            primary_contributor = "Primary false-positive contributor: spectral anomaly detector"
            consensus = "DISAGREEMENT"
        elif abs(model_ai_prob - max(artifact_score, spectral_score)) > 0.35:
            consensus = "DISAGREEMENT"
            primary_contributor = (
                "Primary false-positive contributor: acoustic artifact detector"
                if artifact_score > model_ai_prob
                else "Primary false-positive contributor: AASIST model"
            )

        # Balanced Ensemble Weights — never let one uncorroborated weak signal dominate
        if consensus == "STRONG_CONSENSUS_SYNTHETIC":
            if artifact_score >= 0.40 and model_ai_prob < 0.55:
                w_m, w_a, w_s, w_p = 0.35, 0.45, 0.10, 0.10
            else:
                w_m, w_a, w_s, w_p = 0.60, 0.28, 0.07, 0.05
        elif consensus == "STRONG_CONSENSUS_HUMAN":
            w_m, w_a, w_s, w_p = 0.45, 0.25, 0.15, 0.15
        elif consensus == "DISAGREEMENT":
            # In disagreement, downweight the single outlier detector to prevent false positives
            if primary_contributor == "Primary false-positive contributor: AASIST model":
                w_m, w_a, w_s, w_p = 0.20, 0.35, 0.25, 0.20
            elif primary_contributor == "Primary false-positive contributor: acoustic artifact detector":
                w_m, w_a, w_s, w_p = 0.35, 0.15, 0.25, 0.25
            else:
                w_m, w_a, w_s, w_p = 0.25, 0.30, 0.25, 0.20
        elif model_ai_prob >= 0.40 and (artifact_score >= 0.30 or prosody_score >= 0.30 or len(artifact_res.detected_artifacts) > 0):
            # Corroborated synthetic indicators under codec / transmission loss
            w_m, w_a, w_s, w_p = 0.50, 0.35, 0.05, 0.10
        elif quality.snr_db >= 22.0:
            w_m, w_a, w_s, w_p = 0.40, 0.30, 0.15, 0.15
        else:
            w_m, w_a, w_s, w_p = self.w_model, self.w_artifact, self.w_spectral, self.w_prosody

        # Normalize weights
        total_w = w_m + w_a + w_s + w_p
        w_m, w_a, w_s, w_p = w_m / total_w, w_a / total_w, w_s / total_w, w_p / total_w

        fused_ai_prob = (
            w_m * model_ai_prob
            + w_a * artifact_score
            + w_s * spectral_score
            + w_p * prosody_score
        )

        # Ensure confirmed physical vocoder artifacts are not diluted below 0.42 by noise or bandpass
        if len(artifact_res.detected_artifacts) > 0:
            fused_ai_prob = max(fused_ai_prob, 0.42)
        elif model_ai_prob >= 0.48 and (artifact_score >= 0.30 or spectral_score >= 0.30):
            fused_ai_prob = max(fused_ai_prob, 0.41)

        # Incorporate temporal prior if available (e.g. rolling EMA window from call stream)
        if temporal_prior is not None:
            fused_ai_prob = 0.70 * fused_ai_prob + 0.30 * temporal_prior

        # Mathematical Bounding: strictly within [0.015, 0.985] - NO 100% or 0% certainty
        fused_ai_prob = float(round(min(0.985, max(0.015, fused_ai_prob)), 4))
        fused_human_prob = float(round(1.0 - fused_ai_prob, 4))

        # 7. Disagreement & Dynamic Confidence Computation
        acoustic_peak = max(artifact_score, spectral_score)
        disagreement = abs(model_ai_prob - acoustic_peak)

        base_conf = 0.70 + abs(fused_ai_prob - 0.50) * 0.55
        conf_penalty = disagreement * 0.25
        if quality.status == "ACCEPTABLE":
            conf_penalty += 0.05
        elif quality.status == "POOR":
            conf_penalty += 0.25

        confidence = float(round(min(0.985, max(0.35, base_conf - conf_penalty)), 4))

        # 8. Categorize Signals into Human-Readable Ratings (HIGH / MEDIUM / LOW)
        def rate_signal(score: float) -> str:
            if score >= 0.65:
                return "HIGH"
            elif score >= 0.30:
                return "MEDIUM"
            return "LOW"

        signals = {
            "spectral": rate_signal(spectral_score),
            "prosody": rate_signal(prosody_score),
            "synthetic_artifacts": rate_signal(artifact_score),
            "temporal_consistency": rate_signal(temporal_prior if temporal_prior is not None else 0.20),
            "voice_consistency": rate_signal(1.0 - fused_ai_prob),
        }

        # 10. Security-First Decision Logic (Part 6)
        # PRINCIPLE 1: Degraded quality / poor SNR / short audio -> UNCERTAIN
        if quality.status in ("POOR", "INSUFFICIENT") or quality.snr_db < 8.0 or quality.duration_sec < 0.8:
            classification = "UNCERTAIN"
            reason = f"Poor SNR ({quality.snr_db:.1f} dB) or short duration ({quality.duration_sec:.2f}s) — classify as UNCERTAIN"
            evidence_summary = f"⚠️ UNCERTAIN: {reason}. Continue speaking to establish certainty."

        # PRINCIPLE 2: Conflicting detector evidence / disagreement -> UNCERTAIN
        # Do not classify uncertain human speech as AI simply because one weak signal is high!
        elif consensus == "DISAGREEMENT":
            classification = "UNCERTAIN"
            reason = "Detector disagreement — classify as UNCERTAIN"
            evidence_summary = (
                f"⚠️ UNCERTAIN: Conflicting detector evidence ({primary_contributor or 'disagreement'}). "
                "Confidence is below definitive threshold. Awaiting further acoustic confirmation."
            )

        # PRINCIPLE 3: Strong independent evidence from multiple detectors -> AI_GENERATED
        elif (
            (model_ai_prob >= 0.55 and (artifact_score >= 0.30 or spectral_score >= 0.30 or len(artifact_res.detected_artifacts) > 0))
            or (artifact_score >= 0.40 and (model_ai_prob >= 0.35 or prosody_score >= 0.30))
            or (fused_ai_prob >= 0.48 and sum(1 for s in (model_ai_prob, artifact_score, spectral_score, prosody_score) if s >= 0.30) >= 2)
        ):
            classification = "AI_GENERATED"
            artifact_list_str = ", ".join(all_artifacts[:3]) if all_artifacts else "neural vocoder anomalies"
            reason = f"Strong independent evidence from multiple detectors ({fused_ai_prob * 100:.0f}% synthetic probability)"
            evidence_summary = (
                f"🚨 POSSIBLE AI VOICE DETECTED ({fused_ai_prob * 100:.0f}% Synthetic Probability). "
                f"Key acoustic indicators: {artifact_list_str}."
            )

        # PRINCIPLE 4: Strong human evidence with low synthetic evidence -> HUMAN
        elif model_ai_prob <= 0.28 and artifact_score <= 0.25 and spectral_score <= 0.25 and prosody_score <= 0.25:
            classification = "HUMAN"
            reason = f"Strong human evidence with low synthetic evidence across detectors ({fused_human_prob * 100:.0f}% natural authenticity)"
            evidence_summary = (
                f"🟢 HUMAN VOICE CONFIRMED ({fused_human_prob * 100:.0f}% Natural Authenticity). "
                "Organic pitch modulation, natural vocal tract formants, and physical harmonic resonance."
            )

        # PRINCIPLE 5: Borderline / ambiguous signals -> UNCERTAIN
        else:
            classification = "UNCERTAIN"
            reason = "Acoustic signals in borderline range — continue speaking to improve analysis"
            evidence_summary = (
                "⚠️ UNCERTAIN: Available acoustic signals show borderline characteristics. "
                "Confidence is below definitive threshold. Continue speaking to improve analysis."
            )

        # 11. Voice Trust Score (0–100)
        raw_trust = fused_human_prob * 100.0 * (0.6 + 0.4 * quality.quality_score)
        if classification == "HUMAN":
            voice_trust_score = int(min(98, max(65, raw_trust)))
        elif classification == "AI_GENERATED":
            voice_trust_score = int(min(35, max(2, raw_trust * 0.35)))
        else:
            voice_trust_score = int(min(64, max(36, raw_trust * 0.7)))

        # 12. Full Developer Diagnostics (Part 2)
        diagnostics = {
            "model_probability": round(model_ai_prob, 4),
            "calibrated_model_probability": round(min(0.985, max(0.015, model_ai_prob)), 4),
            "artifact_score": round(artifact_score, 4),
            "spectral_score": round(spectral_score, 4),
            "prosody_score": round(prosody_score, 4),
            "replay_score": round(replay_score, 4),
            "snr_db": round(quality.snr_db, 2),
            "duration_seconds": round(quality.duration_sec, 2),
            "sample_rate": sr,
            "channel_count": 1,
            "codec": "PCM_16K",
            "fusion_weights": {
                "model": round(w_m, 3),
                "artifact": round(w_a, 3),
                "spectral": round(w_s, 3),
                "prosody": round(w_p, 3),
            },
            "fused_probability": round(fused_ai_prob, 4),
            "confidence": round(confidence, 4),
            "consensus": consensus,
            "classification": classification,
            "reason": reason,
            "primary_contributor": primary_contributor,
            "weights_applied": {
                "model": round(w_m, 3),
                "artifact": round(w_a, 3),
                "spectral": round(w_s, 3),
                "prosody": round(w_p, 3),
            },
            "raw_scores": {
                "model_score": round(model_ai_prob, 4),
                "spectral_score": round(spectral_score, 4),
                "prosody_score": round(prosody_score, 4),
                "artifact_score": round(artifact_score, 4),
                "replay_score": round(replay_score, 4),
            },
            "clipping_ratio": round(quality.clipping_ratio, 4),
            "disagreement": round(disagreement, 4),
            "model_consensus": consensus,
            "bounded_range": [0.015, 0.985],
        }


        return MultiSignalVerdict(
            classification=classification,
            ai_probability=fused_ai_prob,
            human_probability=fused_human_prob,
            confidence=confidence,
            voice_trust_score=voice_trust_score,
            audio_quality=quality_dict,
            signals=signals,
            signal_scores={
                "model_score": model_ai_prob,
                "spectral_score": spectral_score,
                "prosody_score": prosody_score,
                "artifact_score": artifact_score,
                "replay_score": replay_score,
            },
            replay_suspicion=replay_score,
            detected_artifacts=all_artifacts,
            evidence_summary=evidence_summary,
            diagnostics=diagnostics,
        )


# Global singleton instance
multi_signal_engine = MultiSignalAuthenticityEngine()
