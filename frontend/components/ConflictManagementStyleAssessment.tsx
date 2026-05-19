import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  CMS_SCALE_LABELS,
  CMS_SECTION_QUESTION_NUMS,
  CMS_STYLES,
  getCmsQuestionByNum,
  getCmsStyleScores,
  getCmsTotalQuestionCount,
  isCmsComplete,
  type CmsQuestionNum,
  type CmsStyleId,
} from '../data/conflictManagementStyleData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

type Step = 'login' | 'assessment' | 'result';

type SavedCmsResult = {
  user: { name: string; email: string; company: string };
  answers: Record<number, number>;
};

const STORAGE_KEY = 'conflict_management_style_assessment_v1';

const ASSESSMENT_TITLE = 'การประเมินรูปแบบการจัดการความขัดแย้ง';
const SUBTITLE = 'Conflict Management Style';

const CMS_SECTION_TITLES = ['ช่วงข้อ 1–5', 'ช่วงข้อ 6–10', 'ช่วงข้อ 11–15'] as const;

const inputFieldClass =
  'w-full rounded-2xl border border-white/12 bg-black/45 px-4 py-3.5 text-[15px] text-white placeholder:text-gray-600 shadow-inner shadow-black/40 focus:border-sky-400/60 focus:outline-none focus:ring-2 focus:ring-sky-500/25 focus:ring-offset-2 focus:ring-offset-black/20 transition-all';

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

function isDesktopViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2;
}

function smoothScrollToY(targetY: number, durationMs = 760): void {
  if (typeof window === 'undefined') return;

  if (!isDesktopViewport()) {
    window.scrollTo({ top: targetY, behavior: 'smooth' });
    return;
  }

  const startY = window.scrollY;
  const distance = targetY - startY;
  if (Math.abs(distance) < 2) return;
  const adaptiveDurationMs = Math.max(700, Math.min(1200, durationMs + Math.abs(distance) * 0.18));
  const startTime = performance.now();

  const tick = (now: number) => {
    const elapsed = now - startTime;
    const p = Math.min(1, elapsed / adaptiveDurationMs);
    const eased = easeInOutCubic(p);
    window.scrollTo(0, startY + distance * eased);
    if (p < 1) requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}

function smoothScrollToElementById(id: string, block: ScrollLogicalPosition = 'start'): void {
  const el = document.getElementById(id);
  if (!el) return;
  if (!isDesktopViewport()) {
    el.scrollIntoView({ behavior: 'smooth', block });
    return;
  }
  const rect = el.getBoundingClientRect();
  const targetY = window.scrollY + rect.top - (block === 'nearest' ? 32 : 16);
  smoothScrollToY(targetY, 820);
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
  for (let n = 1; n <= 15; n++) {
    const v = raw[String(n)];
    if (typeof v === 'number' && v >= 1 && v <= 4) out[n] = v;
  }
  return out;
}

const INTRO_BODY = (
  <>
    <p className="mb-5 text-gray-300 leading-relaxed text-[15px]">
      อ่านแต่ละข้อความแล้วเลือกคำตอบที่ตรงกับตัวคุณมากที่สุด โดยพิจารณาว่าข้อความนั้นสะท้อนแนวโน้ม วิธีคิด
      หรือวิธีการที่คุณมักใช้เมื่อต้องจัดการกับความขัดแย้งมากน้อยเพียงใด ไม่มีคำตอบที่ถูกหรือผิด
      ขอให้ตอบตามความเป็นจริง เพื่อให้ผลลัพธ์สะท้อนรูปแบบของคุณได้ใกล้เคียงที่สุด
    </p>
    <div className="rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-500/10 via-black/20 to-yellow-500/5 overflow-hidden text-left mb-5">
      <div className="px-4 py-3 border-b border-white/10 bg-white/[0.06]">
        <p className="text-[11px] font-bold uppercase tracking-wider text-sky-300/90">สเกลการตอบ</p>
        <p className="text-xs text-gray-500 mt-0.5">แตะเลข 1–4 ตามความถี่ที่คุณทำแบบนั้น</p>
      </div>
      <div className="grid grid-cols-2 gap-px bg-white/10">
        {([1, 2, 3, 4] as const).map((s) => (
          <div
            key={s}
            className="flex items-center gap-3 bg-black/35 px-3 py-3 sm:px-4 sm:py-3.5"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-yellow-400/15 text-sm font-black tabular-nums text-yellow-300 ring-1 ring-yellow-400/30">
              {s}
            </span>
            <span className="text-sm text-gray-200 leading-snug">{CMS_SCALE_LABELS[s]}</span>
          </div>
        ))}
      </div>
    </div>
    <p className="text-xs text-gray-500 leading-relaxed rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
      เมื่อทำครบ 15 ข้อ ระบบจะรวมคะแนนตามรูปแบบ 5 ประเภท ได้แก่ การหลีกหนี การยอมตาม การเอาชนะ การร่วมมือ และการประนีประนอม
      <span className="text-gray-400"> (แต่ละแบบคะแนนเต็ม 12)</span>
    </p>
  </>
);

const STYLE_ARTWORK: Record<
  CmsStyleId,
  {
    titleTh: string;
    image: string;
  }
> = {
  avoiding: {
    titleTh: 'การหลีกหนี',
    image: 'https://axaasphuaaadzjoffznj.supabase.co/storage/v1/object/public/images/avoiding.png',
  },
  accommodating: {
    titleTh: 'การยอมตาม',
    image: 'https://axaasphuaaadzjoffznj.supabase.co/storage/v1/object/public/images/accommodating.png',
  },
  competing: {
    titleTh: 'การเอาชนะ',
    image: 'https://axaasphuaaadzjoffznj.supabase.co/storage/v1/object/public/images/competing.png',
  },
  collaborating: {
    titleTh: 'การร่วมมือ',
    image: 'https://axaasphuaaadzjoffznj.supabase.co/storage/v1/object/public/images/collaborating.png',
  },
  compromising: {
    titleTh: 'การประนีประนอม',
    image: 'https://axaasphuaaadzjoffznj.supabase.co/storage/v1/object/public/images/Compromising.webp',
  },
};

const ConflictManagementStyleAssessment: React.FC = () => {
  const [showIntroModal, setShowIntroModal] = useState(false);
  const [step, setStep] = useState<Step>('login');
  const [user, setUser] = useState({ name: '', email: '', company: '' });
  const [sectionIndex, setSectionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [savedSnapshot, setSavedSnapshot] = useState<SavedCmsResult | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pngLoading, setPngLoading] = useState(false);
  const resultExportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as SavedCmsResult;
      const ans = parseStoredAnswers(parsed?.answers as unknown as Record<string, unknown>);
      if (parsed?.user && isCmsComplete(ans)) {
        setSavedSnapshot({ ...parsed, answers: ans });
        setAnswers(ans);
        setUser(parsed.user);
        setStep('result');
      }
    } catch {
      /* ignore */
    }
  }, []);

  const totalSections = CMS_SECTION_QUESTION_NUMS.length;
  const currentNums = CMS_SECTION_QUESTION_NUMS[sectionIndex] ?? [];
  const totalQuestions = getCmsTotalQuestionCount();
  const answeredCount = Object.keys(answers).filter((k) => {
    const n = Number(k);
    return n >= 1 && n <= 15 && answers[n] != null;
  }).length;
  const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  const isSectionComplete = (nums: CmsQuestionNum[]) =>
    nums.every((n) => {
      const v = answers[n];
      return typeof v === 'number' && v >= 1 && v <= 4;
    });

  const canNextSection = isSectionComplete(currentNums as CmsQuestionNum[]);

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
    const nums = (CMS_SECTION_QUESTION_NUMS[sectionIndex] ?? []) as CmsQuestionNum[];
    const idx = nums.findIndex((n) => n === questionNum);
    const run = () => {
      if (idx >= 0 && idx < nums.length - 1) {
        const nextNum = nums[idx + 1];
        smoothScrollToElementById(`cms-question-${nextNum}`, 'start');
      } else {
        smoothScrollToElementById('cms-assessment-nav', 'nearest');
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

  const persist = (payload: SavedCmsResult) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* ignore */
    }
  };

  const finishAssessment = () => {
    const payload: SavedCmsResult = {
      user: { name: user.name.trim(), email: user.email.trim(), company: user.company.trim() },
      answers: { ...answers },
    };
    persist(payload);
    setSavedSnapshot(payload);
    setStep('result');
    smoothScrollToY(0, 760);

    if (isSupabaseConfigured && isCmsComplete(payload.answers)) {
      const styleScores = getCmsStyleScores(payload.answers);
      void supabase
        .from('conflict_management_style_results')
        .insert({
          name: payload.user.name,
          email: payload.user.email,
          company: payload.user.company,
          style_scores: styleScores,
        })
        .then(({ error }) => {
          if (error) console.warn('Conflict management style save to DB:', error.message);
        });
    }
  };

  const handleNextSection = () => {
    if (sectionIndex < totalSections - 1) {
      setSectionIndex((i) => i + 1);
      smoothScrollToY(0, 760);
    } else {
      finishAssessment();
    }
  };

  const handlePrevSection = () => {
    if (sectionIndex > 0) {
      setSectionIndex((i) => i - 1);
      smoothScrollToY(0, 760);
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
  const { styleScores, maxStyleScore } = useMemo(() => {
    const scores = getCmsStyleScores(displayAnswers);
    const max = Math.max(0, ...CMS_STYLES.map((s) => scores[s.id]));
    return { styleScores: scores, maxStyleScore: max };
  }, [displayAnswers]);

  const exportBaseName = `Conflict_Management_Style_${safeExportFilePart(displayUser.name)}_${new Date().toISOString().slice(0, 10)}`;

  const captureResultForExport = (mode: 'png' | 'pdf' = 'png'): Promise<HTMLCanvasElement> => {
    const el = resultExportRef.current;
    if (!el) return Promise.reject(new Error('ไม่พบพื้นที่ผลลัพธ์'));
    // PDF ใช้ scale ต่ำกว่าเพื่อลดเวลาเรนเดอร์ (ยังคงคมชัดบน A4)

    const targetScale =
    mode === 'pdf'
      ? 2.5
      : isMobileSafariLike()
        ? Math.min(2, window.devicePixelRatio || 1.5)
        : 2;
    return html2canvas(el, {
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#0a0a0a',
      scale: targetScale,
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
          title: `ผล${ASSESSMENT_TITLE}`,
        });
        URL.revokeObjectURL(blobUrl);
        return;
      } catch {
        /* user cancelled */
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
      const canvas = await captureResultForExport('pdf');
  
      const imgData = canvas.toDataURL('image/png', 1);
  
      // ใช้ขนาดตาม screenshot จริง
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height],
      });
  
      pdf.addImage(
        imgData,
        'PNG',
        0,
        0,
        canvas.width,
        canvas.height
      );
  
      pdf.save(`${exportBaseName}.pdf`);
    } catch (e) {
      console.warn('Export conflict management PDF:', e);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDownloadPng = async () => {
    if (!resultExportRef.current) return;
    setPngLoading(true);
    try {
      const canvas = await captureResultForExport('png');
      const blob = await canvasToPngBlob(canvas);
      await savePngBlob(blob, `${exportBaseName}.png`);
    } catch (e) {
      console.warn('Export conflict management PNG:', e);
    } finally {
      setPngLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-white bg-grid flex flex-col selection:bg-sky-400/30 selection:text-white">
      {showIntroModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" aria-modal="true" role="dialog">
          <button
            type="button"
            className="absolute inset-0 bg-black/75 backdrop-blur-md cursor-default"
            aria-label="ปิดคำแนะนำและเริ่ม"
            onClick={handleCloseIntroAndStart}
          />
          <div className="relative w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl border border-white/15 bg-gradient-to-b from-zinc-900/98 via-neutral-950/98 to-black shadow-2xl shadow-sky-500/10 overflow-hidden max-h-[min(92vh,720px)] flex flex-col">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_55%_at_50%_-10%,rgba(56,189,248,0.14),transparent)] pointer-events-none" />
            <div className="relative flex-1 overflow-y-auto overscroll-contain p-6 sm:p-8">
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-400/30 to-yellow-400/20 border border-sky-400/35 flex items-center justify-center shadow-lg shadow-sky-500/10 mb-4">
                  <span className="text-2xl" aria-hidden>
                    🤝
                  </span>
                </div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-sky-400/90 mb-1">{SUBTITLE}</p>
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight leading-snug">{ASSESSMENT_TITLE}</h2>
              </div>
              <div className="text-sm sm:text-[15px] text-left">{INTRO_BODY}</div>
            </div>
            <div className="relative shrink-0 border-t border-white/10 p-4 sm:p-5 bg-black/30">
              <button
                type="button"
                onClick={handleCloseIntroAndStart}
                className="w-full py-3.5 px-6 rounded-2xl font-bold text-[15px] bg-gradient-to-r from-yellow-400 to-amber-300 text-black hover:from-yellow-300 hover:to-amber-200 shadow-lg shadow-yellow-400/25 transition-all active:scale-[0.99]"
              >
                เริ่มทำแบบประเมิน
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 border-b border-white/5 bg-black/40 backdrop-blur-xl supports-[backdrop-filter]:bg-black/25">
        <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-4 flex justify-between items-center gap-4">
          <Link to="/" className="flex items-center gap-3 shrink-0 group">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-amber-400 rounded-xl flex items-center justify-center shadow-lg shadow-yellow-500/20 group-hover:scale-[1.02] transition-transform">
              <span className="text-black font-black text-lg">M</span>
            </div>
            <span className="text-lg font-bold tracking-tight text-white/95 hidden min-[380px]:inline">MindDoJo</span>
          </Link>
          {step === 'assessment' && (
            <div className="flex flex-col items-end gap-1 min-w-0">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-400/90 truncate max-w-[14rem] sm:max-w-none">
                ความคืบหน้า
              </span>
              <span className="text-sm font-bold tabular-nums text-white">
                {answeredCount}
                <span className="text-gray-500 font-medium"> / {totalQuestions}</span>
                <span className="text-gray-500 font-normal text-xs ml-1.5 hidden sm:inline">ข้อ</span>
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 pb-28 sm:pb-32">
        {step === 'login' && (
          <div className="max-w-md mx-auto space-y-8">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/25 bg-sky-500/10 px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" aria-hidden />
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-300/95">{SUBTITLE}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-[2rem] font-black tracking-tight leading-[1.15] text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-gray-400">
                {ASSESSMENT_TITLE}
              </h1>
              <p className="text-gray-400 text-sm sm:text-[15px] leading-relaxed max-w-sm mx-auto">
                สำรวจแนวโน้มของคุณผ่านคำถาม 15 ข้อ และสเกล 4 ระดับ — เหมาะสำหรับอบรมหรือทำความเข้าใจตนเอง
              </p>
            </div>

            <form
              onSubmit={handleLoginSubmit}
              className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-black/30 p-6 sm:p-8 space-y-5 shadow-xl shadow-black/40 ring-1 ring-white/5"
            >
              <div className="space-y-1.5">
                <label htmlFor="cms-name" className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                  ชื่อ
                </label>
                <input
                  id="cms-name"
                  type="text"
                  value={user.name}
                  onChange={(e) => setUser((u) => ({ ...u, name: e.target.value }))}
                  placeholder="ชื่อที่แสดงบนผลลัพธ์"
                  required
                  autoComplete="name"
                  className={inputFieldClass}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="cms-email" className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                  อีเมล
                </label>
                <input
                  id="cms-email"
                  type="email"
                  value={user.email}
                  onChange={(e) => setUser((u) => ({ ...u, email: e.target.value }))}
                  placeholder="you@company.com"
                  required
                  autoComplete="email"
                  className={inputFieldClass}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="cms-company" className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                  บริษัท / องค์กร
                </label>
                <input
                  id="cms-company"
                  type="text"
                  value={user.company}
                  onChange={(e) => setUser((u) => ({ ...u, company: e.target.value }))}
                  placeholder="ชื่อองค์กร"
                  required
                  autoComplete="organization"
                  className={inputFieldClass}
                />
              </div>
              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl font-bold text-[15px] bg-gradient-to-r from-sky-500 to-sky-400 text-white hover:from-sky-400 hover:to-sky-300 shadow-lg shadow-sky-500/20 transition-all active:scale-[0.99]"
              >
                ดำเนินการต่อ
              </button>
              <p className="text-center text-[11px] text-gray-600 leading-relaxed">
                กดปุ่มแล้วอ่านคำอธิบายสั้นๆ ก่อนเริ่มตอบคำถาม
              </p>
            </form>
          </div>
        )}

        {step === 'assessment' && (
          <div className="space-y-8 sm:space-y-10">
            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.07] via-black/20 to-sky-500/[0.04] p-5 sm:p-6 shadow-xl shadow-black/30 ring-1 ring-white/5">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-sky-400/90 mb-1">
                    {CMS_SECTION_TITLES[sectionIndex] ?? `ส่วนที่ ${sectionIndex + 1}`}
                  </p>
                  <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    คำถามข้อ {currentNums[0]}–{currentNums[currentNums.length - 1]}
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">แตะระดับ 1–4 ตามความถี่ที่คุณทำแบบนั้น</p>
                </div>
                <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                  <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">
                    ช่วง {sectionIndex + 1} / {totalSections}
                  </span>
                  <div className="flex gap-1.5">
                    {Array.from({ length: totalSections }).map((_, i) => (
                      <span
                        key={i}
                        className={`h-2 w-6 sm:w-8 rounded-full transition-colors ${
                          i === sectionIndex
                            ? 'bg-sky-400'
                            : i < sectionIndex
                              ? 'bg-sky-400/35'
                              : 'bg-white/15'
                        }`}
                        aria-hidden
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] text-gray-500 uppercase tracking-wider font-semibold">
                  <span>ความคืบหน้ารวม</span>
                  <span className="tabular-nums text-sky-300/90">{Math.round(progress)}%</span>
                </div>
                <div className="h-2 rounded-full bg-black/40 overflow-hidden ring-1 ring-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-500 via-sky-400 to-amber-400 transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6 sm:space-y-7">
              {(currentNums as CmsQuestionNum[]).map((num, i) => {
                const q = getCmsQuestionByNum(num);
                if (!q) return null;
                const globalIdx =
                  CMS_SECTION_QUESTION_NUMS.slice(0, sectionIndex).reduce((n, arr) => n + arr.length, 0) + i;
                const answered = answers[num] != null;
                return (
                  <div
                    key={num}
                    id={`cms-question-${num}`}
                    className={`rounded-3xl border p-5 sm:p-7 space-y-5 scroll-mt-28 transition-shadow ${
                      answered
                        ? 'border-sky-500/25 bg-gradient-to-b from-sky-500/[0.06] to-black/25 shadow-lg shadow-sky-500/5'
                        : 'border-white/10 bg-gradient-to-b from-white/[0.04] to-black/20 ring-1 ring-white/5'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full border border-yellow-400/25 bg-yellow-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-yellow-200/95">
                        ข้อ {globalIdx + 1} / {totalQuestions}
                      </span>
                      {answered ? (
                        <span className="text-[11px] font-medium text-sky-300/90 flex items-center gap-1">
                          <span className="text-emerald-400" aria-hidden>
                            ✓
                          </span>
                          บันทึกแล้ว
                        </span>
                      ) : (
                        <span className="text-[11px] text-amber-200/80">ยังไม่ได้เลือก</span>
                      )}
                    </div>
                    <p className="text-white text-[15px] sm:text-base leading-relaxed font-medium">{q.text}</p>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-3">
                        เลือกระดับที่ตรงกับคุณมากที่สุด
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                        {([1, 2, 3, 4] as const).map((v) => {
                          const selected = answers[num] === v;
                          return (
                            <button
                              key={v}
                              type="button"
                              onClick={() => setScale(num, v)}
                              title={CMS_SCALE_LABELS[v]}
                              className={`relative flex flex-col items-center justify-center gap-1 rounded-2xl border-2 px-2 py-3.5 sm:py-4 min-h-[5.5rem] transition-all active:scale-[0.98] ${
                                selected
                                  ? 'border-sky-400 bg-sky-500/20 text-white shadow-lg shadow-sky-500/15 ring-2 ring-sky-400/40'
                                  : 'border-white/12 bg-black/30 text-gray-400 hover:border-white/25 hover:bg-white/[0.06] hover:text-gray-200'
                              }`}
                            >
                              <span className="text-xl sm:text-2xl font-black tabular-nums leading-none">{v}</span>
                              <span className="text-[11px] sm:text-xs text-center leading-tight px-0.5">
                                {CMS_SCALE_LABELS[v]}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              id="cms-assessment-nav"
              className="sticky bottom-4 z-30 flex justify-between gap-3 p-2 rounded-2xl border border-white/10 bg-black/70 backdrop-blur-xl shadow-2xl shadow-black/50 scroll-mt-8"
            >
              <button
                type="button"
                onClick={handlePrevSection}
                disabled={sectionIndex === 0}
                className="flex-1 sm:flex-none px-4 sm:px-6 py-3 rounded-xl font-bold text-sm border border-white/12 text-gray-300 hover:bg-white/8 disabled:opacity-35 disabled:cursor-not-allowed transition-all"
              >
                ← ย้อนกลับ
              </button>
              <button
                type="button"
                onClick={handleNextSection}
                disabled={!canNextSection}
                className="flex-1 sm:flex-none px-5 sm:px-8 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-yellow-400 to-amber-300 text-black hover:from-yellow-300 hover:to-amber-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-yellow-500/15 transition-all"
              >
                {sectionIndex >= totalSections - 1 ? 'ดูผลลัพธ์' : 'ถัดไป →'}
              </button>
            </div>
          </div>
        )}

        {step === 'result' && isCmsComplete(displayAnswers) && (
          <div className="space-y-8 w-full max-w-5xl mx-auto">
            <div ref={resultExportRef} className="space-y-8">
              <div className="rounded-3xl border border-white/12 bg-gradient-to-b from-white/[0.08] via-sky-500/[0.04] to-black/40 p-4 sm:p-9 text-center shadow-xl shadow-black/40 ring-1 ring-sky-500/10">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-400/90 mb-2">{SUBTITLE}</p>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white leading-snug mb-4">{ASSESSMENT_TITLE}</h1>
                <div className="inline-flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm">
                  <span className="font-semibold text-white">{displayUser.name}</span>
                  <span className="hidden sm:inline text-gray-600">·</span>
                  <span className="text-gray-400 text-xs sm:text-sm">
                    {displayUser.company} · {displayUser.email}
                  </span>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-black/30 p-6 sm:p-8 space-y-6 shadow-xl shadow-black/30">
                <h2 className="text-center text-xs sm:text-sm font-black uppercase tracking-[0.15em] text-gray-400">
                  ผลคะแนน 5 รูปแบบ
                </h2>
                <div className="text-left text-sm text-gray-400 space-y-2 border-b border-white/10 pb-6">
                  <p className="font-semibold text-gray-200">การให้คะแนนการประเมิน</p>
                  <p className="leading-relaxed">
                    คำถามแต่ละข้อสอดคล้องกับรูปแบบการจัดการความขัดแย้ง 5 แบบ เพื่อค้นหารูปแบบที่เหมาะสมที่สุดของคุณ
                    รวมคะแนนของแต่ละกลุ่มคำถามตามที่ระบุไว้ด้านล่าง:
                  </p>
                </div>
                <div className="grid grid-cols-6 sm:grid-cols-6 gap-4">
                  {CMS_STYLES.map((st, index) => {
                    const score = styleScores[st.id];
                    const artwork = STYLE_ARTWORK[st.id];
                    const isTop = score > 0 && score === maxStyleScore;

                    return (
                      <div
                        key={st.id}
                        className={`col-span-2 ${
                          index === 3
                            ? 'col-start-2'
                            : index === 4
                            ? 'col-start-4'
                            : ''
                        } rounded-t-[500px] rounded-b-[200px] min-w-0 border-2 border-2 p-5 sm:p-6 min-h-[300px] flex flex-col justify-start transition-colors ${
                          isTop
                            ? 'border-amber-400/40 bg-gradient-to-b from-amber-400/10 via-black/20 to-transparent ring-1 ring-amber-400/20'
                            : 'border-white/100 bg-black/20'
                        }`}
                      >
                        <div className="flex flex-col items-center text-center gap-3">
                          {/* DONUT */}
                          <div className="relative w-[72px] h-[72px] sm:w-[96px] sm:h-[96px] md:w-[112px] md:h-[112px]">
                          <svg
                            className="w-full h-full -rotate-90"
                            viewBox="0 0 120 120"
                          >
                          <defs>
                            <linearGradient
                              id={`donutGradient-${st.id}`}
                              x1="0%"
                              y1="0%"
                              x2="100%"
                              y2="100%"
                            >
                                <stop offset="0%" stopColor="#FDC830" />
                                <stop offset="100%" stopColor="#00B4DB" />
                            </linearGradient>
                          </defs>
                              {/* background */}
                              <circle
                                cx="60"
                                cy="60"
                                r="54"
                                stroke="rgba(255,255,255,0.10)"
                                strokeWidth="8"
                                fill="none"
                              />

                              {/* progress */}
                              <circle
                                cx="60"
                                cy="60"
                                r="54"
                                stroke={`url(#donutGradient-${st.id})`}
                                strokeWidth="8"
                                fill="none"
                                strokeLinecap="round"
                                strokeDasharray="326.7"
                                strokeDashoffset={
                                  326.7 - (score / 12) * 326.7
                                }
                                className="transition-all duration-700"
                              />
                            </svg>

                            {/* score */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <svg
                                width="60"
                                height="42"
                                viewBox="0 0 60 42"
                                className="overflow-visible"
                              >
                                <defs>
                                  <linearGradient
                                    id={`scoreGradient-${st.id}`}
                                    x1="0%"
                                    y1="0%"
                                    x2="100%"
                                    y2="0%"
                                  >
                                    <stop offset="0%" stopColor="#00B4DB" />
                                    <stop offset="100%" stopColor="#FDC830" />
                                  </linearGradient>
                                </defs>

                                <text
                                  x="50%"
                                  y="30"
                                  textAnchor="middle"
                                  fontSize="32"
                                  fontWeight="900"
                                  fill={`url(#scoreGradient-${st.id})`}
                                  fontFamily="Arial, sans-serif"
                                >
                                  {score}
                                </text>
                              </svg>

                              <span className="text-[10px] sm:text-xs font-bold text-gray-500 -mt-1">
                                /12
                              </span>
                            </div>
                          </div>

                          {/* ICON */}
                          <div className="flex items-center justify-center">
                            <img
                              src={artwork.image}
                              alt={st.titleTh}
                              className="w-[100px] h-[100px] object-contain"
                              loading="lazy"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                console.error('Image load failed:', artwork.image);
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>

                          {/* TITLE */}
                          <span className="text-white font-bold text-sm sm:text-base md:text-lg leading-[1.15] break-words text-center px-1">
                            {st.titleTh}
                          </span>

                          {/* SUBTITLE */}
                          <span className="text-[10px] sm:text-[11px] text-gray-500 -mt-1">
                            {st.titleEn}
                          </span>

                          {/* QUESTION */}
                          <p className="text-[10px] sm:text-[11px] text-gray-500 leading-snug">
                            จากข้อ : {st.questionNums.join(', ')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                </div>
              <p className="text-center text-[10px] text-gray-600 pb-1">MindDoJo · {ASSESSMENT_TITLE}</p>
            </div>

            <div className="grid grid grid-cols-2 gap-3 gap-3">
              <button
                type="button"
                onClick={handleDownloadPng}
                disabled={pngLoading}
                className="min-h-[52px] rounded-2xl font-bold text-sm border border-sky-400/45 text-sky-100 bg-sky-500/10 hover:bg-sky-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                <span
                  className={`w-4 h-4 border-2 border-sky-300 border-t-transparent rounded-full shrink-0 ${pngLoading ? 'animate-spin opacity-100' : 'opacity-0'}`}
                  aria-hidden
                />
                <span className="tabular-nums flex items-center gap-2">
                {pngLoading ? (
                  'กำลังสร้าง PNG...'
                ) : (
                  <>
                    <img
                      src="https://axaasphuaaadzjoffznj.supabase.co/storage/v1/object/public/images/image%20(1).webp"
                      alt="download"
                      className="w-4 h-4 object-contain"
                    />
                    <span>ดาวน์โหลด PNG</span>
                  </>
                )}
              </span>
              </button>
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={pdfLoading}
                className="min-h-[52px] rounded-2xl font-bold text-sm border border-amber-400/45 text-amber-100 bg-amber-500/10 hover:bg-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                <span
                  className={`w-4 h-4 border-2 border-amber-300 border-t-transparent rounded-full shrink-0 ${pdfLoading ? 'animate-spin opacity-100' : 'opacity-0'}`}
                  aria-hidden
                />
                <span className="tabular-nums flex items-center gap-2">
                  {pdfLoading ? (
                    'กำลังสร้าง PDF...'
                  ) : (
                    <>
                      <img
                        src="https://axaasphuaaadzjoffznj.supabase.co/storage/v1/object/public/images/downloads.webp"
                        alt="PDF"
                        className="w-4 h-4 object-contain"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <span>ดาวน์โหลด PDF</span>
                    </>
                  )}
                </span>
              </button>
              <button
                type="button"
                onClick={restart}
                className="min-h-[52px] rounded-2xl font-bold text-sm border border-white/15 text-gray-300 hover:bg-white/6 transition-all col-span-2 flex items-center justify-center gap-2"
              >
                <img
                  src="https://axaasphuaaadzjoffznj.supabase.co/storage/v1/object/public/images/restart.webp"
                  alt="Restart"
                  className="w-4 h-4 object-contain"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <span>ทำแบบประเมินใหม่</span>
              </button>
              <Link
                to="/"
                className="min-h-[52px] rounded-2xl font-bold text-sm bg-gradient-to-r from-yellow-400 to-amber-300 text-black hover:from-yellow-300 hover:to-amber-200 flex items-center justify-center gap-2 text-center transition-all shadow-lg shadow-yellow-500/15 col-span-2"
              >
                <img
                  src="https://axaasphuaaadzjoffznj.supabase.co/storage/v1/object/public/images/home.webp"
                  alt="Home"
                  className="w-5 h-5 object-contain"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <span>กลับหน้าหลัก</span>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ConflictManagementStyleAssessment;
