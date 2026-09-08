# VoxShield AI — System Architecture Specification

## 1. Executive Summary
**VoxShield AI** is an enterprise-grade cybersecurity and real-time voice verification platform designed to detect, analyze, and neutralize AI-powered voice cloning and impersonation attacks. The platform combines zero-server-audio privacy-preserving WebRTC voice communication, real-time edge/client AI threat detection, a centralized metadata and threat scoring engine, tamper-evident incident logging, and cryptographic blockchain anchoring.

---

## 2. Core Privacy Philosophy & Architectural Invariant

> [!IMPORTANT]
> **Zero-Server-Audio Invariant**: Raw, unencrypted voice call audio **NEVER** transits through or is stored on the VoxShield AI backend. Real-time deepfake analysis and speaker verification occur exclusively on client endpoints (edge devices). The backend functions strictly as an authenticated signaling broker, cryptographic identity validator, threat telemetry aggregator, and tamper-evident audit ledger.

### 2.1 The Privacy Boundary
```
+-----------------------------------------------------------------------------------+
|                                CLIENT A ENDPOINT                                  |
|  [Microphone]                                                                     |
|       │                                                                           |
|       ▼                                                                           |
|  [Audio Capture Buffer] ────────► [Local AI Engine] (ONNX / WebAssembly / CoreML)  |
|       │                                │                                          |
|       │ (P2P Audio)                    ├─ Deepfake Probability                    |
|       ▼                                ├─ Speaker Embedding Comparison            |
|  [DTLS-SRTP / Encoded Transforms]      └─ Liveness & Replay Analysis              |
|       │                                        │                                  |
|       │                                        ▼ (Telemetry Only: 0 KB Audio)     |
|       │                                 [Security Event Reporter]                 |
+───────┼────────────────────────────────────────┼──────────────────────────────────+
        │                                        │
        │ P2P Direct Media                       │ TLS REST / WebSocket Telemetry
        │ (Encrypted SRTP)                       ▼
        │                         +──────────────────────────────+
        │                         |      VOXSHIELD BACKEND       |
        │                         |                              |
        │                         | ├─ Auth & Key Exchange       |
        │                         | ├─ WebRTC Signaling Relay    |
        │                         | ├─ Threat Engine (0-100)     |
        │                         | ├─ Incident Repository       |
        │                         | └─ Blockchain Anchoring      |
        │                         +──────────────────────────────+
        │                                        ▲
        │                                        │ TLS Telemetry
        │                                        │
+───────┼────────────────────────────────────────┼──────────────────────────────────+
|       ▼                                        │                                  |
|  [DTLS-SRTP / Decryption] ──────► [Local AI Engine Client B]                      |
|       │                                                                           |
|       ▼                                                                           |
|  [Speaker Output]                                                                 |
|                                CLIENT B ENDPOINT                                  |
+-----------------------------------------------------------------------------------+
```

---

## 3. High-Level Component Topology

The system comprises five core architectural tiers:
1. **Client Edge Tier (Web/Mobile)**:
   - Captures local microphone stream.
   - Executes local real-time inference (frame-by-frame synthetic spectral cue detection, liveness phase coherence, speaker embedding cosine distance).
   - Manages WebRTC PeerConnection with mandatory DTLS-SRTP encryption and optional SFrame/Encoded Transform frames.
   - Emits lightweight telemetry (probabilities, anomaly triggers) to the backend.
2. **API & Signaling Gateway (FastAPI)**:
   - Exposes RESTful v1 APIs for Authentication, User Management, Voice Profile metadata, Trusted Voices, Incidents, and Health probes.
   - Manages bidirectional WebSocket connections for signaling (SDP Offer/Answer, ICE Candidate exchange) and real-time security alerts.
3. **Core Engine Tier**:
   - **Threat Scoring Engine**: Multi-factor scoring algorithm synthesizing AI probability, speaker verification, liveness, trusted contacts, and temporal anomaly spikes into a unified 0–100 threat score.
   - **Incident Management Service**: Standardizes security alerts into canonical incident records and computes cryptographic digests (`SHA-256`).
   - **Pluggable AI Service**: Provides abstract contracts and adapters for offline audio verification and speaker comparison.
4. **Data & State Tier**:
   - **PostgreSQL**: ACID-compliant persistent storage for users, call metadata, threat events, voice profile descriptors, and incident evidence.
   - **Redis**: Distributed pub/sub for multi-node WebSocket signaling relays, active call session state, and sliding-window rate limiting.
5. **Trust & Verification Tier (Blockchain)**:
   - EVM-compatible and mock ledger adapters that anchor canonical incident hashes onto public or private smart contracts, generating immutable cryptographic proofs.

---

## 4. Backend Module Architecture

```
app/
├── api/
│   ├── deps.py               # Dependency injection providers (Session, CurrentUser, RateLimiter)
│   └── v1/
│       ├── auth.py           # Registration, login, token refresh, password management
│       ├── users.py          # User profile operations
│       ├── voices.py         # Voice profile metadata operations
│       ├── trusted_voices.py # Trusted contacts & relationship verification
│       ├── analysis.py       # Offline audio analysis & speaker comparison
│       ├── calls.py          # Call session lifecycle management
│       ├── signaling.py      # Real-time WebRTC WebSocket signaling relay
│       ├── threats.py        # Threat events, aggregates, and analytics timeline
│       ├── incidents.py      # Incident reporting, canonical serialization, hashing
│       ├── blockchain.py     # On-chain proof anchoring and tamper verification
│       └── health.py         # Deep health check (Postgres, Redis, System)
├── core/
│   ├── config.py             # Strongly typed Pydantic BaseSettings
│   ├── security.py           # Argon2id password hashing, JWT HS256/RS256 validation
│   ├── logging.py            # Structured JSON logger with request correlation IDs
│   ├── middleware.py         # Request ID, Security Headers, CORS, Rate Limiting
│   └── exceptions.py         # Standardized error envelopes and global handlers
├── db/
│   ├── base.py               # DeclarativeBase, mixins (UUID, Timestamp, Audit)
│   ├── session.py            # Async engine session maker (PostgreSQL / SQLite fallback)
│   └── models/               # SQLAlchemy ORM entity definitions
├── schemas/                  # Pydantic validation models & standard ApiResponse envelopes
├── services/                 # Business logic implementation decoupled from HTTP
├── ai/                       # Pluggable AI contracts, mock adapters, and threat engine
├── webrtc/                   # WebSockets session management, SDP/ICE message schema
└── blockchain/               # Smart contract abstraction, EVM provider, mock adapter
```

---

## 5. Security & Cryptographic Boundaries

| Domain | Mechanism | Specification / Policy |
| :--- | :--- | :--- |
| **Passwords** | Argon2id | Memory: 64 MB, Iterations: 3, Parallelism: 4 |
| **Authentication** | JWT | Access: 15-min TTL, Refresh: 7-day TTL with hash rotation |
| **Call Media** | WebRTC DTLS-SRTP | AES-GCM-128 / AES-CTR-128; client-to-client direct |
| **Signaling** | WSS (WebSocket Secure) | Authenticated via JWT bearer token, ephemeral session routing |
| **Incident Integrity** | SHA-256 Hash | Canonical RFC 8785 JSON representation anchored to EVM contracts |
| **Biometric Privacy** | Embedding Descriptors | No raw audio on server; embeddings encrypted at rest |
