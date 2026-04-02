/**
 * Zero-Knowledge Key Derivation
 *
 * Uses PBKDF2 (Web Crypto native) with 600,000 iterations for key derivation.
 * The master password NEVER leaves the client.
 *
 * Flow:
 *   MasterPassword → PBKDF2(salt, 600K iters) → 64-byte MasterKey
 *   MasterKey → HKDF("vault-enc") → AES-256-GCM EncryptionKey
 *   MasterKey → HKDF("server-auth") → AuthKey → SHA-256 → AuthHash (sent to server)
 */

export interface KDFParams {
  salt: string; // base64-encoded 32-byte salt
  iterations: number;
}

export const DEFAULT_KDF_PARAMS: Omit<KDFParams, 'salt'> = {
  iterations: 600_000,
};

/** Generate a cryptographically random 32-byte salt */
export function generateSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(32));
  return uint8ToBase64(salt);
}

/** Derive encryption key + auth hash from master password */
export async function deriveKeys(
  password: string,
  params: KDFParams
): Promise<{
  encryptionKey: CryptoKey;
  authHash: string; // hex-encoded SHA-256 of authKey — sent to server
}> {
  const salt = base64ToUint8(params.salt);
  const encoder = new TextEncoder();

  // Import password as raw key material
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  // PBKDF2 → 64 bytes (512 bits) of master key material
  const masterBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-512',
      salt: salt as unknown as BufferSource,
      iterations: params.iterations,
    },
    passwordKey,
    512 // 64 bytes
  );

  // Import master key for HKDF
  const masterKey = await crypto.subtle.importKey(
    'raw',
    masterBits,
    'HKDF',
    false,
    ['deriveKey', 'deriveBits']
  );

  // HKDF → AES-256-GCM encryption key (for vault data)
  const encryptionKey = await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt as unknown as BufferSource,
      info: encoder.encode('vault-encryption'),
    },
    masterKey,
    { name: 'AES-GCM', length: 256 },
    false, // non-extractable for security
    ['encrypt', 'decrypt']
  );

  // HKDF → auth key bits (for server authentication)
  const authBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt as unknown as BufferSource,
      info: encoder.encode('server-auth'),
    },
    masterKey,
    256 // 32 bytes
  );

  // SHA-256 the auth key before sending to server
  const authDigest = await crypto.subtle.digest('SHA-256', authBits);
  const authHash = uint8ToHex(new Uint8Array(authDigest));

  return { encryptionKey, authHash };
}

// ─── Encoding Helpers ──────────────────────────────────────────

export function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function uint8ToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
