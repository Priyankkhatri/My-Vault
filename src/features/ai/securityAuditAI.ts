/**
 * AI Security Audit — Frontend Module
 *
 * Combines local entropy analysis with Groq AI reasoning
 * to produce rich, actionable security insights.
 *
 * Flow: Local scoring → send metadata to backend → AI generates explanation
 */

import { analyzePassword, detectReuse } from '../../../packages/crypto/src/entropy';
import { aiSecurityAudit, aiPasswordAnalyze } from '../../services/vaultService';
import type { PasswordItem } from '../../types/vault';

export interface RiskScore {
 total: number;
 severity: 'low' | 'medium' | 'high' | 'critical';
 factors: {
 entropy: number;
 age: number;
 reuse: number;
 patterns: number;
 };
}

export interface AuditedItem {
 item: PasswordItem;
 riskScore: RiskScore;
 aiInsight?: string;
 aiSeverity?: string;
}

/**
 * Compute a composite risk score locally (no API call).
 */
export function computeRiskScore(
 item: PasswordItem,
 reuseCount: number = 0
): RiskScore {
 const entropy = analyzePassword(item.password);

 // Invert entropy score (high entropy = low risk)
 const entropyRisk = Math.max(0, 100 - entropy.score);

 // Age risk: passwords older than 6 months get increasing risk
 const daysSinceUpdate = Math.floor(
 (Date.now() - new Date(item.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
 );
 const ageRisk = daysSinceUpdate > 365 ? 30 : daysSinceUpdate > 180 ? 20 : daysSinceUpdate > 90 ? 10 : 0;

 // Reuse risk: each reuse adds significant risk
 const reuseRisk = Math.min(40, reuseCount * 15);

 // Pattern risk: based on detected flags
 const patternRisk = Math.min(30, entropy.flags.length * 8);

 const total = Math.min(100, Math.round(
 entropyRisk * 0.35 + ageRisk * 0.2 + reuseRisk * 0.3 + patternRisk * 0.15
 ));

 const severity: RiskScore['severity'] =
 total >= 75 ? 'critical' : total >= 50 ? 'high' : total >= 25 ? 'medium' : 'low';

 return {
 total,
 severity,
 factors: {
 entropy: Math.round(entropyRisk),
 age: ageRisk,
 reuse: reuseRisk,
 patterns: patternRisk,
 },
 };
}

/**
 * Run full AI-enhanced audit on a set of password items.
 * Local scoring + optional Groq AI insights.
 */
export async function runFullAudit(
 passwords: PasswordItem[],
 options: {
 includeAI?: boolean;
 onAIError?: (error: { message: string; status?: number; code?: string }) => void;
 onAINoTargets?: () => void;
 } = {}
): Promise<AuditedItem[]> {
 // Step 1: Detect reuse locally (hash-based, never exposes passwords)
 const reuseMap = await detectReuse(passwords.map(p => p.password));

 // Step 2: Score each item locally
 const audited: AuditedItem[] = passwords.map((item, idx) => ({
 item,
 riskScore: computeRiskScore(item, reuseMap.get(idx) || 0),
 }));

 // Step 3: Get AI insights for high-risk items (if enabled)
 if (options.includeAI) {
 const highRiskItems = audited.filter(a => a.riskScore.severity === 'critical' || a.riskScore.severity === 'high');

 if (highRiskItems.length === 0) {
 options.onAINoTargets?.();
 }

 await Promise.all(
 highRiskItems.slice(0, 5).map(async (auditedItem) => {
 try {
 const daysSinceUpdate = Math.floor(
 (Date.now() - new Date(auditedItem.item.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
 );

 const res = await aiSecurityAudit({
 age: daysSinceUpdate,
 reuseCount: reuseMap.get(passwords.indexOf(auditedItem.item)) || 0,
 entropyScore: analyzePassword(auditedItem.item.password).score,
 });

 if (res.success && res.data) {
 auditedItem.aiInsight = res.data.assessment;
 auditedItem.aiSeverity = res.data.severity;
 } else {
 options.onAIError?.({
 message: res.error || 'AI audit unavailable',
 status: res.status,
 code: (res as any).code,
 });
 }
 } catch (error) {
 console.error('[AI Audit] Error for item:', auditedItem.item.id, error);
 options.onAIError?.({
 message: error instanceof Error ? error.message : 'AI audit unavailable',
 });
 }
 })
 );
 }

 // Sort by risk score (highest first)
 return audited.sort((a, b) => b.riskScore.total - a.riskScore.total);
}

/**
 * Get AI explanation for a specific password's strength.
 */
export async function getPasswordInsight(password: string): Promise<string | null> {
 const entropy = analyzePassword(password);

 try {
 const res = await aiPasswordAnalyze(entropy.score, entropy.flags);
 if (res.success && res.data) {
 return res.data.analysis;
 }
 } catch (error) {
 console.error('[AI] Password insight error:', error);
 }

 return null;
}
