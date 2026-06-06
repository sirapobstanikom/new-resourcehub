export type EvaEvaluationTemplate = {
  id: string;
  name: string;
  /** หัวข้อใหญ่บนฟอร์มผู้ตอบ (ใส่ก่อนชื่อแบบประเมินได้ หรือไม่ใส่ก็ได้) */
  heading?: string;
  description?: string;
  prompts: EvaPrompt[];
  updatedAt: string;
};

export type EvaDescriptionWeight = 'normal' | 'bold';
export type EvaDescriptionAlign = 'left' | 'center';
/** สไตล์ต่อบรรทัดในบล็อกคำอธิบาย */
export type EvaDescriptionLineStyle = 'normal' | 'bold' | 'small';

export type EvaDescriptionLine = {
  text: string;
  style: EvaDescriptionLineStyle;
};

export type EvaPromptType =
  | 'text'
  | 'choice'
  | 'multi_choice'
  | 'rating_1_5'
  | 'commitment_table'
  | 'fill_sentence'
  /** ข้อความอธิบายระหว่างโจทย์ — ผู้ตอบไม่ต้องกรอก */
  | 'description';

/** แถวในตาราง COMMITMENT / BY WHEN / HOW I'LL KNOW */
export type EvaCommitmentRow = {
  commitment: string;
  /** ข้อความตัวอย่างในช่อง BY WHEN (แสดงเป็น placeholder) */
  byWhenPlaceholder?: string;
  /** ข้อความตัวอย่างในช่อง HOW I'LL KNOW (แสดงเป็น placeholder) */
  howKnowPlaceholder?: string;
};

/** รูปแบบเลข / ข้อความนำหน้าหัวข้อโจทย์บนฟอร์มผู้ตอบ */
export type EvaPromptNumberStyle = 'auto' | 'none' | 'fixed';

export type EvaPrompt = {
  id: string;
  title: string;
  type: EvaPromptType;
  /** auto = 1. 2. … ตามลำดับที่แสดง, none = ไม่มี, fixed = ใช้ fixedNumberPrefix ตามที่พิมพ์ */
  promptNumberStyle?: EvaPromptNumberStyle;
  /** เมื่อ promptNumberStyle === 'fixed' */
  fixedNumberPrefix?: string;
  /** @deprecated อ่านแล้วแปลงเป็น promptNumberStyle ใน normalize */
  showNumberPrefix?: boolean;
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
  /** @deprecated ใช้ descriptionLines แทน — อ่านแล้วแปลงใน getDescriptionLines */
  descriptionWeight?: EvaDescriptionWeight;
  /** จัดตำแหน่งทั้งบล็อก — ใช้เมื่อ type === 'description' */
  descriptionAlign?: EvaDescriptionAlign;
  /** บรรทัดคำอธิบายพร้อมสไตล์ต่อบรรทัด */
  descriptionLines?: EvaDescriptionLine[];
};

function parseDescriptionLineStyle(raw: unknown): EvaDescriptionLineStyle {
  if (raw === 'bold' || raw === 'small') return raw;
  return 'normal';
}

export function descriptionLinesToTitle(lines: EvaDescriptionLine[]): string {
  return lines.map((l) => l.text).join('\n');
}

/** โจทย์ที่ต้องกรอกคำตอบบนฟอร์ม (ไม่มีข้อความโจทย์ = ไม่บังคับ) */
export function isEvaPromptRequiredForAnswer(prompt: EvaPrompt): boolean {
  if (prompt.type === 'description') return false;
  return Boolean(prompt.title?.trim());
}

/** ข้อย่อยของโจทย์ rating 1-5 ที่มีข้อความ — ว่าง = แสดงแค่ข้อโจทย์หลักกับปุ่ม 1–5 */
export function getEvaRatingSubItems(prompt: EvaPrompt): string[] {
  if (prompt.type !== 'rating_1_5') return [];
  return (prompt.ratingItems ?? []).map((s) => s.trim()).filter(Boolean);
}

/** คีย์เก็บคำตอบ rating 1-5 ต่อข้อโจทย์ */
export function getEvaRatingAnswerKeys(prompt: EvaPrompt): string[] {
  const subItems = getEvaRatingSubItems(prompt);
  if (subItems.length > 0) {
    return subItems.map((_, itemIdx) => `${prompt.id}::${itemIdx}`);
  }
  return [`${prompt.id}::0`];
}

/** บรรทัดคำอธิบายที่มีข้อความ — บรรทัดว่างไม่แสดงบนฟอร์ม */
export function getVisibleDescriptionLines(prompt: EvaPrompt): EvaDescriptionLine[] {
  return getDescriptionLines(prompt).filter((l) => l.text.trim().length > 0);
}

/** อ่านบรรทัดคำอธิบาย (รองรับข้อมูลเก่าที่ใช้ title + descriptionWeight) */
export function getDescriptionLines(prompt: EvaPrompt): EvaDescriptionLine[] {
  if (Array.isArray(prompt.descriptionLines) && prompt.descriptionLines.length > 0) {
    return prompt.descriptionLines.map((l) => ({
      text: typeof l.text === 'string' ? l.text : '',
      style: parseDescriptionLineStyle(l.style),
    }));
  }
  const legacyBold = prompt.descriptionWeight === 'bold';
  const parts = (prompt.title || '').split('\n');
  if (parts.length === 0) return [{ text: '', style: 'normal' }];
  return parts.map((text) => ({ text, style: legacyBold ? 'bold' : 'normal' }));
}

export function getDescriptionAlign(prompt: EvaPrompt): EvaDescriptionAlign {
  return prompt.descriptionAlign === 'center' ? 'center' : 'left';
}

export function evaDescriptionLineClassName(style: EvaDescriptionLineStyle): string {
  if (style === 'bold') return 'font-bold text-base md:text-lg text-gray-100';
  if (style === 'small') return 'font-normal text-sm md:text-base text-gray-300/95';
  return 'font-normal text-base md:text-lg text-gray-200';
}

/** class คอนเทนเนอร์บล็อกคำอธิบายบนฟอร์มผู้ตอบ */
export function evaDescriptionBlockClassName(prompt: EvaPrompt): string {
  const align = getDescriptionAlign(prompt) === 'center' ? 'text-center' : 'text-left';
  return `space-y-1.5 leading-relaxed ${align}`;
}

/** @deprecated ใช้ getDescriptionLines + evaDescriptionLineClassName */
export function evaDescriptionBodyClassName(prompt: EvaPrompt): string {
  return `${evaDescriptionBlockClassName(prompt)} whitespace-pre-line [overflow-wrap:anywhere]`;
}

export function getPromptNumberStyle(prompt: EvaPrompt): EvaPromptNumberStyle {
  if (
    prompt.promptNumberStyle === 'auto' ||
    prompt.promptNumberStyle === 'none' ||
    prompt.promptNumberStyle === 'fixed'
  ) {
    return prompt.promptNumberStyle;
  }
  if (prompt.showNumberPrefix === false) return 'none';
  return 'auto';
}

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
        heading: typeof t.heading === 'string' ? t.heading : '',
        description: t.description || '',
        prompts: normalizedPrompts,
      };
    }
    return {
      ...t,
      heading: typeof t.heading === 'string' ? t.heading : '',
      description: t.description || '',
      prompts: normalizedPrompts,
    };
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
      obj.type === 'fill_sentence' ||
      obj.type === 'description'
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
    if (type === 'description') {
      const descriptionExtra: Partial<Pick<EvaPrompt, 'descriptionAlign' | 'descriptionLines'>> = {};
      if (obj.descriptionAlign === 'center') descriptionExtra.descriptionAlign = 'center';
      const rawLines = obj.descriptionLines;
      if (Array.isArray(rawLines) && rawLines.length > 0) {
        descriptionExtra.descriptionLines = rawLines.map((l) => {
          const row = l as Partial<EvaDescriptionLine>;
          return {
            text: typeof row.text === 'string' ? row.text : '',
            style: parseDescriptionLineStyle(row.style),
          };
        });
      }
      const title =
        descriptionExtra.descriptionLines?.length
          ? descriptionLinesToTitle(descriptionExtra.descriptionLines)
          : typeof obj.title === 'string'
            ? obj.title
            : '';
      if (!descriptionExtra.descriptionLines?.length) {
        const legacyBold = obj.descriptionWeight === 'bold';
        descriptionExtra.descriptionLines = title.split('\n').map((text) => ({
          text,
          style: legacyBold ? ('bold' as const) : ('normal' as const),
        }));
        if (descriptionExtra.descriptionLines.length === 0) {
          descriptionExtra.descriptionLines = [{ text: '', style: 'normal' }];
        }
      }
      return {
        id: obj.id?.trim() || `prompt-${idx + 1}`,
        title,
        type: 'description' as const,
        ...descriptionExtra,
      };
    }
    const numberingExtra: Partial<Pick<EvaPrompt, 'promptNumberStyle' | 'fixedNumberPrefix'>> = (() => {
      const s = obj.promptNumberStyle;
      if (s === 'none') return { promptNumberStyle: 'none' as const };
      if (s === 'fixed')
        return {
          promptNumberStyle: 'fixed' as const,
          fixedNumberPrefix: typeof obj.fixedNumberPrefix === 'string' ? obj.fixedNumberPrefix : '',
        };
      if (s === 'auto') return {};
      if (obj.showNumberPrefix === false) return { promptNumberStyle: 'none' as const };
      return {};
    })();
    return {
      id: obj.id?.trim() || `prompt-${idx + 1}`,
      title: typeof obj.title === 'string' ? obj.title : '',
      type,
      ...numberingExtra,
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
    title: '',
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
