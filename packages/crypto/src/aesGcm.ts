/**
 * AES-256-GCM Encryption/Decryption
 *
 * All vault data is encrypted client-side before being sent to the server.
 * The server only ever stores encrypted blobs — it cannot decrypt anything.
 *
 * Each encryption call generates a unique 12-byte IV (nonce).
 * Ciphertext includes a 128-bit authentication tag (built into GCM).
 */

import { uint8ToBase64, base64ToUint8 } from './keyDerivation';

export interface EncryptedPayload {
  ciphertext: string; // base64-encoded
  iv: string; // base64-encoded 12-byte nonce
  version: number; // crypto format version for future upgrades
}

const CRYPTO_VERSION = 1;

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * 
 * @param key - CryptoKey derived from master password (non-extractable)
 * @param plaintext - The data to encrypt (typically JSON.stringify'd vault item)
 * @returns EncryptedPayload with base64 ciphertext + iv
 */
export async function encrypt(
  key: CryptoKey,
  plaintext: string
): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit nonce
  const encoded = new TextEncoder().encode(plaintext);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    key,
    encoded
  );

  return {
    ciphertext: uint8ToBase64(new Uint8Array(encrypted)),
    iv: uint8ToBase64(iv),
    version: CRYPTO_VERSION,
  };
}

/**
 * Decrypt an AES-256-GCM encrypted payload back to plaintext.
 * 
 * @param key - Same CryptoKey used for encryption
 * @param payload - EncryptedPayload from encrypt()
 * @returns Original plaintext string
 * @throws DOMException if key is wrong or data is tampered
 */
export async function decrypt(
  key: CryptoKey,
  payload: EncryptedPayload
): Promise<string> {
  const ciphertextBytes = base64ToUint8(payload.ciphertext);
  const ivBytes = base64ToUint8(payload.iv);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes as unknown as BufferSource, tagLength: 128 },
    key,
    ciphertextBytes as unknown as BufferSource
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Encrypt a JavaScript object (convenience wrapper).
 * Serializes to JSON, then encrypts.
 */
export async function encryptObject<T>(
  key: CryptoKey,
  data: T
): Promise<EncryptedPayload> {
  return encrypt(key, JSON.stringify(data));
}

/**
 * Decrypt back to a JavaScript object (convenience wrapper).
 */
export async function decryptObject<T>(
  key: CryptoKey,
  payload: EncryptedPayload
): Promise<T> {
  const json = await decrypt(key, payload);
  return JSON.parse(json) as T;
}
