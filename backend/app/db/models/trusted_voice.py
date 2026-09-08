"""VoxShield AI — Trusted Voice Database Model."""

from typing import TYPE_CHECKING, Optional
from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, generate_uuid_str

if TYPE_CHECKING:
    from app.db.models.user import User
    from app.db.models.voice_profile import VoiceProfile


class TrustedVoice(Base, TimestampMixin):
    """Trusted contact registry for impersonation prevention."""

    __tablename__ = "trusted_voices"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=generate_uuid_str,
        index=True,
    )
    owner_user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    trusted_user_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    display_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    relationship_label: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    voice_profile_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("voice_profiles.id", ondelete="SET NULL"),
        nullable=True,
    )
    status: Mapped[str] = mapped_column(
        String(30),
        default="VERIFIED",
        nullable=False,
    )

    owner: Mapped["User"] = relationship(
        "User",
        foreign_keys=[owner_user_id],
        back_populates="trusted_voices",
    )
    trusted_user: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[trusted_user_id],
    )
    voice_profile: Mapped[Optional["VoiceProfile"]] = relationship(
        "VoiceProfile",
        back_populates="trusted_voices",
    )
