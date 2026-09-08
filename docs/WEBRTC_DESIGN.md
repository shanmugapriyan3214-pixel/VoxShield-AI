# VoxShield AI — WebRTC Signaling & Real-Time Call Architecture

## 1. Signaling Protocol Specification

VoxShield AI provides an asynchronous, authenticated WebSocket signaling relay. The signaling service connects peers for SDP and ICE exchange while remaining completely decoupled from the real-time audio media plane.

### 1.1 Connection Handshake
- **Endpoint**: `/api/v1/ws/signaling/{call_id}`
- **Authentication**: JWT access token passed via query parameter (`?token=<jwt>`) or within the initial connection frame.
- **Authorization**: The connecting user ID must match either the `caller_id` or `receiver_id` associated with `call_id`.

```
Peer A (Caller)              VoxShield Signaling Relay              Peer B (Callee)
      │                                  │                                  │
      │── 1. Connect (WS) ──────────────►│                                  │
      │   (Authenticates JWT)            │◄───── 2. Connect (WS) ───────────│
      │                                  │       (Authenticates JWT)        │
      │── 3. Offer (SDP) ───────────────►│                                  │
      │                                  │────── 4. Forward Offer ─────────►│
      │                                  │                                  │
      │                                  │◄───── 5. Answer (SDP) ───────────│
      │◄─ 6. Forward Answer ─────────────│                                  │
      │                                  │                                  │
      │── 7. ICE Candidate A ───────────►│                                  │
      │                                  │────── 8. Forward Candidate A ───►│
      │                                  │                                  │
      │                                  │◄───── 9. ICE Candidate B ────────│
      │◄─ 10. Forward Candidate B ───────│                                  │
      │                                  │                                  │
      │══════════════════ [ P2P DTLS-SRTP Media Established ] ══════════════│
      │                                  │                                  │
      │── 11. Security Alert Telemetry ─►│ (Threat Engine records event)    │
```

---

## 2. Call Session State Machine

```
               ┌──────────┐
               │   INIT   │
               └────┬─────┘
                    │ POST /api/v1/calls
                    ▼
               ┌──────────┐
      ┌────────┤  RINGING ├────────┐
      │        └────┬─────┘        │
      │ Receiver    │ Receiver     │ Receiver
      │ Timeout     │ Rejects      │ Accepts
      ▼             ▼              ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│  MISSED  │  │ REJECTED │  │ ACCEPTED │
└──────────┘  └──────────┘  └────┬─────┘
                                 │ Peer Connection
                                 │ Established
                                 ▼
                            ┌──────────┐
                            │  ACTIVE  │
                            └────┬─────┘
                                 │ Hang Up / Error
                                 ▼
                            ┌──────────┐
                            │  ENDED   │
                            └──────────┘
```

---

## 3. WebSocket Message Schema

All signaling messages exchanged over `/api/v1/ws/signaling/{call_id}` are formatted as JSON envelopes:

```json
{
  "type": "offer",
  "call_id": "8f3e2b10-6745-42bc-9d0a-112233445566",
  "sender_id": "user-uuid-1",
  "recipient_id": "user-uuid-2",
  "payload": {
    "sdp": "v=0\r\no=- 42 2 IN IP4 127.0.0.1...",
    "type": "offer"
  },
  "timestamp": "2026-09-08T14:20:00Z"
}
```

### Supported Message Types:
1. `call_invite`: Sent by caller to initiate ringing.
2. `call_ringing`: Callee acknowledges incoming alert.
3. `call_accept`: Callee signals intention to connect.
4. `call_reject`: Callee declines the call session.
5. `offer`: WebRTC Session Description Protocol (SDP) offer.
6. `answer`: WebRTC SDP answer.
7. `ice_candidate`: Interactive Connectivity Establishment candidate for NAT traversal.
8. `security_alert`: Real-time edge deepfake detection warning forwarded to the peer.
9. `call_ended`: Graceful hangup notification.
10. `ping` / `pong`: Heartbeat liveness keep-alive.

---

## 4. Media Security: Transport vs. Application E2EE

VoxShield AI differentiates between two layers of encryption:

1. **Transport Layer Encryption (Standard WebRTC)**:
   - Media flows directly between Peer A and Peer B using **DTLS-SRTP**.
   - If peer-to-peer connectivity fails due to symmetric NAT, a TURN relay is used. Even when relaying through a TURN server, the TURN server cannot decrypt the SRTP packets because it lacks the DTLS session keys.
2. **True End-to-End Application Encryption (Encoded Transforms / SFrame)**:
   - For ultra-high security environments, clients can enable **WebRTC Insertable Streams** (RFC 9605 - SFrame).
   - Audio frames are encrypted with an out-of-band shared secret *before* passing into WebRTC packetization, ensuring end-to-end privacy even if an untrusted Selective Forwarding Unit (SFU) is used in future multi-party conferences.
