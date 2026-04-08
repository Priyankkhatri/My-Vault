/**
 * authService.js
 * Manages Supabase authentication + master key for the extension.
 * Uses chrome.storage.local for token storage (persists across browser closes).
 * Master encryption key is held in memory ONLY — never persisted.
 */

var SESSION_STORAGE_KEY = "myvault_session";
var _cachedSession = null;
var _masterKey = null; // CryptoKey — held in memory ONLY, never stored

var authService = {
  /**
   * Sign in with email and password via Supabase Auth.
   */
  async signIn(email, password) {
    const result = await self.supabaseAuth(
      "/auth/v1/token?grant_type=password",
      { email, password }
    );

    if (result.error) {
      return { success: false, error: result.error };
    }

    const session = {
      access_token: result.data.access_token,
      refresh_token: result.data.refresh_token,
      expires_at: result.data.expires_at || (Math.floor(Date.now() / 1000) + result.data.expires_in),
      user: {
        id: result.data.user.id,
        email: result.data.user.email
      }
    };

    await this._saveSession(session);
    return { success: true, user: session.user };
  },

  /**
   * Import an already-authenticated session from the web app.
   */
  async importSession(session) {
    var normalized = this._normalizeSession(session);
    if (!normalized) {
      return { success: false, error: "Invalid session payload" };
    }

    var existingSession = await this.getSession();
    if (existingSession && existingSession.user.id !== normalized.user.id) {
      _masterKey = null;
      if (typeof self !== "undefined" && self.syncManager) {
        self.syncManager.clearCache();
      }
    }

    var verified = await this._verifySession(normalized.access_token);
    if (!verified.success) {
      if (this._isExpired(normalized)) {
        var refreshed = await this._refreshToken(normalized.refresh_token);
        if (refreshed) {
          return { success: true, user: refreshed.user };
        }
      }

      return { success: false, error: verified.error || "Session verification failed" };
    }

    normalized.user = {
      id: verified.user.id,
      email: verified.user.email || normalized.user.email || null
    };

    await this._saveSession(normalized);
    return { success: true, user: normalized.user };
  },

  /**
   * Sign out — clears all session data AND master key.
   */
  async signOut() {
    _cachedSession = null;
    _masterKey = null;
    try {
      await new Promise((resolve) => {
        chrome.storage.local.remove(SESSION_STORAGE_KEY, resolve);
      });
    } catch (_) {
      await self.storageService.remove(SESSION_STORAGE_KEY);
    }

    if (typeof self !== "undefined" && self.syncManager) {
      self.syncManager.clearCache();
    }
  },

  /**
   * Get the current Supabase session. Refreshes token if expired.
   */
  async getSession() {
    if (_cachedSession && !this._isExpired(_cachedSession)) {
      return _cachedSession;
    }

    let session = null;
    try {
      session = await new Promise((resolve) => {
        chrome.storage.local.get(SESSION_STORAGE_KEY, (result) => {
          resolve(result[SESSION_STORAGE_KEY] || null);
        });
      });
    } catch (_) {
      session = await self.storageService.get(SESSION_STORAGE_KEY);
    }

    if (!session) {
      _cachedSession = null;
      return null;
    }

    if (this._isExpired(session)) {
      const refreshed = await this._refreshToken(session.refresh_token);
      if (refreshed) return refreshed;
      await this.signOut();
      return null;
    }

    _cachedSession = session;
    return session;
  },

  async isAuthenticated() {
    const session = await this.getSession();
    return session !== null;
  },

  async getAccessToken() {
    const session = await this.getSession();
    return session ? session.access_token : null;
  },

  async getUserId() {
    const session = await this.getSession();
    return session ? session.user.id : null;
  },

  async getUser() {
    const session = await this.getSession();
    return session ? session.user : null;
  },

  // ─── Master Key Management ───

  /**
   * Set the master encryption key (in memory only).
   * @param {CryptoKey} key
   */
  setMasterKey(key) {
    _masterKey = key;
  },

  /**
   * Get the master encryption key.
   * @returns {CryptoKey|null}
   */
  getMasterKey() {
    return _masterKey;
  },

  /**
   * Clear the master key from memory (lock vault).
   */
  clearMasterKey() {
    _masterKey = null;
  },

  /**
   * Check if the master key is currently in memory.
   * @returns {boolean}
   */
  isMasterKeySet() {
    return _masterKey !== null;
  },

  /**
   * Lock: clears master key from memory.
   */
  lock() {
    _masterKey = null;
    _cachedSession = null;
  },

  // ─── Internal ───

  async _saveSession(session) {
    _cachedSession = session;
    try {
      await new Promise((resolve) => {
        chrome.storage.local.set({ [SESSION_STORAGE_KEY]: session }, resolve);
      });
    } catch (_) {
      await self.storageService.set(SESSION_STORAGE_KEY, session);
    }
  },

  _normalizeSession(session) {
    if (!session || typeof session !== "object") return null;

    var accessToken = typeof session.access_token === "string" ? session.access_token : "";
    var refreshToken = typeof session.refresh_token === "string" ? session.refresh_token : "";
    var expiresAt = Number(session.expires_at);
    var userId = session.user && typeof session.user.id === "string" ? session.user.id : "";
    var email = session.user && typeof session.user.email === "string"
      ? session.user.email
      : null;

    if (!accessToken || !refreshToken || !userId || !Number.isFinite(expiresAt)) {
      return null;
    }

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: Math.floor(expiresAt),
      user: {
        id: userId,
        email: email
      }
    };
  },

  _isExpired(session) {
    if (!session || !session.expires_at) return true;
    var now = Math.floor(Date.now() / 1000);
    return now >= (session.expires_at - 30);
  },

  async _verifySession(accessToken) {
    if (!accessToken) {
      return { success: false, error: "Missing access token" };
    }

    var result = await self.supabaseRequest("GET", "/auth/v1/user", null, accessToken);
    if (result.error || !result.data || !result.data.id) {
      return {
        success: false,
        error: result.error || "Session verification failed"
      };
    }

    return {
      success: true,
      user: {
        id: result.data.id,
        email: result.data.email || null
      }
    };
  },

  async _refreshToken(refreshToken) {
    if (!refreshToken) return null;

    var result = await self.supabaseAuth(
      "/auth/v1/token?grant_type=refresh_token",
      { refresh_token: refreshToken }
    );

    if (result.error || !result.data) {
      console.warn("[authService] Token refresh failed:", result.error);
      return null;
    }

    var session = {
      access_token: result.data.access_token,
      refresh_token: result.data.refresh_token,
      expires_at: result.data.expires_at || (Math.floor(Date.now() / 1000) + result.data.expires_in),
      user: {
        id: result.data.user.id,
        email: result.data.user.email
      }
    };

    await this._saveSession(session);
    return session;
  }
};

if (typeof self !== "undefined") {
  self.authService = authService;
}
