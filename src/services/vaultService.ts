/**
 * Vault Service — Encrypted CRUD Operations
 *
 * Handles:
 * - Encrypting vault items before saving to server
 * - Decrypting vault items after loading from server
 * - Local cache management
 * - Sync with backend
 */

import { api } from './apiClient';
import { getEncryptionKey } from './authService';
import {
  encryptVaultItem,
  decryptVaultItem,
  type EncryptedVaultItem,
} from '../../packages/crypto/src/index';
import type { VaultItem } from '../types/vault';
import { v4 as uuid } from 'uuid';

// ─── Helper: Generate UUID (browser-compatible) ──────────────

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─── Fetch & Decrypt All Items ──────────────────────────────────

export async function fetchVaultItems(): Promise<VaultItem[]> {
  const key = getEncryptionKey();
  if (!key) throw new Error('Vault is locked — no encryption key available');

  const res = await api.get<EncryptedVaultItem[]>('/vault/items');
  if (!res.success || !res.data) {
    throw new Error(res.error || 'Failed to fetch vault items');
  }

  // Decrypt all items in parallel
  const decrypted = await Promise.all(
    res.data.map(async (encrypted) => {
      try {
        return await decryptVaultItem<VaultItem>(key, encrypted);
      } catch (error) {
        console.error(`[Vault] Failed to decrypt item ${encrypted.id}:`, error);
        return null;
      }
    })
  );

  return decrypted.filter((item): item is VaultItem => item !== null);
}

// ─── Save (Encrypt & Create) ────────────────────────────────────

export async function saveVaultItem(item: VaultItem): Promise<{ success: boolean; error?: string }> {
  const key = getEncryptionKey();
  if (!key) return { success: false, error: 'Vault is locked' };

  try {
    // Ensure item has an ID
    if (!item.id) {
      (item as any).id = generateId();
    }

    const encrypted = await encryptVaultItem(key, item);

    const res = await api.post('/vault/items', {
      id: encrypted.id,
      encryptedData: encrypted.encryptedData.ciphertext,
      iv: encrypted.encryptedData.iv,
      itemType: encrypted.itemType,
      metadata: encrypted.metadata,
    });

    if (!res.success) {
      return { success: false, error: res.error || 'Failed to save item' };
    }

    return { success: true };
  } catch (error) {
    console.error('[Vault] Save error:', error);
    return { success: false, error: 'Encryption or save failed' };
  }
}

// ─── Update (Encrypt & Update) ──────────────────────────────────

export async function updateVaultItem(
  item: VaultItem,
  version: number = 1
): Promise<{ success: boolean; error?: string }> {
  const key = getEncryptionKey();
  if (!key) return { success: false, error: 'Vault is locked' };

  try {
    const encrypted = await encryptVaultItem(key, item);

    const res = await api.put(`/vault/items/${item.id}`, {
      encryptedData: encrypted.encryptedData.ciphertext,
      iv: encrypted.encryptedData.iv,
      metadata: encrypted.metadata,
      version,
    });

    if (!res.success) {
      return { success: false, error: res.error || 'Failed to update item' };
    }

    return { success: true };
  } catch (error) {
    console.error('[Vault] Update error:', error);
    return { success: false, error: 'Encryption or update failed' };
  }
}

// ─── Delete ─────────────────────────────────────────────────────

export async function deleteVaultItemFromServer(id: string): Promise<{ success: boolean; error?: string }> {
  const res = await api.delete(`/vault/items/${id}`);
  if (!res.success) {
    return { success: false, error: res.error || 'Failed to delete item' };
  }
  return { success: true };
}

// ─── AI Service Proxies ─────────────────────────────────────────

export async function aiSecurityAudit(metadata: { age: number; reuseCount: number; entropyScore: number }) {
  return api.post<{ assessment: string; severity: string }>('/ai/security-audit', metadata);
}

export async function aiPasswordAnalyze(entropyScore: number, flags: string[]) {
  return api.post<{ analysis: string }>('/ai/password-analyze', { entropyScore, flags });
}

export async function aiSearch(query: string, itemNames: string[]) {
  return api.post<{ matchedIndices: number[] }>('/ai/search', { query, itemNames });
}

export async function aiCategorize(name: string, url: string) {
  return api.post<{ category: string }>('/ai/categorize', { name, url });
}

export async function aiChat(messages: { role: string; content: string }[]) {
  return api.post<{ message: string }>('/ai/chat', { messages });
}

export async function aiGetQuota() {
  return api.get<Array<{ feature: string; used: number; limit: number; remaining: number }>>('/ai/quota');
}
