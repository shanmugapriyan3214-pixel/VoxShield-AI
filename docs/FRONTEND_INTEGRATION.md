# VoxShield AI — Frontend Integration Guide (Web & Mobile)

This contract defines the client-side integration architecture for future **Web** (React / Next.js / WebAssembly) and **Mobile** (React Native / Flutter / iOS Swift / Android Kotlin) client applications.

---

## 1. The Zero-Server-Audio Client Contract

> [!IMPORTANT]
> **Client Invariant**: Raw audio recorded from the user's microphone or received over peer-to-peer WebRTC **MUST NEVER** be transmitted to the VoxShield AI backend API. All real-time deepfake analysis occurs on the client endpoint. Only lightweight mathematical indicators (probabilities, scores, timestamps) are sent to the backend.

### 1.1 Edge Processing Pipeline
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

```
[User Mic] ──► [AudioContext / AudioBuffer]
                     │
                     ├────────► [Local ONNX / TFLite Neural Engine]
                     │                 │
                     │                 ├─ Computes P(AI)
                     │                 ├─ Computes Cosine Distance (Voice Profile)
                     │                 └─ Computes Liveness Score
                     │                         │
                     │                         ▼
                     │                 [Threat Evaluator]
                     │                         │
                     │                         ▼
                     │                 POST /api/v1/calls/{id}/security-events
                     │                 (Payload: ~200 Bytes JSON, 0 Bytes Audio)
                     │
                     ▼
        [RTCPeerConnection (DTLS-SRTP)] ──► Directly to Remote Peer
```

---

## 2. Authentication & Token Management Lifecycle

### 2.1 Storage & Authorization Header
- **Access Token**: Store in secure client memory (e.g. React context / in-memory store) or OS secure storage (iOS Keychain, Android EncryptedSharedPreferences).
- **Refresh Token**: Store securely on device.
- **HTTP Header**: Attach to every REST request:
  ```
  Authorization: Bearer <access_token>
  ```

### 2.2 Transparent 401 Interceptor Flow
```typescript
// Axios / Fetch Interceptor Example
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const res = await axios.post("/api/v1/auth/refresh", {
          refresh_token: getStoredRefreshToken(),
        });
        const { access_token, refresh_token } = res.data.data.tokens;
        storeTokens(access_token, refresh_token);
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return apiClient(originalRequest);
      } catch (refreshErr) {
        clearStoredTokens();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);
```

---

## 3. Real-Time WebRTC Call & Signaling Sequence

### Step 1: Initiate Call via REST
```typescript
// Caller initiates call
const res = await apiClient.post("/api/v1/calls", { receiver_id: calleeUserId });
const callId = res.data.data.id;
```

### Step 2: Open Authenticated WebSocket
```typescript
const wsUrl = `wss://api.voxshield.io/api/v1/ws/signaling/${callId}?token=${accessToken}`;
const signalingSocket = new WebSocket(wsUrl);
```

### Step 3: WebRTC PeerConnection Handshake
```typescript
const pc = new RTCPeerConnection({
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    // Production TURN configuration
  ],
});

// Capture local audio
const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

// Caller creates offer
pc.onicecandidate = (event) => {
  if (event.candidate) {
    signalingSocket.send(JSON.stringify({
      type: "ice_candidate",
      payload: event.candidate,
    }));
  }
};

const offer = await pc.createOffer();
await pc.setLocalDescription(offer);
signalingSocket.send(JSON.stringify({
  type: "offer",
  payload: offer,
}));
```

### Step 4: Handle Incoming Remote Frames
```typescript
signalingSocket.onmessage = async (event) => {
  const msg = JSON.parse(event.data);
  switch (msg.type) {
    case "offer":
      await pc.setRemoteDescription(new RTCSessionDescription(msg.payload));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      signalingSocket.send(JSON.stringify({ type: "answer", payload: answer }));
      break;
    case "answer":
      await pc.setRemoteDescription(new RTCSessionDescription(msg.payload));
      break;
    case "ice_candidate":
      await pc.addIceCandidate(new RTCIceCandidate(msg.payload));
      break;
    case "security_alert":
      displayThreatNotification(msg.payload);
      break;
  }
};
```

---

## 4. Real-Time In-Call Security Telemetry Reporting

Every 1.5 seconds, the client-side sliding window analyzer emits telemetry to the backend:
```typescript
async function sendTelemetryFrame(callId: string, windowData: SlidingWindowResult) {
  // Post compact security telemetry (ZERO audio bytes transferred)
  const response = await apiClient.post(`/api/v1/calls/${callId}/security-analysis`, {
    ai_generated_probability: windowData.aiProbability, // 0.0 - 1.0
    speaker_match_probability: windowData.speakerMatch, // 0.0 - 1.0
    liveness_probability: windowData.livenessScore,     // 0.0 - 1.0
    window_duration_ms: 1500,
    window_index: windowData.index,
    detected_artifacts: windowData.detectedArtifacts,   // e.g. ["vocoder_phase_discontinuity"]
  });

  const { recommended_action, threat_score, severity, call_terminated } = response.data.data;

  // React progressively based on server instruction
  switch (recommended_action) {
    case "CONTINUE_NORMAL":
      updateHUDStatus("SECURE", threat_score);
      break;
    case "DISPLAY_ADVISORY":
      showAdvisoryBanner("Acoustic anomalies observed. Exercise caution.");
      break;
    case "REQUIRE_VERIFICATION":
      promptAcousticChallengeModal(callId);
      break;
    case "RECOMMEND_TERMINATION":
      showCriticalWarningModal("AI Voice Clone Impersonation Detected. Disconnect recommended!");
      if (call_terminated) {
        hangupPeerConnection();
      }
      break;
  }
}
```

---

## 5. Acoustic Passphrase Verification Challenge Flow

When elevated threat occurs or a participant suspects impersonation:
```typescript
// 1. Issue challenge
async function triggerChallenge(callId: string) {
  const res = await apiClient.post(`/api/v1/calls/${callId}/challenge`, {
    timeout_seconds: 45
  });
  const { challenge_id, passphrase, prompt } = res.data.data;
  displayChallengePrompt(prompt); // "Please repeat clearly: 'Falcon Echo Crimson'"
  return challenge_id;
}

// 2. Submit spoken response
async function submitChallengeResponse(callId: string, challengeId: string, spokenText: string, liveness: number) {
  const res = await apiClient.post(`/api/v1/calls/${callId}/challenge/verify`, {
    challenge_id: challengeId,
    spoken_phrase: spokenText,
    liveness_score: liveness
  });
  const { status, verified, threat_score_impact } = res.data.data;
  if (verified) {
    showToast("Identity verified! Call threat score reduced.");
  } else {
    showToast("Verification failed. Proceed with extreme caution.", "danger");
  }
}
```

---

## 6. UI / UX Design Specifications for Frontend Clients

1. **Active Call Screen (HUD)**:
   - **Shield Status Indicator**:
     - Green Shield (`LOW` threat: 0–24.9): "Voice Authenticated"
     - Amber Shield (`MEDIUM` threat: 25.0–49.9): "Advisory: Acoustic Jitter Detected"
     - Orange Shield (`HIGH` threat: 50.0–74.9): "Suspicious: Voiceprint Mismatch — Verification Recommended"
     - Crimson Pulsing Modal (`CRITICAL` threat: 75.0–100.0): "CRITICAL THREAT: AI Voice Clone Impersonation — Hang Up Immediately"
2. **Dashboard & Threat History**:
   - Time-series chart rendering daily threat counts from `GET /api/v1/threats/timeline`.
   - Severity breakdown pie chart using `GET /api/v1/threats/summary`.
3. **Incident Viewer & Blockchain Proof Modal**:
   - Displays Canonical SHA-256 Hash.
   - Verification status badge (`VERIFIED`, `TAMPERED`, `UNANCHORED`).
   - Clickable link to Etherscan / Polygonscan block explorer based on `transaction_hash`.

