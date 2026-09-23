/**
 * VoxShield AI — Platform-Neutral Domain Models
 *
 * These models define core business entities and security states independently
 * of any platform-specific implementation (Browser / React / Future Native Android).
 */

export type CallState =
  | 'idle'
  | 'outgoing_calling'
  | 'incoming_ringing'
  | 'connected'
  | 'ended'
  | 'rejected'
  | 'failed';

export type ThreatLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface User {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  avatarUrl?: string | null;
  voxshieldId: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt?: string;
}

export interface Contact {
  id: string;
  ownerUserId: string;
  trustedUserId?: string | null;
  displayName: string;
  relationship: string;
  voxshieldId?: string | null;
  voiceProfileId?: string | null;
  status: 'VERIFIED' | 'PENDING' | 'REVOKED';
  isFavorite?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CallParticipant {
  userId: string;
  role: 'CALLER' | 'RECEIVER';
  displayName?: string;
  voxshieldId?: string;
  joinedAt?: string;
}

export interface VoiceSecurityState {
  trustScore: number;                 // 0 to 100 continuous score
  threatLevel: ThreatLevel;           // LOW | MEDIUM | HIGH | CRITICAL
  voiceAuthenticity: 'High confidence' | 'Moderate confidence' | 'Ambiguous' | 'Synthetic speech traits';
  speakerMatch: 'Strong' | 'Moderate' | 'Mismatch' | 'Not established';
  liveness: 'Passed' | 'Marginal' | 'Replay risk';
  aiProbability: number;              // 0.0 to 1.0 (from AASIST-L)
  speakerMatchScore: number | null;   // 0.0 to 1.0 (from ECAPA-TDNN)
  livenessScore: number | null;       // 0.0 to 1.0 (from Local DSP)
  socialEngineeringRisk: boolean;
  recommendation: string;
  attackIndicators: string[];
  lastUpdated: string;
}

export interface Call {
  callId: string;
  caller: CallParticipant;
  receiver: CallParticipant;
  status: CallState;
  startedAt?: string | null;
  endedAt?: string | null;
  durationSeconds?: number;
  security: VoiceSecurityState;
}

export interface VerificationChallenge {
  challengeId: string;
  callId: string;
  passphrase: string;
  prompt: string;
  expiresAt: string;
  status: 'PENDING' | 'VERIFIED' | 'FAILED' | 'EXPIRED';
}

export interface SecurityIncident {
  id: string;
  incidentNumber: string;
  callId: string;
  severity: ThreatLevel;
  threatScore: number;
  canonicalHash: string;
  blockchainTxHash?: string | null;
  createdAt: string;
}
