"""VoxShield AI — Call and Security Event Database Models."""

from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, generate_uuid_str, utc_now

if TYPE_CHECKING:
    from app.db.models.user import User


class Call(Base, TimestampMixin):
    """Call session metadata model. Raw audio is never ingested or stored."""

    __tablename__ = "calls"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=generate_uuid_str,
        index=True,
    )
    caller_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    receiver_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(30),
        default="RINGING",
        index=True,
        nullable=False,
    )
    encryption_algorithm: Mapped[str] = mapped_column(
        String(50),
        default="DTLS-SRTP-AES-GCM-128",
        nullable=False,
    )
    termination_reason: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    ended_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    caller: Mapped["User"] = relationship("User", foreign_keys=[caller_id])
    receiver: Mapped["User"] = relationship("User", foreign_keys=[receiver_id])
    participants: Mapped[List["CallParticipant"]] = relationship(
        "CallParticipant",
        back_populates="call",
        cascade="all, delete-orphan",
    )
    security_events: Mapped[List["CallSecurityEvent"]] = relationship(
        "CallSecurityEvent",
        back_populates="call",
        cascade="all, delete-orphan",
    )


class CallParticipant(Base):
    """Tracks participants in a call session."""

    __tablename__ = "call_participants"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=generate_uuid_str,
    )
    call_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("calls.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    role: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )
    joined_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
    )
    left_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    call: Mapped["Call"] = relationship("Call", back_populates="participants")
    user: Mapped["User"] = relationship("User")


class CallSecurityEvent(Base):
    """Client-reported deepfake or acoustic security telemetry during calls."""

    __tablename__ = "call_security_events"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=generate_uuid_str,
        index=True,
    )
    call_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("calls.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    reported_by_user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    event_type: Mapped[str] = mapped_column(
        String(50),
        index=True,
        nullable=False,
    )
    severity: Mapped[str] = mapped_column(
        String(20),
        index=True,
        nullable=False,
    )
    threat_score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )
    ai_probability: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )
    speaker_match_score: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
    )
    liveness_score: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
    )
    metadata_json: Mapped[str] = mapped_column(
        Text,
        default="{}",
        nullable=False,
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        index=True,
        nullable=False,
    )

    call: Mapped["Call"] = relationship("Call", back_populates="security_events")
    reporter: Mapped["User"] = relationship("User", foreign_keys=[reported_by_user_id])
