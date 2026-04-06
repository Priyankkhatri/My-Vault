/**
 * ErrorHandler.ts
 * Centralized error management for Vestiga.
 */

export enum ErrorCategory {
  AUTH = 'AUTH',
  CRYPTO = 'CRYPTO',
  NETWORK = 'NETWORK',
  VAULT = 'VAULT',
  UNKNOWN = 'UNKNOWN'
}

export interface VaultError {
  category: ErrorCategory;
  message: string;
  technical?: string;
  retryable: boolean;
}

export const ErrorHandler = {
  /**
   * Translates a technical error into a user-friendly VaultError.
   */
  handle(err: any): VaultError {
    const msg = err.message || String(err);
    
    // Auth Errors
    if (msg.includes('invalid login credentials') || msg.includes('Invalid credentials')) {
      return {
        category: ErrorCategory.AUTH,
        message: 'Invalid email or password. Please try again.',
        retryable: false
      };
    }
    
    // Crypto Errors
    if (msg.includes('decryption failed') || msg.includes('OperationError') || msg.includes('DataError')) {
      return {
        category: ErrorCategory.CRYPTO,
        message: 'Decryption failed. Your master password might be incorrect or data is corrupted.',
        retryable: false
      };
    }
    
    // Network Errors
    if (msg.includes('fetch') || msg.includes('NetworkError') || msg.includes('Failed to fetch')) {
      return {
        category: ErrorCategory.NETWORK,
        message: 'Connection lost. Please check your internet and try again.',
        retryable: true
      };
    }

    // Default Unknown
    return {
      category: ErrorCategory.UNKNOWN,
      message: 'An unexpected error occurred. Please try again later.',
      technical: msg,
      retryable: true
    };
  }
};
