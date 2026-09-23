"""VoxShield AI — WebRTC Signaling Session Manager."""

import asyncio
from typing import Dict, List, Optional
from fastapi import WebSocket

from app.core.logging import logger


class SignalingSessionManager:
    """Thread-safe in-memory session registry for WebRTC signaling relays."""

    def __init__(self):
        # Map: call_id -> {user_id: WebSocket}
        self._sessions: Dict[str, Dict[str, WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, call_id: str, user_id: str, websocket: WebSocket) -> None:
        """Register active WebSocket for a call participant."""
        async with self._lock:
            if call_id not in self._sessions:
                self._sessions[call_id] = {}
            self._sessions[call_id][user_id] = websocket
            logger.info(f"Signaling session connected: call={call_id}, user={user_id}")

    async def disconnect(self, call_id: str, user_id: str) -> None:
        """Unregister participant from call session."""
        async with self._lock:
            if call_id in self._sessions and user_id in self._sessions[call_id]:
                del self._sessions[call_id][user_id]
                logger.info(f"Signaling session disconnected: call={call_id}, user={user_id}")
                if not self._sessions[call_id]:
                    del self._sessions[call_id]

    async def relay_to_peer(self, call_id: str, sender_id: str, message: dict) -> bool:
        """Forward message to the other participant in the two-party call."""
        async with self._lock:
            peers = self._sessions.get(call_id, {})
            targets = [ws for uid, ws in peers.items() if uid != sender_id]

        if not targets:
            return False

        for ws in targets:
            try:
                await ws.send_json(message)
            except Exception as e:
                logger.warning(f"Failed to relay signaling frame to peer in call {call_id}: {e}")
        return True

    async def broadcast(self, call_id: str, message: dict) -> None:
        """Broadcast message to all connected participants in the call."""
        async with self._lock:
            peers = list(self._sessions.get(call_id, {}).values())

        for ws in peers:
            try:
                await ws.send_json(message)
            except Exception as e:
                logger.warning(f"Broadcast signaling error in call {call_id}: {e}")

    async def get_other_peer_ids(self, call_id: str, current_user_id: str) -> List[str]:
        """Return IDs of other participants currently connected to the call session."""
        async with self._lock:
            peers = self._sessions.get(call_id, {})
            return [uid for uid in peers.keys() if uid != current_user_id]

    def get_connected_user_ids(self, call_id: str) -> List[str]:
        return list(self._sessions.get(call_id, {}).keys())


signaling_manager = SignalingSessionManager()

