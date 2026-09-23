export interface WebRTCCallbacks {
  onRemoteStream?: (stream: MediaStream) => void;
  onIceCandidate?: (candidate: RTCIceCandidateInit) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  onIceConnectionStateChange?: (state: RTCIceConnectionState) => void;
  onSignalingStateChange?: (state: RTCSignalingState) => void;
  onError?: (error: string) => void;
}

export interface WebRTCConnectionStats {
  localAudioTrackExists: boolean;
  localTrackEnabled: boolean;
  localTrackReadyState: string;
  remoteTrackReceived: boolean;
  remoteStreamReceived: boolean;
  peerConnectionState: RTCPeerConnectionState | 'uninitialized';
  connectionState?: string;
  iceConnectionState: RTCIceConnectionState | 'uninitialized';
  iceGatheringState: RTCIceGathererState | 'uninitialized';
  signalingState: RTCSignalingState | 'uninitialized';
  audioSendersCount: number;
  audioReceiversCount: number;
  senders?: Array<{ id: string; kind: string; muted: boolean }>;
  receivers?: Array<{ id: string; kind: string }>;
  inboundBytesReceived?: number;
  inboundPacketsReceived?: number;
  inboundPacketsLost?: number;
  jitter?: number;
  outboundBytesSent?: number;
  outboundPacketsSent?: number;
  roundTripTime?: number;
  audioCodec?: string;
  candidateType?: string;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export class WebRTCConnection {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private callbacks: WebRTCCallbacks;
  private isMuted: boolean = false;
  private pendingCandidates: RTCIceCandidateInit[] = [];

  constructor(callbacks: WebRTCCallbacks) {
    this.callbacks = callbacks;
  }

  public async initialize(): Promise<MediaStream> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
        video: false,
      });

      this.pc = new RTCPeerConnection(RTC_CONFIG);

      // Add local audio tracks to peer connection
      this.localStream.getAudioTracks().forEach((track) => {
        if (this.pc && this.localStream) {
          this.pc.addTrack(track, this.localStream);
        }
      });

      this.pc.onicecandidate = (event) => {
        if (event.candidate) {
          this.callbacks.onIceCandidate?.(event.candidate.toJSON());
        }
      };

      this.pc.ontrack = (event) => {
        let stream = (event.streams && event.streams[0]) || null;
        if (!stream && event.track) {
          stream = new MediaStream([event.track]);
        }
        if (stream) {
          this.remoteStream = stream;
          this.callbacks.onRemoteStream?.(stream);
        }
        if (event.track) {
          event.track.onunmute = () => {
            if (this.remoteStream) {
              this.callbacks.onRemoteStream?.(this.remoteStream);
            }
          };
        }
      };

      this.pc.onconnectionstatechange = () => {
        if (this.pc) {
          this.callbacks.onConnectionStateChange?.(this.pc.connectionState);
        }
      };

      this.pc.oniceconnectionstatechange = () => {
        if (this.pc) {
          this.callbacks.onIceConnectionStateChange?.(this.pc.iceConnectionState);
        }
      };

      this.pc.onsignalingstatechange = () => {
        if (this.pc) {
          this.callbacks.onSignalingStateChange?.(this.pc.signalingState);
        }
      };

      return this.localStream;
    } catch (err: any) {
      const msg = err.name === 'NotAllowedError'
        ? 'Microphone access was denied. Please allow microphone permissions.'
        : `Microphone capture failed: ${err.message || 'Device error'}`;
      this.callbacks.onError?.(msg);
      throw new Error(msg);
    }
  }

  public async createOffer(): Promise<string> {
    if (!this.pc) throw new Error('WebRTC not initialized');
    const offer = await this.pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: false,
    });
    await this.pc.setLocalDescription(offer);
    return offer.sdp || '';
  }

  public async handleOffer(sdp: string): Promise<string> {
    if (!this.pc) throw new Error('WebRTC not initialized');
    await this.pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }));
    await this.drainPendingCandidates();
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return answer.sdp || '';
  }

  public async handleAnswer(sdp: string): Promise<void> {
    if (!this.pc) throw new Error('WebRTC not initialized');
    await this.pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }));
    await this.drainPendingCandidates();
  }

  public async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.pc) return;
    if (!this.pc.remoteDescription) {
      // Buffer early ICE candidate until remote description is applied
      this.pendingCandidates.push(candidate);
      return;
    }
    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e: any) {
      console.warn('Error adding ICE candidate:', e.message);
    }
  }

  private async drainPendingCandidates(): Promise<void> {
    if (!this.pc || !this.pc.remoteDescription) return;
    const queued = [...this.pendingCandidates];
    this.pendingCandidates = [];
    for (const cand of queued) {
      try {
        await this.pc.addIceCandidate(new RTCIceCandidate(cand));
      } catch (e: any) {
        console.warn('Error adding queued ICE candidate:', e.message);
      }
    }
  }

  public async getConnectionStats(): Promise<WebRTCConnectionStats> {
    const localTrack = this.localStream?.getAudioTracks()[0] || null;
    const remoteTrack = this.remoteStream?.getAudioTracks()[0] || null;
    const sendersList = this.pc
      ? this.pc.getSenders().map((s) => ({
          id: s.track?.id || 'audio-out',
          kind: s.track?.kind || 'audio',
          muted: s.track?.muted || false,
        }))
      : [];
    const receiversList = this.pc
      ? this.pc.getReceivers().map((r) => ({
          id: r.track?.id || 'audio-in',
          kind: r.track?.kind || 'audio',
        }))
      : [];

    let inboundBytes = 0;
    let inboundPackets = 0;
    let inboundLost = 0;
    let jitter = 0;
    let outboundBytes = 0;
    let outboundPackets = 0;
    let rtt = 0;
    let candidateType = 'host';

    if (this.pc) {
      try {
        const stats = await this.pc.getStats();
        stats.forEach((report: any) => {
          if (report.type === 'inbound-rtp' && report.kind === 'audio') {
            inboundBytes = report.bytesReceived || 0;
            inboundPackets = report.packetsReceived || 0;
            inboundLost = report.packetsLost || 0;
            jitter = report.jitter || 0;
          } else if (report.type === 'outbound-rtp' && report.kind === 'audio') {
            outboundBytes = report.bytesSent || 0;
            outboundPackets = report.packetsSent || 0;
          } else if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            rtt = report.currentRoundTripTime || 0;
          } else if (report.type === 'local-candidate') {
            candidateType = report.candidateType || 'host';
          }
        });
      } catch {
        // Stats parsing fallback
      }
    }

    const pState = this.pc ? this.pc.connectionState : 'uninitialized';
    const iceState = this.pc ? this.pc.iceConnectionState : 'uninitialized';

    return {
      localAudioTrackExists: !!localTrack,
      localTrackEnabled: localTrack ? localTrack.enabled : false,
      localTrackReadyState: localTrack ? localTrack.readyState : 'missing',
      remoteTrackReceived: !!remoteTrack,
      remoteStreamReceived: !!this.remoteStream,
      peerConnectionState: pState,
      connectionState: pState,
      iceConnectionState: iceState,
      iceGatheringState: this.pc ? this.pc.iceGatheringState : 'uninitialized',
      signalingState: this.pc ? this.pc.signalingState : 'uninitialized',
      audioSendersCount: sendersList.length,
      audioReceiversCount: receiversList.length,
      senders: sendersList,
      receivers: receiversList,
      inboundBytesReceived: inboundBytes,
      inboundPacketsReceived: inboundPackets,
      inboundPacketsLost: inboundLost,
      jitter,
      outboundBytesSent: outboundBytes,
      outboundPacketsSent: outboundPackets,
      roundTripTime: rtt,
      audioCodec: 'Opus / 48kHz (DTLS-SRTP)',
      candidateType,
    };
  }

  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  public getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  public toggleMute(): boolean {
    if (!this.localStream) return false;
    this.isMuted = !this.isMuted;
    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = !this.isMuted;
    });
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public cleanup(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    this.pendingCandidates = [];
    this.remoteStream = null;
  }
}

