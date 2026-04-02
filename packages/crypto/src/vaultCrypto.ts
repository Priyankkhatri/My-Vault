/**
 * High-Level Vault Crypto Orchestrator
 *
 * Provides a simple API for the web app and extension to:
 *  1. Initialize encryption from a master password
 *  2. Encrypt vault items before sending to server
 *  3. Decrypt vault items after receiving from server
 *  4. Generate auth credentials for server login
 */

import {
  deriveKeys,
  generateSalt,
  DEFAULT_KDF_PARAMS,
  type KDFParams,
} from './keyDerivation';
import {
  encryptObject,
  decryptObject,
  type EncryptedPayload,
} from './aesGcm';

export interface VaultCryptoSession {
  encryptionKey: CryptoKey;
  authHash: string;
}

export interface EncryptedVaultItem {
  id: string;
  encryptedData: EncryptedPayload;
  itemType: string;
  metadata: {
    tags: string[];
    folder: string;
    title: string; // stored for search indexing — not sensitive
    createdAt: string;
    updatedAt: string;
  };
  version: number;
}

/**
 * Initialize a new vault: generate salt and derive keys.
 * Used during REGISTRATION.
 */
export async function initializeVault(password: string): Promise<{
  session: VaultCryptoSession;
  kdfParams: KDFParams;
}> {
  const salt = generateSalt();
  const kdfParams: KDFParams = { salt, ...DEFAULT_KDF_PARAMS };
  const { encryptionKey, authHash } = await deriveKeys(password, kdfParams);

  return {
    session: { encryptionKey, authHash },
    kdfParams,
  };
}

/**
 * Unlock an existing vault: derive keys from stored salt.
 * Used during LOGIN.
 */
export async function unlockVault(
  password: string,
  kdfParams: KDFParams
): Promise<VaultCryptoSession> {
  const { encryptionKey, authHash } = await deriveKeys(password, kdfParams);
  return { encryptionKey, authHash };
}

/**
 * Encrypt a vault item for server storage.
 * Strips sensitive fields into encrypted blob, keeps metadata separate for search.
 */
export async function encryptVaultItem<T extends { id: string; type: string; title: string; tags: string[]; folder?: string; createdAt: string; updatedAt: string }>(
  key: CryptoKey,
  item: T
): Promise<EncryptedVaultItem> {
  const encryptedData = await encryptObject(key, item);

  return {
    id: item.id,
    encryptedData,
    itemType: item.type,
    metadata: {
      tags: item.tags,
      folder: item.folder || '',
      title: item.title,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    },
    version: 1,
  };
}

/**
 * Decrypt a vault item from server storage.
 */
export async function decryptVaultItem<T>(
  key: CryptoKey,
  encrypted: EncryptedVaultItem
): Promise<T> {
  return decryptObject<T>(key, encrypted.encryptedData);
}

/**
 * Batch encrypt multiple vault items.
 */
export async function encryptBatch<T extends { id: string; type: string; title: string; tags: string[]; folder?: string; createdAt: string; updatedAt: string }>(
  key: CryptoKey,
  items: T[]
): Promise<EncryptedVaultItem[]> {
  return Promise.all(items.map((item) => encryptVaultItem(key, item)));
}

/**
 * Batch decrypt multiple vault items.
 */
export async function decryptBatch<T>(
  key: CryptoKey,
  items: EncryptedVaultItem[]
): Promise<T[]> {
  return Promise.all(items.map((item) => decryptVaultItem<T>(key, item)));
}
