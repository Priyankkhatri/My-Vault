import pg from 'pg';
import { env } from '../config/env.js';
import { v4 as uuid } from 'uuid';

const { Pool } = pg;

// ─── Pool Configuration ──────────────────────────────────────────

const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: env.isProduction ? { rejectUnauthorized: false } : undefined,
});

// ─── Types and Interfaces ────────────────────────────────────────

interface UserRow {
  id: string;
  email: string;
  auth_hash: string;
  kdf_salt: string;
  kdf_params: any;
  created_at: Date;
  updated_at: Date;
  tier: string;
  razorpay_customer_id?: string;
  razorpay_subscription_id?: string;
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
  metadata: any;
  ip_address: string;
  user_agent: string;
  created_at: Date;
}

// ─── User Operations ────────────────────────────────────────────

export async function createUser(email: string, authHash: string, salt: string, kdfParams: any, id?: string) {
  const query = `
    INSERT INTO users (id, email, auth_hash, kdf_salt, kdf_params)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;
  const userId = id || uuid();
  const { rows } = await pool.query(query, [userId, email, authHash, salt, JSON.stringify(kdfParams)]);
  return rows[0] as UserRow;
}

export async function findUserByEmail(email: string) {
  const query = 'SELECT * FROM users WHERE email = $1;';
  const { rows } = await pool.query(query, [email]);
  return (rows[0] as UserRow) || null;
}

export async function findUserById(id: string) {
  const query = 'SELECT * FROM users WHERE id = $1;';
  const { rows } = await pool.query(query, [id]);
  return (rows[0] as UserRow) || null;
}

export async function updateUserAuth(userId: string, authHash: string, kdfSalt: string, kdfParams: any) {
  const query = `
    UPDATE users 
    SET auth_hash = $1, kdf_salt = $2, kdf_params = $3, updated_at = NOW()
    WHERE id = $4;
  `;
  const { rowCount } = await pool.query(query, [authHash, kdfSalt, JSON.stringify(kdfParams), userId]);
  return rowCount! > 0;
}

export async function deleteUser(userId: string) {
  const query = 'DELETE FROM users WHERE id = $1;';
  const { rowCount } = await pool.query(query, [userId]);
  return rowCount! > 0;
}

export async function updateUserTier(userId: string, tier: string, subscriptionId: string, customerId?: string) {
  const query = `
    UPDATE users 
    SET tier = $1, razorpay_subscription_id = $2, razorpay_customer_id = COALESCE($3, razorpay_customer_id), updated_at = NOW()
    WHERE id = $4;
  `;
  const { rowCount } = await pool.query(query, [tier, subscriptionId, customerId, userId]);
  return rowCount! > 0;
}

// ─── Vault Item Operations ──────────────────────────────────────

export async function createVaultItem(
  userId: string, id: string, title: string, username: string | undefined,
  password: string | undefined, type: string, favorite: boolean, tags: string[], notes: string | undefined
) {
  const query = `
    INSERT INTO vault_items (id, user_id, title, username, password, type, favorite, tags, notes)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [id, userId, title, username, password, type, favorite, tags, notes]);
  return rows[0] as VaultItemRow;
}

export async function getVaultItems(userId: string) {
  const query = 'SELECT * FROM vault_items WHERE user_id = $1 ORDER BY updated_at DESC;';
  const { rows } = await pool.query(query, [userId]);
  return rows as VaultItemRow[];
}

export async function getVaultItem(userId: string, itemId: string) {
  const query = 'SELECT * FROM vault_items WHERE id = $1 AND user_id = $2;';
  const { rows } = await pool.query(query, [itemId, userId]);
  return (rows[0] as VaultItemRow) || null;
}

export async function updateVaultItem(
  userId: string, itemId: string, title: string, username: string | undefined,
  password: string | undefined, type: string, favorite: boolean, tags: string[], notes: string | undefined, expectedVersion: number
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: current } = await client.query('SELECT version FROM vault_items WHERE id = $1 AND user_id = $2 FOR UPDATE;', [itemId, userId]);
    
    if (current.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    if (current[0].version !== expectedVersion) {
      await client.query('ROLLBACK');
      return { conflict: true, serverVersion: current[0].version };
    }

    const query = `
      UPDATE vault_items 
      SET title = $1, username = $2, password = $3, type = $4, favorite = $5, tags = $6, notes = $7, version = version + 1, updated_at = NOW()
      WHERE id = $8 AND user_id = $9
      RETURNING *;
    `;
    const { rows } = await client.query(query, [title, username, password, type, favorite, tags, notes, itemId, userId]);
    await client.query('COMMIT');
    return rows[0] as VaultItemRow;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function deleteVaultItem(userId: string, itemId: string) {
  const query = 'DELETE FROM vault_items WHERE id = $1 AND user_id = $2;';
  const { rowCount } = await pool.query(query, [itemId, userId]);
  return rowCount! > 0;
}

// ─── Device Session Operations ──────────────────────────────────

export async function createDeviceSession(
  userId: string, deviceName: string, ipAddress: string,
  userAgent: string, refreshTokenHash: string
) {
  const id = uuid();
  const query = `
    INSERT INTO device_sessions (id, user_id, device_name, ip_address, user_agent, refresh_token_hash)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [id, userId, deviceName, ipAddress, userAgent, refreshTokenHash]);
  return rows[0] as DeviceSessionRow;
}

export async function findSessionByRefreshHash(hash: string) {
  const query = 'SELECT * FROM device_sessions WHERE refresh_token_hash = $1;';
  const { rows } = await pool.query(query, [hash]);
  return (rows[0] as DeviceSessionRow) || null;
}

export async function updateSessionRefreshHash(sessionId: string, newHash: string) {
  const query = 'UPDATE device_sessions SET refresh_token_hash = $1, last_active = NOW() WHERE id = $2;';
  await pool.query(query, [newHash, sessionId]);
}

export async function getDeviceSessions(userId: string) {
  const query = 'SELECT * FROM device_sessions WHERE user_id = $1 ORDER BY last_active DESC;';
  const { rows } = await pool.query(query, [userId]);
  return rows as DeviceSessionRow[];
}

export async function deleteDeviceSession(userId: string, sessionId: string) {
  const query = 'DELETE FROM device_sessions WHERE id = $1 AND user_id = $2;';
  const { rowCount } = await pool.query(query, [sessionId, userId]);
  return rowCount! > 0;
}

export async function deleteOtherDeviceSessions(userId: string, currentSessionId: string) {
  const query = 'DELETE FROM device_sessions WHERE user_id = $1 AND id <> $2;';
  const { rowCount } = await pool.query(query, [userId, currentSessionId]);
  return rowCount! || 0;
}

// ─── Audit Log Operations ───────────────────────────────────────

export async function createAuditLog(
  userId: string | null, eventType: string, metadata: any,
  ipAddress: string, userAgent: string
) {
  const query = `
    INSERT INTO audit_logs (user_id, event_type, metadata, ip_address, user_agent)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [userId, eventType, JSON.stringify(metadata), ipAddress, userAgent]);
  return rows[0] as AuditLogRow;
}

export async function getAuditLogs(userId: string, limit = 50) {
  const query = 'SELECT * FROM audit_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2;';
  const { rows } = await pool.query(query, [userId, limit]);
  return rows as AuditLogRow[];
}

export async function getQuotaUsage(userId: string, feature: string) {
  // Simple quota check using audit logs
  const query = `
    SELECT count(*) FROM audit_logs 
    WHERE user_id = $1 AND event_type = 'ai_request' 
    AND metadata->>'feature' = $2
    AND created_at > NOW() - INTERVAL '24 hours';
  `;
  const { rows } = await pool.query(query, [userId, feature]);
  return parseInt(rows[0].count, 10);
}
