export type EvaEvaluationTemplate = {
  id: string;
  name: string;
  description?: string;
  prompts: EvaPrompt[];
  updatedAt: string;
};

export type EvaPromptType = 'text' | 'choice' | 'multi_choice' | 'rating_1_5';

export type EvaPrompt = {
  id: string;
  title: string;
  type: EvaPromptType;
  options?: string[];
  ratingItems?: string[];
};

export const EVA_TEMPLATE_STORAGE_KEY = 'minddojo.eva-editor.templates.v1';

/** เดิมใช้ id นี้ — ยังรองรับลิงก์เก่า */
export const LEGACY_DEFAULT_TEMPLATE_ID = 'eva-innoclub-default';

/**
 * สร้าง id ในรูปแบบ eva-{ชื่อแบบประเมิน} (ช่องว่างเป็น - )
 */
export function evaBaseIdFromName(name: string): string {
  const trimmed = name.trim() || 'แบบประเมิน';
  const slug = trimmed.replace(/\s+/g, '-');
  return `eva-${slug}`;
}

export function evaUniqueIdFromName(name: string, existingIds: ReadonlySet<string>): string {
  let id = evaBaseIdFromName(name);
  if (!existingIds.has(id)) return id;
  let n = 2;
  while (existingIds.has(`${id}-${n}`)) n += 1;
  return `${id}-${n}`;
}

export function migrateEvaTemplates(templates: EvaEvaluationTemplate[]): EvaEvaluationTemplate[] {
  return templates.map((t) => {
    const normalizedPrompts = Array.isArray(t.prompts)
      ? t.prompts.map((prompt, idx) => normalizePrompt(prompt, idx))
      : [];
    if (t.id === LEGACY_DEFAULT_TEMPLATE_ID) {
      return {
        ...t,
        id: evaBaseIdFromName(t.name || 'แบบประเมิน InnoClub'),
        description: t.description || '',
        prompts: normalizedPrompts,
      };
    }
    return { ...t, description: t.description || '', prompts: normalizedPrompts };
  });
}

function normalizePrompt(raw: unknown, idx: number): EvaPrompt {
  if (typeof raw === 'string') {
    return {
      id: `prompt-${idx + 1}`,
      title: raw,
      type: 'text',
    };
  }
  if (raw && typeof raw === 'object') {
    const obj = raw as Partial<EvaPrompt>;
    const type: EvaPromptType =
      obj.type === 'choice' || obj.type === 'multi_choice' || obj.type === 'rating_1_5' || obj.type === 'text'
        ? obj.type
        : 'text';
    const options =
      type === 'choice' || type === 'multi_choice'
        ? (Array.isArray(obj.options) ? obj.options.filter(Boolean) : [])
        : undefined;
    const ratingItems =
      type === 'rating_1_5' ? (Array.isArray(obj.ratingItems) ? obj.ratingItems.filter(Boolean) : []) : undefined;
    return {
      id: obj.id?.trim() || `prompt-${idx + 1}`,
      title: obj.title?.trim() || `คำถามที่ ${idx + 1}`,
      type,
      options,
      ratingItems,
    };
  }
  return {
    id: `prompt-${idx + 1}`,
    title: `คำถามที่ ${idx + 1}`,
    type: 'text',
  };
}

/** หา template จากพารามิเตอร์ใน URL (รองรับ id เก่า) */
/** โหลดจาก localStorage พร้อม migrate id เก่า (ไม่มีค่าเริ่มต้นแบบ editor) */
export function loadStoredEvaTemplates(): EvaEvaluationTemplate[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(EVA_TEMPLATE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as EvaEvaluationTemplate[];
    if (!Array.isArray(parsed)) return [];
    const migrated = migrateEvaTemplates(parsed);
    if (parsed.some((t) => t.id === LEGACY_DEFAULT_TEMPLATE_ID)) {
      localStorage.setItem(EVA_TEMPLATE_STORAGE_KEY, JSON.stringify(migrated));
    }
    return migrated;
  } catch {
    return [];
  }
}

export function findEvaTemplateByRouteId(
  list: EvaEvaluationTemplate[],
  templateId: string | undefined
): EvaEvaluationTemplate | null {
  if (!templateId) return null;
  const direct = list.find((item) => item.id === templateId);
  if (direct) return direct;
  if (templateId === LEGACY_DEFAULT_TEMPLATE_ID) {
    const migratedId = evaBaseIdFromName('แบบประเมิน InnoClub');
    return (
      list.find((item) => item.id === migratedId) ||
      list.find((item) => item.name === 'แบบประเมิน InnoClub') ||
      null
    );
  }
  return null;
}
