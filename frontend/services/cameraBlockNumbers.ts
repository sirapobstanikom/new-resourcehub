import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const GROUP_COUNT = 16;

export type NumberPoolStatus = {
  assigned: number[];
  usedByNumber: Record<number, number>;
  minCount: number;
};

const LOCAL_KEY = 'minddojo.camera_block.numbers.v1';

function emptyCounts(): Record<number, number> {
  const counts: Record<number, number> = {};
  for (let n = 1; n <= GROUP_COUNT; n += 1) counts[n] = 0;
  return counts;
}

function buildStatus(assigned: number[]): NumberPoolStatus {
  const usedByNumber = emptyCounts();
  assigned.forEach((n) => {
    if (n >= 1 && n <= GROUP_COUNT) usedByNumber[n] += 1;
  });
  const minCount = Math.min(...Object.values(usedByNumber));
  return { assigned, usedByNumber, minCount };
}

function readLocalAssigned(): number[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { assigned?: unknown; totalPlayers?: unknown };
    const list = Array.isArray(parsed.assigned) ? parsed.assigned : Array.isArray(parsed) ? parsed : [];
    return (list as unknown[]).map((n) => Number(n)).filter((n) => n >= 1 && n <= GROUP_COUNT);
  } catch {
    return [];
  }
}

function writeLocalAssigned(assigned: number[]): void {
  localStorage.setItem(LOCAL_KEY, JSON.stringify({ assigned }));
}

export function pickBalancedNumber(status: NumberPoolStatus): number {
  const candidates: number[] = [];
  for (let n = 1; n <= GROUP_COUNT; n += 1) {
    if (status.usedByNumber[n] === status.minCount) candidates.push(n);
  }
  return candidates[Math.floor(Math.random() * candidates.length)] ?? 1;
}

export async function fetchNumberPool(): Promise<NumberPoolStatus> {
  if (!isSupabaseConfigured) {
    return buildStatus(readLocalAssigned());
  }

  const { data: draws, error } = await supabase
    .from('camera_block_draws')
    .select('group_number, created_at')
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  const assigned = (draws ?? []).map((row) => Number(row.group_number)).filter((n) => n >= 1 && n <= GROUP_COUNT);
  return buildStatus(assigned);
}

export async function assignGroupNumber(preferred?: number | null): Promise<{ number: number; status: NumberPoolStatus }> {
  const status = await fetchNumberPool();
  const next =
    preferred && status.usedByNumber[preferred] === status.minCount ? preferred : pickBalancedNumber(status);

  if (!isSupabaseConfigured) {
    const assigned = [...status.assigned, next];
    writeLocalAssigned(assigned);
    return { number: next, status: buildStatus(assigned) };
  }

  const { error } = await supabase.from('camera_block_draws').insert({ group_number: next });
  if (error) throw new Error(error.message);
  return { number: next, status: await fetchNumberPool() };
}

export async function resetNumberPool(): Promise<NumberPoolStatus> {
  if (!isSupabaseConfigured) {
    writeLocalAssigned([]);
    return buildStatus([]);
  }

  const { error } = await supabase
    .from('camera_block_draws')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) throw new Error(error.message);
  return fetchNumberPool();
}

export function subscribeNumberPool(onChange: () => void): () => void {
  if (!isSupabaseConfigured) return () => undefined;
  const channel = supabase
    .channel('camera-block-numbers')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'camera_block_draws' }, () => onChange())
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
