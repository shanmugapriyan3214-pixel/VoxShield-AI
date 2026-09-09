import { describe, it, expect } from 'vitest';
import { SecurityStreamAnalyzer } from '../security/streamAnalyzer';

describe('Phase 5 Controlled Attack Simulation Frontend Tests', () => {
  it('generates low risk baseline telemetry for NORMAL scenario', () => {
    const analyzer = new SecurityStreamAnalyzer('call-demo-001', {
      onTelemetryResult: () => {},
    });

    analyzer.setScenario('normal');
    const payload = analyzer.generateWindowPayload();

    expect(payload).toBeDefined();
    expect(payload.ai_generated_probability).toBeLessThan(0.10);
    expect(payload.speaker_match_probability).toBeGreaterThan(0.85);
    expect(payload.liveness_probability).toBeGreaterThan(0.90);
    expect(payload.detected_artifacts).toHaveLength(0);
    expect(payload.window_duration_ms).toBe(1500);
  });

  it('generates acoustic liveness anomaly telemetry for REPLAY_ATTACK scenario', () => {
    const analyzer = new SecurityStreamAnalyzer('call-demo-002', {
      onTelemetryResult: () => {},
    });

    analyzer.setScenario('replay_attack');
    const payload = analyzer.generateWindowPayload();

    expect(payload).toBeDefined();
    expect(payload.liveness_probability).toBeLessThan(0.40);
    expect(payload.ai_generated_probability).toBeGreaterThan(0.35);
    expect(payload.speaker_match_probability).toBeLessThan(0.65);
    expect(payload.detected_artifacts).toContain('acoustic_room_impulse');
  });

  it('generates vocoder deepfake telemetry for SYNTHETIC_SPOOF scenario', () => {
    const analyzer = new SecurityStreamAnalyzer('call-demo-003', {
      onTelemetryResult: () => {},
    });

    analyzer.setScenario('synthetic_spoof');
    const payload = analyzer.generateWindowPayload();

    expect(payload).toBeDefined();
    expect(payload.ai_generated_probability).toBeGreaterThan(0.80);
    expect(payload.speaker_match_probability).toBeLessThan(0.45);
    expect(payload.detected_artifacts).toContain('vocoder_phase_discontinuity');
  });

  it('generates critical multi-vector telemetry for SIMULATED_CRITICAL scenario', () => {
    const analyzer = new SecurityStreamAnalyzer('call-demo-004', {
      onTelemetryResult: () => {},
    });

    analyzer.setScenario('simulated_critical');
    const payload = analyzer.generateWindowPayload();

    expect(payload).toBeDefined();
    expect(payload.ai_generated_probability).toBeGreaterThan(0.90);
    expect(payload.speaker_match_probability).toBeLessThan(0.35);
    expect(payload.liveness_probability).toBeLessThan(0.30);
    expect(payload.detected_artifacts).toContain('multi_vector_voice_clone');
  });

  it('enforces Zero-Server-Audio invariant across all generated payloads', () => {
    const analyzer = new SecurityStreamAnalyzer('call-demo-005', {
      onTelemetryResult: () => {},
    });

    const scenarios = ['normal', 'replay_attack', 'synthetic_spoof', 'simulated_critical'] as const;

    scenarios.forEach((scen) => {
      analyzer.setScenario(scen);
      const payload: any = analyzer.generateWindowPayload();

      // Verify strictly NO audio binaries, buffers, or base64 audio fields
      expect(payload.audio).toBeUndefined();
      expect(payload.raw_audio).toBeUndefined();
      expect(payload.wav).toBeUndefined();
      expect(payload.pcm).toBeUndefined();
      expect(payload.audio_bytes).toBeUndefined();
      expect(payload.media_stream).toBeUndefined();

      // Only compact numbers and strings
      expect(typeof payload.ai_generated_probability).toBe('number');
      expect(typeof payload.speaker_match_probability).toBe('number');
      expect(typeof payload.liveness_probability).toBe('number');
      expect(Array.isArray(payload.detected_artifacts)).toBe(true);
    });
  });
});
