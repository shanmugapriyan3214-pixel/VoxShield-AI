/**
 * VoxShield AI — Android Voice Security Provider
 *
 * Android-native implementation of the VoiceSecurityProvider interface.
 * Currently delegates to WebVoiceSecurityProvider which uses the Web Audio API
 * for DSP analysis — this works in Android's Chromium WebView.
 *
 * Architecture:
 *   VoiceSecurityProvider (interface) ← WebVoiceSecurityProvider (web)
 *                                     ← AndroidVoiceSecurityProvider (this, delegates for now)
 *
 * Future native enhancements (do NOT implement yet):
 *   - Android AudioRecord API for low-latency PCM capture (bypassing WebView)
 *   - ONNX Runtime Mobile for on-device AASIST-L inference
 *   - ONNX Runtime Mobile for on-device ECAPA-TDNN speaker verification
 *   - Native DSP pipeline with 1.5s sliding window over Float32 PCM
 *   - Local-only inference with zero audio sent to network
 */

import { ThreatLevel, VerificationChallenge, VoiceSecurityState } from '../types/domain';
import { VoiceSecurityProvider, VoiceSecurityCallbacks } from '../security/VoiceSecurityProvider';
import { WebVoiceSecurityProvider } from '../security/WebVoiceSecurityProvider';

export class AndroidVoiceSecurityProvider implements VoiceSecurityProvider {
  private delegate: WebVoiceSecurityProvider;

  constructor(callbacks: VoiceSecurityCallbacks = {}) {
    this.delegate = new WebVoiceSecurityProvider(callbacks);
  }

  startSecuritySession(callId: string, stream?: MediaStream): void {
    this.delegate.startSecuritySession(callId, stream);
  }

  attachAudioStream(stream: MediaStream): void {
    this.delegate.attachAudioStream(stream);
  }

  getTrustScore(): number {
    return this.delegate.getTrustScore();
  }

  getThreatLevel(): ThreatLevel {
    return this.delegate.getThreatLevel();
  }

  getSecurityState(): VoiceSecurityState {
    return this.delegate.getSecurityState();
  }

  async requestVerification(callId: string): Promise<VerificationChallenge> {
    return this.delegate.requestVerification(callId);
  }

  async verifyResponse(callId: string, challengeId: string, phrase: string): Promise<boolean> {
    return this.delegate.verifyResponse(callId, challengeId, phrase);
  }

  endSecuritySession(): void {
    this.delegate.endSecuritySession();
  }

  // Expose delegate for components that need WebVoiceSecurityProvider-specific methods
  getWebProvider(): WebVoiceSecurityProvider {
    return this.delegate;
  }
}
