/**
 * VoxShield AI — Android Call Provider
 *
 * Android-native implementation of the CallProvider interface.
 * Currently delegates to WebCallProvider since WebRTC works natively in
 * Android's Chromium WebView. This is the correct initial architecture —
 * future iterations can swap to Android Telecom ConnectionService for
 * native SIM/VoIP calling without changing any consumer code.
 *
 * Architecture:
 *   CallProvider (interface) ← WebCallProvider (web)
 *                             ← AndroidCallProvider (this file, delegates to web for now)
 *
 * Future native enhancements (do NOT implement yet):
 *   - Android TelecomManager / ConnectionService for native call UI
 *   - Foreground Service for background call handling
 *   - CallAudioManager for hardware audio routing (earpiece/speaker/bluetooth)
 *   - Proximity sensor integration for screen-off during calls
 */

import { Call, CallState } from '../types/domain';
import { CallProvider, CallCallbacks } from '../calls/CallProvider';
import { WebCallProvider } from '../calls/WebCallProvider';

export class AndroidCallProvider implements CallProvider {
  private delegate: WebCallProvider;

  constructor(callbacks: CallCallbacks = {}) {
    // Delegate to the web implementation — WebRTC works in Android WebView
    this.delegate = new WebCallProvider(callbacks);
  }

  async startCall(targetRecipient: string): Promise<Call> {
    return this.delegate.startCall(targetRecipient);
  }

  async acceptCall(callId: string): Promise<Call> {
    return this.delegate.acceptCall(callId);
  }

  async rejectCall(callId: string): Promise<void> {
    return this.delegate.rejectCall(callId);
  }

  async endCall(callId: string): Promise<void> {
    return this.delegate.endCall(callId);
  }

  setMuted(muted: boolean): void {
    this.delegate.setMuted(muted);
  }

  setSpeaker(speakerOn: boolean): void {
    // TODO: Future native implementation will use Android AudioManager
    // to route audio between earpiece, speaker, and Bluetooth.
    this.delegate.setSpeaker(speakerOn);
  }

  getCallState(): CallState {
    return this.delegate.getCallState();
  }

  dispose(): void {
    this.delegate.dispose();
  }

  // Expose delegate for components that need WebCallProvider-specific methods
  getWebProvider(): WebCallProvider {
    return this.delegate;
  }
}
