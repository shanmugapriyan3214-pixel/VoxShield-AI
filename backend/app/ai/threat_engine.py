"""VoxShield AI — Multi-Signal Threat Scoring Engine."""

from typing import List, Optional, Tuple
from pydantic import BaseModel, Field


class ThreatAssessment(BaseModel):
    """Calculated threat assessment result."""
    threat_score: float = Field(..., ge=0.0, le=100.0)
    severity: str = Field(..., description="LOW | MEDIUM | HIGH | CRITICAL")
    indicators: List[str] = Field(default_factory=list)
    recommendation: str


class ThreatEngine:
    """Combines heterogeneous acoustic and behavioral signals into an actionable threat score."""

    def __init__(
        self,
        weight_ai: float = 0.50,
        weight_speaker_mismatch: float = 0.30,
        weight_liveness_failure: float = 0.20,
    ):
        self.weight_ai = weight_ai
        self.weight_speaker_mismatch = weight_speaker_mismatch
        self.weight_liveness_failure = weight_liveness_failure

    def evaluate(
        self,
        ai_probability: float,
        speaker_match_score: Optional[float] = None,
        liveness_score: Optional[float] = None,
        is_claimed_trusted_contact: bool = False,
        anomaly_flags: Optional[List[str]] = None,
    ) -> ThreatAssessment:
        indicators: List[str] = []
        flags = anomaly_flags or []

        # 1. Base AI Deepfake Component
        p_ai = min(1.0, max(0.0, ai_probability))
        score_ai = p_ai * 100.0
        if p_ai >= 0.70:
            indicators.append(f"High synthetic speech probability ({p_ai * 100:.1f}%)")
        elif p_ai >= 0.40:
            indicators.append(f"Ambiguous vocoder acoustic characteristics ({p_ai * 100:.1f}%)")

        # 2. Speaker Verification Component
        if speaker_match_score is not None:
            s_match = min(1.0, max(0.0, speaker_match_score))
            score_speaker = (1.0 - s_match) * 100.0
            if s_match < 0.60:
                indicators.append(f"Voice embedding mismatch ({s_match * 100:.1f}% similarity)")
        else:
            score_speaker = 30.0  # Neutral baseline if no voice profile exists

        # 3. Liveness Component
        if liveness_score is not None:
            s_live = min(1.0, max(0.0, liveness_score))
            score_liveness = (1.0 - s_live) * 100.0
            if s_live < 0.50:
                indicators.append(f"Liveness failure: Replay or synthetic acoustic traits detected")
        else:
            score_liveness = 20.0

        # Weighted raw score
        raw_score = (
            self.weight_ai * score_ai
            + self.weight_speaker_mismatch * score_speaker
            + self.weight_liveness_failure * score_liveness
        )

        # 4. Contextual Modifiers
        modifier = 0.0

        # Impersonation Penalty: Claiming to be a trusted contact with poor match
        if is_claimed_trusted_contact and speaker_match_score is not None and speaker_match_score < 0.65:
            modifier += 15.0
            indicators.append("URGENT: Caller claims to be a trusted contact but voice embedding does not match")

        # Anomaly flags
        if "vocoder_phase_discontinuity" in flags:
            modifier += 10.0
            indicators.append("Phase discontinuity typical of zero-shot neural vocoders")

        if "replay_detected" in flags:
            modifier += 12.0
            indicators.append("Acoustic impulse response indicates loudspeaker replay")

        # Damping bonus: very high liveness and very low AI probability
        if liveness_score is not None and liveness_score > 0.90 and p_ai < 0.10:
            modifier -= 10.0

        final_score = round(min(100.0, max(0.0, raw_score + modifier)), 1)

        # Severity Classification
        if final_score >= 85.0:
            severity = "CRITICAL"
            rec = "CRITICAL THREAT: High-confidence voice clone impersonation attack. Hang up immediately."
        elif final_score >= 60.0:
            severity = "HIGH"
            rec = "HIGH SUSPICION: Voice characteristics indicate synthetic cloning. Verify via out-of-band channel."
        elif final_score >= 30.0:
            severity = "MEDIUM"
            rec = "ADVISORY: Minor acoustic anomalies detected. Proceed with caution."
        else:
            severity = "LOW"
            rec = "NORMAL: Voice stream appears authentic."

        if not indicators:
            indicators.append("No significant anomalies observed.")

        return ThreatAssessment(
            threat_score=final_score,
            severity=severity,
            indicators=indicators,
            recommendation=rec,
        )


threat_engine = ThreatEngine()
