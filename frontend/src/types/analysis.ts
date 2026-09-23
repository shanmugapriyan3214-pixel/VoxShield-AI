export interface AudioAnalysisResponse {
  analysis_id: string;
  status: string;
  classification: 'LIKELY_HUMAN' | 'LIKELY_AI_GENERATED' | 'SUSPICIOUS' | 'UNKNOWN' | string;
  ai_probability: number;
  human_probability: number;
  speaker_match_score?: number | null;
  liveness_score?: number | null;
  synthetic_artifact_level?: 'LOW' | 'MEDIUM' | 'HIGH' | string;
  detected_artifacts?: string[];
  prosody_anomaly_score?: number | null;
  confidence_score?: number | null;
  voice_trust_score?: number | null;
  audio_quality?: {
    is_acceptable: boolean;
    quality_score: number;
    status: string;
    duration_sec: number;
    issues: string[];
  } | null;
  signals?: {
    spectral?: string;
    prosody?: string;
    synthetic_artifacts?: string;
    temporal_consistency?: string;
    voice_consistency?: string;
  } | null;
  replay_suspicion?: number | null;
  evidence_summary?: string | null;
  model_version: string;
  is_mock: boolean;
  created_at: string;
  warning?: string | null;
  diagnostics?: {
    weights_applied?: Record<string, number>;
    raw_scores?: Record<string, number>;
    snr_db?: number;
    clipping_ratio?: number;
    disagreement?: number;
    model_consensus?: string;
    bounded_range?: [number, number];
    [key: string]: any;
  } | null;
  disclaimer?: string | null;
}

export interface SpeakerComparisonResult {
  speaker_match_score: number;
  confidence: number;
  is_match: boolean;
  threshold_used: number;
  engine_type: string;
  model_name?: string | null;
  model_version: string;
  inference_time_ms?: number | null;
  is_mock: boolean;
  analysis_id: string;
  timestamp: string;
}
