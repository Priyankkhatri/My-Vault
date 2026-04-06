/**
 * Storage Switcher
 * 
 * Dynamically switches between:
 * - PostgreSQL (using pg.ts) if DATABASE_URL is provided.
 * - In-Memory (legacy dev mode) if no DATABASE_URL is detected.
 */

import { env } from '../config/env.js';
import * as pg from './pg.js';
import { v4 as uuid } from 'uuid';
import fs from 'fs';
import path from 'path';

// ─── Choice Logic ───────────────────────────────────────────────

const usePostgres = !!env.databaseUrl;

if (usePostgres) {
  console.log('📦 Database: Initializing PostgreSQL (Supabase)');
} else {
  console.log('📦 Database: Running in In-Memory mode (Development)');
}

// ─── Exported API ───────────────────────────────────────────────

export const createUser = usePostgres ? pg.createUser : memCreateUser;
export const findUserByEmail = usePostgres ? pg.findUserByEmail : memFindUserByEmail;
export const findUserById = usePostgres ? pg.findUserById : memFindUserById;
export const updateUserAuth = usePostgres ? pg.updateUserAuth : memUpdateUserAuth;
export const deleteUser = usePostgres ? pg.deleteUser : memDeleteUser;

export const createVaultItem = usePostgres ? pg.createVaultItem : memCreateVaultItem;
export const getVaultItems = usePostgres ? pg.getVaultItems : memGetVaultItems;
export const getVaultItem = usePostgres ? pg.getVaultItem : memGetVaultItem;
export const updateVaultItem = usePostgres ? pg.updateVaultItem : memUpdateVaultItem;
export const deleteVaultItem = usePostgres ? pg.deleteVaultItem : memDeleteVaultItem;

export const createDeviceSession = usePostgres ? pg.createDeviceSession : memCreateDeviceSession;
export const findSessionByRefreshHash = usePostgres ? pg.findSessionByRefreshHash : memFindSessionByRefreshHash;
export const updateSessionRefreshHash = usePostgres ? pg.updateSessionRefreshHash : memUpdateSessionRefreshHash;
export const getDeviceSessions = usePostgres ? pg.getDeviceSessions : memGetDeviceSessions;
export const deleteDeviceSession = usePostgres ? pg.deleteDeviceSession : memDeleteDeviceSession;
export const deleteOtherDeviceSessions = usePostgres ? pg.deleteOtherDeviceSessions : memDeleteOtherDeviceSessions;

export const createAuditLog = usePostgres ? pg.createAuditLog : memCreateAuditLog;
export const getAuditLogs = usePostgres ? pg.getAuditLogs : memGetAuditLogs;
export const getQuotaUsage = usePostgres ? pg.getQuotaUsage : memGetQuotaUsage;

// ─── In-Memory Implementation (LEGACY / DEV ONLY) ─────────────

const DB_PATH = path.join(process.cwd(), 'dev-db.json');

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
  title: string;
  username?: string;
  password?: string;
  type: string;
  favorite: boolean;
  tags: string[];
  notes?: string;
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

interface AuditLogRow {
  id: string;
  user_id: string | null;
  event_type: string;
  metadata: Record<string, unknown>;
  ip_address: string;
  user_agent: string;
  created_at: Date;
}

const store = {
  users: new Map<string, UserRow>(),
  vaultItems: new Map<string, VaultItemRow>(),
  deviceSessions: new Map<string, DeviceSessionRow>(),
  auditLogs: [] as AuditLogRow[],
};

function saveToDisk() {
  if (usePostgres) return;
  const data = {
    users: Array.from(store.users.entries()),
    vaultItems: Array.from(store.vaultItems.entries()),
    deviceSessions: Array.from(store.deviceSessions.entries()),
    auditLogs: store.auditLogs,
  };
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function loadFromDisk() {
  if (usePostgres || !fs.existsSync(DB_PATH)) return;
  try {
    const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    store.users = new Map(data.users);
    store.vaultItems = new Map(data.vaultItems);
    store.deviceSessions = new Map(data.deviceSessions);
    store.auditLogs = data.auditLogs;
  } catch (err) {
    console.error('Failed to load dev-db.json:', err);
  }
}

loadFromDisk();

async function memCreateUser(email: string, authHash: string, salt: string, kdfParams: Record<string, unknown>) {
  const id = uuid();
  const now = new Date();
  const user: UserRow = { id, email, auth_hash: authHash, kdf_salt: salt, kdf_params: kdfParams, created_at: now, updated_at: now };
  store.users.set(id, user);
  saveToDisk();
  return user;
}

async function memFindUserByEmail(email: string) {
  for (const user of store.users.values()) {
    if (user.email === email) return user;
  }
  return null;
}

async function memFindUserById(id: string) {
  return store.users.get(id) || null;
}

async function memUpdateUserAuth(userId: string, authHash: string, kdfSalt: string, kdfParams: Record<string, unknown>) {
  const user = store.users.get(userId);
  if (user) {
    user.auth_hash = authHash;
    user.kdf_salt = kdfSalt;
    user.kdf_params = kdfParams;
    user.updated_at = new Date();
    saveToDisk();
    return true;
  }
  return false;
}

async function memDeleteUser(userId: string) {
  if (store.users.has(userId)) {
    store.users.delete(userId);
    for (const [itemId, item] of store.vaultItems.entries()) {
      if (item.user_id === userId) store.vaultItems.delete(itemId);
    }
    for (const [sessionId, session] of store.deviceSessions.entries()) {
      if (session.user_id === userId) store.deviceSessions.delete(sessionId);
    }
    saveToDisk();
    return true;
  }
  return false;
}

async function memCreateVaultItem(
  userId: string, id: string, title: string, username: string | undefined,
  password: string | undefined, type: string, favorite: boolean, tags: string[], notes: string | undefined
) {
  const now = new Date();
  const item: VaultItemRow = {
    id, user_id: userId, title, username, password, type,
    favorite, tags, notes, version: 1, created_at: now, updated_at: now,
  };
  store.vaultItems.set(id, item);
  saveToDisk();
  return item;
}

async function memGetVaultItems(userId: string) {
  const items: VaultItemRow[] = [];
  for (const item of store.vaultItems.values()) {
    if (item.user_id === userId) items.push(item);
  }
  return items;
}

async function memGetVaultItem(userId: string, itemId: string) {
  const item = store.vaultItems.get(itemId);
  if (item && item.user_id === userId) return item;
  return null;
}

async function memUpdateVaultItem(
  userId: string, itemId: string, title: string, username: string | undefined,
  password: string | undefined, type: string, favorite: boolean, tags: string[], notes: string | undefined, expectedVersion: number
) {
  const item = store.vaultItems.get(itemId);
  if (!item || item.user_id !== userId) return null;
  if (item.version !== expectedVersion) return { conflict: true, serverVersion: item.version };

  item.title = title;
  item.username = username;
  item.password = password;
  item.type = type;
  item.favorite = favorite;
  item.tags = tags;
  item.notes = notes;
  item.version += 1;
  item.updated_at = new Date();
  saveToDisk();
  return item;
}

async function memDeleteVaultItem(userId: string, itemId: string) {
  const item = store.vaultItems.get(itemId);
  if (item && item.user_id === userId) {
    store.vaultItems.delete(itemId);
    saveToDisk();
    return true;
  }
  return false;
}

async function memCreateDeviceSession(
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
  saveToDisk();
  return session;
}

async function memFindSessionByRefreshHash(hash: string) {
  for (const session of store.deviceSessions.values()) {
    if (session.refresh_token_hash === hash) return session;
  }
  return null;
}

async function memUpdateSessionRefreshHash(sessionId: string, newHash: string) {
  const session = store.deviceSessions.get(sessionId);
  if (session) {
    session.refresh_token_hash = newHash;
    session.last_active = new Date();
    saveToDisk();
  }
}

async function memGetDeviceSessions(userId: string) {
  const sessions: DeviceSessionRow[] = [];
  for (const session of store.deviceSessions.values()) {
    if (session.user_id === userId) sessions.push(session);
  }
  return sessions;
}

async function memDeleteDeviceSession(userId: string, sessionId: string) {
  const session = store.deviceSessions.get(sessionId);
  if (session && session.user_id === userId) {
    store.deviceSessions.delete(sessionId);
    saveToDisk();
    return true;
  }
  return false;
}

async function memDeleteOtherDeviceSessions(userId: string, currentSessionId: string) {
  let deletedCount = 0;
  for (const [sessionId, session] of store.deviceSessions.entries()) {
    if (session.user_id === userId && sessionId !== currentSessionId) {
      store.deviceSessions.delete(sessionId);
      deletedCount++;
    }
  }
  if (deletedCount > 0) saveToDisk();
  return deletedCount;
}

async function memCreateAuditLog(
  userId: string | null, eventType: string, metadata: Record<string, unknown>,
  ipAddress: string, userAgent: string
) {
  const log: AuditLogRow = {
    id: uuid(), user_id: userId, event_type: eventType, metadata,
    ip_address: ipAddress, user_agent: userAgent, created_at: new Date(),
  };
  store.auditLogs.push(log);
  saveToDisk();
  return log;
}

async function memGetAuditLogs(userId: string, limit = 50) {
  return store.auditLogs
    .filter(l => l.user_id === userId)
    .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
    .slice(0, limit);
}

export async function memGetQuotaUsage(userId: string, _feature: string) {
  // Mock implementation for development.
  // In production, this would query a usages table.
  return 0;
}
