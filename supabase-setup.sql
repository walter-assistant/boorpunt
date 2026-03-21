-- =====================================================
-- Boorpunt — Ground Research BV — Supabase Database Setup
-- =====================================================
-- Copy-paste dit in Supabase Dashboard → SQL Editor
-- en klik "Run" om alle tabellen aan te maken.
-- =====================================================

-- User data table: stores all app data as JSON per key per user
CREATE TABLE IF NOT EXISTS user_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data_key TEXT NOT NULL,
  data_value JSONB,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, data_key)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_data_user_id ON user_data(user_id);
CREATE INDEX IF NOT EXISTS idx_user_data_key ON user_data(user_id, data_key);

-- Enable Row Level Security
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own data
CREATE POLICY "Users can read own data" ON user_data
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data" ON user_data
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data" ON user_data
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own data" ON user_data
  FOR DELETE USING (auth.uid() = user_id);

-- Function to upsert user data (insert or update)
CREATE OR REPLACE FUNCTION upsert_user_data(
  p_user_id UUID,
  p_data_key TEXT,
  p_data_value JSONB
)
RETURNS void AS $$
BEGIN
  INSERT INTO user_data (user_id, data_key, data_value, updated_at)
  VALUES (p_user_id, p_data_key, p_data_value, now())
  ON CONFLICT (user_id, data_key) 
  DO UPDATE SET data_value = p_data_value, updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
