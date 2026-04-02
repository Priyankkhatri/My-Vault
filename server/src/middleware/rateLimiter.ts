import type { Request, Response, NextFunction } from 'express';
import { getQuotaUsage, incrementQuota } from '../db/store.js';

// AI quota limits per feature per day
const QUOTA_LIMITS: Record<string, number> = {
  security_audit: 20,
  nl_search: 50,
  password_analysis: 30,
  chat: 40,
  categorization: Infinity,
  threat_detection: Infinity,
  autofill: Infinity,
};

/**
 * Rate limiter middleware for AI features.
 * Checks and enforces per-user daily quotas.
 */
export function aiQuotaMiddleware(feature: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const limit = QUOTA_LIMITS[feature];
    if (limit === undefined) {
      res.status(400).json({ success: false, error: `Unknown feature: ${feature}` });
      return;
    }

    // Unlimited features bypass quota check
    if (limit === Infinity) {
      next();
      return;
    }

    const usage = await getQuotaUsage(req.user.userId, feature);
    if (usage >= limit) {
      res.status(429).json({
        success: false,
        error: `Daily AI quota exceeded for ${feature}. Limit: ${limit}/day. Resets at midnight UTC.`,
        quota: { feature, used: usage, limit, remaining: 0 },
      });
      return;
    }

    // Increment usage and continue
    await incrementQuota(req.user.userId, feature);
    next();
  };
}
