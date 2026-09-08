# VoxShield AI — Frontend Integration Guide (Web & Mobile)

This contract defines the client-side integration architecture for future **Web** (React / Next.js / WebAssembly) and **Mobile** (React Native / Flutter / iOS Swift / Android Kotlin) client applications.

---

## 1. The Zero-Server-Audio Client Contract

> [!IMPORTANT]
> **Client Invariant**: Raw audio recorded from the user's microphone or received over peer-to-peer WebRTC **MUST NEVER** be transmitted to the VoxShield AI backend API. All real-time deepfake analysis occurs on the client endpoint. Only lightweight mathematical indicators (probabilities, scores, timestamps) are sent to the backend.

### 1.1 Edge Processing Pipeline
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

When the local neural inference detects an anomaly or clones:
```typescript
async function reportInCallAnomaly(callId: string, inferenceResult: InferenceData) {
  // Post telemetry metadata ONLY
  await apiClient.post(`/api/v1/calls/${callId}/security-events`, {
    event_type: inferenceResult.isAiClone ? "AI_VOICE_DETECTED" : "VOICE_ANOMALY",
    severity: inferenceResult.severity, // "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
    threat_score: inferenceResult.threatScore, // 0.0 - 100.0
    ai_probability: inferenceResult.aiProbability, // 0.0 - 1.0
    speaker_match_score: inferenceResult.speakerMatch,
    liveness_score: inferenceResult.livenessScore,
    metadata: {
      client_platform: "web",
      detected_cue: inferenceResult.artifactName,
    },
  });
}
```

---

## 5. UI / UX Design Specifications for Frontend Clients

1. **Active Call Screen (HUD)**:
   - **Shield Status Indicator**:
     - Green Shield (`LOW` threat: 0–29): "Voice Authenticated"
     - Amber Shield (`MEDIUM` threat: 30–59): "Caution: Acoustic Discontinuity"
     - Red Flashing Shield (`HIGH` threat: 60–84): "Warning: AI Voice Clone Suspected"
     - Crimson Pulsing Modal (`CRITICAL` threat: 85–100): "CRITICAL: Impersonation Attack Detected — Disconnect Recommended"
2. **Dashboard & Threat History**:
   - Time-series chart rendering daily threat counts from `GET /api/v1/threats/timeline`.
   - Severity breakdown pie chart using `GET /api/v1/threats/summary`.
3. **Incident Viewer & Blockchain Proof Modal**:
   - Displays Canonical SHA-256 Hash.
   - Verification status badge (`VERIFIED`, `TAMPERED`, `UNANCHORED`).
   - Clickable link to Etherscan / Polygonscan block explorer based on `transaction_hash`.
