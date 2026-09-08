export type CallStatus = 'INITIATED' | 'RINGING' | 'ACCEPTED' | 'ACTIVE' | 'REJECTED' | 'ENDED' | 'COMPLETED' | 'FAILED';

export interface CallResponse {
  id: string;
  caller_id: string;
  receiver_id: string;
  status: CallStatus;
  encryption_algorithm: string;
  termination_reason?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  created_at: string;
}

export interface CallInitiateRequest {
  receiver_id: string;
}

export interface SecurityTelemetryReportRequest {
  ai_generated_probability: number;
  speaker_match_probability?: number | null;
  liveness_probability?: number | null;
  window_duration_ms: number;
  window_index?: number;
  client_timestamp_ms?: number;
  detected_artifacts?: string[];
}

export type ThreatSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type RecommendedAction = 'CONTINUE_NORMAL' | 'DISPLAY_ADVISORY' | 'REQUIRE_VERIFICATION' | 'RECOMMEND_TERMINATION';

export interface SecurityTelemetryResponse {
  threat_score: number;
  severity: ThreatSeverity;
  recommended_action: RecommendedAction;
  recommendation: string;
  indicators: string[];
  call_terminated: boolean;
  event_id?: string | null;
  timestamp: string;
}

export interface CallSecurityEventResponse {
  id: string;
  call_id: string;
  reported_by_user_id: string;
  event_type: string;
  severity: ThreatSeverity;
  threat_score: number;
  ai_probability: number;
  speaker_match_score?: number | null;
  liveness_score?: number | null;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface ChallengeResponse {
  challenge_id: string;
  call_id: string;
  passphrase: string;
  prompt: string;
  expires_at: string;
  status: string;
  created_at: string;
}

export interface ChallengeVerificationResponse {
  challenge_id: string;
  call_id: string;
  status: string;
  verified: boolean;
  details: string;
  threat_score_impact: number;
  timestamp: string;
}
