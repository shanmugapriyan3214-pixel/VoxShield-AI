# VoxShield AI — Frontend-to-Backend Integration Contract & API Specification

**Document Version:** 3.0.0  
**Backend API Version:** v1 (`/api/v1`)  
**Status:** Canonical & Audited  
**Zero-Server-Audio Invariant:** Enforced (Zero bytes of live call audio transferred to backend)  

---

## 1. Global Architectural Conventions

### 1.1 Base URL & Environment Configuration
- **Development HTTP Base URL:** `http://127.0.0.1:8000/api/v1`
- **Development WebSocket Base URL:** `ws://127.0.0.1:8000/api/v1`
- **Environment Variable:** `VITE_API_BASE_URL`

### 1.2 Standardized Response Envelope
All HTTP endpoints return the unified `ApiResponse[T]` envelope:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
  request_id: string;
}

interface ApiError {
  code: string;
  message: string;
  details: Array<{ field?: string; message: string }>;
}
```

### 1.3 Authentication & Session Management
- **Scheme:** `Authorization: Bearer <access_token>`
- **Access Token:** Short-lived JWT (15 minutes). Never stored in localStorage; kept in secure memory or secure cookie.
- **Refresh Token:** Stored securely. Single-use with automated family rotation (`POST /auth/refresh`).
- **WebSocket Auth:** Query param token validation (`/ws/signaling/{call_id}?token=<access_token>`).

---

## 2. API Contract Specification by Subsystem

### 2.1 Authentication (`/api/v1/auth`)

| Endpoint | Method | Auth | Request Payload | Success Response (`data`) | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/auth/register` | `POST` | None | `{ email, username, display_name, password }` | `{ user: UserPrivate, tokens: TokenPair }` | Create new user account |
| `/auth/login` | `POST` | None | `{ email, password }` | `{ user: UserPrivate, tokens: TokenPair }` | Authenticate and obtain JWTs |
| `/auth/refresh` | `POST` | None | `{ refresh_token }` | `{ user: UserPrivate, tokens: TokenPair }` | Rotate refresh token |
| `/auth/logout` | `POST` | Bearer | `{ refresh_token }` | `{ message: string }` | Invalidate active refresh token |
| `/auth/me` | `GET` | Bearer | None | `UserPrivate` | Get authenticated user info |
| `/auth/change-password`| `POST`| Bearer | `{ current_password, new_password }` | `{ message: string }` | Rotate password & revoke tokens |

### 2.2 User Profiles (`/api/v1/users`)

| Endpoint | Method | Auth | Request Payload | Success Response (`data`) | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/users/me` | `GET` | Bearer | None | `UserPrivate` | Detailed profile of current user |
| `/users/me` | `PATCH` | Bearer | `{ display_name?, avatar_url? }` | `UserPrivate` | Update current user profile |
| `/users/{user_id}` | `GET` | Bearer | None | `UserPublic` | Safe public profile (no email/phone) |

### 2.3 Calls & WebRTC Lifecycle (`/api/v1/calls`)

| Endpoint | Method | Auth | Request Payload | Success Response (`data`) | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/calls` | `POST` | Bearer | `{ receiver_id }` | `CallResponse` | Initiate call (`RINGING` state) |
| `/calls` | `GET` | Bearer | Query: `limit`, `offset` | `List[CallResponse]` | List user call history |
| `/calls/{call_id}` | `GET` | Bearer | None | `CallResponse` | Get status of specific call |
| `/calls/{call_id}/accept`| `POST` | Bearer | None | `CallResponse` | Transition call to `ACTIVE` |
| `/calls/{call_id}/reject`| `POST` | Bearer | None | `CallResponse` | Transition call to `REJECTED` |
| `/calls/{call_id}/end` | `POST` | Bearer | None | `CallResponse` | Terminate call (`COMPLETED`) |

### 2.4 Real-Time Security Telemetry (`/api/v1/calls/{call_id}/...`)

| Endpoint | Method | Auth | Request Payload | Success Response (`data`) | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/{call_id}/security-analysis` | `POST` | Bearer | `SecurityTelemetryReportRequest` | `SecurityTelemetryResponse` | Submit edge sliding-window metrics |
| `/{call_id}/security-events` | `POST` | Bearer | `CallSecurityEventCreate` | `CallSecurityEventResponse` | Ingest discrete threat event |
| `/{call_id}/security-events` | `GET` | Bearer | None | `List[CallSecurityEventResponse]` | Retrieve timeline of call events |

#### Security Telemetry Request Schema (`SecurityTelemetryReportRequest`):
```typescript
interface SecurityTelemetryReportRequest {
  ai_generated_probability: number;      // 0.0 to 1.0 (from local deepfake model)
  speaker_match_probability?: number;    // 0.0 to 1.0 (from local speaker comparison)
  liveness_probability?: number;         // 0.0 to 1.0 (from local liveness detector)
  window_duration_ms: number;            // Default: 1500
  window_index?: number;                 // Monotonic sequence ID
  client_timestamp_ms?: number;          // Epoch timestamp
  detected_artifacts?: string[];         // e.g. ["vocoder_phase_discontinuity"]
}
```

#### Security Telemetry Response Schema (`SecurityTelemetryResponse`):
```typescript
interface SecurityTelemetryResponse {
  threat_score: number;                  // 0.0 to 100.0
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  recommended_action: "CONTINUE_NORMAL" | "DISPLAY_ADVISORY" | "REQUIRE_VERIFICATION" | "RECOMMEND_TERMINATION";
  recommendation: string;                // User-facing guidance
  indicators: string[];                  // Triggered threat heuristics
  call_terminated: boolean;              // Forced severance flag
  event_id?: string;
  timestamp: string;
}
```

### 2.5 Verification Challenges (`/api/v1/calls/{call_id}/challenge`)

| Endpoint | Method | Auth | Request Payload | Success Response (`data`) | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/{call_id}/challenge` | `POST` | Bearer | `{ target_user_id?, timeout_seconds? }` | `ChallengeResponse` | Issue acoustic passphrase challenge |
| `/{call_id}/challenge` | `GET` | Bearer | None | `ChallengeResponse \| null` | Get active challenge for call |
| `/{call_id}/challenge/verify`| `POST` | Bearer | `{ challenge_id, spoken_phrase, liveness_score? }` | `ChallengeVerificationResponse` | Verify spoken phrase response |

### 2.6 WebRTC WebSocket Signaling (`/api/v1/ws/signaling/{call_id}`)
- **Protocol:** `wss://` (or `ws://` in local development)
- **Authentication:** `?token=<access_token>` query parameter
- **Access Rule:** User MUST be either `caller_id` or `receiver_id` of `call_id`.

#### Signaling Frame Contract:
```typescript
type SignalingMessage =
  | { type: "ping" }
  | { type: "pong" }
  | { type: "offer"; payload: { sdp: string } }
  | { type: "answer"; payload: { sdp: string } }
  | { type: "ice_candidate"; payload: RTCIceCandidateInit }
  | { type: "peer_connected"; call_id: string; user_id: string }
  | { type: "peer_disconnected"; call_id: string; user_id: string }
  | { type: "peer_status"; status: "WAITING_FOR_PEER" | "CONNECTED"; message?: string }
  | { type: "call_ended"; call_id?: string };
```

### 2.7 Threat Intelligence & History (`/api/v1/threats`)

| Endpoint | Method | Auth | Query Parameters | Success Response (`data`) | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/threats` | `GET` | Bearer | `severity?`, `call_id?`, `limit`, `offset` | `List[ThreatEventResponse]` | History of detected threats |
| `/threats/summary` | `GET` | Bearer | None | `ThreatSummaryResponse` | Aggregated threat counts by severity |
| `/threats/timeline`| `GET` | Bearer | `days` (default 7) | `ThreatTimelineResponse` | Daily time-series threat metrics |
| `/threats/{threat_id}` | `GET` | Bearer | None | `ThreatEventResponse` | Specific threat record |

### 2.8 Incidents & Blockchain Evidence (`/api/v1/incidents`)

| Endpoint | Method | Auth | Request Payload | Success Response (`data`) | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/incidents` | `POST` | Bearer | `IncidentCreate` | `IncidentResponse` | Create tamper-evident incident |
| `/incidents` | `GET` | Bearer | `limit`, `offset` | `List[IncidentResponse]` | List user's incidents |
| `/incidents/{id}` | `GET` | Bearer | None | `IncidentResponse` | Detailed incident record |
| `/incidents/{id}` | `PATCH` | Bearer | `IncidentUpdate` | `IncidentResponse` | Update incident status/summary |
| `/incidents/{id}` | `DELETE`| Bearer | None | `{ message: string }` | Delete incident |
| `/incidents/{id}/anchor` | `POST` | Bearer | None | `BlockchainReceipt` | Anchor canonical hash to blockchain |
| `/incidents/{id}/verification`| `GET` | Bearer | None | `BlockchainVerificationResult` | Cryptographically verify proof |

### 2.9 Voice Profiles & Trusted Contacts (`/api/v1/voices` & `/trusted-voices`)

| Endpoint | Method | Auth | Request Payload | Success Response (`data`) | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/voices` | `POST` | Bearer | `{ label }` | `VoiceProfileResponse` | Register user voice profile metadata |
| `/voices` | `GET` | Bearer | None | `List[VoiceProfileResponse]` | List registered voice profiles |
| `/voices/{id}` | `DELETE`| Bearer | None | `{ message: string }` | Delete voice profile |
| `/trusted-voices` | `POST` | Bearer | `{ display_name, relationship, claimed_caller_id?, notes? }` | `TrustedVoiceResponse` | Register trusted contact |
| `/trusted-voices` | `GET` | Bearer | None | `List[TrustedVoiceResponse]` | List trusted contacts |
| `/trusted-voices/{id}` | `DELETE`| Bearer | None | `{ message: string }` | Delete trusted contact |

**Strict Biometric Privacy:** Public API endpoints never receive or return raw speaker embedding vectors. All responses contain only safe metadata (`id`, `label`, `is_active`, `created_at`).

### 2.10 AI Subsystem Status & Transparency (`/api/v1/ai/status`)

- **Method & Path:** `GET /api/v1/ai/status`
- **Auth:** Public or Bearer
- **Response (`data`):**
```typescript
interface AIStatusResponse {
  status: "OPERATIONAL" | "DEGRADED" | "OFFLINE";
  mode: "local" | "mock";
  fallback_mode: "dsp" | "mock" | "none";
  device: "cpu" | "cuda";
  streaming_window: {
    window_duration_sec: number;
    hop_duration_sec: number;
    sample_rate: number;
  };
  models: Record<string, ModelMetadata>;
  components: Record<string, ComponentStatus>;
  privacy_policy: Record<string, string>;
}
```

---

## 3. Zero-Server-Audio Privacy Invariant

The client application must strictly observe:
1. **Live call audio NEVER enters HTTP request bodies.**
2. **Audio is transported exclusively over WebRTC (DTLS-SRTP P2P).**
3. **Telemetry submitted via `/calls/{id}/security-analysis` must contain only numeric probabilities and string artifact identifiers.**
