import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
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
  fetchElevateBanksFromSupabase,
  insertElevateResponseToSupabase,
  upsertElevateBankToSupabase,
} from '../lib/elevatePretestPosttestSupabase';
import { isSupabaseConfigured } from '../lib/supabase';

const ElevatePretestPosttestFormPage: React.FC = () => {
  const { bankId, phase: phaseParam } = useParams<{ bankId: string; phase: string }>();
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
      setLoading(true);
      setLoadError('');
      const local = loadStoredElevateBanks();
      let found = findElevateBankById(local, bankId);

      if (isSupabaseConfigured) {
        const remote = await fetchElevateBanksFromSupabase();
        if (!cancelled && remote.banks.length > 0) {
          saveElevateBanksToStorage(remote.banks);
          found = findElevateBankById(remote.banks, bankId) || found;
        }
      }

      if (cancelled) return;
      setBank(found);
      if (!found) setLoadError('ไม่พบชุดข้อสอบนี้');
      setLoading(false);
    })();
    return () => {
      cancelled = true;
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
      setSubmitError(`ยังตอบไม่ครบ ${unanswered.length} ข้อ`);
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

    let savedToSupabase = false;
    if (isSupabaseConfigured) {
      // ให้แน่ใจว่าชุดข้อสอบอยู่บน Supabase ก่อนบันทึกคำตอบ (FK)
      await upsertElevateBankToSupabase(bank);
      const result = await insertElevateResponseToSupabase(response);
      if (result.ok) {
        savedToSupabase = true;
        setSaveNote('บันทึกคำตอบลง Supabase แล้ว');
      } else if (result.tableMissing) {
        setSaveNote('ยังไม่มีตาราง responses บน Supabase — บันทึกในเครื่องชั่วคราว');
      } else if (result.error) {
        setSaveNote(`บันทึก Supabase ไม่สำเร็จ: ${result.error} — เก็บในเครื่องชั่วคราว`);
      }
    }

    if (!savedToSupabase) {
      saveElevateResponseLocal(response);
      if (!isSupabaseConfigured) {
        setSaveNote('บันทึกในเครื่องแล้ว (ยังไม่ได้ตั้งค่า Supabase)');
      }
    }

    setScore({ score: graded.score, total: graded.total });
    setSubmitted(true);
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070707] text-zinc-400">
        กำลังโหลดแบบทดสอบ...
      </div>
    );
  }

  if (!phase) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#070707] px-6 text-center text-white">
        <p className="text-sm text-zinc-400">ลิงก์ไม่ถูกต้อง — ต้องระบุ pretest หรือ posttest</p>
      </div>
    );
  }

  if (!bank) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#070707] px-6 text-center text-white">
        <p className="text-sm text-zinc-400">{loadError || 'ไม่พบชุดข้อสอบ'}</p>
        <Link to="/elevate-pretest-posttest-editor" className="text-sm font-semibold text-yellow-400 hover:underline">
          กลับไปหน้า editor
        </Link>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#070707] px-6 text-center text-white">
        <p className="text-sm text-zinc-400">ชุดนี้ยังไม่มีข้อสอบใน {phaseLabel}</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#070707] text-white">
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-400/80">ELEVATE</p>
          <h1 className="mt-2 text-2xl font-black">ส่งคำตอบแล้ว</h1>
          <p className="mt-2 text-sm text-zinc-400">
            {bank.name} · {phaseLabel} · {respondentName.trim()}
          </p>
          {score && score.total > 0 ? (
            <p className="mt-6 text-4xl font-black text-yellow-300">
              {score.score}/{score.total}
            </p>
          ) : (
            <p className="mt-6 text-sm text-zinc-400">บันทึกคำตอบเรียบร้อย</p>
          )}
          {saveNote && <p className="mt-4 text-xs text-zinc-500">{saveNote}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070707] text-white selection:bg-yellow-300 selection:text-black">
      <header className="border-b border-yellow-400/15 bg-[#0a0a0a]">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-400/80">ELEVATE · {phaseLabel}</p>
          <h1 className="mt-1 text-2xl font-black text-white">{bank.name}</h1>
          {bank.description.trim() && <p className="mt-2 text-sm text-zinc-400">{bank.description}</p>}
        </div>
      </header>

      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:px-6">
        <label className="block space-y-1.5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">ชื่อผู้ทำแบบทดสอบ</span>
          <input
            value={respondentName}
            onChange={(e) => setRespondentName(e.target.value)}
            placeholder="กรอกชื่อของคุณ"
            className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-sm"
            autoComplete="name"
          />
        </label>

        {questions.map((question, index) => (
          <fieldset
            key={question.id}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3"
          >
            <legend className="px-1 text-sm font-bold text-yellow-300">
              ข้อ {index + 1}
            </legend>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-100">{question.title}</p>

            {question.type === 'choice' ? (
              <div className="space-y-2">
                {(question.options || []).map((option) => {
                  const selected = answers[question.id] === option;
                  return (
                    <label
                      key={`${question.id}-${option}`}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                        selected
                          ? 'border-yellow-400/50 bg-yellow-400/10 text-yellow-100'
                          : 'border-white/10 bg-black/30 text-zinc-200 hover:border-yellow-400/30'
                      }`}
                    >
                      <input
                        type="radio"
                        name={question.id}
                        checked={selected}
                        onChange={() => setAnswer(question.id, option)}
                        className="accent-yellow-400"
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
                className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm resize-y"
              />
            )}
          </fieldset>
        ))}

        {submitError && (
          <p className="rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {submitError}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-yellow-400 px-4 py-3 text-sm font-black text-black hover:bg-yellow-300 disabled:opacity-60 sm:w-auto"
        >
          {submitting ? 'กำลังบันทึก...' : 'ส่งคำตอบ'}
        </button>
      </form>
    </div>
  );
};

export default ElevatePretestPosttestFormPage;
