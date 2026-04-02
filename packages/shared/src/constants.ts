import type { AIFeature } from './types';

/** Per-user daily AI feature limits */
export const AI_QUOTAS: Record<AIFeature, number> = {
  security_audit: 20,
  nl_search: 50,
  password_analysis: 30,
  chat: 40,
  categorization: Infinity, // unlimited — fires once on item creation
  threat_detection: Infinity, // unlimited — background process
  autofill: Infinity, // unlimited — primarily local
};

/** AI model assignments per feature */
export const AI_MODELS = {
  // Complex reasoning tasks → 70B
  security_audit: 'llama-3.3-70b-versatile',
  nl_search: 'llama-3.3-70b-versatile',
  chat: 'llama-3.3-70b-versatile',
  threat_detection: 'llama-3.3-70b-versatile',
  // Fast, high-frequency tasks → 8B
  password_analysis: 'llama-3.1-8b-instant',
  categorization: 'llama-3.1-8b-instant',
  autofill: 'llama-3.1-8b-instant',
} as const;

/** Groq API configuration */
export const GROQ_CONFIG = {
  baseURL: 'https://api.groq.com/openai/v1',
  defaultTemperature: 0.3,
  maxRetries: 2,
} as const;

/** Vault categories list */
export const VAULT_CATEGORIES = [
  { key: 'password', label: 'Passwords' },
  { key: 'address', label: 'Addresses' },
  { key: 'card', label: 'Cards' },
  { key: 'note', label: 'Notes' },
  { key: 'document', label: 'Documents' },
] as const;
