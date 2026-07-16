import { isSupabaseConfigured, supabase } from './supabase';
import {
  migrateElevateBanks,
  type ElevateTestBank,
  type ElevateTestPhase,
  type ElevateTestResponse,
} from './elevatePretestPosttest';

const BANKS_TABLE = 'elevate_pretest_posttest_banks';
const RESPONSES_TABLE = 'elevate_pretest_posttest_responses';

type BankRow = {
  id: string;
  name: string;
  description: string | null;
  pretest_json: unknown;
  posttest_json: unknown;
  updated_at: string;
};

type ResponseRow = {
  id: string;
  bank_id: string;
  bank_name: string | null;
  phase: string;
  respondent_name: string;
  answers_json: unknown;
  score: number | null;
  total: number | null;
  created_at: string;
};

function isTableMissingError(message: string, table: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes(table.toLowerCase()) ||
    m.includes('does not exist') ||
    m.includes('schema cache') ||
    m.includes('42p01') ||
    m.includes('pgrst205')
  );
}

function mapBankRow(row: BankRow): ElevateTestBank {
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

function mapResponseRow(row: ResponseRow): ElevateTestResponse | null {
  if (row.phase !== 'pretest' && row.phase !== 'posttest') return null;
  const answers =
    row.answers_json && typeof row.answers_json === 'object' && !Array.isArray(row.answers_json)
      ? (row.answers_json as Record<string, string>)
      : {};
  return {
    id: row.id,
    bankId: row.bank_id,
    bankName: row.bank_name || '',
    phase: row.phase as ElevateTestPhase,
    respondentName: row.respondent_name || '',
    answers,
    score: typeof row.score === 'number' ? row.score : 0,
    total: typeof row.total === 'number' ? row.total : 0,
    createdAt: row.created_at || new Date().toISOString(),
  };
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
    .from(BANKS_TABLE)
    .select('id, name, description, pretest_json, posttest_json, updated_at')
    .order('updated_at', { ascending: false });

  if (error) {
    const message = error.message || '';
    return {
      banks: [],
      error: message,
      tableMissing: isTableMissingError(message, BANKS_TABLE),
    };
  }

  return {
    banks: migrateElevateBanks((data || []).map((row) => mapBankRow(row as BankRow))),
    error: null,
    tableMissing: false,
  };
}

export type UpsertElevateBankResult = { ok: boolean; error: string | null; tableMissing: boolean };

export async function fetchElevateBankByIdFromSupabase(
  bankId: string
): Promise<{ bank: ElevateTestBank | null; error: string | null; tableMissing: boolean }> {
  if (!isSupabaseConfigured || !bankId) {
    return { bank: null, error: null, tableMissing: false };
  }

  let decoded = bankId;
  try {
    decoded = decodeURIComponent(bankId);
  } catch {
    decoded = bankId;
  }

  const { data, error } = await supabase
    .from(BANKS_TABLE)
    .select('id, name, description, pretest_json, posttest_json, updated_at')
    .eq('id', decoded)
    .maybeSingle();

  if (error) {
    const message = error.message || '';
    return {
      bank: null,
      error: message,
      tableMissing: isTableMissingError(message, BANKS_TABLE),
    };
  }

  if (!data) {
    // ลองหาด้วย id ดิบ (กรณี encode ซ้ำ)
    if (decoded !== bankId) {
      const retry = await supabase
        .from(BANKS_TABLE)
        .select('id, name, description, pretest_json, posttest_json, updated_at')
        .eq('id', bankId)
        .maybeSingle();
      if (!retry.error && retry.data) {
        return { bank: mapBankRow(retry.data as BankRow), error: null, tableMissing: false };
      }
    }
    return { bank: null, error: null, tableMissing: false };
  }

  return { bank: mapBankRow(data as BankRow), error: null, tableMissing: false };
}

export async function upsertElevateBankToSupabase(bank: ElevateTestBank): Promise<UpsertElevateBankResult> {
  if (!isSupabaseConfigured) {
    return { ok: false, error: null, tableMissing: false };
  }

  const updated_at = bank.updatedAt || new Date().toISOString();
  const { error } = await supabase.from(BANKS_TABLE).upsert({
    id: bank.id,
    name: bank.name,
    description: bank.description || '',
    pretest_json: bank.pretest,
    posttest_json: bank.posttest,
    updated_at,
  });

  if (error) {
    const message = error.message || '';
    return {
      ok: false,
      error: message,
      tableMissing: isTableMissingError(message, BANKS_TABLE),
    };
  }

  return { ok: true, error: null, tableMissing: false };
}

/**
 * ใช้จากฟอร์มผู้ใช้เท่านั้น — สร้างแถวชุดข้อสอบถ้ายังไม่มี
 * ไม่ทับ pretest/posttest ของชุดที่มีอยู่แล้ว (กันข้อมูลเก่าในเครื่องเขียนทับ editor)
 */
export async function ensureElevateBankExistsOnSupabase(
  bank: ElevateTestBank
): Promise<UpsertElevateBankResult> {
  if (!isSupabaseConfigured) {
    return { ok: false, error: null, tableMissing: false };
  }

  const { data, error: selectError } = await supabase
    .from(BANKS_TABLE)
    .select('id')
    .eq('id', bank.id)
    .maybeSingle();

  if (selectError) {
    const message = selectError.message || '';
    return {
      ok: false,
      error: message,
      tableMissing: isTableMissingError(message, BANKS_TABLE),
    };
  }

  if (data?.id) {
    return { ok: true, error: null, tableMissing: false };
  }

  return upsertElevateBankToSupabase(bank);
}

/** อัปโหลดชุดข้อสอบทั้งหมดขึ้น Supabase (ใช้ตอนซิงก์จากเครื่อง / หลังสร้างตาราง) */
export async function upsertAllElevateBanksToSupabase(
  banks: ElevateTestBank[]
): Promise<{ ok: boolean; synced: number; error: string | null; tableMissing: boolean }> {
  if (!isSupabaseConfigured) {
    return { ok: false, synced: 0, error: null, tableMissing: false };
  }
  if (banks.length === 0) {
    return { ok: true, synced: 0, error: null, tableMissing: false };
  }

  let synced = 0;
  for (const bank of banks) {
    const result = await upsertElevateBankToSupabase(bank);
    if (result.tableMissing) {
      return { ok: false, synced, error: result.error, tableMissing: true };
    }
    if (!result.ok) {
      return { ok: false, synced, error: result.error, tableMissing: false };
    }
    synced += 1;
  }
  return { ok: true, synced, error: null, tableMissing: false };
}

export async function deleteElevateBankFromSupabase(
  bankId: string
): Promise<{ ok: boolean; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { ok: true, error: null };
  }
  // ลบคำตอบของชุดนี้ด้วย
  await supabase.from(RESPONSES_TABLE).delete().eq('bank_id', bankId);
  const { error } = await supabase.from(BANKS_TABLE).delete().eq('id', bankId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, error: null };
}

export type FetchElevateResponsesResult = {
  responses: ElevateTestResponse[];
  error: string | null;
  tableMissing: boolean;
};

export async function fetchElevateResponsesFromSupabase(
  bankId?: string
): Promise<FetchElevateResponsesResult> {
  if (!isSupabaseConfigured) {
    return { responses: [], error: null, tableMissing: false };
  }

  let query = supabase
    .from(RESPONSES_TABLE)
    .select('id, bank_id, bank_name, phase, respondent_name, answers_json, score, total, created_at')
    .order('created_at', { ascending: false });

  if (bankId) {
    query = query.eq('bank_id', bankId);
  }

  const { data, error } = await query;

  if (error) {
    const message = error.message || '';
    return {
      responses: [],
      error: message,
      tableMissing: isTableMissingError(message, RESPONSES_TABLE),
    };
  }

  const responses = (data || [])
    .map((row) => mapResponseRow(row as ResponseRow))
    .filter((row): row is ElevateTestResponse => row !== null);

  return { responses, error: null, tableMissing: false };
}

export type InsertElevateResponseResult = {
  ok: boolean;
  error: string | null;
  tableMissing: boolean;
};

export async function insertElevateResponseToSupabase(
  response: ElevateTestResponse
): Promise<InsertElevateResponseResult> {
  if (!isSupabaseConfigured) {
    return { ok: false, error: null, tableMissing: false };
  }

  const { error } = await supabase.from(RESPONSES_TABLE).insert({
    id: response.id,
    bank_id: response.bankId,
    bank_name: response.bankName,
    phase: response.phase,
    respondent_name: response.respondentName,
    answers_json: response.answers,
    score: response.score,
    total: response.total,
    created_at: response.createdAt,
  });

  if (error) {
    const message = error.message || '';
    return {
      ok: false,
      error: message,
      tableMissing: isTableMissingError(message, RESPONSES_TABLE),
    };
  }

  return { ok: true, error: null, tableMissing: false };
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

create table if not exists public.elevate_pretest_posttest_responses (
  id text primary key,
  bank_id text not null references public.elevate_pretest_posttest_banks(id) on delete cascade,
  bank_name text not null default '',
  phase text not null check (phase in ('pretest', 'posttest')),
  respondent_name text not null,
  answers_json jsonb not null default '{}'::jsonb,
  score integer not null default 0,
  total integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists elevate_ppt_responses_bank_id_idx
  on public.elevate_pretest_posttest_responses (bank_id);

create index if not exists elevate_ppt_responses_created_at_idx
  on public.elevate_pretest_posttest_responses (created_at desc);

alter table public.elevate_pretest_posttest_responses enable row level security;

drop policy if exists "elevate_ppt_responses_all" on public.elevate_pretest_posttest_responses;
create policy "elevate_ppt_responses_all"
on public.elevate_pretest_posttest_responses
for all
using (true)
with check (true);
`.trim();
