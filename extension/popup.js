/**
 * My-Vault Extension — Popup UI
 *
 * Mini vault interface shown when clicking the extension icon.
 * Features: lock screen, quick search, recent items, status badge.
 */

const app = document.getElementById('app');

// ─── State ──────────────────────────────────────────────────────

let isLocked = true;
let vaultItems = [];

// ─── Initialize ─────────────────────────────────────────────────

async function init() {
  const status = await chrome.runtime.sendMessage({ type: 'GET_VAULT_STATUS' });
  isLocked = status?.locked !== false;
  render();
}

// ─── Render ─────────────────────────────────────────────────────

function render() {
  if (isLocked) {
    renderLockScreen();
  } else {
    renderVault();
  }
}

function renderLockScreen() {
  app.innerHTML = `
    <div class="popup-lock-screen">
      <div class="popup-lock-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0d9488" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>
      <div class="popup-lock-title">My-Vault</div>
      <div class="popup-lock-sub">Authentication Required</div>
      <input type="password" class="popup-lock-input" id="masterPassword" placeholder="Master password" autofocus>
      <button class="popup-unlock-btn" id="unlockBtn">Unlock Vault</button>
      <div class="popup-encrypted-badge">
        <div class="popup-encrypted-dot"></div>
        AES-256 Encrypted
      </div>
    </div>
  `;

  document.getElementById('unlockBtn').addEventListener('click', handleUnlock);
  document.getElementById('masterPassword').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleUnlock();
  });
}

function renderVault() {
  app.innerHTML = `
    <div class="popup-header">
      <div class="popup-logo">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0d9488" stroke-width="2.5">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>
      <div>
        <div class="popup-title">My-Vault</div>
        <div class="popup-subtitle">Secure Cluster Sync</div>
      </div>
      <div class="popup-status unlocked">
        <div class="popup-status-dot"></div>
        Unlocked
      </div>
    </div>

    <div class="popup-search">
      <div class="popup-search-wrapper">
        <svg class="popup-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="text" id="searchInput" placeholder="Search vault...">
      </div>
    </div>

    <div class="popup-body" id="itemsList">
      <div style="text-align: center; padding: 40px 20px; color: #71717a;">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto 12px;">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <div style="font-size: 13px; font-weight: 500; color: #a1a1aa; margin-bottom: 4px;">Vault is ready</div>
        <div style="font-size: 11px;">Visit a login page to use autofill</div>
      </div>
    </div>

    <div class="popup-footer">
      <button class="popup-btn" id="lockBtn">
        Lock Terminal
      </button>
      <button class="popup-btn primary" id="openDashboard">
        Open Workspace
      </button>
    </div>
  `;

  document.getElementById('lockBtn').addEventListener('click', handleLock);
  document.getElementById('openDashboard').addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:5173' });
  });
}

// ─── Actions ────────────────────────────────────────────────────

async function handleUnlock() {
  const password = document.getElementById('masterPassword').value;
  if (!password) return;

  // In production, this would:
  // 1. Derive keys from password
  // 2. Send authHash to /api/auth/login
  // 3. Store access token via background service worker
  
  // For now, simulate unlock
  const result = await chrome.runtime.sendMessage({
    type: 'UNLOCK_VAULT',
    accessToken: 'demo-token',
    refreshToken: 'demo-refresh',
  });

  if (result?.success) {
    isLocked = false;
    render();
  }
}

async function handleLock() {
  await chrome.runtime.sendMessage({ type: 'LOCK_VAULT' });
  isLocked = true;
  render();
}

// ─── Start ──────────────────────────────────────────────────────

init();
