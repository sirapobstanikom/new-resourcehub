import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { getKeyPrinciplesFeedback } from '../services/openai';
import {
  KP_PAGE_QUESTION_NUMS,
  KP_PAGE_TITLES,
  KP_SCALE_LABELS,
  KP_SCORE_BANDS,
  KP_TOTAL_QUESTIONS,
  getKpAllSectionResults,
  getKpAnswersForDb,
  getKpQuestionByNum,
  getKpSectionScores,
  getKpTotalQuestionCount,
  getKpTotalScore,
  isKpComplete,
  type KpQuestionNum,
} from '../data/keyPrinciplesData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import KeyPrinciplesLoginView from './keyPrinciples/KeyPrinciplesLoginView';
import KeyPrinciplesResultView from './keyPrinciples/KeyPrinciplesResultView';

type Step = 'login' | 'assessment' | 'result';

type SavedKpResult = {
  user: { name: string; company: string };
  answers: Record<number, number>;
  aiFeedback?: string;
};

const STORAGE_KEY = 'key_principles_assessment_v2';

function safeExportFilePart(name: string): string {
  const t = name.trim() || 'ผู้ประเมิน';
  return t.replace(/[\\/:*?"<>|]/g, '_').slice(0, 48);
}

function isMobileSafariLike(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
    (typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 0)
  );
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
const ASSESSMENT_TITLE = 'Key Principles Assessment';
const SUBTITLE = 'MindDoJo · แบบประเมินออนไลน์';

function parseStoredAnswers(raw: Record<string, unknown> | undefined): Record<number, number> {
  const out: Record<number, number> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (let n = 1; n <= KP_TOTAL_QUESTIONS; n++) {
    const v = raw[String(n)];
    if (typeof v === 'number' && v >= 1 && v <= 5) out[n] = v;
  }
  return out;
}

const INTRO_BODY = (
  <>
    <p className="mb-4 text-gray-300 leading-relaxed">
      แบบประเมิน Key Principles มี 25 ข้อ ให้คะแนน 1–5 ตามความเป็นจริงของตนเอง หลังทำครบระบบจะสรุปผลเป็น 5 ส่วน:
      Self Esteem, Empathy, Involvement, Support และ Share
    </p>
    <p className="mb-4 text-gray-400 text-sm leading-relaxed">
      แต่ละส่วนคำนวณจากข้อที่กำหนด รวมคะแนนได้ 5–25 คะแนน
    </p>
    <div className="rounded-xl border border-white/10 overflow-hidden text-left text-xs mb-4">
      <div className="grid grid-cols-2 bg-white/10 px-3 py-2 font-semibold text-white">
        <span>คะแนน</span>
        <span>ความหมาย</span>
      </div>
      {([1, 2, 3, 4, 5] as const).map((s) => (
        <div key={s} className="grid grid-cols-2 border-t border-white/10 px-3 py-2 text-gray-300">
          <span className="tabular-nums text-yellow-400/90 font-bold">{s}</span>
          <span>{KP_SCALE_LABELS[s]}</span>
        </div>
      ))}
    </div>
    <div className="rounded-xl border border-white/10 overflow-hidden text-left text-xs">
      <div className="bg-white/10 px-3 py-2 font-semibold text-white">ช่วงคะแนนต่อส่วน (5–25)</div>
      {KP_SCORE_BANDS.map((b) => (
        <div key={b.id} className="border-t border-white/10 px-3 py-2 text-gray-300">
          <span className="tabular-nums text-yellow-400/90 font-bold">
            {b.min}–{b.max}
          </span>
          <span className="mx-2 text-gray-600">·</span>
          <span>{b.meaningTh}</span>
        </div>
      ))}
    </div>
  </>
);

const KeyPrinciplesAssessment: React.FC = () => {
  const [showIntroModal, setShowIntroModal] = useState(false);
  const [step, setStep] = useState<Step>('login');
  const [user, setUser] = useState({ name: '', company: '' });
  const [pageIndex, setPageIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [savedSnapshot, setSavedSnapshot] = useState<SavedKpResult | null>(null);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pngLoading, setPngLoading] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const resultExportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as SavedKpResult;
      const ans = parseStoredAnswers(parsed?.answers as unknown as Record<string, unknown>);
      if (parsed?.user?.name && parsed?.user?.company && isKpComplete(ans)) {
        setSavedSnapshot({ ...parsed, answers: ans });
        setAnswers(ans);
        setUser(parsed.user);
        if (parsed.aiFeedback?.trim()) setAiFeedback(parsed.aiFeedback.trim());
        setStep('result');
      }
    } catch {
      /* ignore */
    }
  }, []);

  const totalPages = KP_PAGE_QUESTION_NUMS.length;
  const currentNums = KP_PAGE_QUESTION_NUMS[pageIndex] ?? [];
  const totalQuestions = getKpTotalQuestionCount();
  const answeredCount = Object.keys(answers).filter((k) => {
    const n = Number(k);
    return n >= 1 && n <= KP_TOTAL_QUESTIONS && answers[n] != null;
  }).length;
  const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  const isPageComplete = (nums: KpQuestionNum[]) =>
    nums.every((n) => {
      const v = answers[n];
      return typeof v === 'number' && v >= 1 && v <= 5;
    });

  const canNextPage = isPageComplete(currentNums as KpQuestionNum[]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (user.name.trim() && user.company.trim()) {
      setPageIndex(0);
      setAnswers({});
      setSavedSnapshot(null);
      setAiFeedback(null);
      setAiError(null);
      setShowIntroModal(true);
    }
  };

  const handleCloseIntroAndStart = () => {
    setShowIntroModal(false);
    setStep('assessment');
  };

  const scrollToNextQuestionOrNav = (questionNum: number) => {
    const nums = (KP_PAGE_QUESTION_NUMS[pageIndex] ?? []) as KpQuestionNum[];
    const idx = nums.findIndex((n) => n === questionNum);
    const run = () => {
      if (idx >= 0 && idx < nums.length - 1) {
        const nextNum = nums[idx + 1];
        document.getElementById(`kp-question-${nextNum}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        document.getElementById('kp-assessment-nav')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    };
    requestAnimationFrame(() => {
      requestAnimationFrame(run);
    });
  };

  const setScale = (questionNum: number, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionNum]: value }));
    scrollToNextQuestionOrNav(questionNum);
  };

  const persist = (payload: SavedKpResult) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* ignore */
    }
  };

  const finishAssessment = () => {
    const payload: SavedKpResult = {
      user: { name: user.name.trim(), company: user.company.trim() },
      answers: { ...answers },
    };
    persist(payload);
    setSavedSnapshot(payload);
    setAiFeedback(null);
    setAiError(null);
    setStep('result');
    window.scrollTo(0, 0);

    if (isSupabaseConfigured && isKpComplete(payload.answers)) {
      void supabase
        .from('key_principles_results')
        .insert({
          name: payload.user.name,
          company: payload.user.company,
          total_score: getKpTotalScore(payload.answers),
          principle_scores: getKpSectionScores(payload.answers),
          answers: getKpAnswersForDb(payload.answers),
        })
        .then(({ error }) => {
          if (error) console.warn('Key Principles save to DB:', error.message);
        });
    }
  };

  const handleNextPage = () => {
    if (pageIndex < totalPages - 1) {
      setPageIndex((i) => i + 1);
      window.scrollTo(0, 0);
    } else {
      finishAssessment();
    }
  };

  const handlePrevPage = () => {
    if (pageIndex > 0) {
      setPageIndex((i) => i - 1);
      window.scrollTo(0, 0);
    }
  };

  const restart = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setSavedSnapshot(null);
    setAnswers({});
    setPageIndex(0);
    setStep('login');
    setUser({ name: '', company: '' });
    setAiFeedback(null);
    setAiError(null);
    setAiLoading(false);
  };

  const displayAnswers = savedSnapshot?.answers ?? answers;
  const displayUser = savedSnapshot?.user ?? user;
  const sectionResults = getKpAllSectionResults(displayAnswers);

  const exportBaseName = `Key_Principles_${safeExportFilePart(displayUser.name)}_${new Date().toISOString().slice(0, 10)}`;

  const persistWithAi = (feedback: string) => {
    const payload: SavedKpResult = {
      user: displayUser,
      answers: displayAnswers,
      aiFeedback: feedback,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* ignore */
    }
    setSavedSnapshot(payload);
  };

  const handleRequestAiFeedback = async () => {
    setAiLoading(true);
    setAiError(null);
    setAiFeedback(null);
    try {
      const text = await getKeyPrinciplesFeedback({
        user: displayUser,
        sections: sectionResults.map(({ section, sum, band }) => ({
          titleEn: section.titleEn,
          sum,
          bandRange: `${band.min}–${band.max}`,
          bandMeaningTh: band.meaningTh,
        })),
      });
      setAiFeedback(text);
      persistWithAi(text);
    } catch (e) {
      setAiError((e as Error).message || 'ไม่สามารถโหลด feedback จาก AI ได้');
    } finally {
      setAiLoading(false);
    }
  };

  const captureResultForExport = async (mode: 'png' | 'pdf' = 'png'): Promise<HTMLCanvasElement> => {
    const el = resultExportRef.current;
    if (!el) throw new Error('ไม่พบพื้นที่ผลลัพธ์');

    el.scrollIntoView({ block: 'start', behavior: 'instant' as ScrollBehavior });
    window.scrollTo(0, 0);
    el.setAttribute('data-kp-exporting', 'true');
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    try {
      const scale =
        mode === 'pdf'
          ? 2
          : isMobileSafariLike()
            ? Math.min(2, window.devicePixelRatio || 1.5)
            : 2;

      const canvas = await html2canvas(el, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#0a0a0a',
        scale,
        logging: false,
        scrollX: 0,
        scrollY: -window.scrollY,
        ignoreElements: (node) => node.classList?.contains('exclude-from-export') === true,
        onclone: (doc) => {
          doc.querySelectorAll('[data-kp-exporting]').forEach((root) => {
            root.querySelectorAll('*').forEach((node) => {
              if (!(node instanceof HTMLElement)) return;
              node.style.animation = 'none';
              node.style.transition = 'none';
              node.style.opacity = '1';
              node.style.transform = 'none';
            });
          });
        },
      });

      if (canvas.width < 16 || canvas.height < 16) {
        throw new Error('ไม่สามารถสร้างภาพผลลัพธ์ได้ (ขนาดว่าง)');
      }
      return canvas;
    } finally {
      el.removeAttribute('data-kp-exporting');
    }
  };

  const downloadBlob = async (blob: Blob, fileName: string, title: string) => {
    const blobUrl = URL.createObjectURL(blob);
    const file = new File([blob], fileName, { type: blob.type || 'application/octet-stream' });

    if (
      isMobileSafariLike() &&
      typeof navigator.share === 'function' &&
      navigator.canShare?.({ files: [file] })
    ) {
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

    const link = document.createElement('a');
    link.download = fileName;
    link.href = blobUrl;
    link.rel = 'noopener';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (isMobileSafariLike()) {
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
    }

    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
  };

  const handleDownloadPdf = async () => {
    if (!resultExportRef.current) return;
    setPdfLoading(true);
    setExportError(null);
    try {
      const canvas = await captureResultForExport('pdf');
      const imgData = canvas.toDataURL('image/png', 1);
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height],
      });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      const blob = pdf.output('blob');
      await downloadBlob(blob, `${exportBaseName}.pdf`, 'ผล Key Principles Assessment');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'ดาวน์โหลด PDF ไม่สำเร็จ';
      setExportError(msg);
      console.warn('Export Key Principles PDF:', e);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDownloadPng = async () => {
    if (!resultExportRef.current) return;
    setPngLoading(true);
    setExportError(null);
    try {
      const canvas = await captureResultForExport('png');
      const blob = await canvasToPngBlob(canvas);
      await downloadBlob(blob, `${exportBaseName}.png`, 'ผล Key Principles Assessment');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'ดาวน์โหลด PNG ไม่สำเร็จ';
      setExportError(msg);
      console.warn('Export Key Principles PNG:', e);
    } finally {
      setPngLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-white bg-grid flex flex-col selection:bg-yellow-400 selection:text-black">
      {showIntroModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={handleCloseIntroAndStart}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-lg rounded-3xl border border-white/20 bg-gradient-to-b from-neutral-900/95 to-black/95 shadow-2xl shadow-yellow-400/10 overflow-hidden max-h-[90vh] overflow-y-auto kp-scale-in">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(250,204,21,0.12),transparent)] pointer-events-none" />
            <div className="relative p-8 md:p-10 text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-yellow-400/20 border border-yellow-400/35 flex items-center justify-center">
                <span className="text-3xl" aria-hidden>
                  ◆
                </span>
              </div>
              <p className="text-[10px] uppercase tracking-widest text-yellow-400/90 mb-2">{SUBTITLE}</p>
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight mb-4">{ASSESSMENT_TITLE}</h2>
              <div className="text-sm md:text-base mb-8 text-left">{INTRO_BODY}</div>
              <button
                type="button"
                onClick={handleCloseIntroAndStart}
                className="w-full py-3.5 px-6 rounded-xl font-bold bg-yellow-400 text-black hover:bg-yellow-300 shadow-lg shadow-yellow-400/25 transition-all"
              >
                เริ่มทำแบบประเมิน
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
            ตอบแล้ว {answeredCount} / {totalQuestions} ข้อ
          </span>
        )}
      </header>

      <main
        className={`flex-1 px-4 sm:px-6 py-4 md:py-8 mx-auto w-full pb-16 ${
          step === 'login' ? 'max-w-6xl' : 'max-w-3xl'
        }`}
      >
        {step === 'login' && (
          <KeyPrinciplesLoginView
            name={user.name}
            company={user.company}
            onNameChange={(value) => setUser((u) => ({ ...u, name: value }))}
            onCompanyChange={(value) => setUser((u) => ({ ...u, company: value }))}
            onSubmit={handleLoginSubmit}
          />
        )}

        {step === 'assessment' && (
          <div key={`page-${pageIndex}`} className="space-y-8 kp-fade-up">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-gray-500">
              <span className="font-semibold text-yellow-400/90">
                {KP_PAGE_TITLES[pageIndex]} · ข้อ {currentNums[0]}–{currentNums[currentNums.length - 1]}
              </span>
              <span>
                หน้า {pageIndex + 1} / {totalPages}
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden ring-1 ring-white/5">
              <div
                className="h-full bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-300 rounded-full transition-all duration-500 ease-out shadow-[0_0_12px_rgba(250,204,21,0.35)]"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="space-y-5">
              {(currentNums as KpQuestionNum[]).map((num, qi) => {
                const q = getKpQuestionByNum(num);
                if (!q) return null;
                return (
                  <div
                    key={num}
                    id={`kp-question-${num}`}
                    className={`kp-fade-up rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent p-5 md:p-6 space-y-4 shadow-lg shadow-black/25 scroll-mt-28 transition-colors hover:border-white/15 ${
                      qi === 0 ? '' : qi === 1 ? 'kp-delay-1' : qi === 2 ? 'kp-delay-2' : qi === 3 ? 'kp-delay-3' : 'kp-delay-4'
                    }`}
                  >
                    <p className="text-xs font-bold text-yellow-400/90 uppercase tracking-widest">
                      ข้อที่ {num} / {totalQuestions}
                    </p>
                    <p className="text-white text-sm md:text-base leading-relaxed font-medium">{q.text}</p>
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-gray-500">ให้คะแนน 1–5</p>
                      <div className="flex flex-wrap gap-2">
                        {([1, 2, 3, 4, 5] as const).map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setScale(num, v)}
                            title={KP_SCALE_LABELS[v]}
                            className={`min-w-[2.75rem] px-3 py-2 rounded-xl text-sm font-bold border-2 transition-all duration-200 hover:scale-105 active:scale-95 ${
                              answers[num] === v
                                ? 'kp-rating-pop bg-yellow-400/25 border-yellow-400 text-white shadow-md shadow-yellow-400/20'
                                : 'bg-white/5 border-white/10 text-gray-400 hover:border-yellow-400/40 hover:text-gray-200'
                            }`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                      {answers[num] != null && (
                        <p className="text-xs text-gray-400 mt-1">{KP_SCALE_LABELS[answers[num] as 1 | 2 | 3 | 4 | 5]}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div id="kp-assessment-nav" className="flex justify-between pt-6 scroll-mt-8 kp-fade-up kp-delay-3">
              <button
                type="button"
                onClick={handlePrevPage}
                disabled={pageIndex === 0}
                className="px-5 py-2.5 rounded-xl font-bold border border-white/10 text-gray-400 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                ← ก่อนหน้า
              </button>
              <button
                type="button"
                onClick={handleNextPage}
                disabled={!canNextPage}
                className="px-6 py-2.5 rounded-xl font-bold bg-yellow-400 text-black hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {pageIndex >= totalPages - 1 ? 'ดูผลลัพธ์' : 'ถัดไป →'}
              </button>
            </div>
          </div>
        )}

        {step === 'result' && isKpComplete(displayAnswers) && (
          <>
            {exportError && (
              <p className="max-w-2xl mx-auto mb-4 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 text-center">
                {exportError}
              </p>
            )}
            <KeyPrinciplesResultView
              exportRef={resultExportRef}
              userName={displayUser.name}
              userCompany={displayUser.company}
              sectionResults={sectionResults}
              aiFeedback={aiFeedback}
              aiLoading={aiLoading}
              aiError={aiError}
              onRequestAi={() => void handleRequestAiFeedback()}
              pngLoading={pngLoading}
              pdfLoading={pdfLoading}
              onDownloadPng={() => void handleDownloadPng()}
              onDownloadPdf={() => void handleDownloadPdf()}
              onRestart={restart}
            />
          </>
        )}
      </main>
    </div>
  );
};

export default KeyPrinciplesAssessment;
