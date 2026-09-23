import { getAccessToken } from '../api/client';
import { getWsBaseUrl } from '../platform/capacitor';

export type SignalingMessageType =
  | 'ping'
  | 'pong'
  | 'offer'
  | 'answer'
  | 'ice_candidate'
  | 'peer_connected'
  | 'peer_disconnected'
  | 'peer_status'
  | 'call_ended'
  | 'error';

export interface SignalingFrame {
  type: SignalingMessageType;
  payload?: any;
  call_id?: string;
  sender_id?: string;
  user_id?: string;
  status?: string;
  message?: string;
}

export interface SignalingCallbacks {
  onOpen?: () => void;
  onPeerConnected?: (userId: string) => void;
  onPeerDisconnected?: (userId: string) => void;
  onPeerStatus?: (status: string, message?: string) => void;
  onOffer?: (sdp: string) => void;
  onAnswer?: (sdp: string) => void;
  onIceCandidate?: (candidate: RTCIceCandidateInit) => void;
  onCallEnded?: () => void;
  onError?: (errorMsg: string) => void;
  onClose?: () => void;
}

export class SignalingClient {
  private ws: WebSocket | null = null;
  private callId: string;
  private callbacks: SignalingCallbacks;
  private pingInterval: any = null;
  private reconnectTimer: any = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isIntentionallyClosed = false;

  constructor(callId: string, callbacks: SignalingCallbacks) {
    this.callId = callId;
    this.callbacks = callbacks;
  }

  public connect(): void {
    this.isIntentionallyClosed = false;
    const token = getAccessToken();
    if (!token) {
      this.callbacks.onError?.('Missing authentication token for signaling relay.');
      return;
    }

    const wsUrl = getWsBaseUrl();
    const fullUrl = `${wsUrl}/ws/signaling/${this.callId}?token=${encodeURIComponent(token)}`;

    try {
      this.ws = new WebSocket(fullUrl);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.callbacks.onOpen?.();
      };

      this.ws.onmessage = (event) => {
        try {
          const frame: SignalingFrame = JSON.parse(event.data);
          this.handleFrame(frame);
        } catch {
          // Ignore invalid JSON frame
        }
      };

      this.ws.onerror = () => {
        this.callbacks.onError?.('Signaling WebSocket connection error.');
      };

      this.ws.onclose = () => {
        this.stopHeartbeat();
        this.callbacks.onClose?.();
        if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
          this.reconnectAttempts++;
          this.reconnectTimer = setTimeout(() => this.connect(), delay);
        }
      };
    } catch {
      this.callbacks.onError?.('Failed to initialize WebSocket signaling.');
    }
  }

  private handleFrame(frame: SignalingFrame): void {
    switch (frame.type) {
      case 'pong':
        // Heartbeat confirmed
        break;
      case 'peer_connected':
        if (frame.user_id) this.callbacks.onPeerConnected?.(frame.user_id);
        break;
      case 'peer_disconnected':
        if (frame.user_id) this.callbacks.onPeerDisconnected?.(frame.user_id);
        break;
      case 'peer_status':
        if (frame.status) this.callbacks.onPeerStatus?.(frame.status, frame.message);
        break;
      case 'offer':
        if (frame.payload?.sdp) this.callbacks.onOffer?.(frame.payload.sdp);
        break;
      case 'answer':
        if (frame.payload?.sdp) this.callbacks.onAnswer?.(frame.payload.sdp);
        break;
      case 'ice_candidate':
        if (frame.payload) this.callbacks.onIceCandidate?.(frame.payload);
        break;
      case 'call_ended':
        this.callbacks.onCallEnded?.();
        break;
      case 'error':
        this.callbacks.onError?.(frame.message || 'Unknown signaling error');
        break;
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 20000);
  }

  private stopHeartbeat(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  public sendOffer(sdp: string): void {
    this.send({ type: 'offer', payload: { sdp } });
  }

  public sendAnswer(sdp: string): void {
    this.send({ type: 'answer', payload: { sdp } });
  }

  public sendIceCandidate(candidate: RTCIceCandidateInit): void {
    this.send({ type: 'ice_candidate', payload: candidate });
  }

  public sendCallEnded(): void {
    this.send({ type: 'call_ended' });
  }

  private send(msg: SignalingFrame): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  public close(): void {
    this.isIntentionallyClosed = true;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.sendCallEnded();
        this.ws.close();
      } catch {
        // Ignore
      }
      this.ws = null;
    }
  }
}
