import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase env missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env for Strategy Exchange.'
  );
}

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
