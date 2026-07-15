import { isSupabaseConfigured, supabase } from './supabase';
import type { ElevateTestBank } from './elevatePretestPosttest';
import { migrateElevateBanks } from './elevatePretestPosttest';

const TABLE = 'elevate_pretest_posttest_banks';

type BankRow = {
  id: string;
  name: string;
  description: string | null;
  pretest_json: unknown;
  posttest_json: unknown;
  updated_at: string;
};

function mapRow(row: BankRow): ElevateTestBank {
  return migrateElevateBanks([
    {
      id: row.id,
      name: row.name,
      description: row.description || '',
      pretest: Array.isArray(row.pretest_json) ? row.pretest_json : [],
      posttest: Array.isArray(row.posttest_json) ? row.posttest_json : [],
      updatedAt: row.updated_at || new Date().toISOString(),
    },
  ])[0];
}

export type FetchElevateBanksResult = {
  banks: ElevateTestBank[];
  error: string | null;
  tableMissing: boolean;
};

export async function fetchElevateBanksFromSupabase(): Promise<FetchElevateBanksResult> {
  if (!isSupabaseConfigured) {
    return { banks: [], error: null, tableMissing: false };
  }

  const { data, error } = await supabase
    .from(TABLE)
    .select('id, name, description, pretest_json, posttest_json, updated_at')
    .order('updated_at', { ascending: false });

  if (error) {
    const message = error.message || '';
    const tableMissing =
      message.toLowerCase().includes(TABLE) ||
      message.toLowerCase().includes('does not exist') ||
      message.toLowerCase().includes('schema cache') ||
      message.includes('42P01');
    return { banks: [], error: message, tableMissing };
  }

  return {
    banks: migrateElevateBanks((data || []).map((row) => mapRow(row as BankRow))),
    error: null,
    tableMissing: false,
  };
}

export type UpsertElevateBankResult = { ok: boolean; error: string | null; tableMissing: boolean };

export async function upsertElevateBankToSupabase(bank: ElevateTestBank): Promise<UpsertElevateBankResult> {
  if (!isSupabaseConfigured) {
    return { ok: false, error: null, tableMissing: false };
  }

  const updated_at = new Date().toISOString();
  const { error } = await supabase.from(TABLE).upsert({
    id: bank.id,
    name: bank.name,
    description: bank.description || '',
    pretest_json: bank.pretest,
    posttest_json: bank.posttest,
    updated_at,
  });

  if (error) {
    const message = error.message || '';
    const tableMissing =
      message.toLowerCase().includes(TABLE) ||
      message.toLowerCase().includes('does not exist') ||
      message.toLowerCase().includes('schema cache') ||
      message.includes('42P01');
    return { ok: false, error: message, tableMissing };
  }

  return { ok: true, error: null, tableMissing: false };
}

export async function deleteElevateBankFromSupabase(
  bankId: string
): Promise<{ ok: boolean; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { ok: true, error: null };
  }
  const { error } = await supabase.from(TABLE).delete().eq('id', bankId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, error: null };
}

/** SQL สำหรับสร้างตารางใน Supabase (รันครั้งเดียวใน SQL Editor) */
export const ELEVATE_PPT_TABLE_SQL = `
create table if not exists public.elevate_pretest_posttest_banks (
  id text primary key,
  name text not null,
  description text not null default '',
  pretest_json jsonb not null default '[]'::jsonb,
  posttest_json jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.elevate_pretest_posttest_banks enable row level security;

drop policy if exists "elevate_ppt_banks_all" on public.elevate_pretest_posttest_banks;
create policy "elevate_ppt_banks_all"
on public.elevate_pretest_posttest_banks
for all
using (true)
with check (true);
`.trim();
