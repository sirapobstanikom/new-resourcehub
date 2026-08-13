import { supabase, isSupabaseConfigured } from '../lib/supabase';

export type CardMatchRegistration = {
  name: string;
  email: string;
  company: string;
};

export type CardMatchPlayer = {
  id: string;
  name: string;
  email: string;
  company: string;
};

export type CardMatchLeaderboardEntry = {
  id: string;
  name: string;
  email: string;
  company: string;
  completionTimeMs: number;
  moves: number;
  createdAt: string;
};

export type SaveCardMatchRunPayload = {
  playerId: string | null;
  registration: CardMatchRegistration;
  completionTimeMs: number;
  moves: number;
};

export type SaveCardMatchOutcome = 'inserted' | 'updated' | 'unchanged';

const LOCAL_RUNS_KEY = 'minddojo.card_match.runs.v1';
export const CARD_MATCH_REGISTRATION_KEY = 'minddojo.card_match.last_registration';

export function normalizeRegistration(info: CardMatchRegistration): CardMatchRegistration {
  return {
    name: info.name.trim(),
    email: info.email.trim().toLowerCase(),
    company: info.company.trim(),
  };
}

export function loadStoredRegistration(): CardMatchRegistration | null {
  try {
    const raw = localStorage.getItem(CARD_MATCH_REGISTRATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CardMatchRegistration;
    if (!parsed.name || !parsed.email || !parsed.company) return null;
    return normalizeRegistration(parsed);
  } catch {
    return null;
  }
}

export function storeRegistration(info: CardMatchRegistration): void {
  localStorage.setItem(CARD_MATCH_REGISTRATION_KEY, JSON.stringify(normalizeRegistration(info)));
}

function isBetterRun(nextTime: number, nextMoves: number, prevTime: number, prevMoves: number): boolean {
  if (nextTime < prevTime) return true;
  if (nextTime > prevTime) return false;
  return nextMoves < prevMoves;
}

function mapRunRow(row: Record<string, unknown>): CardMatchLeaderboardEntry {
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    email: String(row.email ?? ''),
    company: String(row.company ?? ''),
    completionTimeMs: Number(row.completion_time_ms ?? 0),
    moves: Number(row.moves ?? 0),
    createdAt: String(row.created_at ?? ''),
  };
}

function readLocalRuns(): CardMatchLeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_RUNS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CardMatchLeaderboardEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalRuns(runs: CardMatchLeaderboardEntry[]): void {
  localStorage.setItem(LOCAL_RUNS_KEY, JSON.stringify(runs));
}

function sortRuns(runs: CardMatchLeaderboardEntry[]): CardMatchLeaderboardEntry[] {
  return [...runs].sort((a, b) => {
    if (a.completionTimeMs !== b.completionTimeMs) return a.completionTimeMs - b.completionTimeMs;
    if (a.moves !== b.moves) return a.moves - b.moves;
    return String(a.createdAt).localeCompare(String(b.createdAt));
  });
}

export function formatMatchTime(ms: number): string {
  const totalSec = Math.max(0, ms) / 1000;
  if (totalSec < 60) return `${totalSec.toFixed(1)} วินาที`;
  const minutes = Math.floor(totalSec / 60);
  const seconds = (totalSec % 60).toFixed(1).padStart(4, '0');
  return `${minutes}:${seconds} นาที`;
}

export async function registerCardMatchPlayer(info: CardMatchRegistration): Promise<CardMatchPlayer> {
  const norm = normalizeRegistration(info);
  if (!isSupabaseConfigured) {
    return { id: `local-${norm.email}`, ...norm };
  }

  const { data: existing, error: findError } = await supabase
    .from('card_match_players')
    .select('id, name, email, company')
    .eq('email', norm.email)
    .maybeSingle();

  if (findError) throw new Error(findError.message);

  if (existing) {
    const { data: updated, error: updateError } = await supabase
      .from('card_match_players')
      .update({ name: norm.name, company: norm.company, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select('id, name, email, company')
      .single();
    if (updateError) throw new Error(updateError.message);
    return updated as CardMatchPlayer;
  }

  const { data: inserted, error: insertError } = await supabase
    .from('card_match_players')
    .insert({ name: norm.name, email: norm.email, company: norm.company })
    .select('id, name, email, company')
    .single();

  if (insertError) throw new Error(insertError.message);
  return inserted as CardMatchPlayer;
}

export async function fetchCardMatchLeaderboard(limit = 20): Promise<CardMatchLeaderboardEntry[]> {
  if (!isSupabaseConfigured) {
    return sortRuns(readLocalRuns()).slice(0, limit);
  }

  const { data, error } = await supabase
    .from('card_match_runs')
    .select('id, name, email, company, completion_time_ms, moves, created_at')
    .eq('completed', true)
    .order('completion_time_ms', { ascending: true })
    .order('moves', { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapRunRow(row as Record<string, unknown>));
}

export async function fetchBestRunForEmail(email: string): Promise<CardMatchLeaderboardEntry | null> {
  const normEmail = email.trim().toLowerCase();
  if (!normEmail) return null;

  if (!isSupabaseConfigured) {
    return sortRuns(readLocalRuns()).find((row) => row.email === normEmail) ?? null;
  }

  const { data, error } = await supabase
    .from('card_match_runs')
    .select('id, name, email, company, completion_time_ms, moves, created_at')
    .eq('email', normEmail)
    .eq('completed', true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapRunRow(data as Record<string, unknown>) : null;
}

export async function saveCardMatchRun(payload: SaveCardMatchRunPayload): Promise<SaveCardMatchOutcome> {
  const norm = normalizeRegistration(payload.registration);
  const completionTimeMs = Math.max(1, Math.round(payload.completionTimeMs));
  const moves = Math.max(0, Math.floor(payload.moves));

  if (!isSupabaseConfigured) {
    const runs = readLocalRuns();
    const existing = runs.find((row) => row.email === norm.email);
    if (!existing) {
      runs.push({
        id: `local-${norm.email}-${Date.now()}`,
        name: norm.name,
        email: norm.email,
        company: norm.company,
        completionTimeMs,
        moves,
        createdAt: new Date().toISOString(),
      });
      writeLocalRuns(runs);
      return 'inserted';
    }
    if (!isBetterRun(completionTimeMs, moves, existing.completionTimeMs, existing.moves)) {
      return 'unchanged';
    }
    writeLocalRuns(
      runs.map((row) =>
        row.email === norm.email
          ? { ...row, name: norm.name, company: norm.company, completionTimeMs, moves, createdAt: new Date().toISOString() }
          : row
      )
    );
    return 'updated';
  }

  const runRow = {
    player_id: payload.playerId,
    name: norm.name,
    email: norm.email,
    company: norm.company,
    completion_time_ms: completionTimeMs,
    moves,
    pairs: 8,
    completed: true,
    updated_at: new Date().toISOString(),
  };

  const { data: existing, error: findError } = await supabase
    .from('card_match_runs')
    .select('id, completion_time_ms, moves')
    .eq('email', norm.email)
    .maybeSingle();

  if (findError) throw new Error(findError.message);

  if (!existing) {
    const { error } = await supabase.from('card_match_runs').insert(runRow);
    if (error) throw new Error(error.message);
    return 'inserted';
  }

  if (!isBetterRun(completionTimeMs, moves, Number(existing.completion_time_ms ?? 0), Number(existing.moves ?? 0))) {
    return 'unchanged';
  }

  const { error } = await supabase.from('card_match_runs').update(runRow).eq('id', existing.id);
  if (error) throw new Error(error.message);
  return 'updated';
}

export function subscribeCardMatchLeaderboard(onChange: () => void): () => void {
  if (!isSupabaseConfigured) return () => undefined;

  const channel = supabase
    .channel('card-match-leaderboard')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'card_match_runs' }, () => {
      onChange();
    })
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
