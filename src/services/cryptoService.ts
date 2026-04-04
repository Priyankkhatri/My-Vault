/**
 * cryptoService.ts — Zero-Knowledge Encryption Engine
 *
 * Implements client-side encryption using Web Crypto API.
 * - Key derivation: PBKDF2 (600,000 iterations, SHA-256)
 * - Encryption: AES-256-GCM (random 12-byte IV per operation)
 * - Master password and derived key are NEVER stored persistently
 *
 * This module is used by both vaultService and MasterPasswordContext.
 */

// ─── Constants ─────────────────────────────────────────────────

const PBKDF2_ITERATIONS = 600_000;
const SALT_LENGTH = 16;    // bytes
const IV_LENGTH = 12;      // bytes (standard for AES-GCM)
const KEY_CHECK_PLAINTEXT = 'my-vault-key-verification-v1';

// ─── Buffer ↔ Base64 Utilities ─────────────────────────────────

export function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Zeroes out a Uint8Array to prevent sensitive data from lingering in memory.
 */
export function zeroOut(array: Uint8Array | ArrayBuffer | null): void {
  if (!array) return;
  const view = (array instanceof ArrayBuffer) ? new Uint8Array(array) : array;
  view.fill(0);
}

// ─── Salt Generation ───────────────────────────────────────────

export function generateSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  return bufferToBase64(salt.buffer);
}

// ─── Key Derivation ────────────────────────────────────────────

/**
 * Derives an AES-256-GCM key from a master password using PBKDF2.
 * The salt MUST be the same for the same user across all sessions.
 *
 * @param masterPassword - User's master password (never stored)
 * @param saltBase64 - Base64-encoded 16-byte salt (stored in user_encryption_meta)
 * @returns CryptoKey suitable for AES-GCM encrypt/decrypt
 */
export async function deriveKey(
  masterPassword: string,
  saltBase64: string
): Promise<CryptoKey> {
  const encoder = new TextEncoder();

  // Import the password as a raw key for PBKDF2
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(masterPassword),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const saltBuffer = base64ToBuffer(saltBase64);

  // Derive AES-256-GCM key
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,              // NOT extractable — key stays in Web Crypto
    ['encrypt', 'decrypt']
  );
}

// ─── Encryption ────────────────────────────────────────────────

/**
 * Encrypts a JavaScript object using AES-256-GCM.
 * Generates a random 12-byte IV for each encryption operation.
 *
 * @param data - Object to encrypt (will be JSON.stringify'd)
 * @param key - CryptoKey derived from master password
 * @returns { encrypted: base64, iv: base64 }
 */
export async function encrypt(
  data: object,
  key: CryptoKey
): Promise<{ encrypted: string; iv: string }> {
  const encoder = new TextEncoder();
  const plaintext = encoder.encode(JSON.stringify(data));
  
  // Audited: Secure random IV per-user per-encryption
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  try {
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      plaintext
    );

    return {
      encrypted: bufferToBase64(ciphertext),
      iv: bufferToBase64(iv.buffer),
    };
  } finally {
    // Zero out sensitive plaintext buffer immediately after use
    zeroOut(plaintext);
  }
}

// ─── Decryption ────────────────────────────────────────────────

/**
 * Decrypts an AES-256-GCM ciphertext back to a JavaScript object.
 *
 * @param encryptedBase64 - Base64-encoded ciphertext
 * @param ivBase64 - Base64-encoded IV used during encryption
 * @param key - CryptoKey derived from master password
 * @returns The decrypted object
 * @throws Error if key is wrong or data is corrupted
 */
export async function decrypt(
  encryptedBase64: string,
  ivBase64: string,
  key: CryptoKey
): Promise<Record<string, unknown>> {
  const ciphertext = base64ToBuffer(encryptedBase64);
  const iv = base64ToBuffer(ivBase64);

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  const decoder = new TextDecoder();
  return JSON.parse(decoder.decode(plaintext));
}

// ─── Key Verification ──────────────────────────────────────────

/**
 * Generates a "key check" value — an encrypted known string.
 * This is stored in user_encryption_meta so we can verify
 * whether the user entered the correct master password
 * WITHOUT storing the password or key itself.
 */
export async function generateKeyCheck(key: CryptoKey): Promise<string> {
  const { encrypted, iv } = await encrypt(
    { check: KEY_CHECK_PLAINTEXT },
    key
  );
  return JSON.stringify({ encrypted, iv });
}

/**
 * Verifies that a key can decrypt the stored key check.
 * Returns true if the master password is correct.
 */
export async function verifyKeyCheck(
  key: CryptoKey,
  keyCheckJson: string
): Promise<boolean> {
  try {
    const { encrypted, iv } = JSON.parse(keyCheckJson);
    const decrypted = await decrypt(encrypted, iv, key) as { check: string };
    return decrypted.check === KEY_CHECK_PLAINTEXT;
  } catch {
    // Decryption failure = wrong key
    return false;
  }
}
