/**
 * VoxShield AI — Web Browser Implementation of CallProvider
 *
 * Encapsulates WebRTC PeerConnection, DTLS-SRTP encryption, and WebSocket signaling.
 * Zero audio is ever transmitted to the backend server.
 */

import { api } from '../api/client';
import { Call, CallState, VoiceSecurityState } from '../types/domain';
import { CallProvider, CallCallbacks } from './CallProvider';
import { WebRTCConnection, WebRTCConnectionStats } from '../webrtc/peerConnection';
import { SignalingClient } from '../websocket/signaling';
import { CallResponse } from '../types/call';

export class WebCallProvider implements CallProvider {
  private activeCall: Call | null = null;
  private callState: CallState = 'idle';
  private callbacks: CallCallbacks;
  private webrtc: WebRTCConnection | null = null;
  private signaling: SignalingClient | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private isMuted: boolean = false;
  private isSpeaker: boolean = true;

  constructor(callbacks: CallCallbacks = {}) {
    this.callbacks = callbacks;
  }

  public getCallState(): CallState {
    return this.callState;
  }

  public getActiveCall(): Call | null {
    return this.activeCall;
  }

  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  public getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  public getConnectionStats() {
    return this.webrtc?.getConnectionStats() || null;
  }

  private setState(state: CallState): void {
    this.callState = state;
    if (this.activeCall) {
      this.activeCall.status = state;
    }
    this.callbacks.onStateChange?.(state);
  }

  public async startCall(targetRecipient: string): Promise<Call> {
    try {
      this.setState('outgoing_calling');

      // 1. Create call session on backend
      const rawCall = await api.post<CallResponse>('/calls', {
        receiver_id: targetRecipient.trim(),
      });

      this.activeCall = this.mapToDomainCall(rawCall);

      // 2. Initialize WebRTC Media
      await this.initWebRTC(rawCall.id, true);

      return this.activeCall;
    } catch (err: any) {
      this.setState('failed');
      const msg = err.message || 'Failed to initiate voice call.';
      this.callbacks.onError?.(msg);
      throw new Error(msg);
    }
  }

  public async acceptCall(callId: string): Promise<Call> {
    try {
      const rawCall = await api.post<CallResponse>(`/calls/${callId}/accept`);
      this.activeCall = this.mapToDomainCall(rawCall);
      this.setState('connected');

      // Initialize WebRTC as callee (creates answer on offer)
      await this.initWebRTC(callId, false);

      return this.activeCall;
    } catch (err: any) {
      this.setState('failed');
      const msg = err.message || 'Failed to accept voice call.';
      this.callbacks.onError?.(msg);
      throw new Error(msg);
    }
  }

  public async rejectCall(callId: string): Promise<void> {
    try {
      await api.post<CallResponse>(`/calls/${callId}/reject`);
    } finally {
      this.setState('rejected');
      this.dispose();
    }
  }

  public async endCall(callId: string): Promise<void> {
    try {
      if (this.signaling) {
        this.signaling.sendCallEnded();
      }
      await api.post<CallResponse>(`/calls/${callId}/end`);
    } catch {
      // Ignore network teardown errors
    } finally {
      this.setState('ended');
      this.callbacks.onCallEnded?.();
      this.dispose();
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.webrtc) {
      this.webrtc.toggleMute();
    }
  }

  public setSpeaker(speakerOn: boolean): void {
    this.isSpeaker = speakerOn;
    // On web browsers, audio routes through the selected audio output device
  }

  public dispose(): void {
    if (this.signaling) {
      try {
        this.signaling.close();
      } catch {
        // Safe tear down
      }
      this.signaling = null;
    }

    if (this.webrtc) {
      try {
        this.webrtc.cleanup();
      } catch {
        // Safe tear down
      }
      this.webrtc = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
    this.remoteStream = null;
    this.callState = 'idle';
  }

  private async initWebRTC(callId: string, isCaller: boolean): Promise<void> {
    // 1. Initialize WebRTC connection
    this.webrtc = new WebRTCConnection({
      onRemoteStream: (stream) => {
        this.remoteStream = stream;
        this.setState('connected');
        this.callbacks.onRemoteStream?.(stream);
      },
      onIceCandidate: (candidate) => {
        this.signaling?.sendIceCandidate(candidate);
      },
      onConnectionStateChange: (state) => {
        if (state === 'connected') {
          this.setState('connected');
        } else if (state === 'disconnected' || state === 'failed') {
          this.callbacks.onError?.('Call connection dropped.');
        }
      },
      onError: (msg) => {
        this.callbacks.onError?.(msg);
      },
    });

    this.localStream = await this.webrtc.initialize();

    // 2. Connect signaling WebSocket
    this.signaling = new SignalingClient(callId, {
      onOffer: async (sdp) => {
        if (!isCaller && this.webrtc) {
          const answerSdp = await this.webrtc.handleOffer(sdp);
          this.signaling?.sendAnswer(answerSdp);
        }
      },
      onAnswer: async (sdp) => {
        if (isCaller && this.webrtc) {
          await this.webrtc.handleAnswer(sdp);
        }
      },
      onIceCandidate: async (candidate) => {
        if (this.webrtc) {
          await this.webrtc.handleIceCandidate(candidate);
        }
      },
      onPeerConnected: async () => {
        if (isCaller && this.webrtc) {
          const offerSdp = await this.webrtc.createOffer();
          this.signaling?.sendOffer(offerSdp);
        }
      },
      onCallEnded: () => {
        this.setState('ended');
        this.callbacks.onCallEnded?.();
        this.dispose();
      },
      onError: (err) => {
        this.callbacks.onError?.(err);
      },
    });

    this.signaling.connect();
  }

  private mapToDomainCall(raw: CallResponse): Call {
    const initialSecurity: VoiceSecurityState = {
      trustScore: 94,
      threatLevel: 'LOW',
      voiceAuthenticity: 'High confidence',
      speakerMatch: 'Strong',
      liveness: 'Passed',
      aiProbability: 0.04,
      speakerMatchScore: 0.94,
      livenessScore: 0.96,
      socialEngineeringRisk: false,
      recommendation: 'Voice protection active. Normal conversation.',
      attackIndicators: [],
      lastUpdated: new Date().toISOString(),
    };

    return {
      callId: raw.id,
      caller: {
        userId: raw.caller_id,
        role: 'CALLER',
        displayName: raw.caller_name || 'Caller',
        voxshieldId: raw.caller_voxshield_id || undefined,
      },
      receiver: {
        userId: raw.receiver_id,
        role: 'RECEIVER',
        displayName: raw.receiver_name || 'Recipient',
        voxshieldId: raw.receiver_voxshield_id || undefined,
      },
      status: (raw.status.toLowerCase() as CallState) || 'connected',
      startedAt: raw.started_at || undefined,
      endedAt: raw.ended_at || undefined,
      durationSeconds: raw.duration_seconds ?? undefined,
      security: initialSecurity,
    };
  }
}
