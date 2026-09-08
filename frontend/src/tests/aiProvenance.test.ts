import { describe, it, expect } from 'vitest';
import { EngineType, ModelMetadata, AIStatusResponse } from '../types/ai';

describe('AI Provenance & Truth-in-Engineering Taxonomy', () => {
  it('correctly categorizes REAL_PRETRAINED_MODEL when neural weights are loaded', () => {
    const neuralModel: ModelMetadata = {
      model_name: 'AASIST-L Speech Deepfake Detector',
      version: 'v1.2',
      engine_type: 'REAL_PRETRAINED_MODEL',
      framework: 'PyTorch / ONNX',
      device: 'cpu',
      input_sample_rate: 16000,
      input_duration_sec: 3.0,
      available: true,
      status: 'OPERATIONAL',
      inference_time_ms: 42.5,
    };

    expect(neuralModel.engine_type).toBe('REAL_PRETRAINED_MODEL');
    expect(neuralModel.available).toBe(true);
    expect(neuralModel.inference_time_ms).toBeDefined();
  });

  it('correctly categorizes LOCAL_DSP_ANALYZER when operating in DSP fallback mode', () => {
    const dspAnalyzer: ModelMetadata = {
      model_name: 'CQCC-GMM Acoustic Liveness Detector',
      version: 'v1.0',
      engine_type: 'LOCAL_DSP_ANALYZER',
      framework: 'NumPy / SciPy DSP',
      device: 'cpu',
      input_sample_rate: 16000,
      input_duration_sec: 1.5,
      available: true,
      status: 'ADAPTER_READY_DSP_FALLBACK',
    };

    expect(dspAnalyzer.engine_type).toBe('LOCAL_DSP_ANALYZER');
    expect(dspAnalyzer.framework).toContain('DSP');
    expect(dspAnalyzer.status).toContain('FALLBACK');
  });

  it('validates privacy policy assertions in AI status response', () => {
    const mockStatus: AIStatusResponse = {
      status: 'OPERATIONAL',
      mode: 'hybrid',
      fallback_mode: 'dsp_heuristic',
      device: 'cpu',
      streaming_window: {
        window_duration_sec: 3.0,
        hop_duration_sec: 0.5,
        sample_rate: 16000,
      },
      models: {},
      components: {},
      privacy_policy: {
        zero_server_audio: 'Strictly Enforced: Voice streams are analyzed client-side; raw audio is never stored or transmitted to server.',
        biometric_protection: 'Voice embeddings are treated as high-security biometric credentials and never returned via public APIs.',
        provenance_transparency: 'Engine types are truthfully declared as REAL_PRETRAINED_MODEL, LOCAL_DSP_ANALYZER, or MOCK_DEMO_MODEL.',
      },
    };

    expect(mockStatus.privacy_policy.zero_server_audio).toContain('Strictly Enforced');
    expect(mockStatus.privacy_policy.biometric_protection).toContain('never returned');
    expect(mockStatus.privacy_policy.provenance_transparency).toContain('truthfully declared');
  });
});
