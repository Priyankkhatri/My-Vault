/**
 * AI Quota Tracker — Client-side quota awareness
 *
 * Tracks remaining AI calls per feature and shows
 * appropriate UI when limits are reached.
 */

import { aiGetQuota } from '../../services/vaultService';

export interface QuotaInfo {
 feature: string;
 used: number;
 limit: number;
 remaining: number;
}

let cachedQuotas: QuotaInfo[] = [];
let lastFetchTime = 0;
const CACHE_TTL = 60_000; // 1 minute

/**
 * Fetch current quota status from server (with caching).
 */
export async function getQuotas(): Promise<QuotaInfo[]> {
 const now = Date.now();
 if (cachedQuotas.length > 0 && now - lastFetchTime < CACHE_TTL) {
 return cachedQuotas;
 }

 try {
 const res = await aiGetQuota();
 if (res.success && res.data) {
 cachedQuotas = res.data;
 lastFetchTime = now;
 return cachedQuotas;
 }
 } catch (error) {
 console.error('[Quota] Fetch error:', error);
 }

 return cachedQuotas;
}

/**
 * Check if a feature has remaining quota.
 */
export async function hasQuota(feature: string): Promise<boolean> {
 const quotas = await getQuotas();
 const quota = quotas.find(q => q.feature === feature);
 if (!quota) return true; // Unknown feature = unlimited
 return quota.remaining > 0;
}

/**
 * Get a human-readable quota label.
 */
export function getQuotaLabel(feature: string): string {
 const labels: Record<string, string> = {
 security_audit: 'Security Audit',
 nl_search: 'AI Search',
 password_analysis: 'Password Analysis',
 categorization: 'Auto Categorization',
 chat: 'AI Assistant',
 threat_detection: 'Threat Detection',
 };
 return labels[feature] || feature;
}

/**
 * Invalidate cached quotas (call after making an AI request).
 */
export function invalidateQuotaCache(): void {
 lastFetchTime = 0;
}
