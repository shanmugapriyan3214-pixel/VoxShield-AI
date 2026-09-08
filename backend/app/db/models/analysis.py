"""VoxShield AI — Voice Analysis Database Model."""

from typing import TYPE_CHECKING, Optional
from sqlalchemy import Boolean, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, generate_uuid_str

if TYPE_CHECKING:
    from app.db.models.user import User


class VoiceAnalysis(Base, TimestampMixin):
    """Optional offline audio file analysis record."""

    __tablename__ = "voice_analyses"

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
    audio_file_hash: Mapped[str] = mapped_column(
        String(64),
        index=True,
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(30),
        default="COMPLETED",
        nullable=False,
    )
    classification: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    ai_probability: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )
    human_probability: Mapped[float] = mapped_column(
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
    model_version: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    is_mock: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    user: Mapped["User"] = relationship("User")
