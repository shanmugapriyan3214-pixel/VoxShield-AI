"""VoxShield AI — Blockchain Evidence Database Model."""

from datetime import datetime
from typing import TYPE_CHECKING, Optional
from sqlalchemy import BigInteger, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, generate_uuid_str, utc_now

if TYPE_CHECKING:
    from app.db.models.incident import Incident


class BlockchainRecord(Base):
    """Immutable ledger anchor record for incident evidence."""

    __tablename__ = "blockchain_records"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=generate_uuid_str,
        index=True,
    )
    incident_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("incidents.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    canonical_hash: Mapped[str] = mapped_column(
        String(66),
        nullable=False,
    )
    network: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    contract_address: Mapped[Optional[str]] = mapped_column(
        String(42),
        nullable=True,
    )
    transaction_hash: Mapped[str] = mapped_column(
        String(66),
        index=True,
        nullable=False,
    )
    block_number: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(30),
        default="CONFIRMED",
        nullable=False,
    )
    anchored_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )

    incident: Mapped["Incident"] = relationship("Incident", back_populates="blockchain_record")
