"""VoxShield AI — Blockchain Adapters Registry."""

from app.blockchain.interface import (
    BlockchainAdapter,
    BlockchainReceipt,
    BlockchainVerificationResult,
)
from app.blockchain.mock import MockBlockchainAdapter, mock_blockchain_adapter
from app.blockchain.evm import EvmBlockchainAdapter
from app.core.config import settings


def get_blockchain_adapter() -> BlockchainAdapter:
    """Factory returning configured blockchain adapter."""
    if settings.BLOCKCHAIN_PROVIDER == "evm":
        return EvmBlockchainAdapter(network=settings.BLOCKCHAIN_NETWORK)
    return mock_blockchain_adapter


__all__ = [
    "BlockchainAdapter",
    "BlockchainReceipt",
    "BlockchainVerificationResult",
    "MockBlockchainAdapter",
    "EvmBlockchainAdapter",
    "get_blockchain_adapter",
]
