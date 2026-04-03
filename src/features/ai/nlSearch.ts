/**
 * NL Search — Natural Language Vault Search
 *
 * Two-tier search:
 * 1. Local fuzzy matching (instant, no API call)
 * 2. AI semantic search via Groq (fallback for complex queries)
 */

import { aiSearch } from '../../services/vaultService';
import type { VaultItem, PasswordItem } from '../../types/vault';

interface SearchResult {
 item: VaultItem;
 score: number;
 matchType: 'exact' | 'fuzzy' | 'ai';
}

/**
 * Local fuzzy search — runs instantly, no API call.
 */
export function localSearch(query: string, items: VaultItem[]): SearchResult[] {
 if (!query.trim()) return [];

 const q = query.toLowerCase().trim();
 const results: SearchResult[] = [];

 for (const item of items) {
 let score = 0;
 let matched = false;

 // Title exact match (highest weight)
 if (item.title.toLowerCase() === q) {
 score = 100;
 matched = true;
 } else if (item.title.toLowerCase().includes(q)) {
 score = 80;
 matched = true;
 }

 // Tag match
 if (item.tags.some(t => t.toLowerCase().includes(q))) {
 score = Math.max(score, 60);
 matched = true;
 }

 // Password-specific: username, website
 if (item.type === 'password') {
 const pw = item as PasswordItem;
 if (pw.username?.toLowerCase().includes(q)) {
 score = Math.max(score, 70);
 matched = true;
 }
 if (pw.website?.toLowerCase().includes(q)) {
 score = Math.max(score, 75);
 matched = true;
 }
 }

 // Folder match
 if (item.folder?.toLowerCase().includes(q)) {
 score = Math.max(score, 40);
 matched = true;
 }

 if (matched) {
 results.push({ item, score, matchType: score === 100 ? 'exact' : 'fuzzy' });
 }
 }

 return results.sort((a, b) => b.score - a.score);
}

/**
 * AI-powered semantic search — uses Groq API for intent parsing.
 * Falls back to this when local search returns few or no results.
 */
export async function semanticSearchItems(
 query: string,
 items: VaultItem[]
): Promise<SearchResult[]> {
 // First try local search
 const localResults = localSearch(query, items);

 // If local found good results, return them
 if (localResults.length > 0 && localResults[0].score >= 60) {
 return localResults;
 }

 // Fallback to AI search — only send item names + URLs (never secrets)
 try {
 const itemNames = items.map(item => {
 if (item.type === 'password') {
 return `${item.title} (${(item as PasswordItem).website})`;
 }
 return item.title;
 });

 const res = await aiSearch(query, itemNames);

 if (res.success && res.data && res.data.matchedIndices.length > 0) {
 const aiResults: SearchResult[] = res.data.matchedIndices
 .filter((idx: number) => idx >= 0 && idx < items.length)
 .map((idx: number, i: number) => ({
 item: items[idx],
 score: 90 - i * 10, // Decreasing score for ranked results
 matchType: 'ai' as const,
 }));

 // Merge with local results, deduplicating
 const seen = new Set(aiResults.map(r => r.item.id));
 const merged = [
 ...aiResults,
 ...localResults.filter(r => !seen.has(r.item.id)),
 ];

 return merged;
 }
 } catch (error) {
 console.error('[AI Search] Error:', error);
 }

 // Return whatever local search found
 return localResults;
}

/**
 * Detect if a query is"natural language" (needs AI) vs simple keyword.
 */
export function isNaturalLanguageQuery(query: string): boolean {
 const nlIndicators = [
 /^(show|find|get|list|search for|where|which|what)\s/i,
 /\b(my|the|all|any)\b/i,
 /\b(recent|old|weak|strong|new)\b/i,
 /\b(bank|social|work|personal)\b/i,
 /\?$/,
 ];

 return nlIndicators.some(re => re.test(query.trim()));
}
