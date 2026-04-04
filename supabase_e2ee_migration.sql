-- ============================================================
-- My-Vault: Zero-Knowledge Encryption (E2EE) Migration
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Add encrypted data columns to vault_items
ALTER TABLE vault_items ADD COLUMN IF NOT EXISTS encrypted_data TEXT;
ALTER TABLE vault_items ADD COLUMN IF NOT EXISTS encryption_iv TEXT;

-- 2. Create per-user encryption metadata table
CREATE TABLE IF NOT EXISTS user_encryption_meta (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  salt TEXT NOT NULL,
  key_check TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable RLS on the new table
ALTER TABLE user_encryption_meta ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies for user_encryption_meta
CREATE POLICY "Users can read own encryption meta"
  ON user_encryption_meta FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own encryption meta"
  ON user_encryption_meta FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own encryption meta"
  ON user_encryption_meta FOR UPDATE
  USING (auth.uid() = user_id);
