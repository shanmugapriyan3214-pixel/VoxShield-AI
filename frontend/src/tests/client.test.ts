import { describe, it, expect, beforeEach } from 'vitest';
import {
  getAccessToken,
  setTokens,
  clearTokens,
  getStoredRefreshToken,
} from '../api/client';
import { TokenPair } from '../types/auth';

describe('Auth Token Management', () => {
  beforeEach(() => {
    clearTokens();
  });

  it('stores and retrieves access and refresh tokens correctly', () => {
    const mockTokens: TokenPair = {
      access_token: 'mock-access-token-xyz',
      refresh_token: 'mock-refresh-token-123',
      token_type: 'Bearer',
      expires_in: 3600,
    };

    expect(getAccessToken()).toBeNull();

    setTokens(mockTokens);
    expect(getAccessToken()).toBe('mock-access-token-xyz');
    expect(getStoredRefreshToken()).toBe('mock-refresh-token-123');

    clearTokens();
    expect(getAccessToken()).toBeNull();
    expect(getStoredRefreshToken()).toBeNull();
  });
});
