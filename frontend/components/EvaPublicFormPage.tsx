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
  getEvaRatingAnswerKeys,
  getEvaRatingSubItems,
  isEvaPromptRequiredForAnswer,
  getPromptNumberStyle,
  loadStoredEvaTemplates,
  type EvaEvaluationTemplate,
} from '../lib/evaTemplates';
import { fetchEvaEditorTemplatesFromSupabase } from '../lib/evaSupabaseTemplates';
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
  const [loadingTemplate, setLoadingTemplate] = useState(true);
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
        setError(
          /does not exist|could not find the table/i.test(loadError)
            ? 'ยังไม่พบตาราง eva_editor_templates ใน Supabase'
            : `โหลดแบบประเมินจาก Supabase ไม่สำเร็จ (${loadError})`
        );
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
      document.title = 'MindDoJo';
      return () => {
        document.title = 'MindDoJo';
      };
    }
    document.title = `${template.name} | MindDoJo`;
    return () => {
      document.title = 'MindDoJo';
    };
  }, [template]);

  const canSubmit = useMemo(() => {
    if (!template) return false;
    return template.prompts.every((prompt) => {
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
  }, [template, answers]);

  const getMissingPromptIds = (): string[] => {
    if (!template) return [];
    return template.prompts
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
    if (!template) return;
    if (!canSubmit) {
      const missingIds = getMissingPromptIds();
      setMissingPromptIds(missingIds);
      const firstMissingId = missingIds[0];
      if (firstMissingId) {
        const targetEl = promptRefs.current[firstMissingId];
        targetEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setError('กรุณาตอบคำถามให้ครบทุกข้อ');
      return;
    }
    setError(null);
    setMissingPromptIds([]);
    const scoredPrompts = template.prompts.filter((prompt) => prompt.type === 'scored_choice');
    const nextScoreResult =
      scoredPrompts.length > 0
        ? {
            score: scoredPrompts.filter((prompt) => (answers[prompt.id] || '').trim() === (prompt.correctOption || '')).length,
            total: scoredPrompts.length,
          }
        : null;
    const payload = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      templateId: template.id,
      templateName: template.name,
      answers: template.prompts.flatMap((prompt) => {
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
            const rowLabel = `แถว ${ri + 1}`;
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
              subPrompt: 'ประโยคเต็ม (รวมเทมเพลต)',
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
        setError(
          /does not exist|could not find the table/i.test(insertError.message || '')
            ? 'ยังไม่พบตาราง eva_editor_responses ใน Supabase'
            : `บันทึกคำตอบลง Supabase ไม่สำเร็จ (${insertError.message})`
        );
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

  if (loadingTemplate) {
    return (
      <div className="min-h-screen bg-transparent text-white bg-grid px-6 py-10">
        <div className="max-w-3xl mx-auto rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-gray-300">กำลังโหลดแบบประเมิน...</p>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-transparent text-white bg-grid px-6 py-10">
        <div className="max-w-3xl mx-auto rounded-2xl border border-red-400/30 bg-red-500/10 p-6">
          <h1 className="text-2xl font-bold text-red-200">ไม่พบแบบประเมิน</h1>
          <p className="text-red-100/90 mt-3">ลิงก์นี้อาจไม่ถูกต้อง หรือแบบประเมินถูกลบไปแล้ว</p>
          <Link to="/" className="inline-block mt-5 rounded-lg bg-yellow-400 px-4 py-2 font-semibold text-black hover:bg-yellow-300 transition-colors">
            กลับหน้าหลัก
          </Link>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-transparent text-white bg-grid px-6 py-10">
        <div className="max-w-3xl mx-auto rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-6 text-center">
          <h1 className="text-2xl font-bold text-emerald-200">ส่งคำตอบเรียบร้อย</h1>
          <p className="text-emerald-100/90 mt-3">ขอบคุณสำหรับการทำแบบประเมิน</p>
          {scoreResult && (
            <div className="mt-5 rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-5">
              <p className="text-sm text-yellow-100/80">คะแนนของคุณ</p>
              <p className="mt-1 text-3xl font-black text-yellow-300">
                {scoreResult.score} / {scoreResult.total}
              </p>
              <p className="mt-1 text-sm text-yellow-100/70">
                คิดจากข้อที่เป็นช้อยส์แบบมีคำตอบถูก
              </p>
            </div>
          )}
          <Link to="/" className="inline-block mt-5 rounded-lg bg-yellow-400 px-4 py-2 font-semibold text-black hover:bg-yellow-300 transition-colors">
            กลับหน้าหลัก
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-white bg-grid">
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
          <div className="mb-6 rounded-2xl border border-yellow-300/20 bg-gradient-to-br from-yellow-400/10 via-amber-300/5 to-transparent p-4 md:p-5">
            {template.heading?.trim() && (
              <h1
                title={template.heading}
                className="text-2xl md:text-4xl font-black text-white leading-tight break-words [overflow-wrap:anywhere] mb-3"
              >
                {template.heading}
              </h1>
            )}
            <p
              className={`text-xs md:text-sm uppercase tracking-[0.14em] text-yellow-200/75 ${
                template.name?.trim() ? 'mb-2' : 'mb-0'
              }`}
            >
              แบบประเมิน
            </p>
            {template.name?.trim() && (
              <p
                title={template.name}
                className={`leading-relaxed break-words [overflow-wrap:anywhere] text-yellow-100 ${
                  template.heading?.trim()
                    ? 'text-lg md:text-xl font-semibold'
                    : 'text-xl md:text-3xl font-bold'
                }`}
              >
                {template.name}
              </p>
            )}
            {template.description?.trim() && (
              <p className="text-gray-300/90 text-base md:text-lg mt-3 leading-relaxed whitespace-pre-line">
                {template.description}
              </p>
            )}
          </div>
          <form onSubmit={submit} className="space-y-7 md:space-y-8">
            {(() => {
              let displayOrdinal = 0;
              return template.prompts.map((prompt) => {
                if (prompt.type === 'description') {
                  const visibleLines = getVisibleDescriptionLines(prompt);
                  if (visibleLines.length === 0) return null;
                  return (
                    <div
                      key={`${template.id}-${prompt.id}`}
                      className="rounded-xl border border-amber-300/25 bg-amber-500/[0.07] px-4 py-3 md:px-5 md:py-4"
                    >
                      <div className={evaDescriptionBlockClassName(prompt)}>
                        {visibleLines.map((line, lineIdx) => (
                          <p
                            key={`${prompt.id}-dl-${lineIdx}`}
                            className={`${evaDescriptionLineClassName(line.style)} [overflow-wrap:anywhere]`}
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
                    key={`${template.id}-${prompt.id}`}
                    className="block space-y-3"
                    ref={(el) => {
                      promptRefs.current[prompt.id] = el;
                    }}
                  >
                    {titleVisible && (
                      <p className="text-base md:text-lg font-medium text-gray-100 leading-relaxed">
                        {prefix}
                        {prompt.title}
                      </p>
                    )}
                    {prompt.type === 'choice' || prompt.type === 'scored_choice' ? (
                  <div className="space-y-2.5">
                    {(prompt.options || []).map((option) => (
                      <label
                        key={`${prompt.id}-${option}`}
                        className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-base text-gray-100 hover:bg-white/10 transition-colors"
                      >
                        <input
                          type="radio"
                          name={`q-${prompt.id}`}
                          value={option}
                          checked={(answers[prompt.id] || '') === option}
                          onChange={(e) => setAnswers((prev) => ({ ...prev, [prompt.id]: e.target.value }))}
                        />
                        <span>{isOtherOption(option) ? getOtherOptionLabel(option) : option}</span>
                      </label>
                    ))}
                    {isOtherOption(answers[prompt.id] || '') && (
                      <input
                        value={getOtherText(prompt.id)}
                        onChange={(e) =>
                          setAnswers((prev) => ({ ...prev, [`${prompt.id}${OTHER_TEXT_KEY_SUFFIX}`]: e.target.value }))
                        }
                        placeholder="โปรดระบุ..."
                        className="w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-base"
                      />
                    )}
                  </div>
                ) : prompt.type === 'multi_choice' ? (
                  <div className="space-y-2.5">
                    {(prompt.options || []).map((option) => {
                      const checked = getMultiSelected(prompt.id).includes(option);
                      return (
                        <label
                          key={`${prompt.id}-${option}`}
                          className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-base text-gray-100 hover:bg-white/10 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleMultiSelected(prompt.id, option)}
                          />
                          <span>{isOtherOption(option) ? getOtherOptionLabel(option) : option}</span>
                        </label>
                      );
                    })}
                    {getMultiSelected(prompt.id).some((item) => isOtherOption(item)) && (
                      <input
                        value={getOtherText(prompt.id)}
                        onChange={(e) =>
                          setAnswers((prev) => ({ ...prev, [`${prompt.id}${OTHER_TEXT_KEY_SUFFIX}`]: e.target.value }))
                        }
                        placeholder="โปรดระบุ..."
                        className="w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-base"
                      />
                    )}
                  </div>
                ) : prompt.type === 'rating_1_5' ? (
                  <div className="space-y-4">
                    {getEvaRatingSubItems(prompt).length > 0 ? (
                      getEvaRatingSubItems(prompt).map((subItem, itemIdx) => (
                        <div key={`${prompt.id}-rating-${itemIdx}`} className="space-y-2.5">
                          <p className="text-base text-gray-200">
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
                                    setAnswers((prev) => ({ ...prev, [`${prompt.id}::${itemIdx}`]: String(n) }))
                                  }
                                  className={`w-11 h-11 md:w-12 md:h-12 rounded-xl border text-base font-semibold transition-colors ${
                                    selected
                                      ? 'border-yellow-300 bg-yellow-400/20 text-yellow-100'
                                      : 'border-white/20 bg-black/30 text-gray-200 hover:bg-white/10'
                                  }`}
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
                              className={`w-11 h-11 md:w-12 md:h-12 rounded-xl border text-base font-semibold transition-colors ${
                                selected
                                  ? 'border-yellow-300 bg-yellow-400/20 text-yellow-100'
                                  : 'border-white/20 bg-black/30 text-gray-200 hover:bg-white/10'
                              }`}
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
                    <div className="overflow-x-auto rounded-xl border border-white/12 bg-black/25">
                      <table className="w-full min-w-[520px] text-left text-sm">
                        <thead>
                          <tr className="border-b border-white/10 bg-white/[0.06]">
                            {(prompt.commitmentHeaders ?? EVA_DEFAULT_COMMITMENT_HEADERS).map((h) => (
                              <th key={h} className="px-3 py-2.5 font-semibold text-yellow-200/90 whitespace-nowrap">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(prompt.commitmentRows?.length ? prompt.commitmentRows : defaultEvaCommitmentRows()).map(
                            (row, ri) => (
                              <tr key={`${prompt.id}-ct-${ri}`} className="border-b border-white/8 last:border-0">
                                <td className="px-3 py-3 text-gray-200 align-top max-w-[14rem] sm:max-w-xs leading-snug">
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
                                      placeholder={row.byWhenPlaceholder || 'ระบุ...'}
                                      className="w-full min-w-[8rem] rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-base"
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
                                      placeholder={row.howKnowPlaceholder || 'ระบุ...'}
                                      className="w-full min-w-[10rem] rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-base"
                                    />
                                  </EvaAnswerHoverPopover>
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : prompt.type === 'fill_sentence' ? (
                  <div className="space-y-4 rounded-xl border border-white/12 bg-black/20 p-4 md:p-5">
                    <p className="text-sm md:text-base font-semibold text-sky-200/95 tracking-wide uppercase">
                      {prompt.fillIntroEn ?? EVA_DEFAULT_FILL_INTRO_EN}
                    </p>
                    <p className="text-base md:text-lg text-gray-200">{prompt.fillIntroTh ?? EVA_DEFAULT_FILL_INTRO_TH}</p>
                    <div className="max-w-full">
                      <div className="flex max-w-full flex-wrap content-start items-baseline gap-x-1 gap-y-1.5 text-base md:text-lg leading-relaxed text-gray-100">
                        <span className="shrink-0 translate-y-px text-gray-400 select-none" aria-hidden>
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
                          className="box-border min-h-[1.6em] min-w-[10ch] max-w-full shrink-0 resize-y self-baseline border-0 border-b-2 border-yellow-400/50 bg-transparent px-0.5 pb-0.5 pt-0 leading-relaxed text-white break-words [field-sizing:content] focus:border-yellow-300 focus:outline-none"
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
                          className="box-border min-h-[1.6em] min-w-[10ch] max-w-full shrink-0 resize-y self-baseline border-0 border-b-2 border-yellow-400/50 bg-transparent px-0.5 pb-0.5 pt-0 leading-relaxed text-white break-words [field-sizing:content] focus:border-yellow-300 focus:outline-none"
                        />
                        <span className="min-w-0 max-w-full shrink translate-y-px break-words">
                          {prompt.fillClosing ?? EVA_DEFAULT_FILL_CLOSING}
                        </span>
                        <span className="shrink-0 translate-y-px text-gray-400 select-none" aria-hidden>
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
                    className="w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-base leading-relaxed resize-y"
                  />
                )}
                {missingPromptIds.includes(prompt.id) && (
                  <p className="text-sm text-red-300">กรุณาตอบคำถาม</p>
                )}
              </div>
                );
              });
            })()}
            {error && <p className="text-base text-red-300">{error}</p>}
            <button
              type="submit"
              className="rounded-xl bg-yellow-400 px-6 py-3 text-base md:text-lg font-semibold text-black hover:bg-yellow-300 transition-colors"
            >
              ส่งแบบประเมิน
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default EvaPublicFormPage;
