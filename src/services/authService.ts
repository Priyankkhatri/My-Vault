/**
 * Auth Service — Frontend Authentication Layer
 *
 * Handles:
 * - Registration (generate salt, derive keys, send authHash)
 * - Login (derive keys from stored salt, verify)
 * - Session management
 * - Encryption key lifecycle
 */

import { api, setTokens, clearTokens, loadStoredRefreshToken } from './apiClient';
import {
 initializeVault,
 unlockVault,
 type VaultCryptoSession,
 type KDFParams,
} from '../../packages/crypto/src/index';

let currentSession: VaultCryptoSession | null = null;
let currentSessionId: string | null = null;
let currentUser: { id: string; email: string } | null = null;
let kdfParams: KDFParams | null = null;

// ─── Public API ─────────────────────────────────────────────────

export async function register(email: string, password: string): Promise<{
 success: boolean;
 error?: string;
}> {
 try {
 // 1. Generate salt + derive keys client-side
 const { session, kdfParams: params } = await initializeVault(password);

 // 2. Send authHash (NOT password) to server
 const res = await api.post<{
 accessToken: string;
 refreshToken: string;
 user: { id: string; email: string };
 kdfParams: { salt: string; iterations: number };
 sessionId: string;
 }>('/auth/register', {
 email,
 authHash: session.authHash,
 salt: params.salt,
 kdfParams: { iterations: params.iterations },
 }, { skipAuth: true });

 if (!res.success || !res.data) {
 return { success: false, error: res.error || 'Registration failed' };
 }

 // 3. Store tokens + session
 setTokens(res.data.accessToken, res.data.refreshToken);
 currentSession = session;
 currentSessionId = res.data.sessionId;
 currentUser = res.data.user;
 kdfParams = params;

 return { success: true };
 } catch (error) {
 console.error('[Auth] Registration error:', error);
 return { success: false, error: 'Registration failed. Please try again.' };
 }
}

export async function login(email: string, password: string): Promise<{
 success: boolean;
 error?: string;
}> {
 try {
 // 1. First, we need the user's salt — try login with a preliminary request
 // In production, you'd have a /auth/salt endpoint. For now, derive and try.
 // The server will compare the bcrypt of our authHash against its stored hash.

 // For the first login attempt, we need stored KDF params.
 // Strategy: try to get salt from a pre-login endpoint, or use stored params.
 const storedSalt = localStorage.getItem(`vault_salt_${email}`);
 const storedIterations = localStorage.getItem(`vault_iterations_${email}`);

 if (!storedSalt) {
 // First time on this device — try a simple auth flow
 // The server will verify and return kdfParams on success
 return await loginWithSaltDiscovery(email, password);
 }

 const params: KDFParams = {
 salt: storedSalt,
 iterations: parseInt(storedIterations || '600000', 10),
 };

 // 2. Derive keys client-side
 const session = await unlockVault(password, params);

 // 3. Send authHash to server
 const res = await api.post<{
 accessToken: string;
 refreshToken: string;
 user: { id: string; email: string };
 kdfParams: { salt: string; iterations: number };
 sessionId: string;
 }>('/auth/login', {
 email,
 authHash: session.authHash,
 }, { skipAuth: true });

 if (!res.success || !res.data) {
 return { success: false, error: res.error || 'Invalid credentials' };
 }

 // 4. Store tokens + session
 setTokens(res.data.accessToken, res.data.refreshToken);
 currentSession = session;
 currentSessionId = res.data.sessionId;
 currentUser = res.data.user;
 kdfParams = params;

 // Cache salt for future logins on this device
 localStorage.setItem(`vault_salt_${email}`, res.data.kdfParams.salt);
 localStorage.setItem(`vault_iterations_${email}`, String(res.data.kdfParams.iterations));

 return { success: true };
 } catch (error) {
 console.error('[Auth] Login error:', error);
 return { success: false, error: 'Login failed. Please try again.' };
 }
}

/**
 * Login flow when salt is not cached locally.
 * Tries multiple iterations to find the right key derivation.
 */
async function loginWithSaltDiscovery(email: string, password: string) {
 // Get salt from server via a dedicated endpoint or try default params
 // For MVP, we'll use a simple approach: register creates the salt, login uses it
 const tempParams: KDFParams = { salt: '', iterations: 600000 };

 // Try to get user's salt from a pre-auth endpoint
 const saltRes = await api.post<{ salt: string; iterations: number }>(
 '/auth/salt',
 { email },
 { skipAuth: true }
 );

 if (saltRes.success && saltRes.data) {
 tempParams.salt = saltRes.data.salt;
 tempParams.iterations = saltRes.data.iterations;
 } else {
 return { success: false, error: 'Account not found. Please register first.' };
 }

 const session = await unlockVault(password, tempParams);
 const res = await api.post<{
 accessToken: string;
 refreshToken: string;
 user: { id: string; email: string };
 kdfParams: { salt: string; iterations: number };
 sessionId: string;
 }>('/auth/login', {
 email,
 authHash: session.authHash,
 }, { skipAuth: true });

 if (!res.success || !res.data) {
 return { success: false, error: res.error || 'Invalid credentials' };
 }

 setTokens(res.data.accessToken, res.data.refreshToken);
 currentSession = session;
 currentSessionId = res.data.sessionId;
 currentUser = res.data.user;
 kdfParams = tempParams;

 localStorage.setItem(`vault_salt_${email}`, res.data.kdfParams.salt);
 localStorage.setItem(`vault_iterations_${email}`, String(res.data.kdfParams.iterations));

 return { success: true };
}

export function logout() {
 const refreshToken = loadStoredRefreshToken();
 if (refreshToken) {
 api.post('/auth/logout', { refreshToken }).catch(() => {});
 }
 clearTokens();
 currentSession = null;
 currentSessionId = null;
 currentUser = null;
 kdfParams = null;
}

export function getEncryptionKey(): CryptoKey | null {
 return currentSession?.encryptionKey || null;
}

export function getCurrentUser() {
 return currentUser;
}

export function isAuthenticated() {
 return currentSession !== null && currentUser !== null;
}

export function getCurrentSessionId() {
 return currentSessionId;
}

/**
 * Try to restore session from stored refresh token.
 * Called on app startup.
 */
export async function restoreSession(): Promise<boolean> {
 const token = loadStoredRefreshToken();
 if (!token) return false;

 const res = await api.post<{
 accessToken: string;
 refreshToken: string;
 sessionId: string;
 }>('/auth/refresh', { refreshToken: token }, { skipAuth: true });

 if (res.success && res.data) {
 setTokens(res.data.accessToken, res.data.refreshToken);
 currentSessionId = res.data.sessionId;
 return true;
 }

 clearTokens();
 return false;
}

// ─── Account & Session Management ──────────────────────────────

export async function revokeOtherSessions(): Promise<boolean> {
  if (!currentSessionId) return false;
  const res = await api.delete('/devices', { currentSessionId } as any);
  return res.success;
}

export async function deleteAccountServerSide(): Promise<boolean> {
  const res = await api.delete('/auth/account');
  if (res.success) {
    logout();
    return true;
  }
  return false;
}

/**
 * Change Master Password
 * Flow: Derives new keys, tells server to update authHash, 
 * returns new session for caller to re-encrypt items.
 */
export async function changeMasterPasswordAuthPart(
  oldPassword: string, 
  newPassword: string
): Promise<{ success: boolean; error?: string; newSession?: VaultCryptoSession; newParams?: KDFParams }> {
  try {
    if (!currentSession || !currentUser || !kdfParams) return { success: false, error: 'Vault is locked' };

    // 1. Verify old password locally by re-deriving
    const oldDerived = await unlockVault(oldPassword, kdfParams);
    if (oldDerived.authHash !== currentSession.authHash) {
      return { success: false, error: 'Invalid current password' };
    }

    // 2. Derive new keys
    const { session: newSession, kdfParams: newParams } = await initializeVault(newPassword);

    // 3. Update server
    const res = await api.post('/auth/change-password', {
      oldAuthHash: currentSession.authHash,
      newAuthHash: newSession.authHash,
      salt: newParams.salt,
      kdfParams: { iterations: newParams.iterations },
    });

    if (!res.success) {
      return { success: false, error: res.error || 'Server rejected password change' };
    }

    // Return the new session so vault items can be re-encrypted
    return { success: true, newSession, newParams };
  } catch (error) {
    console.error('[Auth] Change password error:', error);
    return { success: false, error: 'Internal error during re-encryption' };
  }
}

export function updateSessionAfterPasswordChange(session: VaultCryptoSession, params: KDFParams) {
  currentSession = session;
  kdfParams = params;
  if (currentUser) {
    localStorage.setItem(`vault_salt_${currentUser.email}`, params.salt);
    localStorage.setItem(`vault_iterations_${currentUser.email}`, String(params.iterations));
  }
}
