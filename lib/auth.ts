import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabase';

// --- User Auth (Supabase) ---
export async function getSession(): Promise<Session | null> {
  if (!isSupabaseConfigured) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  return session?.user ?? null;
}

export type SignInResult = { ok: true; user: User } | { ok: false; error: string };
export type SignUpResult = { ok: true; user: User; needsConfirm?: boolean } | { ok: false; error: string };

export async function signIn(email: string, password: string): Promise<SignInResult> {
  if (!isSupabaseConfigured) return { ok: false, error: 'ยังไม่ได้ตั้งค่า Supabase' };
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };
  if (!data.user) return { ok: false, error: 'เข้าสู่ระบบไม่สำเร็จ' };
  return { ok: true, user: data.user };
}

export async function signUp(email: string, password: string): Promise<SignUpResult> {
  if (!isSupabaseConfigured) return { ok: false, error: 'ยังไม่ได้ตั้งค่า Supabase' };
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { ok: false, error: error.message };
  if (!data.user) return { ok: false, error: 'สมัครสมาชิกไม่สำเร็จ' };
  const needsConfirm = !!data.user && !data.session;
  return { ok: true, user: data.user, needsConfirm };
}

export async function signOut(): Promise<void> {
  if (isSupabaseConfigured) await supabase.auth.signOut();
}

// --- Admin MindDojo (สำหรับดูข้อมูล Supabase) ---
const ADMIN_AUTH_KEY = 'minddojo_admin_authenticated';

export const ADMIN_USERNAME = import.meta.env.VITE_ADMIN_USERNAME || 'admin';
export const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'minddojo';

export function isAdminAuthenticated(): boolean {
  return typeof window !== 'undefined' && localStorage.getItem(ADMIN_AUTH_KEY) === 'true';
}

export function setAdminAuthenticated(): void {
  if (typeof window !== 'undefined') localStorage.setItem(ADMIN_AUTH_KEY, 'true');
}

export function logoutAdmin(): void {
  if (typeof window !== 'undefined') localStorage.removeItem(ADMIN_AUTH_KEY);
}

export function validateAdminCredentials(username: string, password: string): boolean {
  return username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
}
