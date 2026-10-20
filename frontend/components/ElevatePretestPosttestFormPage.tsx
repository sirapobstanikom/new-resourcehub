import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  findElevateBankById,
  gradeElevateAnswers,
  isElevateTestPhase,
  loadStoredElevateBanks,
  newElevateId,
  saveElevateBanksToStorage,
  saveElevateResponseLocal,
  type ElevateTestBank,
  type ElevateTestPhase,
  type ElevateTestResponse,
} from '../lib/elevatePretestPosttest';
import {
  ensureElevateBankExistsOnSupabase,
  fetchElevateBankByIdFromSupabase,
  insertElevateResponseToSupabase,
} from '../lib/elevatePretestPosttestSupabase';
import { isSupabaseConfigured } from '../lib/supabase';
import BrandLogo from './BrandLogo';

const ElevatePretestPosttestFormPage: React.FC = () => {
  const { bankId, phase: phaseParam } = useParams<{ bankId: string; phase: string }>();
  const [searchParams] = useSearchParams();
  const cacheKey = searchParams.get('v') || '';
  const phase: ElevateTestPhase | null = isElevateTestPhase(phaseParam) ? phaseParam : null;

  const [bank, setBank] = useState<ElevateTestBank | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [respondentName, setRespondentName] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<{ score: number; total: number } | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [saveNote, setSaveNote] = useState('');

  const questions = useMemo(() => (bank && phase ? bank[phase] : []), [bank, phase]);
  const phaseLabel = phase === 'pretest' ? 'Pretest' : phase === 'posttest' ? 'Posttest' : '';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!bankId) return;
      setLoading(true);
      setLoadError('');

      let found: ElevateTestBank | null = null;

      if (isSupabaseConfigured) {
        const remote = await fetchElevateBankByIdFromSupabase(bankId);
        if (cancelled) return;
        if (remote.bank) {
          found = remote.bank;
          const local = loadStoredElevateBanks();
          const next = local.some((b) => b.id === found!.id)
            ? local.map((b) => (b.id === found!.id ? found! : b))
            : [found!, ...local];
          saveElevateBanksToStorage(next);
        } else {
          found = findElevateBankById(loadStoredElevateBanks(), bankId);
        }
      } else {
        found = findElevateBankById(loadStoredElevateBanks(), bankId);
      }

      if (cancelled) return;
      setBank(found);
      setAnswers({});
      setSubmitted(false);
      setScore(null);
      setSubmitError('');
      setSaveNote('');
      if (!found) setLoadError('ไม่พบชุดข้อสอบนี้');
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [bankId, cacheKey]);

  useEffect(() => {
    const refresh = async () => {
      if (document.visibilityState !== 'visible' || !bankId || !isSupabaseConfigured) return;
      const remote = await fetchElevateBankByIdFromSupabase(bankId);
      if (!remote.bank) return;
      setBank(remote.bank);
      const local = loadStoredElevateBanks();
      const next = local.some((b) => b.id === remote.bank!.id)
        ? local.map((b) => (b.id === remote.bank!.id ? remote.bank! : b))
        : [remote.bank, ...local];
      saveElevateBanksToStorage(next);
    };
    const onVisible = () => {
      void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [bankId]);

  const setAnswer = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!bank || !phase || submitting) return;

    if (!respondentName.trim()) {
      setSubmitError('กรุณากรอกชื่อผู้ทำแบบทดสอบ');
      return;
    }

    const unanswered = questions.filter((q) => !(answers[q.id] || '').trim());
    if (unanswered.length > 0) {
      setSubmitError(`ยังต้องตอบอีก ${unanswered.length} ข้อ`);
      return;
    }

    const graded = gradeElevateAnswers(questions, answers);
    const response: ElevateTestResponse = {
      id: newElevateId('resp'),
      bankId: bank.id,
      bankName: bank.name,
      phase,
      respondentName: respondentName.trim(),
      answers: { ...answers },
      score: graded.score,
      total: graded.total,
      createdAt: new Date().toISOString(),
    };

    setSubmitting(true);
    setSubmitError('');
    setSaveNote('');

    saveElevateResponseLocal(response);

    if (isSupabaseConfigured) {
      const bankUp = await ensureElevateBankExistsOnSupabase(bank);
      if (bankUp.ok) {
        await insertElevateResponseToSupabase(response);
      }
    }
    setSaveNote('บันทึกเรียบร้อย');

    setScore({ score: graded.score, total: graded.total });
    setSubmitted(true);
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="md-page items-center justify-center text-gray-700">กำลังโหลดแบบทดสอบ...</div>
    );
  }

  if (!phase) {
    return (
      <div className="md-page items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-gray-700">ลิงก์ไม่ถูกต้อง — ต้องระบุ pretest หรือ posttest</p>
      </div>
    );
  }

  if (!bank) {
    return (
      <div className="md-page items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-gray-700">{loadError || 'ไม่พบชุดข้อสอบ'}</p>
        <Link to="/elevate-pretest-posttest-editor" className="text-sm font-semibold text-[#9A7200] hover:underline">
          กลับไปหน้า editor
        </Link>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="md-page items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-gray-700">ชุดนี้ยังไม่มีข้อสอบใน {phaseLabel}</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="md-page">
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <BrandLogo className="mx-auto mb-4 text-[28px]" tone="dark" />
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#9A7200]">
            Elevate · {phaseLabel}
          </p>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">ส่งคำตอบแล้ว</h1>
          <p className="mt-2 text-sm text-gray-600">
            {bank.name} · {respondentName.trim()}
          </p>
          {score && score.total > 0 ? (
            <p className="mt-8 text-5xl font-black tracking-tight text-gray-900">
              {score.score}
              <span className="text-2xl font-bold text-gray-500">/{score.total}</span>
            </p>
          ) : (
            <p className="mt-8 text-sm font-medium text-emerald-800">บันทึกเรียบร้อย</p>
          )}
          {saveNote && <p className="mt-4 text-xs text-gray-500">{saveNote}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="md-page selection:bg-yellow-300 selection:text-black">
      <header className="border-b border-[#D6D4CC] bg-white">
        <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
          <BrandLogo className="mb-3 text-[22px]" tone="dark" />
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#9A7200]">
            Elevate · {phaseLabel}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">{bank.name}</h1>
          {bank.description.trim() && (
            <p className="mt-2 text-sm leading-relaxed text-gray-600">{bank.description}</p>
          )}
        </div>
      </header>

      <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-4 px-4 py-6 sm:px-6">
        <label className="block space-y-1.5 rounded-2xl border border-[#D6D4CC] bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold text-gray-600">ชื่อผู้ทำแบบทดสอบ</span>
          <input
            value={respondentName}
            onChange={(e) => setRespondentName(e.target.value)}
            placeholder="กรอกชื่อของคุณ"
            className="w-full rounded-xl border border-[#D6D4CC] bg-[#F3F2ED] px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-500 focus:border-yellow-500 focus:bg-white focus:outline-none"
            autoComplete="name"
          />
        </label>

        {questions.map((question, index) => (
          <div
            key={question.id}
            className="space-y-3 rounded-2xl border border-[#D6D4CC] bg-white p-4 shadow-sm sm:p-5"
          >
            <div className="flex items-baseline gap-2">
              <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg bg-yellow-400 px-2 text-xs font-black text-black">
                {index + 1}
              </span>
              <p className="whitespace-pre-wrap text-sm font-semibold leading-relaxed text-gray-900 sm:text-base">
                {question.title}
              </p>
            </div>

            {question.type === 'rating_1_5' ? (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {['1', '2', '3', '4', '5'].map((n) => {
                    const selected = answers[question.id] === n;
                    return (
                      <button
                        key={`${question.id}-rating-${n}`}
                        type="button"
                        onClick={() => setAnswer(question.id, n)}
                        className={`h-12 w-12 rounded-xl border text-base font-bold transition-colors ${
                          selected
                            ? 'border-yellow-500 bg-yellow-400 text-black'
                            : 'border-[#D6D4CC] bg-[#F3F2ED] text-gray-800 hover:border-yellow-400 hover:bg-white'
                        }`}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-gray-500">1 = น้อย · 5 = มาก</p>
              </div>
            ) : question.type === 'choice' ? (
              <div className="space-y-2">
                {(question.options || []).map((option) => {
                  const selected = answers[question.id] === option;
                  return (
                    <label
                      key={`${question.id}-${option}`}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-sm transition-colors ${
                        selected
                          ? 'border-yellow-500 bg-yellow-50 font-medium text-gray-900'
                          : 'border-[#D6D4CC] bg-[#F3F2ED] text-gray-800 hover:border-yellow-400 hover:bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name={question.id}
                        checked={selected}
                        onChange={() => setAnswer(question.id, option)}
                        className="accent-yellow-500"
                      />
                      <span>{option}</span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <textarea
                value={answers[question.id] || ''}
                onChange={(e) => setAnswer(question.id, e.target.value)}
                rows={3}
                placeholder="พิมพ์คำตอบ..."
                className="w-full resize-y rounded-xl border border-[#D6D4CC] bg-[#F3F2ED] px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-500 focus:border-yellow-500 focus:bg-white focus:outline-none"
              />
            )}
          </div>
        ))}

        {submitError && (
          <p className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{submitError}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-yellow-400 px-4 py-3.5 text-sm font-black text-black hover:bg-yellow-300 disabled:opacity-60 sm:w-auto sm:min-w-[10rem]"
        >
          {submitting ? 'กำลังบันทึก...' : 'ส่งคำตอบ'}
        </button>
      </form>
    </div>
  );
};

export default ElevatePretestPosttestFormPage;
