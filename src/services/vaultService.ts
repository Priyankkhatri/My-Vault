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

export async function aiSecurityAudit(metadata: { age: number; reuseCount: number; entropyScore: number }, signal?: AbortSignal) {
 return api.post<{ assessment: string; severity: string }>('/ai/security-audit', metadata, { signal });
}

export async function aiPasswordAnalyze(entropyScore: number, flags: string[], signal?: AbortSignal) {
 return api.post<{ analysis: string }>('/ai/password-analyze', { entropyScore, flags }, { signal });
}

export async function aiSearch(query: string, itemNames: string[], signal?: AbortSignal) {
 return api.post<{ matchedIndices: number[] }>('/ai/search', { query, itemNames }, { signal });
}

export async function aiCategorize(name: string, url: string, signal?: AbortSignal) {
 return api.post<{ category: string }>('/ai/categorize', { name, url }, { signal });
}

export async function aiChat(messages: { role: string; content: string }[], signal?: AbortSignal) {
 return api.post<{ message: string }>('/ai/chat', { messages }, { signal });
}

export async function aiGetQuota(signal?: AbortSignal) {
 return api.get<Array<{ feature: string; used: number; limit: number; remaining: number }>>('/ai/quota', { signal });
}

// ─── Settings & Batch Operations ──────────────────────────────

function getAISettings() {
  const defaults = {
    strengthAnalysis: true,
    securityAudit: true,
    assistantChat: true,
    autoCategorization: true,
  };
  try {
    const stored = localStorage.getItem('myVault_settings');
    return stored ? { ...defaults, ...JSON.parse(stored) } : defaults;
  } catch {
    return defaults;
  }
}

/**
 * Re-encrypt all items for master password change.
 */
export async function reEncryptAllItems(
  items: VaultItem[], 
  newKey: CryptoKey
): Promise<{ success: boolean; error?: string }> {
  try {
    const results = await Promise.all(
      items.map(async (item) => {
        const encrypted = await encryptVaultItem(newKey, item);
        return api.put(`/vault/items/${item.id}`, {
          encryptedData: encrypted.encryptedData.ciphertext,
          iv: encrypted.encryptedData.iv,
          metadata: encrypted.metadata,
          version: (item as any).version || 1,
        });
      })
    );

    const failures = results.filter(r => !r.success);
    if (failures.length > 0) {
      return { success: false, error: `Failed to update ${failures.length} items` };
    }

    return { success: true };
  } catch (error) {
    console.error('[Vault] Batch re-encryption error:', error);
    return { success: false, error: 'Batch encryption failed' };
  }
}

// Wrap existing AI calls with setting check
const originalAiSecurityAudit = aiSecurityAudit;
export const aiSecurityAuditWithSetting = async (metadata: any) => {
  if (!getAISettings().securityAudit) return { success: false, error: 'Security audit is disabled in settings' };
  return originalAiSecurityAudit(metadata);
};

const originalAiPasswordAnalyze = aiPasswordAnalyze;
export const aiPasswordAnalyzeWithSetting = async (score: number, flags: string[]) => {
  if (!getAISettings().strengthAnalysis) return { success: false, error: 'Strength analysis is disabled' };
  return originalAiPasswordAnalyze(score, flags);
};

const originalAiCategorize = aiCategorize;
export const aiCategorizeWithSetting = async (name: string, url: string) => {
  if (!getAISettings().autoCategorization) return { success: false, error: 'Auto-categorization disabled' };
  return originalAiCategorize(name, url);
};

const originalAiChat = aiChat;
export const aiChatWithSetting = async (messages: any[]) => {
  if (!getAISettings().assistantChat) return { success: false, error: 'AI Assistant is disabled' };
  return originalAiChat(messages);
};
