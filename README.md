# VoxShield AI

> **AI-Powered Real-Time Detection and Prevention of Voice Cloning Impersonation Attacks**

[![Python 3.12+](https://img.shields.io/badge/Python-3.12%2B%20%7C%203.13-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688.svg)](https://fastapi.tiangolo.com)
[![React 18](https://img.shields.io/badge/React-18.3-61DAFB.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6.svg)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF.svg)](https://vitejs.dev)
[![Backend Tests](https://img.shields.io/badge/Backend%20Pytest-107%2F107%20Passed-brightgreen.svg)]()
[![Frontend Tests](https://img.shields.io/badge/Frontend%20Vitest-34%2F34%20Passed-brightgreen.svg)]()
[![Concurrency Benchmark](https://img.shields.io/badge/Stress%20Benchmark-560%20Reqs%20%7C%200%20Errors-brightgreen.svg)]()
[![Zero Audio Invariant](https://img.shields.io/badge/Zero--Server--Audio-0%20Bytes%20Uploaded-brightgreen.svg)]()

---

## 1. Overview
**VoxShield AI** is a real-time cybersecurity platform engineered to protect individuals, executives, and organizations from synthetic speech attacks, deepfake voice cloning, and social engineering impersonation.

### Key Capabilities:
- **Zero-Server-Audio Privacy Core**: Raw voice media is strictly peer-to-peer and encrypted with **DTLS-SRTP**. The server **NEVER** intercepts, stores, or processes real-time voice call audio. Verified via `ZeroAudioCallGuardMiddleware` (HTTP 415 on audio upload attempts).
- **Hardened Security & Concurrency Layer (Phase 6)**: Granular route-family sliding-window rate limiters, strict participant IDOR authorization, input validation rejecting `NaN`/`Infinity`, WebSocket 64KB/30msg/s bounds, model SHA-256 manifest verification, and 3-attempt acoustic challenge lockouts.
- **Client-Side AI Inference & Streaming Telemetry**: Edge sliding-window analyzer (1.5-second windows) computes synthetic probability, speaker match, and liveness locally. Clients transmit compact JSON telemetry (`POST /calls/{id}/security-analysis`).
- **Controlled Voice-Cloning Attack Simulation**: Complete interactive attack controller supporting 4 scenarios (`Normal Call`, `Replay Attack`, `Synthetic Spoof`, and `Simulated Critical`), real neural model execution, automatic incident creation, and in-memory cryptographic tamper verification.
- **Real Pretrained ML Adapters & ONNX Runtime**: Native execution adapters for state-of-the-art neural architectures including **AASIST-L / RawNet2** (speech deepfake anti-spoofing) and **ECAPA-TDNN** (speaker verification).
- **Truth-in-Engineering AI Provenance**: Strict classification taxonomy distinguishing `REAL_PRETRAINED_MODEL`, `LOCAL_DSP_ANALYZER`, and `SIMULATED_ATTACK_TELEMETRY`. DSP heuristics and simulated telemetry are never falsely labeled as neural models. (See [AI Model Audit](docs/AI_MODEL_AUDIT.md)).
- **Central Model Registry**: Live tracking of models, versions, engine types, devices, and moving-average inference benchmark timings exposed via `GET /api/v1/ai/status`.
- **Acoustic Feature Extraction Engine**: Pure Python/NumPy DSP pipeline extracting 64-channel Log-Mel spectrograms, 13/24 MFCCs, spectral centroid, spectral flatness, spectral rolloff, zero-crossing rate, and RMS energy.
- **Speaker Verification & Biometric Protection**: 192-dimensional unit-sphere normalized speaker embeddings with cosine similarity comparison. Raw biometric vectors are strictly protected and never exposed publicly.
- **Acoustic Liveness & Replay Detection**: Real acoustic impulse response and spectral dynamics analysis distinguishing live human vocalizations from loudspeaker re-recording and zero-shot neural vocoder synthesis.
- **Multi-Signal Threat Fusion**: 0–100 threat score engine fusing AI probability (0.50), speaker mismatch (0.35), and liveness failure (0.15) with progressive mitigations (`CONTINUE_NORMAL`, `DISPLAY_ADVISORY`, `REQUIRE_VERIFICATION`, `RECOMMEND_TERMINATION`).
- **Dynamic Acoustic Passphrase Challenges**: Real-time challenge-response protocol with threat mitigation bonuses for identity verification.
- **Canonical Incident Ledger & Blockchain Anchoring**: Automated generation of `RFC 8785` canonical incident records, SHA-256 evidence digests, and immutable distributed ledger anchoring (Mock or EVM-compatible networks).
- **WebRTC Signaling Gateway**: Ephemeral WebSocket relay for SDP offer/answer and ICE candidate negotiation.


---

## 2. Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Backend Framework** | [FastAPI](https://fastapi.tiangolo.com) (Python 3.12 / 3.13) |
| **Validation & Schema** | [Pydantic v2](https://docs.pydantic.dev) & Pydantic Settings |
| **ORM & Persistence** | [SQLAlchemy 2.0](https://www.sqlalchemy.org) (Async engine) |
| **Database Migrations** | [Alembic](https://alembic.sqlalchemy.org) |
| **Production Database** | [PostgreSQL 16](https://www.postgresql.org) (with seamless SQLite fallback) |
| **Caching & Pub/Sub** | [Redis 7](https://redis.io) |
| **Passwords & Cryptography**| [Argon2id](https://www.rfc-editor.org/rfc/rfc9106) (RFC 9106) & [PyJWT](https://pyjwt.readthedocs.io) |
| **Signaling Protocol** | Asynchronous WebSockets (`wss://`) |
| **Containerization** | Docker & Docker Compose |
| **Automated Testing** | [Pytest](https://docs.pytest.org) & [HTTPX](https://www.python-httpx.org) (Async) |

---

## 3. Project Structure

```
voxshield-ai/
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI app factory & lifespan
│   │   ├── api/
│   │   │   ├── deps.py                 # Dependency injection (DB, auth, user)
│   │   │   └── v1/
│   │   │       ├── auth.py             # Register, login, refresh, logout, password
│   │   │       ├── users.py            # User profile management
│   │   │       ├── voices.py           # Voice profile metadata operations
│   │   │       ├── trusted_voices.py   # Trusted contact registry
│   │   │       ├── analysis.py         # Offline audio file analysis & comparison
│   │   │       ├── calls.py            # Call lifecycle & security event ingestion
│   │   │       ├── signaling.py        # WebRTC WebSocket signaling relay
│   │   │       ├── threats.py          # Threat history, summaries, and timeline
│   │   │       ├── incidents.py        # Incident reports & blockchain verification
│   │   │       └── health.py           # Multi-component readiness probe
│   │   ├── core/
│   │   │   ├── config.py               # Pydantic Settings from environment
│   │   │   ├── security.py             # Argon2id hasher & JWT tokens
│   │   │   ├── logging.py              # Structured JSON logger & request tracing
│   │   │   ├── middleware.py           # Request ID, Security Headers, Rate Limiter
│   │   │   └── exceptions.py           # Unified error envelope & global handlers
│   │   ├── db/
│   │   │   ├── session.py              # Async SQLAlchemy engine & sessionmaker
│   │   │   ├── base.py                 # DeclarativeBase, UUIDs, Timestamp mixins
│   │   │   └── models/                 # 10 SQLAlchemy 2.0 ORM models
│   │   ├── schemas/                    # Pydantic validation & response models
│   │   ├── services/                   # Business logic layer
│   │   ├── ai/                         # Pluggable AI architecture
│   │   │   ├── interfaces/             # Detector, Embedding, Comparison, Liveness ABCs
│   │   │   ├── adapters/               # Mock adapters with realistic distributions
│   │   │   ├── threat_engine.py        # Multi-signal 0-100 scoring algorithm
│   │   │   └── pipeline.py             # Unified analysis pipeline
│   │   ├── webrtc/                     # WebRTC signaling
│   │   │   ├── session_manager.py      # Connection registry & message router
│   │   │   └── models.py               # Signaling message schema
│   │   ├── blockchain/                 # Blockchain evidence anchoring
│   │   │   ├── interface.py            # Abstract BlockchainAdapter
│   │   │   ├── mock.py                 # Simulated EVM adapter
│   │   │   └── evm.py                  # Live Web3/EVM adapter
│   │   └── utils/
│   ├── alembic/                        # Migration scripts
│   ├── tests/                          # Automated Pytest suite (38 tests)
│   ├── requirements.txt                # Dependencies
│   ├── Dockerfile                      # Multi-stage container image
│   └── .env.example                    # Environment template
├── docs/                               # Formal architectural documentation
│   ├── ARCHITECTURE.md
│   ├── API_SPECIFICATION.md
│   ├── DATABASE_DESIGN.md
│   ├── SECURITY_MODEL.md
│   ├── AI_PIPELINE.md
│   ├── WEBRTC_DESIGN.md
│   ├── BLOCKCHAIN_DESIGN.md
│   ├── IMPLEMENTATION_ROADMAP.md
│   ├── API_EXAMPLES.md
│   └── FRONTEND_INTEGRATION.md
├── docker-compose.yml                  # Backend + PostgreSQL + Redis
└── README.md                           # Master documentation
```

---

## 4. Quickstart: Running Locally

### 4.1 Prerequisites
- Python 3.12 or 3.13 installed
- Git

### 4.2 Clone and Setup Environment
```bash
# Clone the repository
cd voiceREG

# Create and activate virtual environment
python -m venv .venv
# On Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# On macOS / Linux:
source .venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt
```

### 4.3 Configure Environment Variables
```bash
cp backend/.env.example backend/.env
```
*(By default, `DATABASE_URL` is set to SQLite for zero-configuration instant local runs. In production, switch to PostgreSQL).*

### 4.4 Run Database Migrations
```bash
cd backend
alembic upgrade head
```

### 4.5 Start the Backend Server
```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
The server will start at `http://127.0.0.1:8000`.

---

## 5. Running with Docker Compose

To start the entire production-like cluster (FastAPI Backend + PostgreSQL 16 + Redis 7):

```bash
docker compose up --build
```
- API Base URL: `http://localhost:8000/api/v1`
- Swagger UI Documentation: `http://localhost:8000/docs`
- ReDoc Documentation: `http://localhost:8000/redoc`
- Health Check: `http://localhost:8000/health`

---

## 6. Running Automated Tests

VoxShield AI includes an automated Pytest suite covering authentication, token rotation, user profiles, voice profiles, trusted voices, offline analysis, voice comparison, call lifecycles, real-time WebRTC signaling, threat scoring, and blockchain verification.

Run tests:
```bash
cd backend
python -m pytest tests -v
```

Output:
```
======================= 38 passed, 4 warnings in 5.27s ========================
```

---

## 7. Interactive API Documentation

Once started, explore the complete interactive OpenAPI schema at:
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **OpenAPI JSON**: [http://localhost:8000/api/v1/openapi.json](http://localhost:8000/api/v1/openapi.json)

---

## 8. Core API Endpoint Inventory

| Category | Method | Endpoint | Description |
| :--- | :---: | :--- | :--- |
| **Auth** | `POST` | `/api/v1/auth/register` | Register new user account |
| **Auth** | `POST` | `/api/v1/auth/login` | Authenticate & obtain JWT tokens |
| **Auth** | `POST` | `/api/v1/auth/refresh` | Single-use refresh token rotation |
| **Auth** | `POST` | `/api/v1/auth/logout` | Revoke active refresh token |
| **Auth** | `GET` | `/api/v1/auth/me` | Current authenticated user |
| **Auth** | `POST` | `/api/v1/auth/change-password` | Update password & invalidate sessions |
| **Users** | `GET` | `/api/v1/users/me` | Authenticated user profile |
| **Users** | `PATCH` | `/api/v1/users/me` | Update display name or avatar |
| **Users** | `GET` | `/api/v1/users/{id}` | Public safe profile (redacted) |
| **Voices** | `POST` | `/api/v1/voices` | Create voice profile metadata |
| **Voices** | `GET` | `/api/v1/voices` | List user voice profiles |
| **Voices** | `GET` | `/api/v1/voices/{id}` | Get profile metadata (No raw audio/embeddings) |
| **Voices** | `PATCH` | `/api/v1/voices/{id}` | Update profile status or label |
| **Voices** | `DELETE` | `/api/v1/voices/{id}` | Delete voice profile |
| **Trusted** | `POST` | `/api/v1/trusted-voices` | Register trusted contact |
| **Trusted** | `GET` | `/api/v1/trusted-voices` | List trusted contacts |
| **Trusted** | `GET` | `/api/v1/trusted-voices/{id}` | Get contact details |
| **Trusted** | `PATCH` | `/api/v1/trusted-voices/{id}` | Update relationship or status |
| **Trusted** | `DELETE`| `/api/v1/trusted-voices/{id}` | Remove trusted contact |
| **Analysis**| `POST` | `/api/v1/analysis/audio` | Optional offline audio deepfake analysis |
| **Analysis**| `GET` | `/api/v1/analysis/{id}` | Get prior audio analysis result |
| **Analysis**| `POST` | `/api/v1/analysis/compare` | Compare reference vs. suspect representations |
| **Calls** | `POST` | `/api/v1/calls` | Initiate call session (`RINGING`) |
| **Calls** | `GET` | `/api/v1/calls` | List past and active calls |
| **Calls** | `GET` | `/api/v1/calls/{id}` | Get call details |
| **Calls** | `POST` | `/api/v1/calls/{id}/accept` | Accept incoming call |
| **Calls** | `POST` | `/api/v1/calls/{id}/reject` | Reject incoming call |
| **Calls** | `POST` | `/api/v1/calls/{id}/end` | Terminate active call |
| **Calls** | `POST` | `/api/v1/calls/{id}/security-events` | Ingest real-time client detection alert |
| **Calls** | `GET` | `/api/v1/calls/{id}/security-events` | List in-call security alerts |
| **Signaling**| `WS` | `/api/v1/ws/signaling/{call_id}` | Authenticated WebRTC signaling relay |
| **Threats** | `GET` | `/api/v1/threats` | Filter threat history by severity & type |
| **Threats** | `GET` | `/api/v1/threats/summary` | Aggregate threat metrics & severity stats |
| **Threats** | `GET` | `/api/v1/threats/timeline` | Daily time-series threat charting |
| **Threats** | `GET` | `/api/v1/threats/{id}` | Get specific threat event |
| **Incidents**| `POST` | `/api/v1/incidents` | Create tamper-evident incident report |
| **Incidents**| `GET` | `/api/v1/incidents` | List user incidents |
| **Incidents**| `GET` | `/api/v1/incidents/{id}` | Get incident report with canonical hash |
| **Incidents**| `POST` | `/api/v1/incidents/{id}/anchor` | Anchor canonical hash to blockchain |
| **Incidents**| `GET` | `/api/v1/incidents/{id}/verification`| Verify evidence against on-chain proof |
| **Demo**     | `GET` | `/api/v1/demo/scenarios` | List controlled attack simulation scenarios |
| **Demo**     | `POST`| `/api/v1/demo/execute` | Execute attack simulation step / challenge failure |
| **Demo**     | `POST`| `/api/v1/demo/tamper-test` | Run in-memory cryptographic tamper verification |
| **Demo**     | `POST`| `/api/v1/demo/reset` | Reset demo state and telemetry |
| **Health** | `GET` | `/health` | Basic liveness probe |
| **Health** | `GET` | `/api/v1/health` | Deep multi-component readiness probe |

---

## 9. Security & Cryptographic Boundaries

1. **Argon2id Password Hashing**: Conforms to RFC 9106 ($m=64\text{MB}, t=3, p=4$).
2. **JWT Security & Token Rotation**: 15-minute access tokens. 7-day refresh tokens stored as SHA-256 hashes. If an already-rotated refresh token is presented, the entire token family is immediately revoked to thwart token replay attacks.
3. **Data Protection at Rest**: Biometric vectors are encrypted with AES-256-GCM. Raw audio is never retained.
4. **Canonical Evidence Hashing**: Security incidents are deterministically formatted under `RFC 8785` (JSON Canonicalization Scheme) and hashed with `SHA-256`, producing tamper-evident cryptographic proofs.
5. **HTTP Defense**: Sliding-window rate limiting, `X-Request-ID` correlation, `nosniff`, `DENY` frames, and strict CORS controls.

---

## 10. Documentation Index

For detailed architectural specifications and client integration guides, refer to the `docs/` directory:
- [Phase 5: Attack Simulation & Live Demo](file:///docs/PHASE_5_ATTACK_SIMULATION.md)
- [Hackathon Demonstration & Evaluation Guide](file:///docs/DEMO_GUIDE.md)
- [System Architecture](file:///docs/ARCHITECTURE.md)
- [Frontend Architecture (Phase 3)](file:///docs/FRONTEND_ARCHITECTURE.md)
- [Frontend Privacy Audit (Zero-Server-Audio)](file:///docs/FRONTEND_PRIVACY_AUDIT.md)
- [WebRTC Architecture Specification](file:///docs/WEBRTC_ARCHITECTURE.md)
- [Frontend-Backend API Contract](file:///docs/FRONTEND_BACKEND_CONTRACT.md)
- [API Specification](file:///docs/API_SPECIFICATION.md)
- [Database Schema & ERD](file:///docs/DATABASE_DESIGN.md)
- [Security Model & Threat Vectors](file:///docs/SECURITY_MODEL.md)
- [AI Intelligence Pipeline & Threat Engine](file:///docs/AI_PIPELINE.md)
- [Blockchain Evidence & Ledger Anchoring](file:///docs/BLOCKCHAIN_DESIGN.md)
- [API Usage Examples (curl & JSON)](file:///docs/API_EXAMPLES.md)
