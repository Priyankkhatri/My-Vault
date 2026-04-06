import { Router, type Request, type Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import * as rzp from '../services/razorpay.js';
import * as db from '../db/store.js';
import { env } from '../config/env.js';

const router = Router();

/**
 * ─── POST /api/payments/create-subscription ─────────────────────
 * Creates a Razorpay subscription for the authenticated user.
 */
router.post('/create-subscription', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    
    // Check if user already has a plan (optional, could allow multi)
    const localUser = await db.findUserById(user.userId);
    if (localUser?.tier === 'pro') {
      res.json({ success: true, alreadyPro: true });
      return;
    }

    const subscription = await rzp.createRazorpaySubscription(env.razorpayPlanId, user.email);

    res.json({
      success: true,
      data: {
        subscriptionId: subscription.id,
        keyId: env.razorpayKeyId,
      }
    });
  } catch (error) {
    console.error('[Payment Route] Subscription creation failed:', error);
    res.status(500).json({ success: false, error: 'Failed to create subscription' });
  }
});

/**
 * ─── POST /api/payments/webhook ─────────────────────────────────
 * Handles Razorpay webhook events to upgrade/downgrade user tiers.
 * ⚠️ NO AUTH MIDDLEWARE HERE (Razorpay will call this).
 */
router.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const secret = env.razorpayWebhookSecret;
    
    // Verify signature
    const isValid = Razorpay.validateWebhookSignature(JSON.stringify(req.body), signature, secret);
    
    if (!isValid) {
      console.warn('[Webhook] Invalid signature received');
      res.status(400).json({ success: false, error: 'Invalid signature' });
      return;
    }

    const { event, payload } = req.body;
    console.log(`[Webhook] Event received: ${event}`);

    // Handle subscription authentication (payment success)
    if (event === 'subscription.authenticated' || event === 'payment.captured') {
      const subscription = payload.subscription?.entity || payload.payment?.entity;
      const email = subscription.notes?.email || payload.payment?.entity?.email;
      const subscriptionId = subscription.id;

      if (email) {
        const user = await db.findUserByEmail(email);
        if (user) {
          await db.updateUserTier(user.id, 'pro', subscriptionId, subscription.customer_id);
          console.log(`[Webhook] User ${email} upgraded to Pro!`);
        }
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[Webhook] Processing error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Need to import Razorpay here for static usage in validateWebhookSignature if used directly, 
// but my service already wraps it partially.
import Razorpay from 'razorpay';

export default router;
