import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ziqaretckjagqpxpkkdi.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_0mJ1lwEIejHKgCxenHNFog_g1cmxxKX';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Data keys for the boorpunt app
export const DATA_KEYS = ['boreholes', 'klicData', 'mapSettings'] as const;

export type DataKey = typeof DATA_KEYS[number];

// Load all user data from Supabase into window.__supabaseData
export async function loadUserData(userId: string): Promise<Record<string, unknown>> {
  const { data, error } = await supabase
    .from('user_data')
    .select('data_key, data_value')
    .eq('user_id', userId);

  if (error) {
    console.error('Error loading user data:', error);
    return {};
  }

  const result: Record<string, unknown> = {};
  if (data) {
    data.forEach(row => {
      result[row.data_key] = row.data_value;
    });
  }
  return result;
}

// Save a single key to Supabase
export async function saveUserData(userId: string, key: string, value: unknown): Promise<void> {
  const { error } = await supabase
    .from('user_data')
    .upsert(
      { user_id: userId, data_key: key, data_value: value, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,data_key' }
    );

  if (error) {
    console.error('Error saving user data:', error);
  }
}

// Delete all user data from Supabase
export async function deleteAllUserData(userId: string): Promise<void> {
  const { error } = await supabase
    .from('user_data')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting user data:', error);
  }
}
