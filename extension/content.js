/**
 * My-Vault Extension — Content Script
 *
 * Injected into every page. Detects login forms and provides:
 * 1. Autofill overlay on password/email fields
 * 2. Credential capture on form submission
 * 3. Communication with background service worker
 */

// ─── State ──────────────────────────────────────────────────────

let overlayElement = null;
let activeField = null;
let isVaultLocked = true;

// ─── Initialization ─────────────────────────────────────────────

async function init() {
  const status = await chrome.runtime.sendMessage({ type: 'GET_VAULT_STATUS' });
  isVaultLocked = status?.locked !== false;

  if (!isVaultLocked) {
    observeForms();
    scanExistingForms();
  }
}

// ─── Form Detection ─────────────────────────────────────────────

const LOGIN_FIELD_SELECTORS = [
  'input[type="password"]',
  'input[type="email"]',
  'input[autocomplete="username"]',
  'input[autocomplete="email"]',
  'input[autocomplete="current-password"]',
  'input[autocomplete="new-password"]',
  'input[name*="user"]',
  'input[name*="email"]',
  'input[name*="login"]',
  'input[id*="user"]',
  'input[id*="email"]',
  'input[id*="login"]',
];

/**
 * Score how likely a form is a login form (0-100).
 */
function scoreLoginForm(form) {
  let score = 0;

  const inputs = form.querySelectorAll('input');
  const hasPassword = form.querySelector('input[type="password"]');
  const hasEmail = form.querySelector('input[type="email"]');
  const hasUsername = form.querySelector(
    'input[name*="user"], input[name*="login"], input[autocomplete="username"]'
  );

  if (hasPassword) score += 40;
  if (hasEmail || hasUsername) score += 30;
  if (inputs.length <= 5) score += 15; // Login forms are usually small
  if (form.querySelector('button[type="submit"], input[type="submit"]')) score += 15;

  // Check for signup indicators (lower score)
  const text = form.textContent.toLowerCase();
  if (text.includes('sign up') || text.includes('register') || text.includes('create account')) {
    score -= 10;
  }

  return Math.min(100, Math.max(0, score));
}

function scanExistingForms() {
  const forms = document.querySelectorAll('form');
  forms.forEach((form) => {
    const score = scoreLoginForm(form);
    if (score >= 40) {
      attachToForm(form);
    }
  });

  // Also check for password fields outside forms
  const orphanPasswords = document.querySelectorAll('input[type="password"]:not(form input)');
  orphanPasswords.forEach((field) => attachToField(field));
}

function observeForms() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        const el = node;

        // Check if the added node is or contains a form
        if (el.tagName === 'FORM') {
          if (scoreLoginForm(el) >= 40) attachToForm(el);
        }

        const forms = el.querySelectorAll ? el.querySelectorAll('form') : [];
        forms.forEach((form) => {
          if (scoreLoginForm(form) >= 40) attachToForm(form);
        });

        // Check for password fields
        const pwFields = el.querySelectorAll ? el.querySelectorAll('input[type="password"]') : [];
        pwFields.forEach((field) => attachToField(field));
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

// ─── Autofill Overlay ───────────────────────────────────────────

function attachToForm(form) {
  const passwordField = form.querySelector('input[type="password"]');
  const emailField = form.querySelector(
    'input[type="email"], input[name*="user"], input[name*="email"], input[autocomplete="username"]'
  );

  if (passwordField) attachToField(passwordField);
  if (emailField) attachToField(emailField);

  // Listen for form submission to capture credentials
  form.addEventListener('submit', () => handleFormSubmit(form), { once: true });
}

function attachToField(field) {
  if (field.dataset.vaultAttached) return;
  field.dataset.vaultAttached = 'true';

  // Add vault icon indicator
  const indicator = document.createElement('div');
  indicator.className = 'vault-field-indicator';
  indicator.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0d9488" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
  indicator.title = 'My-Vault — Secure Autofill';

  // Position relative to the field
  field.style.position = field.style.position || 'relative';
  const wrapper = document.createElement('div');
  wrapper.className = 'vault-field-wrapper';
  field.parentNode.insertBefore(wrapper, field);
  wrapper.appendChild(field);
  wrapper.appendChild(indicator);

  // Show overlay on focus
  field.addEventListener('focus', () => showOverlay(field));
  indicator.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    showOverlay(field);
  });
}

async function showOverlay(field) {
  removeOverlay();
  activeField = field;

  try {
    const url = window.location.href;
    const response = await chrome.runtime.sendMessage({
      type: 'GET_CREDENTIALS_FOR_URL',
      url,
    });

    if (!response?.credentials?.length) return;

    overlayElement = document.createElement('div');
    overlayElement.className = 'vault-autofill-overlay';
    overlayElement.innerHTML = `
      <div class="vault-overlay-header">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0d9488" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <span>Vault Directory</span>
      </div>
      <div class="vault-overlay-items">
        ${response.credentials.map((cred, i) => `
          <button class="vault-overlay-item" data-index="${i}">
            <div class="vault-overlay-item-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <div class="vault-overlay-item-text">
              <div class="vault-overlay-item-title">${cred.metadata?.title || 'Account'}</div>
              <div class="vault-overlay-item-sub">Click to autofill</div>
            </div>
            <span class="vault-overlay-fill-label">Fill</span>
          </button>
        `).join('')}
      </div>
      <div class="vault-overlay-footer">
        <span>⌨️ Tab to navigate</span>
      </div>
    `;

    // Position below the field
    const rect = field.getBoundingClientRect();
    overlayElement.style.top = `${rect.bottom + window.scrollY + 4}px`;
    overlayElement.style.left = `${rect.left + window.scrollX}px`;
    overlayElement.style.width = `${Math.max(280, rect.width)}px`;

    document.body.appendChild(overlayElement);

    // Handle clicks on items
    overlayElement.querySelectorAll('.vault-overlay-item').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        // In production, this would decrypt and fill the credential
        chrome.runtime.sendMessage({ type: 'ACTIVITY_PING' });
        removeOverlay();
      });
    });

    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', handleOutsideClick);
    }, 100);
  } catch (error) {
    console.error('[My-Vault] Overlay error:', error);
  }
}

function removeOverlay() {
  if (overlayElement) {
    overlayElement.remove();
    overlayElement = null;
  }
  document.removeEventListener('click', handleOutsideClick);
}

function handleOutsideClick(e) {
  if (overlayElement && !overlayElement.contains(e.target) && e.target !== activeField) {
    removeOverlay();
  }
}

// ─── Credential Capture ─────────────────────────────────────────

function handleFormSubmit(form) {
  const passwordField = form.querySelector('input[type="password"]');
  const emailField = form.querySelector(
    'input[type="email"], input[name*="user"], input[name*="email"]'
  );

  if (passwordField && passwordField.value) {
    // Notify background to show "Save this password?" prompt
    chrome.runtime.sendMessage({
      type: 'SAVE_CREDENTIAL',
      credential: {
        url: window.location.href,
        hostname: window.location.hostname,
        username: emailField?.value || '',
        // Note: in production, the password would be encrypted before sending
        title: document.title,
      },
    });
  }
}

// ─── Start ──────────────────────────────────────────────────────

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
