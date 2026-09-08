"""VoxShield AI — Incident Report Database Model."""

from typing import TYPE_CHECKING, Optional
from sqlalchemy import Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, generate_uuid_str

if TYPE_CHECKING:
    from app.db.models.user import User
    from app.db.models.call import Call
    from app.db.models.blockchain import BlockchainRecord


class Incident(Base, TimestampMixin):
    """Formal security incident entity with canonical hashing support."""

    __tablename__ = "incidents"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=generate_uuid_str,
        index=True,
    )
    incident_number: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        index=True,
        nullable=False,
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
    incident_type: Mapped[str] = mapped_column(
        String(50),
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
    summary: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    indicators_json: Mapped[str] = mapped_column(
        Text,
        default="[]",
        nullable=False,
    )
    recommendations_json: Mapped[str] = mapped_column(
        Text,
        default="[]",
        nullable=False,
    )
    canonical_hash: Mapped[Optional[str]] = mapped_column(
        String(64),
        index=True,
        nullable=True,
    )
    status: Mapped[str] = mapped_column(
        String(30),
        default="OPEN",
        nullable=False,
    )

    user: Mapped["User"] = relationship("User", back_populates="incidents")
    call: Mapped[Optional["Call"]] = relationship("Call")
    blockchain_record: Mapped[Optional["BlockchainRecord"]] = relationship(
        "BlockchainRecord",
        back_populates="incident",
        uselist=False,
        cascade="all, delete-orphan",
    )
