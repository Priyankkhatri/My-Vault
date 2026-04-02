import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { Request, Response, NextFunction } from 'express';

export interface AuthPayload {
  userId: string;
  email: string;
}

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

/** Generate a JWT access token (15 min expiry) */
export function generateAccessToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: '15m' });
}

/** Generate a refresh token (7 day expiry) */
export function generateRefreshToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.jwtRefreshSecret, { expiresIn: '7d' });
}

/** Verify JWT and attach user to request */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.jwtSecret) as AuthPayload;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}
