import { describe, it, expect } from 'vitest';
import { SecurityStreamAnalyzer } from '../security/streamAnalyzer';

describe('Zero-Server-Audio Privacy Invariant Enforcement', () => {
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

    // Verify permitted metadata types
    expect(typeof reportObj.window_index).toBe('number');
    expect(typeof reportObj.ai_generated_probability).toBe('number');
    expect(typeof reportObj.speaker_match_probability).toBe('number');
    expect(typeof reportObj.liveness_probability).toBe('number');
    expect(Array.isArray(reportObj.detected_artifacts)).toBe(true);
  });
});
