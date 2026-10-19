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
import { Chart } from 'react-google-charts';
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

  const progress = totalStatements > 0 ? (statementRange.end / totalStatements) * 100 : 0;

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

  const handlePrev = () => {
    if (currentIndex <= 0) return;
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
  const maxScore = useMemo(() => Math.max(0, ...Object.values(scores)), [scores]);
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

  const typeStyle: Record<DiscType, string> = {
    D: 'bg-rose-100 border-rose-300 text-rose-700',
    I: 'bg-amber-100 border-amber-300 text-amber-800',
    S: 'bg-emerald-100 border-emerald-300 text-emerald-800',
    C: 'bg-sky-100 border-sky-300 text-sky-800',
  };

  const typeSolid: Record<DiscType, string> = {
    D: 'bg-rose-500 border-rose-600 text-white shadow-rose-500/25',
    I: 'bg-amber-500 border-amber-600 text-white shadow-amber-500/25',
    S: 'bg-emerald-500 border-emerald-600 text-white shadow-emerald-500/25',
    C: 'bg-sky-500 border-sky-600 text-white shadow-sky-500/25',
  };

  const typeBar: Record<DiscType, string> = {
    D: 'bg-rose-500',
    I: 'bg-amber-500',
    S: 'bg-emerald-500',
    C: 'bg-sky-500',
  };

  const dotColor: Record<DiscType, string> = {
    D: 'bg-rose-500',
    I: 'bg-amber-500',
    S: 'bg-emerald-500',
    C: 'bg-sky-500',
  };

  const DISC_PIE_COLORS: Record<DiscType, string> = {
    D: '#f43f5e', // rose-500
    I: '#f59e0b', // amber-500
    S: '#10b981', // emerald-500
    C: '#0ea5e9', // sky-500
  };

  const pieTypes = ['D', 'I', 'S', 'C'] as DiscType[];
  const pieTotal = useMemo(() => pieTypes.reduce((sum, t) => sum + (scores[t] ?? 0), 0), [scores]);
  const pieChartData = useMemo(() => {
    return [
      ['Type', 'Score', { role: 'tooltip', type: 'string' }],
      ...pieTypes.map((t) => {
        const score = scores[t] ?? 0;
        const pct = pieTotal > 0 ? Math.round((score / pieTotal) * 100) : 0;
        const label = `${t}\n${pct}%`;
        const tooltip = `${DISC_LABELS[t]} (${t})\nScore: ${score}\nPercent: ${pct}%`;
        return [label, score, tooltip];
      }),
    ];
  }, [pieTotal, scores]);

  const pieChartOptions = useMemo(() => {
    const maxScoreVal = Math.max(0, ...pieTypes.map((t) => scores[t] ?? 0));
    const highlightTypes = maxScoreVal > 0 ? pieTypes.filter((t) => (scores[t] ?? 0) === maxScoreVal) : [];
    const slices = Object.fromEntries(
      pieTypes.map((t, idx) => {
        const isHighlight = highlightTypes.includes(t);
        return [
          idx,
          {
            color: isHighlight ? DISC_PIE_COLORS[t] : '#9ca3af', // เทาจาง
            ...(isHighlight ? { offset: 0.1 } : {}),
          },
        ];
      }),
    );

    return {
      pieHole: 0.45,
      is3D: true,
      pieSliceText: 'label',
      pieSliceTextStyle: { color: '#ffffff', fontSize: 12, bold: true },
      legend: 'none',
      slices,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'selection' },
    };
  }, [DISC_PIE_COLORS, pieTypes, primaryType]);

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
    <div className="md-page">
      {showIntroModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={handleCloseIntroAndStartAssessment}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-[#D6D4CC] bg-white shadow-2xl">
            <div className="relative p-8 text-center md:p-10">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FFCC00] text-3xl shadow-md shadow-yellow-400/40">
                <span aria-hidden>🧠</span>
              </div>
              <h2 className="mb-4 text-2xl font-black tracking-tight text-gray-950 md:text-3xl">แบบทดสอบ DISC</h2>
              <div className="mb-8 text-sm leading-relaxed text-gray-600 md:text-base">
                แบบทดสอบนี้มี <span className="font-bold text-gray-900">40 ข้อ</span> (หมายเลข 1–40) ให้คุณ{' '}
                <span className="font-bold text-gray-900">จัดอันดับคะแนน 1–4</span> โดย
                <span className="font-bold text-gray-900"> ห้ามใช้เลขซ้ำกันในแต่ละหน้าจอ</span> (1 = ทำน้อยที่สุด, 4 =
                ทำบ่อยครั้งที่สุด)
                <div className="mt-3 text-gray-500">เมื่อทำครบ ระบบจะสรุปบุคลิกภาพหลักของคุณเป็น D / I / S / C</div>
              </div>
              <button type="button" onClick={handleCloseIntroAndStartAssessment} className="md-btn-primary w-full !rounded-xl !py-3.5">
                เริ่มทำแบบทดสอบ
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-30 border-b border-[#D6D4CC] bg-[#F3F2ED]/95 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 py-4">
          <Link to="/" className="flex items-center gap-3">
            <BrandLogo className="text-[26px]" tone="dark" />
          </Link>
          <div className="flex items-center gap-3">
            {step === 'assessment' && (
              <span className="rounded-full border border-[#D6D4CC] bg-white px-3 py-1 text-xs font-bold text-gray-800">
                ข้อ {statementRange.start}–{statementRange.end} / {totalStatements}
              </span>
            )}
            {step === 'login' && (
              <span className="hidden text-xs font-bold uppercase tracking-[0.14em] text-[#9A7200] sm:inline">
                Personality · DISC
              </span>
            )}
          </div>
        </div>
      </header>

      <main
        className={`mx-auto w-full flex-1 px-4 py-8 sm:px-6 sm:py-12 ${
          step === 'login' ? 'max-w-5xl' : step === 'result' ? 'max-w-4xl' : 'max-w-2xl'
        }`}
      >
        {step === 'login' && (
          <div className="w-full">
            <div className="mb-10 text-center">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#9A7200]">01 / Register</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">
                ลงทะเบียนแบบทดสอบ{' '}
                <span className="relative inline-block">
                  DISC
                  <span className="absolute inset-x-0 bottom-1 -z-10 h-3 rounded-sm bg-[#FFCC00]" aria-hidden />
                </span>
              </h1>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-gray-600 sm:text-base">
                40 ข้อ · จัดอันดับ 1–4 ในแต่ละชุด · ใช้เวลาประมาณ 5–8 นาที
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
                {(
                  [
                    { ch: 'D', label: 'มุ่งมั่น', cls: 'bg-rose-600 text-white shadow-lg shadow-rose-600/35' },
                    { ch: 'I', label: 'มีอิทธิพล', cls: 'bg-amber-500 text-white shadow-lg shadow-amber-500/35' },
                    { ch: 'S', label: 'มั่นคง', cls: 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/35' },
                    { ch: 'C', label: 'รอบคอบ', cls: 'bg-sky-600 text-white shadow-lg shadow-sky-600/35' },
                  ] as const
                ).map(({ ch, label, cls }) => (
                  <div
                    key={ch}
                    className={`flex min-w-[4.5rem] flex-col items-center rounded-2xl px-3 py-2.5 shadow-md ${cls}`}
                  >
                    <span className="text-2xl font-black leading-none">{ch}</span>
                    <span className="mt-1 text-[10px] font-bold opacity-90">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch">
              <ol className="md-card flex flex-col justify-center gap-3 p-5 sm:p-6">
                {[
                  { n: '01', t: 'กรอกข้อมูล', d: 'ชื่อ อีเมล และองค์กร' },
                  { n: '02', t: 'อ่านวิธีทำ', d: 'ป๊อปอัพสั้น ๆ ก่อนเริ่ม' },
                  { n: '03', t: 'ทำแบบทดสอบ', d: '10 ชุด · ชุดละ 4 ข้อความ' },
                  { n: '04', t: 'ดูผล + AI', d: 'สรุปบุคลิกภาพหลักทันที' },
                ].map((row) => (
                  <li key={row.n} className="flex items-start gap-3 rounded-xl bg-[#F3F2ED] px-3.5 py-3">
                    <span className="inline-flex h-8 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FFCC00] text-xs font-black text-black">
                      {row.n}
                    </span>
                    <span>
                      <span className="block text-sm font-bold text-gray-950">{row.t}</span>
                      <span className="mt-0.5 block text-xs text-gray-600">{row.d}</span>
                    </span>
                  </li>
                ))}
              </ol>

              <div className="md-card p-6 sm:p-8">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black text-gray-950">ข้อมูลผู้ทำแบบทดสอบ</h2>
                    <p className="mt-1 text-sm text-gray-600">กรอกให้ครบเพื่อไปขั้นตอนถัดไป</p>
                  </div>
                  <div className="hidden shrink-0 flex-col items-end sm:flex">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">ขั้นตอนที่ 1 / 3</span>
                    <span className="mt-0.5 text-xs font-bold text-[#9A7200]">ลงทะเบียน</span>
                  </div>
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
                      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-700">{f.label}</span>
                      <input
                        id={f.id}
                        type={f.type}
                        autoComplete={f.autoComplete}
                        value={user[f.key]}
                        onChange={(e) => setUser((u) => ({ ...u, [f.key]: e.target.value }))}
                        placeholder={f.ph}
                        required
                        className="md-input"
                      />
                    </label>
                  ))}

                  <p className="rounded-xl border border-[#D6D4CC] bg-[#F3F2ED] px-4 py-3 text-xs leading-relaxed text-gray-600">
                    หลังกดปุ่ม ระบบจะเปิดหน้าต่างอธิบายวิธีทำแบบทดสอบสั้น ๆ ก่อนเริ่มตอบจริง
                  </p>

                  <button type="submit" className="md-btn-primary group w-full !rounded-xl !py-3.5">
                    ดำเนินการต่อ →
                  </button>
                  <p className="text-center text-[11px] text-gray-500">
                    ข้อมูลใช้เพื่อแสดงในหน้าสรุปผลเท่านั้น — ไม่แชร์ต่อโดยไม่ได้รับอนุญาต
                  </p>
                </form>
              </div>
            </div>
          </div>
        )}

        {step === 'assessment' && currentQuestion && (
          <div key={currentQuestion.id} className="w-full space-y-6 disc-animate-enter">
            <div>
              <div className="mb-2 flex items-center justify-between text-xs font-bold text-gray-700">
                <span>
                  ชุดที่ {currentIndex + 1} / {totalBigQuestions}
                </span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-[#E8E6DF]">
                <div
                  className="h-full rounded-full bg-[#FFCC00] transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="md-card space-y-2 p-5">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#9A7200]">
                ข้อ {statementRange.start}–{statementRange.end}
              </p>
              <p className="text-sm leading-relaxed text-gray-700">
                จัดอันดับคะแนน <span className="font-bold text-gray-950">1–4</span> ให้แต่ละข้อความ โดย{' '}
                <span className="font-bold text-gray-950">ห้ามซ้ำเลขกัน</span>
                <span className="mt-1 block text-xs text-gray-500">1 = ทำน้อยที่สุด · 4 = ทำบ่อยครั้งที่สุด</span>
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {currentQuestion.statements.map((st, statementIdx) => {
                const statementIndex = statementIdx as 0 | 1 | 2 | 3;
                const qAnswer = getQuestionAnswer(currentQuestion.id);
                const selectedForThisStatement = qAnswer[statementIndex];
                const isRatingPopStatement =
                  lastRatingPop?.questionId === currentQuestion.id && lastRatingPop?.statementIndex === statementIndex;

                return (
                  <div key={`${currentQuestion.id}-${statementIdx}`} className="md-card space-y-4 p-5">
                    <div className="flex items-start gap-2.5">
                      <span
                        className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-black ${typeStyle[st.type]}`}
                      >
                        {st.type}
                      </span>
                      <p className="text-sm font-bold leading-relaxed text-gray-950">{st.text}</p>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
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
                            className={`rounded-xl border py-2.5 text-sm font-black transition-all touch-manipulation ${
                              isSelected
                                ? 'border-black bg-[#FFCC00] text-black shadow-sm'
                                : disabled
                                  ? 'cursor-not-allowed border-[#E8E6DF] bg-[#F3F2ED] text-gray-400'
                                  : 'border-[#D6D4CC] bg-white text-gray-800 hover:border-gray-400 hover:bg-gray-50'
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

            <div className="flex justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="md-btn-ghost !rounded-xl disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← ก่อนหน้า
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={!canNext}
                className="md-btn-primary !rounded-xl disabled:cursor-not-allowed disabled:opacity-50"
              >
                {currentIndex < totalBigQuestions - 1 ? 'ถัดไป →' : 'ดูผลลัพธ์'}
              </button>
            </div>
          </div>
        )}

        {step === 'result' && (
          <div ref={resultCardRef} className="w-full space-y-5">
            <section className="md-card p-5 sm:p-8">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#9A7200]">DISC Assessment Result</p>
              <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                  <h1 className="text-2xl font-black leading-tight tracking-tight text-gray-950 sm:text-4xl">
                    ผลลัพธ์แบบทดสอบ DISC
                  </h1>
                  <p className="mt-2 text-sm text-gray-600">
                    บุคลิกภาพหลักของคุณคือ <span className="font-bold text-gray-950">{DISC_LABELS[primaryType]}</span>
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{DISC_DESCRIPTIONS[primaryType]}</p>
                </div>
                <div className={`shrink-0 rounded-2xl border px-5 py-3 shadow-md ${typeSolid[primaryType]}`}>
                  <div className="text-[11px] font-bold uppercase tracking-widest opacity-90">Primary · {primaryType}</div>
                  <div className="mt-0.5 text-3xl font-black">{scores[primaryType]}</div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2.5">
                {(['D', 'I', 'S', 'C'] as DiscType[]).map((t) => {
                  const isPrimary = t === primaryType;
                  return (
                    <div
                      key={t}
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl border text-xl font-black sm:h-14 sm:w-14 sm:text-2xl ${
                        isPrimary ? `${typeSolid[t]} shadow-lg` : typeStyle[t]
                      }`}
                      title={DISC_LABELS[t]}
                    >
                      {t}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-3 sm:gap-5">
              <div className="md-card space-y-4 p-5 sm:p-7 lg:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-gray-950">สัดส่วน 4 มิติ</p>
                  <p className="text-xs text-gray-500">คะแนนรวมทั้งชุด</p>
                </div>

                <Chart
                  key={`disc-pie-${primaryType}`}
                  chartType="PieChart"
                  data={pieChartData}
                  options={pieChartOptions}
                  width="100%"
                  height={220}
                  loader={<div className="py-10 text-center text-sm text-gray-500">กำลังโหลดกราฟ...</div>}
                />

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {pieTypes.map((t) => {
                    const pct = pieTotal > 0 ? Math.round(((scores[t] ?? 0) / pieTotal) * 100) : 0;
                    return (
                      <div key={t} className={`rounded-xl border px-3 py-2 ${typeStyle[t]}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold">{t}</span>
                          <span className="text-xs font-black">{pct}%</span>
                        </div>
                        <div className="mt-1 truncate text-[11px] opacity-80">{DISC_LABELS[t].split(' ')[0]}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="md-card space-y-4 p-5 sm:p-7">
                <p className="text-sm font-bold text-gray-950">คะแนนรายมิติ</p>
                {(['D', 'I', 'S', 'C'] as DiscType[]).map((type) => {
                  const pct = maxScore > 0 ? (scores[type] / maxScore) * 100 : 0;
                  const thaiLabel =
                    type === 'D' ? 'มุ่งมั่น' : type === 'I' ? 'มีอิทธิพล' : type === 'S' ? 'มั่นคง' : 'รอบคอบ';
                  return (
                    <div key={type} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-gray-800">
                          {type} · {thaiLabel}
                        </span>
                        <span className="text-xs font-black text-gray-950">{scores[type]}</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-[#E8E6DF]">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${typeBar[type]}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="md-card p-5 sm:p-7">
              <p className="text-sm font-bold text-gray-950">AI Feedback</p>
              <p className="mt-1 text-xs text-gray-500">
                สรุปจากผล DISC: {primaryType} (คะแนนสูงสุด {scores[primaryType]})
              </p>
              <div className="mt-4">
                {!aiFeedbackVisible ? (
                  <button type="button" onClick={() => void handleRequestAiFeedback()} className="md-btn-primary !rounded-xl text-sm">
                    ดู AI Feedback
                  </button>
                ) : aiLoading ? (
                  <div className="text-sm text-gray-500">กำลังสร้าง feedback...</div>
                ) : aiError ? (
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-red-600">{aiError}</div>
                    <button type="button" onClick={() => void handleRequestAiFeedback()} className="md-btn-ghost !rounded-xl text-sm">
                      ลองอีกครั้ง
                    </button>
                  </div>
                ) : aiFeedback ? (
                  <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-700">
                    {aiDisplayText}
                    {aiDisplayText.length < aiFeedback.length ? <span className="text-gray-400">▋</span> : null}
                  </div>
                ) : null}
              </div>
            </section>

            <div className="space-y-3 pt-1" data-no-capture="true">
              <div className="flex flex-col justify-center gap-2 border-t border-[#D6D4CC] pt-4 sm:flex-row sm:gap-3">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={!exportActionsEnabled || pdfLoading || pngLoading}
                  className="md-btn-ghost w-full !rounded-xl text-sm disabled:opacity-50 sm:w-auto"
                >
                  {pdfLoading ? 'กำลังสร้าง PDF...' : 'ดาวน์โหลด PDF'}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPng}
                  disabled={!exportActionsEnabled || pdfLoading || pngLoading}
                  className="md-btn-primary w-full !rounded-xl text-sm disabled:opacity-50 sm:w-auto"
                >
                  {pngLoading ? 'กำลังสร้าง PNG...' : isMobileExportDevice() ? 'บันทึกเป็นรูปภาพ' : 'ดาวน์โหลด PNG'}
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

              <div className="flex flex-col justify-center gap-3 sm:flex-row">
                <button type="button" onClick={handleRestart} className="md-btn-ghost w-full !rounded-xl sm:w-auto">
                  ทำแบบทดสอบใหม่
                </button>
                <Link to="/" className="md-btn-primary w-full !rounded-xl text-center sm:w-auto">
                  กลับหน้าแรก
                </Link>
              </div>
            </div>
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
                <p className="text-xs text-amber-300/90 text-center">{exportError}</p>
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
