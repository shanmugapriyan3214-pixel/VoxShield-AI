"""VoxShield AI — Call Session & Security Event Service."""

import json
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy.orm import selectinload

from app.ai.config import ai_settings
from app.ai.fusion.threat_fusion import threat_fusion_engine
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
from app.schemas.call import (
    CallInitiateRequest,
    CallResponse,
    CallSecurityEventCreate,
    SecurityTelemetryReportRequest,
    SecurityTelemetryResponse,
)
from app.services.challenge_service import challenge_service


class CallService:
    """Manages voice call lifecycle, participants, and in-call security telemetry."""

    @staticmethod
    def format_call_response(call: Call) -> CallResponse:
        dur = None
        now_dt = utc_now()
        if call.started_at and call.ended_at:
            s_at = call.started_at.replace(tzinfo=None) if call.started_at.tzinfo else call.started_at
            e_at = call.ended_at.replace(tzinfo=None) if call.ended_at.tzinfo else call.ended_at
            dur = max(0, int((e_at - s_at).total_seconds()))
        elif call.started_at and call.status == "ACCEPTED":
            s_at = call.started_at.replace(tzinfo=None) if call.started_at.tzinfo else call.started_at
            n_at = now_dt.replace(tzinfo=None)
            dur = max(0, int((n_at - s_at).total_seconds()))

        latest_evt = None
        if getattr(call, "security_events", None):
            latest_evt = max(call.security_events, key=lambda e: e.timestamp if e.timestamp else utc_now(), default=None)

        resp = CallResponse.model_validate(call)
        if getattr(call, "caller", None):
            resp.caller_name = call.caller.display_name or call.caller.username
            resp.caller_voxshield_id = getattr(call.caller, "safe_voxshield_id", None)
        if getattr(call, "receiver", None):
            resp.receiver_name = call.receiver.display_name or call.receiver.username
            resp.receiver_voxshield_id = getattr(call.receiver, "safe_voxshield_id", None)
        resp.duration_seconds = dur
        if latest_evt:
            resp.latest_threat_score = latest_evt.threat_score
            resp.latest_severity = latest_evt.severity
        return resp

    @staticmethod
    async def initiate_call(
        db: AsyncSession,
        caller_id: str,
        data: CallInitiateRequest,
    ) -> Call:
        recv_val = data.receiver_id.strip()

        # Support resolving receiver by User.id (UUID), VoxShield ID (VS-XXXXXXXX), or username
        conditions = [
            User.id == recv_val,
            User.voxshield_id == recv_val.upper(),
            User.username == recv_val.lower(),
        ]
        if recv_val.upper().startswith("VS-"):
            clean_part = recv_val[3:].replace("-", "").lower()
            conditions.append(User.id.like(f"{clean_part}%"))

        stmt_rec = select(User).where(or_(*conditions))
        receiver = (await db.execute(stmt_rec)).scalars().first()
        if not receiver or not receiver.is_active:
            raise ResourceNotFoundException("Target recipient user not found or inactive.")

        if caller_id == receiver.id:
            raise ValidationException("Cannot initiate a voice call to oneself.")

        resolved_receiver_id = receiver.id

        call = Call(
            caller_id=caller_id,
            receiver_id=resolved_receiver_id,
            status="RINGING",
            encryption_algorithm="DTLS-SRTP-AES-GCM-128",
        )
        db.add(call)
        await db.flush()

        # Add participant records
        db.add(CallParticipant(call_id=call.id, user_id=caller_id, role="CALLER"))
        db.add(CallParticipant(call_id=call.id, user_id=resolved_receiver_id, role="RECEIVER"))

        await db.commit()
        await db.refresh(call)
        # Load relationships for formatting
        return await CallService.get_call(db, call.id, caller_id)

    @staticmethod
    async def list_calls(
        db: AsyncSession,
        user_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Call]:
        stmt = (
            select(Call)
            .options(
                selectinload(Call.caller),
                selectinload(Call.receiver),
                selectinload(Call.security_events),
            )
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
        stmt = (
            select(Call)
            .options(
                selectinload(Call.caller),
                selectinload(Call.receiver),
                selectinload(Call.security_events),
            )
            .where(Call.id == call_id)
        )
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

    @staticmethod
    async def process_security_analysis(
        db: AsyncSession,
        call_id: str,
        user_id: str,
        data: SecurityTelemetryReportRequest,
    ) -> SecurityTelemetryResponse:
        call = await CallService.get_call(db, call_id, user_id)

        # 1. Assemble context flags (transaction, caller trust, urgency)
        anomaly_flags = list(data.detected_artifacts)
        context_risk = 0.0

        if data.transaction_type in ("fund_transfer", "wire_authorization", "password_reset", "banking_credentials"):
            anomaly_flags.append("urgent_money_request")
            context_risk += 35.0
        elif data.transaction_amount and data.transaction_amount >= 50000:
            anomaly_flags.append("urgent_money_request")
            context_risk += 35.0

        if data.urgency_level in ("high", "critical", "urgent"):
            anomaly_flags.append("unusual_speaker_behavior")
            context_risk += 25.0

        if data.caller_known is False:
            anomaly_flags.append("impersonation_context")
            context_risk += 20.0

        # Multi-signal threat fusion
        assessment = threat_fusion_engine.evaluate(
            ai_probability=data.ai_generated_probability,
            speaker_match_score=data.speaker_match_probability,
            liveness_score=data.liveness_probability,
            is_claimed_trusted_contact=(data.speaker_match_probability is not None),
            anomaly_flags=anomaly_flags,
        )

        final_threat_score = assessment.threat_score
        severity = assessment.severity
        recommended_action = assessment.recommended_action
        recommendation = assessment.recommendation
        indicators = list(assessment.indicators)

        # Check if an active challenge modifies threat score
        active_challenge = challenge_service.get_active_challenge(call_id)
        if active_challenge and active_challenge.status == "PASSED":
            final_threat_score = max(0.0, final_threat_score - 30.0)
            if final_threat_score < 25.0:
                severity = "LOW"
                recommended_action = "CONTINUE_NORMAL"
            elif final_threat_score < 50.0:
                severity = "MEDIUM"
                recommended_action = "DISPLAY_ADVISORY"
            indicators.append("Trust challenge passed: Threat score mitigated")

        event_id = None
        call_terminated = False

        # Record security event if elevated threat or artifacts detected
        if final_threat_score >= 50.0 or data.detected_artifacts:
            event_type = "AI_VOICE_DETECTED" if severity == "CRITICAL" else "SUSPICIOUS_VOICE"
            meta = {
                "window_index": data.window_index,
                "window_duration_ms": data.window_duration_ms,
                "client_timestamp_ms": data.client_timestamp_ms,
                "recommended_action": recommended_action,
                "detected_artifacts": data.detected_artifacts,
                "transaction_type": data.transaction_type,
                "transaction_amount": data.transaction_amount,
            }
            meta_json = json.dumps(meta)

            sec_event = CallSecurityEvent(
                call_id=call.id,
                reported_by_user_id=user_id,
                event_type=event_type,
                severity=severity,
                threat_score=final_threat_score,
                ai_probability=data.ai_generated_probability,
                speaker_match_score=data.speaker_match_probability,
                liveness_score=data.liveness_probability,
                metadata_json=meta_json,
            )
            db.add(sec_event)

            threat_ev = ThreatEvent(
                user_id=user_id,
                call_id=call.id,
                event_type=event_type,
                severity=severity,
                threat_score=final_threat_score,
                ai_probability=data.ai_generated_probability,
                speaker_match_score=data.speaker_match_probability,
                liveness_score=data.liveness_probability,
                metadata_json=meta_json,
            )
            db.add(threat_ev)
            await db.flush()
            event_id = sec_event.id

        # Auto-termination if configured and severity is CRITICAL
        if ai_settings.AUTO_TERMINATE_CRITICAL and severity == "CRITICAL" and call.status == "ACCEPTED":
            call.status = "ENDED"
            call.ended_at = utc_now()
            call.termination_reason = "AUTO_TERMINATED_CRITICAL_VOICE_CLONE"
            call_terminated = True

        await db.commit()

        return SecurityTelemetryResponse(
            threat_score=final_threat_score,
            severity=severity,
            recommended_action=recommended_action,
            recommendation=recommendation,
            indicators=indicators,
            call_terminated=call_terminated,
            event_id=event_id,
            context_risk=round(context_risk, 1) if context_risk > 0 else None,
            breakdown=assessment.breakdown,
            social_engineering_risk=assessment.social_engineering_risk,
            timestamp=utc_now(),
        )

