/**
 * API Client — HTTP layer for Vestiga Backend
 *
 * Handles:
 * - Base URL configuration
 * - JWT token management (auto-attaches Supabase session token)
 * - Standardized error handling
 */

import { supabase } from '../lib/supabase';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// ─── HTTP Methods ───────────────────────────────────────────────

interface RequestOptions {
  skipAuth?: boolean;
  signal?: AbortSignal;
}

async function getAccessToken(forceRefresh = false): Promise<string | null> {
  const authResult = forceRefresh
    ? await supabase.auth.refreshSession()
    : await supabase.auth.getSession();

  return authResult.data.session?.access_token ?? null;
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

  if (!options?.skipAuth) {
    const accessToken = await getAccessToken();
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
  }

  const performFetch = async (requestHeaders: Record<string, string>) => {
    return fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal: options?.signal,
    });
  };

  let res: Response;
  try {
    res = await performFetch(headers);
  } catch (err: any) {
    if (err.name === 'AbortError') {

    }
    return { success: false, error: err.message || 'Network error' };
  }

  if (res.status === 401 && !options?.skipAuth) {
    const refreshedToken = await getAccessToken(true);
    if (refreshedToken) {
      const retryHeaders = {
        ...headers,
        Authorization: `Bearer ${refreshedToken}`,
      };

      try {
        res = await performFetch(retryHeaders);
      } catch (err: any) {
        return { success: false, error: err.message || 'Network error' };
      }
    }
  }

  if (res.status === 401 && !options?.skipAuth) {
    await supabase.auth.signOut();
    return { success: false, error: 'Session expired. Please log in again.', status: 401 };
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
