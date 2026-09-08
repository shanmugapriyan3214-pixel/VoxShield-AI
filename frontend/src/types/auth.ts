export interface UserPrivate {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
}

export interface UserPublic {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  is_verified: boolean;
  created_at: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface AuthResponseData {
  user: UserPrivate;
  tokens: TokenPair;
}
