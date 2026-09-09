export type EngineType =
  | 'REAL_PRETRAINED_MODEL'
  | 'LOCAL_DSP_ANALYZER'
  | 'MOCK_DEMO_MODEL'
  | 'ADAPTER_READY_NO_WEIGHTS'
  | 'UNAVAILABLE';

export interface ModelMetadata {
  model_name: string;
  name?: string;
  version: string;
  engine_type: EngineType;
  provenance?: EngineType;
  type?: string;
  engine?: string;
  framework: string;
  device: string;
  input_sample_rate: number;
  input_duration_sec: number;
  available: boolean;
  status: string;
  weights_installed?: boolean;
  weights_loaded?: boolean;
  inference_enabled?: boolean;
  inference_time_ms?: number | null;
  benchmark_avg_ms?: number | null;
  description?: string | null;
  model_path?: string | null;
  model_source?: string | null;
}

export interface ComponentStatus {
  available: boolean;
  status: string;
  model_name: string;
  model_version: string;
  device: string;
  engine_type: EngineType;
  framework: string;
}

export interface AIStatusResponse {
  status: string;
  mode: string;
  fallback_mode: string;
  device: string;
  streaming_window: {
    window_duration_sec: number;
    hop_duration_sec: number;
    sample_rate: number;
  };
  models: Record<string, ModelMetadata>;
  components: Record<string, ComponentStatus>;
  privacy_policy: Record<string, string>;
}
