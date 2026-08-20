import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  GF_BANDS,
  GF_INTRO_DESCRIPTION,
  GF_MINDSET_CLOSING_NOTE,
  GF_MINDSET_EXPLANATIONS,
  GF_SCALE_LABELS,
  GF_SECTION_QUESTION_NUMS,
  getGfBand,
  getGfQuestionByNum,
  getGfTotalQuestionCount,
  getGfTotalScore,
  isGfComplete,
  type GfQuestionNum,
} from '../data/growthFixedMindsetData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

type Step = 'login' | 'assessment' | 'result';

type SavedGfResult = {
  user: { name: string; email: string; company: string };
  answers: Record<number, number>;
};

const STORAGE_KEY = 'growth_fixed_mindset_assessment_v2';

function safeExportFilePart(name: string): string {
  const t = name.trim() || 'ผู้ประเมิน';
  return t.replace(/[\\/:*?"<>|]/g, '_').slice(0, 48);
}

const ASSESSMENT_TITLE = 'Growth vs Fixed Mindset Assessment';
const SUBTITLE = 'Mindset Assessment';
const GF_BANNER_URL =
  'https://axaasphuaaadzjoffznj.supabase.co/storage/v1/object/public/images/G_F.png';
const GF_MAIN_SITE_URL = 'https://www.minddojo.co.th/';

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

function parseStoredAnswers(raw: Record<string, unknown> | undefined): Record<number, number> {
  const out: Record<number, number> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (let n = 1; n <= 10; n++) {
    const v = raw[String(n)];
    if (typeof v === 'number' && v >= 1 && v <= 4) out[n] = v;
  }
  return out;
}

const INTRO_BODY = (
  <>
    {GF_INTRO_DESCRIPTION.map((paragraph) => (
      <p key={paragraph.slice(0, 24)} className="mb-4 text-gray-600 leading-relaxed text-sm">
        {paragraph}
      </p>
    ))}
    <div className="rounded-xl border border-yellow-200 overflow-hidden text-left text-xs mb-4">
      <div className="flex justify-between bg-yellow-50 px-3 py-2 font-semibold text-gray-800">
        <span>1 — เห็นด้วยอย่างมาก</span>
        <span>4 — ไม่เห็นด้วยอย่างมาก</span>
      </div>
      {([1, 2, 3, 4] as const).map((s) => (
        <div key={s} className="grid grid-cols-[2rem_1fr] border-t border-yellow-100 px-3 py-2 text-gray-700">
          <span className="tabular-nums text-yellow-600 font-bold">{s}</span>
          <span>{GF_SCALE_LABELS[s]}</span>
        </div>
      ))}
    </div>
    <p className="text-xs text-gray-500 leading-relaxed">
      แบบประเมินมี 10 ข้อ · คะแนนรวม 0–30 คะแนน
    </p>
  </>
);

const GrowthFixedMindsetAssessment: React.FC = () => {
  const [showIntroModal, setShowIntroModal] = useState(false);
  const [step, setStep] = useState<Step>('login');
  const [user, setUser] = useState({ name: '', email: '', company: '' });
  const [sectionIndex, setSectionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [savedSnapshot, setSavedSnapshot] = useState<SavedGfResult | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pngLoading, setPngLoading] = useState(false);
  const resultExportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as SavedGfResult;
      const ans = parseStoredAnswers(parsed?.answers as unknown as Record<string, unknown>);
      if (parsed?.user && isGfComplete(ans)) {
        setSavedSnapshot({ ...parsed, answers: ans });
        setAnswers(ans);
        setUser(parsed.user);
        setStep('result');
      }
    } catch {
      /* ignore */
    }
  }, []);

  const totalSections = GF_SECTION_QUESTION_NUMS.length;
  const currentNums = GF_SECTION_QUESTION_NUMS[sectionIndex] ?? [];
  const totalQuestions = getGfTotalQuestionCount();
  const answeredCount = Object.keys(answers).filter((k) => {
    const n = Number(k);
    return n >= 1 && n <= 10 && answers[n] != null;
  }).length;
  const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  const isSectionComplete = (nums: GfQuestionNum[]) =>
    nums.every((n) => {
      const v = answers[n];
      return typeof v === 'number' && v >= 1 && v <= 4;
    });

  const canNextSection = isSectionComplete(currentNums as GfQuestionNum[]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (user.name.trim() && user.email.trim() && user.company.trim()) {
      setSectionIndex(0);
      setAnswers({});
      setSavedSnapshot(null);
      setShowIntroModal(true);
    }
  };

  const handleCloseIntroAndStart = () => {
    setShowIntroModal(false);
    setStep('assessment');
  };

  const scrollToNextQuestionOrNav = (questionNum: number) => {
    const nums = (GF_SECTION_QUESTION_NUMS[sectionIndex] ?? []) as GfQuestionNum[];
    const idx = nums.findIndex((n) => n === questionNum);
    const run = () => {
      if (idx >= 0 && idx < nums.length - 1) {
        const nextNum = nums[idx + 1];
        document.getElementById(`gf-question-${nextNum}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        document.getElementById('gf-assessment-nav')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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

  const persist = (payload: SavedGfResult) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* ignore */
    }
  };

  const finishAssessment = () => {
    const payload: SavedGfResult = {
      user: { name: user.name.trim(), email: user.email.trim(), company: user.company.trim() },
      answers: { ...answers },
    };
    persist(payload);
    setSavedSnapshot(payload);
    setStep('result');
    window.scrollTo(0, 0);

    if (isSupabaseConfigured && isGfComplete(payload.answers)) {
      const total = getGfTotalScore(payload.answers);
      void supabase
        .from('growth_fixed_mindset_results')
        .insert({
          name: payload.user.name,
          email: payload.user.email,
          company: payload.user.company,
          total_score: total,
          dimension_scores: {},
        })
        .then(({ error }) => {
          if (error) {
            console.warn('Growth/Fixed Mindset save to DB:', error.message);
          }
        });
    }
  };

  const handleNextSection = () => {
    if (sectionIndex < totalSections - 1) {
      setSectionIndex((i) => i + 1);
      window.scrollTo(0, 0);
    } else {
      finishAssessment();
    }
  };

  const handlePrevSection = () => {
    if (sectionIndex > 0) {
      setSectionIndex((i) => i - 1);
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
    setSectionIndex(0);
    setStep('login');
    setUser({ name: '', email: '', company: '' });
  };

  const displayAnswers = savedSnapshot?.answers ?? answers;
  const displayUser = savedSnapshot?.user ?? user;
  const totalScore = getGfTotalScore(displayAnswers);
  const band = getGfBand(totalScore);

  const exportBaseName = `Growth_Fixed_Mindset_${safeExportFilePart(displayUser.name)}_${new Date().toISOString().slice(0, 10)}`;

  const captureResultForExport = (): Promise<HTMLCanvasElement> => {
    const el = resultExportRef.current;
    if (!el) return Promise.reject(new Error('ไม่พบพื้นที่ผลลัพธ์'));
    const mobileScale = isMobileSafariLike() ? Math.min(2, window.devicePixelRatio || 1.5) : 2;
    return html2canvas(el, {
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#fffbeb',
      scale: mobileScale,
      logging: false,
      windowWidth: el.scrollWidth,
      windowHeight: el.scrollHeight,
      width: el.scrollWidth,
      height: el.scrollHeight,
    });
  };

  const savePngBlob = async (blob: Blob, fileName: string) => {
    const file = new File([blob], fileName, { type: 'image/png' });
    const blobUrl = URL.createObjectURL(blob);

    if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'ผล Growth vs Fixed Mindset Assessment',
        });
        URL.revokeObjectURL(blobUrl);
        return;
      } catch {
        // ถ้าผู้ใช้ยกเลิก share sheet ให้ fallback เป็นการเปิดรูปแทน
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
      pdf.setFillColor(255, 251, 235);
      pdf.rect(0, 0, pageW, pageH, 'F');
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;
      const totalPages = Math.max(1, Math.ceil(imgH / pageH));
      for (let p = 0; p < totalPages; p++) {
        if (p > 0) {
          pdf.addPage();
          pdf.setFillColor(255, 251, 235);
          pdf.rect(0, 0, pageW, pageH, 'F');
        }
        pdf.addImage(imgData, 'PNG', 0, -p * pageH, imgW, imgH);
      }
      pdf.save(`${exportBaseName}.pdf`);
    } catch (e) {
      console.warn('Export Growth/Fixed PDF:', e);
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
      console.warn('Export Growth/Fixed PNG:', e);
    } finally {
      setPngLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col selection:bg-yellow-400 selection:text-black bg-yellow-50 text-gray-900">
      {showIntroModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={handleCloseIntroAndStart}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-lg rounded-3xl border border-yellow-200 bg-white shadow-2xl shadow-yellow-900/10 overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="relative p-8 md:p-10 text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-yellow-100 border border-yellow-200 flex items-center justify-center">
                <span className="text-3xl" aria-hidden>
                  🌱
                </span>
              </div>
              <p className="text-[10px] uppercase tracking-widest text-yellow-700/80 mb-2 font-semibold">{SUBTITLE}</p>
              <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight mb-4">{ASSESSMENT_TITLE}</h2>
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
          <span className="text-xl font-semibold tracking-tighter text-gray-900">
            MindDoJo
          </span>
        </Link>
        {step === 'assessment' && (
          <span className="text-gray-600 text-sm font-medium">
            ตอบแล้ว {answeredCount} / {totalQuestions} ข้อ
          </span>
        )}
      </header>

      <main className="flex-1 px-6 py-8 mx-auto w-full pb-24 max-w-4xl">
        {step === 'login' && (
          <div className="max-w-2xl mx-auto">
            <div className="mb-6 rounded-2xl overflow-hidden border border-yellow-200/80 bg-white shadow-lg shadow-yellow-900/10">
              <img
                src={GF_BANNER_URL}
                alt="Growth Mindset & Fixed Mindset — Member Register"
                className="w-full h-auto object-cover"
                loading="eager"
                decoding="async"
              />
            </div>
            <p className="text-gray-600 text-sm text-center mb-6 max-w-lg mx-auto leading-relaxed">
              {GF_INTRO_DESCRIPTION[0]}
            </p>
            <form
              onSubmit={handleLoginSubmit}
              className="rounded-2xl border border-yellow-200 bg-white p-6 md:p-8 space-y-5 shadow-md shadow-yellow-900/5"
            >
              <div>
                <label htmlFor="gf-name" className="block text-sm font-medium text-gray-700 mb-2">
                  ชื่อ
                </label>
                <input
                  id="gf-name"
                  type="text"
                  value={user.name}
                  onChange={(e) => setUser((u) => ({ ...u, name: e.target.value }))}
                  placeholder="กรอกชื่อ"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-yellow-50/60 border border-yellow-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/25"
                />
              </div>
              <div>
                <label htmlFor="gf-email" className="block text-sm font-medium text-gray-700 mb-2">
                  อีเมล
                </label>
                <input
                  id="gf-email"
                  type="email"
                  value={user.email}
                  onChange={(e) => setUser((u) => ({ ...u, email: e.target.value }))}
                  placeholder="กรอกอีเมล"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-yellow-50/60 border border-yellow-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/25"
                />
              </div>
              <div>
                <label htmlFor="gf-company" className="block text-sm font-medium text-gray-700 mb-2">
                  บริษัท / องค์กร
                </label>
                <input
                  id="gf-company"
                  type="text"
                  value={user.company}
                  onChange={(e) => setUser((u) => ({ ...u, company: e.target.value }))}
                  placeholder="บริษัท"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-yellow-50/60 border border-yellow-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/25"
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
          <div className="space-y-8 max-w-2xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-gray-600">
              <span className="font-semibold text-yellow-700">
                ส่วนที่ {sectionIndex + 1} · ข้อ {currentNums[0]}–{currentNums[currentNums.length - 1]}
              </span>
              <span className="text-gray-500">
                หน้า {sectionIndex + 1} / {totalSections}
              </span>
            </div>
            <div className="h-2 rounded-full bg-yellow-100 border border-yellow-200 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="space-y-6">
              {(currentNums as GfQuestionNum[]).map((num, i) => {
                const q = getGfQuestionByNum(num);
                if (!q) return null;
                const globalIdx = GF_SECTION_QUESTION_NUMS.slice(0, sectionIndex).reduce((n, arr) => n + arr.length, 0) + i;
                return (
                  <div
                    key={num}
                    id={`gf-question-${num}`}
                    className="rounded-2xl border border-yellow-200 bg-white p-5 md:p-6 space-y-4 shadow-md shadow-yellow-900/5 scroll-mt-28"
                  >
                    <p className="text-xs font-bold text-yellow-700 uppercase tracking-widest">
                      ข้อที่ {globalIdx + 1} / {totalQuestions}
                    </p>
                    <p className="text-gray-900 text-sm md:text-base leading-relaxed font-medium">{q.text}</p>
                    <div className="rounded-xl border border-yellow-200 bg-yellow-50/50 p-3 sm:p-4 space-y-3">
                      <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                        <span className="col-span-2 text-[10px] sm:text-xs text-emerald-700 font-medium leading-snug pr-1">
                          เห็นด้วยอย่างมาก
                        </span>
                        <span className="col-span-2 text-[10px] sm:text-xs text-rose-700 font-medium leading-snug text-right pl-1">
                          ไม่เห็นด้วยอย่างมาก
                        </span>
                      </div>

                      <div
                        className="grid grid-cols-4 gap-1.5 sm:gap-2"
                        role="group"
                        aria-label="เลือกระดับความเห็นด้วย 1 ถึง 4"
                      >
                        {([1, 2, 3, 4] as const).map((v) => {
                          const selected = answers[num] === v;
                          return (
                            <button
                              key={v}
                              type="button"
                              onClick={() => setScale(num, v)}
                              title={GF_SCALE_LABELS[v]}
                              aria-label={`${v} — ${GF_SCALE_LABELS[v]}`}
                              aria-pressed={selected}
                              className={`w-full min-h-[2.75rem] sm:min-h-[3rem] rounded-xl text-sm sm:text-base font-bold border-2 transition-all active:scale-[0.97] ${
                                selected
                                  ? 'bg-yellow-400/30 border-yellow-500 text-gray-900 shadow-md shadow-yellow-400/25 scale-[1.02]'
                                  : 'bg-white border-yellow-200 text-gray-600 hover:border-yellow-400 hover:bg-yellow-50'
                              }`}
                            >
                              {v}
                            </button>
                          );
                        })}
                      </div>

                      {answers[num] != null && (
                        <p className="text-center text-xs text-yellow-800 font-medium pt-2 border-t border-yellow-200">
                          เลือก: {GF_SCALE_LABELS[answers[num] as 1 | 2 | 3 | 4]}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div id="gf-assessment-nav" className="flex justify-between pt-6 scroll-mt-8">
              <button
                type="button"
                onClick={handlePrevSection}
                disabled={sectionIndex === 0}
                className="px-5 py-2.5 rounded-xl font-bold border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                ← ก่อนหน้า
              </button>
              <button
                type="button"
                onClick={handleNextSection}
                disabled={!canNextSection}
                className="px-6 py-2.5 rounded-xl font-bold bg-yellow-400 text-black hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-yellow-400/20"
              >
                {sectionIndex >= totalSections - 1 ? 'ดูผลลัพธ์' : 'ถัดไป →'}
              </button>
            </div>
          </div>
        )}

        {step === 'result' && isGfComplete(displayAnswers) && (
          <div className="space-y-8 max-w-2xl mx-auto">
            <div ref={resultExportRef} className="space-y-8 bg-yellow-50">
              <div className="rounded-2xl border border-yellow-200 bg-white p-6 md:p-8 space-y-6 text-center shadow-md shadow-yellow-900/5">
                <p className="text-[10px] uppercase tracking-widest text-yellow-700/80 font-semibold">
                  Growth vs Fixed Mindset
                </p>
                <h1 className="text-2xl md:text-3xl font-black text-gray-900">ผลการประเมิน</h1>
                <p className="text-gray-600 text-sm">{displayUser.name}</p>
                <p className="text-xs text-gray-500 -mt-4">
                  {displayUser.company} · {displayUser.email}
                </p>

                <div className="rounded-2xl bg-yellow-50 border border-yellow-200 p-6">
                  <p className="text-sm text-gray-600 mb-1">คะแนนรวม</p>
                  <p className="text-4xl md:text-5xl font-black text-yellow-600 tabular-nums">{totalScore}</p>
                  <p className="text-xs text-gray-500 mt-2">ช่วงคะแนน 0–30 คะแนน</p>
                </div>

                <img
                  src={band.imageUrl}
                  alt={band.levelTh}
                  className="w-full max-w-sm mx-auto h-auto rounded-xl border border-yellow-100"
                  loading="lazy"
                  decoding="async"
                />

                <div className="rounded-xl border border-yellow-200 bg-yellow-50/80 p-5">
                  <p className="text-lg font-bold text-gray-900 text-center">{band.levelTh}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-yellow-200 bg-white p-6 space-y-3 shadow-md shadow-yellow-900/5">
                <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">เกณฑ์การแปลผล</h2>
                <div className="space-y-2 text-xs text-gray-600">
                  {GF_BANDS.map((b) => (
                    <div
                      key={b.id}
                      className={`flex gap-3 border-t border-yellow-100 first:border-t-0 first:pt-0 pt-2 ${
                        b.id === band.id ? 'text-gray-900' : ''
                      }`}
                    >
                      <span
                        className={`shrink-0 tabular-nums font-semibold w-24 ${
                          b.id === band.id ? 'text-yellow-700' : 'text-yellow-600/80'
                        }`}
                      >
                        {b.min}–{b.max}
                      </span>
                      <span className={b.id === band.id ? 'font-semibold text-gray-900' : 'text-gray-700'}>
                        {b.levelTh}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-yellow-200 bg-white p-6 space-y-4 shadow-md shadow-yellow-900/5">
                <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">ทำความเข้าใจ Mindset</h2>
                <div className="space-y-4">
                  {GF_MINDSET_EXPLANATIONS.map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-xl border p-4 sm:p-5 ${
                        item.id === 'growth'
                          ? 'border-emerald-200 bg-emerald-50'
                          : 'border-amber-200 bg-amber-50'
                      }`}
                    >
                      <h3
                        className={`text-sm font-bold mb-2 ${
                          item.id === 'growth' ? 'text-emerald-800' : 'text-amber-900'
                        }`}
                      >
                        {item.title}
                      </h3>
                      <p className="text-sm text-gray-700 leading-relaxed">{item.body}</p>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed border-t border-yellow-100 pt-4">
                  {GF_MINDSET_CLOSING_NOTE}
                </p>
              </div>

              <p className="text-center text-[10px] text-gray-400 pb-2">
                MindDoJo · Growth vs Fixed Mindset Assessment
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
              <button
                type="button"
                onClick={handleDownloadPng}
                disabled={pngLoading}
                className="px-6 py-3 rounded-xl font-bold border border-yellow-300 bg-white text-gray-700 hover:bg-yellow-50 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                {pngLoading ? (
                  <>
                    <span
                      className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin shrink-0"
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
                className="px-6 py-3 rounded-xl font-bold border border-yellow-300 bg-white text-gray-700 hover:bg-yellow-50 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                {pdfLoading ? (
                  <>
                    <span
                      className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin shrink-0"
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
                className="px-6 py-3 rounded-xl font-bold border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 transition-all shadow-sm"
              >
                ทำแบบประเมินใหม่
              </button>
              <Link
                to="/"
                className="px-6 py-3 rounded-xl font-bold border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 text-center transition-all shadow-sm"
              >
                กลับหน้าแบบประเมิน
              </Link>
            </div>

            <div className="rounded-2xl border border-yellow-200 bg-white p-6 text-center shadow-md shadow-yellow-900/5">
              <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-2">ช่องทางติดต่อ</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                สนใจหลักสูตรอบรม หรือต้องการข้อมูลเพิ่มเติมจาก MindDoJo เยี่ยมชมเว็บไซต์หลักได้ที่
              </p>
              <a
                href={GF_MAIN_SITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold bg-yellow-400 text-black hover:bg-yellow-300 transition-all shadow-md shadow-yellow-400/20"
              >
                www.minddojo.co.th
                <span aria-hidden>↗</span>
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default GrowthFixedMindsetAssessment;
