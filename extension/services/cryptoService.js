/**
 * cryptoService.js — Zero-Knowledge Encryption Engine (Extension)
 *
 * Identical crypto logic to the web app's cryptoService.ts but in
 * vanilla JS for the MV3 service worker. Uses self.crypto (Web Crypto API).
 *
 * - Key derivation: PBKDF2 (600,000 iterations, SHA-256)
 * - Encryption: AES-256-GCM (random 12-byte IV per operation)
 */

var PBKDF2_ITERATIONS = 600000;
var SALT_LENGTH = 16;
var IV_LENGTH = 12;
var KEY_CHECK_PLAINTEXT = "my-vault-key-verification-v1";

var cryptoService = {
  // ─── Buffer ↔ Base64 ───

  bufferToBase64(buffer) {
    var bytes = new Uint8Array(buffer);
    var binary = "";
    for (var i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  },

  base64ToBuffer(base64) {
    var binary = atob(base64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  },

  /**
   * Zeroes out a Uint8Array to prevent sensitive data from lingering in memory.
   */
  zeroOut(array) {
    if (!array) return;
    var view = (array instanceof ArrayBuffer) ? new Uint8Array(array) : array;
    view.fill(0);
  },

  // ─── Salt Generation ───

  generateSalt() {
    var salt = self.crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    return this.bufferToBase64(salt.buffer);
  },

  // ─── Key Derivation (PBKDF2) ───

  /**
   * @param {string} masterPassword
   * @param {string} saltBase64
   * @returns {Promise<CryptoKey>}
   */
  async deriveKey(masterPassword, saltBase64) {
    var encoder = new TextEncoder();

    var passwordKey = await self.crypto.subtle.importKey(
      "raw",
      encoder.encode(masterPassword),
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"]
    );

    var saltBuffer = this.base64ToBuffer(saltBase64);

    return self.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: saltBuffer,
        iterations: PBKDF2_ITERATIONS,
        hash: "SHA-256"
      },
      passwordKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  },

  // ─── Encryption (AES-256-GCM) ───

  /**
   * @param {object} data - Object to encrypt
   * @param {CryptoKey} key
   * @returns {Promise<{encrypted: string, iv: string}>}
   */
  async encrypt(data, key) {
    var encoder = new TextEncoder();
    var plaintext = encoder.encode(JSON.stringify(data));
    
    // Audited: Secure random IV per-user per-encryption
    var iv = self.crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    try {
      var ciphertext = await self.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        plaintext
      );

      return {
        encrypted: this.bufferToBase64(ciphertext),
        iv: this.bufferToBase64(iv.buffer)
      };
    } finally {
      // Zero out sensitive plaintext buffer immediately after use
      this.zeroOut(plaintext);
    }
  },

  // ─── Decryption (AES-256-GCM) ───

  /**
   * @param {string} encryptedBase64
   * @param {string} ivBase64
   * @param {CryptoKey} key
   * @returns {Promise<object>}
   */
  async decrypt(encryptedBase64, ivBase64, key) {
    var ciphertext = this.base64ToBuffer(encryptedBase64);
    var iv = this.base64ToBuffer(ivBase64);

    var plaintext = await self.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      ciphertext
    );

    var decoder = new TextDecoder();
    return JSON.parse(decoder.decode(plaintext));
  },

  // ─── Key Verification ───

  /**
   * Generates a key check value (encrypted known string).
   * @param {CryptoKey} key
   * @returns {Promise<string>} JSON string
   */
  async generateKeyCheck(key) {
    var result = await this.encrypt({ check: KEY_CHECK_PLAINTEXT }, key);
    return JSON.stringify({ encrypted: result.encrypted, iv: result.iv });
  },

  /**
   * Verifies the key against a stored key check.
   * @param {CryptoKey} key
   * @param {string} keyCheckJson
   * @returns {Promise<boolean>}
   */
  async verifyKeyCheck(key, keyCheckJson) {
    try {
      var parsed = JSON.parse(keyCheckJson);
      var decrypted = await this.decrypt(parsed.encrypted, parsed.iv, key);
      return decrypted.check === KEY_CHECK_PLAINTEXT;
    } catch (e) {
      return false;
    }
  }
};

if (typeof self !== "undefined") {
  self.cryptoService = cryptoService;
}
