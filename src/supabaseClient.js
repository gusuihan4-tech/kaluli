import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabase = null;

export const initSupabase = () => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.log('Supabase not configured. Cloud sync disabled.');
    return null;
  }
  if (!supabase) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabase;
};

export const getSupabase = () => supabase;

// Sign up / sign in with password (simplified auth)
export const signUpUser = async (email, password) => {
  const client = initSupabase();
  if (!client) throw new Error('Supabase not configured');
  return client.auth.signUp({ email, password });
};

export const signInUser = async (email, password) => {
  const client = initSupabase();
  if (!client) throw new Error('Supabase not configured');
  return client.auth.signInWithPassword({ email, password });
};

export const signOutUser = async () => {
  const client = initSupabase();
  if (!client) throw new Error('Supabase not configured');
  return client.auth.signOut();
};

export const getCurrentUser = async () => {
  const client = initSupabase();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data?.session?.user || null;
};

// Sync food logs to Supabase
export const syncFoodLogs = async (userId, username, logs) => {
  const client = initSupabase();
  if (!client) {
    console.log('Supabase sync skipped (not configured)');
    return false;
  }

  try {
    const { error } = await client
      .from('food_logs')
      .upsert(
        {
          user_id: userId,
          username,
          data: logs,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (error) {
      console.error('Sync error:', error);
      return false;
    }
    console.log('Food logs synced successfully');
    return true;
  } catch (err) {
    console.error('Sync exception:', err.message);
    return false;
  }
};

// Fetch food logs from Supabase
export const fetchFoodLogs = async (userId) => {
  const client = initSupabase();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('food_logs')
      .select('data')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Fetch error:', error);
      return null;
    }
    return data?.data || null;
  } catch (err) {
    console.error('Fetch exception:', err.message);
    return null;
  }
};
