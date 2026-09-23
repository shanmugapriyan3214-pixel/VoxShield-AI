/**
 * VoxShield AI — Web Implementation of VoiceSecurityProvider
 *
 * Runs client-side DSP audio feature extraction (1.5s sliding window) using Web Audio API,
 * submits compact JSON telemetry to backend ThreatFusionEngine, and adapts the UI.
 * Strictly adheres to the ZERO-SERVER-AUDIO invariant.
 */

import { api } from '../api/client';
import { ThreatLevel, VerificationChallenge, VoiceSecurityState } from '../types/domain';
import { VoiceSecurityProvider, VoiceSecurityCallbacks } from './VoiceSecurityProvider';
import { ClientStreamAnalyzer, DemoScenario } from './streamAnalyzer';
import {
  ChallengeIssueRequest,
  ChallengeResponse,
  ChallengeVerificationResponse,
  SecurityTelemetryResponse,
} from '../types/call';

export class WebVoiceSecurityProvider implements VoiceSecurityProvider {
  private callId: string | null = null;
  private callbacks: VoiceSecurityCallbacks;
  private analyzer: ClientStreamAnalyzer | null = null;
  private currentState: VoiceSecurityState;

  constructor(callbacks: VoiceSecurityCallbacks = {}) {
    this.callbacks = callbacks;
    this.currentState = {
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
  }

  public getTrustScore(): number {
    return this.currentState.trustScore;
  }

  public getThreatLevel(): ThreatLevel {
    return this.currentState.threatLevel;
  }

  public getSecurityState(): VoiceSecurityState {
    return { ...this.currentState };
  }

  public setScenario(scenario: DemoScenario): void {
    if (this.analyzer) {
      this.analyzer.setScenario(scenario);
    }
  }

  public startSecuritySession(callId: string, stream?: MediaStream): void {
    this.callId = callId;
    this.analyzer = new ClientStreamAnalyzer(callId, {
      onTelemetryResult: (result: SecurityTelemetryResponse) => {
        this.updateFromTelemetry(result);
      },
      onError: (err: string) => {
        this.callbacks.onError?.(err);
      },
    });

    if (stream) {
      this.analyzer.attachAudioStream(stream);
    }

    this.analyzer.start(2000);
  }

  public attachAudioStream(stream: MediaStream): void {
    if (this.analyzer) {
      this.analyzer.attachAudioStream(stream);
    }
  }

  public async requestVerification(callId: string): Promise<VerificationChallenge> {
    try {
      const resp = await api.post<ChallengeResponse>(`/calls/${callId}/challenge`, {
        timeout_seconds: 60,
      } as ChallengeIssueRequest);

      const challenge: VerificationChallenge = {
        challengeId: resp.challenge_id,
        callId: resp.call_id,
        passphrase: resp.passphrase,
        prompt: resp.prompt,
        expiresAt: resp.expires_at,
        status: resp.status as any,
      };

      this.callbacks.onChallengeRequired?.(challenge);
      return challenge;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to issue verification challenge.');
    }
  }

  public async verifyResponse(
    callId: string,
    challengeId: string,
    phrase: string
  ): Promise<boolean> {
    try {
      const resp = await api.post<ChallengeVerificationResponse>(
        `/calls/${callId}/challenge/verify`,
        {
          challenge_id: challengeId,
          spoken_phrase: phrase,
          liveness_score: 0.95,
        }
      );

      if (resp.verified) {
        // Boost trust score
        this.currentState.trustScore = Math.min(100, this.currentState.trustScore + 25);
        this.currentState.threatLevel = 'LOW';
        this.currentState.recommendation = 'Caller identity verified via private challenge.';
        this.callbacks.onSecurityStateChange?.(this.getSecurityState());
      }

      return resp.verified;
    } catch (err: any) {
      throw new Error(err.message || 'Challenge verification failed.');
    }
  }

  public endSecuritySession(): void {
    if (this.analyzer) {
      this.analyzer.stop();
      this.analyzer = null;
    }
    this.callId = null;
  }

  private updateFromTelemetry(res: SecurityTelemetryResponse): void {
    const rawThreat = res.threat_score;
    // Calculate continuous trust score: 100 - threat_score
    const continuousTrust = Math.max(0, Math.min(100, Math.round(100 - rawThreat)));

    let threatLevel: ThreatLevel = 'LOW';
    if (rawThreat >= 75.0) threatLevel = 'CRITICAL';
    else if (rawThreat >= 50.0) threatLevel = 'HIGH';
    else if (rawThreat >= 25.0) threatLevel = 'MEDIUM';

    const aiProb = res.ai_probability ?? 0.04;
    let authenticity: VoiceSecurityState['voiceAuthenticity'] = 'High confidence';
    if (aiProb >= 0.70) authenticity = 'Synthetic speech traits';
    else if (aiProb >= 0.40) authenticity = 'Ambiguous';

    let speakerMatch: VoiceSecurityState['speakerMatch'] = 'Strong';
    if (res.speaker_match_score !== null && res.speaker_match_score !== undefined) {
      if (res.speaker_match_score < 0.50) speakerMatch = 'Mismatch';
      else if (res.speaker_match_score < 0.75) speakerMatch = 'Moderate';
    } else {
      speakerMatch = 'Not established';
    }

    let liveness: VoiceSecurityState['liveness'] = 'Passed';
    if (res.liveness_score !== null && res.liveness_score !== undefined) {
      if (res.liveness_score < 0.40) liveness = 'Replay risk';
      else if (res.liveness_score < 0.70) liveness = 'Marginal';
    }

    const previousThreatLevel = this.currentState.threatLevel;

    this.currentState = {
      trustScore: continuousTrust,
      threatLevel,
      voiceAuthenticity: authenticity,
      speakerMatch,
      liveness,
      aiProbability: aiProb,
      speakerMatchScore: res.speaker_match_score ?? null,
      livenessScore: res.liveness_score ?? null,
      socialEngineeringRisk: res.social_engineering_risk || false,
      recommendation: res.recommendation || 'Voice protection active.',
      attackIndicators: res.detected_artifacts || [],
      lastUpdated: new Date().toISOString(),
    };

    this.callbacks.onSecurityStateChange?.(this.getSecurityState());

    if (threatLevel !== 'LOW' && threatLevel !== previousThreatLevel) {
      this.callbacks.onThreatEscalation?.(threatLevel, this.currentState.recommendation);
    }
  }
}
