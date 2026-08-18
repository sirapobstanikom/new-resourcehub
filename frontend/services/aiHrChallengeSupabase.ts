import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { titleForScore, type CaseAnswer } from '../lib/aiHrChallengeCases';

export type AiHrRegistration = {
  name: string;
  company: string;
  position: string;
  email: string;
  employeeCount: string;
};

export type AiHrPlayer = {
  id: string;
  name: string;
  email: string;
  company: string;
  position: string;
  employee_count: string;
};

export type SaveAiHrSessionPayload = {
  playerId: string | null;
  registration: AiHrRegistration;
  answers: CaseAnswer[];
  score: number;
};

export const AI_HR_REGISTRATION_KEY = 'minddojo.ai_hr_challenge.last_registration';

const LOCAL_SESSIONS_KEY = 'minddojo.ai_hr_challenge.sessions.v1';

export function normalizeRegistration(info: AiHrRegistration): AiHrRegistration {
  return {
    name: info.name.trim(),
    company: info.company.trim(),
    position: info.position.trim(),
    email: info.email.trim().toLowerCase(),
    employeeCount: info.employeeCount.trim(),
  };
}

export function loadStoredRegistration(): AiHrRegistration | null {
  try {
    const raw = localStorage.getItem(AI_HR_REGISTRATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AiHrRegistration;
    if (!parsed.name || !parsed.email || !parsed.company) return null;
    return normalizeRegistration(parsed);
  } catch {
    return null;
  }
}

export function storeRegistration(info: AiHrRegistration): void {
  localStorage.setItem(AI_HR_REGISTRATION_KEY, JSON.stringify(normalizeRegistration(info)));
}

function appendLocalSession(payload: SaveAiHrSessionPayload): void {
  try {
    const raw = localStorage.getItem(LOCAL_SESSIONS_KEY);
    const list = raw ? (JSON.parse(raw) as unknown[]) : [];
    const norm = normalizeRegistration(payload.registration);
    list.push({
      ...norm,
      answers: payload.answers,
      score: payload.score,
      at: new Date().toISOString(),
    });
    localStorage.setItem(LOCAL_SESSIONS_KEY, JSON.stringify(list.slice(-200)));
  } catch {
    /* ignore */
  }
}

export async function registerAiHrPlayer(info: AiHrRegistration): Promise<AiHrPlayer> {
  const norm = normalizeRegistration(info);
  if (!isSupabaseConfigured) {
    return {
      id: `local-${norm.email}`,
      name: norm.name,
      email: norm.email,
      company: norm.company,
      position: norm.position,
      employee_count: norm.employeeCount,
    };
  }

  const { data: existing, error: findError } = await supabase
    .from('ai_hr_challenge_players')
    .select('id, name, email, company, position, employee_count')
    .eq('email', norm.email)
    .maybeSingle();

  if (findError) throw new Error(findError.message);

  const row = {
    name: norm.name,
    company: norm.company,
    position: norm.position,
    employee_count: norm.employeeCount,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { data: updated, error: updateError } = await supabase
      .from('ai_hr_challenge_players')
      .update(row)
      .eq('id', existing.id)
      .select('id, name, email, company, position, employee_count')
      .single();
    if (updateError) throw new Error(updateError.message);
    return updated as AiHrPlayer;
  }

  const { data: inserted, error: insertError } = await supabase
    .from('ai_hr_challenge_players')
    .insert({ ...row, email: norm.email })
    .select('id, name, email, company, position, employee_count')
    .single();

  if (insertError) throw new Error(insertError.message);
  return inserted as AiHrPlayer;
}

export async function saveAiHrSession(payload: SaveAiHrSessionPayload): Promise<void> {
  const norm = normalizeRegistration(payload.registration);
  const title = titleForScore(payload.score);

  if (!isSupabaseConfigured) {
    appendLocalSession(payload);
    return;
  }

  const correctCount = payload.answers.filter((a) => a.correct).length;
  const caseSummary = payload.answers
    .map((a) => `${a.caseId}:${a.selectedOption}:${a.correct ? 1 : 0}`)
    .join('|');

  const row = {
    player_id: payload.playerId,
    name: norm.name,
    email: norm.email,
    company: norm.company,
    position: norm.position,
    employee_count: norm.employeeCount,
    case_id: caseSummary,
    selected_option: payload.answers[0]?.selectedOption ?? 'B',
    correct: correctCount === payload.answers.length,
    score: payload.score,
    title,
  };

  const { error } = await supabase.from('ai_hr_challenge_sessions').insert(row);

  if (error) throw new Error(error.message);
}
