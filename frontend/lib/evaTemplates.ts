export type EvaEvaluationTemplate = {
  id: string;
  name: string;
  description?: string;
  prompts: EvaPrompt[];
  updatedAt: string;
};

export type EvaPromptType =
  | 'text'
  | 'choice'
  | 'multi_choice'
  | 'rating_1_5'
  | 'commitment_table'
  | 'fill_sentence';

/** แถวในตาราง COMMITMENT / BY WHEN / HOW I'LL KNOW */
export type EvaCommitmentRow = {
  commitment: string;
  /** ข้อความตัวอย่างในช่อง BY WHEN (แสดงเป็น placeholder) */
  byWhenPlaceholder?: string;
  /** ข้อความตัวอย่างในช่อง HOW I'LL KNOW (แสดงเป็น placeholder) */
  howKnowPlaceholder?: string;
};

export type EvaPrompt = {
  id: string;
  title: string;
  type: EvaPromptType;
  options?: string[];
  ratingItems?: string[];
  commitmentHeaders?: [string, string, string];
  commitmentRows?: EvaCommitmentRow[];
  /** บรรทัดนำภาษาอังกฤษ (เช่น ONE SENTENCE — ...) */
  fillIntroEn?: string;
  /** บรรทัดนำภาษาไทย */
  fillIntroTh?: string;
  /** ข้อความก่อนช่องว่างแรก */
  fillLeadIn?: string;
  /** ข้อความระหว่างสองช่องว่าง */
  fillBridge?: string;
  /** ข้อความหลังช่องว่างที่สอง */
  fillClosing?: string;
};

export const EVA_DEFAULT_COMMITMENT_HEADERS: [string, string, string] = [
  'COMMITMENT',
  'BY WHEN',
  "HOW I'LL KNOW I DID IT",
];

export function defaultEvaCommitmentRows(): EvaCommitmentRow[] {
  return [
    {
      commitment: "The accountability conversation I've been avoiding:",
      byWhenPlaceholder: '',
      howKnowPlaceholder: '',
    },
    {
      commitment: "The person I'll give a Whale Done to this week:",
      byWhenPlaceholder: 'By end of week',
      howKnowPlaceholder: '',
    },
    {
      commitment: "The one leadership behavior I'll START doing:",
      byWhenPlaceholder: '',
      howKnowPlaceholder: '',
    },
    {
      commitment: "The one leadership behavior I'll STOP doing:",
      byWhenPlaceholder: '',
      howKnowPlaceholder: '',
    },
    {
      commitment: "Something I'll do specifically to understand my team better:",
      byWhenPlaceholder: '',
      howKnowPlaceholder: '',
    },
  ];
}

export const EVA_DEFAULT_FILL_INTRO_EN = 'ONE SENTENCE — MY LEADERSHIP INTENTION GOING FORWARD:';
export const EVA_DEFAULT_FILL_INTRO_TH = 'คำมั่นสัญญาด้านความเป็นผู้นำของฉัน:';
export const EVA_DEFAULT_FILL_LEAD_IN = 'I commit to ';
export const EVA_DEFAULT_FILL_BRIDGE = ' so that my team can ';
export const EVA_DEFAULT_FILL_CLOSING = '.';

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

function parseCommitmentRows(raw: unknown): EvaCommitmentRow[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const rows: EvaCommitmentRow[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Partial<EvaCommitmentRow>;
    const commitment = typeof o.commitment === 'string' ? o.commitment.trim() : '';
    if (!commitment) continue;
    rows.push({
      commitment,
      byWhenPlaceholder: typeof o.byWhenPlaceholder === 'string' ? o.byWhenPlaceholder : '',
      howKnowPlaceholder: typeof o.howKnowPlaceholder === 'string' ? o.howKnowPlaceholder : '',
    });
  }
  return rows.length > 0 ? rows : undefined;
}

function parseCommitmentHeaders(raw: unknown): [string, string, string] | undefined {
  if (!Array.isArray(raw) || raw.length < 3) return undefined;
  const a = String(raw[0] ?? '').trim();
  const b = String(raw[1] ?? '').trim();
  const c = String(raw[2] ?? '').trim();
  if (!a || !b || !c) return undefined;
  return [a, b, c];
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
      obj.type === 'choice' ||
      obj.type === 'multi_choice' ||
      obj.type === 'rating_1_5' ||
      obj.type === 'text' ||
      obj.type === 'commitment_table' ||
      obj.type === 'fill_sentence'
        ? obj.type
        : 'text';
    const options =
      type === 'choice' || type === 'multi_choice'
        ? (Array.isArray(obj.options) ? obj.options.filter(Boolean) : [])
        : undefined;
    const ratingItems =
      type === 'rating_1_5' ? (Array.isArray(obj.ratingItems) ? obj.ratingItems.filter(Boolean) : []) : undefined;
    const commitmentHeaders =
      type === 'commitment_table'
        ? parseCommitmentHeaders(obj.commitmentHeaders) ?? EVA_DEFAULT_COMMITMENT_HEADERS
        : undefined;
    const commitmentRows =
      type === 'commitment_table' ? parseCommitmentRows(obj.commitmentRows) ?? defaultEvaCommitmentRows() : undefined;
    const fillIntroEn = type === 'fill_sentence' && typeof obj.fillIntroEn === 'string' ? obj.fillIntroEn : undefined;
    const fillIntroTh = type === 'fill_sentence' && typeof obj.fillIntroTh === 'string' ? obj.fillIntroTh : undefined;
    const fillLeadIn = type === 'fill_sentence' && typeof obj.fillLeadIn === 'string' ? obj.fillLeadIn : undefined;
    const fillBridge = type === 'fill_sentence' && typeof obj.fillBridge === 'string' ? obj.fillBridge : undefined;
    const fillClosing = type === 'fill_sentence' && typeof obj.fillClosing === 'string' ? obj.fillClosing : undefined;
    return {
      id: obj.id?.trim() || `prompt-${idx + 1}`,
      title: obj.title?.trim() || `คำถามที่ ${idx + 1}`,
      type,
      options,
      ratingItems,
      commitmentHeaders,
      commitmentRows,
      fillIntroEn,
      fillIntroTh,
      fillLeadIn,
      fillBridge,
      fillClosing,
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
