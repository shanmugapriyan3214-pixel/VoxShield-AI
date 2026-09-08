# VoxShield AI — AI Pipeline & Threat Scoring Engine

## 1. Design Philosophy
The VoxShield AI intelligence layer is structured around modular, dependency-injected interfaces rather than hard-coded deep learning model checkpoints. This decoupling guarantees:
1. **Zero Cold-Start Lag**: In development and CI environments, lightweight mock adapters simulate real-world acoustic feature distributions without downloading multi-gigabyte neural weights.
2. **Pluggable Production Providers**: Teams can swap in state-of-the-art models (e.g., RawNet3, AASIST, ECAPA-TDNN, Whisper-based detectors, Wav2Vec 2.0) without altering database schemas or API contracts.
3. **Probabilistic Humility**: The platform rejects false claims of "100% deepfake immunity". Output classifications are probabilistic (`LIKELY_HUMAN`, `LIKELY_AI_GENERATED`, `SUSPICIOUS`, `UNKNOWN`).

---

## 2. Core Service Interfaces

```
                  ┌─────────────────────────────────┐
                  │      Unified Analysis Pipeline  │
                  └────────────────┬────────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         ▼                         ▼                         ▼
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│ DeepfakeDetector │      │ SpeakerEmbedding │      │ LivenessDetector │
│    Interface     │      │    Interface     │      │    Interface     │
└────────┬─────────┘      └────────┬─────────┘      └────────┬─────────┘
         │                         │                         │
         ▼                         ▼                         ▼
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│ Mock or PyTorch  │      │ Mock or ECAPA    │      │ Mock or Phase    │
│  Adapter (AASIST)│      │  Adapter (TDNN)  │      │  Coherence Adapt │
└────────┬─────────┘      └────────┬─────────┘      └────────┬─────────┘
         │                         │                         │
         └─────────────────────────┼─────────────────────────┘
                                   │
                                   ▼
                  ┌─────────────────────────────────┐
                  │       Multi-Factor Threat       │
                  │         Scoring Engine          │
                  │     (Score: 0 - 100, Severity)  │
                  └─────────────────────────────────┘
```

### 2.1 DeepfakeDetector (`app.ai.interfaces.detector`)
```python
class DeepfakeDetector(ABC):
    @abstractmethod
    async def detect(self, audio_bytes: bytes, sample_rate: int = 16000) -> DeepfakeDetectionResult:
        """Analyze audio frames for synthetic vocoder and diffusion artifacts."""
        pass
```
- **Inputs**: Raw PCM / audio buffer, sampling rate.
- **Outputs**:
  - `ai_probability` (float in `[0.0, 1.0]`)
  - `human_probability` (float in `[0.0, 1.0]`)
  - `classification` (`LIKELY_HUMAN` | `LIKELY_AI_GENERATED` | `SUSPICIOUS` | `UNKNOWN`)
  - `spectral_artifacts_detected` (list of strings)
  - `confidence` (float in `[0.0, 1.0]`)
  - `model_version` (string)

### 2.2 SpeakerEmbeddingService & Comparison (`app.ai.interfaces.embedding`)
```python
class SpeakerEmbeddingService(ABC):
    @abstractmethod
    async def extract_embedding(self, audio_bytes: bytes) -> SpeakerEmbeddingResult:
        """Extract a 192-d or 512-d normalized speaker embedding vector."""
        pass

class SpeakerComparisonService(ABC):
    @abstractmethod
    async def compare(self, embedding_a: list[float], embedding_b: list[float]) -> SpeakerComparisonResult:
        """Compute cosine similarity and probabilistic verification match score."""
        pass
```

### 2.3 LivenessDetector (`app.ai.interfaces.liveness`)
```python
class LivenessDetector(ABC):
    @abstractmethod
    async def analyze_liveness(self, audio_bytes: bytes) -> LivenessResult:
        """Check for acoustic impulse response anomalies and replay artifacts."""
        pass
```

---

## 3. Real-Time Multi-Signal Threat Engine

The Threat Engine fuses heterogeneous indicators into a normalized **Threat Score ($S_{threat} \in [0, 100]$)** and categorizes severity.

### 3.1 Mathematical Formulation
The base threat score $S_{raw}$ is computed as a weighted combination of normalized risk indicators:

$$S_{raw} = \left( w_{ai} \cdot P_{ai} + w_{mismatch} \cdot (1 - S_{speaker}) + w_{replay} \cdot (1 - S_{liveness}) \right) \times 100$$

Where default weights satisfy:
- $w_{ai} = 0.50$ (AI deepfake detection probability)
- $w_{mismatch} = 0.30$ (Speaker voice embedding distance)
- $w_{replay} = 0.20$ (Liveness failure indicator)

#### Dynamic Context Modifiers:
1. **Trusted Contact Impersonation Penalty ($\Delta_{trust}$)**:
   - If the caller claims to be a `TRUSTED_CONTACT` (e.g. "Father") but the speaker match score $S_{speaker} < 0.65$:
     $$\Delta_{trust} = +15.0$$
2. **Repeated Acoustic Glitch Spike ($\Delta_{spike}$)**:
   - If consecutive audio segments exhibit vocoder phase discontinuity:
     $$\Delta_{spike} = +10.0$$
3. **High Liveness Damping ($\Delta_{live}$)**:
   - If liveness score $S_{liveness} > 0.90$ and $P_{ai} < 0.15$:
     $$\Delta_{live} = -10.0$$

Final Threat Score:
$$S_{threat} = \min(100.0, \max(0.0, S_{raw} + \Delta_{trust} + \Delta_{spike} + \Delta_{live}))$$

### 3.2 Severity Classification

| Threat Score ($S_{threat}$) | Severity | Action Triggered |
| :---: | :---: | :--- |
| **$0.0 - 29.9$** | `LOW` | Benign call; normal encrypted media flow. |
| **$30.0 - 59.9$** | `MEDIUM` | Subtle acoustic anomalies; client displays advisory indicator. |
| **$60.0 - 84.9$** | `HIGH` | Strong clone probability; in-call warning modal and auto-incident generation. |
| **$85.0 - 100.0$** | `CRITICAL` | Severe impersonation attack; audio muting recommended, instant incident creation, blockchain anchor option. |

---

## 4. Development Mock Adapters

To guarantee instant startup without GPU or PyTorch dependencies:
- `MockDeepfakeDetector`: Computes pseudo-random deterministic probabilities derived from file hash or packet entropy, returning valid classification payloads.
- `MockSpeakerEmbeddingService`: Emits normalized 192-element unit vectors.
- `MockLivenessDetector`: Emits realistic phase consistency and room acoustic simulation scores.
- All mock outputs set `"is_mock": True` and `"model_version": "mock-v1.0-demo"` for total transparency.
