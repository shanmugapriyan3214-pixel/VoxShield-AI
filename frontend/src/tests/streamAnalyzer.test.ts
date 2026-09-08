import { describe, it, expect } from 'vitest';
import { SecurityStreamAnalyzer } from '../security/streamAnalyzer';

describe('SecurityStreamAnalyzer', () => {
  it('initializes with correct callId and scenario', () => {
    const analyzer = new SecurityStreamAnalyzer('call-test-123', {
      onTelemetryResult: () => {},
      onError: () => {},
    });
    expect(analyzer).toBeDefined();
  });

  it('generates high AI probability when voice_clone scenario is selected', () => {
    const analyzer = new SecurityStreamAnalyzer('call-clone-999', {
      onTelemetryResult: () => {},
      onError: () => {},
    });

    analyzer.setScenario('voice_clone');
    const payload = analyzer.generateWindowPayload();

    expect(payload).toBeDefined();
    expect(payload.ai_generated_probability).toBeGreaterThan(0.85);
    expect(payload.speaker_match_probability).toBeLessThan(0.4);
    expect(payload.liveness_probability).toBeLessThan(0.4);
    expect(payload.detected_artifacts).toContain('spectral_discontinuity');
  });

  it('generates low AI probability and high speaker match when normal scenario is selected', () => {
    const analyzer = new SecurityStreamAnalyzer('call-normal-111', {
      onTelemetryResult: () => {},
      onError: () => {},
    });

    analyzer.setScenario('normal');
    const payload = analyzer.generateWindowPayload();

    expect(payload).toBeDefined();
    expect(payload.ai_generated_probability).toBeLessThan(0.15);
    expect(payload.speaker_match_probability).toBeGreaterThan(0.85);
    expect(payload.liveness_probability).toBeGreaterThan(0.9);
  });
});
