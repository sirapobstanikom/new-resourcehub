import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { getKeyPrinciplesFeedback } from '../services/gemini';
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
  type KpBandId,
  type KpQuestionNum,
} from '../data/keyPrinciplesData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

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

const BAND_BADGE_CLASS: Record<KpBandId, string> = {
  develop: 'bg-red-500/15 border-red-400/30 text-red-200',
  growth: 'bg-amber-500/15 border-amber-400/30 text-amber-200',
  strength: 'bg-emerald-500/15 border-emerald-400/30 text-emerald-200',
};

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

  const captureResultForExport = (): Promise<HTMLCanvasElement> => {
    const el = resultExportRef.current;
    if (!el) return Promise.reject(new Error('ไม่พบพื้นที่ผลลัพธ์'));
    const mobileScale = isMobileSafariLike() ? Math.min(2, window.devicePixelRatio || 1.5) : 2;
    return html2canvas(el, {
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#0a0a0a',
      scale: mobileScale,
      logging: false,
      windowWidth: el.scrollWidth,
      windowHeight: el.scrollHeight,
      width: el.scrollWidth,
      height: el.scrollHeight,
      ignoreElements: (node) => node.classList?.contains('exclude-from-export') === true,
    });
  };

  const savePngBlob = async (blob: Blob, fileName: string) => {
    const file = new File([blob], fileName, { type: 'image/png' });
    const blobUrl = URL.createObjectURL(blob);

    if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'ผล Key Principles Assessment' });
        URL.revokeObjectURL(blobUrl);
        return;
      } catch {
        /* fallback */
      }
    }

    if (isMobileSafariLike()) {
      window.open(blobUrl, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
      return;
    }

    const link = document.createElement('a');
    link.download = fileName;
    link.href = blobUrl;
    link.click();
    URL.revokeObjectURL(blobUrl);
  };

  const handleDownloadPdf = async () => {
    if (!resultExportRef.current) return;
    setPdfLoading(true);
    try {
      const canvas = await captureResultForExport();
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      pdf.setFillColor(10, 10, 10);
      pdf.rect(0, 0, pageW, pageH, 'F');
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;
      const totalPages = Math.max(1, Math.ceil(imgH / pageH));
      for (let p = 0; p < totalPages; p++) {
        if (p > 0) {
          pdf.addPage();
          pdf.setFillColor(10, 10, 10);
          pdf.rect(0, 0, pageW, pageH, 'F');
        }
        pdf.addImage(imgData, 'PNG', 0, -p * pageH, imgW, imgH);
      }
      pdf.save(`${exportBaseName}.pdf`);
    } catch (e) {
      console.warn('Export Key Principles PDF:', e);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDownloadPng = async () => {
    if (!resultExportRef.current) return;
    setPngLoading(true);
    try {
      const canvas = await captureResultForExport();
      const blob = await canvasToPngBlob(canvas);
      await savePngBlob(blob, `${exportBaseName}.png`);
    } catch (e) {
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
          <div className="relative w-full max-w-lg rounded-3xl border border-white/20 bg-gradient-to-b from-neutral-900/95 to-black/95 shadow-2xl shadow-yellow-400/10 overflow-hidden max-h-[90vh] overflow-y-auto">
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

      <main className="flex-1 px-6 py-8 max-w-3xl mx-auto w-full pb-24">
        {step === 'login' && (
          <div className="max-w-md mx-auto">
            <p className="text-center text-[10px] uppercase tracking-widest text-yellow-400/90 mb-2">{SUBTITLE}</p>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-2 text-center leading-snug">Key Principles</h1>
            <p className="text-gray-400 text-sm text-center mb-6 max-w-sm mx-auto leading-relaxed">
              25 ข้อ · สเกล 1–5 · สรุปผล 5 ส่วน: Self Esteem, Empathy, Involvement, Support, Share
            </p>
            <form
              onSubmit={handleLoginSubmit}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8 space-y-5"
            >
              <div>
                <label htmlFor="kp-name" className="block text-sm font-medium text-gray-400 mb-2">
                  ชื่อ
                </label>
                <input
                  id="kp-name"
                  type="text"
                  value={user.name}
                  onChange={(e) => setUser((u) => ({ ...u, name: e.target.value }))}
                  placeholder="กรอกชื่อ"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
                />
              </div>
              <div>
                <label htmlFor="kp-company" className="block text-sm font-medium text-gray-400 mb-2">
                  บริษัท / องค์กร
                </label>
                <input
                  id="kp-company"
                  type="text"
                  value={user.company}
                  onChange={(e) => setUser((u) => ({ ...u, company: e.target.value }))}
                  placeholder="บริษัท"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl font-bold bg-yellow-400 text-black hover:bg-yellow-300 shadow-lg shadow-yellow-400/20 transition-all"
              >
                เข้าสู่แบบประเมิน
              </button>
            </form>
          </div>
        )}

        {step === 'assessment' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-gray-500">
              <span className="font-semibold text-yellow-400/90">
                {KP_PAGE_TITLES[pageIndex]} · ข้อ {currentNums[0]}–{currentNums[currentNums.length - 1]}
              </span>
              <span>
                หน้า {pageIndex + 1} / {totalPages}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-500/90 to-yellow-300 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="space-y-6">
              {(currentNums as KpQuestionNum[]).map((num) => {
                const q = getKpQuestionByNum(num);
                if (!q) return null;
                return (
                  <div
                    key={num}
                    id={`kp-question-${num}`}
                    className="rounded-2xl border border-white/10 bg-white/5 p-5 md:p-6 space-y-4 shadow-lg shadow-black/20 scroll-mt-28"
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
                            className={`min-w-[2.75rem] px-3 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                              answers[num] === v
                                ? 'bg-yellow-400/20 border-yellow-400 text-white'
                                : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/25'
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

            <div id="kp-assessment-nav" className="flex justify-between pt-6 scroll-mt-8">
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
          <div className="space-y-10 max-w-xl mx-auto">
            <div ref={resultExportRef} className="space-y-10">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8 space-y-4 text-center">
                <p className="text-[10px] uppercase tracking-widest text-yellow-400/90">Key Principles</p>
                <h1 className="text-2xl md:text-3xl font-black text-white">ผลการประเมิน</h1>
                <p className="text-gray-400 text-sm">{displayUser.name}</p>
                <p className="text-xs text-gray-500 -mt-2">{displayUser.company}</p>
              </div>

              <div className="space-y-5">
                {sectionResults.map(({ section, sum, band }) => (
                  <div
                    key={section.id}
                    className="rounded-2xl border border-white/10 bg-white/5 p-5 md:p-6 space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h2 className="text-lg font-bold text-white">{section.titleEn}</h2>
                      <p className="text-2xl font-black text-yellow-400 tabular-nums shrink-0">
                        {sum}
                        <span className="text-sm text-gray-500 font-semibold"> / 25</span>
                      </p>
                    </div>
                    <div
                      className={`inline-block text-xs font-semibold px-3 py-1 rounded-full border ${BAND_BADGE_CLASS[band.id]}`}
                    >
                      ช่วง {band.min}–{band.max}
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed">{band.meaningTh}</p>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-yellow-500/80 to-yellow-300/90 rounded-full transition-all"
                        style={{ width: `${Math.round((sum / 25) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-3">
                <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider">เกณฑ์การแปลผล (ต่อส่วน)</h2>
                {KP_SCORE_BANDS.map((b) => (
                  <div
                    key={b.id}
                    className="flex gap-3 border-t border-white/10 first:border-t-0 first:pt-0 pt-2 text-xs text-gray-400"
                  >
                    <span className="shrink-0 tabular-nums text-yellow-400/90 font-semibold w-14">
                      {b.min}–{b.max}
                    </span>
                    <span>{b.meaningTh}</span>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-yellow-400/25 bg-white/[0.06] p-6 space-y-4">
                <h2 className="text-sm font-bold text-yellow-400/90 uppercase tracking-wider">สรุปผลด้วย AI</h2>
                <p className="text-xs text-gray-500 -mt-2">
                  วิเคราะห์คะแนนทั้ง 5 ส่วน — เน้นจุดแข็งและแนวทางปฏิบัติที่เป็นรูปธรรม
                </p>
                {aiLoading && (
                  <div className="flex items-center gap-3 text-gray-400">
                    <div
                      className="w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin shrink-0"
                      aria-hidden
                    />
                    <span>กำลังสร้างสรุป Feedback...</span>
                  </div>
                )}
                {!aiLoading && aiFeedback && (
                  <div className="whitespace-pre-wrap text-gray-200 text-sm leading-relaxed border-t border-white/10 pt-4">
                    {aiFeedback}
                  </div>
                )}
                {!aiLoading && aiError && <p className="text-sm text-red-300/90">{aiError}</p>}
                {!aiLoading && (
                  <button
                    type="button"
                    onClick={() => void handleRequestAiFeedback()}
                    className="exclude-from-export w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-bold bg-yellow-400 text-black hover:bg-yellow-300 transition-all"
                  >
                    {aiFeedback ? 'สร้างสรุป Feedback ใหม่' : 'รับสรุป Feedback จาก AI'}
                  </button>
                )}
              </div>

              <p className="text-center text-[10px] text-gray-500 pb-2">MindDoJo · Key Principles Assessment</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
              <button
                type="button"
                onClick={handleDownloadPng}
                disabled={pngLoading}
                className="px-6 py-3 rounded-xl font-bold border border-yellow-400/50 text-yellow-200 hover:bg-yellow-400/10 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {pngLoading ? (
                  <>
                    <span
                      className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin shrink-0"
                      aria-hidden
                    />
                    กำลังสร้าง PNG…
                  </>
                ) : (
                  'ดาวน์โหลด PNG'
                )}
              </button>
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={pdfLoading}
                className="px-6 py-3 rounded-xl font-bold border border-yellow-400/50 text-yellow-200 hover:bg-yellow-400/10 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {pdfLoading ? (
                  <>
                    <span
                      className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin shrink-0"
                      aria-hidden
                    />
                    กำลังสร้าง PDF…
                  </>
                ) : (
                  'ดาวน์โหลด PDF'
                )}
              </button>
              <button
                type="button"
                onClick={restart}
                className="px-6 py-3 rounded-xl font-bold border border-white/15 text-gray-300 hover:bg-white/5 transition-all"
              >
                ทำแบบประเมินใหม่
              </button>
              <Link
                to="/"
                className="px-6 py-3 rounded-xl font-bold bg-yellow-400 text-black hover:bg-yellow-300 text-center transition-all"
              >
                กลับหน้าหลัก
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default KeyPrinciplesAssessment;
