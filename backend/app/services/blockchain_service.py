"""VoxShield AI — Blockchain Evidence Service."""

import json
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.blockchain import get_blockchain_adapter
from app.blockchain.interface import (
    BlockchainReceipt,
    BlockchainVerificationResult,
)
from app.core.exceptions import ConflictException, ResourceNotFoundException
from app.db.models.blockchain import BlockchainRecord
from app.db.models.incident import Incident
from app.services.incident_service import IncidentService


class BlockchainService:
    """Orchestrates evidence hashing, distributed ledger anchoring, and cryptographic verification."""

    @staticmethod
    async def anchor_incident(
        db: AsyncSession,
        incident_id: str,
        user_id: str,
    ) -> BlockchainReceipt:
        incident = await IncidentService.get_incident(db, incident_id, user_id)

        # Check if already anchored
        stmt_existing = select(BlockchainRecord).where(BlockchainRecord.incident_id == incident_id)
        existing_record = (await db.execute(stmt_existing)).scalars().first()
        if existing_record:
            return BlockchainReceipt(
                incident_id=incident.id,
                canonical_hash=existing_record.canonical_hash,
                network=existing_record.network,
                contract_address=existing_record.contract_address,
                transaction_hash=existing_record.transaction_hash,
                block_number=existing_record.block_number,
                status=existing_record.status,
                anchored_at=existing_record.anchored_at,
            )

        # Anchor on-chain via adapter
        adapter = get_blockchain_adapter()
        receipt = await adapter.anchor_hash(
            incident_id=incident.id,
            canonical_hash=incident.canonical_hash,
        )

        # Persist audit record in PostgreSQL
        record = BlockchainRecord(
            incident_id=incident.id,
            canonical_hash=receipt.canonical_hash,
            network=receipt.network,
            contract_address=receipt.contract_address,
            transaction_hash=receipt.transaction_hash,
            block_number=receipt.block_number,
            status=receipt.status,
            anchored_at=receipt.anchored_at,
        )
        db.add(record)
        await db.commit()

        return receipt

    @staticmethod
    async def verify_incident(
        db: AsyncSession,
        incident_id: str,
        user_id: str,
    ) -> BlockchainVerificationResult:
        incident = await IncidentService.get_incident(db, incident_id, user_id)

        # Recalculate canonical hash from current database values
        indicators = json.loads(incident.indicators_json) if incident.indicators_json else []
        recommendations = json.loads(incident.recommendations_json) if incident.recommendations_json else []

        canonical_payload = {
            "incident_number": incident.incident_number,
            "user_id": incident.user_id,
            "call_id": incident.call_id or "",
            "incident_type": incident.incident_type,
            "severity": incident.severity,
            "threat_score": float(incident.threat_score),
            "ai_probability": float(incident.ai_probability),
            "speaker_match_score": float(incident.speaker_match_score) if incident.speaker_match_score is not None else -1.0,
            "liveness_score": float(incident.liveness_score) if incident.liveness_score is not None else -1.0,
            "summary": incident.summary.strip(),
            "indicators": sorted(indicators),
            "recommendations": sorted(recommendations),
        }
        recomputed_hash = IncidentService.generate_canonical_hash(canonical_payload)

        # Query blockchain record
        stmt = select(BlockchainRecord).where(BlockchainRecord.incident_id == incident_id)
        record = (await db.execute(stmt)).scalars().first()

        adapter = get_blockchain_adapter()
        if not record:
            return BlockchainVerificationResult(
                incident_id=incident.id,
                current_recomputed_hash=recomputed_hash,
                stored_canonical_hash=incident.canonical_hash or "",
                on_chain_hash=None,
                transaction_hash=None,
                block_number=None,
                network=adapter.network if hasattr(adapter, "network") else "mock-ledger",
                verification_status="UNANCHORED",
                is_valid=False,
                verified_at=datetime.now(timezone.utc),
            )

        # Verify against adapter
        result = await adapter.verify_hash(
            incident_id=incident.id,
            canonical_hash=recomputed_hash,
            transaction_hash=record.transaction_hash,
        )
        return result
