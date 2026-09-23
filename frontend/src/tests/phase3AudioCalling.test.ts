import { describe, it, expect, vi } from 'vitest';
import { ClientStreamAnalyzer } from '../security/streamAnalyzer';
import { WebRTCConnection } from '../webrtc/peerConnection';

describe('Phase 3 — Audio Calling & False Positive Elimination (Frontend Tests)', () => {
  it('Scenario 1 & 2: ClientStreamAnalyzer produces human baseline telemetry without false alarms', () => {
    const onTelemetry = vi.fn();
    const analyzer = new ClientStreamAnalyzer('call-test-123', {
      onTelemetryResult: onTelemetry,
    });

    // Baseline live conversational voice without attack scenario
    analyzer.setScenario('normal');
    const payload = analyzer.generateWindowPayload();

    expect(payload.ai_generated_probability).toBeLessThanOrEqual(0.08);
    expect(payload.speaker_match_probability).toBeGreaterThanOrEqual(0.90);
    expect(payload.liveness_probability).toBeGreaterThanOrEqual(0.90);
    expect(payload.detected_artifacts).toEqual([]);
  });

  it('Scenario 3: ClientStreamAnalyzer correctly flags voice clone and synthetic attack scenarios', () => {
    const analyzer = new ClientStreamAnalyzer('call-test-123', {
      onTelemetryResult: vi.fn(),
    });

    // Voice clone attack scenario
    analyzer.setScenario('voice_clone');
    const clonePayload = analyzer.generateWindowPayload();

    expect(clonePayload.ai_generated_probability).toBeGreaterThan(0.85);
    expect(clonePayload.detected_artifacts).toContain('voice_clone_impersonation');

    // Synthetic spoof scenario
    analyzer.setScenario('synthetic_spoof');
    const spoofPayload = analyzer.generateWindowPayload();
    expect(spoofPayload.ai_generated_probability).toBeGreaterThan(0.80);
    expect(spoofPayload.detected_artifacts).toContain('vocoder_phase_discontinuity');
  });

  it('Scenario 8 & 9: WebRTCConnection reports complete connection stats schema', async () => {
    const rtc = new WebRTCConnection({
      onRemoteStream: vi.fn(),
      onIceCandidate: vi.fn(),
    });

    const stats = await rtc.getConnectionStats();

    expect(stats).toHaveProperty('localAudioTrackExists');
    expect(stats).toHaveProperty('peerConnectionState');
    expect(stats).toHaveProperty('iceConnectionState');
    expect(stats).toHaveProperty('signalingState');
    expect(stats).toHaveProperty('audioSendersCount');
    expect(stats).toHaveProperty('audioReceiversCount');
    expect(stats).toHaveProperty('inboundBytesReceived');
    expect(stats).toHaveProperty('outboundBytesSent');
    expect(stats).toHaveProperty('audioCodec');
    expect(stats.audioCodec).toContain('Opus');
  });

  it('Scenario 10: ClientStreamAnalyzer live diagnostics exposes RMS and active speech state', () => {
    const analyzer = new ClientStreamAnalyzer('call-test-123', {
      onTelemetryResult: vi.fn(),
    });

    const diag = analyzer.getLiveDiagnostics();
    expect(diag).toHaveProperty('rms');
    expect(diag).toHaveProperty('spectralFlatness');
    expect(diag).toHaveProperty('isAudioActive');
    expect(diag).toHaveProperty('scenario');
    expect(diag.scenario).toBe('live');
  });
});
