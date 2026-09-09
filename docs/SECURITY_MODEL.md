# VoxShield AI — Security Model & Threat Vector Analysis

## 1. Security Architecture Principles

### 1.1 The Principle of Zero Server Audio Trust
In conventional VoIP architectures, media relays or transcoding proxies inspect incoming Real-time Transport Protocol (RTP) packets. For VoxShield AI, this presents an unacceptable privacy and compliance risk.
- **Invariant**: The backend server is untrusted with respect to media payloads.
- **Transport**: WebRTC media is encrypted using **DTLS-SRTP** directly between endpoints.
- **Telemetry Only**: The backend receives only discrete, non-reconstructable mathematical indicators (e.g. classification probabilities, anomaly flag codes).

```text
DEVICE
│
├── Microphone
│
├── Local Audio Buffer
│
├── Deepfake Detector
│
├── Speaker Verification
│
├── Liveness Detection
│
└── Threat Fusion
│
│ SECURITY TELEMETRY ONLY
▼
VOXSHIELD BACKEND
│
├── Authentication
├── Threat Engine
├── Security Events
├── Incidents
└── Evidence Blockchain
```

### 1.2 Defense in Depth
Security controls are enforced across all layers:
1. **Network**: TLS 1.3 for all HTTP/WebSocket traffic; DTLS-SRTP for peer-to-peer media.
2. **Identity & Auth**: Argon2id password hashing, ephemeral JWTs, refresh token rotation with family revocation.
3. **Application**: Strict Pydantic input validation, SQL parameterization via SQLAlchemy ORM, rate limiting.
4. **Data at Rest**: Biometric embeddings encrypted with AES-256-GCM; sensitive tokens hashed with SHA-256.
5. **Auditability**: RFC 8785 canonical JSON serialization with SHA-256 digests anchored to distributed ledgers.

---

## 2. Threat Vector & Mitigation Matrix

| Threat Vector | Attack Scenario | VoxShield AI Mitigation |
| :--- | :--- | :--- |
| **Real-Time Voice Cloning** | Attacker uses a diffusion or zero-shot TTS model (e.g., ElevenLabs clone) to impersonate a family member. | Client-side real-time acoustic analysis detects high-frequency synthetic phase discontinuities and spectral roll-off anomalies, firing `AI_VOICE_DETECTED` within 800ms. |
| **Replay & Pre-Recorded Attacks** | Attacker plays genuine pre-recorded audio fragments of the victim. | Liveness detection checks room acoustic impulse response and phase variance; flags static acoustic background as `LIVENESS_FAILURE`. |
| **Caller ID Spoofing / Impersonation** | Attacker dials claiming to be a trusted contact. | Trusted Voices registry cross-references caller identity and compares speaker embeddings against the stored profile. High distance yields `SPEAKER_MISMATCH`. |
| **Server Compromise / Subpoena** | Attacker gains root access to the backend database. | No raw voice recordings exist on the server. Biometric embeddings are encrypted at rest. Call audio was never ingested. |
| **Tampering with Incident Evidence** | Malicious insider or attacker alters audit logs or incident reports to hide an attack. | Incidents are canonically serialized (`RFC 8785`), SHA-256 hashed, and anchored to an immutable blockchain ledger. Tampering causes instant hash mismatch. |
| **Token Theft & Replay** | Attacker intercepts a refresh token. | Refresh token rotation issues a new token pair on each use and invalidates the entire token family if a previously used token is reused. |
| **Brute Force & DoS** | Attacker spams `/auth/login` or calls endpoints. | Sliding-window rate limiting per IP and per account, with exponential backoff and failed login tracking. |

---

## 3. Cryptographic Specifications

### 3.1 Password Hashing (Argon2id)
- **Algorithm**: Argon2id (RFC 9106)
- **Memory Cost ($m$)**: 65,536 KiB (64 MiB)
- **Time Cost ($t$)**: 3 iterations
- **Parallelism ($p$)**: 4 threads
- **Salt**: 16 bytes cryptographically secure random bytes (`os.urandom(16)`)

### 3.2 Token Architecture
- **Access Tokens**:
  - Format: JWT (JSON Web Token), signed via HMAC-SHA256 (`HS256`) or RSA-SHA256 (`RS256`).
  - Claims: `sub` (user_id), `exp` (15 minutes), `iat`, `jti` (unique UUID), `type`: `"access"`.
- **Refresh Tokens**:
  - Format: Opaque high-entropy string (32 bytes urlsafe base64).
  - Storage: Only the SHA-256 hash is persisted in the database.
  - TTL: 7 days.
  - Rotation: Each refresh invocation invalidates the current token, issues a new child token, and maintains the `family_id`. If an invalidated token is presented, all active tokens for that `family_id` are immediately revoked.

### 3.3 Incident Integrity & Canonical Hashing
Incident records must have deterministic cryptographic digests regardless of JSON serialization discrepancies (key ordering, whitespace, numeric precision).
1. Normalize payload using **RFC 8785 (JSON Canonicalization Scheme - JCS)**:
   - Sort dictionary keys lexicographically by Unicode code point.
   - Eliminate non-significant whitespace.
   - Enforce IEEE 754 float representation standards.
2. Compute `SHA-256` of UTF-8 encoded canonical bytes.
3. Prepend `0x` to format as standard EVM `bytes32`.

---

## 4. Authorization & Ownership Policy

All data access is subject to strict resource ownership verification:
- **Users**: Users can only modify their own profile. Public profile views return strictly redacted fields (`id`, `username`, `display_name`, `avatar_url`).
- **Voice Profiles**: Only the profile owner can view metadata, update, or delete profiles. Raw vectors are never returned over HTTP.
- **Trusted Voices**: Contacts are private to the owning user.
- **Calls**: Call metadata and security events can only be accessed by the registered caller or receiver.
- **Incidents & Threat History**: Incidents belong to the user; administrative audit views require elevated role claims.

---

## 5. Network & HTTP Hardening
The API gateway enforces:
- `Content-Security-Policy`: `default-src 'none'; frame-ancestors 'none'`
- `X-Content-Type-Options`: `nosniff`
- `X-Frame-Options`: `DENY`
- `Strict-Transport-Security`: `max-age=31536000; includeSubDomains; preload`
- `X-Request-ID`: Injected for end-to-end distributed tracing across all logs and response headers.

---

## 6. Controlled Attack Simulation & Tamper-Evident Verification

### 6.1 Attack Simulation Without Threat Generation
To validate real-time voice defense capabilities safely without distributing weaponized voice-cloning technology, VoxShield AI uses a dual-track simulation architecture:
1. **Algorithmic Waveforms for Real Neural Models**:
   - In `NORMAL`, `REPLAY_ATTACK`, and `SYNTHETIC_SPOOF` scenarios, client/controller buffers feed algorithmic waveforms (harmonic tones, room impulse response convolutions, phase-jittered signals) directly into genuine ONNX sessions (`AASIST-L` and `ECAPA-TDNN`).
   - Evaluates genuine neural acoustic inference, vector norms, and DSP spectral features.
2. **Deterministic Attack Telemetry**:
   - The `SIMULATED_CRITICAL` scenario demonstrates high-volume telemetry escalation, automated incident logging, and cryptographic anchoring without requiring synthetic voice audio.

### 6.2 In-Memory Cryptographic Tamper Demonstration
When an incident is created, an RFC 8785 canonical hash is computed and anchored to the distributed ledger. Operators can trigger an in-memory tampering test (`POST /api/v1/demo/tamper-test`):
1. An incident field (e.g. `threat_score`, `severity`) is mutated in memory.
2. The mutated payload is canonicalized via JCS (RFC 8785) and re-hashed.
3. The forged hash is compared against the immutable on-chain record.
4. If $H(\text{original}) \neq H(\text{tampered})$, the platform raises an immediate `TAMPER DETECTED — EVIDENCE MISMATCH` alert.

---

## 7. Phase 6 Security Controls & Defense-in-Depth Hardening

### 7.1 Zero-Server-Audio HTTP Guard
Mounted at the outermost middleware boundary (`ZeroAudioCallGuardMiddleware`), this guard halts any attempt to POST `audio/*`, `multipart/form-data`, or binary octet streams to `/api/v1/calls/*` or `/api/v1/ws/signaling/*` with `HTTP 415 AUDIO_UPLOAD_FORBIDDEN_PRIVACY_INVARIANT`, ensuring 0 bytes of audio reach internal handlers.

### 7.2 Granular Sliding-Window Rate Limiting
Route-family token buckets prevent brute-force attacks while accommodating real-time call telemetry:
- **Authentication**: 30 req/min
- **Challenge Verification**: 20 req/min (supports `X-Forwarded-For` client isolation)
- **Incident Reporting**: 30 req/min
- **Attack Simulation Demo**: 60 req/min
- **Telemetry Ingestion**: 120 req/min
- **Health & Static Specs**: Exempt

### 7.3 Authorization & IDOR Mitigations
- Calls verify participant membership: Only the caller or callee can view, accept, reject, or terminate sessions.
- Incidents verify call participation: Incident creation referencing a `call_id` requires the reporter to be an authorized party in that call session (`PermissionDeniedException` on cross-tenant attempts).

### 7.4 Input Sanitization & NaN/Infinity Rejection
- All telemetry and security event schemas reject IEEE 754 `NaN` and `Infinity` inputs via Pydantic validators.
- Window durations are bound between 100ms and 10,000ms; telemetry list arrays are capped at 50 elements.
- ThreatFusionEngine explicitly validates and sanitizes input floats before mathematical weighting.

### 7.5 WebSocket Signaling Hardening
- Max frame size: 64 KB (`WS_MAX_MESSAGE_BYTES`).
- Message rate limit: 30 messages/second per connection.
- Message whitelist: Only approved signaling verbs (`offer`, `answer`, `ice-candidate`, `ping`, `pong`, `ready`, `bye`, `renegotiate`) are relayed.
- Audio guard: Connections transmitting binary audio frames are immediately terminated with policy violation code 1008.

### 7.6 Pretrained Model Integrity & Provenance Verification
- On startup, `verify_model_integrity()` computes the SHA-256 digest of loaded ONNX files and compares against `backend/models/weights/MANIFEST.json`.
- Files with hash mismatches are flagged as `CHECKSUM_MISMATCH` and refused execution.
- DSP liveness detection is explicitly attributed to digital signal processing without neural over-claiming.

