/**
 * supabaseClient.js
 * Lightweight Supabase REST client for the extension.
 * Uses plain fetch() — no npm dependency needed.
 */

// SUPABASE_URL and SUPABASE_ANON_KEY are now provided by the global CONFIG object.
// Ensure CONFIG is loaded BEFORE this script (e.g. via importScripts).

const SUPABASE_URL = (typeof CONFIG !== 'undefined' ? CONFIG.SUPABASE_URL : '');
const SUPABASE_ANON_KEY = (typeof CONFIG !== 'undefined' ? CONFIG.SUPABASE_ANON_KEY : '');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[SupabaseClient] Warning: CONFIG.SUPABASE_URL or SUPABASE_ANON_KEY is missing.');
}

/**
 * Make authenticated REST API calls to Supabase PostgREST.
 * @param {string} method - HTTP method (GET, POST, PATCH, DELETE)
 * @param {string} path - PostgREST path, e.g. "/rest/v1/vault_items?user_id=eq.abc"
 * @param {object|null} body - Request body for POST/PATCH
 * @param {string} accessToken - Supabase JWT access token
 * @returns {Promise<{data: any, error: string|null, status: number}>}
 */
async function supabaseRequest(method, path, body, accessToken) {
  const url = SUPABASE_URL + path;

  const headers = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": "Bearer " + (accessToken || SUPABASE_ANON_KEY),
    "Content-Type": "application/json",
    "Prefer": method === "POST" ? "return=representation" : "return=minimal"
  };

  // For GET requests, we want the result as JSON
  if (method === "GET") {
    headers["Accept"] = "application/json";
  }

  const options = { method, headers };

  if (body && (method === "POST" || method === "PATCH")) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      let errorMsg = "Request failed with status " + response.status;
      try {
        const errBody = await response.json();
        errorMsg = errBody.message || errBody.msg || errBody.error || errorMsg;
      } catch (_) {}
      return { data: null, error: errorMsg, status: response.status };
    }

    // DELETE and some PATCH return 204 No Content
    if (response.status === 204) {
      return { data: null, error: null, status: 204 };
    }

    const data = await response.json();
    return { data, error: null, status: response.status };
  } catch (err) {
    return { data: null, error: err.message || "Network error", status: 0 };
  }
}

/**
 * Call Supabase Auth REST endpoints.
 * @param {string} endpoint - Auth path, e.g. "/auth/v1/token?grant_type=password"
 * @param {object} body - Request body
 * @returns {Promise<{data: any, error: string|null}>}
 */
async function supabaseAuth(endpoint, body) {
  const url = SUPABASE_URL + endpoint;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        data: null,
        error: data.error_description || data.msg || data.message || "Auth request failed"
      };
    }

    return { data, error: null };
  } catch (err) {
    return { data: null, error: err.message || "Network error" };
  }
}

// Global export for service worker
if (typeof self !== "undefined") {
  self.supabaseRequest = supabaseRequest;
  self.supabaseAuth = supabaseAuth;
}
