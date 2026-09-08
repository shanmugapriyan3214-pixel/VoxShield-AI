"""VoxShield AI — WebRTC WebSocket Signaling Test Suite."""

import pytest
from unittest.mock import AsyncMock
from starlette.testclient import TestClient

from app.main import app
from app.webrtc.session_manager import SignalingSessionManager


def test_websocket_signaling_endpoint_auth_and_ping():
    """Test connecting to the signaling endpoint, authentication, and ping/pong."""
    import uuid
    uid = uuid.uuid4().hex[:8]
    client = TestClient(app)

    # 1. Reject without token
    with pytest.raises(Exception):
        with client.websocket_connect("/api/v1/ws/signaling/dummy-call-id"):
            pass

    # 2. Register user to get valid token
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": f"signaling_user_{uid}@voxshield.io",
            "username": f"sig_user_{uid}",
            "display_name": "Sig User",
            "password": "Password123!",
        },
    )
    user_data = reg.json()["data"]
    token = user_data["tokens"]["access_token"]
    user_id = user_data["user"]["id"]

    # 3. Create a call
    reg2 = client.post(
        "/api/v1/auth/register",
        json={
            "email": f"sig_peer_{uid}@voxshield.io",
            "username": f"sig_peer_{uid}",
            "display_name": "Sig Peer",
            "password": "Password123!",
        },
    )
    peer_id = reg2.json()["data"]["user"]["id"]

    call_resp = client.post(
        "/api/v1/calls",
        json={"receiver_id": peer_id},
        headers={"Authorization": f"Bearer {token}"},
    )
    call_id = call_resp.json()["data"]["id"]

    # 4. Connect with valid token
    with client.websocket_connect(f"/api/v1/ws/signaling/{call_id}?token={token}") as ws:
        # Send ping
        ws.send_json({"type": "ping"})
        # Receive pong
        response = ws.receive_json()
        assert response["type"] == "pong"

        # Send call invite when peer not yet connected -> receive waiting status
        ws.send_json({"type": "offer", "payload": {"sdp": "v=0..."}})
        status_msg = ws.receive_json()
        assert status_msg["type"] == "peer_status"
        assert status_msg["status"] == "WAITING_FOR_PEER"

        # Graceful close
        ws.send_json({"type": "call_ended"})


@pytest.mark.asyncio
async def test_session_manager_peer_relay_logic():
    """Unit test the signaling session manager routing between two peers."""
    manager = SignalingSessionManager()
    call_id = "test-call-123"
    alice_id = "alice-uuid"
    bob_id = "bob-uuid"

    ws_alice = AsyncMock()
    ws_bob = AsyncMock()

    # Connect both
    await manager.connect(call_id, alice_id, ws_alice)
    await manager.connect(call_id, bob_id, ws_bob)

    connected = manager.get_connected_user_ids(call_id)
    assert alice_id in connected
    assert bob_id in connected

    # Alice sends offer -> should be relayed only to Bob
    offer_msg = {"type": "offer", "payload": {"sdp": "v=0..."}}
    delivered = await manager.relay_to_peer(call_id, alice_id, offer_msg)
    assert delivered is True
    ws_bob.send_json.assert_called_once_with(offer_msg)
    ws_alice.send_json.assert_not_called()

    # Bob sends answer -> should be relayed only to Alice
    answer_msg = {"type": "answer", "payload": {"sdp": "v=0..."}}
    delivered_ans = await manager.relay_to_peer(call_id, bob_id, answer_msg)
    assert delivered_ans is True
    ws_alice.send_json.assert_called_once_with(answer_msg)

    # Disconnect Bob
    await manager.disconnect(call_id, bob_id)
    assert bob_id not in manager.get_connected_user_ids(call_id)
    assert alice_id in manager.get_connected_user_ids(call_id)
