import json
import time
from typing import List, Optional
from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select

from app.core.config import settings
from app.core.logging import logger
from app.core.security import decode_token
from app.db.models.call import Call
from app.db.models.user import User
from app.db.session import async_session_factory
from app.webrtc.session_manager import signaling_manager

router = APIRouter(tags=["WebRTC Signaling"])

ALLOWED_SIGNALING_TYPES = {
    "offer",
    "answer",
    "ice_candidate",
    "call_invite",
    "call_ended",
    "ping",
    "pong",
    "security_alert",
    "peer_status",
    "peer_connected",
    "peer_disconnected",
}


async def authenticate_ws(websocket: WebSocket, token: Optional[str]) -> Optional[User]:
    """Validate token passed via query param or initial frame."""
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Missing auth token")
        return None

    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token claims")
            return None
    except Exception as e:
        logger.warning(f"WebSocket auth failed: {e}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Token verification failed")
        return None

    async with async_session_factory() as db:
        stmt = select(User).where(User.id == user_id)
        user = (await db.execute(stmt)).scalars().first()
        if not user or not user.is_active:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="User inactive or deleted")
            return None
        return user


@router.websocket("/ws/signaling/{call_id}")
async def websocket_signaling_endpoint(
    websocket: WebSocket,
    call_id: str,
    token: Optional[str] = Query(None),
):
    """Real-time authenticated WebRTC signaling relay for SDP and ICE candidates."""
    # Authenticate connecting peer before accept
    user = await authenticate_ws(websocket, token)
    if not user:
        return

    # Verify user is caller or receiver
    async with async_session_factory() as db:
        stmt = select(Call).where(Call.id == call_id)
        call = (await db.execute(stmt)).scalars().first()
        if not call:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Call does not exist")
            return

        if user.id not in (call.caller_id, call.receiver_id):
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Unauthorized call participant")
            return

    await websocket.accept()

    # Register session
    await signaling_manager.connect(call_id, user.id, websocket)

    # Inform newcomer of any peers already waiting in the session
    existing_peers = await signaling_manager.get_other_peer_ids(call_id, user.id)
    for peer_id in existing_peers:
        await websocket.send_json({
            "type": "peer_connected",
            "call_id": call_id,
            "user_id": peer_id,
        })

    # Notify existing peers that this user has joined
    await signaling_manager.relay_to_peer(
        call_id,
        user.id,
        {"type": "peer_connected", "call_id": call_id, "user_id": user.id},
    )

    msg_timestamps: List[float] = []

    try:
        while True:
            text_data = await websocket.receive_text()

            # 1. Payload size protection (max 64KB)
            if len(text_data) > settings.WS_MAX_MESSAGE_BYTES:
                logger.warning(f"WebSocket frame exceeded limit ({len(text_data)} bytes) from user {user.id}")
                await websocket.close(code=status.WS_1009_MESSAGE_TOO_BIG, reason="Signaling payload exceeds maximum size limit")
                return

            # 2. Message flood protection
            now = time.time()
            msg_timestamps = [t for t in msg_timestamps if t > now - 1.0]
            if len(msg_timestamps) >= settings.WS_MAX_MESSAGES_PER_SECOND:
                logger.warning(f"WebSocket message flood detected from user {user.id}")
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Message rate limit exceeded")
                return
            msg_timestamps.append(now)

            # 3. JSON parsing
            try:
                msg = json.loads(text_data)
            except Exception:
                await websocket.send_json({"type": "error", "message": "Invalid JSON frame"})
                continue

            if not isinstance(msg, dict):
                await websocket.send_json({"type": "error", "message": "Message must be a JSON object"})
                continue

            msg_type = msg.get("type", "")

            # 4. Allowed message type whitelist
            if msg_type not in ALLOWED_SIGNALING_TYPES:
                await websocket.send_json({"type": "error", "message": f"Unsupported signaling message type: '{msg_type}'"})
                continue

            # 5. Zero-Server-Audio transport guard: reject any binary audio chunks
            if "audio" in msg or "audio_chunk" in msg_type or "waveform" in msg:
                logger.warning(f"Rejected audio transmission over WebSocket signaling from user {user.id}")
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Audio transmission over signaling forbidden (Zero-Server-Audio)")
                return

            # Heartbeat
            if msg_type == "ping":
                await websocket.send_json({"type": "pong"})
                continue

            # Tag message with verified sender metadata
            msg["sender_id"] = user.id
            msg["call_id"] = call_id

            # Relay signaling frame to peer (offer, answer, ice_candidate, security_alert)
            delivered = await signaling_manager.relay_to_peer(call_id, user.id, msg)
            if not delivered and msg_type in ("offer", "call_invite"):
                await websocket.send_json({
                    "type": "peer_status",
                    "status": "WAITING_FOR_PEER",
                    "message": "Peer is not yet connected to signaling channel.",
                })

            if msg_type == "call_ended":
                break

    except WebSocketDisconnect:
        logger.info(f"WebSocket client disconnected cleanly: user={user.id}, call={call_id}")
    except Exception as e:
        logger.warning(f"Signaling loop error: {e}")
    finally:
        await signaling_manager.disconnect(call_id, user.id)
        await signaling_manager.relay_to_peer(
            call_id,
            user.id,
            {"type": "peer_disconnected", "call_id": call_id, "user_id": user.id},
        )
