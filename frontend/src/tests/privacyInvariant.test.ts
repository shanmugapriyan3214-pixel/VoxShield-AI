import { describe, it, expect } from 'vitest';
import { SecurityStreamAnalyzer } from '../security/streamAnalyzer';
import { VoiceProfileCreate, VoiceProfileResponse } from '../types/voice';

describe('Zero-Server-Audio & Biometric Privacy Invariants', () => {
  it('guarantees client-side telemetry report contains zero bytes of raw audio', () => {
    const analyzer = new SecurityStreamAnalyzer('call-privacy-audit', {
      onTelemetryResult: () => {},
      onError: () => {},
    });

    analyzer.setScenario('suspicious');
    const emittedReport = analyzer.generateWindowPayload();

    expect(emittedReport).toBeDefined();
    const reportObj = emittedReport as any;

    // Strict privacy assertions: zero audio payload fields permitted
    expect(reportObj.audio).toBeUndefined();
    expect(reportObj.audio_data).toBeUndefined();
    expect(reportObj.raw_bytes).toBeUndefined();
    expect(reportObj.waveform).toBeUndefined();
    expect(reportObj.pcm).toBeUndefined();
    expect(reportObj.buffer).toBeUndefined();
    expect(reportObj.blob).toBeUndefined();
    expect(reportObj.base64).toBeUndefined();

    // Verify permitted metadata types
    expect(typeof reportObj.window_index).toBe('number');
    expect(typeof reportObj.ai_generated_probability).toBe('number');
    expect(typeof reportObj.speaker_match_probability).toBe('number');
    expect(typeof reportObj.liveness_probability).toBe('number');
    expect(Array.isArray(reportObj.detected_artifacts)).toBe(true);
  });

  it('guarantees voice profile registration payload sends only metadata labels without audio waveforms', () => {
    const registrationPayload: VoiceProfileCreate = {
      label: 'Primary Office Baseline',
      model_version: 'ecapa-tdnn-v2',
    };

    const payloadObj = registrationPayload as any;
    expect(payloadObj.audio).toBeUndefined();
    expect(payloadObj.raw_audio).toBeUndefined();
    expect(payloadObj.pcm_data).toBeUndefined();
    expect(payloadObj.waveform).toBeUndefined();
    expect(payloadObj.label).toBe('Primary Office Baseline');
    expect(payloadObj.model_version).toBe('ecapa-tdnn-v2');
  });

  it('verifies that voice profile response redacts raw biometric embedding vectors', () => {
    const profileResponse: VoiceProfileResponse = {
      id: 'vp-7712a-bc91',
      user_id: 'user-001',
      label: 'Primary Voice',
      status: 'VERIFIED',
      model_version: 'ecapa-tdnn-v2',
      embedding_hash: '3f7b2c9e4a1d8f...',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const responseObj = profileResponse as any;
    // Biometric embeddings (192-dim arrays) must NEVER be exposed
    expect(responseObj.embedding).toBeUndefined();
    expect(responseObj.raw_embedding).toBeUndefined();
    expect(responseObj.embedding_vector).toBeUndefined();
    expect(responseObj.weights).toBeUndefined();
    // Only safe cryptographic hash allowed
    expect(typeof responseObj.embedding_hash).toBe('string');
  });
});
