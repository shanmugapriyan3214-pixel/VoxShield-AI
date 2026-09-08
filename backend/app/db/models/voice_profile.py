"""VoxShield AI — Voice Profile Database Model."""

from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, generate_uuid_str

if TYPE_CHECKING:
    from app.db.models.user import User
    from app.db.models.trusted_voice import TrustedVoice


class VoiceProfile(Base, TimestampMixin):
    """Voice profile (speaker representation metadata). Does not expose raw biometrics."""

    __tablename__ = "voice_profiles"

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
    label: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(30),
        default="ACTIVE",
        nullable=False,
    )
    model_version: Mapped[str] = mapped_column(
        String(50),
        default="ecapa-tdnn-v2",
        nullable=False,
    )
    embedding_hash: Mapped[Optional[str]] = mapped_column(
        String(64),
        nullable=True,
    )
    encrypted_embedding: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    user: Mapped["User"] = relationship("User", back_populates="voice_profiles")
    trusted_voices: Mapped[List["TrustedVoice"]] = relationship(
        "TrustedVoice",
        back_populates="voice_profile",
    )
