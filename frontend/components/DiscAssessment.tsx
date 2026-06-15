import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { DISC_DESCRIPTIONS, DISC_LABELS, DISC_QUESTIONS, type DiscRating, type DiscStatement, type DiscType } from '../data/discData';
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

function isMobileSafariLike(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
    (typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 0)
  );
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

async function savePngBlob(blob: Blob, fileName: string, title: string): Promise<void> {
  const file = new File([blob], fileName, { type: 'image/png' });
  const blobUrl = URL.createObjectURL(blob);

  if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      URL.revokeObjectURL(blobUrl);
      return;
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') {
        URL.revokeObjectURL(blobUrl);
        return;
      }
    }
  }

  if (isMobileSafariLike()) {
    window.open(blobUrl, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    return;
  }

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

// Mapping ตาม spec: หมายเลข 1–40 -> D / I / S / C
const DISC_TYPE_BY_QUESTION_NUMBER: Record<DiscType, Set<number>> = {
  D: new Set<number>([3, 7, 11, 13, 20, 22, 25, 31, 33, 39]),
  I: new Set<number>([4, 5, 12, 14, 19, 21, 26, 32, 34, 37]),
  S: new Set<number>([2, 8, 9, 15, 18, 24, 27, 29, 36, 38]),
  C: new Set<number>([1, 6, 10, 16, 17, 23, 28, 30, 35, 40]),
};

const DiscAssessment: React.FC = () => {
  const totalBigQuestions = DISC_QUESTIONS.length;
  const totalStatements = DISC_QUESTIONS.reduce((acc, q) => acc + q.statements.length, 0);
  const [step, setStep] = useState<Step>('login');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showIntroModal, setShowIntroModal] = useState(false);

  const [user, setUser] = useState<UserInfo>({
    name: '',
    email: '',
    company: '',
  });

  const [answers, setAnswers] = useState<AnswersState>({});
  const [lastRatingPop, setLastRatingPop] = useState<{
    questionId: number;
    statementIndex: 0 | 1 | 2 | 3;
    rating: DiscRating;
  } | null>(null);
  const [ratingPopNonce, setRatingPopNonce] = useState(0);
  const didSubmitResultRef = useRef(false);
  const didGenerateAiRef = useRef(false);

  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [aiDisplayText, setAiDisplayText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pngLoading, setPngLoading] = useState(false);
  const [exportActionsEnabled, setExportActionsEnabled] = useState(false);
  const resultCardRef = useRef<HTMLDivElement | null>(null);

  const currentQuestion = DISC_QUESTIONS[currentIndex];

  // โหลดค่าจาก localStorage เพื่อให้รีเฟรช/กลับมาหน้าเดิมแล้วข้อมูลยังอยู่
  useEffect(() => {
    const readJson = <T,>(key: string): T | null => {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    };

    const resultPayload = readJson<DiscResultPayload>(DISC_RESULT_KEY);
    if (resultPayload?.user && resultPayload?.answers) {
      setShowIntroModal(false);
      setLastRatingPop(null);
      setRatingPopNonce(0);
      setUser(resultPayload.user ?? { name: '', email: '', company: '' });
      setAnswers(resultPayload.answers ?? {});
      setCurrentIndex(0);
      setStep('result');
      setAiFeedback(resultPayload.ai_feedback ?? null);
      didGenerateAiRef.current = Boolean(resultPayload.ai_feedback);
      didSubmitResultRef.current = true;
      return;
    }

    const draftPayload = readJson<DiscDraftPayload>(DISC_DRAFT_KEY);
    if (draftPayload) {
      setShowIntroModal(false);
      setLastRatingPop(null);
      setRatingPopNonce(0);
      setUser(draftPayload.user ?? { name: '', email: '', company: '' });
      setAnswers(draftPayload.answers ?? {});
      setCurrentIndex(draftPayload.currentIndex ?? 0);
      setStep(draftPayload.step ?? 'login');
      didSubmitResultRef.current = false;
      setAiFeedback(null);
      didGenerateAiRef.current = false;
      return;
    }

    didSubmitResultRef.current = false;
    setAiFeedback(null);
    didGenerateAiRef.current = false;
  }, []);

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

  const feedbackInputKey = useMemo(
    () => JSON.stringify({
      step,
      name: user.name.trim(),
      email: user.email.trim(),
      company: user.company.trim(),
      scores,
      primaryType,
      ranking,
    }),
    [step, user.name, user.email, user.company, scores, primaryType, ranking],
  );

  useEffect(() => {
    const run = async () => {
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

        // อัปเดต localStorage ให้ AI feedback อยู่ต่อเมื่อรีเฟรช
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
    };

    if (step !== 'result') return;
    if (aiFeedback) return;
    if (didGenerateAiRef.current) return;

    void run();
  }, [aiFeedback, feedbackInputKey]);

  const typeStyle: Record<DiscType, string> = {
    D: 'bg-rose-400/15 border-rose-300/30 text-rose-200',
    I: 'bg-amber-400/15 border-amber-300/30 text-amber-200',
    S: 'bg-emerald-400/15 border-emerald-300/30 text-emerald-200',
    C: 'bg-sky-400/15 border-sky-300/30 text-sky-200',
  };

  const dotColor: Record<DiscType, string> = {
    D: 'bg-rose-300',
    I: 'bg-amber-300',
    S: 'bg-emerald-300',
    C: 'bg-sky-300',
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

  // เอฟเฟกต์พิมพ์ข้อความ AI แบบเร็ว
  useEffect(() => {
    if (!aiFeedback) {
      setAiDisplayText('');
      return;
    }

    setAiDisplayText('');
    let i = 0;
    const chunkSize = 3; // เร็วขึ้น: ทีละ 3 ตัวอักษร
    const timer = window.setInterval(() => {
      i = Math.min(aiFeedback.length, i + chunkSize);
      setAiDisplayText(aiFeedback.slice(0, i));
      if (i >= aiFeedback.length) window.clearInterval(timer);
    }, 10);

    return () => window.clearInterval(timer);
  }, [aiFeedback]);

  useEffect(() => {
    if (step !== 'result') {
      setExportActionsEnabled(false);
      return;
    }

    const delayMs = isMobileSafariLike() ? 700 : 0;
    const timer = window.setTimeout(() => setExportActionsEnabled(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [step]);

  const captureResultCard = async (): Promise<HTMLCanvasElement> => {
    const el = resultCardRef.current;
    if (!el) throw new Error('ไม่พบพื้นที่ผลลัพธ์');

    const { default: html2canvas } = await import('html2canvas');
    const mobileScale = isMobileSafariLike() ? Math.min(2, window.devicePixelRatio || 1.5) : 2;

    return html2canvas(el, {
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#0a0a0a',
      scale: mobileScale,
      logging: false,
      windowHeight: el.scrollHeight,
      height: el.scrollHeight,
    });
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

      const exportBaseName = `ผลแบบทดสอบ-DISC_${safeExportFilePart(user.name)}_${new Date().toISOString().slice(0, 10)}`;
      pdf.save(`${exportBaseName}.pdf`);
    } catch (e) {
      console.warn('Export PDF:', e);
    } finally {
      restore();
      setPdfLoading(false);
    }
  };

  const handleDownloadPng = async () => {
    if (!exportActionsEnabled) return;
    setPngLoading(true);
    let restore = () => {};
    try {
      restore = hideExportUiForCapture();
      const canvas = await captureResultCard();
      restore();

      const blob = await canvasToPngBlob(canvas);
      const exportBaseName = `ผลแบบทดสอบ-DISC_${safeExportFilePart(user.name)}_${new Date().toISOString().slice(0, 10)}`;
      await savePngBlob(blob, `${exportBaseName}.png`, 'ผลแบบทดสอบ DISC');
    } catch (e) {
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
    setAiFeedback(null);
    setAiDisplayText('');
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
    setAiFeedback(null);
    setAiDisplayText('');
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
    <div className="min-h-screen bg-transparent text-white bg-grid flex flex-col selection:bg-yellow-400 selection:text-black">
      {showIntroModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={handleCloseIntroAndStartAssessment}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-lg rounded-3xl border border-white/20 bg-gradient-to-b from-neutral-900/95 to-black/95 shadow-2xl shadow-yellow-400/10 overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(250,204,21,0.12),transparent)] pointer-events-none" />
            <div className="relative p-8 md:p-10 text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-yellow-400/20 border border-yellow-400/30 flex items-center justify-center">
                <span className="text-3xl" aria-hidden>
                  🧠
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-4">แบบทดสอบ DISC</h2>
              <div className="text-sm md:text-base leading-relaxed mb-8 text-gray-400">
                แบบทดสอบนี้มี <span className="text-yellow-400 font-bold">40 ข้อ</span> (หมายเลข 1–40)
                ให้คุณ <span className="text-yellow-400 font-bold">จัดอันดับคะแนน 1–4</span> โดย
                <span className="text-yellow-400 font-bold"> ห้ามใช้เลขซ้ำกันในแต่ละหน้าจอ (ชุด 4 ข้อความ)</span>
                (1 = ทำน้อยที่สุด, 4 = ทำบ่อยครั้งที่สุด)
                <div className="mt-3 text-gray-500">
                  เมื่อทำครบ 40 ข้อ ระบบจะสรุปบุคลิกภาพหลักของคุณเป็น D / I / S / C
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseIntroAndStartAssessment}
                className="w-full py-3.5 px-6 rounded-xl font-bold bg-yellow-400 text-black hover:bg-yellow-300 shadow-lg shadow-yellow-400/25 transition-all"
              >
                เริ่มทำแบบทดสอบ
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="flex justify-between items-center px-6 py-6 max-w-4xl mx-auto w-full">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center glow-yellow">
            <span className="text-black font-semibold text-xl">M</span>
          </div>
          <span className="text-xl font-semibold tracking-tighter">MindDoJo</span>
        </Link>

        {step === 'assessment' && (
          <span className="text-gray-500 text-sm font-medium">
            ข้อ {statementRange.start} - {statementRange.end} / {totalStatements}
          </span>
        )}
      </header>

      <main
        className={`flex-1 px-4 sm:px-6 py-6 sm:py-10 mx-auto w-full ${
          step === 'login' ? 'max-w-5xl' : 'max-w-2xl'
        }`}
      >
        {step === 'login' && (
          <div className="w-full">
            <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] gap-10 lg:gap-14 items-start">
              {/* ซ้าย: ภาพรวม + DISC */}
              <div className="order-2 lg:order-1 space-y-6 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/90 animate-pulse" aria-hidden />
                  DISC Personality Assessment
                </div>

                <div className="flex justify-center lg:justify-start gap-2 sm:gap-3">
                  {(
                    [
                      { ch: 'D', className: 'from-rose-500/25 to-rose-600/5 border-rose-400/35 text-rose-200' },
                      { ch: 'I', className: 'from-amber-400/25 to-amber-500/5 border-amber-300/35 text-amber-200' },
                      { ch: 'S', className: 'from-emerald-500/25 to-emerald-600/5 border-emerald-400/35 text-emerald-200' },
                      { ch: 'C', className: 'from-sky-500/25 to-sky-600/5 border-sky-400/35 text-sky-200' },
                    ] as const
                  ).map(({ ch, className }) => (
                    <div
                      key={ch}
                      className={`flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl border bg-gradient-to-b text-2xl sm:text-3xl font-black tracking-tight shadow-lg shadow-black/20 ${className}`}
                    >
                      {ch}
                    </div>
                  ))}
                </div>

                <div>
                  <h1 className="text-3xl sm:text-4xl lg:text-[2.65rem] font-black tracking-tight text-white leading-[1.1]">
                    ลงทะเบียน
                    <span className="text-yellow-400"> DISC</span>
                  </h1>
                  <p className="mt-3 text-zinc-400 text-sm sm:text-base leading-relaxed max-w-xl mx-auto lg:mx-0">
                    แบบทดสอบบุคลิกภาพตามหลัก DISC Model — 40 ข้อ ให้คุณจัดอันดับคะแนน 1–4 แบบไม่ซ้ำในชุด 4 ข้อความ
                  </p>
                </div>

                <ol className="grid gap-3 text-left max-w-xl mx-auto lg:mx-0">
                  {[
                    { n: '01', t: 'กรอกข้อมูลผู้ทำแบบทดสอบ', d: 'ใช้สำหรับอ้างอิงผลและติดต่อกลับได้' },
                    { n: '02', t: 'อ่านวิธีทำในป๊อปอัพ', d: 'สั้น ๆ ก่อนเริ่มตอบจริง' },
                    { n: '03', t: 'เริ่มทำแบบทดสอบ', d: 'ใช้เวลาประมาณ 5–8 นาที' },
                  ].map((row) => (
                    <li
                      key={row.n}
                      className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
                    >
                      <span className="mt-0.5 inline-flex h-8 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-400/15 text-xs font-bold text-yellow-300">
                        {row.n}
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-zinc-100">{row.t}</span>
                        <span className="block text-xs text-zinc-500 mt-0.5">{row.d}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* ขวา: ฟอร์ม */}
              <div className="order-1 lg:order-2 w-full">
                <div className="relative">
                  <div
                    className="absolute -inset-px rounded-[1.35rem] bg-gradient-to-br from-yellow-400/35 via-white/10 to-transparent opacity-80 blur-[1px]"
                    aria-hidden
                  />
                  <div className="relative rounded-[1.3rem] border border-white/15 bg-gradient-to-b from-zinc-900/90 to-black/70 backdrop-blur-xl shadow-2xl shadow-black/40 p-6 sm:p-8">
                    <div className="flex items-start justify-between gap-4 mb-6">
                      <div>
                        <h2 className="text-lg sm:text-xl font-bold text-white">ข้อมูลผู้ทำแบบทดสอบ</h2>
                        <p className="text-xs sm:text-sm text-zinc-500 mt-1">
                          กรอกให้ครบ แล้วกดปุ่มด้านล่างเพื่อไปขั้นตอนถัดไป
                        </p>
                      </div>
                      <div className="hidden sm:flex flex-col items-end text-[10px] text-zinc-500 leading-tight">
                        <span>ขั้นตอนที่ 1 / 3</span>
                        <span className="text-yellow-400/90 font-semibold">ลงทะเบียน</span>
                      </div>
                    </div>

                    <form onSubmit={handleStartFromLogin} className="space-y-4 sm:space-y-5">
                      <div>
                        <label htmlFor="disc-name" className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                          ชื่อ–นามสกุล
                        </label>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" aria-hidden>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </span>
                          <input
                            id="disc-name"
                            type="text"
                            autoComplete="name"
                            value={user.name}
                            onChange={(e) => setUser((u) => ({ ...u, name: e.target.value }))}
                            placeholder="เช่น สมชาย ใจดี"
                            required
                            className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-400/60 transition-shadow"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="disc-email" className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                          อีเมล
                        </label>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" aria-hidden>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </span>
                          <input
                            id="disc-email"
                            type="email"
                            autoComplete="email"
                            value={user.email}
                            onChange={(e) => setUser((u) => ({ ...u, email: e.target.value }))}
                            placeholder="your@email.com"
                            required
                            className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-400/60 transition-shadow"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="disc-company" className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                          บริษัท / องค์กร
                        </label>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" aria-hidden>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                          </span>
                          <input
                            id="disc-company"
                            type="text"
                            autoComplete="organization"
                            value={user.company}
                            onChange={(e) => setUser((u) => ({ ...u, company: e.target.value }))}
                            placeholder="ชื่อบริษัทหรือหน่วยงาน"
                            required
                            className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-400/60 transition-shadow"
                          />
                        </div>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-zinc-500 leading-relaxed">
                        หลังกดปุ่ม ระบบจะเปิดหน้าต่างอธิบายวิธีทำแบบทดสอบสั้น ๆ ก่อนเริ่มตอบจริง
                      </div>

                      <button
                        type="submit"
                        className="group w-full py-3.5 sm:py-4 rounded-xl font-bold bg-yellow-400 text-black hover:bg-yellow-300 shadow-lg shadow-yellow-400/25 transition-all active:scale-[0.99] flex items-center justify-center gap-2"
                      >
                        <span>ดำเนินการต่อ</span>
                        <svg className="w-5 h-5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </button>

                      <p className="text-center text-[11px] text-zinc-600">
                        ข้อมูลใช้เพื่อแสดงในหน้าสรุปผลเท่านั้น — ไม่แชร์ต่อโดยไม่ได้รับอนุญาต
                      </p>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'assessment' && currentQuestion && (
          <div key={currentQuestion.id} className="w-full space-y-8 disc-animate-enter">
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-yellow-400 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="space-y-5">
              <p className="text-xs font-bold text-yellow-400/90 uppercase tracking-widest">
                ข้อ {statementRange.start} - {statementRange.end} / {totalStatements}
              </p>

              <p className="text-gray-500 text-sm leading-relaxed">
                จัดอันดับคะแนน <span className="text-yellow-400 font-bold">1–4</span> ให้แต่ละข้อความในข้อเดียว
                โดย <span className="text-yellow-400 font-bold">ห้ามซ้ำเลขกัน</span> (1 = ทำน้อยที่สุด, 4 = ทำบ่อยครั้งที่สุด)
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {currentQuestion.statements.map((st, statementIdx) => {
                const statementIndex = statementIdx as 0 | 1 | 2 | 3;
                const qAnswer = getQuestionAnswer(currentQuestion.id);
                const selectedForThisStatement = qAnswer[statementIndex];
                const isRatingPopStatement =
                  lastRatingPop?.questionId === currentQuestion.id && lastRatingPop?.statementIndex === statementIndex;

                return (
                  <div
                    key={`${currentQuestion.id}-${statementIdx}`}
                    className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4"
                  >
                    <p className="text-sm font-bold text-white/90 leading-relaxed">{st.text}</p>
                    <div className="grid grid-cols-4 gap-2">
                      {RATING_VALUES.map((rating) => {
                        const isSelected = selectedForThisStatement === rating;
                        const isUsedElsewhere =
                          !isSelected && usedRatingsInCurrentQuestion.has(rating);
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
                            className={`px-2 py-2 rounded-xl border text-sm font-bold transition-all touch-manipulation ${
                              isSelected
                                ? 'border-yellow-400 bg-yellow-400/20 text-white'
                                : disabled
                                  ? 'border-white/10 bg-white/5 text-gray-700/60 cursor-not-allowed'
                                  : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:bg-white/10'
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

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="px-5 py-2.5 rounded-xl font-bold border border-white/10 text-gray-400 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                ← ก่อนหน้า
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={!canNext}
                className="px-6 py-2.5 rounded-xl font-bold bg-yellow-400 text-black hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {currentIndex < totalBigQuestions - 1 ? 'ถัดไป →' : 'ดูผลลัพธ์'}
              </button>
            </div>
          </div>
        )}

        {step === 'result' && (
          <div ref={resultCardRef} className="w-full space-y-4 sm:space-y-6">
            <section className="rounded-2xl sm:rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900/95 via-zinc-900/85 to-black/85 p-4 sm:p-8 shadow-2xl shadow-black/30 backdrop-blur-xl">
              <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-zinc-500">DISC Assessment Result</p>
              <div className="mt-2 sm:mt-3 flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white leading-tight">
                    ผลลัพธ์แบบทดสอบ <span className="text-yellow-400">DISC</span>
                  </h1>
                  <p className="mt-1.5 text-xs sm:text-sm text-zinc-400 break-words">บุคลิกภาพหลักของคุณคือ {DISC_LABELS[primaryType]}</p>
                </div>
                <div className={`rounded-xl sm:rounded-2xl border px-4 py-2.5 sm:px-5 sm:py-3 ${typeStyle[primaryType]}`}>
                  <div className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Primary Score</div>
                  <div className="text-2xl sm:text-3xl font-black text-white mt-0.5 sm:mt-1">{scores[primaryType]}</div>
                </div>
              </div>

              <div className="mt-4 sm:mt-5 flex flex-wrap items-center gap-2 sm:gap-3">
                {(['D', 'I', 'S', 'C'] as DiscType[]).map((t) => {
                  const isPrimary = t === primaryType;
                  return (
                    <div
                      key={t}
                      className={`h-12 w-12 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl border flex items-center justify-center font-black text-xl sm:text-2xl ${
                        isPrimary
                          ? 'bg-yellow-400/25 border-yellow-400/55 text-yellow-300 shadow-[0_0_40px_rgba(250,204,21,0.18)]'
                          : typeStyle[t]
                      }`}
                      title={DISC_LABELS[t]}
                    >
                      {t}
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:hidden">
                {(['D', 'I', 'S', 'C'] as DiscType[]).map((t) => (
                  <div key={`mobile-chip-${t}`} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-zinc-300">{t}</span>
                      <span className="text-xs font-black text-yellow-400">{scores[t]}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid lg:grid-cols-3 gap-4 sm:gap-5">
              <div className="lg:col-span-2 rounded-2xl sm:rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:p-7 space-y-3 sm:space-y-4 backdrop-blur-xl">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-white/90">DISC Pie (เปอร์เซ็นต์)</p>
                  <p className="text-[11px] sm:text-xs text-zinc-500">คะแนนรวมทั้ง 4 มิติ</p>
                </div>

                <Chart
                  key={`disc-pie-${primaryType}`}
                  chartType="PieChart"
                  data={pieChartData}
                  options={pieChartOptions}
                  width="100%"
                  height={220}
                  loader={<div className="text-zinc-500 py-10 text-center text-sm">กำลังโหลดกราฟ...</div>}
                />

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {pieTypes.map((t) => {
                    const pct = pieTotal > 0 ? Math.round(((scores[t] ?? 0) / pieTotal) * 100) : 0;
                    return (
                      <div key={t} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-zinc-300">{t}</span>
                          <span className="text-xs font-black text-yellow-400">{pct}%</span>
                        </div>
                        <div className="mt-1 text-[11px] text-zinc-500 truncate">{DISC_LABELS[t]}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:p-7 space-y-3 sm:space-y-4 backdrop-blur-xl">
                <p className="text-sm font-bold text-white/90">คะแนนรายมิติ</p>
                {(['D', 'I', 'S', 'C'] as DiscType[]).map((type) => {
                  const pct = maxScore > 0 ? (scores[type] / maxScore) * 100 : 0;
                  const thaiLabel =
                    type === 'D' ? 'มุ่งมั่น' :
                    type === 'I' ? 'มีอิทธิพล' :
                    type === 'S' ? 'มั่นคง' :
                    'รอบคอบ';
                  return (
                    <div key={type} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] sm:text-xs font-semibold text-zinc-300">{type} ({thaiLabel})</span>
                        <span className="text-xs font-black text-yellow-400">{scores[type]}</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full bg-yellow-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl sm:rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:p-7 backdrop-blur-xl -mx-4 sm:mx-0">
              <p className="text-sm font-bold text-white/90">AI Feedback</p>
              <p className="text-xs text-zinc-500 mt-1">สรุปจากผล DISC: {primaryType} (คะแนนสูงสุด {scores[primaryType]})</p>
              <div className="mt-4">
                {aiLoading ? (
                  <div className="text-sm text-zinc-400">กำลังสร้าง feedback...</div>
                ) : aiError ? (
                  <div className="text-sm text-red-300/90">{aiError}</div>
                ) : aiFeedback ? (
                  <div className="whitespace-pre-wrap text-sm text-zinc-300 leading-relaxed break-words">
                    {aiDisplayText}
                    {aiDisplayText.length < aiFeedback.length ? <span className="text-zinc-500">▋</span> : null}
                  </div>
                ) : (
                  <div className="text-sm text-zinc-400">รอการสร้าง feedback...</div>
                )}
              </div>
            </section>

            <div className="pt-1 space-y-3" data-no-capture="true">
              <div className="border-t border-white/10 pt-3">
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    disabled={!exportActionsEnabled || pdfLoading || pngLoading}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl font-bold border border-white/10 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
                  >
                    {pdfLoading ? 'กำลังสร้าง PDF...' : 'ดาวน์โหลด PDF'}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadPng}
                    disabled={!exportActionsEnabled || pdfLoading || pngLoading}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl font-bold bg-yellow-400 text-black hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
                  >
                    {pngLoading ? 'กำลังสร้าง PNG...' : isMobileSafariLike() ? 'บันทึก/แชร์ PNG' : 'ดาวน์โหลด PNG'}
                  </button>
                </div>
                {isMobileSafariLike() && !exportActionsEnabled ? (
                  <p className="mt-2 text-center text-[11px] text-zinc-500">กำลังเตรียมปุ่มบันทึกผลลัพธ์...</p>
                ) : isMobileSafariLike() ? (
                  <p className="mt-2 text-center text-[11px] text-zinc-500">บนมือถือ: กดบันทึก/แชร์ แล้วเลือก &quot;บันทึกรูปภาพ&quot; หรือ &quot;Save Image&quot;</p>
                ) : null}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  onClick={handleRestart}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold border border-white/10 hover:bg-white/5 transition-all"
                >
                  ทำแบบทดสอบใหม่
                </button>
                <Link
                  to="/"
                  className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold bg-yellow-400 text-black hover:bg-yellow-300 text-center transition-all"
                >
                  กลับหน้าแรก
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="py-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-6 text-center text-gray-500 text-sm">
          © {new Date().getFullYear()} MindDoJo CO., LTD.
        </div>
      </footer>
    </div>
  );
};

export default DiscAssessment;
