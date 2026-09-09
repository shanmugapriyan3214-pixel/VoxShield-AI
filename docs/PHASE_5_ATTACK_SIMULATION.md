# VoxShield AI — Phase 5: Controlled Voice-Cloning Attack Simulation & Live Detection Demo

## 1. Executive Summary & Objectives

**Phase 5** delivers a complete, repeatable, end-to-end controlled cybersecurity demonstration showing how VoxShield AI detects a real-time voice cloning/impersonation attack, escalates threats dynamically, enforces an acoustic verification challenge, automatically creates a forensic incident with an RFC 8785 canonical SHA-256 evidence digest, anchors it to a mock blockchain, and proves cryptographic tamper detection.

### Core Demonstration Flow:
```
NORMAL CALL (baseline trusted voice)
  │
  ▼
NORMAL VOICE ANALYSIS (AASIST-L p < 0.05, ECAPA-TDNN match > 0.90, DSP liveness > 0.90, Threat < 15)
  │
  ▼
ATTACK SIMULATION ACTIVATED (User selects scenario: Replay, Synthetic Spoof, or Simulated Critical)
  │
  ▼
VOICE SAMPLE / SIMULATED ATTACK TELEMETRY EVALUATION
  ├── Real AASIST-L Anti-Spoofing Inference (ONNX Session)
  ├── Real ECAPA-TDNN Speaker Embedding & Cosine Similarity (ONNX Session)
  └── Local DSP Acoustic Liveness Analysis
  │
  ▼
THREAT FUSION ENGINE ESCALATION (Threat score rises 12.0 → 48.0 → 76.5 → 94.0 [CRITICAL])
  │
  ▼
ACOUSTIC IDENTITY VERIFICATION CHALLENGE ISSUED (Passphrase challenge)
  │
  ▼
CHALLENGE FAILURE (Simulated attacker response mismatch)
  │
  ▼
AUTOMATIC INCIDENT CREATION (`VOX-2026-XXXX`, severity: CRITICAL)
  │
  ▼
RFC 8785 CANONICAL SHA-256 EVIDENCE DIGEST GENERATED
  │
  ▼
MOCK BLOCKCHAIN ANCHORING (Transaction hash & block height recorded)
  │
  ▼
CRYPTOGRAPHIC TAMPER DEMONSTRATION (In-memory mutation yields instant hash divergence)
  │
  ▼
LIVE SECURITY TIMELINE & DEMO RESET (State cleanly returned to baseline)
```

---

## 2. Technical Architecture & Endpoints

### 2.1 Backend Subsystem (`backend/app/demo/`)

| Module | Purpose |
| :--- | :--- |
| `demo_models.py` | Pydantic v2 data transfer schemas for scenarios, execution steps, and tamper verification. |
| `scenarios.py` | 4 scenario configurations (`NORMAL`, `REPLAY_ATTACK`, `SYNTHETIC_SPOOF`, `SIMULATED_CRITICAL`) with step definitions, expectations, and provenance metadata. |
| `audio_samples.py` | Pure NumPy/WAV algorithmic test audio synthesis (harmonic baseline, room impulse response convolution, phase-jitter vocoder simulation) with 0 external network dependencies. |
| `attack_simulator.py` | Central demo engine handling execution steps, invoking genuine ONNX models or simulated telemetry, auto-creating incidents, anchoring to blockchain, and testing tamper detection. |
| `backend/app/api/v1/demo.py` | REST API endpoints exposing demo controller functionality. |

### 2.2 Demo REST API Endpoints

- `GET /api/v1/demo/scenarios`: Returns metadata for all 4 demonstration scenarios, including whether they invoke real neural models (`is_real_inference`) and provenance descriptions.
- `POST /api/v1/demo/execute`: Executes a specific scenario step (`0` to `3`), triggers real neural inference or simulated telemetry, updates call threat metrics, and automatically creates an incident if step 3 or challenge failure is triggered.
- `POST /api/v1/demo/tamper-test`: Runs an in-memory cryptographic test by mutating an incident field (e.g. `threat_score`, `severity`) and comparing the new canonical SHA-256 hash against the immutable on-chain record.
- `POST /api/v1/demo/reset`: Flushes demo telemetry, resolves active challenges, and returns the call session to baseline status.

---

## 3. Truth-in-Engineering Provenance Taxonomy

VoxShield AI maintains strict provenance honesty. Real neural model inference is never conflated with simulated telemetry:

| Scenario Key | Display Name | AI Engine Type | Provenance Label |
| :--- | :--- | :--- | :--- |
| `NORMAL` | Normal Call | `REAL_PRETRAINED_MODEL` | `REAL PRETRAINED MODEL (AASIST-L + ECAPA-TDNN + LOCAL DSP)` |
| `REPLAY_ATTACK` | Replay Attack | `REAL_PRETRAINED_MODEL` | `REAL PRETRAINED MODEL (AASIST-L + ECAPA-TDNN + LOCAL DSP)` |
| `SYNTHETIC_SPOOF` | Synthetic Spoof | `REAL_PRETRAINED_MODEL` | `REAL PRETRAINED MODEL (AASIST-L + ECAPA-TDNN + LOCAL DSP)` |
| `SIMULATED_CRITICAL`| Simulated Critical | `SIMULATED_ATTACK_TELEMETRY` | `SIMULATED ATTACK TELEMETRY (NOT REAL MODEL OUTPUT)` |

When executing `NORMAL`, `REPLAY_ATTACK`, or `SYNTHETIC_SPOOF`:
1. Algorithmic audio buffers (16 kHz WAV) are fed directly into the loaded `AASIST-L-AntiSpoof-ONNX` model session.
2. Embeddings are extracted using `ECAPA-TDNN-VoxCeleb-ONNX` and compared against an enrolled reference vector.
3. Acoustic reverberation and high-frequency spectral rolloff are computed by the `LOCAL_DSP_ANALYZER`.
4. Inference latencies are measured and logged (typically ~80–160 ms for neural inference).

---

## 4. Frontend Demo Experience (`frontend/src/`)

### 4.1 UI Components

1. **`ControlledAttackPanel.tsx`**:
   - Scenario Selector: Buttons for switching between the 4 demo modes.
   - Provenance Badge: Live pill indicating real neural model vs simulated telemetry.
   - Demo Controls: `Run Attack Sequence`, `Fail Challenge`, and `Reset Demo`.
2. **`CallScreen.tsx` (Enhanced Cockpit)**:
   - **Interactive Threat Shield**: Visual display dynamically transitioning from Emerald (Low) -> Amber (Medium) -> Orange (High) -> Crimson (Critical).
   - **Persistent Incident Banner**: Automatically rendered upon critical detection or challenge failure with incident number, canonical SHA-256 digest, and action buttons.
   - **Live Security Timeline**: Microsecond-timestamped audit log tracking every signal, anomaly detection, challenge, and blockchain anchor event.
   - **Acoustic Challenge Modal**: Allows legitimate challenge pass or attacker simulation failure.
3. **`TamperTestModal.tsx`**:
   - Interactive dialog allowing operators to falsify fields in memory.
   - Computes forged canonical SHA-256 digest and compares against the original immutable hash.
   - Displays prominent red alert: `TAMPER DETECTED — EVIDENCE MISMATCH`.

---

## 5. Zero-Server-Audio Privacy Verification

During real-time voice calls, live microphone audio is processed locally on the client device. Unencrypted raw audio media is transported peer-to-peer via DTLS-SRTP and is **NEVER** sent to the backend.

### Network Audit Results (Puppeteer E2E Automation):
- **Total HTTP Requests Monitored**: 140
- **Security Telemetry Requests**: 17
- **Raw Audio Upload Requests**: 0
- **Raw Audio Bytes Transmitted**: 0 bytes
- **Verification Verdict**: **STRICTLY PRESERVED**

---

## 6. Automated & Runtime Verification Artifacts

### 6.1 Test Suite Verification
- **Backend Tests (`pytest tests -v`)**: **93 passed** (including 9 dedicated Phase 5 tests in `tests/test_demo_simulation.py`).
- **Frontend Tests (`npm test -- --run`)**: **30 passed** (including 5 dedicated Phase 5 tests in `src/tests/demoSimulation.test.ts`).
- **Frontend Production Build (`vite build`)**: Clean build in 1.95s with zero TypeScript errors.

### 6.2 Browser Automation Screenshots (`docs/artifacts/phase5/`):
- `01_call_screen_baseline.png`: Call cockpit at baseline (Threat Score 8.0, Emerald Shield, Provenance Badge).
- `02_attack_escalation_critical.png`: Call cockpit during attack escalation (Threat Score 94.0, Crimson Alert, Automatic Incident Banner).
- `03_tamper_test_verified.png`: Tamper test modal comparing original vs forged SHA-256 hash with tamper detection alert.
- `04_demo_reset_verified.png`: Call cockpit after demo reset cleanly restoring baseline status.
