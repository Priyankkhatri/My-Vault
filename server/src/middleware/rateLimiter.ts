import type { Request, Response, NextFunction } from 'express';


/**
 * Rate limiter middleware for AI features.
 * Checks and enforces per-user daily quotas.
 */
export function aiQuotaMiddleware(feature: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Quota tracking is currently disabled as per requirements.
    // We will implement quota tracking in a later phase.
    next();
  };
}
