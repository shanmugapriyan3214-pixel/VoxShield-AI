"""VoxShield AI — Mock Blockchain Adapter."""

import hashlib
import time
from datetime import datetime, timezone
from typing import Dict, Optional
from app.blockchain.interface import (
    BlockchainAdapter,
    BlockchainReceipt,
    BlockchainVerificationResult,
)


class MockBlockchainAdapter(BlockchainAdapter):
    """Zero-dependency local simulation of an EVM tamper-evident incident registry."""

    def __init__(self, network: str = "mock-ledger"):
        self.network = network
        # Simulated ledger state: incident_id -> {canonical_hash, tx_hash, block_number, timestamp}
        self._ledger: Dict[str, Dict] = {}
        self._base_block = 19_482_100

    async def anchor_hash(
        self,
        incident_id: str,
        canonical_hash: str,
    ) -> BlockchainReceipt:
        now = datetime.now(timezone.utc)
        # Deterministic synthetic transaction hash
        raw_tx = f"{incident_id}:{canonical_hash}:{now.isoformat()}"
        tx_hash = "0x" + hashlib.sha256(raw_tx.encode()).hexdigest()
        block_num = self._base_block + len(self._ledger) + 1

        receipt = BlockchainReceipt(
            incident_id=incident_id,
            canonical_hash=canonical_hash,
            network=self.network,
            contract_address="0x0000000000000000000000000000000000000000",
            transaction_hash=tx_hash,
            block_number=block_num,
            status="CONFIRMED",
            anchored_at=now,
        )

        self._ledger[incident_id] = {
            "canonical_hash": canonical_hash,
            "tx_hash": tx_hash,
            "block_number": block_num,
            "anchored_at": now,
        }
        return receipt

    async def verify_hash(
        self,
        incident_id: str,
        canonical_hash: str,
        transaction_hash: Optional[str] = None,
    ) -> BlockchainVerificationResult:
        now = datetime.now(timezone.utc)
        record = self._ledger.get(incident_id)

        if not record:
            return BlockchainVerificationResult(
                incident_id=incident_id,
                current_recomputed_hash=canonical_hash,
                stored_canonical_hash=canonical_hash,
                on_chain_hash=None,
                transaction_hash=transaction_hash,
                block_number=None,
                network=self.network,
                verification_status="UNANCHORED",
                is_valid=False,
                verified_at=now,
            )

        on_chain_hash = record["canonical_hash"]
        is_match = (on_chain_hash.lower() == canonical_hash.lower())

        return BlockchainVerificationResult(
            incident_id=incident_id,
            current_recomputed_hash=canonical_hash,
            stored_canonical_hash=on_chain_hash,
            on_chain_hash=on_chain_hash,
            transaction_hash=record["tx_hash"],
            block_number=record["block_number"],
            network=self.network,
            verification_status="VERIFIED" if is_match else "TAMPERED",
            is_valid=is_match,
            verified_at=now,
        )


mock_blockchain_adapter = MockBlockchainAdapter()
