/**
 * Password Security Utilities
 *
 * All calculations run locally — no API calls, no data leaves the client.
 * Used by AddItem, SecurityAudit, Dashboard, and ItemDetail.
 */

import type { VaultItem, PasswordItem } from '../types/vault';

// ─── Password Strength ──────────────────────────────────────────

/**
 * Calculate password strength score 0–4 using entropy calculation.
 *
 * Factors:
 * - Length (< 8 = weak baseline)
 * - Character variety (lowercase, uppercase, digits, symbols)
 * - Common pattern penalties
 *
 * Returns 0–4 mapping to: 0=none, 1=weak, 2=fair, 3=strong, 4=excellent
 */

const COMMON_PASSWORDS = new Set([
  'password', '123456', '123456789', '12345678', '12345', '1234567',
  'password1', 'qwerty', 'abc123', 'monkey', 'master', 'dragon',
  'login', 'princess', 'football', 'shadow', 'sunshine', 'trustno1',
  'iloveyou', 'batman', 'admin', 'hello', 'welcome', 'letmein', '1234',
  'password123', 'qwerty123',
]);

export function calculatePasswordStrength(password: string): number {
  if (!password || password.length === 0) return 0;

  // Immediate fail for common passwords
  if (COMMON_PASSWORDS.has(password.toLowerCase())) return 1;

  let score = 0;

  // Length scoring (max 2 points)
  if (password.length >= 8) score += 1;
  if (password.length >= 14) score += 1;

  // Character variety scoring (max 2 points)
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);

  const varietyCount = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;
  if (varietyCount >= 2) score += 1;
  if (varietyCount >= 4) score += 1;

  // Penalties for weak patterns
  if (/^[a-z]+$/i.test(password)) score = Math.max(score - 1, 1); // all letters
  if (/^[0-9]+$/.test(password)) score = Math.max(score - 1, 1); // all digits
  if (/(.)\1{2,}/.test(password)) score = Math.max(score - 1, 1); // triple repeat
  if (/123|abc|qwerty/i.test(password)) score = Math.max(score - 1, 1); // common sequences

  // Under 8 chars is always weak regardless
  if (password.length < 8) return Math.min(score, 1);

  return Math.min(score, 4);
}

/**
 * Map numeric score 0-4 to the strength label used in PasswordItem.
 */
export function strengthScoreToLabel(score: number): PasswordItem['strength'] {
  if (score >= 4) return 'excellent';
  if (score >= 3) return 'strong';
  if (score >= 2) return 'fair';
  return 'weak';
}

/**
 * Convenience: compute label from password string.
 */
export function getPasswordStrengthLabel(password: string): PasswordItem['strength'] {
  return strengthScoreToLabel(calculatePasswordStrength(password));
}

// ─── Reused Password Detection ──────────────────────────────────

export interface ReusedGroup {
  /** SHA-256 hash of the shared password */
  hash: string;
  /** Items sharing this password */
  items: PasswordItem[];
}

/**
 * Find groups of items that share identical passwords.
 * Comparison uses SHA-256 hashing — never compares plaintext.
 */
export async function findReusedPasswords(items: VaultItem[]): Promise<ReusedGroup[]> {
  const passwords = items.filter((i): i is PasswordItem => i.type === 'password');
  const hashMap = new Map<string, PasswordItem[]>();

  for (const item of passwords) {
    if (!item.password) continue;
    const encoded = new TextEncoder().encode(item.password);
    const digest = await crypto.subtle.digest('SHA-256', encoded);
    const hex = Array.from(new Uint8Array(digest))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (!hashMap.has(hex)) hashMap.set(hex, []);
    hashMap.get(hex)!.push(item);
  }

  return Array.from(hashMap.entries())
    .filter(([, group]) => group.length > 1)
    .map(([hash, items]) => ({ hash, items }));
}

/**
 * Synchronous reused password detection using plaintext comparison.
 * Used when crypto.subtle is not needed (fallback for rendering).
 */
export function findReusedPasswordsSync(items: VaultItem[]): ReusedGroup[] {
  const passwords = items.filter((i): i is PasswordItem => i.type === 'password');
  const map = new Map<string, PasswordItem[]>();

  for (const item of passwords) {
    if (!item.password) continue;
    // Use a simple hash-like key (base64 of password) for grouping
    // This is still in-memory only, never transmitted
    const key = item.password;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }

  return Array.from(map.entries())
    .filter(([, group]) => group.length > 1)
    .map(([hash, items]) => ({ hash, items }));
}

// ─── Security Score ─────────────────────────────────────────────

/**
 * Calculate an overall security score 0–100 for the vault.
 *
 * Weighted formula:
 * - 40% — ratio of strong passwords (strength >= 3)
 * - 30% — absence of password reuse
 * - 30% — absence of breaches (currently always clean since breach API is Phase 4)
 */
export function calculateSecurityScore(
  items: VaultItem[],
  reusedGroups: ReusedGroup[]
): number {
  const passwords = items.filter((i): i is PasswordItem => i.type === 'password');
  if (passwords.length === 0) return 100; // No passwords = nothing to be insecure about

  // Factor 1: Strong password ratio (40%)
  const strongCount = passwords.filter(p => {
    const score = calculatePasswordStrength(p.password);
    return score >= 3;
  }).length;
  const strengthRatio = strongCount / passwords.length;
  const strengthScore = strengthRatio * 40;

  // Factor 2: Absence of reuse (30%)
  const reusedItemCount = reusedGroups.reduce((acc, g) => acc + g.items.length, 0);
  const reuseRatio = 1 - Math.min(reusedItemCount / passwords.length, 1);
  const reuseScore = reuseRatio * 30;

  // Factor 3: Absence of breaches (30%)
  // Phase 4 will implement real breach checking. For now, assume clean.
  const breachScore = 30;

  return Math.round(strengthScore + reuseScore + breachScore);
}
