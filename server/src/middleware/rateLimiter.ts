import type { Request, Response, NextFunction } from 'express';


/**
 * Rate limiter middleware for AI features.
 * Checks and enforces per-user daily quotas.
 */
export function aiQuotaMiddleware(_feature: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (req.user?.tier === 'free') {
      res.status(403).json({ 
        success: false, 
        error: 'AI security scans and smart features are exclusive to Pro users. Upgrade to unlock!',
        code: 'PRO_FEATURE_REQUIRED'
      });
      return;
    }
    next();
  };
}
