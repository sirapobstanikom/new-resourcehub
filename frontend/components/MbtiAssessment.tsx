import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import html2canvas from 'html2canvas';
import BrandLogo, { prepareBrandLogosForExport } from './BrandLogo';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { LEADERSHIP_HEADLINE_FONT } from '../lib/leadershipTheme';
import {
  MBTI_ASSETS,
  MBTI_DIMENSIONS,
  MBTI_INTRO,
  MBTI_INTRO_TIP,
  MBTI_PDPA_TEXT,
  MBTI_POINTS_PER_ITEM,
  MBTI_QUESTIONS,
  MBTI_TYPE_PROFILES,
  calculateMbtiScores,
  getMbtiType,
  mbtiTypeImageUrl,
  type MbtiAnswers,
  type MbtiScores,
  type MbtiType,
} from '../lib/mbtiData';

type Step = 'register' | 'test' | 'result';

interface Registration {
  firstName: string;
  lastName: string;
  age: string;
  company: string;
  email: string;
}

interface MbtiResult {
  type: MbtiType;
  scores: MbtiScores;
  completedAt: string;
}

interface Draft {
  step: Step;
  reg: Registration;
  answers: MbtiAnswers;
  page: number;
  result: MbtiResult | null;
}

const DRAFT_KEY = 'mbti_assessment_draft_v1';
const YELLOW = '#FED201';
const LETTER_ORDER = 'EISNTFJP';
const EMPTY_REG: Registration = { firstName: '', lastName: '', age: '', company: '', email: '' };
const SCORE_OPTIONS = Array.from({ length: MBTI_POINTS_PER_ITEM + 1 }, (_, i) => i);

/** แบ่งหน้าเหมือนต้นฉบับ: 5 ข้อต่อหน้า และหน้าสุดท้ายรวมข้อ 26–32 */
const PAGE_STARTS = [0, 5, 10, 15, 20, 25];
const PAGES = PAGE_STARTS.map((start, i) => MBTI_QUESTIONS.slice(start, PAGE_STARTS[i + 1] ?? MBTI_QUESTIONS.length));

const loadDraft = (): Draft | null => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
};

const SCROLL_DURATION_MS = 1100;

const slowScrollTo = (targetY: number, durationMs = SCROLL_DURATION_MS) => {
  const startY = window.scrollY;
  const maxY = document.documentElement.scrollHeight - window.innerHeight;
  const distance = Math.min(Math.max(targetY, 0), maxY) - startY;
  if (Math.abs(distance) < 4) return;
  const start = performance.now();
  const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
  const tick = (now: number) => {
    const progress = Math.min((now - start) / durationMs, 1);
    window.scrollTo(0, startY + distance * easeInOutCubic(progress));
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

const REG_FIELDS: { key: keyof Registration; placeholder: string; type: string; autoComplete: string; inputMode?: 'numeric' }[] = [
  { key: 'firstName', placeholder: 'First Name', type: 'text', autoComplete: 'given-name' },
  { key: 'lastName', placeholder: 'Last Name', type: 'text', autoComplete: 'family-name' },
  { key: 'age', placeholder: 'Age', type: 'text', autoComplete: 'off', inputMode: 'numeric' },
  { key: 'company', placeholder: 'Company', type: 'text', autoComplete: 'organization' },
  { key: 'email', placeholder: 'Email', type: 'email', autoComplete: 'email' },
];

const PageHeader: React.FC = () => (
  <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
    <Link to="/" aria-label="กลับหน้าแรก">
      <BrandLogo className="text-[26px] sm:text-[30px]" tone="dark" />
    </Link>
    <Link
      to="/"
      className="rounded-full border border-black/80 px-4 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-black hover:text-[#FED201] sm:text-sm"
    >
      กลับหน้าแรก
    </Link>
  </header>
);

interface ScoreRowProps {
  questionId: number;
  option: 'ก' | 'ข';
  text: string;
  value: number | undefined;
  onSelect: (value: number) => void;
}

const ScoreRow: React.FC<ScoreRowProps> = ({ questionId, option, text, value, onSelect }) => (
  <div>
    <p className="text-[15px] leading-relaxed text-black sm:text-base">
      <span className="font-bold">{option}.</span> {text}
    </p>
    <div role="radiogroup" aria-label={`ข้อ ${questionId} ${option}.`} className="mt-3 grid grid-cols-6 gap-2 sm:max-w-md sm:gap-3">
      {SCORE_OPTIONS.map((n) => {
        const selected = value === n;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${option}. ${n} คะแนน`}
            onClick={() => onSelect(n)}
            className={`flex aspect-square w-full max-w-[52px] items-center justify-center justify-self-center rounded-full text-base font-bold transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-black/30 sm:text-lg ${
              selected
                ? 'scale-105 bg-black text-[#FED201] shadow-lg shadow-black/25'
                : 'bg-white text-black shadow-sm hover:bg-black/10 hover:shadow'
            }`}
          >
            {n}
          </button>
        );
      })}
    </div>
  </div>
);

const MbtiAssessment: React.FC = () => {
  const initial = useMemo(loadDraft, []);
  const [step, setStep] = useState<Step>(initial?.step ?? 'register');
  const [reg, setReg] = useState<Registration>(initial?.reg ?? EMPTY_REG);
  const [consent, setConsent] = useState(initial ? initial.step !== 'register' : false);
  const [regError, setRegError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<MbtiAnswers>(initial?.answers ?? {});
  const [page, setPage] = useState(initial?.page ?? 0);
  const [showMissing, setShowMissing] = useState(false);
  const [introOpen, setIntroOpen] = useState(false);
  const [result, setResult] = useState<MbtiResult | null>(initial?.result ?? null);
  const [pngLoading, setPngLoading] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const draft: Draft = { step, reg, answers, page, result };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {}
  }, [step, reg, answers, page, result]);

  const hasMountedRef = useRef(false);
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step, page]);

  const answeredCount = Object.keys(answers).length;
  const currentQuestions = PAGES[page] ?? [];
  const isLastPage = page === PAGES.length - 1;

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed: Registration = {
      firstName: reg.firstName.trim(),
      lastName: reg.lastName.trim(),
      age: reg.age.trim(),
      company: reg.company.trim(),
      email: reg.email.trim(),
    };
    if (REG_FIELDS.some(({ key }) => !trimmed[key]) || !consent) {
      setRegError('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    const age = Number(trimmed.age);
    if (!Number.isInteger(age) || age < 1 || age > 120) {
      setRegError('กรุณากรอกอายุเป็นตัวเลขให้ถูกต้อง');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed.email)) {
      setRegError('กรุณากรอกอีเมลให้ถูกต้อง');
      return;
    }
    setReg(trimmed);
    setRegError(null);
    setStep('test');
  };

  const setScore = (questionId: number, option: 'a' | 'b', value: number) => {
    const aScore = option === 'a' ? value : MBTI_POINTS_PER_ITEM - value;
    const isFirstAnswer = answers[questionId] == null;
    setAnswers((prev) => ({ ...prev, [questionId]: aScore }));
    if (!isFirstAnswer) return;

    const index = currentQuestions.findIndex((q) => q.id === questionId);
    const isUnanswered = (q: { id: number }) => q.id !== questionId && answers[q.id] == null;
    const nextQuestion =
      currentQuestions.slice(index + 1).find(isUnanswered) ?? currentQuestions.slice(0, index).find(isUnanswered);
    window.setTimeout(() => {
      const target = nextQuestion ? document.getElementById(`mbti-q-${nextQuestion.id}`) : null;
      const targetY = target
        ? target.getBoundingClientRect().top + window.scrollY - 16
        : document.documentElement.scrollHeight - window.innerHeight;
      slowScrollTo(targetY);
    }, 250);
  };

  const saveResult = async (finalResult: MbtiResult) => {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.from('mbti_results').insert({
      first_name: reg.firstName,
      last_name: reg.lastName,
      age: Number(reg.age),
      company: reg.company,
      email: reg.email,
      answers,
      scores: finalResult.scores,
      mbti_type: finalResult.type,
      completed_at: finalResult.completedAt,
    });
    if (error) console.warn('MBTI save to DB:', error.message);
  };

  const handleNext = () => {
    const missing = currentQuestions.filter((q) => answers[q.id] == null);
    if (missing.length > 0) {
      setShowMissing(true);
      document.getElementById(`mbti-q-${missing[0].id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setShowMissing(false);
    if (!isLastPage) {
      setPage((p) => p + 1);
      return;
    }
    const scores = calculateMbtiScores(answers);
    const finalResult: MbtiResult = { type: getMbtiType(scores), scores, completedAt: new Date().toISOString() };
    setResult(finalResult);
    setStep('result');
    void saveResult(finalResult);
  };

  const handleBack = () => {
    setShowMissing(false);
    if (page === 0) setStep('register');
    else setPage((p) => p - 1);
  };

  const handleRestart = () => {
    setAnswers({});
    setPage(0);
    setResult(null);
    setShowMissing(false);
    setStep('test');
  };

  const handleDownloadPng = async () => {
    if (!resultRef.current || !result) return;
    setPngLoading(true);
    try {
      const canvas = await html2canvas(resultRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: await prepareBrandLogosForExport(),
      });
      const link = document.createElement('a');
      link.download = `MBTI-${result.type}-${reg.firstName || 'result'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถบันทึกรูปภาพได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setPngLoading(false);
    }
  };

  if (step === 'register') {
    return (
      <div className="min-h-[100dvh] bg-white text-black [color-scheme:light]">
        <PageHeader />
        <main className="mx-auto w-full max-w-5xl px-5 pb-16 sm:px-8">
          <img
            src={MBTI_ASSETS.registerBanner}
            alt="Member Register"
            className="mx-auto w-full max-w-[520px] select-none"
            draggable={false}
          />
          <div className="mt-6 grid items-center gap-8 md:mt-10 md:grid-cols-[1fr_1.05fr] md:gap-12">
            <img
              src={MBTI_ASSETS.registerIllustration}
              alt="MBTI – The Myers-Briggs Type Indicator"
              className="mx-auto w-full max-w-[260px] select-none sm:max-w-[340px] md:max-w-[400px]"
              draggable={false}
            />
            <form onSubmit={handleRegister} noValidate className="w-full">
              <div className="space-y-3.5">
                {REG_FIELDS.map(({ key, placeholder, type, autoComplete, inputMode }) => (
                  <input
                    key={key}
                    id={`mbti-${key}`}
                    type={type}
                    inputMode={inputMode}
                    value={reg[key]}
                    onChange={(e) => {
                      const v = key === 'age' ? e.target.value.replace(/\D/g, '').slice(0, 3) : e.target.value;
                      setReg((prev) => ({ ...prev, [key]: v }));
                      setRegError(null);
                    }}
                    placeholder={placeholder}
                    aria-label={placeholder}
                    autoComplete={autoComplete}
                    required
                    className="w-full rounded-md border-2 bg-white px-4 py-3 text-[15px] font-medium text-black placeholder:text-gray-500 focus:outline-none focus:ring-4 focus:ring-[#FED201]/40"
                    style={{ borderColor: YELLOW }}
                  />
                ))}
              </div>

              <p className="mt-4 text-xs leading-relaxed text-gray-700 sm:text-[13px]">{MBTI_PDPA_TEXT}</p>

              <label className="mt-5 flex cursor-pointer items-center gap-3 text-sm text-gray-800">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => {
                    setConsent(e.target.checked);
                    setRegError(null);
                  }}
                  className="h-5 w-5 shrink-0 cursor-pointer rounded border-gray-400 accent-black"
                />
                ฉันยอมรับข้อกำหนดและเงื่อนไข
              </label>

              <button
                type="submit"
                className="mt-5 w-full rounded-md py-3 text-lg font-bold text-black shadow-md transition-all hover:brightness-95 active:scale-[0.99]"
                style={{ backgroundColor: YELLOW }}
              >
                ส่ง
              </button>
              {regError && (
                <p role="alert" className="mt-3 text-center text-sm font-semibold text-red-600">
                  {regError}
                </p>
              )}
            </form>
          </div>
        </main>
      </div>
    );
  }

  if (step === 'test') {
    const progress = Math.round((answeredCount / MBTI_QUESTIONS.length) * 100);
    return (
      <div className="min-h-[100dvh] text-black [color-scheme:light]" style={{ backgroundColor: YELLOW }}>
        <PageHeader />
        <main className="mx-auto w-full max-w-3xl px-5 pb-36 sm:px-8">
          <img
            src={MBTI_ASSETS.testBanner}
            alt="แบบทดสอบ MBTI"
            className="mx-auto -mt-2 w-full max-w-[460px] select-none"
            draggable={false}
          />

          {page === 0 && (
            <section className="mt-4 rounded-2xl bg-white/50 p-4 text-sm leading-relaxed sm:p-5 sm:text-[15px]">
              <p className="font-bold">MBTI</p>
              <p className={introOpen ? '' : 'line-clamp-2'}>{MBTI_INTRO}</p>
              {introOpen && <p className="mt-2 font-semibold">{MBTI_INTRO_TIP}</p>}
              <button
                type="button"
                onClick={() => setIntroOpen((o) => !o)}
                className="mt-1 text-xs font-semibold underline underline-offset-2"
              >
                {introOpen ? 'ย่อ' : 'อ่านเพิ่มเติม'}
              </button>
            </section>
          )}

          <div className="mt-6 space-y-5">
            {currentQuestions.map((q) => {
              const a = answers[q.id];
              const missing = showMissing && a == null;
              return (
                <section
                  key={q.id}
                  id={`mbti-q-${q.id}`}
                  className={`rounded-2xl bg-white/35 p-4 transition-shadow sm:p-6 ${missing ? 'ring-4 ring-red-500/70' : ''}`}
                >
                  <h2 className="text-2xl font-bold sm:text-[28px]">ข้อ {q.id}</h2>
                  <div className="mt-3 space-y-5">
                    <ScoreRow questionId={q.id} option="ก" text={q.a} value={a} onSelect={(v) => setScore(q.id, 'a', v)} />
                    <ScoreRow
                      questionId={q.id}
                      option="ข"
                      text={q.b}
                      value={a == null ? undefined : MBTI_POINTS_PER_ITEM - a}
                      onSelect={(v) => setScore(q.id, 'b', v)}
                    />
                  </div>
                  {missing && <p className="mt-3 text-sm font-semibold text-red-700">กรุณาให้คะแนนข้อนี้</p>}
                </section>
              );
            })}
          </div>
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-black/10 bg-[#FED201]/95 backdrop-blur">
          <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-5 py-3 sm:px-8">
            <button
              type="button"
              onClick={handleBack}
              className="rounded-full border-2 border-black px-4 py-2 text-sm font-bold transition-colors hover:bg-black hover:text-[#FED201] sm:px-6"
            >
              ย้อนกลับ
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex justify-between text-[11px] font-semibold sm:text-xs">
                <span>
                  หน้า {page + 1}/{PAGES.length}
                </span>
                <span>
                  ตอบแล้ว {answeredCount}/{MBTI_QUESTIONS.length}
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-black/15">
                <div className="h-full rounded-full bg-black transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <button
              type="button"
              onClick={handleNext}
              className="rounded-full bg-black px-5 py-2.5 text-sm font-bold text-[#FED201] shadow-lg transition-transform hover:scale-[1.03] active:scale-[0.98] sm:px-7"
            >
              {isLastPage ? 'ดูผลลัพธ์' : 'Next'}
            </button>
          </div>
        </nav>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  const profile = MBTI_TYPE_PROFILES[result.type];
  const completedDate = new Date(result.completedAt).toLocaleDateString('th-TH', { dateStyle: 'long' });

  return (
    <div className="min-h-[100dvh] bg-[#f6f6f6] text-black [color-scheme:light]">
      <PageHeader />
      <main className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-8">
        <div ref={resultRef} className="overflow-hidden rounded-3xl bg-white shadow-xl shadow-black/5">
          <div className="px-6 pb-8 pt-7 text-center sm:px-10" style={{ backgroundColor: YELLOW }}>
            <div className="flex items-center justify-between text-left">
              <BrandLogo className="text-[22px]" tone="dark" />
              <span className="text-xs font-semibold sm:text-sm">{completedDate}</span>
            </div>
            <p className="mt-6 text-sm font-bold uppercase tracking-[0.3em]">MBTI Test</p>
            <p className="mt-1 text-base font-semibold sm:text-lg">
              {reg.firstName} {reg.lastName}
              {reg.company && <span className="font-normal"> · {reg.company}</span>}
            </p>
            <div className="mt-4 flex justify-center gap-2 sm:gap-3">
              {result.type.split('').map((letter, i) => (
                <span
                  key={i}
                  className="flex h-16 w-14 items-center justify-center rounded-xl bg-black text-4xl font-extrabold leading-none text-[#FED201] sm:h-20 sm:w-[4.5rem] sm:text-5xl"
                  style={LEADERSHIP_HEADLINE_FONT}
                >
                  {letter}
                </span>
              ))}
            </div>
            <p className="mt-4 whitespace-pre text-sm font-semibold sm:text-base">
              {result.type
                .split('')
                .map((letter) => `${letter} = ${result.scores[letter as keyof MbtiScores]}`)
                .join('   |   ')}
            </p>
          </div>

          <div className="grid items-center gap-6 px-6 py-8 sm:px-10 md:grid-cols-[minmax(0,320px)_1fr] md:gap-10">
            <img
              src={mbtiTypeImageUrl(profile.image)}
              alt={`ภาพประกอบบุคลิกภาพ ${result.type}`}
              crossOrigin="anonymous"
              className="mx-auto w-full max-w-[260px] md:max-w-[320px]"
            />
            <div>
              <h2 className="text-lg font-bold sm:text-xl">คุณลักษณะบุคลิกภาพ : มักเป็นคนที่</h2>
              <ul className="mt-3 space-y-2 text-[15px] leading-relaxed text-gray-800">
                {profile.traits.map((t, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="mt-[0.55em] h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: YELLOW }} />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-100 px-6 py-8 sm:px-10">
            <h3 className="text-center text-sm font-bold uppercase tracking-[0.25em] text-gray-500">คะแนนแต่ละคู่ตัวอักษร</h3>
            <div className="mt-6 grid gap-6 md:grid-cols-2 md:gap-x-10">
              {MBTI_DIMENSIONS.map(({ tieWinner, other, label, tieLabel, otherLabel }) => {
                const otherFirst = LETTER_ORDER.indexOf(other) < LETTER_ORDER.indexOf(tieWinner);
                const [left, right] = otherFirst ? [other, tieWinner] : [tieWinner, other];
                const [leftLabel, rightLabel] = otherFirst ? [otherLabel, tieLabel] : [tieLabel, otherLabel];
                const leftScore = result.scores[left];
                const rightScore = result.scores[right];
                const leftPct = (leftScore / (leftScore + rightScore || 1)) * 100;
                const winner = result.type.includes(left) ? left : right;
                return (
                  <div key={label}>
                    <p className="mb-2 text-center text-xs font-semibold text-gray-500">{label}</p>
                    <div className="flex items-center gap-3">
                      <div className={`w-24 text-right sm:w-28 ${winner === left ? 'text-black' : 'text-gray-400'}`}>
                        <span className="text-2xl font-extrabold">{left}</span>
                        <span className="ml-1.5 text-lg font-bold">{leftScore}</span>
                        <p className="text-[11px] font-medium leading-tight">{leftLabel}</p>
                      </div>
                      <div className="relative h-4 flex-1 overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="absolute inset-y-0 left-0"
                          style={{ width: `${leftPct}%`, backgroundColor: winner === left ? '#000' : YELLOW }}
                        />
                        <div
                          className="absolute inset-y-0 right-0"
                          style={{ width: `${100 - leftPct}%`, backgroundColor: winner === right ? '#000' : YELLOW }}
                        />
                        <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-white" />
                      </div>
                      <div className={`w-24 sm:w-28 ${winner === right ? 'text-black' : 'text-gray-400'}`}>
                        <span className="text-lg font-bold">{rightScore}</span>
                        <span className="ml-1.5 text-2xl font-extrabold">{right}</span>
                        <p className="text-[11px] font-medium leading-tight">{rightLabel}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={handleDownloadPng}
            disabled={pngLoading}
            className="rounded-full bg-black px-7 py-3 font-bold text-[#FED201] shadow-lg transition-transform hover:scale-[1.02] disabled:opacity-50"
          >
            {pngLoading ? 'กำลังบันทึก...' : 'บันทึกผลเป็นรูปภาพ'}
          </button>
          <button
            type="button"
            onClick={handleRestart}
            className="rounded-full border-2 border-black px-7 py-3 font-bold transition-colors hover:bg-black hover:text-[#FED201]"
          >
            ทำแบบทดสอบใหม่
          </button>
          <Link
            to="/"
            className="rounded-full px-7 py-3 text-center font-bold text-black shadow-md transition-all hover:brightness-95"
            style={{ backgroundColor: YELLOW }}
          >
            กลับหน้าแรก
          </Link>
        </div>
      </main>
    </div>
  );
};

export default MbtiAssessment;
