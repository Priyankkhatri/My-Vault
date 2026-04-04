/**
 * messageHandler.js
 * Central router for messages from popup & content scripts.
 * Handles AUTH, MASTER_KEY, VAULT, and AUTOFILL message types.
 */

var _failedAttempts = 0;
var _lockoutTime = 0;

var handleMessage = async function (request) {
  try {
    if (!request || !request.type || !request.action) {
      throw new Error("Invalid request format");
    }

    var type = request.type;
    var action = request.action;
    var payload = request.payload;

    // ─── AUTH ───
    if (type === "AUTH") {
      switch (action) {
        case "signIn": {
          var result = await self.authService.signIn(payload.email, payload.password);
          if (result.success) {
            self.alarmManager.startAutoLockTimer();
          }
          return result.success
            ? { success: true, data: result.user }
            : { success: false, error: result.error };
        }

        case "signOut": {
          await self.authService.signOut();
          return { success: true, data: null };
        }

        case "getSession": {
          var session = await self.authService.getSession();
          if (session) {
            return { success: true, data: { user: session.user } };
          }
          return { success: false, error: "No active session" };
        }

        default:
          throw new Error("Unknown AUTH action: " + action);
      }
    }

    // ─── MASTER_KEY ───
    if (type === "MASTER_KEY") {
      switch (action) {
        case "status": {
          // Check if master key is set in memory + if user has set up encryption
          var isSet = self.authService.isMasterKeySet();
          if (isSet) {
            return { success: true, data: { isSet: true, needsSetup: false } };
          }

          // Check if user has encryption meta in Supabase
          var sesh = await self.authService.getSession();
          if (!sesh) {
            return { success: false, error: "Not authenticated" };
          }

          var metaPath = "/rest/v1/user_encryption_meta"
            + "?user_id=eq." + sesh.user.id
            + "&select=salt,key_check";
          var metaResult = await self.supabaseRequest("GET", metaPath, null, sesh.access_token);

          var hasSetup = metaResult.data && metaResult.data.length > 0;
          return {
            success: true,
            data: { isSet: false, needsSetup: !hasSetup }
          };
        }

        case "setup": {
          // First-time master password setup
          var setupSession = await self.authService.getSession();
          if (!setupSession) return { success: false, error: "Not authenticated" };

          var salt = self.cryptoService.generateSalt();
          var key = await self.cryptoService.deriveKey(payload.password, salt);
          var keyCheck = await self.cryptoService.generateKeyCheck(key);

          // Store salt + key_check in Supabase
          var insertResult = await self.supabaseRequest(
            "POST",
            "/rest/v1/user_encryption_meta",
            {
              user_id: setupSession.user.id,
              salt: salt,
              key_check: keyCheck,
            },
            setupSession.access_token
          );

          if (insertResult.error) {
            return { success: false, error: insertResult.error };
          }

          // Store key in memory
          self.authService.setMasterKey(key);
          self.alarmManager.startAutoLockTimer();
          return { success: true, data: null };
        }

        case "unlock": {
          // Brute-force protection
          if (_lockoutTime && Date.now() < _lockoutTime) {
            var remain = Math.ceil((_lockoutTime - Date.now()) / 1000);
            return { success: false, error: "Too many failed attempts. Try again in " + remain + "s." };
          }

          // Unlock with existing master password
          var unlockSession = await self.authService.getSession();
          if (!unlockSession) return { success: false, error: "Not authenticated" };

          // Fetch salt + key_check
          var fetchPath = "/rest/v1/user_encryption_meta"
            + "?user_id=eq." + unlockSession.user.id
            + "&select=salt,key_check";
          var fetchResult = await self.supabaseRequest(
            "GET", fetchPath, null, unlockSession.access_token
          );

          if (!fetchResult.data || fetchResult.data.length === 0) {
            return { success: false, error: "No encryption setup found." };
          }

          var meta = fetchResult.data[0];
          var derivedKey = await self.cryptoService.deriveKey(payload.password, meta.salt);
          var isValid = await self.cryptoService.verifyKeyCheck(derivedKey, meta.key_check);

          if (!isValid) {
            _failedAttempts++;
            if (_failedAttempts >= 3) {
              _lockoutTime = Date.now() + 60000;
              return { success: false, error: "Too many failed attempts. Locked for 60s." };
            }
            return { success: false, error: "Incorrect master password. " + (3 - _failedAttempts) + " attempts left." };
          }

          _failedAttempts = 0;
          _lockoutTime = 0;
          self.authService.setMasterKey(derivedKey);
          self.alarmManager.startSyncTimer();
          self.syncManager.syncVault(); // Initial sync
          self.alarmManager.startAutoLockTimer();
          return { success: true, data: null };
        }

        case "lock": {
          self.authService.clearMasterKey();
          return { success: true, data: null };
        }

        default:
          throw new Error("Unknown MASTER_KEY action: " + action);
      }
    }

    // ─── VAULT ───
    if (type === "VAULT") {
      var vaultSession = await self.authService.getSession();
      if (!vaultSession) {
        return { success: false, error: "Not authenticated. Please sign in." };
      }

      // Master key must be set for vault operations
      if (!self.authService.isMasterKeySet()) {
        return { success: false, error: "Vault is locked. Enter master password." };
      }

      switch (action) {
        case "getAll": {
          var items = await self.syncManager.getVault();
          self.alarmManager.startAutoLockTimer();
          return { success: true, data: items };
        }

        case "add": {
          var added = await self.vaultService.add(payload);
          await self.syncManager.syncVault(); // Update cache
          self.alarmManager.startAutoLockTimer();
          return { success: true, data: added };
        }

        case "update": {
          var updated = await self.vaultService.update(payload.id, payload.data);
          await self.syncManager.syncVault(); // Update cache
          self.alarmManager.startAutoLockTimer();
          return { success: true, data: updated };
        }

        case "delete": {
          await self.vaultService.remove(payload.id);
          await self.syncManager.syncVault(); // Update cache
          self.alarmManager.startAutoLockTimer();
          return { success: true, data: null };
        }

        default:
          throw new Error("Unknown VAULT action: " + action);
      }
    }

    // ─── AUTOFILL ───
    if (type === "AUTOFILL") {
      if (action === "fill") {
        var tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs || tabs.length === 0) {
          return { success: false, error: "No active tab found" };
        }

        await chrome.tabs.sendMessage(tabs[0].id, {
          type: "AUTOFILL_CREDENTIALS",
          credentials: {
            username: payload.username || "",
            password: payload.password || ""
          }
        });

        return { success: true, data: null };
      }

      throw new Error("Unknown AUTOFILL action: " + action);
    }

    throw new Error("Unknown message type: " + type);
  } catch (error) {
    console.error("[messageHandler] Error:", error);
    return { success: false, error: error.message || "Unknown error" };
  }
};

if (typeof self !== "undefined") {
  self.handleMessage = handleMessage;
}
