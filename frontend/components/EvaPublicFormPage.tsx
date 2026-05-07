import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { findEvaTemplateByRouteId, loadStoredEvaTemplates, type EvaEvaluationTemplate } from '../lib/evaTemplates';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTemplate = async () => {
      setLoadingTemplate(true);
      const localTemplates = loadStoredEvaTemplates();
      if (!isSupabaseConfigured) {
        setTemplate(findEvaTemplateByRouteId(localTemplates, templateId));
        setLoadingTemplate(false);
        return;
      }
      const { data, error: loadError } = await supabase
        .from('eva_editor_templates')
        .select('id, name, prompts_json, updated_at')
        .order('updated_at', { ascending: false });
      if (loadError) {
        setTemplate(findEvaTemplateByRouteId(localTemplates, templateId));
        setError(
          /does not exist|could not find the table/i.test(loadError.message || '')
            ? 'ยังไม่พบตาราง eva_editor_templates ใน Supabase'
            : `โหลดแบบประเมินจาก Supabase ไม่สำเร็จ (${loadError.message})`
        );
        setLoadingTemplate(false);
        return;
      }
      const remoteTemplates: EvaEvaluationTemplate[] = (data || []).map((row) => ({
        id: row.id as string,
        name: row.name as string,
        prompts: Array.isArray(row.prompts_json) ? (row.prompts_json as EvaEvaluationTemplate['prompts']) : [],
        updatedAt: (row.updated_at as string) || new Date().toISOString(),
      }));
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
      const value = (answers[prompt.id] || '').trim();
      if (prompt.type === 'rating_1_5') {
        const items = prompt.ratingItems && prompt.ratingItems.length > 0 ? prompt.ratingItems : [prompt.title];
        return items.every((_, itemIdx) => {
          const subValue = (answers[`${prompt.id}::${itemIdx}`] || '').trim();
          return ['1', '2', '3', '4', '5'].includes(subValue);
        });
      }
      if (prompt.type === 'choice') return value.length > 0;
      if (prompt.type === 'choice') {
        if (isOtherOption(value)) return getOtherText(prompt.id).trim().length > 0;
        return value.length > 0;
      }
      if (prompt.type === 'multi_choice') {
        const selected = getMultiSelected(prompt.id);
        if (selected.length === 0) return false;
        if (selected.some((item) => isOtherOption(item))) return getOtherText(prompt.id).trim().length > 0;
        return true;
      }
      return value.length > 0;
    });
  }, [template, answers]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!template) return;
    if (!canSubmit) {
      setError('กรุณาตอบทุกข้อก่อนส่ง');
      return;
    }
    setError(null);
    const payload = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      templateId: template.id,
      templateName: template.name,
      answers: template.prompts.flatMap((prompt) => {
        if (prompt.type === 'rating_1_5') {
          const items = prompt.ratingItems && prompt.ratingItems.length > 0 ? prompt.ratingItems : [prompt.title];
          return items.map((itemTitle, itemIdx) => ({
            prompt: prompt.title,
            subPrompt: itemTitle,
            promptType: prompt.type,
            answer: (answers[`${prompt.id}::${itemIdx}`] || '').trim(),
          }));
        }
        return [{
          prompt: prompt.title,
          promptType: prompt.type,
          answer: (() => {
            const value = (answers[prompt.id] || '').trim();
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
        }];
      }),
      createdAt: new Date().toISOString(),
    };

    let hasSupabaseError = false;
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
      }
    }

    try {
      const raw = localStorage.getItem(RESPONSE_STORAGE_KEY);
      const current = raw ? JSON.parse(raw) : [];
      const next = Array.isArray(current) ? [payload, ...current] : [payload];
      localStorage.setItem(RESPONSE_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore local cache failures
    }
    if (!hasSupabaseError) setSubmitted(true);
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
          <h1 className="text-2xl md:text-3xl font-bold text-yellow-200 mb-2">{template.name}</h1>
          <p className="text-gray-400 mb-6">กรุณาตอบคำถามให้ครบทุกข้อ</p>
          <form onSubmit={submit} className="space-y-5">
            {template.prompts.map((prompt, idx) => (
              <div key={`${template.id}-${idx}`} className="block space-y-2">
                <p className="text-sm text-gray-200">{idx + 1}. {prompt.title}</p>
                {prompt.type === 'choice' ? (
                  <div className="space-y-2">
                    {(prompt.options || []).map((option) => (
                      <label key={`${prompt.id}-${option}`} className="flex items-center gap-2 text-sm text-gray-200">
                        <input
                          type="radio"
                          name={`q-${idx}`}
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
                        className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
                      />
                    )}
                  </div>
                ) : prompt.type === 'multi_choice' ? (
                  <div className="space-y-2">
                    {(prompt.options || []).map((option) => {
                      const checked = getMultiSelected(prompt.id).includes(option);
                      return (
                        <label key={`${prompt.id}-${option}`} className="flex items-center gap-2 text-sm text-gray-200">
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
                        className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
                      />
                    )}
                  </div>
                ) : prompt.type === 'rating_1_5' ? (
                  <div className="space-y-3">
                    {(prompt.ratingItems && prompt.ratingItems.length > 0 ? prompt.ratingItems : [prompt.title]).map((itemTitle, itemIdx) => (
                      <div key={`${prompt.id}-rating-${itemIdx}`} className="space-y-2">
                        <p className="text-sm text-gray-300">{itemIdx + 1}. {itemTitle}</p>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map((n) => {
                            const selected = (answers[`${prompt.id}::${itemIdx}`] || '') === String(n);
                            return (
                              <button
                                key={n}
                                type="button"
                                onClick={() =>
                                  setAnswers((prev) => ({ ...prev, [`${prompt.id}::${itemIdx}`]: String(n) }))
                                }
                                className={`w-10 h-10 rounded-lg border text-sm font-semibold transition-colors ${
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
                    ))}
                  </div>
                ) : (
                  <textarea
                    rows={4}
                    value={answers[prompt.id] || ''}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [prompt.id]: e.target.value }))}
                    className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 resize-y"
                  />
                )}
              </div>
            ))}
            {error && <p className="text-sm text-red-300">{error}</p>}
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-lg bg-yellow-400 px-5 py-2.5 font-semibold text-black hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
