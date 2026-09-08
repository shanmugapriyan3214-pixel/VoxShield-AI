"""VoxShield AI — Call Session & Security Event Service."""

import json
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    ConflictException,
    PermissionDeniedException,
    ResourceNotFoundException,
    ValidationException,
)
from app.core.security import utc_now
from app.db.models.call import Call, CallParticipant, CallSecurityEvent
from app.db.models.threat import ThreatEvent
from app.db.models.user import User
from app.schemas.call import CallInitiateRequest, CallSecurityEventCreate


class CallService:
    """Manages voice call lifecycle, participants, and in-call security telemetry."""

    @staticmethod
    async def initiate_call(
        db: AsyncSession,
        caller_id: str,
        data: CallInitiateRequest,
    ) -> Call:
        if caller_id == data.receiver_id:
            raise ValidationException("Cannot initiate a voice call to oneself.")

        # Ensure receiver exists and is active
        stmt_rec = select(User).where(User.id == data.receiver_id)
        receiver = (await db.execute(stmt_rec)).scalars().first()
        if not receiver or not receiver.is_active:
            raise ResourceNotFoundException("Target recipient user not found or inactive.")

        call = Call(
            caller_id=caller_id,
            receiver_id=data.receiver_id,
            status="RINGING",
            encryption_algorithm="DTLS-SRTP-AES-GCM-128",
        )
        db.add(call)
        await db.flush()

        # Add participant records
        db.add(CallParticipant(call_id=call.id, user_id=caller_id, role="CALLER"))
        db.add(CallParticipant(call_id=call.id, user_id=data.receiver_id, role="RECEIVER"))

        await db.commit()
        await db.refresh(call)
        return call

    @staticmethod
    async def list_calls(
        db: AsyncSession,
        user_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Call]:
        stmt = (
            select(Call)
            .where(or_(Call.caller_id == user_id, Call.receiver_id == user_id))
            .order_by(Call.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def get_call(
        db: AsyncSession,
        call_id: str,
        user_id: Optional[str] = None,
    ) -> Call:
        stmt = select(Call).where(Call.id == call_id)
        call = (await db.execute(stmt)).scalars().first()
        if not call:
            raise ResourceNotFoundException(f"Call '{call_id}' not found.")

        if user_id and user_id not in (call.caller_id, call.receiver_id):
            raise PermissionDeniedException("You are not an authorized participant in this call.")

        return call

    @staticmethod
    async def accept_call(
        db: AsyncSession,
        call_id: str,
        user_id: str,
    ) -> Call:
        call = await CallService.get_call(db, call_id, user_id)
        if call.receiver_id != user_id:
            raise PermissionDeniedException("Only the designated call receiver can accept this call.")

        if call.status != "RINGING":
            raise ConflictException(f"Cannot accept call currently in '{call.status}' state.")

        call.status = "ACCEPTED"
        call.started_at = utc_now()
        await db.commit()
        await db.refresh(call)
        return call

    @staticmethod
    async def reject_call(
        db: AsyncSession,
        call_id: str,
        user_id: str,
    ) -> Call:
        call = await CallService.get_call(db, call_id, user_id)
        if call.receiver_id != user_id:
            raise PermissionDeniedException("Only the designated call receiver can reject this call.")

        call.status = "REJECTED"
        call.ended_at = utc_now()
        call.termination_reason = "REJECTED_BY_RECEIVER"
        await db.commit()
        await db.refresh(call)
        return call

    @staticmethod
    async def end_call(
        db: AsyncSession,
        call_id: str,
        user_id: str,
        reason: str = "USER_HUNG_UP",
    ) -> Call:
        call = await CallService.get_call(db, call_id, user_id)
        if call.status in ("ENDED", "REJECTED", "MISSED"):
            return call

        call.status = "ENDED"
        call.ended_at = utc_now()
        call.termination_reason = reason
        await db.commit()
        await db.refresh(call)
        return call

    @staticmethod
    async def record_security_event(
        db: AsyncSession,
        call_id: str,
        user_id: str,
        data: CallSecurityEventCreate,
    ) -> CallSecurityEvent:
        call = await CallService.get_call(db, call_id, user_id)

        meta_json = json.dumps(data.metadata or {})
        sec_event = CallSecurityEvent(
            call_id=call.id,
            reported_by_user_id=user_id,
            event_type=data.event_type,
            severity=data.severity,
            threat_score=data.threat_score,
            ai_probability=data.ai_probability,
            speaker_match_score=data.speaker_match_score,
            liveness_score=data.liveness_score,
            metadata_json=meta_json,
        )
        db.add(sec_event)

        # Also mirror into historical threat_events table for timeline & aggregate analytics
        threat_ev = ThreatEvent(
            user_id=user_id,
            call_id=call.id,
            event_type=data.event_type,
            severity=data.severity,
            threat_score=data.threat_score,
            ai_probability=data.ai_probability,
            speaker_match_score=data.speaker_match_score,
            liveness_score=data.liveness_score,
            metadata_json=meta_json,
        )
        db.add(threat_ev)

        await db.commit()
        await db.refresh(sec_event)
        return sec_event

    @staticmethod
    async def list_security_events(
        db: AsyncSession,
        call_id: str,
        user_id: str,
    ) -> List[CallSecurityEvent]:
        # Validate caller/receiver access
        await CallService.get_call(db, call_id, user_id)

        stmt = (
            select(CallSecurityEvent)
            .where(CallSecurityEvent.call_id == call_id)
            .order_by(CallSecurityEvent.timestamp.asc())
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())
