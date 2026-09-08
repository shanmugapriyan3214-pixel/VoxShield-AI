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
   - Look at the top **Demo Scenario Selector**:
     - Click **"Normal Voice"**: Observe the Threat Shield glow **EMERALD** (Threat Score < 15, AI Prob < 5%, Speaker Match > 90%).
     - Click **"Suspicious Audio"**: Observe the Threat Shield turn **AMBER** (Threat Score ~55, anomaly flags raised).
     - Click **"Voice Clone Attack"**: Watch the Threat Shield turn **CRIMSON** with a pulsing alert!
       - Threat Score spikes to **85–98/100**.
       - AI Clone Probability reaches **94%**.
       - Forensic indicators flag `vocoder_phase_discontinuity` and `zero_shot_diffusion_artifact`.

---

### Step 3: Out-of-Band Acoustic Challenge-Response
1. While in the call cockpit during a voice cloning attack, click **"Issue Acoustic Challenge"**.
2. A dynamically generated, phoneme-locked phrase appears (e.g. *"The quick amber fox jumps over the cryptographic cipher"*).
3. Type or verify the phrase:
   - Entering the correct phrase resolves the challenge with verified acoustic timestamping.
   - Failing the challenge triggers an immediate termination recommendation.

---

### Step 4: File Tamper-Evident Incident & Blockchain Anchor
1. Click **"Incidents"** in the sidebar (`/app/incidents`).
2. Click **"File Incident Report"** (or escalate directly from the call screen).
3. Fill in the incident parameters (or review pre-populated forensic indicators) and click **"Create & Anchor"**.
4. You are taken to the **Incident Inspection Cockpit** (`/app/incidents/:id`):
   - Inspect the **Canonical SHA-256 Evidence Digest** computed using RFC 8785 canonical JSON serialization.
   - Click **"Anchor to Blockchain"**: The digest is anchored to the distributed ledger, producing a transaction hash and block height.
   - Click **"Verify Cryptographic Proof"**: VoxShield AI fetches on-chain evidence and recomputes the SHA-256 hash in real time:
     - Shows green shield: **"CRYPTOGRAPHIC INTEGRITY VERIFIED: Hashes match on-chain record"**.

---

### Step 5: Transparent AI Model Registry (`/app/ai-status`)
1. Click **"AI Registry"** in the sidebar.
2. Inspect the operational provenance of each subsystem:
   - **Deepfake Detector (AASIST-L)** -> declared engine type and operational state.
   - **Speaker Verification (ECAPA-TDNN)** -> cosine similarity threshold.
   - **Liveness Detector (CQCC-GMM)** -> replay detection status.
   - **Streaming Sliding Window Engine** -> 3.0s window, 0.5s hop, 16kHz sampling rate.
   - **Zero-Server-Audio Privacy Invariants** -> Biometric safeguards verified.

---

### Step 6: Automated Test Verification
Run both backend and frontend test suites directly in terminal:

```powershell
# Backend pytest suite (69/69 tests)
& "d:\voiceREG\.venv\Scripts\python.exe" -m pytest backend/tests

# Frontend Vitest suite (5/5 tests + privacy assertions)
cd d:\voiceREG\frontend
$env:PATH = "C:\Program Files\nodejs;" + $env:PATH
& "C:\Program Files\nodejs\npm.cmd" run test
```
All tests will execute and pass cleanly.
