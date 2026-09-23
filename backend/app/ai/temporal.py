"""VoxShield AI — Temporal Analysis & Continuous Rolling Window Buffer.

Maintains multi-segment rolling telemetry history for live calls:
- Tracks short audio windows (e.g., 0–2s, 2–4s, 4–6s)
- Applies exponential moving average (EMA) temporal smoothing
- Prevents single-window transient glitches from triggering false alarms
- Enforces multi-segment persistence before sounding CRITICAL security alerts
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, List, Optional
import numpy as np


@dataclass
class SegmentRecord:
    """Telemetry capture for an individual temporal window."""
    segment_index: int
    timestamp: datetime
    raw_ai_prob: float
    smoothed_ai_prob: float
    classification: str
    confidence: float
    artifacts: List[str]


@dataclass
class TemporalAnalysisState:
    """Consolidated state across a call session's timeline."""
    session_id: str
    segments_analyzed: int
    current_smoothed_ai_prob: float
    current_classification: str
    persistence_count: int
    trend: str                   # "STABLE_HUMAN" | "STABLE_AI" | "ESCALATING" | "DE_ESCALATING" | "UNCERTAIN"
    is_persistent_threat: bool   # True when >= 2 consecutive windows exceed threat threshold
    stable_classification: str = "HUMAN"
    stable_risk_level: str = "LOW"
    recent_segments: List[Dict] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "session_id": self.session_id,
            "segments_analyzed": self.segments_analyzed,
            "current_smoothed_ai_prob": round(self.current_smoothed_ai_prob, 4),
            "current_classification": self.current_classification,
            "stable_classification": self.stable_classification,
            "stable_risk_level": self.stable_risk_level,
            "persistence_count": self.persistence_count,
            "trend": self.trend,
            "is_persistent_threat": self.is_persistent_threat,
            "recent_segments": self.recent_segments,
        }


class SessionTemporalBuffer:
    """Maintains sliding window state and temporal smoothing for a specific call."""

    def __init__(self, session_id: str, max_history: int = 10, ema_alpha: float = 0.45):
        self.session_id = session_id
        self.max_history = max_history
        self.ema_alpha = ema_alpha
        self.history: List[SegmentRecord] = []
        self._current_smoothed: Optional[float] = None
        self._consecutive_ai_count: int = 0

    def update(
        self,
        raw_ai_prob: float,
        confidence: float,
        artifacts: Optional[List[str]] = None,
    ) -> TemporalAnalysisState:
        """Ingest a new segment window and compute smoothed temporal assessment."""
        artifacts = artifacts or []
        seg_idx = len(self.history) + 1

        # Exponential Moving Average (EMA)
        if self._current_smoothed is None:
            self._current_smoothed = raw_ai_prob
        else:
            self._current_smoothed = (self.ema_alpha * raw_ai_prob) + ((1.0 - self.ema_alpha) * self._current_smoothed)

        smoothed = float(round(self._current_smoothed, 4))

        # Multi-window persistence (Part 7: Rolling analysis window)
        # Never flip from HUMAN -> AI due to an isolated abnormal window
        is_threat_frame = raw_ai_prob >= 0.60 or smoothed >= 0.60
        if is_threat_frame:
            self._consecutive_ai_count += 1
        else:
            self._consecutive_ai_count = max(0, self._consecutive_ai_count - 1)

        # Require evidence across multiple windows (>=2 consecutive) for AI_GENERATED
        if self._consecutive_ai_count >= 2 and smoothed >= 0.58:
            classification = "AI_GENERATED"
            is_persistent = True
            stable_classification = "AI_GENERATED"
            stable_risk_level = "HIGH"
        elif smoothed <= 0.40 and self._consecutive_ai_count == 0:
            classification = "HUMAN"
            is_persistent = False
            stable_classification = "HUMAN"
            stable_risk_level = "LOW"
        else:
            classification = "UNCERTAIN"
            is_persistent = False
            stable_classification = "UNCERTAIN" if self._consecutive_ai_count > 0 else "HUMAN"
            stable_risk_level = "MEDIUM" if self._consecutive_ai_count > 0 else "LOW"

        # Determine trajectory trend
        if len(self.history) >= 2:
            prev_smoothed = self.history[-1].smoothed_ai_prob
            delta = smoothed - prev_smoothed
            if delta > 0.12:
                trend = "ESCALATING"
            elif delta < -0.12:
                trend = "DE_ESCALATING"
            elif smoothed >= 0.60:
                trend = "STABLE_AI"
            elif smoothed <= 0.40:
                trend = "STABLE_HUMAN"
            else:
                trend = "UNCERTAIN"
        else:
            trend = "STABLE_AI" if smoothed >= 0.60 else "STABLE_HUMAN"

        record = SegmentRecord(
            segment_index=seg_idx,
            timestamp=datetime.now(timezone.utc),
            raw_ai_prob=round(raw_ai_prob, 4),
            smoothed_ai_prob=smoothed,
            classification=classification,
            confidence=round(confidence, 4),
            artifacts=artifacts,
        )

        self.history.append(record)
        if len(self.history) > self.max_history:
            self.history.pop(0)

        recent_dicts = [
            {
                "segment": r.segment_index,
                "ai_prob": r.raw_ai_prob,
                "smoothed": r.smoothed_ai_prob,
                "classification": r.classification,
                "confidence": r.confidence,
            }
            for r in self.history[-5:]
        ]

        return TemporalAnalysisState(
            session_id=self.session_id,
            segments_analyzed=seg_idx,
            current_smoothed_ai_prob=smoothed,
            current_classification=classification,
            stable_classification=stable_classification,
            stable_risk_level=stable_risk_level,
            persistence_count=self._consecutive_ai_count,
            trend=trend,
            is_persistent_threat=is_persistent,
            recent_segments=recent_dicts,
        )


class TemporalManager:
    """Manages multi-call active sessions and their temporal smoothing buffers."""

    def __init__(self):
        self._buffers: Dict[str, SessionTemporalBuffer] = {}

    def get_or_create(self, session_id: str) -> SessionTemporalBuffer:
        if session_id not in self._buffers:
            self._buffers[session_id] = SessionTemporalBuffer(session_id=session_id)
        return self._buffers[session_id]

    def remove(self, session_id: str) -> None:
        if session_id in self._buffers:
            del self._buffers[session_id]


# Global temporal manager
temporal_manager = TemporalManager()
