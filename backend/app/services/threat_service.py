"""VoxShield AI — Threat Analytics & History Service."""

import json
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import PermissionDeniedException, ResourceNotFoundException
from app.db.models.threat import ThreatEvent
from app.schemas.threat import (
    ThreatSummaryResponse,
    ThreatTimelineItem,
    ThreatTimelineResponse,
)


class ThreatService:
    """Manages threat event ingestion and historical intelligence aggregations."""

    @staticmethod
    async def record_event(
        db: AsyncSession,
        user_id: str,
        event_type: str,
        severity: str,
        threat_score: float,
        ai_probability: float,
        speaker_match_score: Optional[float] = None,
        liveness_score: Optional[float] = None,
        call_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> ThreatEvent:
        event = ThreatEvent(
            user_id=user_id,
            call_id=call_id,
            event_type=event_type,
            severity=severity,
            threat_score=threat_score,
            ai_probability=ai_probability,
            speaker_match_score=speaker_match_score,
            liveness_score=liveness_score,
            metadata_json=json.dumps(metadata or {}),
        )
        db.add(event)
        await db.commit()
        await db.refresh(event)
        return event

    @staticmethod
    async def list_events(
        db: AsyncSession,
        user_id: str,
        severity: Optional[str] = None,
        event_type: Optional[str] = None,
        call_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[ThreatEvent]:
        stmt = select(ThreatEvent).where(ThreatEvent.user_id == user_id)
        if severity:
            stmt = stmt.where(ThreatEvent.severity == severity.upper().strip())
        if event_type:
            stmt = stmt.where(ThreatEvent.event_type == event_type.strip())
        if call_id:
            stmt = stmt.where(ThreatEvent.call_id == call_id)

        stmt = stmt.order_by(ThreatEvent.timestamp.desc()).limit(limit).offset(offset)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def get_by_id(
        db: AsyncSession,
        threat_id: str,
        user_id: str,
    ) -> ThreatEvent:
        stmt = select(ThreatEvent).where(ThreatEvent.id == threat_id)
        event = (await db.execute(stmt)).scalars().first()
        if not event:
            raise ResourceNotFoundException(f"Threat event '{threat_id}' not found.")

        if event.user_id != user_id:
            raise PermissionDeniedException("You do not have permission to view this threat event.")

        return event

    @staticmethod
    async def get_summary(db: AsyncSession, user_id: str) -> ThreatSummaryResponse:
        stmt = select(ThreatEvent).where(ThreatEvent.user_id == user_id)
        events = list((await db.execute(stmt)).scalars().all())

        total = len(events)
        critical = sum(1 for e in events if e.severity == "CRITICAL")
        high = sum(1 for e in events if e.severity == "HIGH")
        medium = sum(1 for e in events if e.severity == "MEDIUM")
        low = sum(1 for e in events if e.severity == "LOW")
        avg_score = round(sum(e.threat_score for e in events) / total, 1) if total > 0 else 0.0

        return ThreatSummaryResponse(
            total_events=total,
            critical_count=critical,
            high_count=high,
            medium_count=medium,
            low_count=low,
            average_threat_score=avg_score,
        )

    @staticmethod
    async def get_timeline(db: AsyncSession, user_id: str, days: int = 7) -> ThreatTimelineResponse:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        stmt = (
            select(ThreatEvent)
            .where(ThreatEvent.user_id == user_id, ThreatEvent.timestamp >= cutoff)
            .order_by(ThreatEvent.timestamp.asc())
        )
        events = list((await db.execute(stmt)).scalars().all())

        # Group by day bucket
        buckets: Dict[str, List[float]] = {}
        for i in range(days):
            day_str = (datetime.now(timezone.utc) - timedelta(days=days - 1 - i)).strftime("%Y-%m-%d")
            buckets[day_str] = []

        for e in events:
            day_key = e.timestamp.strftime("%Y-%m-%d")
            if day_key in buckets:
                buckets[day_key].append(e.threat_score)

        timeline_items = [
            ThreatTimelineItem(
                period=day_str,
                count=len(scores),
                average_score=round(sum(scores) / len(scores), 1) if scores else 0.0,
            )
            for day_str, scores in buckets.items()
        ]

        return ThreatTimelineResponse(timeline=timeline_items)
