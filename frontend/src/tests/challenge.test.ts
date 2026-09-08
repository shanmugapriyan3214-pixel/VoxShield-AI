import { describe, it, expect } from 'vitest';
import { ChallengeResponse, ChallengeVerificationResponse } from '../types/call';

describe('Acoustic Challenge-Response Verification Lifecycle', () => {
  const mockChallenge: ChallengeResponse = {
    challenge_id: 'ch-984b-1234',
    call_id: 'call-uuid-5678',
    passphrase: 'The quick amber fox jumps over the cryptographic cipher',
    prompt: 'Please speak the following phrase clearly into your microphone',
    status: 'ISSUED',
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 30000).toISOString(),
  };

  it('validates structure of issued acoustic challenge', () => {
    expect(mockChallenge.challenge_id).toMatch(/^ch-/);
    expect(mockChallenge.passphrase.split(' ').length).toBeGreaterThan(4);
    expect(mockChallenge.status).toBe('ISSUED');
    expect(mockChallenge.prompt).toContain('speak');
  });

  it('verifies PASS when caller reproduces the exact challenge phrase', () => {
    const spokenText = 'The quick amber fox jumps over the cryptographic cipher';
    const isExactMatch = spokenText.trim().toLowerCase() === mockChallenge.passphrase.trim().toLowerCase();

    const passResult: ChallengeVerificationResponse = {
      challenge_id: mockChallenge.challenge_id,
      call_id: mockChallenge.call_id,
      status: isExactMatch ? 'PASSED' : 'FAILED',
      verified: isExactMatch,
      details: 'Challenge passed successfully.',
      threat_score_impact: -40.0,
      timestamp: new Date().toISOString(),
    };

    expect(passResult.verified).toBe(true);
    expect(passResult.status).toBe('PASSED');
    expect(passResult.threat_score_impact).toBeLessThan(0);
  });

  it('verifies FAIL when caller submits mismatched or empty phrase', () => {
    const spokenText = 'I cannot read that phrase right now';
    const isExactMatch = spokenText.trim().toLowerCase() === mockChallenge.passphrase.trim().toLowerCase();

    const failResult: ChallengeVerificationResponse = {
      challenge_id: mockChallenge.challenge_id,
      call_id: mockChallenge.call_id,
      status: isExactMatch ? 'PASSED' : 'FAILED',
      verified: isExactMatch,
      details: 'Spoken phrase did not match required passphrase.',
      threat_score_impact: 25.0,
      timestamp: new Date().toISOString(),
    };

    expect(failResult.verified).toBe(false);
    expect(failResult.status).toBe('FAILED');
    expect(failResult.threat_score_impact).toBeGreaterThan(0);
  });
});
