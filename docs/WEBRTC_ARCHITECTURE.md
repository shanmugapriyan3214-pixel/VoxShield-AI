# VoxShield AI — WebRTC Architecture Specification

## 1. WebRTC & Signaling Overview

VoxShield AI provides encrypted peer-to-peer audio communications paired with real-time AI voice-cloning detection. The WebRTC subsystem is designed to operate with zero media routing through the application server.

```
[ Peer A Browser ] <===== Encrypted DTLS-SRTP Audio =====> [ Peer B Browser ]
       |                                                            |
       | (SDP Offer / ICE)                         (SDP Answer / ICE)
       v                                                            v
[ FastAPI WebSocket ] <========== Signaling Relay ==========> [ FastAPI WebSocket ]
  (/api/v1/ws/signaling/{callId})
```

---

## 2. Signaling Protocol (`/api/v1/ws/signaling/{callId}`)

The signaling channel manages session establishment and teardown using authenticated JSON messages over WebSocket:

### Message Schema

```typescript
interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice_candidate' | 'call_ended' | 'ping' | 'pong';
  payload?: any;
  sender_id?: string;
}
```

### Connection Sequence

1. **Authentication:**
   Client connects to `ws://127.0.0.1:8000/api/v1/ws/signaling/{callId}?token={JWT_ACCESS_TOKEN}`. The server validates the bearer token and ensures the user is an authorized participant in `{callId}`.

2. **Keep-Alive Heartbeats:**
   The client transmits `{"type": "ping"}` every 20 seconds. The server responds with `{"type": "pong"}`. If connection drops, the client automatically attempts reconnection with exponential backoff (1s, 2s, 4s... max 10s).

3. **Offer / Answer Exchange:**
   - Initiator calls `createOffer()` -> sets local description -> sends `{"type": "offer", "payload": sdp}`.
   - Receiver sets remote description -> calls `createAnswer()` -> sets local description -> sends `{"type": "answer", "payload": sdp}`.
   - Both peers exchange trickle ICE candidates via `{"type": "ice_candidate", "payload": candidate}`.

4. **Media Encryption:**
   All audio packets are encrypted directly between peers using **DTLS-SRTP** with secure elliptic-curve key exchange.

---

## 3. WebRTC Peer Connection Manager (`frontend/src/webrtc/peerConnection.ts`)

### Configuration

```typescript
const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
};
```

### Audio Constraints & Optimization

```typescript
const audioConstraints: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  sampleRate: 16000, // Matched with AI streaming sliding window
};
```

### Teardown Sequence

When a call ends (either via hangup button or remote `call_ended` signal):
1. `RTCPeerConnection.close()` terminates the DTLS-SRTP session.
2. Local `MediaStreamTrack` instances are explicitly stopped (`track.stop()`) to release the hardware microphone indicator.
3. Web Audio API `AudioContext` and `AnalyserNode` instances are closed.
4. WebSocket signaling connection is closed with status code `1000 (Normal Closure)`.
