// @my-vault/crypto — Public API
export {
  deriveKeys,
  generateSalt,
  DEFAULT_KDF_PARAMS,
  uint8ToBase64,
  base64ToUint8,
  uint8ToHex,
  type KDFParams,
} from './keyDerivation';

export {
  encrypt,
  decrypt,
  encryptObject,
  decryptObject,
  type EncryptedPayload,
} from './aesGcm';

export {
  analyzePassword,
  detectReuse,
  type EntropyResult,
} from './entropy';

export {
  initializeVault,
  unlockVault,
  encryptVaultItem,
  decryptVaultItem,
  encryptBatch,
  decryptBatch,
  type VaultCryptoSession,
  type EncryptedVaultItem,
} from './vaultCrypto';
