import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import * as db from '../db/store.js';
import { generateAccessToken, generateRefreshToken, type AuthPayload, authMiddleware } from '../middleware/auth.js';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const router = Router();

// ─── Validation Schemas ─────────────────────────────────────────

const registerSchema = z.object({
  email: z.string().email(),
  authHash: z.string().min(64).max(128),
  salt: z.string().min(20),
  kdfParams: z.object({ iterations: z.number().min(100000) }),
});

const loginSchema = z.object({
  email: z.string().email(),
  authHash: z.string().min(64).max(128),
});

const saltSchema = z.object({
  email: z.string().email(),
});

// ─── POST /api/auth/salt ────────────────────────────────────────

router.post('/salt', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = saltSchema.parse(req.body);
    const user = await db.findUserByEmail(email);

    if (!user) {
      res.status(404).json({ success: false, error: 'User mapping not found' });
      return;
    }

    res.json({
      success: true,
      data: {
        salt: user.kdf_salt,
        iterations: (user.kdf_params as any).iterations || 600000,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, error: 'Invalid identifier' });
  }
});

// ─── POST /api/auth/register ────────────────────────────────────

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = registerSchema.parse(req.body);

    // Check if email already exists
    const existing = await db.findUserByEmail(body.email);
    if (existing) {
      res.status(409).json({ success: false, error: 'Email already registered' });
      return;
    }

    // Hash the authHash before storing (defense in depth)
    const serverHash = await bcrypt.hash(body.authHash, 12);

    const user = await db.createUser(
      body.email,
      serverHash,
      body.salt,
      body.kdfParams
    );

    // Create device session
    const payload: AuthPayload = { userId: user.id, email: user.email };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    await db.createDeviceSession(
      user.id,
      req.headers['user-agent'] || 'Unknown',
      req.ip || '0.0.0.0',
      req.headers['user-agent'] || '',
      refreshHash
    );

    // Audit log
    await db.createAuditLog(user.id, 'register', {}, req.ip || '', req.headers['user-agent'] || '');

    res.status(201).json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        expiresIn: 900, // 15 minutes in seconds
        user: { id: user.id, email: user.email },
        kdfParams: { salt: body.salt, iterations: body.kdfParams.iterations },
        sessionId: refreshHash, // Using refreshHash as a proxy for session identification if needed, or better, the session.id
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('[Auth] Registration error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── POST /api/auth/login ───────────────────────────────────────

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = loginSchema.parse(req.body);

    const user = await db.findUserByEmail(body.email);
    if (!user) {
      // Timing-safe: still hash to prevent timing attacks
      await bcrypt.hash(body.authHash, 12);
      res.status(401).json({ success: false, error: 'Account not found' });
      return;
    }

    // Verify authHash
    const validAuth = await bcrypt.compare(body.authHash, user.auth_hash);
    if (!validAuth) {
      await db.createAuditLog(user.id, 'failed_login', {}, req.ip || '', req.headers['user-agent'] || '');
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }

    // Generate tokens
    const payload: AuthPayload = { userId: user.id, email: user.email };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    await db.createDeviceSession(
      user.id,
      req.headers['user-agent'] || 'Unknown',
      req.ip || '0.0.0.0',
      req.headers['user-agent'] || '',
      refreshHash
    );

    await db.createAuditLog(user.id, 'login', {}, req.ip || '', req.headers['user-agent'] || '');

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        expiresIn: 900,
        user: { id: user.id, email: user.email },
        kdfParams: { salt: user.kdf_salt, iterations: (user.kdf_params as any).iterations || 600000 },
        sessionId: refreshHash,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Invalid input' });
      return;
    }
    console.error('[Auth] Login error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── POST /api/auth/refresh ─────────────────────────────────────

router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ success: false, error: 'Refresh token required' });
      return;
    }

    // Verify token
    let decoded: AuthPayload;
    try {
      decoded = jwt.verify(refreshToken, env.jwtRefreshSecret) as AuthPayload;
    } catch {
      res.status(401).json({ success: false, error: 'Invalid refresh token' });
      return;
    }

    // Find session by hash
    const oldHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const session = await db.findSessionByRefreshHash(oldHash);
    if (!session) {
      res.status(401).json({ success: false, error: 'Session not found' });
      return;
    }

    // Rotate tokens
    const newAccessToken = generateAccessToken({ userId: decoded.userId, email: decoded.email });
    const newRefreshToken = generateRefreshToken({ userId: decoded.userId, email: decoded.email });
    const newHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');

    await db.updateSessionRefreshHash(session.id, newHash);

    res.json({
      success: true,
      data: { accessToken: newAccessToken, refreshToken: newRefreshToken, expiresIn: 900, sessionId: newHash },
    });
  } catch (error) {
    console.error('[Auth] Refresh error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── POST /api/auth/logout ──────────────────────────────────────

router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      const session = await db.findSessionByRefreshHash(hash);
      if (session && req.user) {
        await db.deleteDeviceSession(req.user.userId, session.id);
      }
    }
    res.json({ success: true });
  } catch (error) {
    console.error('[Auth] Logout error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── POST /api/auth/change-password ─────────────────────────────

const changePasswordSchema = z.object({
  oldAuthHash: z.string().min(64).max(128),
  newAuthHash: z.string().min(64).max(128),
  salt: z.string().min(20),
  kdfParams: z.object({ iterations: z.number().min(100000) }),
});

router.post('/change-password', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const body = changePasswordSchema.parse(req.body);
    const user = await db.findUserById(req.user!.userId);

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const validAuth = await bcrypt.compare(body.oldAuthHash, user.auth_hash);
    if (!validAuth) {
      res.status(401).json({ success: false, error: 'Invalid current password' });
      return;
    }

    const serverHash = await bcrypt.hash(body.newAuthHash, 12);
    await db.updateUserAuth(user.id, serverHash, body.salt, body.kdfParams);
    
    await db.createAuditLog(user.id, 'password_change', {}, req.ip || '', req.headers['user-agent'] || '');

    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Invalid input' });
      return;
    }
    console.error('[Auth] Change password error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── DELETE /api/auth/account ───────────────────────────────────

router.delete('/account', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    // Optionally, could require authHash here for re-verification, but simple authMiddleware is enough for this phase
    const deleted = await db.deleteUser(req.user!.userId);
    if (deleted) {
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, error: 'User not found' });
    }
  } catch (error) {
    console.error('[Auth] Account delete error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
