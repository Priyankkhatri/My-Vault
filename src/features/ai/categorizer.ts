/**
 * AI Categorizer — Auto-classify vault items on creation
 *
 * Uses Groq 8B model for instant 1-shot category assignment.
 * Only name + URL sent (never credentials).
 */

import { aiCategorize } from '../../services/vaultService';

const CATEGORY_MAP: Record<string, string[]> = {
  banking: ['bank', 'chase', 'wells fargo', 'paypal', 'venmo', 'stripe', 'plaid'],
  social: ['facebook', 'instagram', 'twitter', 'tiktok', 'linkedin', 'reddit', 'discord'],
  developer: ['github', 'gitlab', 'stackoverflow', 'npm', 'vercel', 'aws', 'azure', 'docker'],
  shopping: ['amazon', 'ebay', 'walmart', 'target', 'shopify', 'etsy'],
  travel: ['airbnb', 'booking', 'expedia', 'airline', 'uber', 'lyft'],
  email: ['gmail', 'outlook', 'yahoo', 'protonmail', 'icloud'],
  work: ['slack', 'zoom', 'teams', 'jira', 'confluence', 'notion', 'figma'],
  entertainment: ['netflix', 'spotify', 'youtube', 'disney', 'hbo', 'twitch', 'steam'],
};

/**
 * Try local rule-based categorization first.
 * Falls back to AI only if local fails.
 */
export function localCategorize(name: string, url: string): string | null {
  const combined = `${name} ${url}`.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_MAP)) {
    if (keywords.some(kw => combined.includes(kw))) {
      return category;
    }
  }

  return null; // No match — needs AI
}

/**
 * Categorize a vault item using local rules + AI fallback.
 */
export async function categorizeVaultItem(name: string, url: string): Promise<string> {
  // Try local first (instant, no API cost)
  const localResult = localCategorize(name, url);
  if (localResult) return localResult;

  // Fallback to AI
  try {
    const res = await aiCategorize(name, url);
    if (res.success && res.data) {
      return res.data.category;
    }
  } catch (error) {
    console.error('[AI Categorizer] Error:', error);
  }

  return 'other';
}
