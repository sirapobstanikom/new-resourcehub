import { supabase } from './supabase';
import type { EvaEvaluationTemplate, EvaPrompt } from './evaTemplates';
import { loadStoredEvaTemplates, migrateEvaTemplates } from './evaTemplates';

const SELECT_WITH_HEADING = 'id, name, heading, description, prompts_json, updated_at';
const SELECT_LEGACY = 'id, name, description, prompts_json, updated_at';

/** Supabase ยังไม่มีคอลัมน์ heading (ยังไม่รัน migration) */
export function isEvaHeadingColumnMissingError(message?: string | null): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes('heading') ||
    (m.includes('column') && m.includes('does not exist')) ||
    m.includes('schema cache') ||
    m.includes('pgrst204')
  );
}

type EvaTemplateRow = {
  id: string;
  name: string;
  heading?: string | null;
  description?: string | null;
  prompts_json: unknown;
  updated_at: string;
};

function mapEvaTemplateRow(row: EvaTemplateRow, includeHeading: boolean): EvaEvaluationTemplate {
  return {
    id: row.id,
    name: row.name,
    heading: includeHeading ? (row.heading as string) || '' : '',
    description: (row.description as string) || '',
    prompts: Array.isArray(row.prompts_json) ? (row.prompts_json as EvaPrompt[]) : [],
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

/** รวม heading จาก localStorage เมื่อ Supabase ยังไม่มีคอลัมน์ heading */
function mergeHeadingFromLocal(remote: EvaEvaluationTemplate[]): EvaEvaluationTemplate[] {
  const localById = new Map(loadStoredEvaTemplates().map((t) => [t.id, t]));
  return remote.map((t) => {
    const local = localById.get(t.id);
    if (!t.heading?.trim() && local?.heading?.trim()) {
      return { ...t, heading: local.heading };
    }
    return t;
  });
}

export type FetchEvaTemplatesResult = {
  templates: EvaEvaluationTemplate[];
  error: string | null;
  headingColumnAvailable: boolean;
};

/** โหลดแบบประเมินจาก Supabase — รองรับ DB ที่ยังไม่มีคอลัมน์ heading */
export async function fetchEvaEditorTemplatesFromSupabase(): Promise<FetchEvaTemplatesResult> {
  const order = { ascending: false } as const;

  const withHeading = await supabase
    .from('eva_editor_templates')
    .select(SELECT_WITH_HEADING)
    .order('updated_at', order);

  if (!withHeading.error) {
    const templates = migrateEvaTemplates(
      (withHeading.data || []).map((row) => mapEvaTemplateRow(row as EvaTemplateRow, true))
    );
    return { templates, error: null, headingColumnAvailable: true };
  }

  if (isEvaHeadingColumnMissingError(withHeading.error.message)) {
    const legacy = await supabase
      .from('eva_editor_templates')
      .select(SELECT_LEGACY)
      .order('updated_at', order);

    if (legacy.error) {
      return {
        templates: [],
        error: legacy.error.message,
        headingColumnAvailable: false,
      };
    }

    const templates = migrateEvaTemplates(
      mergeHeadingFromLocal(
        (legacy.data || []).map((row) => mapEvaTemplateRow(row as EvaTemplateRow, false))
      )
    );
    return { templates, error: null, headingColumnAvailable: false };
  }

  return {
    templates: [],
    error: withHeading.error.message,
    headingColumnAvailable: true,
  };
}

export type UpsertEvaTemplateResult = { ok: boolean; error: string | null; headingSynced: boolean };

/** บันทึกแบบประเมินขึ้น Supabase — ข้าม heading ถ้าคอลัมน์ยังไม่มี */
export async function upsertEvaEditorTemplateToSupabase(
  template: EvaEvaluationTemplate
): Promise<UpsertEvaTemplateResult> {
  const updated_at = new Date().toISOString();
  const withHeading = await supabase.from('eva_editor_templates').upsert({
    id: template.id,
    name: template.name,
    heading: template.heading?.trim() || '',
    description: template.description || '',
    prompts_json: template.prompts,
    updated_at,
  });

  if (!withHeading.error) {
    return { ok: true, error: null, headingSynced: true };
  }

  if (isEvaHeadingColumnMissingError(withHeading.error.message)) {
    const legacy = await supabase.from('eva_editor_templates').upsert({
      id: template.id,
      name: template.name,
      description: template.description || '',
      prompts_json: template.prompts,
      updated_at,
    });
    if (legacy.error) {
      return { ok: false, error: legacy.error.message, headingSynced: false };
    }
    return { ok: true, error: null, headingSynced: false };
  }

  return { ok: false, error: withHeading.error.message, headingSynced: true };
}
