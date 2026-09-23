/**
 * VoxShield AI — Platform-Neutral Voice Security Provider Abstraction
 *
 * Defines the contract for streaming local audio DSP telemetry, running
 * threat evaluations, and requesting adaptive verification challenges.
 */

import { ThreatLevel, VerificationChallenge, VoiceSecurityState } from '../types/domain';

export interface VoiceSecurityCallbacks {
  onSecurityStateChange?: (state: VoiceSecurityState) => void;
  onThreatEscalation?: (level: ThreatLevel, recommendation: string) => void;
  onChallengeRequired?: (challenge: VerificationChallenge) => void;
  onError?: (errorMessage: string) => void;
}

export interface VoiceSecurityProvider {
  /**
   * Start local background security session for an active call.
   */
  startSecuritySession(callId: string, stream?: MediaStream): void;

  /**
   * Attach audio stream (e.g. from local microphone or remote peer).
   */
  attachAudioStream(stream: MediaStream): void;

  /**
   * Get current continuous Voice Trust Score (0 to 100).
   */
  getTrustScore(): number;

  /**
   * Get current threat level (LOW | MEDIUM | HIGH | CRITICAL).
   */
  getThreatLevel(): ThreatLevel;

  /**
   * Get complete structured voice security posture.
   */
  getSecurityState(): VoiceSecurityState;

  /**
   * Issue an adaptive passphrase challenge when threat escalates.
   */
  requestVerification(callId: string): Promise<VerificationChallenge>;

  /**
   * Verify spoken passphrase response.
   */
  verifyResponse(callId: string, challengeId: string, phrase: string): Promise<boolean>;

  /**
   * End security monitoring session.
   */
  endSecuritySession(): void;
}
