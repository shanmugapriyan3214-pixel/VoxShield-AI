import { ApiResponse, ApiError } from '../types/api';
import { TokenPair } from '../types/auth';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

// Safe localStorage helpers for SSR / non-browser test runners
const getStorageItem = (key: string): string | null => {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  return null;
};

const setStorageItem = (key: string, val: string): void => {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(key, val);
    } catch {}
  }
};

const removeStorageItem = (key: string): void => {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(key);
    } catch {}
  }
};

// In-memory token management
let currentAccessToken: string | null = null;
let currentRefreshToken: string | null = getStorageItem('voxshield_refresh_token');

export const getAccessToken = (): string | null => currentAccessToken;

export const setTokens = (tokens: TokenPair): void => {
  currentAccessToken = tokens.access_token;
  currentRefreshToken = tokens.refresh_token;
  setStorageItem('voxshield_refresh_token', tokens.refresh_token);
};

export const clearTokens = (): void => {
  currentAccessToken = null;
  currentRefreshToken = null;
  removeStorageItem('voxshield_refresh_token');
};

export const getStoredRefreshToken = (): string | null => {
  return currentRefreshToken || getStorageItem('voxshield_refresh_token');
};

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

export class ApiClientError extends Error {
  code: string;
  status: number;
  details: Array<{ field?: string; message: string }>;

  constructor(message: string, code = 'REQUEST_ERROR', status = 400, details: Array<{ field?: string; message: string }> = []) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});

  headers.set('Content-Type', 'application/json');
  headers.set('X-Request-ID', `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);

  if (currentAccessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${currentAccessToken}`);
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  try {
    let response = await fetch(url, config);

    // Handle 401 Unauthorized with token refresh rotation
    if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
      const refreshToken = getStoredRefreshToken();
      if (!refreshToken) {
        clearTokens();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('voxshield:unauthorized'));
        }
        throw new ApiClientError('Session expired. Please log in again.', 'UNAUTHORIZED', 401);
      }

      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });

          if (refreshRes.ok) {
            const refreshJson: ApiResponse<{ tokens: TokenPair }> = await refreshRes.json();
            if (refreshJson.success && refreshJson.data) {
              setTokens(refreshJson.data.tokens);
              isRefreshing = false;
              onRefreshed(refreshJson.data.tokens.access_token);
            } else {
              throw new Error('Refresh rejected');
            }
          } else {
            throw new Error('Refresh failed');
          }
        } catch {
          isRefreshing = false;
          clearTokens();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('voxshield:unauthorized'));
          }
          throw new ApiClientError('Session expired. Please log in again.', 'UNAUTHORIZED', 401);
        }
      }

      // Wait for active refresh to complete
      const retryToken = await new Promise<string>((resolve) => {
        subscribeTokenRefresh((newToken) => resolve(newToken));
      });

      headers.set('Authorization', `Bearer ${retryToken}`);
      response = await fetch(url, { ...options, headers });
    }

    const json: ApiResponse<T> = await response.json().catch(() => {
      throw new ApiClientError(`Server responded with status ${response.status}`, 'HTTP_ERROR', response.status);
    });

    if (!response.ok || !json.success) {
      const errorMsg = json.error?.message || `Request failed with status ${response.status}`;
      const errorCode = json.error?.code || 'API_ERROR';
      const details = json.error?.details || [];
      throw new ApiClientError(errorMsg, errorCode, response.status, details);
    }

    return json.data as T;
  } catch (err: any) {
    if (err instanceof ApiClientError) {
      throw err;
    }
    throw new ApiClientError(err.message || 'Network connection failed', 'NETWORK_ERROR', 0);
  }
}

export const api = {
  get: <T>(endpoint: string, options?: { params?: Record<string, any>; headers?: HeadersInit }) => {
    let url = endpoint;
    if (options?.params) {
      const searchParams = new URLSearchParams();
      Object.entries(options.params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          searchParams.append(key, String(val));
        }
      });
      const qs = searchParams.toString();
      if (qs) {
        url += (url.includes('?') ? '&' : '?') + qs;
      }
    }
    return request<T>(url, { method: 'GET', headers: options?.headers });
  },
  post: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};
