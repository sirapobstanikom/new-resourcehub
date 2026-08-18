import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Brain, Building2, Mail, Sparkles, User, Users } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  generateAiScoreFromAnswers,
  HR_CHALLENGE_QUESTIONS_PER_ROUND,
  pickRandomCases,
  prizeForScore,
  titleForScore,
  type CaseAnswer,
  type HrCaseOptionId,
  type HrChallengeCase,
} from '../lib/aiHrChallengeCases';
import {
  loadStoredRegistration,
  registerAiHrPlayer,
  saveAiHrSession,
  storeRegistration,
  type AiHrRegistration,
} from '../services/aiHrChallengeSupabase';

type Phase = 'register' | 'playing' | 'revealing' | 'scoring' | 'result';

const EMPTY_REG: AiHrRegistration = {
  name: '',
  company: '',
  position: '',
  email: '',
  employeeCount: '',
};

const EMPLOYEE_RANGES = [
  { value: '1-50', label: '1–50 คน' },
  { value: '51-200', label: '51–200 คน' },
  { value: '201-500', label: '201–500 คน' },
  { value: '501-1000', label: '501–1,000 คน' },
  { value: '1000+', label: '1,000+ คน' },
];

const OPTION_IDS: HrCaseOptionId[] = ['A', 'B', 'C', 'D'];

function Field({
  id,
  label,
  icon,
  type = 'text',
  value,
  valid,
  placeholder,
  autoComplete,
  inputMode,
  inputRef,
  onChange,
}: {
  id: string;
  label: string;
  icon: 'user' | 'mail' | 'building' | 'briefcase';
  type?: string;
  value: string;
  valid: boolean;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  inputRef?: React.RefObject<HTMLInputElement | null>;
  onChange: (v: string) => void;
}) {
  const Icon =
    icon === 'user' ? User : icon === 'mail' ? Mail : icon === 'building' ? Building2 : Users;
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-stone-500">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {label}
      </span>
      <input
        ref={inputRef}
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        inputMode={inputMode}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-xl border px-4 py-3 text-base text-stone-900 outline-none transition ${
          valid ? 'border-emerald-400/60 bg-white' : 'border-stone-200 bg-stone-50'
        } focus:border-violet-500 focus:ring-2 focus:ring-violet-200`}
      />
    </label>
  );
}

const GameAiHrChallenge: React.FC = () => {
  const [phase, setPhase] = useState<Phase>('register');
  const [registration, setRegistration] = useState<AiHrRegistration>(EMPTY_REG);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [caseQueue, setCaseQueue] = useState<HrChallengeCase[]>(() =>
    pickRandomCases(HR_CHALLENGE_QUESTIONS_PER_ROUND)
  );
  const [caseIndex, setCaseIndex] = useState(0);
  const [answers, setAnswers] = useState<CaseAnswer[]>([]);
  const [selectedOption, setSelectedOption] = useState<HrCaseOptionId | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const savedRef = useRef(false);

  const activeCase = caseQueue[caseIndex] ?? caseQueue[0];
  const isLastQuestion = caseIndex >= caseQueue.length - 1;

  const formReady = useMemo(() => {
    return (
      registration.name.trim().length >= 2 &&
      registration.company.trim().length >= 2 &&
      registration.position.trim().length >= 2 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registration.email.trim()) &&
      registration.employeeCount.length > 0
    );
  }, [registration]);

  const filledCount = [
    registration.name,
    registration.company,
    registration.position,
    registration.email,
    registration.employeeCount,
  ].filter((v) => v.trim().length >= 2).length;

  const isCorrect = selectedOption === activeCase?.correctOption;
  const correctCount = answers.filter((a) => a.correct).length;
  const resultTitle = score != null ? titleForScore(score) : '';
  const prize = score != null ? prizeForScore(score) : null;

  const advanceFromReveal = useCallback(() => {
    if (isLastQuestion) {
      setPhase('scoring');
      return;
    }
    setCaseIndex((i) => i + 1);
    setSelectedOption(null);
    setPhase('playing');
  }, [isLastQuestion]);

  useEffect(() => {
    const stored = loadStoredRegistration();
    if (stored) setRegistration(stored);
  }, []);

  useEffect(() => {
    if (phase !== 'register') return;
    const id = window.setTimeout(() => nameInputRef.current?.focus(), 180);
    return () => window.clearTimeout(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'scoring' || answers.length < HR_CHALLENGE_QUESTIONS_PER_ROUND) return;
    const timer = window.setTimeout(() => {
      const nextScore = generateAiScoreFromAnswers(answers);
      setScore(nextScore);
      setPhase('result');
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [phase, answers]);

  const persistSession = useCallback(
    async (finalScore: number, allAnswers: CaseAnswer[]) => {
      if (savedRef.current) return;
      savedRef.current = true;
      try {
        await saveAiHrSession({
          playerId,
          registration,
          answers: allAnswers,
          score: finalScore,
        });
        setSaveError(null);
      } catch (e) {
        savedRef.current = false;
        setSaveError(e instanceof Error ? e.message : 'บันทึกผลไม่สำเร็จ');
      }
    },
    [playerId, registration]
  );

  useEffect(() => {
    if (phase !== 'result' || score == null || answers.length < HR_CHALLENGE_QUESTIONS_PER_ROUND) return;
    void persistSession(score, answers);
  }, [phase, score, answers, persistSession]);

  const resetRound = () => {
    setCaseQueue(pickRandomCases(HR_CHALLENGE_QUESTIONS_PER_ROUND));
    setCaseIndex(0);
    setAnswers([]);
    setSelectedOption(null);
    setScore(null);
    savedRef.current = false;
    setSaveError(null);
  };

  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formReady) return;
    setRegisterError(null);
    storeRegistration(registration);
    setRegistering(true);
    try {
      const player = await registerAiHrPlayer(registration);
      setPlayerId(player.id);
      resetRound();
      setPhase('playing');
    } catch (err) {
      setRegisterError(err instanceof Error ? err.message : 'ลงทะเบียนไม่สำเร็จ');
    } finally {
      setRegistering(false);
    }
  };

  const handleSelectOption = (option: HrCaseOptionId) => {
    if (phase !== 'playing' || !activeCase) return;
    const correct = option === activeCase.correctOption;
    setAnswers((prev) => [...prev, { caseId: activeCase.id, selectedOption: option, correct }]);
    setSelectedOption(option);
    setPhase('revealing');
  };

  const playAgain = () => {
    resetRound();
    setPhase('playing');
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0b12] text-white selection:bg-violet-400 selection:text-black">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.18),transparent_45%),radial-gradient(ellipse_at_bottom_right,rgba(245,158,11,0.12),transparent_40%)]" />
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:40px_40px]" />
      </div>

      <div className="fixed top-4 left-4 right-4 z-20 flex items-center justify-between gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur-md hover:bg-white/10"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          หน้าหลัก
        </Link>
        {(phase === 'playing' || phase === 'revealing') && (
          <span className="rounded-full border border-violet-400/30 bg-black/50 px-3 py-1.5 text-xs font-semibold text-violet-200 backdrop-blur-md">
            ข้อ {Math.min(caseIndex + 1, caseQueue.length)}/{caseQueue.length}
          </span>
        )}
      </div>

      {phase === 'register' && (
        <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-8 px-4 py-24 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="order-2 lg:order-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-violet-300/90">
              MindDoJo · AI HR Challenge
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">
              คุณจะแก้ปัญหานี้อย่างไร?
            </h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-zinc-400">
              ตอบโจทย์ HR 3 ข้อ — อ่านเฉลยทีละข้อ แล้วรับคะแนน AI และของรางวัล (~2 นาที)
            </p>
            <ul className="mt-6 space-y-2 text-sm text-zinc-300">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400">✓</span> เก็บข้อมูลลูกค้า (Lead)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400">✓</span> ให้ความรู้ HR แบบสั้น กระชับ
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400">✓</span> เปิดบทสนทนาให้ทีม Sales
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400">✓</span> สะท้อนภาพลักษณ์ MindDoJo
              </li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold text-zinc-300">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">3 ข้อ</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">เฉลยทันที</span>
              <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1.5 text-violet-200">
                AI Score
              </span>
            </div>
          </div>

          <form
            onSubmit={handleRegistration}
            className="order-1 lg:order-2 relative overflow-hidden rounded-[32px] bg-[#f4efe6] p-6 text-stone-900 shadow-[0_30px_80px_rgba(0,0,0,0.35)] sm:p-8"
          >
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-violet-500 via-fuchsia-400 to-amber-400" />
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-stone-500">Step 1</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-stone-900 sm:text-3xl">ลงทะเบียน</h2>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-semibold text-stone-500">{filledCount}/5</p>
                <div className="mt-1 h-1.5 w-16 overflow-hidden rounded-full bg-stone-200">
                  <div
                    className="h-full rounded-full bg-violet-500 transition-all"
                    style={{ width: `${(filledCount / 5) * 100}%` }}
                  />
                </div>
              </div>
            </div>
            <p className="mt-2 text-sm text-stone-500">สแกน QR แล้วกรอกข้อมูลเพื่อเริ่มเล่น</p>

            <div className="mt-6 space-y-3.5">
              <Field
                id="ai-hr-name"
                label="ชื่อ-นามสกุล"
                icon="user"
                inputRef={nameInputRef}
                autoComplete="name"
                placeholder="สมชาย ใจดี"
                value={registration.name}
                valid={registration.name.trim().length >= 2}
                onChange={(v) => setRegistration({ ...registration, name: v })}
              />
              <Field
                id="ai-hr-company"
                label="บริษัท"
                icon="building"
                autoComplete="organization"
                placeholder="บริษัทของคุณ"
                value={registration.company}
                valid={registration.company.trim().length >= 2}
                onChange={(v) => setRegistration({ ...registration, company: v })}
              />
              <Field
                id="ai-hr-position"
                label="ตำแหน่ง"
                icon="briefcase"
                autoComplete="organization-title"
                placeholder="HR Manager / CHRO"
                value={registration.position}
                valid={registration.position.trim().length >= 2}
                onChange={(v) => setRegistration({ ...registration, position: v })}
              />
              <Field
                id="ai-hr-email"
                label="Email"
                icon="mail"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="name@company.com"
                value={registration.email}
                valid={/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registration.email.trim())}
                onChange={(v) => setRegistration({ ...registration, email: v })}
              />
              <label htmlFor="ai-hr-employees" className="block">
                <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-stone-500">
                  <Users className="h-3.5 w-3.5" aria-hidden />
                  จำนวนพนักงาน
                </span>
                <select
                  id="ai-hr-employees"
                  value={registration.employeeCount}
                  onChange={(e) => setRegistration({ ...registration, employeeCount: e.target.value })}
                  className={`w-full rounded-xl border px-4 py-3 text-base text-stone-900 outline-none transition ${
                    registration.employeeCount ? 'border-emerald-400/60 bg-white' : 'border-stone-200 bg-stone-50'
                  } focus:border-violet-500 focus:ring-2 focus:ring-violet-200`}
                >
                  <option value="">เลือกช่วงจำนวนพนักงาน</option>
                  {EMPLOYEE_RANGES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {registerError ? (
              <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {registerError}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={registering || !formReady}
              className="mt-6 w-full rounded-2xl bg-stone-950 px-5 py-4 text-base font-black text-violet-200 shadow-[0_12px_30px_rgba(0,0,0,0.18)] transition hover:bg-black disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500"
            >
              {registering ? 'กำลังเริ่มเกม...' : formReady ? 'เริ่ม AI HR Challenge' : 'กรอกข้อมูลให้ครบก่อน'}
            </button>
            <p className="mt-3 text-center text-xs text-stone-400">
              {isSupabaseConfigured
                ? 'ข้อมูลใช้สำหรับ Lead และผลการเล่นเท่านั้น'
                : 'ยังไม่ได้ตั้งค่าฐานข้อมูล — เก็บในเครื่องชั่วคราว'}
            </p>
          </form>
        </div>
      )}

      {phase === 'playing' && activeCase && (
        <div className="relative mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-4 py-24">
          <p className="text-center text-[11px] font-bold uppercase tracking-[0.28em] text-violet-300/80">
            Step 2 · โจทย์องค์กร ({caseIndex + 1}/{caseQueue.length})
          </p>
          <div className="mx-auto mt-4 flex gap-1.5">
            {caseQueue.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-10 rounded-full transition ${
                  i < caseIndex ? 'bg-emerald-400' : i === caseIndex ? 'bg-violet-400' : 'bg-white/15'
                }`}
              />
            ))}
          </div>
          <h2 className="mt-2 text-center text-sm font-semibold text-amber-300/90">{activeCase.title}</h2>
          <p className="mt-4 text-center text-2xl font-black leading-snug text-white sm:text-3xl">
            {activeCase.scenario}
          </p>
          <p className="mt-3 text-center text-lg text-zinc-300">{activeCase.question}</p>

          <div className="mt-8 space-y-3">
            {OPTION_IDS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => handleSelectOption(id)}
                className="group flex w-full items-start gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-left transition hover:border-violet-400/40 hover:bg-violet-500/10 active:scale-[0.99]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/20 text-lg font-black text-violet-200 group-hover:bg-violet-500/30">
                  {id}
                </span>
                <span className="pt-1.5 text-base leading-relaxed text-zinc-100">{activeCase.options[id]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === 'revealing' && selectedOption != null && activeCase && (
        <div className="relative mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-4 py-24">
          <p className="text-center text-[11px] font-bold uppercase tracking-[0.28em] text-emerald-300/90">
            Step 3 · เฉลย ข้อ {caseIndex + 1}/{caseQueue.length}
          </p>

          <div
            className={`mt-6 rounded-3xl border p-6 sm:p-8 ${
              isCorrect
                ? 'border-emerald-400/40 bg-emerald-500/10'
                : 'border-amber-400/40 bg-amber-500/10'
            }`}
          >
            <p className="text-center text-lg font-bold text-white">
              {isCorrect ? '✅ ตอบถูกแล้ว!' : '💡 คำตอบที่เหมาะสมที่สุดคือ B'}
            </p>
            {!isCorrect && (
              <p className="mt-2 text-center text-sm text-zinc-400">
                คุณเลือก {selectedOption} — มาดูแนวคิดที่ HR มืออาชีพมักเลือกกัน
              </p>
            )}
            <div className="mt-5 rounded-2xl bg-black/30 px-5 py-4">
              <p className="text-sm font-semibold text-violet-200">
                ตัวเลือก {activeCase.correctOption}: {activeCase.options[activeCase.correctOption]}
              </p>
              <p className="mt-3 text-base leading-relaxed text-zinc-200">{activeCase.explanation}</p>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-zinc-500">
            {isLastQuestion
              ? 'อ่าน Insight แล้วกดปุ่มด้านล่างเพื่อดูคะแนน'
              : 'อ่าน Insight แล้วกดปุ่มด้านล่างเพื่อไปข้อถัดไป'}
          </p>
          <button
            type="button"
            onClick={advanceFromReveal}
            className="mx-auto mt-4 rounded-xl border border-violet-400/40 bg-violet-500/20 px-6 py-3 text-sm font-semibold text-violet-100 hover:bg-violet-500/30"
          >
            {isLastQuestion ? 'ดูคะแนน →' : 'ข้อถัดไป →'}
          </button>
        </div>
      )}

      {phase === 'scoring' && (
        <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-24">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Brain className="h-16 w-16 animate-pulse text-violet-400" aria-hidden />
              <Sparkles className="absolute -right-1 -top-1 h-6 w-6 animate-bounce text-amber-300" aria-hidden />
            </div>
            <p className="text-lg font-semibold text-violet-200">AI กำลังวิเคราะห์แนวคิด HR จาก 3 ข้อ...</p>
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-2 w-2 rounded-full bg-violet-400 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {phase === 'result' && score != null && prize != null && (
        <div className="relative mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-24">
          <div className="rounded-[32px] border border-white/10 bg-gradient-to-b from-white/10 to-white/5 p-8 text-center shadow-2xl shadow-violet-500/10">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-violet-300/90">
              MindDoJo HR Challenge
            </p>
            <p className="mt-4 text-7xl font-black tabular-nums text-violet-300">
              {score}
              <span className="text-3xl text-zinc-500">/100</span>
            </p>
            <p className="mt-2 text-xl font-bold text-amber-200">{resultTitle}</p>
            <p className="mt-1 text-sm text-zinc-400">
              ตอบถูก {correctCount}/{HR_CHALLENGE_QUESTIONS_PER_ROUND} ข้อ
            </p>

            <div
              className={`mt-6 rounded-2xl border px-5 py-4 ${
                prize.tier === 'grand'
                  ? 'border-amber-400/50 bg-amber-500/15'
                  : prize.tier === 'premium'
                    ? 'border-violet-400/40 bg-violet-500/15'
                    : prize.tier === 'sticker'
                      ? 'border-emerald-400/40 bg-emerald-500/15'
                      : 'border-white/10 bg-white/5'
              }`}
            >
              <p className="text-sm font-semibold text-zinc-400">ของรางวัลที่ได้รับ</p>
              <p className="mt-1 text-lg font-black text-white">{prize.label}</p>
              <p className="mt-1 text-xs text-zinc-400">{prize.detail}</p>
            </div>

            <div className="mt-5 rounded-xl bg-black/25 px-4 py-3 text-left text-xs text-zinc-400">
              <p className="font-semibold text-zinc-300">เกณฑ์รางวัล</p>
              <ul className="mt-2 space-y-1">
                <li>0–33 คะแนน (ถูก 0–1 ข้อ) → สติกเกอร์ MindDoJo</li>
                <li>34–89 คะแนน (ถูก 2 ข้อ) → แก้ว / สมุด MindDoJo</li>
                <li>90–100 คะแนน (ถูก 3 ข้อ) → ลุ้นรางวัลใหญ่</li>
              </ul>
            </div>

            {saveError ? <p className="mt-4 text-sm text-amber-400">{saveError}</p> : null}

            <button
              type="button"
              onClick={playAgain}
              className="mt-6 w-full rounded-2xl bg-violet-500 px-5 py-4 text-base font-black text-white hover:bg-violet-400 transition"
            >
              เล่นชุดใหม่ (3 ข้อ)
            </button>
            <a
              href="https://minddojo.co.th"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 block w-full rounded-2xl border border-amber-400/30 bg-amber-400/10 px-5 py-3 text-sm font-semibold text-amber-200 hover:bg-amber-400/20 transition"
            >
              พูดคุยกับทีม MindDoJo →
            </a>
            <Link
              to="/"
              className="mt-3 block w-full rounded-2xl border border-white/10 px-5 py-3 text-sm font-medium text-zinc-400 hover:bg-white/5 transition"
            >
              กลับหน้าหลัก
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameAiHrChallenge;
