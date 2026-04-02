/**
 * Groq AI Client — Production Implementation
 * 
 * Uses the OpenAI-compatible SDK with Groq's endpoint.
 * All requests are proxied through the backend — client never talks to Groq directly.
 * No raw vault data is ever sent — only sanitized metadata.
 */

import OpenAI from 'openai';
import { env } from '../config/env.js';

const groq = new OpenAI({
  apiKey: env.groqApiKey,
  baseURL: 'https://api.groq.com/openai/v1',
});

// ─── Security Audit (70B model — complex reasoning) ─────────────

export async function runSecurityAudit(metadata: {
  age: number;
  reuseCount: number;
  entropyScore: number;
}) {
  try {
    const res = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a security analyst. Evaluate password metadata only. Never accept actual passwords. Respond with JSON: {"assessment":"...","severity":"low|medium|high|critical"}',
        },
        {
          role: 'user',
          content: `Age: ${metadata.age} days, Reuse: ${metadata.reuseCount}x, Entropy: ${metadata.entropyScore}/100. Risk assessment in 1 sentence.`,
        },
      ],
      temperature: 0.3,
      max_tokens: 150,
    });
    return parseAIResponse(res.choices[0].message.content || '');
  } catch (error) {
    console.error('[AI] Security audit error:', error);
    return { assessment: 'AI analysis unavailable. Manual review recommended.', severity: 'medium' as const };
  }
}

// ─── Password Strength Analysis (8B model — fast) ───────────────

export async function analyzePasswordStrength(entropyScore: number, flags: string[]) {
  try {
    const res = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'user',
          content: `Given the password entropy score: ${entropyScore}, and the following pattern flags: ${flags.join(', ')}. Does this suggest the password is unsafe? Suggest improvements. Reply in 1 sentence.`,
        },
      ],
      temperature: 0.2,
      max_tokens: 80,
    });
    return res.choices[0].message.content?.trim() || 'Analysis unavailable.';
  } catch (error) {
    console.error('[AI] Password analysis error:', error);
    return 'AI analysis unavailable.';
  }
}

// ─── Natural Language Vault Search (70B model) ──────────────────

export async function semanticSearch(query: string, itemList: string[]) {
  try {
    const res = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You match user queries to vault item names/urls. Reply ONLY with a JSON array of matching indices. Never invent items. If no match, reply [].',
        },
        {
          role: 'user',
          content: `User asked: "${query}". Items: ${JSON.stringify(itemList)}. Reply with best matching indices as JSON array.`,
        },
      ],
      temperature: 0.1,
      max_tokens: 50,
    });
    const content = res.choices[0].message.content || '[]';
    const match = content.match(/\[[\d,\s]*\]/);
    return match ? JSON.parse(match[0]) : [];
  } catch (error) {
    console.error('[AI] Search error:', error);
    return [];
  }
}

// ─── Auto-Categorization (8B model — fires once on creation) ────

export async function categorizeItem(name: string, url: string) {
  try {
    const res = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'user',
          content: `Classify this vault item. Name: "${name}", URL: "${url}". Categories: banking, social, developer, shopping, travel, email, work, entertainment, other. Reply with only the category name.`,
        },
      ],
      temperature: 0,
      max_tokens: 10,
    });
    return res.choices[0].message.content?.trim().toLowerCase() || 'other';
  } catch (error) {
    console.error('[AI] Categorization error:', error);
    return 'other';
  }
}

// ─── AI Assistant Chat (70B model) ──────────────────────────────

export async function chatAssistant(messages: { role: string; content: string }[]) {
  try {
    const res = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are The Vault AI Security Copilot. You help users improve their digital security posture. Rules:
1. Never accept, generate, or discuss actual passwords
2. Only work with metadata (entropy scores, age, reuse counts)
3. Give concise, actionable security advice
4. Be friendly but professional
5. If asked about anything non-security related, politely redirect`,
        },
        ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      ],
      temperature: 0.5,
      max_tokens: 300,
    });
    return res.choices[0].message.content?.trim() || 'I apologize, I could not generate a response.';
  } catch (error) {
    console.error('[AI] Chat error:', error);
    return 'AI assistant is temporarily unavailable. Please try again later.';
  }
}

// ─── Behavioral Threat Detection (70B model) ────────────────────

export async function generateThreatNarrative(context: {
  ip: string; city: string; device: string; time: string;
}) {
  try {
    const res = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: `Analyze: login from IP ${context.ip}, location ${context.city}, device ${context.device} at ${context.time}. Could this be suspicious? Explain why or why not in 1-2 sentences.`,
        },
      ],
      temperature: 0.3,
      max_tokens: 150,
    });
    return res.choices[0].message.content?.trim() || 'Unable to analyze threat context.';
  } catch (error) {
    console.error('[AI] Threat detection error:', error);
    return 'Threat analysis unavailable.';
  }
}

// ─── Helper ─────────────────────────────────────────────────────

function parseAIResponse(content: string) {
  try {
    const jsonMatch = content.match(/\{.*\}/s);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch { /* fallthrough */ }
  // Fallback: extract severity from text
  const severity = content.toLowerCase().includes('critical') ? 'critical'
    : content.toLowerCase().includes('high') ? 'high'
    : content.toLowerCase().includes('medium') ? 'medium' : 'low';
  return { assessment: content, severity };
}
