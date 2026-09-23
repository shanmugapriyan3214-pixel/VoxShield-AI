/**
 * VoxShield AI — Platform Detection Utilities
 *
 * Provides runtime detection of the execution environment (Web Browser vs Capacitor Android).
 * Used throughout the application to select the correct provider implementations
 * and configure API URLs without breaking existing web functionality.
 */

import { Capacitor } from '@capacitor/core';

/**
 * Returns true when running inside a Capacitor native shell (Android/iOS).
 */
export function isNativePlatform(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * Returns true when running on Android (either Capacitor or mobile browser).
 */
export function isAndroid(): boolean {
  try {
    return Capacitor.getPlatform() === 'android';
  } catch {
    return false;
  }
}

/**
 * Returns true when running in a standard web browser (not native).
 */
export function isWeb(): boolean {
  try {
    return Capacitor.getPlatform() === 'web';
  } catch {
    return true; // Default to web if Capacitor is not available
  }
}

/**
 * Returns the current platform identifier string.
 */
export function getPlatformName(): 'android' | 'ios' | 'web' {
  try {
    return Capacitor.getPlatform() as 'android' | 'ios' | 'web';
  } catch {
    return 'web';
  }
}

/**
 * Resolves the correct backend API base URL based on the current platform.
 *
 * - Web browser: Uses the Vite proxy path `/api/v1` (existing behavior, zero change).
 * - Android emulator: Uses `http://10.0.2.2:8000/api/v1` (emulator alias for host localhost).
 * - Android device: Uses env-configured URL or falls back to emulator default.
 *
 * The VITE_API_URL / VITE_API_BASE_URL env vars always take priority if set.
 */
export function getApiBaseUrl(): string {
  // If an explicit env URL is provided, always use it (highest priority)
  const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
  if (envUrl && envUrl !== '/api/v1') {
    const trimmed = envUrl.replace(/\/+$/, '');
    return trimmed.endsWith('/api/v1') ? trimmed : `${trimmed}/api/v1`;
  }

  // On native platforms, we can't use the Vite dev proxy — need a real URL
  if (isNativePlatform()) {
    // Physical Android phone / emulator on Wi-Fi: connect to PC backend via LAN IP 10.43.204.209
    return 'http://10.43.204.209:8000/api/v1';
  }

  // Web browser: use the Vite proxy path (existing behavior)
  return '/api/v1';
}

export function getWsBaseUrl(): string {
  const envWsUrl = import.meta.env.VITE_WS_BASE_URL;
  if (envWsUrl) {
    const trimmed = envWsUrl.replace(/\/+$/, '');
    return trimmed.endsWith('/api/v1') ? trimmed : `${trimmed}/api/v1`;
  }

  const apiBase = getApiBaseUrl();
  if (apiBase.startsWith('http://') || apiBase.startsWith('https://')) {
    return apiBase.replace(/^http/, 'ws');
  }

  // Web fallback: use relative protocol + host
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/api/v1`;
}
