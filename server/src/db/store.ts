/**
 * In-Memory Store
 * 
 * Development fallback when PostgreSQL is not available.
 * Provides the same interface as the DB layer but stores everything in RAM.
 * Data is lost on server restart — for development only.
 */

import { v4 as uuid } from 'uuid';

// ─── In-Memory Tables ───────────────────────────────────────────

interface UserRow {
  id: string;
  email: string;
  auth_hash: string;
  kdf_salt: string;
  kdf_params: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

interface VaultItemRow {
  id: string;
  user_id: string;
  encrypted_data: string;
  iv: string;
  item_type: string;
  metadata: Record<string, unknown>;
  version: number;
  created_at: Date;
  updated_at: Date;
}

interface DeviceSessionRow {
  id: string;
  user_id: string;
  device_name: string;
  ip_address: string;
  user_agent: string;
  last_active: Date;
  refresh_token_hash: string;
  created_at: Date;
}

interface AIQuotaRow {
  id: string;
  user_id: string;
  feature: string;
  usage_count: number;
  quota_date: string; // YYYY-MM-DD
}

interface AuditLogRow {
  id: string;
  user_id: string | null;
  event_type: string;
  metadata: Record<string, unknown>;
  ip_address: string;
  user_agent: string;
  created_at: Date;
}

// ─── Store Singleton ────────────────────────────────────────────

const store = {
  users: new Map<string, UserRow>(),
  vaultItems: new Map<string, VaultItemRow>(),
  deviceSessions: new Map<string, DeviceSessionRow>(),
  aiQuotas: new Map<string, AIQuotaRow>(),
  auditLogs: [] as AuditLogRow[],
};

// ─── User Operations ────────────────────────────────────────────

export async function createUser(email: string, authHash: string, salt: string, kdfParams: Record<string, unknown>) {
  const id = uuid();
  const now = new Date();
  const user: UserRow = { id, email, auth_hash: authHash, kdf_salt: salt, kdf_params: kdfParams, created_at: now, updated_at: now };
  store.users.set(id, user);
  return user;
}

export async function findUserByEmail(email: string) {
  for (const user of store.users.values()) {
    if (user.email === email) return user;
  }
  return null;
}

export async function findUserById(id: string) {
  return store.users.get(id) || null;
}

// ─── Vault Item Operations ──────────────────────────────────────

export async function createVaultItem(
  userId: string, id: string, encryptedData: string, iv: string,
  itemType: string, metadata: Record<string, unknown>
) {
  const now = new Date();
  const item: VaultItemRow = {
    id, user_id: userId, encrypted_data: encryptedData, iv, item_type: itemType,
    metadata, version: 1, created_at: now, updated_at: now,
  };
  store.vaultItems.set(id, item);
  return item;
}

export async function getVaultItems(userId: string) {
  const items: VaultItemRow[] = [];
  for (const item of store.vaultItems.values()) {
    if (item.user_id === userId) items.push(item);
  }
  return items;
}

export async function getVaultItem(userId: string, itemId: string) {
  const item = store.vaultItems.get(itemId);
  if (item && item.user_id === userId) return item;
  return null;
}

export async function updateVaultItem(
  userId: string, itemId: string, encryptedData: string, iv: string,
  metadata: Record<string, unknown>, expectedVersion: number
) {
  const item = store.vaultItems.get(itemId);
  if (!item || item.user_id !== userId) return null;
  if (item.version !== expectedVersion) return { conflict: true, serverVersion: item.version };

  item.encrypted_data = encryptedData;
  item.iv = iv;
  item.metadata = metadata;
  item.version += 1;
  item.updated_at = new Date();
  return item;
}

export async function deleteVaultItem(userId: string, itemId: string) {
  const item = store.vaultItems.get(itemId);
  if (item && item.user_id === userId) {
    store.vaultItems.delete(itemId);
    return true;
  }
  return false;
}

// ─── Device Session Operations ──────────────────────────────────

export async function createDeviceSession(
  userId: string, deviceName: string, ipAddress: string,
  userAgent: string, refreshTokenHash: string
) {
  const id = uuid();
  const session: DeviceSessionRow = {
    id, user_id: userId, device_name: deviceName, ip_address: ipAddress,
    user_agent: userAgent, last_active: new Date(), refresh_token_hash: refreshTokenHash,
    created_at: new Date(),
  };
  store.deviceSessions.set(id, session);
  return session;
}

export async function findSessionByRefreshHash(hash: string) {
  for (const session of store.deviceSessions.values()) {
    if (session.refresh_token_hash === hash) return session;
  }
  return null;
}

export async function updateSessionRefreshHash(sessionId: string, newHash: string) {
  const session = store.deviceSessions.get(sessionId);
  if (session) {
    session.refresh_token_hash = newHash;
    session.last_active = new Date();
  }
}

export async function getDeviceSessions(userId: string) {
  const sessions: DeviceSessionRow[] = [];
  for (const session of store.deviceSessions.values()) {
    if (session.user_id === userId) sessions.push(session);
  }
  return sessions;
}

export async function deleteDeviceSession(userId: string, sessionId: string) {
  const session = store.deviceSessions.get(sessionId);
  if (session && session.user_id === userId) {
    store.deviceSessions.delete(sessionId);
    return true;
  }
  return false;
}

// ─── AI Quota Operations ────────────────────────────────────────

export async function getQuotaUsage(userId: string, feature: string) {
  const today = new Date().toISOString().split('T')[0];
  const key = `${userId}:${feature}:${today}`;
  const row = store.aiQuotas.get(key);
  return row?.usage_count || 0;
}

export async function incrementQuota(userId: string, feature: string) {
  const today = new Date().toISOString().split('T')[0];
  const key = `${userId}:${feature}:${today}`;
  const existing = store.aiQuotas.get(key);
  if (existing) {
    existing.usage_count += 1;
    return existing.usage_count;
  }
  const row: AIQuotaRow = { id: uuid(), user_id: userId, feature, usage_count: 1, quota_date: today };
  store.aiQuotas.set(key, row);
  return 1;
}

// ─── Audit Log Operations ───────────────────────────────────────

export async function createAuditLog(
  userId: string | null, eventType: string, metadata: Record<string, unknown>,
  ipAddress: string, userAgent: string
) {
  const log: AuditLogRow = {
    id: uuid(), user_id: userId, event_type: eventType, metadata,
    ip_address: ipAddress, user_agent: userAgent, created_at: new Date(),
  };
  store.auditLogs.push(log);
  return log;
}

export async function getAuditLogs(userId: string, limit = 50) {
  return store.auditLogs
    .filter(l => l.user_id === userId)
    .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
    .slice(0, limit);
}
