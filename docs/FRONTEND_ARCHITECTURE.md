# VoxShield AI — Frontend Architecture Specification

## 1. Executive Architecture Overview

VoxShield AI's frontend is a high-performance, dark-mode cybersecurity dashboard and real-time voice communication terminal built with **React 18**, **TypeScript 5.6**, **Vite 6**, and **Tailwind CSS**.

The frontend is architected around two core security tenets:
1. **Zero-Server-Audio Invariant**: Call audio flows directly between peer browsers over encrypted WebRTC (DTLS-SRTP). Zero bytes of raw audio waveform or biometric speech buffers are ever transmitted to or stored on the backend server.
2. **Deterministic Telemetry & Verification**: Client-side sliding-window acoustic feature extractors compute statistical probabilities locally and transmit compact mathematical vectors (`ai_probability`, `speaker_match_score`, `liveness_score`, `detected_artifacts`) to the FastAPI security engine.

---

## 2. Directory Structure & Organization

```
frontend/
├── index.html                   # HTML entry point with Inter & JetBrains Mono fonts
├── vite.config.ts               # Vite bundler config with backend proxy (/api)
├── tailwind.config.js           # Custom cybersecurity dark palette (Obsidian, Cyan, Crimson)
├── tsconfig.json                # Strict TypeScript configuration
├── package.json                 # Dependencies & build scripts (Vite, Vitest, React Router)
└── src/
    ├── main.tsx                 # Application root mounting AuthProvider & ToastProvider
    ├── App.tsx                  # Declarative client-side route matrix
    ├── index.css                # Global CSS directives, glow classes, animations
    ├── api/
    │   └── client.ts            # Central HTTP client with JWT injection & 401 refresh rotation
    ├── context/
    │   └── AuthContext.tsx      # Persistent user session, tokens, login/register/logout
    ├── types/
    │   ├── api.ts               # Generic ApiResponse<T>, ApiError, Pagination
    │   ├── auth.ts              # UserPrivate, TokenPair, AuthResponseData
    │   ├── call.ts              # CallResponse, SecurityTelemetry, Challenges
    │   ├── threat.ts            # ThreatEventResponse, ThreatSummary, Timeline
    │   ├── incident.ts          # IncidentResponse, BlockchainReceipt, VerificationResult
    │   ├── voice.ts             # VoiceProfileResponse, TrustedVoiceResponse
    │   └── ai.ts                # AIStatusResponse, ModelMetadata, ComponentStatus
    ├── webrtc/
    │   └── peerConnection.ts    # Native WebRTC RTCPeerConnection & DTLS-SRTP manager
    ├── websocket/
    │   └── signaling.ts         # WebSocket client with heartbeat ping/pong & reconnection
    ├── security/
    │   └── streamAnalyzer.ts    # Sliding-window acoustic telemetry generator & demo scenarios
    ├── components/
    │   ├── common/
    │   │   ├── ProtectedRoute.tsx # Auth route guard with session bootstrap spinner
    │   │   └── Toast.tsx          # Non-intrusive threat alert notification provider
    │   ├── layout/
    │   │   ├── AppLayout.tsx      # Master dashboard shell with responsive navigation
    │   │   ├── Navbar.tsx         # Status badges, privacy invariant modal, user profile
    │   │   └── Sidebar.tsx        # Navigation menu with threat badges and live status
    │   └── security/
    │       ├── ThreatShield.tsx   # Dynamic shield indicator (0-100 threat score)
    │       ├── AcousticMeters.tsx # Triple forensic gauges (AI Prob, Speaker Match, Liveness)
    │       └── DemoBanner.tsx     # Prominent evaluator / sandbox guide
    ├── pages/
    │   ├── Login.tsx            # Operator login with credentials validation
    │   ├── Register.tsx         # Secure account creation
    │   ├── Dashboard.tsx        # Executive threat posture, recent calls, quick actions
    │   ├── Calls.tsx            # Call history and initiate encrypted call modal
    │   ├── CallScreen.tsx       # Live call cockpit: WebRTC audio, telemetry, challenge modal
    │   ├── VoiceProfile.tsx     # Voice enrollment metadata (NO raw embeddings)
    │   ├── TrustedVoices.tsx    # Trusted caller network & verification targets
    │   ├── SecurityEvents.tsx   # Filterable audit log of historical threat events
    │   ├── Incidents.tsx        # Tamper-evident incident registry
    │   ├── IncidentDetail.tsx   # RFC 8785 canonical hash & on-chain verification
    │   ├── Analytics.tsx        # Threat intelligence timeline & severity breakdown
    │   ├── AIStatus.tsx         # Model Registry & truthful engine provenance declarations
    │   └── Settings.tsx         # Audio input diagnostics, privacy policies, API health
    └── tests/
        ├── client.test.ts          # Auth token lifecycle and localStorage safety
        ├── privacyInvariant.test.ts # Zero-server-audio privacy assertion tests
        └── streamAnalyzer.test.ts   # Scenario generator and sliding window telemetry tests
```

---

## 3. Key Subsystem Workflows

### 3.1 Authentication & Session Resilience
- Token pair (`access_token`, `refresh_token`) received upon login/registration.
- Tokens stored in-memory with refresh token in guarded local storage.
- When an API request encounters HTTP 401 Unauthorized, `client.ts` automatically pauses outbound calls, invokes `POST /auth/refresh`, updates the active token pair, and transparently replays queued requests without disrupting call sessions.

### 3.2 Real-Time WebRTC Call Cockpit (`/app/calls/:callId`)
1. **Signaling Connection**: `WebRTCSignalingClient` connects to `/api/v1/ws/signaling/{callId}?token={jwt}` with 20s heartbeat keep-alives.
2. **Peer Negotiation**: The caller creates an SDP `offer`, receives an SDP `answer`, and exchanges trickle ICE candidates via WebSocket.
3. **Peer-to-Peer Encryption**: Audio tracks are encrypted directly using WebRTC DTLS-SRTP.
4. **Client-Side Telemetry**: `ClientStreamAnalyzer` samples local microphone audio features every 1500ms and posts compact JSON payloads to `POST /api/v1/calls/{callId}/security-analysis`.
5. **Dynamic Acoustic Challenge**: Operators can issue dynamic phoneme-locked challenge phrases (`POST /calls/{callId}/challenge`) to verify caller identity out-of-band.

### 3.3 Tamper-Evident Incidents & Blockchain Ledger
- Incidents are created at `POST /api/v1/incidents`.
- The backend normalizes evidence into canonical RFC 8785 JSON and computes a SHA-256 digest.
- Operators can anchor the digest on-chain (`POST /incidents/{id}/anchor`) to obtain a transaction hash and block number.
- Operators can verify integrity at any time (`GET /incidents/{id}/verification`). The frontend highlights whether hashes match (`VERIFIED`) or whether tampering has occurred (`TAMPERED`).
