"""VoxShield AI — WebRTC Signaling Message Schemas."""

from datetime import datetime, timezone
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class SignalingMessage(BaseModel):
    """Signaling envelope for peer-to-peer WebRTC establishment."""
    type: str = Field(
        ...,
        description="offer | answer | ice_candidate | call_ringing | call_accept | call_reject | security_alert | call_ended | ping | pong",
    )
    call_id: str
    sender_id: str
    recipient_id: Optional[str] = None
    payload: Dict[str, Any] = Field(default_factory=dict)
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
