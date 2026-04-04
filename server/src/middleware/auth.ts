import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';
import type { Request, Response, NextFunction } from 'express';

// Initialize Supabase client for the backend
// We use the same public URL/Key to verify the token sent by the client
const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey);

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

/** 
 * Verify Supabase JWT and attach user to request
 * This replaces the legacy custom jsonwebtoken verification
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    // We verify the token directly with Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ success: false, error: 'Invalid or expired session' });
      return;
    }

    req.user = {
      userId: user.id,
      email: user.email || '',
    };
    
    next();
  } catch (error) {
    console.error('[Auth Middleware] Verification failed:', error);
    res.status(401).json({ success: false, error: 'Authentication failed' });
  }
}

// Legacy helpers kept for compatibility if needed elsewhere, but marked as deprecated
/** @deprecated Use Supabase Auth on frontend */
export function generateAccessToken(payload: AuthPayload): string { return ''; }
/** @deprecated Use Supabase Auth on frontend */
export function generateRefreshToken(payload: AuthPayload): string { return ''; }
