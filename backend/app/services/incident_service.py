"""VoxShield AI — Incident Report & Canonical Serialization Service."""

import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import PermissionDeniedException, ResourceNotFoundException
from app.db.models.incident import Incident
from app.schemas.incident import IncidentCreate, IncidentUpdate


class IncidentService:
    """Manages security incident creation, canonical evidence hashing, and lifecycle."""

    @staticmethod
    def serialize_canonical_representation(incident_data: Dict[str, Any]) -> str:
        """Deterministically serialize incident data according to RFC 8785 (JCS)."""
        # Sort keys lexicographically and strip whitespace
        return json.dumps(incident_data, sort_keys=True, separators=(",", ":"), ensure_ascii=False)

    @staticmethod
    def generate_canonical_hash(incident_data: Dict[str, Any]) -> str:
        """Compute SHA-256 digest of canonical JSON bytes with 0x prefix."""
        canonical_str = IncidentService.serialize_canonical_representation(incident_data)
        digest = hashlib.sha256(canonical_str.encode("utf-8")).hexdigest()
        return "0x" + digest

    @staticmethod
    async def create_incident(
        db: AsyncSession,
        user_id: str,
        data: IncidentCreate,
    ) -> Incident:
        # Generate human-friendly sequential incident number e.g. VOX-2026-0042
        year = datetime.now(timezone.utc).year
        stmt_count = select(func.count(Incident.id))
        count = (await db.execute(stmt_count)).scalar() or 0
        incident_number = f"VOX-{year}-{(count + 1):04d}"
        stmt_check = select(Incident.id).where(Incident.incident_number == incident_number)
        while (await db.execute(stmt_check)).scalars().first():
            count += 1
            incident_number = f"VOX-{year}-{(count + 1):04d}"
            stmt_check = select(Incident.id).where(Incident.incident_number == incident_number)

        # Build canonical payload for cryptographic hashing
        canonical_payload = {
            "incident_number": incident_number,
            "user_id": user_id,
            "call_id": data.call_id or "",
            "incident_type": data.incident_type,
            "severity": data.severity,
            "threat_score": float(data.threat_score),
            "ai_probability": float(data.ai_probability),
            "speaker_match_score": float(data.speaker_match_score) if data.speaker_match_score is not None else -1.0,
            "liveness_score": float(data.liveness_score) if data.liveness_score is not None else -1.0,
            "summary": data.summary.strip(),
            "indicators": sorted(data.indicators),
            "recommendations": sorted(data.recommendations),
        }
        canonical_hash = IncidentService.generate_canonical_hash(canonical_payload)

        incident = Incident(
            incident_number=incident_number,
            user_id=user_id,
            call_id=data.call_id,
            incident_type=data.incident_type,
            severity=data.severity,
            threat_score=data.threat_score,
            ai_probability=data.ai_probability,
            speaker_match_score=data.speaker_match_score,
            liveness_score=data.liveness_score,
            summary=data.summary.strip(),
            indicators_json=json.dumps(data.indicators),
            recommendations_json=json.dumps(data.recommendations),
            canonical_hash=canonical_hash,
            status="OPEN",
        )
        db.add(incident)
        await db.commit()
        await db.refresh(incident)
        return incident

    @staticmethod
    async def list_incidents(
        db: AsyncSession,
        user_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Incident]:
        stmt = (
            select(Incident)
            .where(Incident.user_id == user_id)
            .order_by(Incident.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def get_incident(
        db: AsyncSession,
        incident_id: str,
        user_id: Optional[str] = None,
    ) -> Incident:
        stmt = select(Incident).where(Incident.id == incident_id)
        incident = (await db.execute(stmt)).scalars().first()
        if not incident:
            raise ResourceNotFoundException(f"Incident '{incident_id}' not found.")

        if user_id and incident.user_id != user_id:
            raise PermissionDeniedException("You do not have permission to access this incident.")

        return incident

    @staticmethod
    async def update_incident(
        db: AsyncSession,
        incident_id: str,
        user_id: str,
        data: IncidentUpdate,
    ) -> Incident:
        incident = await IncidentService.get_incident(db, incident_id, user_id)

        if data.summary is not None:
            incident.summary = data.summary.strip()
        if data.status is not None:
            incident.status = data.status.strip()

        await db.commit()
        await db.refresh(incident)
        return incident

    @staticmethod
    async def delete_incident(
        db: AsyncSession,
        incident_id: str,
        user_id: str,
    ) -> None:
        incident = await IncidentService.get_incident(db, incident_id, user_id)
        await db.delete(incident)
        await db.commit()
