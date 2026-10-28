import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import {
  DISC_DESCRIPTIONS,
  DISC_LABELS,
  DISC_QUESTIONS,
  type DiscRating,
  type DiscType,
} from '../data/discData';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { getDiscFeedback } from '../services/openai';

type Step = 'login' | 'assessment' | 'result';

type UserInfo = {
  name: string;
  email: string;
  company: string;
};

type QuestionAnswer = Record<0 | 1 | 2 | 3, DiscRating | null>;
type AnswersState = Record<number, QuestionAnswer>;

const RATING_VALUES: DiscRating[] = [1, 2, 3, 4];

function isDesktopLike(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

/** มือถือจริง (ไม่รวมโน้ตบุ๊กทัชสกรีนที่ใช้เมาส์) */
function isMobileExportDevice(): boolean {
  if (isDesktopLike()) return false;
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

function readDiscJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

const DISC_RESULT_KEY = 'disc_result';
const DISC_DRAFT_KEY = 'disc_draft';

const DISC_BG_URL =
  'https://axaasphuaaadzjoffznj.supabase.co/storage/v1/object/public/Assessment%20Minddojo/DISC%20Assessment/Minimal%20white%20background%20with%20cyan-yellow%20waves.png';
const DISC_HERO_URL =
  'https://axaasphuaaadzjoffznj.supabase.co/storage/v1/object/public/Assessment%20Minddojo/DISC%20Assessment/Airy%20staggered%20DISC%20character%20portraits.png';

type DiscResultPayload = {
  user: UserInfo;
  answers: AnswersState;
  scores: Record<DiscType, number>;
  primary_type: DiscType;
  ranking: DiscType[];
  completed_at: string;
  ai_feedback?: string;
};

type DiscDraftPayload = {
  step: Step;
  currentIndex: number;
  user: UserInfo;
  answers: AnswersState;
};

type DiscBootstrap = {
  step: Step;
  currentIndex: number;
  user: UserInfo;
  answers: AnswersState;
  aiFeedback: string | null;
  aiFeedbackVisible: boolean;
  aiDisplayText: string;
  didSubmitResult: boolean;
  didGenerateAi: boolean;
};

function loadDiscBootstrap(): DiscBootstrap {
  const emptyUser: UserInfo = { name: '', email: '', company: '' };
  const defaults: DiscBootstrap = {
    step: 'login',
    currentIndex: 0,
    user: emptyUser,
    answers: {},
    aiFeedback: null,
    aiFeedbackVisible: false,
    aiDisplayText: '',
    didSubmitResult: false,
    didGenerateAi: false,
  };

  const resultPayload = readDiscJson<DiscResultPayload>(DISC_RESULT_KEY);
  if (resultPayload?.user && resultPayload?.answers) {
    const savedFeedback = resultPayload.ai_feedback ?? null;
    return {
      step: 'result',
      currentIndex: 0,
      user: resultPayload.user,
      answers: resultPayload.answers,
      aiFeedback: savedFeedback,
      aiFeedbackVisible: Boolean(savedFeedback),
      aiDisplayText: savedFeedback ?? '',
      didSubmitResult: true,
      didGenerateAi: Boolean(savedFeedback),
    };
  }

  const draftPayload = readDiscJson<DiscDraftPayload>(DISC_DRAFT_KEY);
  if (draftPayload) {
    return {
      ...defaults,
      step: draftPayload.step ?? 'login',
      currentIndex: draftPayload.currentIndex ?? 0,
      user: draftPayload.user ?? emptyUser,
      answers: draftPayload.answers ?? {},
    };
  }

  return defaults;
}

function safeExportFilePart(name: string): string {
  const t = name.trim() || 'ผู้ประเมิน';
  return t.replace(/[\\/:*?"<>|]/g, '_').slice(0, 48);
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('ไม่สามารถสร้างไฟล์ PNG ได้'));
      },
      'image/png',
      1,
    );
  });
}

function asciiPngFileName(name: string): string {
  const safe = name.trim().replace(/[^\w\-]+/g, '_').replace(/_+/g, '_').slice(0, 32) || 'user';
  return `DISC_result_${safe}_${new Date().toISOString().slice(0, 10)}.png`;
}

async function trySharePngFile(
  blob: Blob,
  fileName: string,
  title: string,
): Promise<'shared' | 'cancelled' | 'failed'> {
  if (typeof navigator.share !== 'function') return 'failed';

  const file = new File([blob], fileName, { type: 'image/png' });
  try {
    await navigator.share({ files: [file], title });
    return 'shared';
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') return 'cancelled';
    return 'failed';
  }
}

async function savePngBlobDesktop(blob: Blob, fileName: string): Promise<void> {
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = fileName;
  link.href = blobUrl;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
}

// Mapping ตาม spec: หมายเลข 1–40 -> D / I / S / C
const DISC_TYPE_BY_QUESTION_NUMBER: Record<DiscType, Set<number>> = {
  D: new Set<number>([3, 7, 11, 13, 20, 22, 25, 31, 33, 39]),
  I: new Set<number>([4, 5, 12, 14, 19, 21, 26, 32, 34, 37]),
  S: new Set<number>([2, 8, 9, 15, 18, 24, 27, 29, 36, 38]),
  C: new Set<number>([1, 6, 10, 16, 17, 23, 28, 30, 35, 40]),
};

const DISC_FLOW_STAGES = [
  { id: 1, label: 'ลงทะเบียน' },
  { id: 2, label: 'อ่านวิธีทำ' },
  { id: 3, label: 'เริ่มทำแบบทดสอบ' },
] as const;

function DiscStageBar({ current }: { current: 1 | 2 | 3 }) {
  return (
    <nav aria-label="ขั้นตอนแบบทดสอบ" className="w-full">
      <ol className="flex items-stretch gap-1.5 sm:gap-2">
        {DISC_FLOW_STAGES.map((stage) => {
          const done = stage.id < current;
          const active = stage.id === current;
          return (
            <li key={stage.id} className="min-w-0 flex-1">
              <div
                className={`flex h-full items-center gap-2 rounded-2xl border px-2.5 py-2.5 transition sm:px-3 sm:py-3 ${
                  active
                    ? 'border-[#FFCC00] bg-[#FFF8D6] shadow-[0_2px_0_rgba(224,168,0,0.35)]'
                    : done
                      ? 'border-[#E8E6DF] bg-white'
                      : 'border-[#EEECE6] bg-[#F7F6F2]'
                }`}
              >
                <span
                  className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black sm:h-8 sm:w-8 sm:text-sm ${
                    active
                      ? 'bg-[#FFCC00] text-black'
                      : done
                        ? 'bg-emerald-500 text-white'
                        : 'bg-white text-gray-400 border border-[#E2DFD6]'
                  }`}
                  aria-current={active ? 'step' : undefined}
                >
                  {done ? '✓' : stage.id}
                </span>
                <span
                  className={`min-w-0 truncate text-[11px] font-bold leading-tight sm:text-sm ${
                    active ? 'text-[#6B5200]' : done ? 'text-gray-800' : 'text-gray-400'
                  }`}
                >
                  {stage.label}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

const DISC_TEST_PATH = [
  { id: 1, label: 'ข้อมูลผู้ทำแบบทดสอบ' },
  { id: 2, label: 'ทำแบบทดสอบ' },
  { id: 3, label: 'ผลลัพธ์แบบทดสอบ' },
] as const;

const STATEMENT_BADGE_STYLES = [
  'bg-rose-100 text-rose-700',
  'bg-amber-100 text-amber-800',
  'bg-emerald-100 text-emerald-700',
  'bg-sky-100 text-sky-700',
] as const;

function DiscTestPathStepper({ current }: { current: 1 | 2 | 3 }) {
  return (
    <nav aria-label="ความคืบหน้าแบบทดสอบ" className="w-full">
      <ol className="flex items-start justify-between gap-1">
        {DISC_TEST_PATH.map((stage, index) => {
          const done = stage.id < current;
          const active = stage.id === current;
          const isLast = index === DISC_TEST_PATH.length - 1;
          return (
            <li key={stage.id} className="relative flex min-w-0 flex-1 flex-col items-center text-center">
              {!isLast && (
                <span
                  className={`absolute left-[calc(50%+18px)] right-[calc(-50%+18px)] top-4 h-0.5 sm:top-[18px] ${
                    done || active ? 'bg-[#FFCC00]' : 'bg-[#E5E2DA]'
                  }`}
                  aria-hidden
                />
              )}
              <span
                className={`relative z-[1] inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-black sm:h-9 sm:w-9 sm:text-sm ${
                  done
                    ? 'bg-emerald-500 text-white'
                    : active
                      ? 'bg-[#FFCC00] text-black'
                      : 'border-2 border-[#D6D4CC] bg-white text-gray-400'
                }`}
                aria-current={active ? 'step' : undefined}
              >
                {done ? '✓' : String(stage.id).padStart(2, '0')}
              </span>
              <span
                className={`mt-2 max-w-[7.5rem] text-[10px] font-bold leading-snug sm:max-w-none sm:text-xs ${
                  active ? 'text-gray-950' : done ? 'text-gray-700' : 'text-gray-400'
                }`}
              >
                {stage.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

const DISC_PIE_ORDER: DiscType[] = ['D', 'I', 'S', 'C'];

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeDonutSlice(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number,
) {
  const sweep = Math.min(Math.max(endAngle - startAngle, 0), 359.99);
  const end = startAngle + sweep;
  const largeArc = sweep > 180 ? 1 : 0;
  const os = polarToCartesian(cx, cy, outerR, startAngle);
  const oe = polarToCartesian(cx, cy, outerR, end);
  const is = polarToCartesian(cx, cy, innerR, end);
  const ie = polarToCartesian(cx, cy, innerR, startAngle);
  return [
    `M ${os.x} ${os.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${oe.x} ${oe.y}`,
    `L ${is.x} ${is.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ie.x} ${ie.y}`,
    'Z',
  ].join(' ');
}

function DiscPieChart({
  scores,
  colors,
  primaryType,
  labels,
}: {
  scores: Record<DiscType, number>;
  colors: Record<DiscType, string>;
  primaryType: DiscType;
  labels: Record<DiscType, string>;
}) {
  const [hoverType, setHoverType] = useState<DiscType | null>(null);
  const total = DISC_PIE_ORDER.reduce((sum, t) => sum + (scores[t] ?? 0), 0);
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 96;
  const innerR = 52;

  const slices = useMemo(() => {
    if (total <= 0) return [];
    let angle = 0;
    return DISC_PIE_ORDER.map((type) => {
      const value = scores[type] ?? 0;
      const sweep = (value / total) * 360;
      const start = angle;
      const end = angle + Math.max(sweep, value > 0 ? 0.4 : 0);
      angle = end;
      const pct = Math.round((value / total) * 100);
      return { type, value, pct, start, end };
    }).filter((s) => s.value > 0);
  }, [scores, total]);

  const active = hoverType ?? primaryType;
  const activePct = total > 0 ? Math.round(((scores[active] ?? 0) / total) * 100) : 0;

  return (
    <div className="relative mx-auto flex w-full max-w-[260px] flex-col items-center">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-[220px] w-[220px] overflow-visible"
        role="img"
        aria-label="สัดส่วนคะแนน DISC"
      >
        {slices.map((slice) => {
          const isActive = slice.type === active;
          const path = describeDonutSlice(cx, cy, outerR, innerR, slice.start, slice.end);
          return (
            <path
              key={slice.type}
              d={path}
              fill={colors[slice.type]}
              opacity={hoverType && !isActive ? 0.55 : 1}
              className="cursor-pointer outline-none transition-opacity duration-150"
              onMouseEnter={() => setHoverType(slice.type)}
              onMouseLeave={() => setHoverType(null)}
              onFocus={() => setHoverType(slice.type)}
              onBlur={() => setHoverType(null)}
              tabIndex={0}
            />
          );
        })}
        <circle cx={cx} cy={cy} r={innerR - 2} fill="white" />
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          className="fill-gray-950"
          style={{ fontSize: 28, fontWeight: 800, fontFamily: '"Sukhumvit Set", sans-serif' }}
        >
          {active}
        </text>
        <text
          x={cx}
          y={cy + 18}
          textAnchor="middle"
          className="fill-gray-500"
          style={{ fontSize: 13, fontWeight: 600, fontFamily: '"Sukhumvit Set", sans-serif' }}
        >
          {activePct}%
        </text>
      </svg>
      <p className="pointer-events-none mt-1 min-h-[1.25rem] text-center text-xs font-semibold text-gray-500">
        {labels[active]}
      </p>
    </div>
  );
}

const DiscAssessment: React.FC = () => {
  const bootstrapRef = useRef(loadDiscBootstrap());
  const bootstrap = bootstrapRef.current;

  const totalBigQuestions = DISC_QUESTIONS.length;
  const totalStatements = DISC_QUESTIONS.reduce((acc, q) => acc + q.statements.length, 0);
  const [step, setStep] = useState<Step>(bootstrap.step);
  const [currentIndex, setCurrentIndex] = useState(bootstrap.currentIndex);
  const [showIntroModal, setShowIntroModal] = useState(false);

  const [user, setUser] = useState<UserInfo>(bootstrap.user);

  const [answers, setAnswers] = useState<AnswersState>(bootstrap.answers);
  const [lastRatingPop, setLastRatingPop] = useState<{
    questionId: number;
    statementIndex: 0 | 1 | 2 | 3;
    rating: DiscRating;
  } | null>(null);
  const [ratingPopNonce, setRatingPopNonce] = useState(0);
  const didSubmitResultRef = useRef(bootstrap.didSubmitResult);
  const didGenerateAiRef = useRef(bootstrap.didGenerateAi);
  const aiTypingDoneRef = useRef(bootstrap.didGenerateAi);

  const [aiFeedback, setAiFeedback] = useState<string | null>(bootstrap.aiFeedback);
  const [aiDisplayText, setAiDisplayText] = useState(bootstrap.aiDisplayText);
  const [aiFeedbackVisible, setAiFeedbackVisible] = useState(bootstrap.aiFeedbackVisible);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pngLoading, setPngLoading] = useState(false);
  const [exportActionsEnabled, setExportActionsEnabled] = useState(
    bootstrap.step === 'result' && isDesktopLike(),
  );
  const [exportError, setExportError] = useState<string | null>(null);
  const [pngPreviewUrl, setPngPreviewUrl] = useState<string | null>(null);
  const pngPreviewBlobRef = useRef<Blob | null>(null);
  const resultCardRef = useRef<HTMLDivElement | null>(null);

  const currentQuestion = DISC_QUESTIONS[currentIndex];

  // range เฉพาะ “ข้อย่อย” (statement) เพื่อให้สอดคล้องกับ mapping 1–40
  const statementRange = useMemo(() => {
    let offset = 0;
    for (let i = 0; i < currentIndex; i++) {
      offset += DISC_QUESTIONS[i].statements.length;
    }

    const start = offset + 1;
    const end = start + (currentQuestion?.statements.length ?? 0) - 1;
    return { start, end };
  }, [currentIndex, currentQuestion]);

  // เก็บ state แบบร่างเพื่อให้รีเฟรชแล้วไม่หายระหว่างทำ
  useEffect(() => {
    try {
      if (step === 'result') {
        localStorage.removeItem(DISC_DRAFT_KEY);
        return;
      }

      const draftPayload: DiscDraftPayload = {
        step,
        currentIndex,
        user,
        answers,
      };

      localStorage.setItem(DISC_DRAFT_KEY, JSON.stringify(draftPayload));
    } catch {
      // ignore
    }
  }, [step, currentIndex, user, answers]);

  const getQuestionAnswer = (questionId: number): QuestionAnswer => {
    return (
      answers[questionId] ?? {
        0: null,
        1: null,
        2: null,
        3: null,
      }
    );
  };

  const usedRatingsInCurrentQuestion = useMemo(() => {
    if (!currentQuestion) return new Set<DiscRating>();
    const qAnswer = getQuestionAnswer(currentQuestion.id);
    const used = Object.values(qAnswer).filter((v): v is DiscRating => v != null);
    return new Set<DiscRating>(used);
  }, [currentQuestion, answers]);

  const handleSelectRating = (statementIndex: 0 | 1 | 2 | 3, rating: DiscRating) => {
    if (!currentQuestion) return;

    // ใช้เพื่อเริ่มอนิเมชั่นเด้งของปุ่มที่ถูกกด
    setLastRatingPop({ questionId: currentQuestion.id, statementIndex, rating });
    setRatingPopNonce((n) => n + 1);

    setAnswers((prev) => {
      const qAnswer = prev[currentQuestion.id] ?? { 0: null, 1: null, 2: null, 3: null };
      const currentValue = qAnswer[statementIndex];

      // กดซ้ำที่เดิมให้ยกเลิกได้ (ช่วยแก้คำตอบ)
      const nextValue = currentValue === rating ? null : rating;
      return {
        ...prev,
        [currentQuestion.id]: {
          ...qAnswer,
          [statementIndex]: nextValue,
        },
      };
    });
  };

  const canNext = useMemo(() => {
    if (step !== 'assessment' || !currentQuestion) return false;
    const qAnswer = getQuestionAnswer(currentQuestion.id);
    return qAnswer[0] != null && qAnswer[1] != null && qAnswer[2] != null && qAnswer[3] != null;
  }, [step, currentQuestion, answers]);

  const answeredStatementCount = useMemo(() => {
    let count = 0;
    for (const q of DISC_QUESTIONS) {
      const qAnswer = answers[q.id];
      if (!qAnswer) continue;
      for (const v of Object.values(qAnswer)) {
        if (v != null) count += 1;
      }
    }
    return count;
  }, [answers]);

  const handlePrev = () => {
    if (currentIndex <= 0) {
      setStep('login');
      return;
    }
    setCurrentIndex((i) => i - 1);
  };

  const handleNext = () => {
    if (!currentQuestion) return;
    if (!canNext) return;

    if (currentIndex < totalBigQuestions - 1) {
      setCurrentIndex((i) => i + 1);
      return;
    }

    if (didSubmitResultRef.current) return;
    didSubmitResultRef.current = true;

    // บันทึกคำตอบและผลลัพธ์เมื่อผู้ใช้กด "ดูผลลัพธ์" (จบครบชุด)
    const finalScores = calculateScores();
    const finalPrimaryType = getPrimaryType(finalScores);
    const finalRanking: DiscType[] = ['D', 'I', 'S', 'C'].sort((a, b) => (finalScores[b] ?? 0) - (finalScores[a] ?? 0));

    const payload = {
      user: {
        name: user.name.trim(),
        email: user.email.trim(),
        company: user.company.trim(),
      },
      answers,
      scores: finalScores,
      primary_type: finalPrimaryType,
      ranking: finalRanking,
      completed_at: new Date().toISOString(),
    };

    try {
      localStorage.setItem(DISC_RESULT_KEY, JSON.stringify(payload));
      localStorage.removeItem(DISC_DRAFT_KEY);
    } catch (_) {}

    if (isSupabaseConfigured) {
      supabase
        .from('disc_results')
        .insert({
          name: payload.user.name,
          email: payload.user.email,
          company: payload.user.company,
          answers: payload.answers,
          scores: payload.scores,
          primary_type: payload.primary_type,
          ranking: payload.ranking,
          completed_at: payload.completed_at,
        })
        .then(async ({ error }) => {
          if (!error) return;

          // ถ้าสคีมายังไม่รองรับคอลัมน์บางตัว (เช่น answers/ranking) ให้ fallback แบบ minimal fields
          console.warn('DISC save to DB (full payload):', error.message);
          try {
            const { error: fallbackError } = await supabase.from('disc_results').insert({
              name: payload.user.name,
              email: payload.user.email,
              company: payload.user.company,
              scores: payload.scores,
              primary_type: payload.primary_type,
              completed_at: payload.completed_at,
            });

            if (fallbackError) {
              console.warn('DISC save to DB (fallback payload):', fallbackError.message);
            }
          } catch (e) {
            console.warn('DISC save to DB (fallback payload):', (e as Error).message);
          }
        });
    }

    setStep('result');
  };

  const calculateScores = (): Record<DiscType, number> => {
    const scores: Record<DiscType, number> = { D: 0, I: 0, S: 0, C: 0 };

    // รวมคะแนนจาก “ลำดับข้อย่อย” (1–40) ตาม mapping ที่ผู้ใช้ระบุ
    let statementNumber = 0;
    for (const q of DISC_QUESTIONS) {
      const qAnswer = answers[q.id];

      for (const [statementIdx, st] of q.statements.entries()) {
        statementNumber += 1;
        const rating = qAnswer?.[statementIdx as 0 | 1 | 2 | 3];
        if (rating == null) continue;

        const mappedType =
          DISC_TYPE_BY_QUESTION_NUMBER.D.has(statementNumber)
            ? 'D'
            : DISC_TYPE_BY_QUESTION_NUMBER.I.has(statementNumber)
              ? 'I'
              : DISC_TYPE_BY_QUESTION_NUMBER.S.has(statementNumber)
                ? 'S'
                : DISC_TYPE_BY_QUESTION_NUMBER.C.has(statementNumber)
                  ? 'C'
                  : null;

        // fallback เผื่อข้อมูลไม่ครบตาม spec
        const typeToUse = mappedType ?? st.type;
        scores[typeToUse] += rating;
      }
    }
    return scores;
  };

  const getPrimaryType = (scores: Record<DiscType, number>): DiscType => {
    const ordered: DiscType[] = ['D', 'I', 'S', 'C'];
    let best = ordered[0];
    for (const t of ordered) {
      if (scores[t] > scores[best]) best = t;
    }
    return best;
  };

  const scores = useMemo(() => calculateScores(), [answers]);
  const primaryType = useMemo(() => getPrimaryType(scores), [scores]);
  const ranking = useMemo(() => {
    const order: DiscType[] = ['D', 'I', 'S', 'C'];
    return [...order].sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0));
  }, [scores]);

  const handleRequestAiFeedback = useCallback(async () => {
    setAiFeedbackVisible(true);

    if (aiFeedback) {
      setAiDisplayText(aiFeedback);
      aiTypingDoneRef.current = true;
      return;
    }
    if (aiLoading) return;

    aiTypingDoneRef.current = false;
    didGenerateAiRef.current = true;
    setAiLoading(true);
    setAiError(null);

    const payload = {
      user: {
        name: user.name.trim(),
        email: user.email.trim(),
        company: user.company.trim(),
      },
      scores,
      primaryType,
      ranking,
    };

    try {
      const text = await getDiscFeedback(payload);
      setAiFeedback(text);

      try {
        const raw = localStorage.getItem(DISC_RESULT_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as DiscResultPayload;
          localStorage.setItem(DISC_RESULT_KEY, JSON.stringify({ ...parsed, ai_feedback: text }));
        }
      } catch (_) {}
    } catch (e) {
      setAiError((e as Error).message || 'ไม่สามารถโหลด feedback จาก AI ได้');
      didGenerateAiRef.current = false;
    } finally {
      setAiLoading(false);
    }
  }, [aiFeedback, aiLoading, primaryType, ranking, scores, user.company, user.email, user.name]);

  const typeSolid: Record<DiscType, string> = {
    D: 'bg-[#E57373] text-white',
    I: 'bg-[#FFB74D] text-white',
    S: 'bg-[#4DB6AC] text-white',
    C: 'bg-[#64B5F6] text-white',
  };

  const typeBar: Record<DiscType, string> = {
    D: 'bg-[#E57373]',
    I: 'bg-[#FFB74D]',
    S: 'bg-[#4DB6AC]',
    C: 'bg-[#64B5F6]',
  };

  const dotColor: Record<DiscType, string> = {
    D: 'bg-[#E57373]',
    I: 'bg-[#FFB74D]',
    S: 'bg-[#4DB6AC]',
    C: 'bg-[#64B5F6]',
  };

  const DISC_PIE_COLORS: Record<DiscType, string> = {
    D: '#E57373',
    I: '#FFB74D',
    S: '#4DB6AC',
    C: '#64B5F6',
  };

  const pieTotal = useMemo(
    () => DISC_PIE_ORDER.reduce((sum, t) => sum + (scores[t] ?? 0), 0),
    [scores],
  );

  // เอฟเฟกต์พิมพ์ข้อความ AI แบบเร็ว (เมื่อผู้ใช้กดเปิดดูครั้งแรกเท่านั้น)
  useEffect(() => {
    if (!aiFeedbackVisible || !aiFeedback) {
      if (!aiFeedback) {
        setAiDisplayText('');
        aiTypingDoneRef.current = false;
      }
      return;
    }

    if (aiTypingDoneRef.current) {
      setAiDisplayText(aiFeedback);
      return;
    }

    setAiDisplayText('');
    let i = 0;
    const chunkSize = 3;
    const timer = window.setInterval(() => {
      i = Math.min(aiFeedback.length, i + chunkSize);
      setAiDisplayText(aiFeedback.slice(0, i));
      if (i >= aiFeedback.length) {
        aiTypingDoneRef.current = true;
        window.clearInterval(timer);
      }
    }, 10);

    return () => window.clearInterval(timer);
  }, [aiFeedback, aiFeedbackVisible]);

  useEffect(() => {
    if (step !== 'result') {
      setExportActionsEnabled(false);
      setExportError(null);
      return;
    }

    if (isDesktopLike()) {
      setExportActionsEnabled(true);
      return;
    }

    const timer = window.setTimeout(() => setExportActionsEnabled(true), 700);
    return () => window.clearTimeout(timer);
  }, [step]);

  useEffect(() => {
    return () => {
      if (pngPreviewUrl) URL.revokeObjectURL(pngPreviewUrl);
    };
  }, [pngPreviewUrl]);

  useEffect(() => {
    if (!pngPreviewUrl) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [pngPreviewUrl]);

  const closePngPreview = useCallback(() => {
    setPngPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    pngPreviewBlobRef.current = null;
  }, []);

  const captureResultCard = async (): Promise<HTMLCanvasElement> => {
    const el = resultCardRef.current;
    if (!el) throw new Error('ไม่พบพื้นที่ผลลัพธ์');

    const desktop = isDesktopLike();
    if (desktop) {
      el.scrollIntoView({ block: 'start', behavior: 'instant' as ScrollBehavior });
      window.scrollTo(0, 0);
    }

    el.setAttribute('data-disc-exporting', 'true');
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    const onclone = (doc: Document) => {
      doc.querySelectorAll('[data-disc-exporting]').forEach((root) => {
        root.querySelectorAll('*').forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          node.style.animation = 'none';
          node.style.transition = 'none';
          node.style.opacity = '1';
          node.style.transform = 'none';
        });
      });
    };

    try {
      const { default: html2canvas } = await import('html2canvas');

      const canvas = desktop
        ? await html2canvas(el, {
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#F3F2ED',
            scale: 2,
            logging: false,
            scrollX: 0,
            scrollY: 0,
            ignoreElements: (node) => node.classList?.contains('exclude-from-export') === true,
            onclone,
          })
        : await html2canvas(el, {
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#F3F2ED',
            scale: Math.min(2, window.devicePixelRatio || 1.5),
            logging: false,
            windowHeight: el.scrollHeight,
            height: el.scrollHeight,
            ignoreElements: (node) => node.classList?.contains('exclude-from-export') === true,
            onclone,
          });

      if (canvas.width < 16 || canvas.height < 16) {
        throw new Error('ไม่สามารถสร้างภาพผลลัพธ์ได้ (ขนาดว่าง)');
      }

      return canvas;
    } finally {
      el.removeAttribute('data-disc-exporting');
    }
  };

  const hideExportUiForCapture = (): (() => void) => {
    if (typeof document === 'undefined') return () => {};
    const nodes = Array.from(document.querySelectorAll('[data-no-capture="true"]')) as HTMLElement[];
    const prev = nodes.map((n) => ({
      node: n,
      visibility: n.style.visibility,
      display: n.style.display,
    }));
    for (const { node } of prev) node.style.visibility = 'hidden';
    return () => {
      for (const { node, visibility, display } of prev) {
        node.style.visibility = visibility;
        node.style.display = display;
      }
    };
  };

  const handleDownloadPdf = async () => {
    if (!exportActionsEnabled) return;
    setPdfLoading(true);
    let restore = () => {};
    try {
      restore = hideExportUiForCapture();
      const canvas = await captureResultCard();
      restore();

      const { jsPDF } = await import('jspdf');
      const imgData = canvas.toDataURL('image/png');
      const exportBaseName = `ผลแบบทดสอบ-DISC_${safeExportFilePart(user.name)}_${new Date().toISOString().slice(0, 10)}`;

      if (isDesktopLike()) {
        const orientation = canvas.width > canvas.height ? 'landscape' : 'portrait';
        const pdf = new jsPDF({
          orientation,
          unit: 'px',
          format: [canvas.width, canvas.height],
        });
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save(`${exportBaseName}.pdf`);
      } else {
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: 'a4' });
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();

        pdf.setFillColor(10, 10, 10);
        pdf.rect(0, 0, pageW, pageH, 'F');

        const scale = Math.min(pageW / canvas.width, pageH / canvas.height);
        const drawW = canvas.width * scale;
        const drawH = canvas.height * scale;
        const x = (pageW - drawW) / 2;
        const y = (pageH - drawH) / 2;
        pdf.addImage(imgData, 'PNG', x, y, drawW, drawH);
        pdf.save(`${exportBaseName}.pdf`);
      }
    } catch (e) {
      console.warn('Export PDF:', e);
    } finally {
      restore();
      setPdfLoading(false);
    }
  };

  const openPngPreview = useCallback((blob: Blob) => {
    setPngPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(blob);
    });
    pngPreviewBlobRef.current = blob;
  }, []);

  const handleSharePngPreview = useCallback(async () => {
    const blob = pngPreviewBlobRef.current;
    if (!blob) return;

    setExportError(null);
    const fileName = asciiPngFileName(user.name);
    const outcome = await trySharePngFile(blob, fileName, 'ผลแบบทดสอบ DISC');
    if (outcome === 'shared') {
      closePngPreview();
      return;
    }
    if (outcome === 'cancelled') return;
    setExportError('ไม่สามารถเปิดเมนูแชร์ได้ — กดค้างที่ภาพด้านบน แล้วเลือก «บันทึกรูปภาพ»');
  }, [closePngPreview, user.name]);

  const handleDownloadPng = async () => {
    if (!exportActionsEnabled) return;
    setPngLoading(true);
    setExportError(null);
    let restore = () => {};
    try {
      restore = hideExportUiForCapture();
      const canvas = await captureResultCard();
      restore();

      const blob = await canvasToPngBlob(canvas);
      const fileName = asciiPngFileName(user.name);

      if (isMobileExportDevice()) {
        const shareOutcome = await trySharePngFile(blob, fileName, 'ผลแบบทดสอบ DISC');
        if (shareOutcome === 'shared') return;
        openPngPreview(blob);
        return;
      }

      await savePngBlobDesktop(blob, fileName);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'บันทึกรูปภาพไม่สำเร็จ';
      setExportError(message);
      console.warn('Export PNG:', e);
    } finally {
      restore();
      setPngLoading(false);
    }
  };

  const handleCloseIntroAndStartAssessment = () => {
    setShowIntroModal(false);
    setLastRatingPop(null);
    setRatingPopNonce(0);
    didSubmitResultRef.current = false;
    didGenerateAiRef.current = false;
    aiTypingDoneRef.current = false;
    setAiFeedback(null);
    setAiDisplayText('');
    setAiFeedbackVisible(false);
    setAiLoading(false);
    setAiError(null);
    try {
      localStorage.removeItem(DISC_RESULT_KEY);
      localStorage.removeItem(DISC_DRAFT_KEY);
    } catch (_) {}
    setAnswers({});
    setCurrentIndex(0);
    setStep('assessment');
  };

  const handleStartFromLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // ปล่อยให้การกรอกผ่านการบังคับจาก `required` ในฟอร์ม
    setShowIntroModal(true);
  };

  const handleRestart = () => {
    setShowIntroModal(false);
    setLastRatingPop(null);
    setRatingPopNonce(0);
    didSubmitResultRef.current = false;
    didGenerateAiRef.current = false;
    aiTypingDoneRef.current = false;
    setAiFeedback(null);
    setAiDisplayText('');
    setAiFeedbackVisible(false);
    setAiLoading(false);
    setAiError(null);
    setAnswers({});
    setCurrentIndex(0);
    setUser({
      name: '',
      email: '',
      company: '',
    });
    try {
      localStorage.removeItem(DISC_RESULT_KEY);
      localStorage.removeItem(DISC_DRAFT_KEY);
    } catch (_) {}
    setStep('login');
  };

  return (
    <div className="font-sukhumvit relative flex min-h-dvh flex-col overflow-x-hidden text-gray-900 [font-family:'Sukhumvit_Set',Sarabun,Anuphan,ui-sans-serif,system-ui,sans-serif]">
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-white bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('${DISC_BG_URL}')` }}
        aria-hidden
      />

      {showIntroModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6" aria-modal="true" role="dialog">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setShowIntroModal(false)}
            aria-hidden="true"
          />
          <div className="relative max-h-[min(920px,94dvh)] w-full max-w-3xl overflow-y-auto rounded-[28px] border border-[#E8E6DF] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
            <button
              type="button"
              onClick={() => setShowIntroModal(false)}
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-lg font-bold text-gray-600 transition hover:bg-gray-200 sm:right-4 sm:top-4"
              aria-label="ปิด"
            >
              ×
            </button>

            <div className="p-5 sm:p-7 md:p-8">
              <div className="mb-5 pr-8">
                <DiscStageBar current={2} />
              </div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                <div className="min-w-0 flex-1 pr-8 sm:pr-0">
                  <span className="inline-flex items-center rounded-full bg-[#FFCC00] px-3 py-1 text-[11px] font-bold text-black sm:text-xs">
                    ขั้นที่ 2 · อ่านวิธีทำ
                  </span>
                  <h2 className="mt-3 text-2xl font-bold leading-tight text-gray-950 sm:text-3xl md:text-[2.1rem]">
                    แบบทดสอบ <span className="text-[#FFCC00]">DISC</span>
                  </h2>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-gray-600 sm:text-base">
                    รู้จักตัวเองมากขึ้น ผ่านพฤติกรรมที่เป็นคุณ
                  </p>
                </div>
                <div className="mx-auto w-full max-w-[220px] shrink-0 sm:mx-0 sm:max-w-[240px] md:max-w-[280px]">
                  <img
                    src={DISC_HERO_URL}
                    alt=""
                    className="h-auto w-full object-contain drop-shadow-md"
                    decoding="async"
                  />
                </div>
              </div>

              <div className="mt-5 border-t border-[#EEECE6] pt-5 sm:mt-6 sm:pt-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-gray-950 sm:text-lg">จัดอันดับให้ตรงกับตัวคุณ</h3>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 sm:text-sm">
                    <svg className="h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
                      <circle cx="12" cy="12" r="9" strokeWidth="2" />
                      <path strokeWidth="2" strokeLinecap="round" d="M12 7v5l3 2" />
                    </svg>
                    ประมาณ 5–8 นาที
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-gray-600 sm:text-[15px]">
                  ทั้งหมด 40 ข้อ (หมายเลข 1–40) แต่ละหน้ามี 4 ข้อความ ให้คะแนน 1–4 ตามความถี่ของพฤติกรรมที่ตรงกับคุณ
                </p>

                <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
                  {(
                    [
                      { n: 1, label: 'ทำน้อยที่สุด' },
                      { n: 2, label: 'ทำน้อย' },
                      { n: 3, label: 'ทำบ่อย' },
                      { n: 4, label: 'ทำบ่อยครั้งที่สุด' },
                    ] as const
                  ).map((item) => (
                    <div
                      key={item.n}
                      className="flex flex-col items-center justify-center rounded-2xl border border-[#E5E2DA] bg-[#F7F6F2] px-2 py-4 text-center sm:py-5"
                    >
                      <span className="text-2xl font-bold text-gray-950 sm:text-3xl">{item.n}</span>
                      <span className="mt-1 text-[11px] font-semibold leading-snug text-gray-600 sm:text-xs">
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-[#F0D56A]/80 bg-[#FFF8D6] px-3.5 py-3 sm:items-center sm:px-4">
                  <span
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FFCC00] text-[11px] font-black text-black sm:mt-0"
                    aria-hidden
                  >
                    !
                  </span>
                  <p className="text-sm font-semibold leading-snug text-[#6B5200]">
                    ห้ามให้คะแนนซ้ำกัน ในแต่ละหน้า ใช้คะแนน 1, 2, 3 และ 4 ให้ครบ
                  </p>
                </div>

                <div className="mt-3 flex flex-col gap-3 rounded-2xl bg-[#F3F2ED] px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                  <p className="text-sm leading-snug text-gray-600">
                    เมื่อทำครบ 40 ข้อ ระบบจะสรุปลักษณะบุคลิกภาพของคุณเป็น D / I / S / C
                  </p>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {(
                      [
                        { ch: 'D', cls: 'bg-rose-500 text-white' },
                        { ch: 'I', cls: 'bg-amber-400 text-black' },
                        { ch: 'S', cls: 'bg-emerald-500 text-white' },
                        { ch: 'C', cls: 'bg-sky-500 text-white' },
                      ] as const
                    ).map((item) => (
                      <span
                        key={item.ch}
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-black ${item.cls}`}
                      >
                        {item.ch}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseIntroAndStartAssessment}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FFCC00] px-5 py-4 text-base font-bold text-black shadow-[0_4px_0_#E0A800] transition hover:bg-[#FFD633] active:translate-y-0.5 active:shadow-[0_2px_0_#E0A800] sm:text-lg"
              >
                เริ่มทำแบบทดสอบ
                <span aria-hidden>→</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-30 shrink-0 border-b border-black/[0.04] bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-8 sm:py-3.5">
          <Link
            to="/"
            className="flex items-center gap-2.5 rounded-xl px-1 py-1 transition hover:opacity-80"
            aria-label="กลับหน้าหลัก"
          >
            <BrandLogo className="text-[26px] sm:text-[30px]" tone="dark" />
          </Link>
          <div className="flex items-center gap-2.5">
            {step === 'login' && !showIntroModal && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FFCC00]/60 bg-[#FFF8D6] px-3 py-1.5 text-[11px] font-bold text-[#7A5C00] sm:text-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-[#FFCC00]" aria-hidden />
                ขั้นที่ 1 · ลงทะเบียน
              </span>
            )}
            {step === 'result' && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-800 sm:text-xs">
                เสร็จแล้ว
              </span>
            )}
          </div>
        </div>
      </header>

      <main
        className={`mx-auto flex w-full flex-1 flex-col px-4 sm:px-8 ${
          step === 'login'
            ? 'max-w-7xl justify-center py-5 sm:py-7 lg:py-6'
            : step === 'result'
              ? 'max-w-4xl py-8 sm:py-12'
              : 'max-w-4xl py-6 sm:py-10'
        }`}
      >
        {step === 'login' && (
          <div className="disc-login-enter grid w-full items-center gap-7 lg:grid-cols-[1.12fr_0.88fr] lg:gap-12 xl:gap-16">
            <div className="order-2 flex min-h-0 flex-col text-center lg:order-1 lg:text-left">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[#9A7200] sm:mb-4 sm:text-xs">
                MindDoJo Assessment
              </p>
              <h1 className="disc-hero-title overflow-visible text-[1.9rem] font-bold leading-[1.38] tracking-normal text-gray-950 sm:text-[2.75rem] xl:text-[3.15rem]">
                <span className="block overflow-visible">รู้จักสไตล์พฤติกรรมของคุณ</span>
                <span className="mt-1 block overflow-visible sm:mt-1.5">
                  <span className="disc-thai-tone inline-block align-baseline">ด้วย</span>
                  แบบทดสอบ <span className="text-[#FFCC00]">DISC</span>
                </span>
              </h1>
              <p className="mx-auto mt-3 max-w-lg text-[15px] leading-relaxed text-gray-600 sm:mt-4 sm:text-base lg:mx-0">
                ค้นหาสไตล์การทำงานของคุณใน 4 มิติ ใช้เวลาประมาณ 5–8 นาที
              </p>

              <div className="mx-auto mt-4 flex flex-wrap items-center justify-center gap-2 lg:mx-0 lg:justify-start">
                {(
                  [
                    { ch: 'D', tip: 'Dominance', cls: 'bg-rose-500 text-white' },
                    { ch: 'I', tip: 'Influence', cls: 'bg-amber-400 text-black' },
                    { ch: 'S', tip: 'Steadiness', cls: 'bg-emerald-500 text-white' },
                    { ch: 'C', tip: 'Compliance', cls: 'bg-sky-500 text-white' },
                  ] as const
                ).map((item) => (
                  <span
                    key={item.ch}
                    title={item.tip}
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-xl text-sm font-black shadow-sm ${item.cls}`}
                  >
                    {item.ch}
                  </span>
                ))}
                <span className="ml-1 text-xs font-semibold text-gray-500 sm:text-sm">40 ข้อ · ผลทันที</span>
              </div>

              <div className="relative mx-auto mt-5 w-full lg:mx-0 lg:mt-6">
                <img
                  src={DISC_HERO_URL}
                  alt="DISC character portraits — Dominance, Influence, Steadiness, Compliance"
                  className="disc-hero-art mx-auto h-auto w-full max-h-[min(56vh,640px)] object-contain sm:max-h-[min(62vh,760px)] lg:max-h-[min(66vh,820px)]"
                  decoding="async"
                />
              </div>
            </div>

            <div className="order-1 w-full lg:order-2 lg:max-w-[28rem] lg:justify-self-end xl:max-w-[30rem]">
              <div className="disc-login-card overflow-hidden rounded-[28px] border border-[#E2DFD6] bg-white/95 shadow-[0_20px_50px_rgba(15,23,42,0.1)] backdrop-blur-sm sm:rounded-[32px]">
                <div className="h-1.5 w-full bg-gradient-to-r from-[#FFCC00] via-[#FFE566] to-[#FFCC00]" aria-hidden />
                <div className="p-6 sm:p-8 lg:p-9">
                  <div className="mb-5">
                    <DiscStageBar current={1} />
                  </div>
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-950 sm:text-2xl">ลงทะเบียน</h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
                      กรอกข้อมูลให้ครบเพื่อไปขั้นอ่านวิธีทำ
                    </p>
                  </div>

                  <form onSubmit={handleStartFromLogin} className="space-y-4">
                    {(
                      [
                        { id: 'disc-name', label: 'ชื่อ–นามสกุล', type: 'text', autoComplete: 'name', key: 'name' as const, ph: 'เช่น สมชาย ใจดี' },
                        { id: 'disc-email', label: 'อีเมล', type: 'email', autoComplete: 'email', key: 'email' as const, ph: 'your@email.com' },
                        { id: 'disc-company', label: 'บริษัท / องค์กร', type: 'text', autoComplete: 'organization', key: 'company' as const, ph: 'ชื่อบริษัทหรือหน่วยงาน' },
                      ] as const
                    ).map((f) => (
                      <label key={f.id} htmlFor={f.id} className="block">
                        <span className="mb-1.5 block text-sm font-bold text-gray-800">{f.label}</span>
                        <input
                          id={f.id}
                          type={f.type}
                          autoComplete={f.autoComplete}
                          value={user[f.key]}
                          onChange={(e) => setUser((u) => ({ ...u, [f.key]: e.target.value }))}
                          placeholder={f.ph}
                          required
                          className="disc-login-input w-full rounded-2xl border border-[#D6D4CC] bg-[#FAFAF8] px-4 py-3.5 text-base text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#FFCC00] focus:bg-white focus:ring-4 focus:ring-[#FFCC00]/25"
                        />
                      </label>
                    ))}

                    <button
                      type="submit"
                      className="group mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FFCC00] px-5 py-4 text-base font-bold text-black shadow-[0_4px_0_#E0A800] transition hover:bg-[#FFD633] active:translate-y-0.5 active:shadow-[0_2px_0_#E0A800] sm:text-lg"
                    >
                      เริ่มทำแบบทดสอบ
                      <span className="transition-transform group-hover:translate-x-0.5" aria-hidden>
                        →
                      </span>
                    </button>
                    <p className="text-center text-xs leading-relaxed text-gray-500">
                      ข้อมูลใช้แสดงในหน้าผลลัพธ์เท่านั้น · ไม่แชร์ต่อโดยไม่ได้รับอนุญาต
                    </p>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'assessment' && currentQuestion && (
          <div key={currentQuestion.id} className="disc-animate-enter w-full">
            <div className="overflow-hidden rounded-[28px] border border-[#E8E6DF] bg-white shadow-[0_16px_48px_rgba(15,23,42,0.08)] sm:rounded-[32px]">
              <div className="border-b border-[#EEECE6] px-5 py-5 sm:px-8 sm:py-6">
                <DiscTestPathStepper current={2} />
              </div>

              <div className="px-4 py-4 sm:px-8 sm:py-6">
                <div className="space-y-2.5">
                  <div className="flex flex-col gap-1 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2">
                    <p className="font-bold text-[#C9A000]">
                      ข้อที่ {statementRange.start} – {statementRange.end} จาก {totalStatements}
                    </p>
                    <p className="font-semibold text-gray-600">
                      ตอบแล้ว{' '}
                      <span className="font-black text-gray-950">{answeredStatementCount}</span>
                      {' / '}
                      {totalStatements} ข้อ
                      <span className="ml-1.5 text-gray-400">
                        (
                        {totalStatements > 0
                          ? Math.round((answeredStatementCount / totalStatements) * 100)
                          : 0}
                        %)
                      </span>
                    </p>
                  </div>
                  <div
                    className="relative h-3.5 w-full overflow-hidden rounded-full bg-[#F0EEE8] sm:h-3"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={totalStatements}
                    aria-valuenow={answeredStatementCount}
                    aria-label={`ความคืบหน้าแบบทดสอบ ${answeredStatementCount} จาก ${totalStatements} ข้อ`}
                  >
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#FFCC00] to-[#FFE566] transition-[width] duration-300 ease-out"
                      style={{
                        width: `${totalStatements > 0 ? (answeredStatementCount / totalStatements) * 100 : 0}%`,
                      }}
                    />
                    {answeredStatementCount > 0 && answeredStatementCount < totalStatements ? (
                      <span
                        className="pointer-events-none absolute top-1/2 z-[1] h-4 w-4 -translate-y-1/2 rounded-full border-2 border-white bg-[#FFCC00] shadow-sm transition-[left] duration-300 ease-out"
                        style={{
                          left: `calc(${(answeredStatementCount / totalStatements) * 100}% - 8px)`,
                        }}
                        aria-hidden
                      />
                    ) : null}
                  </div>
                </div>

                <h2 className="mt-4 text-base font-bold leading-snug text-gray-950 sm:text-xl">
                  จัดลำดับพฤติกรรมต่อไปนี้ตามความถี่ในชีวิตประจำวันของคุณ
                </h2>
                <p className="mt-2 text-[13px] leading-relaxed text-gray-500 sm:text-sm">
                  1 = ทำน้อยที่สุด | 4 = ทำบ่อยครั้งที่สุด (แต่ละระดับใช้ได้ครั้งเดียว)
                </p>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:mt-5 sm:grid-cols-2 sm:gap-4">
                  {currentQuestion.statements.map((st, statementIdx) => {
                    const statementIndex = statementIdx as 0 | 1 | 2 | 3;
                    const qAnswer = getQuestionAnswer(currentQuestion.id);
                    const selectedForThisStatement = qAnswer[statementIndex];
                    const isRatingPopStatement =
                      lastRatingPop?.questionId === currentQuestion.id &&
                      lastRatingPop?.statementIndex === statementIndex;

                    return (
                      <div
                        key={`${currentQuestion.id}-${statementIdx}`}
                        className="rounded-2xl border border-[#E8E6DF] bg-[#FCFCFB] p-3.5 sm:p-5"
                      >
                        <div className="flex items-start gap-2.5 sm:gap-3">
                          <span
                            className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-black ${STATEMENT_BADGE_STYLES[statementIdx]}`}
                          >
                            {statementIdx + 1}
                          </span>
                          <p className="disc-statement-text min-w-0 flex-1 text-gray-800">
                            {st.text}
                          </p>
                        </div>
                        <div className="mt-3.5 grid grid-cols-4 gap-2 sm:mt-4">
                          {RATING_VALUES.map((rating) => {
                            const isSelected = selectedForThisStatement === rating;
                            const isUsedElsewhere = !isSelected && usedRatingsInCurrentQuestion.has(rating);
                            const disabled = isUsedElsewhere;
                            const isRatingPop = isRatingPopStatement && lastRatingPop?.rating === rating;

                            return (
                              <button
                                key={`${rating}-${isRatingPop ? ratingPopNonce : 'stable'}`}
                                type="button"
                                onClick={() => {
                                  if (disabled) return;
                                  handleSelectRating(statementIndex, rating);
                                }}
                                disabled={disabled}
                                className={`min-h-[44px] rounded-xl border py-2.5 text-base font-bold transition-all touch-manipulation sm:min-h-0 sm:py-2.5 sm:text-sm sm:font-black ${
                                  isSelected
                                    ? 'border-[#FFCC00] bg-[#FFCC00] text-black shadow-sm'
                                    : disabled
                                      ? 'cursor-not-allowed border-[#EEECE6] bg-[#F3F2ED] text-gray-400'
                                      : 'border-[#D6D4CC] bg-white text-gray-700 active:bg-gray-50 hover:border-gray-400 hover:bg-white'
                                } ${isRatingPop ? 'disc-rating-pop' : ''}`}
                                aria-pressed={isSelected}
                              >
                                {rating}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 flex flex-col-reverse items-stretch justify-between gap-3 border-t border-[#EEECE6] pt-5 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl px-3 py-3 text-sm font-semibold text-gray-500 transition hover:bg-gray-50 hover:text-gray-800 touch-manipulation sm:min-h-0 sm:py-2.5"
                  >
                    <span aria-hidden>←</span>
                    {currentIndex === 0 ? 'กลับไปข้อมูลผู้ทำแบบทดสอบ' : 'ข้อก่อนหน้า'}
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!canNext}
                    className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-[#FFCC00] px-6 py-3.5 text-base font-bold text-black shadow-[0_3px_0_#E0A800] transition hover:bg-[#FFD633] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none touch-manipulation active:translate-y-0.5 active:shadow-[0_2px_0_#E0A800]"
                  >
                    {currentIndex < totalBigQuestions - 1 ? 'ข้อถัดไป' : 'ดูผลลัพธ์'}
                    <span aria-hidden>→</span>
                  </button>
                </div>
              </div>
            </div>

            <p className="mt-4 text-center text-xs font-medium text-gray-500 sm:text-sm">
              <span className="mr-1 text-[#FFCC00]" aria-hidden>
                ✦
              </span>
              ไม่มีคำตอบที่ถูกหรือผิด มีแค่คำตอบที่เป็นคุณ
            </p>
          </div>
        )}

        {step === 'result' && (
          <div ref={resultCardRef} className="w-full space-y-5">
            {(() => {
              const thaiShort: Record<DiscType, string> = {
                D: 'มุ่งมั่น',
                I: 'มีอิทธิพล',
                S: 'มั่นคง',
                C: 'รอบคอบ',
              };
              const enShort: Record<DiscType, string> = {
                D: 'Dominance',
                I: 'Influence',
                S: 'Steadiness',
                C: 'Conscientiousness',
              };
              const traitTips: Record<DiscType, string[]> = {
                D: ['มุ่งผลลัพธ์', 'กล้าตัดสินใจ', 'ชอบความท้าทาย'],
                I: ['สร้างแรงบันดาลใจ', 'สื่อสารเก่ง', 'สร้างความสัมพันธ์'],
                S: ['ใจเย็น น่าเชื่อถือ', 'ทำงานเป็นทีม', 'สร้างความต่อเนื่อง'],
                C: ['รอบคอบ แม่นยำ', 'เน้นมาตรฐาน', 'วิเคราะห์ข้อมูลดี'],
              };
              const primaryPct = pieTotal > 0 ? Math.round(((scores[primaryType] ?? 0) / pieTotal) * 100) : 0;

              return (
                <>
                  <div className="rounded-[28px] border border-[#E8E6DF] bg-white px-5 py-4 shadow-sm sm:px-7">
                    <DiscTestPathStepper current={3} />
                  </div>

                  <header className="px-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">Your DISC Profile</p>
                    <h1 className="mt-1.5 text-2xl font-bold text-gray-950 sm:text-3xl">ผลลัพธ์แบบทดสอบ DISC</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-500 sm:text-base">
                      สรุปสไตล์พฤติกรรมของคุณจากคะแนนทั้ง 4 มิติ เพื่อนำไปใช้พัฒนาการทำงานและการสื่อสาร
                    </p>
                  </header>

                  <section className="overflow-hidden rounded-[24px] border border-[#E8E6DF] bg-white p-5 shadow-[0_12px_36px_rgba(15,23,42,0.06)] sm:p-7">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:gap-6">
                      <div
                        className={`flex h-28 w-28 shrink-0 flex-col items-center justify-center rounded-[22px] shadow-md sm:h-[7.5rem] sm:w-[7.5rem] ${typeSolid[primaryType]}`}
                      >
                        <span className="text-4xl font-black leading-none sm:text-5xl">{primaryType}</span>
                        <span className="mt-1.5 text-sm font-bold">{thaiShort[primaryType]}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[#C9A000]">สไตล์ที่โดดเด่นของคุณ</p>
                        <h2 className="mt-1 text-2xl font-bold text-gray-950 sm:text-3xl">{enShort[primaryType]}</h2>
                        <p className="mt-2 text-sm leading-relaxed text-gray-600 sm:text-[15px]">
                          {DISC_DESCRIPTIONS[primaryType]}
                        </p>
                      </div>
                      <div className="shrink-0 border-t border-[#EEECE6] pt-4 text-left lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0 lg:text-right">
                        <p className="text-xs font-semibold text-gray-500">สัดส่วนคะแนน {primaryType}</p>
                        <p className="mt-1 text-4xl font-black tracking-tight text-[#C9A000] sm:text-5xl">{primaryPct}%</p>
                        <p className="mt-1 text-xs font-medium text-gray-400">สูงสุดในทั้ง 4 มิติ</p>
                      </div>
                    </div>
                  </section>

                  <section className="overflow-hidden rounded-[24px] border border-[#E8E6DF] bg-white p-5 shadow-sm sm:p-7">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-base font-bold text-gray-950 sm:text-lg">สัดส่วนคะแนนทั้ง 4 มิติ</h3>
                      <span className="rounded-full bg-[#FFF4C2] px-3 py-1 text-[11px] font-bold text-[#8A6A00]">
                        รวมทั้งหมด 100%
                      </span>
                    </div>
                    <div className="mt-5 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                      <DiscPieChart
                        scores={scores}
                        colors={DISC_PIE_COLORS}
                        primaryType={primaryType}
                        labels={DISC_LABELS}
                      />
                      <div className="space-y-4">
                        {(['D', 'I', 'S', 'C'] as DiscType[]).map((type) => {
                          const pct = pieTotal > 0 ? Math.round(((scores[type] ?? 0) / pieTotal) * 100) : 0;
                          return (
                            <div key={type} className="space-y-1.5">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5">
                                  <span
                                    className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-black text-white ${dotColor[type]}`}
                                  >
                                    {type}
                                  </span>
                                  <span className="text-sm font-bold text-gray-800">{thaiShort[type]}</span>
                                </div>
                                <span className="text-sm font-black text-gray-950">{pct}%</span>
                              </div>
                              <div className="h-2.5 overflow-hidden rounded-full bg-[#F0EEE8]">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${typeBar[type]}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </section>

                  <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {(['D', 'I', 'S', 'C'] as DiscType[]).map((type) => (
                      <div key={type} className="rounded-2xl border border-[#E8E6DF] bg-white p-4 shadow-sm sm:p-5">
                        <span
                          className={`inline-flex h-10 w-10 items-center justify-center rounded-xl text-sm font-black text-white ${dotColor[type]}`}
                        >
                          {type}
                        </span>
                        <p className="mt-3 text-base font-bold text-gray-950">{thaiShort[type]}</p>
                        <p className="text-xs font-semibold text-gray-400">{enShort[type]}</p>
                        <ul className="mt-3 space-y-1">
                          {traitTips[type].map((tip) => (
                            <li key={tip} className="flex items-start gap-1.5 text-xs leading-snug text-gray-600">
                              <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dotColor[type]}`} aria-hidden />
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </section>

                  <section className="overflow-hidden rounded-[24px] border border-[#F0D56A]/80 bg-gradient-to-br from-[#FFFCEB] via-white to-white p-5 shadow-sm sm:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#FFCC00] text-sm text-black" aria-hidden>
                            ✦
                          </span>
                          <h3 className="text-base font-bold text-gray-950">AI Feedback</h3>
                          {!aiFeedbackVisible ? (
                            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-500">
                              ยังไม่ได้เปิดดู
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 text-sm text-gray-600">
                          สรุปภาพรวม DISC: {primaryType} ({thaiShort[primaryType]}) · คะแนนสูงสุด {primaryPct}%
                        </p>
                        {!aiFeedbackVisible ? (
                          <p className="mt-1 text-sm text-gray-500">กดเพื่อรับคำแนะนำส่วนบุคคลจาก AI ตามโปรไฟล์ของคุณ</p>
                        ) : null}
                        {aiFeedbackVisible ? (
                          <div className="mt-3">
                            {aiLoading ? (
                              <p className="text-sm text-gray-500">กำลังสร้าง feedback...</p>
                            ) : aiError ? (
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-red-600">{aiError}</p>
                                <button
                                  type="button"
                                  onClick={() => void handleRequestAiFeedback()}
                                  className="text-sm font-bold text-[#8A6A00] underline"
                                >
                                  ลองอีกครั้ง
                                </button>
                              </div>
                            ) : aiFeedback ? (
                              <div className="whitespace-pre-wrap break-words rounded-2xl border border-[#F0E6B8] bg-white/90 p-4 text-sm leading-relaxed text-gray-700">
                                {aiDisplayText}
                                {aiDisplayText.length < aiFeedback.length ? (
                                  <span className="text-gray-500">▋</span>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                      {!aiFeedbackVisible ? (
                        <button
                          type="button"
                          onClick={() => void handleRequestAiFeedback()}
                          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#FFCC00] px-5 py-3.5 text-sm font-bold text-black shadow-[0_3px_0_#E0A800] transition hover:bg-[#FFD633]"
                        >
                          ดู AI Feedback
                          <span aria-hidden>→</span>
                        </button>
                      ) : null}
                    </div>
                  </section>

                  <p className="px-1 text-center text-[11px] leading-relaxed text-gray-400 sm:text-left">
                    ผลลัพธ์นี้เป็นเครื่องมือประเมินสไตล์พฤติกรรมเพื่อการพัฒนา ไม่ใช่การวินิจฉัยทางจิตวิทยา
                  </p>

                  <div className="space-y-3 pt-1" data-no-capture="true">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={handleDownloadPdf}
                        disabled={!exportActionsEnabled || pdfLoading || pngLoading}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FFCC00] px-5 py-3.5 text-sm font-bold text-black shadow-[0_3px_0_#E0A800] transition hover:bg-[#FFD633] disabled:opacity-50"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3" />
                        </svg>
                        {pdfLoading ? 'กำลังสร้าง PDF...' : 'ดาวน์โหลด PDF'}
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadPng}
                        disabled={!exportActionsEnabled || pdfLoading || pngLoading}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FFCC00] px-5 py-3.5 text-sm font-bold text-black shadow-[0_3px_0_#E0A800] transition hover:bg-[#FFD633] disabled:opacity-50"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <path d="M21 15l-5-5L5 21" />
                        </svg>
                        {pngLoading
                          ? 'กำลังสร้าง PNG...'
                          : isMobileExportDevice()
                            ? 'บันทึกเป็นรูปภาพ'
                            : 'ดาวน์โหลด PNG'}
                      </button>
                    </div>
                    {exportError ? <p className="text-center text-xs font-medium text-amber-700">{exportError}</p> : null}
                    {isMobileExportDevice() && !exportActionsEnabled ? (
                      <p className="text-center text-[11px] text-gray-500">กำลังเตรียมปุ่มบันทึกผลลัพธ์...</p>
                    ) : isMobileExportDevice() ? (
                      <p className="text-center text-[11px] text-gray-500">
                        บนมือถือ: กดบันทึกเป็นรูปภาพ → เลือก «บันทึกรูปภาพ» หรือกดค้างที่ภาพเพื่อบันทึก
                      </p>
                    ) : null}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={handleRestart}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#D6D4CC] bg-white px-5 py-3.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                          <path d="M23 4v6h-6M1 20v-6h6" />
                          <path d="M3.5 9a9 9 0 0 1 14.8-3.2L23 10M1 14l4.7 4.2A9 9 0 0 0 20.5 15" />
                        </svg>
                        ทำแบบทดสอบใหม่
                      </button>
                      <Link
                        to="/"
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#D6D4CC] bg-white px-5 py-3.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                          <path d="M3 10.5L12 3l9 7.5" />
                          <path d="M5 10v10h14V10" />
                        </svg>
                        กลับหน้าแรก
                      </Link>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </main>

      {pngPreviewUrl ? (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-white/95 backdrop-blur-sm"
            onClick={closePngPreview}
            aria-label="ปิด"
          />
          <div className="relative z-10 w-full max-w-lg max-h-[92dvh] flex flex-col rounded-t-3xl sm:rounded-3xl border border-gray-200 bg-gradient-to-b from-white to-gray-50 shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-gray-900">บันทึกผลลัพธ์เป็นรูปภาพ</p>
                <p className="text-[11px] text-gray-500 mt-0.5">กดค้างที่ภาพ → เลือก «บันทึกรูปภาพ»</p>
              </div>
              <button
                type="button"
                onClick={closePngPreview}
                className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                ปิด
              </button>
            </div>
            <div className="flex-1 overflow-auto p-3 bg-gray-100">
              <img
                src={pngPreviewUrl}
                alt="ผลแบบทดสอบ DISC"
                className="w-full h-auto rounded-xl border border-gray-200 bg-gray-50"
              />
            </div>
            <div className="p-3 border-t border-gray-200 space-y-2">
              {exportError ? (
                <p className="text-xs text-amber-700 text-center">{exportError}</p>
              ) : null}
              <button
                type="button"
                onClick={() => void handleSharePngPreview()}
                className="w-full py-3 rounded-xl font-bold bg-yellow-400 text-black hover:bg-yellow-300 transition-all text-sm"
              >
                แชร์ / บันทึกรูปภาพ
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <footer className="py-6 border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-6 text-center text-gray-500 text-sm">
          © {new Date().getFullYear()} MindDoJo CO., LTD.
        </div>
      </footer>
    </div>
  );
};

export default DiscAssessment;
