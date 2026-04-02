/**
 * AI Assistant — Security Copilot Chat
 *
 * Dashboard chat assistant that:
 * - Answers security questions
 * - Suggests actions based on vault health
 * - Guides password hygiene improvements
 *
 * Privacy: Never receives actual passwords or secrets.
 */

import { aiChat } from '../../services/vaultService';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// ─── Conversation State ─────────────────────────────────────────

let conversationHistory: ChatMessage[] = [];

export function getConversationHistory(): ChatMessage[] {
  return [...conversationHistory];
}

export function clearConversation(): void {
  conversationHistory = [];
}

/**
 * Send a message to the AI assistant and get a response.
 *
 * @param userMessage — The user's question or request
 * @param vaultContext — Optional vault metadata for context-aware responses
 */
export async function sendMessage(
  userMessage: string,
  vaultContext?: {
    totalItems: number;
    weakPasswords: number;
    healthScore: number;
    oldPasswords: number;
    reusedCount: number;
  }
): Promise<ChatMessage> {
  // Add user message to history
  const userMsg: ChatMessage = {
    id: `msg-${Date.now()}`,
    role: 'user',
    content: userMessage,
    timestamp: Date.now(),
  };
  conversationHistory.push(userMsg);

  // Build messages for AI (last 10 messages for context window)
  const messages = conversationHistory.slice(-10).map(m => ({
    role: m.role,
    content: m.content,
  }));

  // Prepend vault context if available
  if (vaultContext) {
    messages.unshift({
      role: 'user' as const,
      content: `[CONTEXT] Vault stats: ${vaultContext.totalItems} total items, ${vaultContext.weakPasswords} weak passwords, health score ${vaultContext.healthScore}/100, ${vaultContext.oldPasswords} passwords older than 6 months, ${vaultContext.reusedCount} reused passwords. Use this context to give relevant advice.`,
    });
  }

  try {
    const res = await aiChat(messages);

    const assistantMsg: ChatMessage = {
      id: `msg-${Date.now() + 1}`,
      role: 'assistant',
      content: res.success && res.data
        ? res.data.message
        : 'I apologize, I\'m having trouble connecting right now. Please try again in a moment.',
      timestamp: Date.now(),
    };

    conversationHistory.push(assistantMsg);
    return assistantMsg;
  } catch (error) {
    console.error('[AI Chat] Error:', error);

    const errorMsg: ChatMessage = {
      id: `msg-${Date.now() + 1}`,
      role: 'assistant',
      content: 'I\'m temporarily unavailable. Please try again later.',
      timestamp: Date.now(),
    };

    conversationHistory.push(errorMsg);
    return errorMsg;
  }
}

/**
 * Pre-built quick actions for the AI assistant.
 */
export const QUICK_ACTIONS = [
  { label: '🔍 Audit my vault', prompt: 'Analyze my vault security and tell me the most important things to fix first.' },
  { label: '🔑 Fix weak passwords', prompt: 'What are the best strategies for creating strong, memorable passwords?' },
  { label: '🛡️ Security tips', prompt: 'Give me 5 actionable security tips to improve my digital safety today.' },
  { label: '📊 Explain my score', prompt: 'My vault health score and what each factor means — explain in simple terms.' },
  { label: '⚠️ Check for risks', prompt: 'What are the biggest security risks in a typical password vault and how can I avoid them?' },
] as const;
