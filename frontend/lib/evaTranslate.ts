import {
  getDescriptionLines,
  getEvaRatingSubItems,
  getEvaFormLanguage,
  type EvaEnglishSnapshot,
  type EvaEvaluationTemplate,
} from './evaTemplates';
import { openaiChat } from '../services/openai';

const THAI_RE = /[\u0E00-\u0E7F]/;
const CACHE_PREFIX = 'minddojo.eva-en-cache.v1';

export function containsThai(text: string): boolean {
  return THAI_RE.test(text);
}

type TextEntry = { path: string; text: string };

function addEntry(entries: TextEntry[], path: string, text: string | undefined) {
  const trimmed = (text || '').trim();
  if (!trimmed || !containsThai(trimmed)) return;
  entries.push({ path, text: trimmed });
}

export function collectEvaTranslatableEntries(template: EvaEvaluationTemplate): TextEntry[] {
  const entries: TextEntry[] = [];
  addEntry(entries, 'heading', template.heading);
  addEntry(entries, 'name', template.name);
  addEntry(entries, 'description', template.description);

  template.prompts.forEach((prompt, pi) => {
    const base = `prompts.${pi}`;
    addEntry(entries, `${base}.title`, prompt.title);
    addEntry(entries, `${base}.fixedNumberPrefix`, prompt.fixedNumberPrefix);
    prompt.options?.forEach((option, oi) => addEntry(entries, `${base}.options.${oi}`, option));
    addEntry(entries, `${base}.correctOption`, prompt.correctOption);
    getEvaRatingSubItems(prompt).forEach((item, ri) => {
      addEntry(entries, `${base}.ratingSubItems.${ri}.text`, item.text);
      addEntry(entries, `${base}.ratingSubItems.${ri}.fixedNumberPrefix`, item.fixedNumberPrefix);
    });
    prompt.commitmentHeaders?.forEach((header, hi) => addEntry(entries, `${base}.commitmentHeaders.${hi}`, header));
    prompt.commitmentRows?.forEach((row, ri) => {
      addEntry(entries, `${base}.commitmentRows.${ri}.commitment`, row.commitment);
      addEntry(entries, `${base}.commitmentRows.${ri}.byWhenPlaceholder`, row.byWhenPlaceholder);
      addEntry(entries, `${base}.commitmentRows.${ri}.howKnowPlaceholder`, row.howKnowPlaceholder);
    });
    addEntry(entries, `${base}.fillIntroTh`, prompt.fillIntroTh);
    addEntry(entries, `${base}.fillLeadIn`, prompt.fillLeadIn);
    addEntry(entries, `${base}.fillBridge`, prompt.fillBridge);
    addEntry(entries, `${base}.fillClosing`, prompt.fillClosing);
    getDescriptionLines(prompt).forEach((line, li) => {
      addEntry(entries, `${base}.descriptionLines.${li}.text`, line.text);
    });
  });

  return entries;
}

export function templateNeedsEnglishTranslation(template: EvaEvaluationTemplate): boolean {
  return collectEvaTranslatableEntries(template).length > 0;
}

export function isEvaEnglishSnapshotCurrent(template: EvaEvaluationTemplate): boolean {
  const snap = template.englishSnapshot;
  return Boolean(snap && snap.syncedAt === template.updatedAt);
}

export function buildEvaEnglishSnapshot(
  source: EvaEvaluationTemplate,
  localized: EvaEvaluationTemplate
): EvaEnglishSnapshot {
  return {
    heading: localized.heading,
    name: localized.name,
    description: localized.description,
    prompts: localized.prompts.map((prompt) => ({ ...prompt })),
    syncedAt: source.updatedAt,
  };
}

/** ใช้เนื้อหา EN ที่แปลไว้ล่วงหน้า — ไม่เรียก API */
export function resolveEvaEnglishFormTemplate(
  template: EvaEvaluationTemplate
): EvaEvaluationTemplate | null {
  if (getEvaFormLanguage(template) !== 'en') return null;
  const snap = template.englishSnapshot;
  if (!snap || snap.syncedAt !== template.updatedAt) return null;
  return {
    ...template,
    heading: snap.heading,
    name: snap.name,
    description: snap.description,
    prompts: snap.prompts.map((prompt) => ({ ...prompt })),
  };
}

function cacheKey(template: EvaEvaluationTemplate): string {
  return `${CACHE_PREFIX}::${template.id}::${template.updatedAt || ''}`;
}

function readCache(template: EvaEvaluationTemplate): Record<string, string> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(cacheKey(template));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function writeCache(template: EvaEvaluationTemplate, map: Record<string, string>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(cacheKey(template), JSON.stringify(map));
  } catch {
    /* ignore quota */
  }
}

function setByPath(root: EvaEvaluationTemplate, path: string, value: string) {
  const parts = path.split('.');
  if (parts[0] === 'heading') {
    root.heading = value;
    return;
  }
  if (parts[0] === 'name') {
    root.name = value;
    return;
  }
  if (parts[0] === 'description') {
    root.description = value;
    return;
  }
  if (parts[0] !== 'prompts') return;

  const promptIdx = Number(parts[1]);
  const prompt = root.prompts[promptIdx];
  if (!prompt) return;

  if (parts.length === 3 && parts[2] === 'title') {
    prompt.title = value;
    return;
  }
  if (parts.length === 3 && parts[2] === 'fixedNumberPrefix') {
    prompt.fixedNumberPrefix = value;
    return;
  }
  if (parts.length === 3 && parts[2] === 'correctOption') {
    prompt.correctOption = value;
    return;
  }
  if (parts.length === 3 && parts[2] === 'fillIntroTh') {
    prompt.fillIntroTh = value;
    return;
  }
  if (parts.length === 3 && parts[2] === 'fillLeadIn') {
    prompt.fillLeadIn = value;
    return;
  }
  if (parts.length === 3 && parts[2] === 'fillBridge') {
    prompt.fillBridge = value;
    return;
  }
  if (parts.length === 3 && parts[2] === 'fillClosing') {
    prompt.fillClosing = value;
    return;
  }
  if (parts[2] === 'options' && parts.length === 4) {
    const optIdx = Number(parts[3]);
    if (!prompt.options) prompt.options = [];
    prompt.options[optIdx] = value;
    return;
  }
  if (parts[2] === 'commitmentHeaders' && parts.length === 4) {
    const hi = Number(parts[3]);
    const headers = [...(prompt.commitmentHeaders || ['', '', ''])] as [string, string, string];
    headers[hi] = value;
    prompt.commitmentHeaders = headers;
    return;
  }
  if (parts[2] === 'commitmentRows' && parts.length === 5) {
    const ri = Number(parts[3]);
    const field = parts[4];
    if (!prompt.commitmentRows) return;
    const row = { ...prompt.commitmentRows[ri] };
    if (field === 'commitment') row.commitment = value;
    if (field === 'byWhenPlaceholder') row.byWhenPlaceholder = value;
    if (field === 'howKnowPlaceholder') row.howKnowPlaceholder = value;
    prompt.commitmentRows = prompt.commitmentRows.map((r, i) => (i === ri ? row : r));
    return;
  }
  if (parts[2] === 'ratingSubItems' && parts.length === 5) {
    const ri = Number(parts[3]);
    const field = parts[4];
    const items = getEvaRatingSubItems(prompt).map((item) => ({ ...item }));
    if (!items[ri]) return;
    if (field === 'text') items[ri].text = value;
    if (field === 'fixedNumberPrefix') items[ri].fixedNumberPrefix = value;
    prompt.ratingSubItems = items;
    prompt.ratingItems = items.map((item) => item.text);
    return;
  }
  if (parts[2] === 'descriptionLines' && parts.length === 5 && parts[4] === 'text') {
    const li = Number(parts[3]);
    const lines = getDescriptionLines(prompt).map((line) => ({ ...line }));
    if (!lines[li]) return;
    lines[li].text = value;
    prompt.descriptionLines = lines;
    prompt.title = lines.map((line) => line.text).join('\n');
  }
}

export function applyEvaEnglishTranslations(
  template: EvaEvaluationTemplate,
  translations: Record<string, string>
): EvaEvaluationTemplate {
  const next: EvaEvaluationTemplate = {
    ...template,
    prompts: template.prompts.map((prompt) => ({ ...prompt })),
  };
  for (const [path, value] of Object.entries(translations)) {
    if (value.trim()) setByPath(next, path, value.trim());
  }
  return next;
}

async function translateEntriesWithOpenAI(entries: TextEntry[]): Promise<Record<string, string>> {
  const uniqueTexts = Array.from(new Set(entries.map((e) => e.text)));
  const payload = uniqueTexts.map((text, id) => ({ id, text }));

  const raw = await openaiChat(
    [
      {
        role: 'system',
        content:
          'You translate Thai evaluation-form text to natural English. Return ONLY valid JSON: an array of {"id": number, "en": string} with the same ids. If a string is already English, return it unchanged. Preserve numbers, names, placeholders, and line breaks.',
      },
      { role: 'user', content: JSON.stringify(payload) },
    ],
    0.2
  );

  const cleaned = raw.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
  const parsed = JSON.parse(cleaned) as Array<{ id: number; en: string }>;
  if (!Array.isArray(parsed)) throw new Error('Invalid translation response');

  const byId = new Map<number, string>();
  for (const row of parsed) {
    if (typeof row.id === 'number' && typeof row.en === 'string') {
      byId.set(row.id, row.en.trim());
    }
  }

  const textToEn = new Map<string, string>();
  uniqueTexts.forEach((text, id) => {
    const en = byId.get(id);
    if (en) textToEn.set(text, en);
  });

  const out: Record<string, string> = {};
  for (const entry of entries) {
    const en = textToEn.get(entry.text);
    if (en) out[entry.path] = en;
  }
  return out;
}

/** แปลและสร้าง englishSnapshot สำหรับเก็บใน editor (debounce แล้วเรียก) */
export async function buildEvaEnglishSnapshotForTemplate(
  template: EvaEvaluationTemplate
): Promise<EvaEnglishSnapshot | null> {
  if (getEvaFormLanguage(template) !== 'en') return null;
  if (!templateNeedsEnglishTranslation(template)) {
    return {
      heading: template.heading,
      name: template.name,
      description: template.description,
      prompts: template.prompts.map((prompt) => ({ ...prompt })),
      syncedAt: template.updatedAt,
    };
  }
  const localized = await localizeEvaTemplateForEnglish(template);
  return buildEvaEnglishSnapshot(template, localized);
}

/** แปลข้อความไทยในแบบประเมินเป็นภาษาอังกฤษ (cache ใน localStorage) */
export async function localizeEvaTemplateForEnglish(
  template: EvaEvaluationTemplate
): Promise<EvaEvaluationTemplate> {
  const entries = collectEvaTranslatableEntries(template);
  if (entries.length === 0) return template;

  const cached = readCache(template);
  if (cached && entries.every((e) => cached[e.path])) {
    return applyEvaEnglishTranslations(template, cached);
  }

  const translations = await translateEntriesWithOpenAI(entries);
  writeCache(template, translations);
  return applyEvaEnglishTranslations(template, translations);
}
