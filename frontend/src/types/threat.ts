export interface ThreatEventResponse {
  id: string;
  user_id: string;
  call_id?: string | null;
  event_type: string;
  severity: string;
  threat_score: number;
  ai_probability: number;
  speaker_match_score?: number | null;
  liveness_score?: number | null;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface ThreatSummaryResponse {
  total_events: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  average_threat_score: number;
}

export interface ThreatTimelineItem {
  period: string;
  count: number;
  average_score: number;
}

export interface ThreatTimelineResponse {
  timeline: ThreatTimelineItem[];
}
