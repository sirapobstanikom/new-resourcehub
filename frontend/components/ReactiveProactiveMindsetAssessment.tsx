import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  RP_BANDS,
  RP_CLOSING_MESSAGE,
  RP_DIMENSIONS,
  RP_SCALE_LABELS,
  RP_SECTION_QUESTION_NUMS,
  getRpBand,
  getRpDimensionPercent,
  getRpDimensionSum,
  getRpQuestionByNum,
  getRpTotalQuestionCount,
  getRpTotalScore,
  isRpComplete,
  type RpQuestionNum,
} from '../data/reactiveProactiveMindsetData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

type Step = 'login' | 'assessment' | 'result';

type SavedRpResult = {
  user: { name: string; email: string; company: string };
  answers: Record<number, number>;
};

const STORAGE_KEY = 'reactive_proactive_mindset_assessment_v1';

function safeExportFilePart(name: string): string {
  const t = name.trim() || 'ผู้ประเมิน';
  return t.replace(/[\\/:*?"<>|]/g, '_').slice(0, 48);
}

const ASSESSMENT_TITLE = 'Reactive vs Proactive Mindset Assessment';
const SUBTITLE = 'Mindset Assessment';

function parseStoredAnswers(raw: Record<string, unknown> | undefined): Record<number, number> {
  const out: Record<number, number> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (let n = 1; n <= 20; n++) {
    const v = raw[String(n)];
    if (typeof v === 'number' && v >= 1 && v <= 5) out[n] = v;
  }
  return out;
}

const INTRO_BODY = (
  <>
    <p className="mb-4 text-gray-300 leading-relaxed">
      แบบประเมินนี้มีวัตถุประสงค์เพื่อให้ท่านสำรวจแนวโน้มวิธีคิดและพฤติกรรมของตนเองเมื่อต้องเผชิญกับสถานการณ์ในการทำงาน ทั้งในด้านการรับมือกับปัญหา
      การสื่อสาร การตัดสินใจ และการรับผิดชอบต่อผลลัพธ์
    </p>
    <p className="mb-4 text-gray-400 text-sm leading-relaxed">
      โปรดอ่านข้อความแต่ละข้อ และให้คะแนนตามความเป็นจริงมากที่สุด โดยไม่มีคำตอบที่ถูกหรือผิด
    </p>
    <div className="rounded-xl border border-white/10 overflow-hidden text-left text-xs mb-4">
      <div className="grid grid-cols-2 bg-white/10 px-3 py-2 font-semibold text-white">
        <span>คะแนน</span>
        <span>ความหมาย</span>
      </div>
      {([1, 2, 3, 4, 5] as const).map((s) => (
        <div key={s} className="grid grid-cols-2 border-t border-white/10 px-3 py-2 text-gray-300">
          <span className="tabular-nums text-yellow-400/90 font-bold">{s}</span>
          <span>{RP_SCALE_LABELS[s]}</span>
        </div>
      ))}
    </div>
    <p className="text-xs text-gray-500 leading-relaxed">
      หลังทำครบ ระบบจะกลับคะแนนข้อที่สะท้อน Reactive Mindset ตามเกณฑ์ แล้วรวมเป็น 20–100 คะแนน พร้อมแปลผลและวิเคราะห์รายมิติ
    </p>
  </>
);

const ReactiveProactiveMindsetAssessment: React.FC = () => {
  const [showIntroModal, setShowIntroModal] = useState(false);
  const [step, setStep] = useState<Step>('login');
  const [user, setUser] = useState({ name: '', email: '', company: '' });
  const [sectionIndex, setSectionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [savedSnapshot, setSavedSnapshot] = useState<SavedRpResult | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pngLoading, setPngLoading] = useState(false);
  const resultExportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as SavedRpResult;
      const ans = parseStoredAnswers(parsed?.answers as unknown as Record<string, unknown>);
      if (parsed?.user && isRpComplete(ans)) {
        setSavedSnapshot({ ...parsed, answers: ans });
        setAnswers(ans);
        setUser(parsed.user);
        setStep('result');
      }
    } catch {
      /* ignore */
    }
  }, []);

  const totalSections = RP_SECTION_QUESTION_NUMS.length;
  const currentNums = RP_SECTION_QUESTION_NUMS[sectionIndex] ?? [];
  const totalQuestions = getRpTotalQuestionCount();
  const answeredCount = Object.keys(answers).filter((k) => {
    const n = Number(k);
    return n >= 1 && n <= 20 && answers[n] != null;
  }).length;
  const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  const isSectionComplete = (nums: RpQuestionNum[]) =>
    nums.every((n) => {
      const v = answers[n];
      return typeof v === 'number' && v >= 1 && v <= 5;
    });

  const canNextSection = isSectionComplete(currentNums as RpQuestionNum[]);

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
    const nums = (RP_SECTION_QUESTION_NUMS[sectionIndex] ?? []) as RpQuestionNum[];
    const idx = nums.findIndex((n) => n === questionNum);
    const run = () => {
      if (idx >= 0 && idx < nums.length - 1) {
        const nextNum = nums[idx + 1];
        document.getElementById(`rp-question-${nextNum}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        document.getElementById('rp-assessment-nav')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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

  const persist = (payload: SavedRpResult) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* ignore */
    }
  };

  const finishAssessment = () => {
    const payload: SavedRpResult = {
      user: { name: user.name.trim(), email: user.email.trim(), company: user.company.trim() },
      answers: { ...answers },
    };
    persist(payload);
    setSavedSnapshot(payload);
    setStep('result');
    window.scrollTo(0, 0);

    if (isSupabaseConfigured && isRpComplete(payload.answers)) {
      const total = getRpTotalScore(payload.answers);
      const dimensionScores = Object.fromEntries(
        RP_DIMENSIONS.map((d) => [d.id, getRpDimensionSum(d, payload.answers)]),
      );
      void supabase
        .from('reactive_proactive_mindset_results')
        .insert({
          name: payload.user.name,
          email: payload.user.email,
          company: payload.user.company,
          total_score: total,
          dimension_scores: dimensionScores,
        })
        .then(({ error }) => {
          if (error) console.warn('Reactive/Proactive save to DB:', error.message);
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
  const totalScore = getRpTotalScore(displayAnswers);
  const band = getRpBand(totalScore);

  const exportBaseName = `Reactive_Proactive_Mindset_${safeExportFilePart(displayUser.name)}_${new Date().toISOString().slice(0, 10)}`;

  const captureResultForExport = (): Promise<HTMLCanvasElement> => {
    const el = resultExportRef.current;
    if (!el) return Promise.reject(new Error('ไม่พบพื้นที่ผลลัพธ์'));
    return html2canvas(el, {
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#0a0a0a',
      scale: 2,
      logging: false,
      windowHeight: el.scrollHeight,
      height: el.scrollHeight,
    });
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
      console.warn('Export Reactive/Proactive PDF:', e);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDownloadPng = async () => {
    if (!resultExportRef.current) return;
    setPngLoading(true);
    try {
      const canvas = await captureResultForExport();
      const link = document.createElement('a');
      link.download = `${exportBaseName}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.warn('Export Reactive/Proactive PNG:', e);
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
          <div className="relative w-full max-w-lg rounded-3xl border border-white/20 bg-gradient-to-b from-neutral-900/95 to-black/95 shadow-2xl shadow-emerald-400/10 overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(52,211,153,0.12),transparent)] pointer-events-none" />
            <div className="relative p-8 md:p-10 text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-emerald-400/20 border border-emerald-400/35 flex items-center justify-center">
                <span className="text-3xl" aria-hidden>
                  ⚡
                </span>
              </div>
              <p className="text-[10px] uppercase tracking-widest text-emerald-400/90 mb-2">{SUBTITLE}</p>
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
            <p className="text-center text-[10px] uppercase tracking-widest text-emerald-400/90 mb-2">{SUBTITLE}</p>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-2 text-center leading-snug">
              Reactive vs Proactive
            </h1>
            <p className="text-gray-400 text-sm text-center mb-6 max-w-sm mx-auto leading-relaxed">
              สำรวจแนวโน้มวิธีคิดและพฤติกรรมของตนเองเมื่อเผชิญสถานการณ์ในการทำงาน ทั้งการรับมือกับปัญหา การสื่อสาร การตัดสินใจ
              และการรับผิดชอบต่อผลลัพธ์ — ใช้ในห้องอบรมหรือก่อนเรียน
            </p>
            <form
              onSubmit={handleLoginSubmit}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8 space-y-5"
            >
              <div>
                <label htmlFor="rp-name" className="block text-sm font-medium text-gray-400 mb-2">
                  ชื่อ
                </label>
                <input
                  id="rp-name"
                  type="text"
                  value={user.name}
                  onChange={(e) => setUser((u) => ({ ...u, name: e.target.value }))}
                  placeholder="กรอกชื่อ"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
                />
              </div>
              <div>
                <label htmlFor="rp-email" className="block text-sm font-medium text-gray-400 mb-2">
                  อีเมล
                </label>
                <input
                  id="rp-email"
                  type="email"
                  value={user.email}
                  onChange={(e) => setUser((u) => ({ ...u, email: e.target.value }))}
                  placeholder="กรอกอีเมล"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
                />
              </div>
              <div>
                <label htmlFor="rp-company" className="block text-sm font-medium text-gray-400 mb-2">
                  บริษัท / องค์กร
                </label>
                <input
                  id="rp-company"
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
              <span className="font-semibold text-emerald-400/90">
                ส่วนที่ {sectionIndex + 1} · ข้อ {currentNums[0]}–{currentNums[currentNums.length - 1]}
              </span>
              <span>
                หน้า {sectionIndex + 1} / {totalSections}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500/90 to-yellow-400 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="space-y-6">
              {(currentNums as RpQuestionNum[]).map((num, i) => {
                const q = getRpQuestionByNum(num);
                if (!q) return null;
                const globalIdx = RP_SECTION_QUESTION_NUMS.slice(0, sectionIndex).reduce((n, arr) => n + arr.length, 0) + i;
                return (
                  <div
                    key={num}
                    id={`rp-question-${num}`}
                    className="rounded-2xl border border-white/10 bg-white/5 p-5 md:p-6 space-y-4 shadow-lg shadow-black/20 scroll-mt-28"
                  >
                    <p className="text-xs font-bold text-yellow-400/90 uppercase tracking-widest">
                      ข้อที่ {globalIdx + 1} / {totalQuestions}
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
                            title={RP_SCALE_LABELS[v]}
                            className={`min-w-[2.75rem] px-3 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                              answers[num] === v
                                ? 'bg-emerald-400/20 border-emerald-400 text-white'
                                : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/25'
                            }`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                      {answers[num] != null && (
                        <p className="text-xs text-gray-400 mt-1">{RP_SCALE_LABELS[answers[num] as 1 | 2 | 3 | 4 | 5]}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div id="rp-assessment-nav" className="flex justify-between pt-6 scroll-mt-8">
              <button
                type="button"
                onClick={handlePrevSection}
                disabled={sectionIndex === 0}
                className="px-5 py-2.5 rounded-xl font-bold border border-white/10 text-gray-400 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                ← ก่อนหน้า
              </button>
              <button
                type="button"
                onClick={handleNextSection}
                disabled={!canNextSection}
                className="px-6 py-2.5 rounded-xl font-bold bg-yellow-400 text-black hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {sectionIndex >= totalSections - 1 ? 'ดูผลลัพธ์' : 'ถัดไป →'}
              </button>
            </div>
          </div>
        )}

        {step === 'result' && isRpComplete(displayAnswers) && (
          <div className="space-y-10 max-w-xl mx-auto">
            <div ref={resultExportRef} className="space-y-10">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8 space-y-6 text-center">
                <p className="text-[10px] uppercase tracking-widest text-emerald-400/90">Reactive vs Proactive</p>
                <h1 className="text-2xl md:text-3xl font-black text-white">ผลการประเมิน</h1>
                <p className="text-gray-400 text-sm">{displayUser.name}</p>
                <p className="text-xs text-gray-500 -mt-4">
                  {displayUser.company} · {displayUser.email}
                </p>

                <div className="rounded-2xl bg-black/40 border border-emerald-400/25 p-6 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(52,211,153,0.08),transparent_50%)] pointer-events-none" />
                  <p className="text-sm text-gray-400 mb-1 relative">คะแนนรวม (หลังปรับข้อ Reactive)</p>
                  <p className="text-4xl md:text-5xl font-black text-yellow-400 tabular-nums relative">{totalScore}</p>
                  <p className="text-xs text-gray-500 mt-2 relative">ช่วงคะแนน 20–100 คะแนน</p>
                </div>

                <div className="text-left rounded-xl border border-white/10 bg-white/[0.04] p-5">
                  <p className="text-lg font-bold text-white">{band.levelTh}</p>
                  <p className="text-gray-300 text-sm mt-2 leading-relaxed">{band.descriptionTh}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-3">
                <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider">เกณฑ์การแปลผล</h2>
                <div className="space-y-2 text-xs text-gray-400">
                  {RP_BANDS.map((b) => (
                    <div key={b.id} className="flex gap-3 border-t border-white/10 first:border-t-0 first:pt-0 pt-2">
                      <span className="shrink-0 tabular-nums text-emerald-400/90 font-semibold w-24">
                        {b.min}–{b.max}
                      </span>
                      <span>
                        <span className="text-white font-medium">{b.levelEn}</span> — {b.descriptionTh}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
                <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider">วิเคราะห์รายมิติ (เทียบเต็ม 25 ต่อมิติ)</h2>
                {RP_DIMENSIONS.map((dim) => {
                  const sum = getRpDimensionSum(dim, displayAnswers);
                  const pct = getRpDimensionPercent(dim, displayAnswers);
                  return (
                    <div key={dim.id}>
                      <div className="flex justify-between gap-2 text-xs text-gray-400 mb-1">
                        <div>
                          <span className="text-white font-medium block">{dim.titleEn}</span>
                          <span className="text-[11px] text-gray-500">{dim.titleTh}</span>
                        </div>
                        <span className="tabular-nums shrink-0 text-emerald-400/90 font-semibold">
                          {sum} / 25
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mb-2 leading-snug">{dim.descriptionTh}</p>
                      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500/80 to-yellow-400/90 rounded-full transition-all"
                          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-xl border border-white/10 bg-emerald-950/20 p-5 text-sm text-gray-300 leading-relaxed">
                <p className="text-emerald-400/90 font-semibold text-xs uppercase tracking-wider mb-2"></p>
                {RP_CLOSING_MESSAGE}
              </div>

              <p className="text-center text-[10px] text-gray-500 pb-2">MindDoJo · Reactive vs Proactive Mindset Assessment</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
              <button
                type="button"
                onClick={handleDownloadPng}
                disabled={pngLoading}
                className="px-6 py-3 rounded-xl font-bold border border-emerald-400/50 text-emerald-200 hover:bg-emerald-400/10 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {pngLoading ? (
                  <>
                    <span
                      className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin shrink-0"
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

export default ReactiveProactiveMindsetAssessment;
