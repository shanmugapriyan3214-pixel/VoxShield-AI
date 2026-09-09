# VoxShield AI — Hackathon Demonstration & Evaluation Guide

Follow this step-by-step walkthrough to experience the complete VoxShield AI real-time voice defense platform.

---

## 1. Quick Launch Instructions

### Terminal 1: Launch Backend (FastAPI)
```powershell
cd d:\voiceREG
.\.venv\Scripts\activate
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
*API Base URL:* `http://127.0.0.1:8000/api/v1`  
*Swagger Docs:* `http://127.0.0.1:8000/docs`

### Terminal 2: Launch Frontend (Vite)
```powershell
cd d:\voiceREG\frontend
$env:PATH = "C:\Program Files\nodejs;" + $env:PATH
& "C:\Program Files\nodejs\npm.cmd" run dev
```
*Frontend URL:* `http://localhost:5173`

---

## 2. Interactive Operator Walkthrough

### Step 1: Account Registration & Login
1. Navigate to `http://localhost:5173/register`.
2. Create an operator account (e.g. `analyst@voxshield.io` / `Password123!`).
3. You will be redirected to the **Executive Security Dashboard** (`/app/dashboard`).

---

### Step 2: Live Encrypted Call & Real-Time AI Clone Detection
1. Click **"Calls"** in the sidebar navigation (`/app/calls`).
2. Click **"Initiate Encrypted Call"**.
3. Select an existing user or type a recipient ID. Click **"Start Encrypted Call"**.
4. You will be placed into the **Live Call Cockpit** (`/app/calls/:callId`):
   - Notice the **DTLS-SRTP Encrypted** badge confirming peer-to-peer security.
   - Observe the **Controlled Attack Simulation Controller**:
     - **Normal Call**: Runs baseline speech through genuine AASIST-L and ECAPA-TDNN ONNX models (Threat Score < 15, Emerald Shield).
     - **Replay Attack**: Injects room impulse response convolution into real neural models.
     - **Synthetic Spoof**: Evaluates phase-discontinuity vocoder waveforms through real AASIST-L.
     - **Simulated Critical**: Demonstrates high-volume telemetry escalation without requiring synthetic voice clones.
   - Click **"Run Attack Sequence"**:
     - Watch the threat score smoothly escalate from LOW (12.0) -> ADVISORY (48.0) -> HIGH (76.5) -> CRITICAL (94.0).
     - The Threat Shield pulses **CRIMSON**.
     - An **Automatic Incident Banner** appears immediately with an RFC 8785 canonical SHA-256 evidence digest anchored to the blockchain.

---

### Step 3: Out-of-Band Acoustic Challenge-Response
1. In the call cockpit, click **"Issue Acoustic Challenge"** (or click **"Fail Challenge"** in the Attack Controller).
2. A dynamically generated, phoneme-locked phrase appears (e.g. *"The quick amber fox jumps over the cryptographic cipher"*).
3. Operators can test both pathways:
   - **Legitimate Verification**: Spoken phrase matches; liveness confirmed; threat score drops by -40 points.
   - **Simulated Attacker Failure**: Submits invalid response; triggers immediate critical escalation and creates an incident.

---

### Step 4: Cryptographic Tamper Demonstration
1. On the persistent incident banner, click **"Run Tamper Test"**.
2. An interactive audit dialog displays the incident's immutable on-chain SHA-256 digest.
3. Select an in-memory mutation field (e.g. `threat_score` from `88.5` to `12.0`, or `severity` from `CRITICAL` to `LOW`).
4. Click **"Verify Cryptographic Tamper Alert"**:
   - VoxShield AI re-normalizes the altered JSON via RFC 8785 and recomputes the SHA-256 hash.
   - Demonstrates immediate cryptographic divergence between the forged hash and original on-chain hash.
   - Renders a prominent red alert: **"TAMPER DETECTED — EVIDENCE MISMATCH"**.

---

### Step 5: Transparent AI Model Registry (`/app/ai-status`)
1. Click **"AI Registry"** in the sidebar.
2. Inspect the operational provenance of each subsystem:
   - **Deepfake Detector (AASIST-L)** -> ONNX session status, latency, input/output tensors.
   - **Speaker Verification (ECAPA-TDNN)** -> 192-d embedding dimension, cosine threshold.
   - **Liveness Detector (LOCAL_DSP_ANALYZER)** -> Truthful DSP spectral and phase analysis.
   - **Zero-Server-Audio Privacy Invariants** -> Verified 0 bytes raw audio uploaded to server.

---

### Step 6: Automated Test Verification & Security Audits
Run both backend and frontend test suites and automated security benchmarks:

```powershell
# Backend pytest suite (107/107 tests passing)
& "d:\voiceREG\.venv\Scripts\python.exe" -m pytest tests -v

# Frontend Vitest suite (34/34 tests passing)
cd d:\voiceREG\frontend
$env:PATH = "C:\Program Files\nodejs;" + $env:PATH
& "C:\Program Files\nodejs\npm.cmd" test -- --run

# Local Concurrency & Stress Benchmark (560 concurrent requests, 0 errors)
cd d:\voiceREG
& "d:\voiceREG\.venv\Scripts\python.exe" scripts/local_stress_test.py

# Phase 6 Automated Browser E2E Security & Privacy Audit
$env:PATH = "C:\Program Files\nodejs;" + $env:PATH
node scripts/browser_phase6_security_audit.mjs
```
All tests will execute and pass cleanly.
