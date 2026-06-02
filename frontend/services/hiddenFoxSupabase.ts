import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { RegistrationInfo } from '../components/hiddenFox/types';

export type HiddenFoxPlayerRow = {
  id: string;
  name: string;
  email: string;
  company: string;
};

export type HallOfFameEntry = {
  id: string;
  name: string;
  company: string;
  totalScore: number;
  completionTimeSec: number;
  accuracyPercent: number;
  foxesFound: number;
  foxesTotal: number;
  completed: boolean;
  createdAt: string;
};

export type SaveRunPayload = {
  playerId: string | null;
  registration: RegistrationInfo;
  totalScore: number;
  completionTimeSec: number | null;
  accuracyPercent: number;
  foxesFound: number;
  foxesTotal: number;
  completed: boolean;
};

export type SaveRunOutcome = 'inserted' | 'updated' | 'unchanged';

export type RegisterPlayerResult = {
  player: HiddenFoxPlayerRow;
  isReturning: boolean;
};

export type BestRunSummary = {
  totalScore: number;
  completionTimeSec: number;
  accuracyPercent: number;
};

function requireSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error('ยังไม่ได้ตั้งค่า Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)');
  }
}

export function normalizeRegistration(info: RegistrationInfo): RegistrationInfo {
  return {
    name: info.name.trim(),
    email: info.email.trim().toLowerCase(),
    company: info.company.trim(),
  };
}

function identityMatches(a: RegistrationInfo, b: RegistrationInfo): boolean {
  const left = normalizeRegistration(a);
  const right = normalizeRegistration(b);
  return (
    left.email === right.email &&
    left.name.toLowerCase() === right.name.toLowerCase() &&
    left.company.toLowerCase() === right.company.toLowerCase()
  );
}

function isBetterRun(
  newScore: number,
  newTime: number | null,
  oldScore: number,
  oldTime: number | null
): boolean {
  if (newScore > oldScore) return true;
  if (newScore < oldScore) return false;
  const nextTime = newTime ?? Number.MAX_SAFE_INTEGER;
  const prevTime = oldTime ?? Number.MAX_SAFE_INTEGER;
  return nextTime < prevTime;
}

async function findRunByIdentity(info: RegistrationInfo) {
  const norm = normalizeRegistration(info);
  const { data, error } = await supabase
    .from('hidden_fox_runs')
    .select('id, name, company, total_score, completion_time_sec, accuracy_percent')
    .eq('email', norm.email);

  if (error) throw new Error(error.message);

  return (data ?? []).find((row) =>
    identityMatches(norm, { name: String(row.name), email: norm.email, company: String(row.company) })
  );
}

export async function fetchBestRunForIdentity(info: RegistrationInfo): Promise<BestRunSummary | null> {
  requireSupabase();
  const norm = normalizeRegistration(info);
  if (!norm.name || !norm.email || !norm.company) return null;

  const existing = await findRunByIdentity(norm);
  if (!existing) return null;

  return {
    totalScore: Number(existing.total_score ?? 0),
    completionTimeSec: Number(existing.completion_time_sec ?? 0),
    accuracyPercent: Number(existing.accuracy_percent ?? 0),
  };
}

export async function registerHiddenFoxPlayer(info: RegistrationInfo): Promise<RegisterPlayerResult> {
  requireSupabase();
  const norm = normalizeRegistration(info);

  const { data: byEmail, error: findError } = await supabase
    .from('hidden_fox_players')
    .select('id, name, email, company')
    .eq('email', norm.email)
    .maybeSingle();

  if (findError) throw new Error(findError.message);

  if (byEmail) {
    const isReturning = identityMatches(norm, byEmail as RegistrationInfo);

    const { data: updated, error: updateError } = await supabase
      .from('hidden_fox_players')
      .update({ name: norm.name, company: norm.company, updated_at: new Date().toISOString() })
      .eq('id', byEmail.id)
      .select('id, name, email, company')
      .single();

    if (updateError) throw new Error(updateError.message);
    return { player: updated as HiddenFoxPlayerRow, isReturning };
  }

  const { data: inserted, error: insertError } = await supabase
    .from('hidden_fox_players')
    .insert({ name: norm.name, email: norm.email, company: norm.company })
    .select('id, name, email, company')
    .single();

  if (insertError) throw new Error(insertError.message);
  return { player: inserted as HiddenFoxPlayerRow, isReturning: false };
}

export async function saveHiddenFoxRun(payload: SaveRunPayload): Promise<SaveRunOutcome> {
  requireSupabase();
  const norm = normalizeRegistration(payload.registration);
  const totalScore = Math.max(0, Math.floor(payload.totalScore));

  const runRow = {
    player_id: payload.playerId,
    name: norm.name,
    email: norm.email,
    company: norm.company,
    total_score: totalScore,
    completion_time_sec: payload.completionTimeSec,
    accuracy_percent: Math.round(payload.accuracyPercent * 100) / 100,
    foxes_found: payload.foxesFound,
    foxes_total: payload.foxesTotal,
    completed: payload.completed,
    updated_at: new Date().toISOString(),
  };

  const existing = await findRunByIdentity(norm);

  if (!existing) {
    const { error } = await supabase.from('hidden_fox_runs').insert(runRow);
    if (error) throw new Error(error.message);
    return 'inserted';
  }

  const oldScore = Number(existing.total_score ?? 0);
  const oldTime = existing.completion_time_sec as number | null;

  if (
    !isBetterRun(totalScore, payload.completionTimeSec, oldScore, oldTime)
  ) {
    return 'unchanged';
  }

  const { error } = await supabase.from('hidden_fox_runs').update(runRow).eq('id', existing.id);
  if (error) throw new Error(error.message);
  return 'updated';
}

function mapRunRow(row: Record<string, unknown>): HallOfFameEntry {
  return {
    id: String(row.id),
    name: String(row.name),
    company: String(row.company ?? ''),
    totalScore: Number(row.total_score ?? 0),
    completionTimeSec: Number(row.completion_time_sec ?? 0),
    accuracyPercent: Number(row.accuracy_percent ?? 0),
    foxesFound: Number(row.foxes_found ?? 0),
    foxesTotal: Number(row.foxes_total ?? 8),
    completed: Boolean(row.completed),
    createdAt: String(row.created_at),
  };
}

/** Hall of Fame — คะแนนสูงสุดก่อน */
export async function fetchScoreHallOfFame(limit = 10): Promise<HallOfFameEntry[]> {
  requireSupabase();
  const { data, error } = await supabase
    .from('hidden_fox_runs')
    .select(
      'id, name, company, total_score, completion_time_sec, accuracy_percent, foxes_found, foxes_total, completed, created_at'
    )
    .order('total_score', { ascending: false })
    .order('completion_time_sec', { ascending: true, nullsFirst: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapRunRow(row as Record<string, unknown>));
}

export const HIDDEN_FOX_REGISTRATION_KEY = 'hidden_fox_last_registration';

export function loadStoredRegistration(): RegistrationInfo | null {
  try {
    const raw = localStorage.getItem(HIDDEN_FOX_REGISTRATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RegistrationInfo;
    if (!parsed.name || !parsed.email || !parsed.company) return null;
    return normalizeRegistration(parsed);
  } catch {
    return null;
  }
}

export function storeRegistration(info: RegistrationInfo): void {
  localStorage.setItem(HIDDEN_FOX_REGISTRATION_KEY, JSON.stringify(normalizeRegistration(info)));
}
