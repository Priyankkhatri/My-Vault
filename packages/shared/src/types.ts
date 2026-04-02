// ─── Vault Item Types ───────────────────────────────────────────

export type VaultCategory = 'password' | 'address' | 'card' | 'note' | 'document';

export interface VaultItemBase {
  id: string;
  type: VaultCategory;
  title: string;
  favorite: boolean;
  tags: string[];
  folder?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PasswordItem extends VaultItemBase {
  type: 'password';
  website: string;
  url: string;
  username: string;
  password: string;
  strength: 'weak' | 'fair' | 'strong' | 'excellent';
}

export interface AddressItem extends VaultItemBase {
  type: 'address';
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
}

export interface CardItem extends VaultItemBase {
  type: 'card';
  cardName: string;
  cardholderName: string;
  number: string;
  expiry: string;
  cvv: string;
  billingAddress?: string;
}

export interface NoteItem extends VaultItemBase {
  type: 'note';
  content: string;
  sensitive: boolean;
}

export interface DocumentItem extends VaultItemBase {
  type: 'document';
  fileName: string;
  fileSize: string;
  fileType: string;
  encrypted: boolean;
}

export type VaultItem = PasswordItem | AddressItem | CardItem | NoteItem | DocumentItem;

// ─── Auth Types ─────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface DeviceSession {
  id: string;
  deviceName: string;
  lastActive: string;
  ipAddress: string;
  isCurrent: boolean;
}

// ─── AI Types ───────────────────────────────────────────────────

export type AIFeature =
  | 'security_audit'
  | 'nl_search'
  | 'password_analysis'
  | 'chat'
  | 'categorization'
  | 'threat_detection'
  | 'autofill';

export interface AIQuotaStatus {
  feature: AIFeature;
  used: number;
  limit: number;
  remaining: number;
}

export interface AISecurityAuditRequest {
  age: number;
  reuseCount: number;
  entropyScore: number;
}

export interface AISecurityAuditResponse {
  assessment: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface AICategorizeRequest {
  name: string;
  url: string;
}

export interface AISearchRequest {
  query: string;
  itemNames: string[];
}

export interface AIChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIPasswordAnalysisRequest {
  entropyScore: number;
  flags: string[];
}

export interface AIThreatContext {
  ip: string;
  city: string;
  device: string;
  time: string;
}

// ─── API Types ──────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface AuthRegisterRequest {
  email: string;
  authHash: string;
  salt: string;
  kdfParams: { iterations: number };
}

export interface AuthLoginRequest {
  email: string;
  authHash: string;
}

export interface AuthTokens {
  accessToken: string;
  expiresIn: number;
}

export interface SyncPayload {
  changes: Array<{
    id: string;
    version: number;
    encryptedData: string;
    iv: string;
    itemType: string;
    metadata: Record<string, unknown>;
    deleted?: boolean;
  }>;
  lastSyncTimestamp: string;
}

// ─── UI State Types ─────────────────────────────────────────────

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

export interface SecurityAuditResult {
  totalItems: number;
  healthScore: number;
  weakPasswords: PasswordItem[];
  reusedPasswords: { password: string; items: PasswordItem[] }[];
  oldPasswords: PasswordItem[];
  missingFields: VaultItem[];
}
