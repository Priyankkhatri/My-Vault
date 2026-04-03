/**
 * API Client — HTTP layer for My-Vault Backend
 *
 * Handles:
 * - Base URL configuration
 * - JWT token management (auto-attach, auto-refresh)
 * - Standardized error handling
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

let accessToken: string | null = null;
let refreshToken: string | null = null;
let refreshPromise: Promise<boolean> | null = null;

// ─── Token Management ───────────────────────────────────────────

export function setTokens(access: string, refresh: string) {
 accessToken = access;
 refreshToken = refresh;
 localStorage.setItem('vault_refresh_token', refresh);
}

export function clearTokens() {
 accessToken = null;
 refreshToken = null;
 localStorage.removeItem('vault_refresh_token');
}

export function getAccessToken() {
 return accessToken;
}

export function loadStoredRefreshToken() {
 refreshToken = localStorage.getItem('vault_refresh_token');
 return refreshToken;
}

async function refreshAccessToken(): Promise<boolean> {
 if (!refreshToken) return false;

 // Deduplicate concurrent refresh calls
 if (refreshPromise) return refreshPromise;

 refreshPromise = (async () => {
 try {
 const res = await fetch(`${API_BASE}/auth/refresh`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ refreshToken }),
 });

 if (!res.ok) {
 clearTokens();
 return false;
 }

 const data = await res.json();
 if (data.success) {
 accessToken = data.data.accessToken;
 refreshToken = data.data.refreshToken;
 localStorage.setItem('vault_refresh_token', data.data.refreshToken);
 return true;
 }
 return false;
 } catch {
 return false;
 } finally {
 refreshPromise = null;
 }
 })();

 return refreshPromise;
}

// ─── HTTP Methods ───────────────────────────────────────────────

interface RequestOptions {
  skipAuth?: boolean;
  signal?: AbortSignal;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options?: RequestOptions
): Promise<{ success: boolean; data?: T; error?: string; status?: number }> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (!options?.skipAuth && accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: options?.signal,
    });
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.log(`[API] Request aborted: ${method} ${path}`);
    }
    return { success: false, error: err.message || 'Network error' };
  }

  // Auto-refresh on 401
  if (res.status === 401 && !options?.skipAuth && refreshToken) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${accessToken}`;
      try {
        res = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: options?.signal,
        });
      } catch (err: any) {
        return { success: false, error: err.message || 'Network error' };
      }
    } else {
      clearTokens();
      return { success: false, error: 'Session expired. Please log in again.', status: 401 };
    }
  }

  try {
    const data = await res.json();
    return { ...data, status: res.status };
  } catch {
    return { success: false, error: 'Network error', status: res.status };
  }
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>('GET', path, undefined, options),

  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('POST', path, body, options),

  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PUT', path, body, options),

  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>('DELETE', path, undefined, options),
};
