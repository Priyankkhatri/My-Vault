import Razorpay from 'razorpay';
import { env } from '../config/env.js';

/**
 * Razorpay Client Initialization
 * Used for creating subscriptions and verifying signatures.
 */
export const razorpay = new Razorpay({
  key_id: env.razorpayKeyId,
  key_secret: env.razorpayKeySecret,
});

/**
 * Create a new subscription for a user
 * @param planId The Razorpay Plan ID (e.g., plan_SaIMHM0qauV70x)
 * @param customerEmail User's email for notification
 */
export async function createRazorpaySubscription(planId: string, customerEmail: string) {
  try {
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      customer_notify: 1,
      total_count: 12, // Monthly for 1 year, auto-renews
      addons: [],
      notes: {
        email: customerEmail,
      },
    });
    return subscription;
  } catch (error) {
    console.error('[Razorpay Service] Error creating subscription:', error);
    throw error;
  }
}

/**
 * Verify if a webhook signature is authentic
 */
export function verifyWebhookSignature(body: string, signature: string, secret: string) {
  return Razorpay.validateWebhookSignature(body, signature, secret);
}
