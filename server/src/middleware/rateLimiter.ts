import type { Request, Response, NextFunction } from 'express';
import * as db from '../db/store.js';


/**
 * Rate limiter middleware for AI features.
 * Checks and enforces per-user daily quotas.
 */
export function aiQuotaMiddleware(_feature: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const limits: Record<string, number> = {
      security_audit: 20,
      nl_search: 50,
      password_analysis: 30,
      categorization: 100,
      chat: 40,
      threat_detection: 20,
    };

    if (req.user?.tier === 'free') {
      res.status(403).json({ 
        success: false, 
        error: 'AI security scans and smart features are exclusive to Pro users. Upgrade to unlock!',
        code: 'PRO_FEATURE_REQUIRED'
      });
      return;
    }

    if (req.user?.userId && limits[_feature]) {
      const used = await db.getQuotaUsage(req.user.userId, _feature);
      if (used >= limits[_feature]) {
        res.status(429).json({
          success: false,
          error: 'AI quota reached. Try again tomorrow.',
          code: 'AI_QUOTA_REACHED',
        });
        return;
      }
    }

    next();
  };
}
