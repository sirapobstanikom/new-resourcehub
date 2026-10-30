import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  defaultEvaCommitmentRows,
  EVA_DEFAULT_COMMITMENT_HEADERS,
  EVA_DEFAULT_FILL_BRIDGE,
  EVA_DEFAULT_FILL_CLOSING,
  EVA_DEFAULT_FILL_INTRO_EN,
  EVA_DEFAULT_FILL_INTRO_TH,
  EVA_DEFAULT_FILL_LEAD_IN,
  findEvaTemplateByRouteId,
  evaDescriptionBlockClassName,
  evaDescriptionLineClassName,
  getVisibleDescriptionLines,
  formatEvaRatingSubItemPrefix,
  getEvaFormLanguage,
  getEvaPublicFormCopy,
  getEvaRatingAnswerKeys,
  getEvaRatingSubItems,
  isEvaPromptRequiredForAnswer,
  getPromptNumberStyle,
  loadStoredEvaTemplates,
  THAI_BEVERAGE_CAN_LIMITED_EVA_ID,
  type EvaEvaluationTemplate,
} from '../lib/evaTemplates';

const AYUTTHAYA_HERO = '/images/ayutthaya/wat-chaiwatthanaram.jpg';
const AYUTTHAYA_ATMOSPHERE = '/images/ayutthaya/chaiwatthanaram-wide.jpg';

function isTbaAmazingRaceEva(id?: string | null) {
  if (!id) return false;
  return id === THAI_BEVERAGE_CAN_LIMITED_EVA_ID || id.includes('THAI-BEVERAGE');
}
import { fetchEvaEditorTemplatesFromSupabase } from '../lib/evaSupabaseTemplates';
import { localizeEvaTemplateForEnglish, resolveEvaEnglishFormTemplate, templateNeedsEnglishTranslation } from '../lib/evaTranslate';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { EvaAnswerHoverPopover } from './EvaAnswerHoverPopover';

const RESPONSE_STORAGE_KEY = 'minddojo.eva-editor.responses.v1';
const MULTI_CHOICE_SEP = ' | ';
const OTHER_OPTION_TOKEN = '__OTHER_OPTION__';
const OTHER_OPTION_PREFIX = `${OTHER_OPTION_TOKEN}::`;
const OTHER_TEXT_KEY_SUFFIX = '__other_text';
const isOtherOption = (value: string) =>
  value === OTHER_OPTION_TOKEN || value.startsWith(OTHER_OPTION_PREFIX);
const getOtherOptionLabel = (value: string) =>
  value.startsWith(OTHER_OPTION_PREFIX) ? value.slice(OTHER_OPTION_PREFIX.length) || 'Other:' : 'Other:';

const EvaPublicFormPage: React.FC = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const [template, setTemplate] = useState<EvaEvaluationTemplate | null>(null);
  const [formTemplate, setFormTemplate] = useState<EvaEvaluationTemplate | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const [translatingContent, setTranslatingContent] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const getMultiSelected = (key: string): string[] =>
    (answers[key] || '')
      .split(MULTI_CHOICE_SEP)
      .map((v) => v.trim())
      .filter(Boolean);

  const toggleMultiSelected = (key: string, option: string) => {
    const current = getMultiSelected(key);
    const hasOption = current.includes(option);
    const next = hasOption ? current.filter((v) => v !== option) : [...current, option];
    setAnswers((prev) => ({ ...prev, [key]: next.join(MULTI_CHOICE_SEP) }));
  };

  const getOtherText = (promptId: string) => answers[`${promptId}${OTHER_TEXT_KEY_SUFFIX}`] || '';

  const [submitted, setSubmitted] = useState(false);
  const [scoreResult, setScoreResult] = useState<{ score: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [missingPromptIds, setMissingPromptIds] = useState<string[]>([]);
  const promptRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const activeTemplate = formTemplate ?? template;
  const copy = useMemo(() => {
    const base = getEvaPublicFormCopy(getEvaFormLanguage(activeTemplate));
    const source = template ?? activeTemplate;
    return {
      ...base,
      submittedTitle: source?.submittedTitle?.trim() || base.submittedTitle,
      submittedBody: source?.submittedBody?.trim() || base.submittedBody,
    };
  }, [activeTemplate, template]);
  const isEnglish = getEvaFormLanguage(activeTemplate) === 'en';

  useEffect(() => {
    const loadTemplate = async () => {
      setLoadingTemplate(true);
      const localTemplates = loadStoredEvaTemplates();
      if (!isSupabaseConfigured) {
        setTemplate(findEvaTemplateByRouteId(localTemplates, templateId));
        setLoadingTemplate(false);
        return;
      }
      const { templates: remoteTemplates, error: loadError } = await fetchEvaEditorTemplatesFromSupabase();
      if (loadError) {
        setTemplate(findEvaTemplateByRouteId(localTemplates, templateId));
        setError(getEvaPublicFormCopy('th').loadFailed);
        setLoadingTemplate(false);
        return;
      }
      const found = findEvaTemplateByRouteId(remoteTemplates, templateId)
        || findEvaTemplateByRouteId(localTemplates, templateId);
      setTemplate(found);
      if (typeof window !== 'undefined' && remoteTemplates.length > 0) {
        localStorage.setItem('minddojo.eva-editor.templates.v1', JSON.stringify(remoteTemplates));
      }
      setLoadingTemplate(false);
    };
    loadTemplate();
  }, [templateId]);

  useEffect(() => {
    if (!template) {
      setFormTemplate(null);
      setTranslatingContent(false);
      return;
    }

    const isEn = getEvaFormLanguage(template) === 'en';
    if (!isEn) {
      setFormTemplate(template);
      setTranslatingContent(false);
      return;
    }

    const prebuilt = resolveEvaEnglishFormTemplate(template);
    if (prebuilt) {
      setFormTemplate(prebuilt);
      setTranslatingContent(false);
      return;
    }

    setFormTemplate(template);
    if (!templateNeedsEnglishTranslation(template)) {
      setTranslatingContent(false);
      return;
    }

    let cancelled = false;
    setTranslatingContent(true);
    void localizeEvaTemplateForEnglish(template)
      .then((localized) => {
        if (!cancelled) setFormTemplate(localized);
      })
      .catch(() => {
        /* keep Thai content */
      })
      .finally(() => {
        if (!cancelled) setTranslatingContent(false);
      });

    return () => {
      cancelled = true;
    };
  }, [template]);

  useEffect(() => {
    if (!activeTemplate) {
      document.title = 'MindDoJo';
      return () => {
        document.title = 'MindDoJo';
      };
    }
    document.title = `${activeTemplate.name} | MindDoJo`;
    return () => {
      document.title = 'MindDoJo';
    };
  }, [activeTemplate]);

  const canSubmit = useMemo(() => {
    if (!activeTemplate) return false;
    return activeTemplate.prompts.every((prompt) => {
      if (!isEvaPromptRequiredForAnswer(prompt)) return true;
      const value = (answers[prompt.id] || '').trim();
      if (prompt.type === 'rating_1_5') {
        return getEvaRatingAnswerKeys(prompt).every((key) => {
          const subValue = (answers[key] || '').trim();
          return ['1', '2', '3', '4', '5'].includes(subValue);
        });
      }
      if (prompt.type === 'choice' || prompt.type === 'scored_choice') {
        if (prompt.type === 'scored_choice') return value.length > 0;
        if (isOtherOption(value)) return getOtherText(prompt.id).trim().length > 0;
        return value.length > 0;
      }
      if (prompt.type === 'multi_choice') {
        const selected = getMultiSelected(prompt.id);
        if (selected.length === 0) return false;
        if (selected.some((item) => isOtherOption(item))) return getOtherText(prompt.id).trim().length > 0;
        return true;
      }
      if (prompt.type === 'commitment_table') {
        const rows = prompt.commitmentRows?.length ? prompt.commitmentRows : defaultEvaCommitmentRows();
        return rows.every((_, ri) => {
          const by = (answers[`${prompt.id}::ct::${ri}::by`] || '').trim();
          const how = (answers[`${prompt.id}::ct::${ri}::how`] || '').trim();
          return by.length > 0 && how.length > 0;
        });
      }
      if (prompt.type === 'fill_sentence') {
        const a = (answers[`${prompt.id}::fs::a`] || '').trim();
        const b = (answers[`${prompt.id}::fs::b`] || '').trim();
        return a.length > 0 && b.length > 0;
      }
      if (prompt.type === 'description') return true;
      return value.length > 0;
    });
  }, [activeTemplate, answers]);

  const getMissingPromptIds = (): string[] => {
    if (!activeTemplate) return [];
    return activeTemplate.prompts
      .filter((prompt) => {
        if (!isEvaPromptRequiredForAnswer(prompt)) return false;
        const value = (answers[prompt.id] || '').trim();
        if (prompt.type === 'rating_1_5') {
          return getEvaRatingAnswerKeys(prompt).some((key) => {
            const subValue = (answers[key] || '').trim();
            return !['1', '2', '3', '4', '5'].includes(subValue);
          });
        }
        if (prompt.type === 'choice' || prompt.type === 'scored_choice') {
          if (prompt.type === 'scored_choice') return value.length === 0;
          if (isOtherOption(value)) return getOtherText(prompt.id).trim().length === 0;
          return value.length === 0;
        }
        if (prompt.type === 'multi_choice') {
          const selected = getMultiSelected(prompt.id);
          if (selected.length === 0) return true;
          if (selected.some((item) => isOtherOption(item))) return getOtherText(prompt.id).trim().length === 0;
          return false;
        }
        if (prompt.type === 'commitment_table') {
          const rows = prompt.commitmentRows?.length ? prompt.commitmentRows : defaultEvaCommitmentRows();
          return rows.some((_, ri) => {
            const by = (answers[`${prompt.id}::ct::${ri}::by`] || '').trim();
            const how = (answers[`${prompt.id}::ct::${ri}::how`] || '').trim();
            return by.length === 0 || how.length === 0;
          });
        }
        if (prompt.type === 'fill_sentence') {
          const a = (answers[`${prompt.id}::fs::a`] || '').trim();
          const b = (answers[`${prompt.id}::fs::b`] || '').trim();
          return a.length === 0 || b.length === 0;
        }
        if (prompt.type === 'description') return false;
        return value.length === 0;
      })
      .map((prompt) => prompt.id);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTemplate) return;
    if (!canSubmit) {
      const missingIds = getMissingPromptIds();
      setMissingPromptIds(missingIds);
      const firstMissingId = missingIds[0];
      if (firstMissingId) {
        const targetEl = promptRefs.current[firstMissingId];
        targetEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setError(copy.pleaseAnswerAll);
      return;
    }
    setError(null);
    setMissingPromptIds([]);
    const scoredPrompts = activeTemplate.prompts.filter((prompt) => prompt.type === 'scored_choice');
    const nextScoreResult =
      scoredPrompts.length > 0
        ? {
            score: scoredPrompts.filter((prompt) => (answers[prompt.id] || '').trim() === (prompt.correctOption || '')).length,
            total: scoredPrompts.length,
          }
        : null;
    const payload = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      templateId: activeTemplate.id,
      templateName: activeTemplate.name,
      answers: activeTemplate.prompts.flatMap((prompt) => {
        if (prompt.type === 'description') return [];
        if (prompt.type === 'rating_1_5') {
          const subItems = getEvaRatingSubItems(prompt);
          if (subItems.length > 0) {
            return subItems.map((subItem, itemIdx) => ({
              prompt: prompt.title,
              subPrompt: subItem.text,
              promptType: prompt.type,
              answer: (answers[`${prompt.id}::${itemIdx}`] || '').trim(),
            }));
          }
          return [
            {
              prompt: prompt.title,
              promptType: prompt.type,
              answer: (answers[`${prompt.id}::0`] || '').trim(),
            },
          ];
        }
        if (prompt.type === 'commitment_table') {
          const rows = prompt.commitmentRows?.length ? prompt.commitmentRows : defaultEvaCommitmentRows();
          const headers = prompt.commitmentHeaders ?? EVA_DEFAULT_COMMITMENT_HEADERS;
          const headerTriple: [string, string, string] = [...headers] as [string, string, string];
          return rows.flatMap((row, ri) => {
            const by = (answers[`${prompt.id}::ct::${ri}::by`] || '').trim();
            const how = (answers[`${prompt.id}::ct::${ri}::how`] || '').trim();
            const rowLabel = copy.rowLabel(ri + 1);
            return [
              {
                prompt: prompt.title,
                promptType: prompt.type,
                tableRow: ri,
                commitmentColumn: 'commitment' as const,
                commitmentHeaders: ri === 0 ? headerTriple : undefined,
                subPrompt: `${headerTriple[0]} · ${rowLabel}`,
                answer: row.commitment.trim() || '—',
              },
              {
                prompt: prompt.title,
                promptType: prompt.type,
                tableRow: ri,
                commitmentColumn: 'by_when' as const,
                subPrompt: `${headerTriple[1]} · ${rowLabel}`,
                answer: by,
              },
              {
                prompt: prompt.title,
                promptType: prompt.type,
                tableRow: ri,
                commitmentColumn: 'how_know' as const,
                subPrompt: `${headerTriple[2]} · ${rowLabel}`,
                answer: how,
              },
            ];
          });
        }
        if (prompt.type === 'fill_sentence') {
          const a = (answers[`${prompt.id}::fs::a`] || '').trim();
          const b = (answers[`${prompt.id}::fs::b`] || '').trim();
          const lead = prompt.fillLeadIn ?? EVA_DEFAULT_FILL_LEAD_IN;
          const bridge = prompt.fillBridge ?? EVA_DEFAULT_FILL_BRIDGE;
          const close = prompt.fillClosing ?? EVA_DEFAULT_FILL_CLOSING;
          return [
            {
              prompt: prompt.title,
              subPrompt: copy.fullSentence,
              promptType: prompt.type,
              answer: `${lead}${a}${bridge}${b}${close}`,
            },
          ];
        }
        return [
          {
            prompt: prompt.title,
            promptType: prompt.type,
            answer: (() => {
              const value = (answers[prompt.id] || '').trim();
              if (prompt.type === 'scored_choice') return value;
              if (prompt.type === 'choice' && isOtherOption(value)) {
                return `${getOtherOptionLabel(value)}: ${getOtherText(prompt.id).trim()}`;
              }
              if (prompt.type === 'multi_choice') {
                const selected = getMultiSelected(prompt.id);
                const mapped = selected.map((item) =>
                  isOtherOption(item) ? `${getOtherOptionLabel(item)}: ${getOtherText(prompt.id).trim()}` : item
                );
                return mapped.join(MULTI_CHOICE_SEP);
              }
              return value;
            })(),
            correctAnswer: prompt.type === 'scored_choice' ? prompt.correctOption || '' : undefined,
            isCorrect:
              prompt.type === 'scored_choice'
                ? (answers[prompt.id] || '').trim() === (prompt.correctOption || '')
                : undefined,
          },
        ];
      }),
      createdAt: new Date().toISOString(),
    };

    let hasSupabaseError = false;
    let savedToSupabase = false;
    if (isSupabaseConfigured) {
      const { error: insertError } = await supabase.from('eva_editor_responses').insert({
        template_id: payload.templateId,
        template_name: payload.templateName,
        answers_json: payload.answers,
        created_at: payload.createdAt,
      });
      if (insertError) {
        hasSupabaseError = true;
        setError(copy.saveFailed);
      } else {
        savedToSupabase = true;
      }
    }

    // เก็บลง local เฉพาะกรณี fallback (เช่น offline / Supabase พลาด) เพื่อไม่ให้นับซ้ำกับข้อมูลจาก Supabase
    if (!savedToSupabase) {
      try {
        const raw = localStorage.getItem(RESPONSE_STORAGE_KEY);
        const current = raw ? JSON.parse(raw) : [];
        const next = Array.isArray(current) ? [payload, ...current] : [payload];
        localStorage.setItem(RESPONSE_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore local cache failures
      }
    }
    if (!hasSupabaseError) {
      setScoreResult(nextScoreResult);
      setSubmitted(true);
    }
  };

  const isTbaTheme = isTbaAmazingRaceEva(templateId) || isTbaAmazingRaceEva(activeTemplate?.id);

  const tbaShell = (children: React.ReactNode, opts?: { heroTitle?: string; heroSub?: string }) => (
    <div
      className="tba-temple-theme tba-eva-form relative min-h-screen overflow-x-hidden selection:bg-[#D4AF37] selection:text-[#1C0A0A]"
      lang={isEnglish ? 'en' : 'th'}
    >
      <div className="tba-temple-bg pointer-events-none fixed inset-0 -z-10" aria-hidden />
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.16]"
        style={{
          backgroundImage: `url(${AYUTTHAYA_ATMOSPHERE})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        aria-hidden
      />
      <div className="tba-temple-pattern pointer-events-none fixed inset-0 -z-10" aria-hidden />
      {opts?.heroTitle ? (
        <section className="tba-eva-hero">
          <img src={AYUTTHAYA_HERO} alt="วัดไชยวัฒนาราม อยุธยา" className="tba-eva-hero-img tba-temple-hero-img" />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(28,10,10,0.55) 0%, rgba(28,10,10,0.35) 40%, rgba(14,6,6,0.96) 100%)',
            }}
            aria-hidden
          />
          <div className="relative z-10 mx-auto flex max-w-4xl flex-col justify-end px-4 pb-8 pt-16 sm:px-6 sm:pb-10 sm:pt-20">
            <div className="tba-temple-rise">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#E8D5A3] sm:text-xs sm:tracking-[0.28em]">
                THAI BEVERAGE CAN LIMITED
              </p>
              <h1 className="mt-2.5 max-w-3xl text-[1.75rem] font-black leading-[1.12] tracking-tight text-[#F7EFE0] drop-shadow-[0_2px_24px_rgba(0,0,0,0.45)] sm:text-4xl md:text-5xl">
                {opts.heroTitle}
              </h1>
              {opts.heroSub ? (
                <p className="mt-2 text-base font-semibold text-[#D4AF37] sm:text-lg">{opts.heroSub}</p>
              ) : null}
            </div>
            <div className="tba-temple-rule mt-7 max-w-md" aria-hidden />
          </div>
        </section>
      ) : null}
      {children}
    </div>
  );

  if (loadingTemplate) {
    if (isTbaAmazingRaceEva(templateId)) {
      return tbaShell(
        <main className="relative z-10 mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <div className="tba-eva-panel tba-temple-rise rounded-2xl p-6">
            <p className="tba-temple-pulse text-[#E8D5A3]">{copy.loading}</p>
          </div>
        </main>
      );
    }
    return (
      <div className="md-page px-6 py-10">
        <div className="max-w-3xl mx-auto rounded-2xl border border-[#D6D4CC] bg-white p-6">
          <p className="text-gray-700">{copy.loading}</p>
        </div>
      </div>
    );
  }

  if (!activeTemplate) {
    if (isTbaAmazingRaceEva(templateId)) {
      return tbaShell(
        <main className="relative z-10 mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <div className="tba-eva-panel rounded-2xl p-6">
            <h1 className="text-2xl font-bold text-[#F7EFE0]">{copy.notFoundTitle}</h1>
            <p className="mt-3 text-[rgba(247,239,224,0.7)]">{copy.notFoundBody}</p>
            <Link to="/" className="tba-temple-btn-gold mt-5 inline-block rounded-xl px-4 py-2.5 font-bold">
              {copy.backHome}
            </Link>
          </div>
        </main>
      );
    }
    return (
      <div className="md-page px-6 py-10">
        <div className="max-w-3xl mx-auto rounded-2xl border border-red-300 bg-red-50 p-6">
          <h1 className="text-2xl font-bold text-red-700">{copy.notFoundTitle}</h1>
          <p className="text-red-800 mt-3">{copy.notFoundBody}</p>
          <Link to="/" className="inline-block mt-5 rounded-lg bg-yellow-400 px-4 py-2 font-semibold text-black hover:bg-yellow-300 transition-colors">
            {copy.backHome}
          </Link>
        </div>
      </div>
    );
  }

  if (submitted) {
    if (isTbaTheme) {
      return tbaShell(
        <main className="relative z-10 mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <div className="tba-eva-submitted tba-temple-rise rounded-2xl p-6 text-center sm:p-8">
            <h1 className="text-2xl font-bold text-[#E8D5A3] sm:text-3xl">{copy.submittedTitle}</h1>
            <p className="mt-3 text-[rgba(247,239,224,0.75)]">{copy.submittedBody}</p>
            {scoreResult && (
              <div className="tba-eva-banner mt-5 rounded-2xl p-5">
                <p className="text-sm text-[#E8D5A3]/80">{copy.yourScore}</p>
                <p className="mt-1 text-3xl font-black text-[#D4AF37]">
                  {scoreResult.score} / {scoreResult.total}
                </p>
                <p className="mt-1 text-sm text-[rgba(247,239,224,0.55)]">{copy.scoreHint}</p>
              </div>
            )}
            <Link to="/" className="tba-temple-btn-gold mt-5 inline-block rounded-xl px-5 py-2.5 font-bold">
              {copy.backHome}
            </Link>
          </div>
        </main>,
        { heroTitle: 'ส่งแบบประเมินแล้ว', heroSub: 'Amazing Race' }
      );
    }
    return (
      <div className="md-page px-6 py-10">
        <div className="max-w-3xl mx-auto rounded-2xl border border-emerald-300 bg-emerald-50 p-6 text-center">
          <h1 className="text-2xl font-bold text-emerald-800">{copy.submittedTitle}</h1>
          <p className="text-emerald-800 mt-3">{copy.submittedBody}</p>
          {scoreResult && (
            <div className="mt-5 rounded-2xl border border-yellow-300 bg-yellow-50 p-5">
              <p className="text-sm text-yellow-900/80">{copy.yourScore}</p>
              <p className="mt-1 text-3xl font-black text-yellow-800">
                {scoreResult.score} / {scoreResult.total}
              </p>
              <p className="mt-1 text-sm text-yellow-900/70">
                {copy.scoreHint}
              </p>
            </div>
          )}
          <Link to="/" className="inline-block mt-5 rounded-lg bg-yellow-400 px-4 py-2 font-semibold text-black hover:bg-yellow-300 transition-colors">
            {copy.backHome}
          </Link>
        </div>
      </div>
    );
  }

  const optionClass = isTbaTheme
    ? 'tba-eva-option flex items-center gap-3 rounded-xl px-3 py-2.5 text-base'
    : 'flex items-center gap-3 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-950 hover:bg-gray-100 transition-colors';
  const fieldClass = isTbaTheme
    ? 'tba-eva-field w-full rounded-xl px-4 py-3 text-base'
    : 'w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-950 placeholder:text-gray-600';
  const promptTitleClass = isTbaTheme
    ? 'text-base md:text-lg font-semibold text-[#F7EFE0] leading-relaxed'
    : 'text-base md:text-lg font-semibold text-gray-950 leading-relaxed';
  const subPromptClass = isTbaTheme
    ? 'text-base font-medium text-[rgba(247,239,224,0.88)]'
    : 'text-base font-medium text-gray-950';
  const ratingBtn = (selected: boolean) =>
    isTbaTheme
      ? `tba-eva-rating w-11 h-11 md:w-12 md:h-12 rounded-xl text-base font-bold ${selected ? 'is-selected' : ''}`
      : `w-11 h-11 md:w-12 md:h-12 rounded-xl border text-base font-bold transition-colors ${
          selected
            ? 'border-yellow-600 bg-yellow-300 text-gray-950'
            : 'border-gray-300 bg-white text-gray-900 hover:bg-gray-100'
        }`;

  const formBody = (
    <main
      className={
        isTbaTheme
          ? 'relative z-10 mx-auto w-full max-w-4xl px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pb-10 sm:pt-6'
          : 'max-w-4xl mx-auto px-6 py-10'
      }
    >
      <div
        className={
          isTbaTheme
            ? 'tba-eva-panel tba-temple-rise-delay rounded-2xl p-4 sm:p-6 md:p-8'
            : 'rounded-2xl border border-[#D6D4CC] bg-white p-6 md:p-8'
        }
      >
        <div
          className={
            isTbaTheme
              ? 'tba-eva-banner mb-6 rounded-2xl p-4 md:p-5'
              : 'mb-6 rounded-2xl border border-yellow-400 bg-yellow-50 p-4 md:p-5'
          }
        >
          {translatingContent ? (
            <p className={`mb-3 text-xs ${isTbaTheme ? 'text-[#E8D5A3]' : 'text-yellow-800'}`}>{copy.translating}</p>
          ) : null}
          {!isTbaTheme && activeTemplate.heading?.trim() && (
            <h1
              title={activeTemplate.heading}
              className="text-2xl md:text-4xl font-black text-gray-900 leading-tight break-words [overflow-wrap:anywhere] mb-3"
            >
              {activeTemplate.heading}
            </h1>
          )}
          <p
            className={`text-xs md:text-sm uppercase tracking-[0.14em] ${
              isTbaTheme ? 'text-[#D4AF37]' : 'text-yellow-800'
            } ${activeTemplate.name?.trim() ? 'mb-2' : 'mb-0'}`}
          >
            {isTbaTheme ? 'THAI BEVERAGE CAN LIMITED' : copy.formKicker}
          </p>
          {activeTemplate.name?.trim() && (
            <p
              title={activeTemplate.name}
              className={`leading-relaxed break-words [overflow-wrap:anywhere] ${
                isTbaTheme ? 'text-[#E8D5A3] text-lg md:text-xl font-semibold' : 'text-yellow-900'
              } ${
                !isTbaTheme
                  ? activeTemplate.heading?.trim()
                    ? 'text-lg md:text-xl font-semibold'
                    : 'text-xl md:text-3xl font-bold'
                  : ''
              }`}
            >
              {activeTemplate.name}
            </p>
          )}
          {activeTemplate.description?.trim() && (
            <p
              className={`text-base md:text-lg mt-3 leading-relaxed whitespace-pre-line ${
                isTbaTheme ? 'text-[rgba(247,239,224,0.78)]' : 'text-gray-800'
              }`}
            >
              {activeTemplate.description}
            </p>
          )}
        </div>
        <form onSubmit={submit} className="space-y-7 md:space-y-8">
          {(() => {
            let displayOrdinal = 0;
            return activeTemplate.prompts.map((prompt) => {
              if (prompt.type === 'description') {
                const visibleLines = getVisibleDescriptionLines(prompt);
                if (visibleLines.length === 0) return null;
                return (
                  <div
                    key={`${activeTemplate.id}-${prompt.id}`}
                    className={
                      isTbaTheme
                        ? 'tba-eva-desc rounded-xl px-4 py-3 md:px-5 md:py-4'
                        : 'rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 md:px-5 md:py-4'
                    }
                  >
                    <div className={evaDescriptionBlockClassName(prompt)}>
                      {visibleLines.map((line, lineIdx) => (
                        <p
                          key={`${prompt.id}-dl-${lineIdx}`}
                          className={`${evaDescriptionLineClassName(line.style)} [overflow-wrap:anywhere] ${
                            isTbaTheme
                              ? line.style === 'bold'
                                ? '!text-[#E8D5A3]'
                                : '!text-[rgba(247,239,224,0.82)]'
                              : ''
                          }`}
                        >
                          {line.text}
                        </p>
                      ))}
                    </div>
                  </div>
                );
              }
              const titleVisible = Boolean(prompt.title.trim());
              const style = getPromptNumberStyle(prompt);
              let prefix = '';
              if (style === 'auto' && titleVisible) {
                displayOrdinal += 1;
                prefix = `${displayOrdinal}. `;
              } else if (style === 'none') {
                prefix = '';
              } else if (titleVisible) {
                prefix = prompt.fixedNumberPrefix ?? '';
              }
              return (
                <div
                  key={`${activeTemplate.id}-${prompt.id}`}
                  className="block space-y-3"
                  ref={(el) => {
                    promptRefs.current[prompt.id] = el;
                  }}
                >
                  {titleVisible && (
                    <p className={promptTitleClass}>
                      {prefix}
                      {prompt.title}
                    </p>
                  )}
                  {prompt.type === 'choice' || prompt.type === 'scored_choice' ? (
                    <div className="space-y-2.5">
                      {(prompt.options || []).map((option) => (
                        <label key={`${prompt.id}-${option}`} className={optionClass}>
                          <input
                            type="radio"
                            name={`q-${prompt.id}`}
                            value={option}
                            checked={(answers[prompt.id] || '') === option}
                            onChange={(e) => setAnswers((prev) => ({ ...prev, [prompt.id]: e.target.value }))}
                            className="h-5 w-5 shrink-0 accent-yellow-500"
                          />
                          <span>{isOtherOption(option) ? getOtherOptionLabel(option) : option}</span>
                        </label>
                      ))}
                      {isOtherOption(answers[prompt.id] || '') && (
                        <input
                          value={getOtherText(prompt.id)}
                          onChange={(e) =>
                            setAnswers((prev) => ({
                              ...prev,
                              [`${prompt.id}${OTHER_TEXT_KEY_SUFFIX}`]: e.target.value,
                            }))
                          }
                          placeholder={copy.pleaseSpecify}
                          className={fieldClass}
                        />
                      )}
                    </div>
                  ) : prompt.type === 'multi_choice' ? (
                    <div className="space-y-2.5">
                      {(prompt.options || []).map((option) => {
                        const checked = getMultiSelected(prompt.id).includes(option);
                        return (
                          <label key={`${prompt.id}-${option}`} className={optionClass}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleMultiSelected(prompt.id, option)}
                              className="h-5 w-5 shrink-0 accent-yellow-500"
                            />
                            <span>{isOtherOption(option) ? getOtherOptionLabel(option) : option}</span>
                          </label>
                        );
                      })}
                      {getMultiSelected(prompt.id).some((item) => isOtherOption(item)) && (
                        <input
                          value={getOtherText(prompt.id)}
                          onChange={(e) =>
                            setAnswers((prev) => ({
                              ...prev,
                              [`${prompt.id}${OTHER_TEXT_KEY_SUFFIX}`]: e.target.value,
                            }))
                          }
                          placeholder={copy.pleaseSpecify}
                          className={fieldClass}
                        />
                      )}
                    </div>
                  ) : prompt.type === 'rating_1_5' ? (
                    <div className="space-y-4">
                      {getEvaRatingSubItems(prompt).length > 0 ? (
                        getEvaRatingSubItems(prompt).map((subItem, itemIdx) => (
                          <div key={`${prompt.id}-rating-${itemIdx}`} className="space-y-2.5">
                            <p className={subPromptClass}>
                              {formatEvaRatingSubItemPrefix(subItem, itemIdx)}
                              {subItem.text}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {[1, 2, 3, 4, 5].map((n) => {
                                const selected = (answers[`${prompt.id}::${itemIdx}`] || '') === String(n);
                                return (
                                  <button
                                    key={n}
                                    type="button"
                                    onClick={() =>
                                      setAnswers((prev) => ({
                                        ...prev,
                                        [`${prompt.id}::${itemIdx}`]: String(n),
                                      }))
                                    }
                                    className={ratingBtn(selected)}
                                  >
                                    {n}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {[1, 2, 3, 4, 5].map((n) => {
                            const selected = (answers[`${prompt.id}::0`] || '') === String(n);
                            return (
                              <button
                                key={n}
                                type="button"
                                onClick={() =>
                                  setAnswers((prev) => ({ ...prev, [`${prompt.id}::0`]: String(n) }))
                                }
                                className={ratingBtn(selected)}
                              >
                                {n}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : prompt.type === 'commitment_table' ? (
                    <div className="space-y-3">
                      <div
                        className={
                          isTbaTheme
                            ? 'overflow-x-auto rounded-xl border border-[#D4AF37]/28 bg-[#140808]/55'
                            : 'overflow-x-auto rounded-xl border border-[#D6D4CC] bg-gray-50'
                        }
                      >
                        <table className="w-full min-w-[520px] text-left text-sm">
                          <thead>
                            <tr
                              className={
                                isTbaTheme
                                  ? 'border-b border-[#D4AF37]/25 bg-[#1C0A0A]/60'
                                  : 'border-b border-[#D6D4CC] bg-gray-50'
                              }
                            >
                              {(prompt.commitmentHeaders ?? EVA_DEFAULT_COMMITMENT_HEADERS).map((h) => (
                                <th
                                  key={h}
                                  className={`px-3 py-2.5 font-bold whitespace-nowrap ${
                                    isTbaTheme ? 'text-[#E8D5A3]' : 'text-gray-950'
                                  }`}
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {(prompt.commitmentRows?.length
                              ? prompt.commitmentRows
                              : defaultEvaCommitmentRows()
                            ).map((row, ri) => (
                              <tr
                                key={`${prompt.id}-ct-${ri}`}
                                className={
                                  isTbaTheme
                                    ? 'border-b border-[#D4AF37]/15 last:border-0'
                                    : 'border-b border-gray-200 last:border-0'
                                }
                              >
                                <td
                                  className={`px-3 py-3 align-top max-w-[14rem] sm:max-w-xs leading-snug ${
                                    isTbaTheme ? 'text-[#F7EFE0]' : 'text-gray-950'
                                  }`}
                                >
                                  {row.commitment}
                                </td>
                                <td className="px-3 py-2 align-top">
                                  <EvaAnswerHoverPopover
                                    text={answers[`${prompt.id}::ct::${ri}::by`] || ''}
                                    className="block w-full"
                                  >
                                    <input
                                      type="text"
                                      value={answers[`${prompt.id}::ct::${ri}::by`] || ''}
                                      onChange={(e) =>
                                        setAnswers((prev) => ({
                                          ...prev,
                                          [`${prompt.id}::ct::${ri}::by`]: e.target.value,
                                        }))
                                      }
                                      placeholder={row.byWhenPlaceholder || copy.enterPlaceholder}
                                      className={
                                        isTbaTheme
                                          ? 'tba-eva-field w-full min-w-[8rem] rounded-lg px-3 py-2 text-base'
                                          : 'w-full min-w-[8rem] rounded-lg border border-gray-300 bg-white px-3 py-2 text-base text-gray-950 placeholder:text-gray-600'
                                      }
                                    />
                                  </EvaAnswerHoverPopover>
                                </td>
                                <td className="px-3 py-2 align-top">
                                  <EvaAnswerHoverPopover
                                    text={answers[`${prompt.id}::ct::${ri}::how`] || ''}
                                    className="block w-full"
                                  >
                                    <input
                                      type="text"
                                      value={answers[`${prompt.id}::ct::${ri}::how`] || ''}
                                      onChange={(e) =>
                                        setAnswers((prev) => ({
                                          ...prev,
                                          [`${prompt.id}::ct::${ri}::how`]: e.target.value,
                                        }))
                                      }
                                      placeholder={row.howKnowPlaceholder || copy.enterPlaceholder}
                                      className={
                                        isTbaTheme
                                          ? 'tba-eva-field w-full min-w-[10rem] rounded-lg px-3 py-2 text-base'
                                          : 'w-full min-w-[10rem] rounded-lg border border-gray-300 bg-white px-3 py-2 text-base text-gray-950 placeholder:text-gray-600'
                                      }
                                    />
                                  </EvaAnswerHoverPopover>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : prompt.type === 'fill_sentence' ? (
                    <div
                      className={
                        isTbaTheme
                          ? 'tba-eva-desc space-y-4 rounded-xl p-4 md:p-5'
                          : 'space-y-4 rounded-xl border border-[#D6D4CC] bg-white p-4 md:p-5'
                      }
                    >
                      <p
                        className={`text-sm md:text-base font-bold tracking-wide uppercase ${
                          isTbaTheme ? 'text-[#D4AF37]' : 'text-sky-900'
                        }`}
                      >
                        {prompt.fillIntroEn ?? EVA_DEFAULT_FILL_INTRO_EN}
                      </p>
                      {!isEnglish && (
                        <p
                          className={`text-base md:text-lg font-medium ${
                            isTbaTheme ? 'text-[#F7EFE0]' : 'text-gray-950'
                          }`}
                        >
                          {prompt.fillIntroTh ?? EVA_DEFAULT_FILL_INTRO_TH}
                        </p>
                      )}
                      <div className="max-w-full">
                        <div
                          className={`flex max-w-full flex-wrap content-start items-baseline gap-x-1 gap-y-1.5 text-base md:text-lg leading-relaxed ${
                            isTbaTheme ? 'text-[#F7EFE0]' : 'text-gray-950'
                          }`}
                        >
                          <span
                            className={`shrink-0 translate-y-px select-none ${
                              isTbaTheme ? 'text-[#E8D5A3]/70' : 'text-gray-700'
                            }`}
                            aria-hidden
                          >
                            &ldquo;
                          </span>
                          <span className="min-w-0 max-w-full shrink translate-y-px break-words">
                            {prompt.fillLeadIn ?? EVA_DEFAULT_FILL_LEAD_IN}
                          </span>
                          <textarea
                            rows={1}
                            value={answers[`${prompt.id}::fs::a`] || ''}
                            onChange={(e) =>
                              setAnswers((prev) => ({ ...prev, [`${prompt.id}::fs::a`]: e.target.value }))
                            }
                            style={{
                              width: `${Math.max(14, (answers[`${prompt.id}::fs::a`] || '').length + 2)}ch`,
                              maxWidth: '100%',
                            }}
                            className={`box-border min-h-[1.6em] min-w-[10ch] max-w-full shrink-0 resize-y self-baseline border-0 border-b-2 bg-transparent px-0.5 pb-0.5 pt-0 leading-relaxed break-words [field-sizing:content] focus:outline-none ${
                              isTbaTheme
                                ? 'border-[#D4AF37] text-[#F7EFE0] focus:border-[#E8D5A3]'
                                : 'border-yellow-600 text-gray-950 focus:border-yellow-700'
                            }`}
                          />
                          <span className="min-w-0 max-w-full shrink translate-y-px break-words">
                            {prompt.fillBridge ?? EVA_DEFAULT_FILL_BRIDGE}
                          </span>
                          <textarea
                            rows={1}
                            value={answers[`${prompt.id}::fs::b`] || ''}
                            onChange={(e) =>
                              setAnswers((prev) => ({ ...prev, [`${prompt.id}::fs::b`]: e.target.value }))
                            }
                            style={{
                              width: `${Math.max(14, (answers[`${prompt.id}::fs::b`] || '').length + 2)}ch`,
                              maxWidth: '100%',
                            }}
                            className={`box-border min-h-[1.6em] min-w-[10ch] max-w-full shrink-0 resize-y self-baseline border-0 border-b-2 bg-transparent px-0.5 pb-0.5 pt-0 leading-relaxed break-words [field-sizing:content] focus:outline-none ${
                              isTbaTheme
                                ? 'border-[#D4AF37] text-[#F7EFE0] focus:border-[#E8D5A3]'
                                : 'border-yellow-600 text-gray-950 focus:border-yellow-700'
                            }`}
                          />
                          <span className="min-w-0 max-w-full shrink translate-y-px break-words">
                            {prompt.fillClosing ?? EVA_DEFAULT_FILL_CLOSING}
                          </span>
                          <span
                            className={`shrink-0 translate-y-px select-none ${
                              isTbaTheme ? 'text-[#E8D5A3]/70' : 'text-gray-700'
                            }`}
                            aria-hidden
                          >
                            &rdquo;
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <textarea
                      rows={4}
                      value={answers[prompt.id] || ''}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [prompt.id]: e.target.value }))}
                      className={`${fieldClass} leading-relaxed resize-y`}
                    />
                  )}
                  {missingPromptIds.includes(prompt.id) && (
                    <p className={`text-sm ${isTbaTheme ? 'text-red-300' : 'text-red-700'}`}>{copy.pleaseAnswer}</p>
                  )}
                </div>
              );
            });
          })()}
          {error && <p className={`text-base ${isTbaTheme ? 'text-red-300' : 'text-red-700'}`}>{error}</p>}
          <div className={isTbaTheme ? 'tba-temple-sticky-cta -mx-4 px-4 pt-3 sm:static sm:mx-0 sm:bg-transparent sm:p-0' : ''}>
            <button
              type="submit"
              className={
                isTbaTheme
                  ? 'tba-temple-btn-gold min-h-[3.25rem] w-full rounded-xl px-6 py-3.5 text-base md:text-lg font-bold sm:w-auto'
                  : 'rounded-xl bg-yellow-400 px-6 py-3 text-base md:text-lg font-semibold text-black hover:bg-yellow-300 transition-colors'
              }
            >
              {copy.submit}
            </button>
          </div>
        </form>
      </div>
    </main>
  );

  if (isTbaTheme) {
    return tbaShell(formBody, {
      heroTitle: activeTemplate.heading?.trim() || 'แบบประเมินทีม',
      heroSub: 'Amazing Race',
    });
  }

  return (
    <div className="md-page" lang={isEnglish ? 'en' : 'th'}>
      {formBody}
    </div>
  );
};

export default EvaPublicFormPage;
