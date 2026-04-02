import { Router, type Request, type Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { aiQuotaMiddleware } from '../middleware/rateLimiter.js';
import * as ai from '../services/groqClient.js';
import * as db from '../db/store.js';

const router = Router();

// All AI routes require authentication
router.use(authMiddleware);

// ─── POST /api/ai/security-audit ────────────────────────────────

router.post('/security-audit', aiQuotaMiddleware('security_audit'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { age, reuseCount, entropyScore } = req.body;
    const result = await ai.runSecurityAudit({ age, reuseCount, entropyScore });

    await db.createAuditLog(req.user!.userId, 'ai_request', { feature: 'security_audit' }, req.ip || '', req.headers['user-agent'] || '');

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[AI Route] Security audit error:', error);
    res.status(500).json({ success: false, error: 'AI service error' });
  }
});

// ─── POST /api/ai/password-analyze ──────────────────────────────

router.post('/password-analyze', aiQuotaMiddleware('password_analysis'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { entropyScore, flags } = req.body;
    const result = await ai.analyzePasswordStrength(entropyScore, flags);

    res.json({ success: true, data: { analysis: result } });
  } catch (error) {
    console.error('[AI Route] Password analysis error:', error);
    res.status(500).json({ success: false, error: 'AI service error' });
  }
});

// ─── POST /api/ai/search ───────────────────────────────────────

router.post('/search', aiQuotaMiddleware('nl_search'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { query, itemNames } = req.body;
    const matches = await ai.semanticSearch(query, itemNames);

    res.json({ success: true, data: { matchedIndices: matches } });
  } catch (error) {
    console.error('[AI Route] Search error:', error);
    res.status(500).json({ success: false, error: 'AI service error' });
  }
});

// ─── POST /api/ai/categorize ───────────────────────────────────

router.post('/categorize', aiQuotaMiddleware('categorization'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, url } = req.body;
    const category = await ai.categorizeItem(name, url || '');

    res.json({ success: true, data: { category } });
  } catch (error) {
    console.error('[AI Route] Categorization error:', error);
    res.status(500).json({ success: false, error: 'AI service error' });
  }
});

// ─── POST /api/ai/chat ────────────────────────────────────────

router.post('/chat', aiQuotaMiddleware('chat'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { messages } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ success: false, error: 'Messages array required' });
      return;
    }

    const response = await ai.chatAssistant(messages);

    res.json({ success: true, data: { message: response } });
  } catch (error) {
    console.error('[AI Route] Chat error:', error);
    res.status(500).json({ success: false, error: 'AI service error' });
  }
});

// ─── POST /api/ai/threat-analyze ───────────────────────────────

router.post('/threat-analyze', aiQuotaMiddleware('threat_detection'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { ip, city, device, time } = req.body;
    const narrative = await ai.generateThreatNarrative({ ip, city, device, time });

    res.json({ success: true, data: { analysis: narrative } });
  } catch (error) {
    console.error('[AI Route] Threat analysis error:', error);
    res.status(500).json({ success: false, error: 'AI service error' });
  }
});

// ─── GET /api/ai/quota ─────────────────────────────────────────

router.get('/quota', async (req: Request, res: Response): Promise<void> => {
  try {
    const features = ['security_audit', 'nl_search', 'password_analysis', 'chat'];
    const limits: Record<string, number> = { security_audit: 20, nl_search: 50, password_analysis: 30, chat: 40 };

    const quotas = await Promise.all(
      features.map(async (feature) => {
        const used = await db.getQuotaUsage(req.user!.userId, feature);
        const limit = limits[feature] || 0;
        return { feature, used, limit, remaining: Math.max(0, limit - used) };
      })
    );

    res.json({ success: true, data: quotas });
  } catch (error) {
    console.error('[AI Route] Quota check error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
