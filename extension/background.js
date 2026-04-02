/**
 * My-Vault Extension — Background Service Worker
 *
 * Handles:
 * - Message routing between popup, content scripts, and backend
 * - Session management (auth tokens in chrome.storage.session)
 * - Auto-lock timer via chrome.alarms
 * - Badge updates showing vault status
 */

// ─── Config ─────────────────────────────────────────────────────

const API_BASE = 'http://localhost:3001/api';

// ─── Storage Keys ───────────────────────────────────────────────

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'vault_access_token',
  REFRESH_TOKEN: 'vault_refresh_token',
  VAULT_LOCKED: 'vault_locked',
};

// ─── Initialization ─────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  console.log('[My-Vault] Extension installed');
  chrome.storage.session.set({ [STORAGE_KEYS.VAULT_LOCKED]: true });
  updateBadge(true);
});

// ─── Auto-lock Timer ────────────────────────────────────────────

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'vault-auto-lock') {
    chrome.storage.session.set({ [STORAGE_KEYS.VAULT_LOCKED]: true });
    chrome.storage.session.remove([STORAGE_KEYS.ACCESS_TOKEN]);
    updateBadge(true);
    console.log('[My-Vault] Vault auto-locked');
  }
});

function resetAutoLockTimer() {
  chrome.alarms.clear('vault-auto-lock');
  chrome.alarms.create('vault-auto-lock', { delayInMinutes: 5 }); // 5 min auto-lock
}

// ─── Badge ──────────────────────────────────────────────────────

function updateBadge(locked) {
  chrome.action.setBadgeText({ text: locked ? '🔒' : '' });
  chrome.action.setBadgeBackgroundColor({ color: locked ? '#ef4444' : '#22c55e' });
}

// ─── Message Handler ────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse).catch((err) => {
    console.error('[My-Vault] Message handler error:', err);
    sendResponse({ success: false, error: err.message });
  });
  return true; // Keep channel open for async response
});

async function handleMessage(message, sender) {
  switch (message.type) {
    case 'GET_VAULT_STATUS': {
      const data = await chrome.storage.session.get(STORAGE_KEYS.VAULT_LOCKED);
      return { locked: data[STORAGE_KEYS.VAULT_LOCKED] !== false };
    }

    case 'UNLOCK_VAULT': {
      const { accessToken, refreshToken } = message;
      await chrome.storage.session.set({
        [STORAGE_KEYS.ACCESS_TOKEN]: accessToken,
        [STORAGE_KEYS.REFRESH_TOKEN]: refreshToken,
        [STORAGE_KEYS.VAULT_LOCKED]: false,
      });
      resetAutoLockTimer();
      updateBadge(false);
      return { success: true };
    }

    case 'LOCK_VAULT': {
      await chrome.storage.session.set({ [STORAGE_KEYS.VAULT_LOCKED]: true });
      await chrome.storage.session.remove([STORAGE_KEYS.ACCESS_TOKEN]);
      chrome.alarms.clear('vault-auto-lock');
      updateBadge(true);
      return { success: true };
    }

    case 'GET_CREDENTIALS_FOR_URL': {
      const { url } = message;
      return await fetchMatchingCredentials(url);
    }

    case 'SAVE_CREDENTIAL': {
      const { credential } = message;
      return await saveNewCredential(credential);
    }

    case 'GET_ACCESS_TOKEN': {
      const data = await chrome.storage.session.get(STORAGE_KEYS.ACCESS_TOKEN);
      return { token: data[STORAGE_KEYS.ACCESS_TOKEN] || null };
    }

    case 'ACTIVITY_PING': {
      resetAutoLockTimer();
      return { success: true };
    }

    default:
      return { success: false, error: `Unknown message type: ${message.type}` };
  }
}

// ─── API Helpers ────────────────────────────────────────────────

async function getAuthHeaders() {
  const data = await chrome.storage.session.get(STORAGE_KEYS.ACCESS_TOKEN);
  const token = data[STORAGE_KEYS.ACCESS_TOKEN];
  if (!token) throw new Error('Not authenticated');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

async function fetchMatchingCredentials(url) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/vault/items`, { headers });
    const data = await res.json();

    if (!data.success) return { credentials: [] };

    // We can only match by metadata since items are encrypted
    // In production, the backend would index domains for search
    const hostname = new URL(url).hostname.replace('www.', '');

    const matches = data.data.filter((item) => {
      const metadata = item.metadata || {};
      const title = (metadata.title || '').toLowerCase();
      return item.itemType === 'password' && title.includes(hostname);
    });

    return { credentials: matches };
  } catch (error) {
    console.error('[My-Vault] Credential fetch error:', error);
    return { credentials: [] };
  }
}

async function saveNewCredential(credential) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/vault/items`, {
      method: 'POST',
      headers,
      body: JSON.stringify(credential),
    });
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('[My-Vault] Save credential error:', error);
    return { success: false, error: error.message };
  }
}
