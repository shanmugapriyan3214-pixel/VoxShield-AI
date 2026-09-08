# VoxShield AI — AI Pipeline & Real-Time Threat Scoring Engine

## 1. Design Philosophy
The VoxShield AI intelligence layer is structured around modular, dependency-injected interfaces rather than monolithic, hard-coded model checkpoints. This architecture guarantees:
1. **Zero Cold-Start Lag & Dual Execution Modes**: The platform can run in `local` mode (real DSP feature extraction + ONNX runtime / local neural acoustic evaluation) or in `mock` mode (deterministic simulation for CI, unit testing, and offline demonstrations).
2. **Transparent Model Labeling**: Every AI result is explicitly labeled with its `engine_type` (`REAL_PRETRAINED_MODEL`, `LOCAL_DSP_ANALYZER`, or `MOCK_DEMO_MODEL`), ensuring transparency during demos, audits, and security evaluations. (See [AI Model Audit](AI_MODEL_AUDIT.md)).
3. **Central Model Registry**: All models, adapters, versions, and benchmark inference timings are tracked in real-time via `ModelRegistry` and exposed at `GET /api/v1/ai/status`.
4. **Strict Client-Side / Edge Privacy Invariant (Zero-Server-Audio)**: In real-time voice calls, live audio buffers are analyzed exclusively on the user's edge client device (browser or native app). Unencrypted voice streams NEVER reach the backend server; only compact, privacy-safe security telemetry (`ai_generated_probability`, `speaker_match_probability`, `liveness_probability`) is transmitted.
5. **Probabilistic Humility**: The platform rejects false claims of "100% deepfake immunity". Output classifications are probabilistic (`LIKELY_HUMAN`, `LIKELY_AI_GENERATED`, `SUSPICIOUS`, `UNKNOWN`).

---

## 2. Architecture & Pipeline Structure

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
                           ┌──────────────────────────────────────────────┐
                           │      On-Device Client Audio Buffer (16 kHz)  │
                           └──────────────────────┬───────────────────────┘
                                                  │ Sliding 1.5s Windows (Hop: 0.75-1.0s)
                                                  ▼
                           ┌──────────────────────────────────────────────┐
                           │         AudioFeatureExtractor (DSP)          │
                           │   - Log-Mel Spectrogram (64 mels)            │
                           │   - 13/24 MFCCs + Statistical Moments        │
                           │   - Spectral Centroid, Flatness, Rolloff     │
                           │   - Zero-Crossing Rate & RMS Energy          │
                           └──────────────────────┬───────────────────────┘
                                                  │
                ┌─────────────────────────────────┼─────────────────────────────────┐
                ▼                                 ▼                                 ▼
   ┌──────────────────────────┐     ┌──────────────────────────┐      ┌──────────────────────────┐
   │  LocalDeepfakeDetector   │     │  SpeakerEmbeddingService │      │  LocalLivenessDetector   │
   │  - ONNX Neural or DSP    │     │  - 192-d Unit Normal     │      │  - Acoustic Reverberation│
   │  - Vocoder Artifacts     │     │  - Cosine Similarity     │      │  - Replay / DAC artifacts│
   └────────────┬─────────────┘     └─────────────┬────────────┘      └────────────┬─────────────┘
                │ P(ai)                           │ S(speaker)                     │ S(liveness)
                └─────────────────────────────────┼────────────────────────────────┘
                                                  │
                                                  ▼
                                ┌───────────────────────────────────┐
                                │     ThreatFusionEngine (0-100)    │
                                │   Weights: 0.45 AI + 0.30 Speaker │
                                │            + 0.25 Liveness        │
                                │   Context Escalators & Mitigators │
                                └─────────────────┬─────────────────┘
                                                  │
                                                  ▼
                             ┌────────────────────────────────────────┐
                             │       Progressive Threat Action        │
                             │  [0 - 24]  LOW: CONTINUE_NORMAL        │
                             │  [25 - 49] MED: DISPLAY_ADVISORY       │
                             │  [50 - 74] HI : REQUIRE_VERIFICATION   │
                             │  [75 - 100]CRIT:RECOMMEND_TERMINATION  │
                             └────────────────────────────────────────┘
```

---

## 3. Audio Feature Extraction (`AudioFeatureExtractor`)

Implemented in `app/ai/feature_extraction.py` using NumPy for pure Python portability:

### 3.1 Acoustic Features Extracted
| Feature | Function / Target | Role in Spoofing Detection |
| :--- | :--- | :--- |
| **Log-Mel Spectrogram** | 64 mel filterbanks across 16 kHz | Captures time-frequency energy distributions fed into neural backbones. |
| **MFCCs** | 13 to 24 coefficients + dynamic deltas | Represents vocal tract shape; mean/std/min/max moments capture voice identity. |
| **Spectral Flatness** | Geometric mean / Arithmetic mean of FFT magnitudes | Synthetic vocoders exhibit unnaturally flat spectral distributions ($> 0.40$). |
| **Spectral Centroid** | Center of mass of the spectrum | High centroid with high flatness indicates vocoder artifact noise. |
| **Spectral Roll-Off** | 85th percentile frequency threshold | Re-recorded acoustic streams through small speakers cut off above 2500–3500 Hz. |
| **Zero Crossing Rate** | Rate of sign-changes along waveform | Vocoder phase discontinuities exhibit abnormal ZCR spikes ($> 0.35$). |
| **RMS Energy** | Root-mean-square amplitude | Measures signal presence and temporal dynamics. |

---

## 4. Detection Modules

### 4.1 Pluggable Deepfake Detector (`LocalDeepfakeDetector` & `MockDeepfakeDetector`)
- **Local Model**:
  - Automatically attempts to load ONNX neural checkpoint if configured (`DEEPFAKE_MODEL_PATH`).
  - Fallback DSP Classifier: Evaluates synthetic index based on spectral flatness, zero-crossing rate, and MFCC variance:
    $$\text{Synthetic Index} = 1.8 \cdot \text{Flatness} + 0.8 \cdot \text{ZCR} + \frac{0.05}{\text{Var}(\text{MFCC}) + 0.1}$$
    $$P_{ai} = \sigma\left(3.0 \cdot (\text{Synthetic Index} - 1.2)\right)$$
- **Mock Model**: Deterministic digest-based classifier for CI testing.

### 4.2 Speaker Verification & Cosine Similarity (`SpeakerComparisonService`)
- Extracts 192-dimensional speaker embeddings via statistical MFCC projection normalized to the unit sphere:
  $$\mathbf{e} = \frac{\mathbf{W}_{proj} \cdot \mathbf{m}}{\|\mathbf{W}_{proj} \cdot \mathbf{m}\|_2}$$
- Compares embeddings via cosine similarity:
  $$S_{match} = \max\left(0, \frac{\mathbf{e}_A \cdot \mathbf{e}_B}{\|\mathbf{e}_A\|_2 \|\mathbf{e}_B\|_2}\right)$$
- **Strict Privacy Guarantee**: Raw embeddings are biometric credentials; they are never exposed through public query endpoints or call telemetry responses.

### 4.3 Acoustic Liveness & Replay Detector (`LocalLivenessDetector`)
- Analyzes temporal variance in frame energy $\text{Var}(E_{frame})$ and high-frequency spectral rolloff.
- Loudspeaker playback and re-recording suffer from physical transducer dampening and abnormal impulse responses.
- Produces `liveness_score` and `replay_probability = 1.0 - liveness_score`.

---

## 5. Multi-Signal Threat Fusion Engine (`ThreatFusionEngine`)

Combines heterogeneous signals into an actionable 0–100 Threat Score.

### 5.1 Fusion Formulation
$$S_{raw} = \left( 0.45 \cdot P_{ai} + 0.30 \cdot (1 - S_{match}) + 0.25 \cdot (1 - S_{liveness}) \right) \times 100$$

### 5.2 Contextual Escalators & Mitigators
1. **Trusted Contact Impersonation Penalty (+20 pts)**:
   - When caller claims to be a trusted contact but speaker similarity is below 0.60.
2. **Phase Discontinuity / Artifact Flag (+10 to +12 pts)**:
   - When vocoder phase discontinuity or loudspeaker replay is detected.
3. **High Liveness / Authenticity Damping (-8 pts)**:
   - When liveness $> 0.85$ and $P_{ai} < 0.10$.
4. **Challenge Passed Mitigation (-30 pts)**:
   - When the user successfully answers a real-time acoustic challenge.

### 5.3 Progressive Threat Response Matrix
| Score Range | Severity | Recommended Action | Automated Action |
| :--- | :--- | :--- | :--- |
| **0 – 24.9** | `LOW` | `CONTINUE_NORMAL` | Display green secure indicator. |
| **25.0 – 49.9** | `MEDIUM` | `DISPLAY_ADVISORY` | Amber warning banner; recommend cautious verification. |
| **50.0 – 74.9** | `HIGH` | `REQUIRE_VERIFICATION` | Prompt acoustic challenge or out-of-band verification; log security event. |
| **75.0 – 100.0** | `CRITICAL` | `RECOMMEND_TERMINATION` | Red critical alert; log incident; terminate call if auto-terminate enabled. |

---

## 6. Dynamic Trust Challenge State Machine (`ChallengeService`)

When suspicious activity is detected, participants can issue an acoustic verification challenge:
1. **Issue Challenge**: Server generates a 3-word dynamic passphrase (e.g. `"Falcon Echo Crimson"`) with a 30–60 second deadline.
2. **Spoken Response**: The suspect speaks the phrase over the voice stream. The client verifies phonetic token overlap and liveness.
3. **Outcome**:
   - `PASSED`: Mitigates call threat score by -30 points.
   - `FAILED`: Escalates threat score by +20 points.
   - `EXPIRED`: Challenge marked invalid after timeout.

---

## 7. Real-Time Streaming Telemetry Endpoint

`POST /api/v1/calls/{call_id}/security-analysis` accepts client telemetry:
```json
{
  "ai_generated_probability": 0.94,
  "speaker_match_probability": 0.32,
  "liveness_probability": 0.28,
  "window_duration_ms": 1500,
  "window_index": 12,
  "detected_artifacts": ["vocoder_phase_discontinuity"]
}
```
**ZERO SERVER AUDIO**: The server processes metadata only and returns immediate progressive threat instructions.
