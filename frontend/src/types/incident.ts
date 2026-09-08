export type IncidentStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE';

export interface IncidentResponse {
  id: string;
  incident_number: string;
  user_id: string;
  call_id?: string | null;
  incident_type: string;
  severity: string;
  threat_score: number;
  ai_probability: number;
  speaker_match_score?: number | null;
  liveness_score?: number | null;
  summary: string;
  indicators: string[];
  recommendations: string[];
  canonical_hash?: string | null;
  status: IncidentStatus;
  created_at: string;
  updated_at: string;
  is_anchored: boolean;
}

export interface IncidentCreate {
  call_id?: string;
  incident_type: string;
  severity: string;
  threat_score: number;
  ai_probability: number;
  speaker_match_score?: number;
  liveness_score?: number;
  summary: string;
  indicators?: string[];
  recommendations?: string[];
}

export interface IncidentUpdate {
  summary?: string;
  status?: IncidentStatus;
}

export interface BlockchainReceipt {
  incident_id: string;
  canonical_hash: string;
  network: string;
  contract_address?: string | null;
  transaction_hash: string;
  block_number: number;
  status: string;
  anchored_at: string;
}

export interface BlockchainVerificationResult {
  incident_id: string;
  current_recomputed_hash: string;
  stored_canonical_hash: string;
  on_chain_hash?: string | null;
  transaction_hash?: string | null;
  block_number?: number | null;
  network: string;
  verification_status: 'VERIFIED' | 'TAMPERED' | 'UNANCHORED' | string;
  is_valid: boolean;
  verified_at: string;
}
