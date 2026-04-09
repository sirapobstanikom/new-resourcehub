import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && anonKey);
export const supabase = createClient(supabaseUrl || '', anonKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'minddojo.supabase.auth.token',
  },
});
/** URL ของโปรเจกต์ Supabase (ไม่มี slash ท้าย) ใช้สำหรับเรียก Edge Functions */
export const supabaseFunctionsUrl = supabaseUrl || '';
/** Anon key สำหรับใส่ในคำขอ Edge Functions (เช่น redirect ไม่ส่ง header ได้) */
export const supabaseAnonKey = anonKey || '';
