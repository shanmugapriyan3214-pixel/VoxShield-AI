export interface VoiceProfileResponse {
  id: string;
  user_id: string;
  label: string;
  status: string;
  model_version: string;
  embedding_hash?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VoiceProfileCreate {
  label: string;
  model_version?: string;
}

export interface VoiceProfileUpdate {
  label?: string;
  status?: string;
}

export interface TrustedVoiceResponse {
  id: string;
  owner_user_id: string;
  trusted_user_id?: string | null;
  display_name: string;
  relationship: string;
  voice_profile_id?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface TrustedVoiceCreate {
  display_name: string;
  relationship: string;
  trusted_user_id?: string;
  voice_profile_id?: string;
}

export interface TrustedVoiceUpdate {
  display_name?: string;
  relationship?: string;
  voice_profile_id?: string;
  status?: string;
}
