"""VoxShield AI — Threat Event Database Model."""

from datetime import datetime
from typing import TYPE_CHECKING, Optional
from sqlalchemy import DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, generate_uuid_str, utc_now

if TYPE_CHECKING:
    from app.db.models.user import User
    from app.db.models.call import Call


class ThreatEvent(Base):
    """Historical threat detection telemetry record."""

    __tablename__ = "threat_events"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=generate_uuid_str,
        index=True,
    )
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    call_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("calls.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
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
        index=True,
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
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        index=True,
        nullable=False,
    )
    metadata_json: Mapped[str] = mapped_column(
        Text,
        default="{}",
        nullable=False,
    )

    user: Mapped["User"] = relationship("User", back_populates="threat_events")
    call: Mapped[Optional["Call"]] = relationship("Call")
