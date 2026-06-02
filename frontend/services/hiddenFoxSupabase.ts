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
  completionTimeSec: number;
  accuracyPercent: number;
  foxesFound: number;
  foxesTotal: number;
  createdAt: string;
};

export type SaveRunPayload = {
  playerId: string | null;
  registration: RegistrationInfo;
  completionTimeSec: number | null;
  accuracyPercent: number;
  foxesFound: number;
  foxesTotal: number;
  completed: boolean;
};

function requireSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error('ยังไม่ได้ตั้งค่า Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)');
  }
}

export async function registerHiddenFoxPlayer(info: RegistrationInfo): Promise<HiddenFoxPlayerRow> {
  requireSupabase();
  const email = info.email.trim().toLowerCase();
  const name = info.name.trim();
  const company = info.company.trim();

  const { data: existing, error: findError } = await supabase
    .from('hidden_fox_players')
    .select('id, name, email, company')
    .ilike('email', email)
    .maybeSingle();

  if (findError) throw new Error(findError.message);

  if (existing) {
    const { data: updated, error: updateError } = await supabase
      .from('hidden_fox_players')
      .update({ name, company, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select('id, name, email, company')
      .single();

    if (updateError) throw new Error(updateError.message);
    return updated as HiddenFoxPlayerRow;
  }

  const { data: inserted, error: insertError } = await supabase
    .from('hidden_fox_players')
    .insert({ name, email, company })
    .select('id, name, email, company')
    .single();

  if (insertError) throw new Error(insertError.message);
  return inserted as HiddenFoxPlayerRow;
}

export async function saveHiddenFoxRun(payload: SaveRunPayload): Promise<void> {
  requireSupabase();
  const { registration } = payload;
  const { error } = await supabase.from('hidden_fox_runs').insert({
    player_id: payload.playerId,
    name: registration.name.trim(),
    email: registration.email.trim().toLowerCase(),
    company: registration.company.trim(),
    completion_time_sec: payload.completionTimeSec,
    accuracy_percent: Math.round(payload.accuracyPercent * 100) / 100,
    foxes_found: payload.foxesFound,
    foxes_total: payload.foxesTotal,
    completed: payload.completed,
  });

  if (error) throw new Error(error.message);
}

function mapRunRow(row: Record<string, unknown>): HallOfFameEntry {
  return {
    id: String(row.id),
    name: String(row.name),
    company: String(row.company ?? ''),
    completionTimeSec: Number(row.completion_time_sec ?? 0),
    accuracyPercent: Number(row.accuracy_percent ?? 0),
    foxesFound: Number(row.foxes_found ?? 0),
    foxesTotal: Number(row.foxes_total ?? 8),
    createdAt: String(row.created_at),
  };
}

/** อันดับเร็วที่สุด — เฉพาะที่ผ่านภารกิจครบ */
export async function fetchFastestHallOfFame(limit = 10): Promise<HallOfFameEntry[]> {
  requireSupabase();
  const { data, error } = await supabase
    .from('hidden_fox_runs')
    .select('id, name, company, completion_time_sec, accuracy_percent, foxes_found, foxes_total, created_at')
    .eq('completed', true)
    .not('completion_time_sec', 'is', null)
    .order('completion_time_sec', { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapRunRow(row as Record<string, unknown>));
}

/** อันดับแม่นยำที่สุด — เฉพาะที่ผ่านภารกิจครบ */
export async function fetchAccuracyHallOfFame(limit = 10): Promise<HallOfFameEntry[]> {
  requireSupabase();
  const { data, error } = await supabase
    .from('hidden_fox_runs')
    .select('id, name, company, completion_time_sec, accuracy_percent, foxes_found, foxes_total, created_at')
    .eq('completed', true)
    .order('accuracy_percent', { ascending: false })
    .order('completion_time_sec', { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapRunRow(row as Record<string, unknown>));
}
