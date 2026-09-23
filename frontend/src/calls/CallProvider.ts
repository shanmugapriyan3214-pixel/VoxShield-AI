/**
 * VoxShield AI — Platform-Neutral Call Provider Abstraction
 *
 * Defines the contract for initiating, managing, and terminating audio calls.
 * Web uses WebRTC / WebSockets.
 * Future Android implements this interface with native Telecom / WebRTC Android SDK.
 */

import { Call, CallState } from '../types/domain';

export interface CallCallbacks {
  onStateChange?: (state: CallState) => void;
  onRemoteStream?: (stream: MediaStream) => void;
  onError?: (errorMessage: string) => void;
  onCallEnded?: () => void;
}

export interface CallProvider {
  /**
   * Initiate an outgoing voice call to target (User ID, VoxShield ID, or username).
   */
  startCall(targetRecipient: string): Promise<Call>;

  /**
   * Accept an incoming call session.
   */
  acceptCall(callId: string): Promise<Call>;

  /**
   * Reject an incoming call session.
   */
  rejectCall(callId: string): Promise<void>;

  /**
   * Terminate active call session.
   */
  endCall(callId: string): Promise<void>;

  /**
   * Toggle audio microphone mute.
   */
  setMuted(muted: boolean): void;

  /**
   * Toggle speakerphone / earpiece audio route.
   */
  setSpeaker(speakerOn: boolean): void;

  /**
   * Get current call state.
   */
  getCallState(): CallState;

  /**
   * Clean up media streams and sockets.
   */
  dispose(): void;
}
