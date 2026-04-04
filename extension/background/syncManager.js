/**
 * syncManager.js
 * Handles background synchronization of vault data.
 * Caches encrypted blobs in memory to ensure the popup loads instantly.
 */

var _vaultCache = null;
var _lastSyncTime = 0;

var syncManager = {
  /**
   * Performs an encrypted fetch of all vault items and updates the cache.
   * Note: This only works if the master key is set in authService.
   */
  async syncVault() {
    if (!self.authService || !self.authService.isMasterKeySet()) {
      return { success: false, error: "Vault locked" };
    }

    try {
      const items = await self.vaultService.getAll();
      _vaultCache = items;
      _lastSyncTime = Date.now();
      return { success: true, count: items.length };
    } catch (err) {
      console.error("[syncManager] Sync failed:", err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Returns the cached vault items. If the cache is empty, triggers a sync.
   */
  async getVault(forceRefresh = false) {
    if (!_vaultCache || forceRefresh) {
      await this.syncVault();
    }
    return _vaultCache || [];
  },

  /**
   * Clears the in-memory cache (called on lock/logout).
   */
  clearCache() {
    _vaultCache = null;
    _lastSyncTime = 0;
  }
};

if (typeof self !== 'undefined') {
  self.syncManager = syncManager;
}

