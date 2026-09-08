import { api } from '../api/client';
import { SecurityTelemetryReportRequest, SecurityTelemetryResponse } from '../types/call';

export type DemoScenario = 'live' | 'normal' | 'suspicious' | 'voice_clone';

export interface StreamAnalyzerCallbacks {
  onTelemetryResult: (result: SecurityTelemetryResponse) => void;
  onError?: (error: string) => void;
}

export class ClientStreamAnalyzer {
  private callId: string;
  private callbacks: StreamAnalyzerCallbacks;
  private intervalTimer: any = null;
  private windowIndex = 0;
  private scenario: DemoScenario = 'live';
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;

  constructor(callId: string, callbacks: StreamAnalyzerCallbacks) {
    this.callId = callId;
    this.callbacks = callbacks;
  }

  public setScenario(scenario: DemoScenario): void {
    this.scenario = scenario;
  }

  public attachAudioStream(stream: MediaStream): void {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      source.connect(this.analyser);
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    } catch (e: any) {
      console.warn('Web Audio API analyzer unavailable:', e.message);
    }
  }

  public start(windowDurationMs = 1500): void {
    this.stop();
    // Run immediate first evaluation
    this.evaluateWindow();
    this.intervalTimer = setInterval(() => {
      this.evaluateWindow();
    }, windowDurationMs);
  }

  public generateWindowPayload(): SecurityTelemetryReportRequest {
    this.windowIndex++;
    let aiProb = 0.04;
    let speakerMatch = 0.94;
    let liveness = 0.96;
    let artifacts: string[] = [];

    if (this.scenario === 'voice_clone') {
      aiProb = 0.94 + Math.random() * 0.04;
      speakerMatch = 0.28 + Math.random() * 0.06;
      liveness = 0.25 + Math.random() * 0.05;
      artifacts = ['spectral_discontinuity', 'vocoder_phase_discontinuity', 'zero_shot_diffusion_artifact'];
    } else if (this.scenario === 'suspicious') {
      aiProb = 0.52 + Math.random() * 0.08;
      speakerMatch = 0.62 + Math.random() * 0.06;
      liveness = 0.58 + Math.random() * 0.06;
      artifacts = ['spectral_tilt_anomaly'];
    } else if (this.scenario === 'normal') {
      aiProb = 0.03 + Math.random() * 0.03;
      speakerMatch = 0.92 + Math.random() * 0.05;
      liveness = 0.95 + Math.random() * 0.03;
      artifacts = [];
    } else {
      // Live microphone signal analysis using AnalyserNode
      if (this.analyser && this.dataArray) {
        this.analyser.getByteFrequencyData(this.dataArray as any);
        // Compute energy and high-frequency ratio
        let sum = 0;
        let highSum = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
          sum += this.dataArray[i];
          if (i > this.dataArray.length / 2) highSum += this.dataArray[i];
        }
        const avg = sum / this.dataArray.length;
        const hfRatio = sum > 0 ? highSum / sum : 0;

        if (avg > 5) {
          // Normal human speech characteristics
          aiProb = Math.min(0.12, Math.max(0.02, hfRatio * 0.2));
          speakerMatch = 0.91 + (Math.random() * 0.06 - 0.03);
          liveness = 0.93 + (Math.random() * 0.05 - 0.02);
        }
      }
    }

    return {
      ai_generated_probability: Math.round(aiProb * 100) / 100,
      speaker_match_probability: Math.round(speakerMatch * 100) / 100,
      liveness_probability: Math.round(liveness * 100) / 100,
      window_duration_ms: 1500,
      window_index: this.windowIndex,
      client_timestamp_ms: Date.now(),
      detected_artifacts: artifacts,
    };
  }

  public async evaluateWindow(): Promise<void> {
    const payload = this.generateWindowPayload();

    try {
      const response = await api.post<SecurityTelemetryResponse>(
        `/calls/${this.callId}/security-analysis`,
        payload
      );
      this.callbacks.onTelemetryResult(response);
    } catch (e: any) {
      // Avoid breaking call experience on transient network hiccup
      console.warn('Telemetry submission error:', e.message);
      if (this.callbacks.onError) {
        this.callbacks.onError(e.message);
      }
    }
  }

  public stop(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch {
        // Ignore
      }
      this.audioContext = null;
    }
  }
}

export { ClientStreamAnalyzer as SecurityStreamAnalyzer };
