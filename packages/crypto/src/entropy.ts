/**
 * Password Entropy & Pattern Analysis
 *
 * Runs entirely locally — no data leaves the client.
 * Used to compute metadata for the AI layer (AI only receives scores, never passwords).
 */

export interface EntropyResult {
  score: number; // 0-100 normalized
  bitsOfEntropy: number;
  strength: 'weak' | 'fair' | 'strong' | 'excellent';
  flags: string[];
}

/** Common patterns that weaken passwords */
const COMMON_PATTERNS = [
  { regex: /^[a-z]+$/i, flag: 'all-letters' },
  { regex: /^[0-9]+$/, flag: 'all-digits' },
  { regex: /^(.)\1+$/, flag: 'repeated-char' },
  { regex: /123|abc|qwerty|password|pass|admin|letme/i, flag: 'common-sequence' },
  { regex: /^[a-z]+[0-9]+$/i, flag: 'word-then-numbers' },
  { regex: /(19|20)\d{2}/, flag: 'contains-year' },
  { regex: /(.)\1{2,}/, flag: 'triple-repeat' },
];

/** Top 50 most common passwords (lowercase for matching) */
const COMMON_PASSWORDS = new Set([
  'password', '123456', '123456789', '12345678', '12345', '1234567',
  'password1', 'qwerty', 'abc123', 'monkey', 'master', 'dragon',
  'login', 'princess', 'football', 'shadow', 'sunshine', 'trustno1',
  'iloveyou', 'batman', 'access', 'hello', 'charlie', 'donald',
  'password123', 'admin', 'qwerty123', 'welcome', 'letmein', '1234',
]);

/**
 * Calculate the character set size based on which character classes are present.
 */
function getCharsetSize(password: string): number {
  let size = 0;
  if (/[a-z]/.test(password)) size += 26;
  if (/[A-Z]/.test(password)) size += 26;
  if (/[0-9]/.test(password)) size += 10;
  if (/[^a-zA-Z0-9]/.test(password)) size += 33; // special chars
  return Math.max(size, 1);
}

/**
 * Calculate Shannon entropy in bits: H = L × log2(C)
 * where L = password length, C = character set size.
 */
function calculateBitsOfEntropy(password: string): number {
  const charsetSize = getCharsetSize(password);
  return password.length * Math.log2(charsetSize);
}

/**
 * Detect known weak patterns in a password.
 * Returns an array of flag strings describing detected issues.
 */
function detectPatterns(password: string): string[] {
  const flags: string[] = [];

  if (password.length < 8) flags.push('too-short');
  if (password.length < 6) flags.push('critically-short');
  if (COMMON_PASSWORDS.has(password.toLowerCase())) flags.push('common-password');

  for (const { regex, flag } of COMMON_PATTERNS) {
    if (regex.test(password)) flags.push(flag);
  }

  // Check for keyboard walks (simplified)
  const lowerPw = password.toLowerCase();
  const walks = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1234567890'];
  for (const walk of walks) {
    for (let i = 0; i <= walk.length - 4; i++) {
      if (lowerPw.includes(walk.substring(i, i + 4))) {
        flags.push('keyboard-walk');
        break;
      }
    }
  }

  return [...new Set(flags)]; // deduplicate
}

/**
 * Normalize bits of entropy to a 0-100 score.
 * 128+ bits = 100, with penalty for detected patterns.
 */
function normalizeScore(bits: number, flagCount: number): number {
  const baseScore = Math.min(100, (bits / 128) * 100);
  const penalty = flagCount * 10;
  return Math.max(0, Math.round(baseScore - penalty));
}

/**
 * Get strength label from normalized score.
 */
function getStrength(score: number): EntropyResult['strength'] {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'strong';
  if (score >= 40) return 'fair';
  return 'weak';
}

/**
 * Analyze a password's entropy and vulnerability patterns.
 *
 * @param password — The raw password string (NEVER sent to AI or server)
 * @returns EntropyResult with score, bits, strength label, and pattern flags
 */
export function analyzePassword(password: string): EntropyResult {
  if (!password || password.length === 0) {
    return { score: 0, bitsOfEntropy: 0, strength: 'weak', flags: ['empty'] };
  }

  const bitsOfEntropy = calculateBitsOfEntropy(password);
  const flags = detectPatterns(password);
  const score = normalizeScore(bitsOfEntropy, flags.length);
  const strength = getStrength(score);

  return { score, bitsOfEntropy: Math.round(bitsOfEntropy * 10) / 10, strength, flags };
}

/**
 * Detect password reuse across a set of passwords.
 * Returns a map of duplicate identifier → count.
 *
 * Uses a fast hash comparison (not the actual password values).
 */
export async function detectReuse(
  passwords: string[]
): Promise<Map<number, number>> {
  const hashMap = new Map<string, number[]>();

  for (let i = 0; i < passwords.length; i++) {
    const encoded = new TextEncoder().encode(passwords[i]);
    const digest = await crypto.subtle.digest('SHA-256', encoded);
    const hex = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    if (!hashMap.has(hex)) hashMap.set(hex, []);
    hashMap.get(hex)!.push(i);
  }

  // Return indices that share passwords, with reuse count
  const reuse = new Map<number, number>();
  for (const [, indices] of hashMap) {
    if (indices.length > 1) {
      for (const idx of indices) {
        reuse.set(idx, indices.length);
      }
    }
  }
  return reuse;
}
