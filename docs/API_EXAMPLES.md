# VoxShield AI — API Usage Examples & Integration Recipes

This document provides concrete HTTP and WebSocket examples using `curl` and JSON payloads for integrating client applications with VoxShield AI.

---

## 1. Authentication & Session Management

### 1.1 Register Account
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@voxshield.io",
    "username": "alice",
    "display_name": "Alice Vance",
    "password": "SecurePassword123!"
  }'
```

#### Response (`201 Created`):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "b3e2a105-89f4-41d3-9bc4-b63301a2c34d",
      "email": "alice@voxshield.io",
      "username": "alice",
      "display_name": "Alice Vance",
      "avatar_url": null,
      "is_verified": false,
      "is_active": true,
      "created_at": "2026-09-08T15:00:00Z",
      "updated_at": "2026-09-08T15:00:00Z",
      "last_login_at": null
    },
    "tokens": {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh_token": "a1b2c3d4e5f6...",
      "token_type": "bearer",
      "expires_in": 900
    }
  },
  "error": null,
  "request_id": "req-001"
}
```

### 1.2 User Login
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@voxshield.io",
    "password": "SecurePassword123!"
  }'
```

### 1.3 Refresh Access Token
```bash
curl -X POST http://localhost:8000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "a1b2c3d4e5f6..."
  }'
```

---

## 2. Voice Profiles

### 2.1 Create Voice Profile Metadata
```bash
curl -X POST http://localhost:8000/api/v1/voices \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "label": "Alice MacBook Microphone",
    "model_version": "ecapa-tdnn-v2"
  }'
```

#### Response (`201 Created`):
```json
{
  "success": true,
  "data": {
    "id": "e8910a34-78bc-40d2-95f1-8899aabbccdd",
    "user_id": "b3e2a105-89f4-41d3-9bc4-b63301a2c34d",
    "label": "Alice MacBook Microphone",
    "status": "ACTIVE",
    "model_version": "ecapa-tdnn-v2",
    "embedding_hash": null,
    "created_at": "2026-09-08T15:05:00Z",
    "updated_at": "2026-09-08T15:05:00Z"
  },
  "error": null,
  "request_id": "req-002"
}
```

---

## 3. Trusted Contacts Registry

### 3.1 Register Trusted Contact
```bash
curl -X POST http://localhost:8000/api/v1/trusted-voices \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "display_name": "Father",
    "relationship": "Father"
  }'
```

---

## 4. Offline Audio File Analysis

### 4.1 Upload Audio for Deepfake Analysis
```bash
curl -X POST http://localhost:8000/api/v1/analysis/audio \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -F "file=@voicemail_suspect.wav"
```

#### Response (`200 OK`):
```json
{
  "success": true,
  "data": {
    "analysis_id": "98a7b6c5-4321-40ef-8901-abcdef123456",
    "status": "COMPLETED",
    "classification": "LIKELY_AI_GENERATED",
    "ai_probability": 0.942,
    "human_probability": 0.058,
    "speaker_match_score": 0.88,
    "liveness_score": 0.41,
    "model_version": "voxguard-neural-v1.0-demo",
    "is_mock": true,
    "created_at": "2026-09-08T15:10:00Z",
    "warning": "PRIVACY NOTICE: Server-side analysis processes uploaded audio. Real-time calls use on-device analysis."
  },
  "error": null,
  "request_id": "req-003"
}
```

---

## 5. WebRTC Voice Calls & Security Telemetry

### 5.1 Initiate Call Session
```bash
curl -X POST http://localhost:8000/api/v1/calls \
  -H "Authorization: Bearer <ALICE_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "receiver_id": "bob-user-uuid"
  }'
```

### 5.2 Callee Accepts Call
```bash
curl -X POST http://localhost:8000/api/v1/calls/<CALL_ID>/accept \
  -H "Authorization: Bearer <BOB_ACCESS_TOKEN>"
```

### 5.3 Submit In-Call AI Security Detection Event (No Audio)
```bash
curl -X POST http://localhost:8000/api/v1/calls/<CALL_ID>/security-events \
  -H "Authorization: Bearer <ALICE_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "AI_VOICE_DETECTED",
    "severity": "CRITICAL",
    "threat_score": 92.0,
    "ai_probability": 0.94,
    "speaker_match_score": 0.45,
    "liveness_score": 0.38,
    "metadata": {
      "vocoder_glitch_hz": 12500,
      "frame_timestamp": "00:01:24.300"
    }
  }'
```

---

## 6. WebRTC WebSocket Signaling Relay

Connect WebSocket:
```
wss://localhost:8000/api/v1/ws/signaling/<CALL_ID>?token=<ACCESS_TOKEN>
```

### 6.1 Relay SDP Offer
```json
{
  "type": "offer",
  "payload": {
    "sdp": "v=0\r\no=alice 2890844526 2890844526 IN IP4 0.0.0.0...",
    "type": "offer"
  }
}
```

### 6.2 Relay SDP Answer
```json
{
  "type": "answer",
  "payload": {
    "sdp": "v=0\r\no=bob 2890844527 2890844527 IN IP4 0.0.0.0...",
    "type": "answer"
  }
}
```

### 6.3 Relay ICE Candidate
```json
{
  "type": "ice_candidate",
  "payload": {
    "candidate": "candidate:1 1 UDP 2122260223 192.168.1.100 50000 typ host",
    "sdpMid": "0",
    "sdpMLineIndex": 0
  }
}
```

---

## 7. Incidents & Blockchain Evidence Anchoring

### 7.1 Create Security Incident
```bash
curl -X POST http://localhost:8000/api/v1/incidents \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "incident_type": "VOICE_CLONING_ATTEMPT",
    "severity": "CRITICAL",
    "threat_score": 95.0,
    "ai_probability": 0.96,
    "summary": "Impersonation voice clone attack targeting accounts department.",
    "indicators": [
      "Vocoder synthesis artifacts detected",
      "Speaker identity mismatch"
    ],
    "recommendations": [
      "Immediately freeze unauthorized wire request",
      "Verify identity through internal corporate directory"
    ]
  }'
```

### 7.2 Anchor Incident to Blockchain
```bash
curl -X POST http://localhost:8000/api/v1/incidents/<INCIDENT_ID>/anchor \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

#### Response (`200 OK`):
```json
{
  "success": true,
  "data": {
    "incident_id": "78a9b0c1-2345-4def-8901-abcdef456789",
    "canonical_hash": "0x7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
    "network": "mock-ledger",
    "contract_address": "0x0000000000000000000000000000000000000000",
    "transaction_hash": "0x4a9d7b8899aabbcc...",
    "block_number": 19482101,
    "status": "CONFIRMED",
    "anchored_at": "2026-09-08T15:20:00Z"
  },
  "error": null,
  "request_id": "req-004"
}
```

### 7.3 Verify Incident Integrity
```bash
curl -X GET http://localhost:8000/api/v1/incidents/<INCIDENT_ID>/verification \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

#### Response (`200 OK`):
```json
{
  "success": true,
  "data": {
    "incident_id": "78a9b0c1-2345-4def-8901-abcdef456789",
    "current_recomputed_hash": "0x7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
    "stored_canonical_hash": "0x7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
    "on_chain_hash": "0x7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
    "transaction_hash": "0x4a9d7b8899aabbcc...",
    "block_number": 19482101,
    "network": "mock-ledger",
    "verification_status": "VERIFIED",
    "is_valid": true,
    "verified_at": "2026-09-08T15:21:00Z"
  },
  "error": null,
  "request_id": "req-005"
}
```
