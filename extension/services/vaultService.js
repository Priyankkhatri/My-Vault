/**
 * vaultService.js
 * E2EE CRUD operations for vault items via Supabase REST API.
 * ALL sensitive data is encrypted before storage and decrypted after fetch.
 *
 * DB columns: id (auto-UUID), user_id, type, encrypted_data, encryption_iv,
 *             version, created_at, updated_at
 *
 * Encrypted blob: ALL other fields (title, favorite, tags, username, password,
 *                 url, notes, cardName, fullName, content, etc.)
 */

var vaultService = {
  /**
   * Fetch all vault items, decrypt each one.
   * Handles legacy (plaintext) rows by migrating them to encrypted.
   */
  async getAll() {
    var session = await self.authService.getSession();
    if (!session) throw new Error("Not authenticated");

    var masterKey = self.authService.getMasterKey();
    if (!masterKey) throw new Error("Vault is locked. Enter master password.");

    var path = "/rest/v1/vault_items"
      + "?user_id=eq." + session.user.id
      + "&order=created_at.desc"
      + "&select=*";

    var result = await self.supabaseRequest("GET", path, null, session.access_token);
    if (result.error) throw new Error(result.error);

    var items = [];
    var rows = result.data || [];

    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      try {
        if (row.encrypted_data && row.encryption_iv) {
          // ── Encrypted row: decrypt and spread all fields ──
          var decrypted = await self.cryptoService.decrypt(
            row.encrypted_data, row.encryption_iv, masterKey
          );
          items.push(_reconstructItem(row, decrypted));
        } else if (row.title || row.username || row.password) {
          // ── Legacy plaintext row: migrate ──
          var legacyData = {
            title: row.title || "",
            favorite: row.favorite || false,
            tags: row.tags || [],
            notes: row.notes || "",
            username: row.username || "",
            password: row.password || "",
            url: row.url || "",
          };

          var enc = await self.cryptoService.encrypt(legacyData, masterKey);

          // Update row to encrypted (migration)
          var updatePath = "/rest/v1/vault_items"
            + "?id=eq." + row.id
            + "&user_id=eq." + session.user.id;

          await self.supabaseRequest("PATCH", updatePath, {
            encrypted_data: enc.encrypted,
            encryption_iv: enc.iv,
          }, session.access_token);

          items.push(_reconstructItem(row, legacyData));
        }
      } catch (err) {
        console.error("[vaultService] Failed to decrypt item:", row.id, err);
      }
    }

    return items;
  },

  /**
   * Get a single vault item by ID.
   */
  async getById(id) {
    var items = await this.getAll();
    return items.find(function (item) { return item.id === id; }) || null;
  },

  /**
   * Add a new vault item (encrypted).
   * Does NOT send id — Supabase auto-generates UUID.
   */
  async add(item) {
    var session = await self.authService.getSession();
    if (!session) throw new Error("Not authenticated");

    var masterKey = self.authService.getMasterKey();
    if (!masterKey) throw new Error("Vault is locked.");

    // Extract ALL sensitive data for encryption (everything except id/type/timestamps)
    var sensitiveData = _extractSensitiveData(item);

    var enc = await self.cryptoService.encrypt(sensitiveData, masterKey);

    // DO NOT include id — let Supabase generate UUID
    var payload = {
      user_id: session.user.id,
      type: item.type || "password",
      encrypted_data: enc.encrypted,
      encryption_iv: enc.iv,
    };

    var result = await self.supabaseRequest(
      "POST", "/rest/v1/vault_items?select=id,created_at,updated_at",
      payload, session.access_token
    );

    if (result.error) throw new Error(result.error);

    // Get the Supabase-generated UUID from response
    var inserted = Array.isArray(result.data) ? result.data[0] : result.data;
    var newId = inserted ? inserted.id : "";

    return {
      id: newId,
      type: item.type || "password",
      createdAt: inserted ? inserted.created_at : new Date().toISOString(),
      updatedAt: inserted ? inserted.updated_at : new Date().toISOString(),
      ...sensitiveData,
    };
  },

  /**
   * Update an existing vault item (re-encrypt all sensitive data).
   */
  async update(id, data) {
    var session = await self.authService.getSession();
    if (!session) throw new Error("Not authenticated");

    var masterKey = self.authService.getMasterKey();
    if (!masterKey) throw new Error("Vault is locked.");

    // Extract ALL sensitive fields for re-encryption
    var sensitiveData = _extractSensitiveData(data);

    var enc = await self.cryptoService.encrypt(sensitiveData, masterKey);

    var path = "/rest/v1/vault_items"
      + "?id=eq." + id
      + "&user_id=eq." + session.user.id;

    // Only update encrypted_data and encryption_iv — no plaintext columns
    var result = await self.supabaseRequest("PATCH", path, {
      encrypted_data: enc.encrypted,
      encryption_iv: enc.iv,
      updated_at: new Date().toISOString(),
    }, session.access_token);

    if (result.error) throw new Error(result.error);

    return { id: id, type: data.type, ...sensitiveData };
  },

  /**
   * Delete a vault item.
   */
  async remove(id) {
    var session = await self.authService.getSession();
    if (!session) throw new Error("Not authenticated");

    var path = "/rest/v1/vault_items"
      + "?id=eq." + id
      + "&user_id=eq." + session.user.id;

    var result = await self.supabaseRequest("DELETE", path, null, session.access_token);
    if (result.error) throw new Error(result.error);
  }
};

function _extractSensitiveData(item) {
  var plaintextMetadata = ["id", "user_id", "type", "createdAt", "updatedAt", "created_at", "updated_at", "version", "encrypted_data", "encryption_iv"];
  
  var sensitive = {};
  
  for (var key in item) {
    if (item.hasOwnProperty(key) && plaintextMetadata.indexOf(key) === -1) {
      sensitive[key] = item[key];
    }
  }

  return sensitive;
}

/**
 * Reconstruct a VaultItem from DB row + decrypted blob.
 * Spreads ALL decrypted fields — works for any item type.
 */
function _reconstructItem(row, decrypted) {
  return {
    id: row.id,
    type: row.type || "password",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Spread ALL decrypted fields (title, username, password, cardName, content, etc.)
    ...decrypted,
  };
}

if (typeof self !== "undefined") {
  self.vaultService = vaultService;
}
