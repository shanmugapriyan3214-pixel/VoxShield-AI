import { ApiResponse, ApiError } from '../types/api';
import { TokenPair } from '../types/auth';
import { getApiBaseUrl } from '../platform/capacitor';

// Platform-aware base URL resolution:
// - Web browser: '/api/v1' (uses Vite dev proxy, existing behavior)
// - Android native: 'http://10.0.2.2:8000/api/v1' (emulator host alias)
// - Explicit env var: always takes priority on any platform
const BASE_URL = getApiBaseUrl();

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
  technicalDetails?: string;

  constructor(
    message: string,
    code = 'REQUEST_ERROR',
    status = 400,
    details: Array<{ field?: string; message: string }> = [],
    technicalDetails?: string
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.technicalDetails = technicalDetails;
  }
}

export interface ServerHealthStatus {
  isHealthy: boolean;
  status: 'CONNECTED' | 'OFFLINE' | 'CHECKING';
  service?: string;
  version?: string;
  details?: string;
  lastChecked: Date;
}

/**
 * Lightweight server connectivity probe.
 * Does not spam console errors if offline.
 */
export async function checkServerHealth(): Promise<ServerHealthStatus> {
  const healthEndpoint = BASE_URL.startsWith('http')
    ? `${BASE_URL}/health`
    : '/api/v1/health';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(healthEndpoint, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json().catch(() => null);
      return {
        isHealthy: true,
        status: 'CONNECTED',
        service: data?.data?.service || 'VoxShield AI Defense Core',
        version: data?.data?.version || '1.0.0',
        lastChecked: new Date(),
      };
    }
    return {
      isHealthy: false,
      status: 'OFFLINE',
      details: `Server returned HTTP ${res.status}`,
      lastChecked: new Date(),
    };
  } catch (err: any) {
    return {
      isHealthy: false,
      status: 'OFFLINE',
      details: 'Unable to connect to the VOXSHIELD security server. Please make sure the backend is running.',
      lastChecked: new Date(),
    };
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
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
    const rawMessage = err.message || '';
    const isNetwork =
      rawMessage.toLowerCase().includes('failed to fetch') ||
      rawMessage.toLowerCase().includes('network') ||
      rawMessage.toLowerCase().includes('econnrefused') ||
      rawMessage.toLowerCase().includes('abort');

    const friendlyMessage = isNetwork
      ? 'Unable to connect to the VOXSHIELD security server. Please make sure the backend is running.'
      : (err.message || 'Network connection failed');

    throw new ApiClientError(
      friendlyMessage,
      isNetwork ? 'NETWORK_ERROR' : 'REQUEST_ERROR',
      0,
      [],
      rawMessage
    );
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
  postFormData: <T>(endpoint: string, formData: FormData) =>
    request<T>(endpoint, {
      method: 'POST',
      body: formData,
    }),
};
