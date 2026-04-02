import { Router, type Request, type Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import * as db from '../db/store.js';

const router = Router();

router.use(authMiddleware);

// ─── GET /api/devices ───────────────────────────────────────────

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const sessions = await db.getDeviceSessions(req.user!.userId);

    res.json({
      success: true,
      data: sessions.map(s => ({
        id: s.id,
        deviceName: s.device_name,
        ipAddress: s.ip_address,
        lastActive: s.last_active,
        createdAt: s.created_at,
      })),
    });
  } catch (error) {
    console.error('[Device] List error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── DELETE /api/devices/:id ────────────────────────────────────

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const deleted = await db.deleteDeviceSession(req.user!.userId, req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }

    await db.createAuditLog(req.user!.userId, 'device_revoke', { sessionId: req.params.id }, req.ip || '', req.headers['user-agent'] || '');

    res.json({ success: true });
  } catch (error) {
    console.error('[Device] Delete error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
