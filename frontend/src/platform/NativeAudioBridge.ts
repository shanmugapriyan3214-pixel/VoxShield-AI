/**
 * VoxShield AI — Native Audio Bridge
 *
 * TypeScript interface and stub implementation for bridging to Android's
 * native AudioRecord API via a future Capacitor plugin.
 *
 * Current state: Falls back to Web Audio API (getUserMedia + AnalyserNode),
 * which works in Android's Chromium WebView.
 *
 * Future native implementation will:
 *   - Use Android AudioRecord for low-latency PCM capture (16kHz, mono, Float32)
 *   - Bypass WebView audio pipeline for direct hardware access
 *   - Provide real-time PCM buffers to the DSP stream analyzer
 *   - Support echo cancellation via Android's AcousticEchoCanceler
 *   - Support noise suppression via Android's NoiseSuppressor
 *
 * The native plugin will be registered as a Capacitor plugin:
 *   @capacitor/plugin({ name: 'VoxShieldAudio', ... })
 */

export interface AudioCaptureConfig {
  sampleRate: number;         // Target sample rate (default: 16000 Hz)
  channelCount: number;       // Mono = 1, Stereo = 2 (default: 1)
  bufferSizeMs: number;       // Buffer duration in ms (default: 100)
  echoCancellation: boolean;  // Enable echo cancellation
  noiseSuppression: boolean;  // Enable noise suppression
  autoGainControl: boolean;   // Enable automatic gain control
}

export interface AudioCaptureResult {
  isCapturing: boolean;
  sampleRate: number;
  channelCount: number;
  stream?: MediaStream;       // Available on web, null on native
}

export interface NativeAudioBridge {
  /**
   * Start audio capture from the device microphone.
   */
  startCapture(config?: Partial<AudioCaptureConfig>): Promise<AudioCaptureResult>;

  /**
   * Stop audio capture and release hardware resources.
   */
  stopCapture(): Promise<void>;

  /**
   * Get the current real-time audio level (RMS amplitude, 0.0 to 1.0).
   */
  getAudioLevel(): number;

  /**
   * Check if audio capture is currently active.
   */
  isCapturing(): boolean;
}

/**
 * Default audio capture configuration matching VoxShield's DSP requirements.
 */
export const DEFAULT_AUDIO_CONFIG: AudioCaptureConfig = {
  sampleRate: 16000,
  channelCount: 1,
  bufferSizeMs: 100,
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

/**
 * Web fallback implementation of NativeAudioBridge.
 * Uses the standard Web Audio API (getUserMedia + AnalyserNode).
 * This is what runs in both web browsers and Android WebView currently.
 */
export class WebAudioBridge implements NativeAudioBridge {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private timeDomainData: Float32Array | null = null;
  private currentLevel: number = 0;
  private capturing: boolean = false;

  async startCapture(config?: Partial<AudioCaptureConfig>): Promise<AudioCaptureResult> {
    const mergedConfig = { ...DEFAULT_AUDIO_CONFIG, ...config };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: mergedConfig.sampleRate,
          channelCount: mergedConfig.channelCount,
          echoCancellation: mergedConfig.echoCancellation,
          noiseSuppression: mergedConfig.noiseSuppression,
          autoGainControl: mergedConfig.autoGainControl,
        },
        video: false,
      });

      // Set up audio analysis for level metering
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
        const source = this.audioContext.createMediaStreamSource(this.stream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 512;
        source.connect(this.analyser);
        this.timeDomainData = new Float32Array(this.analyser.fftSize);
      }

      this.capturing = true;

      return {
        isCapturing: true,
        sampleRate: mergedConfig.sampleRate,
        channelCount: mergedConfig.channelCount,
        stream: this.stream,
      };
    } catch (err: any) {
      console.error('WebAudioBridge: Failed to start capture:', err.message);
      throw err;
    }
  }

  async stopCapture(): Promise<void> {
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      try {
        await this.audioContext.close();
      } catch {
        // Ignore close errors
      }
      this.audioContext = null;
    }
    this.analyser = null;
    this.timeDomainData = null;
    this.capturing = false;
    this.currentLevel = 0;
  }

  getAudioLevel(): number {
    if (!this.analyser || !this.timeDomainData) return 0;

    this.analyser.getFloatTimeDomainData(this.timeDomainData as any);
    let sumSquares = 0;
    for (let i = 0; i < this.timeDomainData.length; i++) {
      sumSquares += this.timeDomainData[i] * this.timeDomainData[i];
    }
    this.currentLevel = Math.sqrt(sumSquares / this.timeDomainData.length);
    return this.currentLevel;
  }

  isCapturing(): boolean {
    return this.capturing;
  }
}

/**
 * Create the appropriate audio bridge for the current platform.
 * Currently always returns WebAudioBridge (works in both web and Android WebView).
 * Future: return AndroidNativeAudioBridge when Capacitor plugin is available.
 */
export function createAudioBridge(): NativeAudioBridge {
  // TODO: When native Android AudioRecord plugin is implemented:
  // if (isAndroid()) return new AndroidNativeAudioBridge();
  return new WebAudioBridge();
}
