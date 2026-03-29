import { supabase, isSupabaseConfigured, supabaseFunctionsUrl, supabaseAnonKey } from './supabase';

const SESSION_KEY = 'minddojo_assessment_username';
const SESSION_AT = 'minddojo_assessment_session_at';

export function getMindDojoAssessmentUsername(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SESSION_KEY);
}

export function isMindDojoAssessmentLoggedIn(): boolean {
  return !!getMindDojoAssessmentUsername();
}

export function setMindDojoAssessmentSession(username: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSION_KEY, username);
  localStorage.setItem(SESSION_AT, String(Date.now()));
}

export function clearMindDojoAssessmentSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_AT);
}

type MinddojoAuthJson = {
  error?: string;
  ok?: boolean;
  message?: string;
  username?: string;
  rows?: MinddojoAccountRow[];
};

async function postMinddojoAssessmentAuth(
  bearerToken: string,
  body: Record<string, unknown>,
): Promise<{ data: unknown; error: Error | null }> {
  if (!isSupabaseConfigured || !supabaseFunctionsUrl || !supabaseAnonKey) {
    return { data: null, error: new Error('ยังไม่ได้ตั้งค่า Supabase') };
  }
  let response: Response;
  try {
    response = await fetch(`${supabaseFunctionsUrl}/functions/v1/minddojo-assessment-auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bearerToken}`,
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return {
      data: null,
      error: new Error(
        `เชื่อมต่อ Edge Function ไม่ได้ (${detail}) — ตรวจว่า deploy ชื่อ minddojo-assessment-auth แล้ว, VITE_SUPABASE_URL/ANON_KEY ตรงโปรเจกต์, และลองปิด JWT verify สำหรับฟังก์ชันนี้`,
      ),
    };
  }
  const text = await response.text();
  let json: MinddojoAuthJson = {};
  if (text) {
    try {
      json = JSON.parse(text) as MinddojoAuthJson;
    } catch {
      json = {};
    }
  }
  if (!response.ok) {
    const msg =
      typeof json?.error === 'string'
        ? json.error
        : text && !text.startsWith('{')
          ? text.slice(0, 200)
          : response.status === 404
            ? 'ไม่พบฟังก์ชัน (404) — deploy minddojo-assessment-auth หรือตรวจชื่อ/โปรเจกต์'
            : response.statusText;
    return { data: null, error: new Error(msg) };
  }
  return { data: json, error: null };
}

async function invokeMinddojoAuth(body: Record<string, unknown>): Promise<{ data: unknown; error: Error | null }> {
  return postMinddojoAssessmentAuth(supabaseAnonKey, body);
}

/** สมัคร — รอแอดมินอนุมัติ */
export async function minddojoAssessmentRegister(
  username: string,
  password: string,
): Promise<{ ok: true; message?: string } | { ok: false; error: string }> {
  const u = username.trim().toLowerCase();
  const { data, error } = await invokeMinddojoAuth({
    action: 'register',
    username: u,
    password,
  });
  if (error) return { ok: false as const, error: error.message };
  const d = data as { ok?: boolean; message?: string };
  if (!d?.ok) return { ok: false as const, error: 'สมัครไม่สำเร็จ' };
  return { ok: true as const, message: d.message };
}

/** เข้าสู่ระบบ — เฉพาะบัญชีที่ approved */
export async function minddojoAssessmentLogin(
  username: string,
  password: string,
): Promise<{ ok: true; username: string } | { ok: false; error: string }> {
  const u = username.trim().toLowerCase();
  const { data, error } = await invokeMinddojoAuth({
    action: 'login',
    username: u,
    password,
  });
  if (error) return { ok: false as const, error: error.message };
  const d = data as { ok?: boolean; username?: string };
  if (!d?.ok || !d.username) return { ok: false as const, error: 'เข้าสู่ระบบไม่สำเร็จ' };
  setMindDojoAssessmentSession(d.username);
  return { ok: true as const, username: d.username };
}

/** แอดมิน: รายชื่อบัญชี (ใช้ JWT session แอดมิน — fetch ตรงกับ register/login เพื่อหลีกเลี่ยงข้อผิดพลาดของ functions.invoke) */
export async function minddojoAssessmentAdminList(): Promise<
  { ok: true; rows: MinddojoAccountRow[] } | { ok: false; error: string }
> {
  if (!isSupabaseConfigured) return { ok: false as const, error: 'ยังไม่ได้ตั้งค่า Supabase' };
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError || !session?.access_token) {
    return { ok: false as const, error: 'กรุณาเข้าสู่ระบบแอดมินก่อน' };
  }
  const { data, error } = await postMinddojoAssessmentAuth(session.access_token, { action: 'admin_list' });
  if (error) return { ok: false as const, error: error.message };
  const payload = data as MinddojoAuthJson;
  if (payload?.error) return { ok: false as const, error: payload.error };
  if (!payload?.ok) return { ok: false as const, error: 'โหลดรายการไม่สำเร็จ' };
  return { ok: true as const, rows: payload.rows ?? [] };
}

export async function minddojoAssessmentAdminApprove(
  username: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError || !session?.access_token) {
    return { ok: false as const, error: 'กรุณาเข้าสู่ระบบแอดมินก่อน' };
  }
  const { data, error } = await postMinddojoAssessmentAuth(session.access_token, {
    action: 'admin_approve',
    username: username.trim().toLowerCase(),
  });
  if (error) return { ok: false as const, error: error.message };
  const payload = data as MinddojoAuthJson;
  if (payload?.error) return { ok: false as const, error: payload.error };
  if (!payload?.ok) return { ok: false as const, error: 'อนุมัติไม่สำเร็จ' };
  return { ok: true as const };
}

export async function minddojoAssessmentAdminReject(
  username: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError || !session?.access_token) {
    return { ok: false as const, error: 'กรุณาเข้าสู่ระบบแอดมินก่อน' };
  }
  const { data, error } = await postMinddojoAssessmentAuth(session.access_token, {
    action: 'admin_reject',
    username: username.trim().toLowerCase(),
  });
  if (error) return { ok: false as const, error: error.message };
  const payload = data as MinddojoAuthJson;
  if (payload?.error) return { ok: false as const, error: payload.error };
  if (!payload?.ok) return { ok: false as const, error: 'ปฏิเสธไม่สำเร็จ' };
  return { ok: true as const };
}

export async function minddojoAssessmentAdminDelete(
  username: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError || !session?.access_token) {
    return { ok: false as const, error: 'กรุณาเข้าสู่ระบบแอดมินก่อน' };
  }
  const { data, error } = await postMinddojoAssessmentAuth(session.access_token, {
    action: 'admin_delete',
    username: username.trim().toLowerCase(),
  });
  if (error) return { ok: false as const, error: error.message };
  const payload = data as MinddojoAuthJson;
  if (payload?.error) return { ok: false as const, error: payload.error };
  if (!payload?.ok) return { ok: false as const, error: 'ลบไม่สำเร็จ' };
  return { ok: true as const };
}

export type MinddojoAccountRow = {
  id: string;
  username: string;
  status: string;
  created_at: string;
  approved_at: string | null;
  rejected_at: string | null;
};
