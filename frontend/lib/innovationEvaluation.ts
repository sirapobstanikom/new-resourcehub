import { isSupabaseConfigured, supabase } from './supabase';

export const INNOVATION_EVALUATION_SQL = `-- Run in Supabase SQL Editor: backend/supabase/create_innovation_evaluation.sql`;

export const INNOVATION_CONFIG_TABLE = 'innovation_evaluation_config';
const INNOVATION_CONFIG_ROW_ID = 'default';
const INNOVATION_CONFIG_STORAGE_KEY = 'minddojo.innovation-evaluation.config.v1';

export const INNOVATION_CONFIG_SQL = `-- Run in Supabase SQL Editor (ครั้งเดียว) — backend/supabase/innovation_evaluation_config.sql
create table if not exists public.innovation_evaluation_config (
  id text primary key,
  config_json jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.innovation_evaluation_config enable row level security;
grant select, insert, update on table public.innovation_evaluation_config to anon, authenticated;

drop policy if exists "innovation_evaluation_config_select" on public.innovation_evaluation_config;
create policy "innovation_evaluation_config_select" on public.innovation_evaluation_config
for select to anon, authenticated using (true);

drop policy if exists "innovation_evaluation_config_insert" on public.innovation_evaluation_config;
create policy "innovation_evaluation_config_insert" on public.innovation_evaluation_config
for insert to anon, authenticated with check (true);

drop policy if exists "innovation_evaluation_config_update" on public.innovation_evaluation_config;
create policy "innovation_evaluation_config_update" on public.innovation_evaluation_config
for update to anon, authenticated using (true) with check (true);

-- เก็บคะแนนเกณฑ์ที่เพิ่มใหม่ได้
alter table public.innovation_evaluation_responses add column if not exists scores_json jsonb;

-- เกณฑ์เดิมลบได้ / ผู้ประเมินเพิ่มใหม่ได้
alter table public.innovation_evaluation_responses alter column score_business_clarity drop not null;
alter table public.innovation_evaluation_responses alter column score_open_innovation drop not null;
alter table public.innovation_evaluation_responses alter column score_idea_value drop not null;
alter table public.innovation_evaluation_responses alter column score_feasibility drop not null;
alter table public.innovation_evaluation_responses alter column score_pitching_quality drop not null;

do $$
declare r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'public.innovation_evaluation_responses'::regclass and contype = 'c'
  loop
    execute format('alter table public.innovation_evaluation_responses drop constraint %I', r.conname);
  end loop;
end $$;`;

export const LEGACY_SCORE_FIELDS = [
  'score_business_clarity',
  'score_open_innovation',
  'score_idea_value',
  'score_feasibility',
  'score_pitching_quality',
] as const;

export type LegacyScoreField = (typeof LEGACY_SCORE_FIELDS)[number];

export type InnovationCriterion = {
  id: string;
  label: string;
  weight: number;
};

export type InnovationEvaluator = {
  id: string;
  name: string;
  weight: number;
};

export type InnovationConfig = {
  criteria: InnovationCriterion[];
  evaluators: InnovationEvaluator[];
  updatedAt?: string;
};

export const DEFAULT_INNOVATION_CONFIG: InnovationConfig = {
  criteria: [
    { id: 'score_business_clarity', label: 'ความชัดเจนของโจทย์หรือโอกาสทางธุรกิจ', weight: 20 },
    { id: 'score_open_innovation', label: 'การเชื่อมโยงกับ Open Innovation / แหล่งนวัตกรรมภายนอก', weight: 30 },
    { id: 'score_idea_value', label: 'คุณค่าของไอเดียและผลกระทบที่คาดว่าจะเกิดขึ้น', weight: 20 },
    { id: 'score_feasibility', label: 'ความเป็นไปได้ในการทดลองและนำไปใช้จริง', weight: 20 },
    { id: 'score_pitching_quality', label: 'คุณภาพการนำเสนอและความน่าสนใจของ Pitching', weight: 10 },
  ],
  evaluators: [
    { id: 'keita_ono', name: 'Dr. Keita Ono', weight: 50 },
    { id: 'jeerawat_yaowanich', name: 'Jeerawat Yaowanich', weight: 50 },
  ],
};

export type InnovationScores = Record<string, number>;

export function isLegacyScoreField(id: string): id is LegacyScoreField {
  return (LEGACY_SCORE_FIELDS as readonly string[]).includes(id);
}

export function newInnovationId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function sumWeights(items: Array<{ weight: number }>): number {
  return items.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
}

function normalizeConfig(raw: unknown): InnovationConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Partial<InnovationConfig>;
  const criteria = Array.isArray(value.criteria)
    ? value.criteria
        .filter((c): c is InnovationCriterion => !!c && typeof c.id === 'string' && typeof c.label === 'string')
        .map((c) => ({ id: c.id, label: c.label, weight: Number(c.weight) || 0 }))
    : [];
  const evaluators = Array.isArray(value.evaluators)
    ? value.evaluators
        .filter((e): e is InnovationEvaluator => !!e && typeof e.id === 'string' && typeof e.name === 'string')
        .map((e) => ({ id: e.id, name: e.name, weight: Number(e.weight) || 0 }))
    : [];
  if (criteria.length === 0 || evaluators.length === 0) return null;
  return { criteria, evaluators, updatedAt: value.updatedAt };
}

export function validateInnovationConfig(config: InnovationConfig): string | null {
  if (config.criteria.length === 0) return 'ต้องมีโจทย์อย่างน้อย 1 ข้อ';
  if (config.evaluators.length === 0) return 'ต้องมีผู้ประเมินอย่างน้อย 1 คน';
  if (config.criteria.some((c) => !c.label.trim())) return 'กรุณาใส่ชื่อโจทย์ให้ครบทุกข้อ';
  if (config.evaluators.some((e) => !e.name.trim())) return 'กรุณาใส่ชื่อผู้ประเมินให้ครบทุกคน';
  if (config.criteria.some((c) => !(c.weight > 0))) return 'น้ำหนักโจทย์ต้องมากกว่า 0';
  if (config.evaluators.some((e) => e.weight < 0)) return 'น้ำหนักผู้ประเมินต้องไม่ติดลบ';
  const criteriaSum = sumWeights(config.criteria);
  if (Math.abs(criteriaSum - 100) > 0.001) return `น้ำหนักโจทย์รวมต้องเท่ากับ 100% (ตอนนี้ ${criteriaSum}%)`;
  const evaluatorSum = sumWeights(config.evaluators);
  if (Math.abs(evaluatorSum - 100) > 0.001) return `น้ำหนักผู้ประเมินรวมต้องเท่ากับ 100% (ตอนนี้ ${evaluatorSum}%)`;
  return null;
}

function loadLocalConfig(): InnovationConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(INNOVATION_CONFIG_STORAGE_KEY);
    return raw ? normalizeConfig(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function saveLocalConfig(config: InnovationConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(INNOVATION_CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore storage failures
  }
}

function isTableMissingMessage(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes(INNOVATION_CONFIG_TABLE) ||
    m.includes('does not exist') ||
    m.includes('schema cache') ||
    m.includes('42p01') ||
    m.includes('pgrst205')
  );
}

export type LoadInnovationConfigResult = {
  config: InnovationConfig;
  tableMissing: boolean;
  error: string | null;
};

export async function loadInnovationConfig(): Promise<LoadInnovationConfigResult> {
  const local = loadLocalConfig();
  if (!isSupabaseConfigured) {
    return { config: local || DEFAULT_INNOVATION_CONFIG, tableMissing: false, error: null };
  }
  const { data, error } = await supabase
    .from(INNOVATION_CONFIG_TABLE)
    .select('config_json, updated_at')
    .eq('id', INNOVATION_CONFIG_ROW_ID)
    .maybeSingle();
  if (error) {
    return {
      config: local || DEFAULT_INNOVATION_CONFIG,
      tableMissing: isTableMissingMessage(error.message || ''),
      error: error.message,
    };
  }
  const remote = data ? normalizeConfig(data.config_json) : null;
  if (remote) {
    saveLocalConfig(remote);
    return { config: remote, tableMissing: false, error: null };
  }
  return { config: local || DEFAULT_INNOVATION_CONFIG, tableMissing: false, error: null };
}

export async function saveInnovationConfig(
  config: InnovationConfig,
): Promise<{ ok: boolean; tableMissing: boolean; error: string | null }> {
  const next: InnovationConfig = { ...config, updatedAt: new Date().toISOString() };
  saveLocalConfig(next);
  if (!isSupabaseConfigured) return { ok: true, tableMissing: false, error: null };
  const { error } = await supabase.from(INNOVATION_CONFIG_TABLE).upsert({
    id: INNOVATION_CONFIG_ROW_ID,
    config_json: next,
    updated_at: next.updatedAt,
  });
  if (error) {
    return { ok: false, tableMissing: isTableMissingMessage(error.message || ''), error: error.message };
  }
  return { ok: true, tableMissing: false, error: null };
}

export function emptyScores(criteria: InnovationCriterion[]): InnovationScores {
  return Object.fromEntries(criteria.map((c) => [c.id, 0]));
}

export function criterionPoints(score: number, weight: number): number {
  if (!score || score < 1 || score > 5) return 0;
  return (score / 5) * weight;
}

export function calcTotalScore(scores: InnovationScores, criteria: InnovationCriterion[]): number {
  return criteria.reduce((sum, criterion) => sum + criterionPoints(scores[criterion.id] || 0, criterion.weight), 0);
}

export function formatInnovationScore(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : '0.00';
}

export function getEvaluatorName(config: InnovationConfig, evaluatorId: string): string {
  return config.evaluators.find((item) => item.id === evaluatorId)?.name || evaluatorId;
}

export type InnovationEvaluatee = {
  id: string;
  name: string;
  team_name: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
};

export type InnovationResponseRow = Partial<Record<LegacyScoreField, number | null>> & {
  id: number;
  evaluatee_id: string;
  evaluator_id: string;
  total_score: number;
  scores_json?: InnovationScores | null;
  note: string | null;
  created_at: string;
  updated_at?: string;
};

export function getResponseScores(row: InnovationResponseRow): InnovationScores {
  const scores: InnovationScores = {};
  LEGACY_SCORE_FIELDS.forEach((field) => {
    const value = row[field];
    if (typeof value === 'number') scores[field] = value;
  });
  if (row.scores_json && typeof row.scores_json === 'object') {
    Object.entries(row.scores_json).forEach(([key, value]) => {
      const n = Number(value);
      if (Number.isFinite(n)) scores[key] = n;
    });
  }
  return scores;
}

/** คำนวณใหม่ตามน้ำหนักปัจจุบัน — แก้น้ำหนักแล้วคะแนนเดิมจะอัปเดตตาม */
export function responseTotalScore(row: InnovationResponseRow, config: InnovationConfig): number {
  return calcTotalScore(getResponseScores(row), config.criteria);
}

export function buildResponsePayload(
  scores: InnovationScores,
  criteria: InnovationCriterion[],
  options: { includeScoresJson: boolean },
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  LEGACY_SCORE_FIELDS.forEach((field) => {
    payload[field] = criteria.some((c) => c.id === field) ? scores[field] || null : null;
  });
  if (options.includeScoresJson) {
    payload.scores_json = Object.fromEntries(criteria.map((c) => [c.id, scores[c.id] || 0]));
  }
  return payload;
}

export type EvaluateeSummary = {
  evaluateeId: string;
  name: string;
  teamName: string;
  evaluatorScores: Record<string, number | null>;
  finalScore: number | null;
  responseCount: number;
};

export function buildEvaluateeSummaries(
  evaluatees: InnovationEvaluatee[],
  responses: InnovationResponseRow[],
  config: InnovationConfig,
): EvaluateeSummary[] {
  const weightedEvaluators = config.evaluators.filter((e) => e.weight > 0);
  return evaluatees
    .filter((item) => item.is_active)
    .map((evaluatee) => {
      const related = responses.filter((row) => row.evaluatee_id === evaluatee.id);
      const evaluatorScores: Record<string, number | null> = {};
      config.evaluators.forEach((evaluator) => {
        const row = related.find((r) => r.evaluator_id === evaluator.id);
        evaluatorScores[evaluator.id] = row ? responseTotalScore(row, config) : null;
      });
      const complete =
        weightedEvaluators.length > 0 && weightedEvaluators.every((e) => evaluatorScores[e.id] != null);
      const finalScore = complete
        ? weightedEvaluators.reduce((sum, e) => sum + (evaluatorScores[e.id] as number) * (e.weight / 100), 0)
        : null;

      return {
        evaluateeId: evaluatee.id,
        name: evaluatee.name,
        teamName: evaluatee.team_name || '—',
        evaluatorScores,
        finalScore,
        responseCount: related.length,
      };
    })
    .sort((a, b) => {
      if (a.finalScore == null && b.finalScore == null) return a.name.localeCompare(b.name, 'th');
      if (a.finalScore == null) return 1;
      if (b.finalScore == null) return -1;
      return b.finalScore - a.finalScore;
    });
}

export function formatEvaluatorWeightFormula(config: InnovationConfig): string {
  return config.evaluators.map((e) => `${e.name} ${e.weight}%`).join(' + ');
}
