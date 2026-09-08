# VoxShield AI — API Specification

## 1. Global Conventions

### 1.1 Base URL
All v1 API endpoints are prefixed with:
```
/api/v1
```

### 1.2 Unified Response Envelope
Every API response adheres strictly to the standardized envelope structure:

#### Success Response (`HTTP 200 / 201`)
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "request_id": "c7a8b9e0-1234-5678-9abc-def012345678"
}
```

#### Error Response (`HTTP 400 / 401 / 403 / 404 / 422 / 500`)
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "AUTHENTICATION_FAILED",
    "message": "Invalid email or password.",
    "details": []
  },
  "request_id": "c7a8b9e0-1234-5678-9abc-def012345678"
}
```

---

## 2. Authentication API (`/api/v1/auth`)

### 2.1 Register User
- **Method & Path**: `POST /api/v1/auth/register`
- **Auth**: None (Public)
- **Request Body**:
  ```json
  {
    "email": "alice@voxshield.io",
    "username": "alice",
    "display_name": "Alice Vance",
    "password": "SecurePassword123!"
  }
  ```
- **Response (`201 Created`)**:
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "e4b6c810-73f1-46bb-9ce6-50854d68249a",
        "email": "alice@voxshield.io",
        "username": "alice",
        "display_name": "Alice Vance",
        "is_verified": false,
        "is_active": true,
        "created_at": "2026-09-08T14:00:00Z"
      },
      "tokens": {
        "access_token": "eyJhbG...",
        "refresh_token": "eyJhbG...",
        "token_type": "bearer",
        "expires_in": 900
      }
    },
    "error": null,
    "request_id": "req-001"
  }
  ```

### 2.2 Login User
- **Method & Path**: `POST /api/v1/auth/login`
- **Auth**: None
- **Request Body**:
  ```json
  {
    "email": "alice@voxshield.io",
    "password": "SecurePassword123!"
  }
  ```
- **Response (`200 OK`)**: Same token and user payload as Register.

### 2.3 Refresh Token
- **Method & Path**: `POST /api/v1/auth/refresh`
- **Auth**: None
- **Request Body**:
  ```json
  {
    "refresh_token": "eyJhbG..."
  }
  ```
- **Response (`200 OK`)**: New access token and rotated refresh token.

### 2.4 Logout
- **Method & Path**: `POST /api/v1/auth/logout`
- **Auth**: Bearer Token
- **Request Body**:
  ```json
  {
    "refresh_token": "eyJhbG..."
  }
  ```
- **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": { "message": "Successfully logged out." },
    "error": null,
    "request_id": "req-004"
  }
  ```

### 2.5 Current User
- **Method & Path**: `GET /api/v1/auth/me`
- **Auth**: Bearer Token
- **Response (`200 OK`)**: Current user profile.

### 2.6 Change Password
- **Method & Path**: `POST /api/v1/auth/change-password`
- **Auth**: Bearer Token
- **Request Body**:
  ```json
  {
    "current_password": "OldPassword123!",
    "new_password": "NewSecurePassword456!"
  }
  ```

---

## 3. Users API (`/api/v1/users`)

- `GET /api/v1/users/me` — Full profile of authenticated user.
- `PATCH /api/v1/users/me` — Update display_name, avatar_url.
- `GET /api/v1/users/{id}` — Public safe profile (id, username, display_name, avatar_url).

---

## 4. Voice Profiles API (`/api/v1/voices`)

Manage speaker verification profiles (voice representations).

- `POST /api/v1/voices` — Create a voice profile with label and optional reference embedding hash/descriptor.
  ```json
  {
    "label": "My Primary Voice Profile",
    "model_version": "ecapa-tdnn-v2"
  }
  ```
- `GET /api/v1/voices` — List user's registered voice profiles.
- `GET /api/v1/voices/{id}` — Get profile metadata (strictly no raw embeddings returned).
- `PATCH /api/v1/voices/{id}` — Update label or status.
- `DELETE /api/v1/voices/{id}` — Remove voice profile.

---

## 5. Trusted Voices API (`/api/v1/trusted-voices`)

Register trusted family, friends, or verified contacts.

- `POST /api/v1/trusted-voices`
  ```json
  {
    "display_name": "Father",
    "relationship": "Father",
    "trusted_user_id": "optional-uuid",
    "voice_profile_id": "optional-uuid"
  }
  ```
- `GET /api/v1/trusted-voices` — List all trusted contacts.
- `GET /api/v1/trusted-voices/{id}` — Get contact details.
- `PATCH /api/v1/trusted-voices/{id}` — Update relationship, status.
- `DELETE /api/v1/trusted-voices/{id}` — Remove contact.

---

## 6. Analysis & Comparison API (`/api/v1/analysis`)

### 6.1 Audio File Analysis (Optional Offline Mode)
- **Method & Path**: `POST /api/v1/analysis/audio`
- **Query Params**: `?demo_scenario=normal|suspicious|voice_clone` (Optional simulation override for hackathon demos)
- **Auth**: Bearer Token
- **Content-Type**: `multipart/form-data`
- **Form Fields**: `file` (WAV, MP3, M4A, FLAC, OGG)
- **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "analysis_id": "8f3e2b10-6745-42bc-9d0a-112233445566",
      "status": "COMPLETED",
      "classification": "LIKELY_AI_GENERATED",
      "ai_probability": 0.94,
      "human_probability": 0.06,
      "speaker_match_score": 0.28,
      "liveness_score": 0.22,
      "model_version": "local-neural-v2.0",
      "is_mock": false,
      "warning": "PRIVACY NOTICE: Server-side analysis processes uploaded audio. Real-time calls use on-device analysis."
    }
  }
  ```

### 6.2 Voice Comparison
- **Method & Path**: `POST /api/v1/analysis/compare`
- **Request Body**:
  ```json
  {
    "reference_embedding": [0.05, -0.12, ...],
    "suspect_embedding": [0.04, -0.11, ...]
  }
  ```
- **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "speaker_match_score": 0.98,
      "confidence": 0.93,
      "is_match": true,
      "threshold_used": 0.75,
      "model_version": "cosine-v1.0"
    }
  }
  ```

---

## 7. Calls API (`/api/v1/calls`)

- `POST /api/v1/calls` — Initiate a call session (creates `RINGING` state).
- `GET /api/v1/calls` — List caller/receiver call history.
- `GET /api/v1/calls/{id}` — Get call session details.
- `POST /api/v1/calls/{id}/accept` — Accept incoming call (`ACCEPTED`).
- `POST /api/v1/calls/{id}/reject` — Reject incoming call (`REJECTED`).
- `POST /api/v1/calls/{id}/end` — Terminate call (`ENDED`).

### 7.1 Live Security Telemetry (Zero Server Audio)
- **Method & Path**: `POST /api/v1/calls/{id}/security-analysis`
- **Purpose**: Receive on-device edge AI telemetry frames every 1.5 seconds. Unencrypted live audio NEVER touches the backend server.
- **Request Body**:
  ```json
  {
    "ai_generated_probability": 0.94,
    "speaker_match_probability": 0.32,
    "liveness_probability": 0.28,
    "window_duration_ms": 1500,
    "window_index": 4,
    "detected_artifacts": ["vocoder_phase_discontinuity"]
  }
  ```
- **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "threat_score": 88.5,
      "severity": "CRITICAL",
      "recommended_action": "RECOMMEND_TERMINATION",
      "recommendation": "CRITICAL THREAT: High-confidence voice clone impersonation attack. Hang up immediately.",
      "indicators": ["High synthetic speech probability (94.0%)", "Voice embedding mismatch (32.0% similarity)"],
      "call_terminated": false,
      "event_id": "sec-event-uuid",
      "timestamp": "2026-09-08T15:45:00Z"
    }
  }
  ```

### 7.2 Trust Verification Challenges
- `POST /api/v1/calls/{id}/challenge` — Issue an interactive acoustic passphrase challenge (e.g. returns `"Falcon Echo Crimson"`).
- `POST /api/v1/calls/{id}/challenge/verify` — Verify the spoken response phrase and liveness score (`PASSED` | `FAILED`).
- `GET /api/v1/calls/{id}/challenge` — Fetch active challenge status and remaining duration.

### 7.3 Legacy Security Events Ingestion
- `POST /api/v1/calls/{id}/security-events` — Ingest client-side AI detection alert.
- `GET /api/v1/calls/{id}/security-events` — List all recorded security telemetry events for call.


---

## 8. WebSockets Signaling API (`/api/v1/ws/signaling/{call_id}`)

- **Protocol**: WebSocket Secure (`wss://`)
- **Query Params**: `?token=<jwt_access_token>`
- **Frame Types**:
  - `offer`: `{ "type": "offer", "sdp": "..." }`
  - `answer`: `{ "type": "answer", "sdp": "..." }`
  - `ice_candidate`: `{ "type": "ice_candidate", "candidate": { ... } }`
  - `security_alert`: `{ "type": "security_alert", "threat_score": 92 }`
  - `call_ended`: `{ "type": "call_ended", "reason": "USER_HUNG_UP" }`

---

## 9. Threat Intelligence API (`/api/v1/threats`)

- `GET /api/v1/threats` — Filter threat events by date range, severity (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), or event type.
- `GET /api/v1/threats/{id}` — Get detailed threat telemetry.
- `GET /api/v1/threats/summary` — Aggregate metrics (total threats, severity distribution, top attack vectors).
- `GET /api/v1/threats/timeline` — Time-bucketed threat counts for dashboard charting.

---

## 10. Incidents API (`/api/v1/incidents`)

- `POST /api/v1/incidents` — Create a structured incident report.
- `GET /api/v1/incidents` — List user's incidents.
- `GET /api/v1/incidents/{id}` — Detailed incident report with indicators and recommendations.
- `PATCH /api/v1/incidents/{id}` — Update status (`OPEN`, `INVESTIGATING`, `RESOLVED`, `FALSE_POSITIVE`).
- `DELETE /api/v1/incidents/{id}` — Delete incident.

---

## 11. Blockchain Audit API (`/api/v1/incidents/{id}/anchor`)

- `POST /api/v1/incidents/{id}/anchor` — Anchors the canonical SHA-256 hash of the incident to the configured ledger (Mock or EVM).
  ```json
  {
    "success": true,
    "data": {
      "incident_id": "inc-uuid",
      "canonical_hash": "0x7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
      "transaction_hash": "0x4a9d7...",
      "block_number": 19482710,
      "network": "ethereum-sepolia",
      "status": "CONFIRMED",
      "anchored_at": "2026-09-08T14:15:00Z"
    }
  }
  ```
- `GET /api/v1/incidents/{id}/verification` — Validates current incident record against stored ledger proof. Returns `status`: `VERIFIED`, `TAMPERED`, or `UNANCHORED`.

---

## 12. Health Probes API (`/health` & `/api/v1/health`)

- `GET /health` — Simple liveness probe (`{"status": "ok"}`).
- `GET /api/v1/health` — Deep readiness probe checking PostgreSQL, Redis, and AI service readiness.

---

## 13. AI Subsystem Status API (`/api/v1/ai/status`)

- **Method & Path**: `GET /api/v1/ai/status`
- **Auth**: Public or Bearer Token
- **Purpose**: Exposes non-sensitive operational telemetry, engine availability, and active models.
- **Privacy Guarantee**: Never exposes model weights, local model file paths, or private embeddings.
- **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "status": "OPERATIONAL",
      "mode": "local",
      "fallback_mode": "dsp",
      "device": "cpu",
      "streaming_window": {
        "window_duration_sec": 1.5,
        "hop_duration_sec": 0.75,
        "sample_rate": 16000
      },
      "models": {
        "deepfake_detector": {
          "model_name": "AASIST-L-AntiSpoof-ONNX",
          "version": "aasist-v1.0",
          "engine_type": "LOCAL_DSP_ANALYZER",
          "framework": "dsp_numpy",
          "device": "cpu",
          "available": true,
          "status": "FALLBACK_DSP",
          "model_path": "[RESTRICTED_SERVER_PATH]",
          "description": "Speech anti-spoofing and synthetic voice clone detector."
        },
        "speaker_encoder": {
          "model_name": "ECAPA-TDNN-VoxCeleb-ONNX",
          "version": "ecapa-v1.0",
          "engine_type": "LOCAL_DSP_ANALYZER",
          "framework": "dsp_numpy",
          "device": "cpu",
          "available": true,
          "status": "FALLBACK_DSP",
          "model_path": "[RESTRICTED_SERVER_PATH]",
          "description": "Acoustic speaker embedding extractor."
        },
        "liveness_detector": {
          "model_name": "VoxShield-AcousticLiveness-Local",
          "version": "liveness-v2.5",
          "engine_type": "LOCAL_DSP_ANALYZER",
          "framework": "dsp_numpy",
          "device": "cpu",
          "available": true,
          "status": "FALLBACK_DSP",
          "description": "Liveness and loudspeaker replay attack detection engine."
        },
        "speaker_verification": {
          "model_name": "VoxShield-SpeakerCosineSimilarity",
          "version": "cosine-v2.5",
          "engine_type": "LOCAL_DSP_ANALYZER",
          "framework": "dsp_numpy",
          "device": "cpu",
          "available": true,
          "status": "LOADED",
          "description": "Speaker verification cosine similarity comparison engine."
        }
      },
      "components": {
        "deepfake_detector": {
          "available": true,
          "model_name": "VoxShield-AcousticClassifier-v2",
          "model_version": "dsp-spectral-v2.5",
          "device": "cpu",
          "engine_type": "LOCAL_DSP_ANALYZER"
        },
        "speaker_embedding": {
          "available": true,
          "model_name": "VoxShield-SpeakerEmbedding-DSP",
          "model_version": "mfcc-projection-v2.5",
          "device": "cpu",
          "engine_type": "LOCAL_DSP_ANALYZER"
        },
        "speaker_comparison": {
          "available": true,
          "model_name": "VoxShield-SpeakerCosineSimilarity",
          "model_version": "cosine-v2.5",
          "device": "cpu",
          "engine_type": "LOCAL_DSP_ANALYZER"
        },
        "liveness_detector": {
          "available": true,
          "model_name": "VoxShield-AcousticLiveness-DSP",
          "model_version": "impulse-decay-v2.5",
          "device": "cpu",
          "engine_type": "LOCAL_DSP_ANALYZER"
        },
        "threat_fusion": {
          "available": true,
          "model_name": "VoxShield-ThreatFusion-v2",
          "model_version": "fusion-v2.5",
          "device": "cpu",
          "engine_type": "LOCAL_DSP_ANALYZER"
        }
      },
      "privacy_policy": {
        "zero_server_audio": "Strictly Enforced: Voice streams are analyzed client-side; raw audio is never stored or transmitted to server.",
        "biometric_protection": "Voice embeddings are treated as high-security biometric credentials and never returned via public APIs.",
        "provenance_transparency": "Engine types are truthfully declared as REAL_PRETRAINED_MODEL, LOCAL_DSP_ANALYZER, or MOCK_DEMO_MODEL."
      }
    },
    "request_id": "c7a8b9e0-1234-5678-9abc-def012345678"
  }
  ```

