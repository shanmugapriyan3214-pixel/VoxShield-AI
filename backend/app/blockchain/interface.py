"""VoxShield AI — Abstract Blockchain Adapter Interface."""

from abc import ABC, abstractmethod
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class BlockchainReceipt(BaseModel):
    """Result of anchoring an evidence digest on-chain."""
    incident_id: str
    canonical_hash: str
    network: str
    contract_address: Optional[str] = None
    transaction_hash: str
    block_number: int
    status: str = "CONFIRMED"
    anchored_at: datetime


class BlockchainVerificationResult(BaseModel):
    """Result of validating an incident against stored on-chain proof."""
    incident_id: str
    current_recomputed_hash: str
    stored_canonical_hash: str
    on_chain_hash: Optional[str] = None
    transaction_hash: Optional[str] = None
    block_number: Optional[int] = None
    network: str
    verification_status: str = Field(
        ...,
        description="VERIFIED: Hashes match | TAMPERED: Database was altered | UNANCHORED: Not yet anchored",
    )
    is_valid: bool
    verified_at: datetime


class BlockchainAdapter(ABC):
    """Abstract interface for anchoring incident proofs onto distributed ledgers."""

    @abstractmethod
    async def anchor_hash(
        self,
        incident_id: str,
        canonical_hash: str,
    ) -> BlockchainReceipt:
        """Commit an incident evidence hash onto the ledger."""
        pass

    @abstractmethod
    async def verify_hash(
        self,
        incident_id: str,
        canonical_hash: str,
        transaction_hash: Optional[str] = None,
    ) -> BlockchainVerificationResult:
        """Verify that the given hash matches the on-chain recorded proof."""
        pass
