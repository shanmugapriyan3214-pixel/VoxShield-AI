import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getAccessToken,
  setTokens,
  clearTokens,
  getStoredRefreshToken,
  ApiClientError,
  api,
} from '../api/client';
import { TokenPair } from '../types/auth';

describe('API Client & Token Management', () => {
  beforeEach(() => {
    clearTokens();
    vi.restoreAllMocks();
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

  it('instantiates ApiClientError with correct status and message', () => {
    const error = new ApiClientError('Unauthorized access', 'UNAUTHORIZED', 401, [
      { field: 'token', message: 'Token expired' },
    ]);

    expect(error.name).toBe('ApiClientError');
    expect(error.message).toBe('Unauthorized access');
    expect(error.status).toBe(401);
    expect(error.code).toBe('UNAUTHORIZED');
    expect(error.details).toHaveLength(1);
  });

  it('appends query parameters cleanly without trailing characters', async () => {
    // Mock global fetch
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { status: 'ok' } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await api.get('/threats', {
      params: { severity: 'HIGH', limit: 25, offset: 0 },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = fetchMock.mock.calls[0][0];
    expect(calledUrl).toContain('severity=HIGH');
    expect(calledUrl).toContain('limit=25');
    expect(calledUrl).toContain('offset=0');
  });

  it('throws ApiClientError when response is not ok', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Resource not found' },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(api.get('/nonexistent')).rejects.toThrow('Resource not found');
  });
});
