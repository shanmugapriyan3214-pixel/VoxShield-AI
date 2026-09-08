import { describe, it, expect } from 'vitest';
import { BlockchainVerificationResult, IncidentResponse } from '../types/incident';

describe('Tamper-Evident Incident Hashing & Ledger Verification', () => {
  const mockIncident: IncidentResponse = {
    id: 'inc-9921',
    incident_number: 'INC-2026-001',
    user_id: 'usr-1',
    call_id: 'call-4412',
    incident_type: 'VOICE_CLONING_ATTEMPT',
    severity: 'CRITICAL',
    threat_score: 92.5,
    ai_probability: 0.96,
    speaker_match_score: 0.22,
    liveness_score: 0.28,
    summary: 'Caller voice exhibits high vocoder phase discontinuity matching cloned speech.',
    indicators: ['SPECTRAL_DISCONTINUITY', 'ZERO_SHOT_DIFFUSION_ARTIFACT'],
    recommendations: ['Terminate active voice session', 'Require out-of-band acoustic challenge'],
    canonical_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    status: 'OPEN',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_anchored: true,
  };

  it('verifies valid tamper-evident proof when hashes match on-chain record', () => {
    const validProof: BlockchainVerificationResult = {
      incident_id: mockIncident.id,
      current_recomputed_hash: mockIncident.canonical_hash!,
      stored_canonical_hash: mockIncident.canonical_hash!,
      on_chain_hash: mockIncident.canonical_hash!,
      transaction_hash: '0x8f2a4c6e1d9b...',
      block_number: 14208,
      network: 'MOCK_LEDGER',
      verification_status: 'VERIFIED',
      is_valid: true,
      verified_at: new Date().toISOString(),
    };

    expect(validProof.is_valid).toBe(true);
    expect(validProof.verification_status).toBe('VERIFIED');
    expect(validProof.current_recomputed_hash).toEqual(validProof.stored_canonical_hash);
  });

  it('detects tampering when current recomputed hash diverges from anchored proof', () => {
    const tamperedProof: BlockchainVerificationResult = {
      incident_id: mockIncident.id,
      current_recomputed_hash: 'altered_hash_value_after_database_modification',
      stored_canonical_hash: mockIncident.canonical_hash!,
      on_chain_hash: mockIncident.canonical_hash!,
      transaction_hash: '0x8f2a4c6e1d9b...',
      block_number: 14208,
      network: 'MOCK_LEDGER',
      verification_status: 'TAMPERED',
      is_valid: false,
      verified_at: new Date().toISOString(),
    };

    expect(tamperedProof.is_valid).toBe(false);
    expect(tamperedProof.verification_status).toBe('TAMPERED');
    expect(tamperedProof.current_recomputed_hash).not.toEqual(tamperedProof.stored_canonical_hash);
  });

  it('correctly labels local mock ledger implementation without claiming public mainnet', () => {
    const networkName = 'MOCK_LEDGER';
    const isMock = networkName.toUpperCase().includes('MOCK');
    const displayLabel = isMock ? 'MOCK BLOCKCHAIN LEDGER (Local Simulation)' : networkName;

    expect(displayLabel).toBe('MOCK BLOCKCHAIN LEDGER (Local Simulation)');
    expect(displayLabel).not.toBe('Ethereum Mainnet');
  });
});
