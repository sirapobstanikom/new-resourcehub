import React, { useState, useEffect, useRef } from 'react';
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
    <p className="mb-4 text-gray-300 leading-relaxed">
      กรุณาเลือกคำตอบที่ตรงกับตัวคุณมากที่สุด การประเมินนี้ออกแบบมาเพื่อช่วยให้คุณเรียนรู้เกี่ยวกับรูปแบบการจัดการความขัดแย้งของคุณ
      ไม่มีคำตอบที่ถูกหรือผิด
    </p>
    <div className="rounded-xl border border-white/10 overflow-hidden text-left text-xs mb-4">
      <div className="grid grid-cols-2 bg-white/10 px-3 py-2 font-semibold text-white">
        <span>คะแนน</span>
        <span>ความหมาย</span>
      </div>
      {([1, 2, 3, 4] as const).map((s) => (
        <div key={s} className="grid grid-cols-2 border-t border-white/10 px-3 py-2 text-gray-300">
          <span className="tabular-nums text-yellow-400/90 font-bold">{s}</span>
          <span>{CMS_SCALE_LABELS[s]}</span>
        </div>
      ))}
    </div>
    <p className="text-xs text-gray-500 leading-relaxed">
      เมื่อทำครบ 15 ข้อ ระบบจะรวมคะแนนตามรูปแบบ 5 ประเภท ได้แก่ การหลีกหนี การยอมตาม การเอาชนะ การร่วมมือ และการประนีประนอม (แต่ละแบบคะแนนเต็ม 12)
    </p>
  </>
);

const STYLE_ARTWORK: Record<
  CmsStyleId,
  {
    titleTh: string;
    svg: string;
  }
> = {
  avoiding: {
    titleTh: 'การหลีกหนี',
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg" width="240" height="180" viewBox="0 0 240 180" fill="none">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="240" y2="180" gradientUnits="userSpaceOnUse">
            <stop stop-color="#38BDF8" stop-opacity="0.18"/>
            <stop offset="1" stop-color="#FBBF24" stop-opacity="0.18"/>
          </linearGradient>
        </defs>
        <rect x="18" y="18" width="204" height="144" rx="22" fill="url(#g)" stroke="#38BDF8" stroke-opacity="0.35"/>
        <path d="M82 60h56l14 14v56H82V60z" fill="#0B1220" fill-opacity="0.35" stroke="#38BDF8" stroke-opacity="0.55" stroke-width="2"/>
        <path d="M102 94c12-14 26-14 38 0" stroke="#FBBF24" stroke-width="6" stroke-linecap="round"/>
        <path d="M94 120c10-12 42-12 52 0" stroke="#38BDF8" stroke-width="6" stroke-linecap="round" stroke-opacity="0.9"/>
        <path d="M64 132l-14 14" stroke="#FBBF24" stroke-width="8" stroke-linecap="round"/>
      </svg>
    `,
  },
  accommodating: {
    titleTh: 'การยอมตาม',
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg" width="240" height="180" viewBox="0 0 240 180" fill="none">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="240" y2="180" gradientUnits="userSpaceOnUse">
            <stop stop-color="#FBBF24" stop-opacity="0.18"/>
            <stop offset="1" stop-color="#22C55E" stop-opacity="0.15"/>
          </linearGradient>
        </defs>
        <rect x="18" y="18" width="204" height="144" rx="22" fill="url(#g)" stroke="#22C55E" stroke-opacity="0.35"/>
        <path d="M72 108c18-34 78-34 96 0" stroke="#22C55E" stroke-width="10" stroke-linecap="round"/>
        <path d="M88 92c10-16 24-24 32-24" stroke="#FBBF24" stroke-width="8" stroke-linecap="round" stroke-opacity="0.95"/>
        <path d="M152 88l18 18-18 18-18-18 18-18z" fill="#0B1220" fill-opacity="0.35" stroke="#FBBF24" stroke-opacity="0.7" stroke-width="2"/>
        <path d="M62 134c26 14 102 14 128 0" stroke="#38BDF8" stroke-width="6" stroke-linecap="round" stroke-opacity="0.85"/>
      </svg>
    `,
  },
  competing: {
    titleTh: 'การเอาชนะ',
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg" width="240" height="180" viewBox="0 0 240 180" fill="none">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="240" y2="180" gradientUnits="userSpaceOnUse">
            <stop stop-color="#F43F5E" stop-opacity="0.18"/>
            <stop offset="1" stop-color="#FBBF24" stop-opacity="0.18"/>
          </linearGradient>
        </defs>
        <rect x="18" y="18" width="204" height="144" rx="22" fill="url(#g)" stroke="#F43F5E" stroke-opacity="0.35"/>
        <path d="M120 52l28 20v48c0 18-14 34-28 34s-28-16-28-34V72l28-20z" fill="#0B1220" fill-opacity="0.35" stroke="#FBBF24" stroke-opacity="0.65" stroke-width="2"/>
        <path d="M92 116l56-44" stroke="#F43F5E" stroke-width="10" stroke-linecap="round"/>
        <path d="M98 62c8-6 36-6 44 0" stroke="#38BDF8" stroke-width="6" stroke-linecap="round" stroke-opacity="0.9"/>
        <path d="M64 144l18-18" stroke="#FBBF24" stroke-width="8" stroke-linecap="round"/>
      </svg>
    `,
  },
  collaborating: {
    titleTh: 'การร่วมมือ',
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg" width="240" height="180" viewBox="0 0 240 180" fill="none">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="240" y2="180" gradientUnits="userSpaceOnUse">
            <stop stop-color="#38BDF8" stop-opacity="0.18"/>
            <stop offset="1" stop-color="#A78BFA" stop-opacity="0.16"/>
          </linearGradient>
        </defs>
        <rect x="18" y="18" width="204" height="144" rx="22" fill="url(#g)" stroke="#A78BFA" stroke-opacity="0.35"/>
        <circle cx="92" cy="92" r="18" fill="#0B1220" fill-opacity="0.35" stroke="#38BDF8" stroke-opacity="0.75" stroke-width="2"/>
        <circle cx="148" cy="72" r="18" fill="#0B1220" fill-opacity="0.35" stroke="#A78BFA" stroke-opacity="0.75" stroke-width="2"/>
        <circle cx="152" cy="112" r="18" fill="#0B1220" fill-opacity="0.35" stroke="#FBBF24" stroke-opacity="0.7" stroke-width="2"/>
        <path d="M106 84l26-18" stroke="#38BDF8" stroke-width="8" stroke-linecap="round" stroke-opacity="0.9"/>
        <path d="M132 84l22 22" stroke="#A78BFA" stroke-width="8" stroke-linecap="round" stroke-opacity="0.9"/>
        <path d="M86 112c10 10 22 16 36 14" stroke="#FBBF24" stroke-width="6" stroke-linecap="round" stroke-opacity="0.9"/>
      </svg>
    `,
  },
  compromising: {
    titleTh: 'การประนีประนอม',
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg" width="240" height="180" viewBox="0 0 240 180" fill="none">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="240" y2="180" gradientUnits="userSpaceOnUse">
            <stop stop-color="#22C55E" stop-opacity="0.16"/>
            <stop offset="1" stop-color="#38BDF8" stop-opacity="0.16"/>
          </linearGradient>
        </defs>
        <rect x="18" y="18" width="204" height="144" rx="22" fill="url(#g)" stroke="#22C55E" stroke-opacity="0.35"/>
        <path d="M120 50v26" stroke="#FBBF24" stroke-width="8" stroke-linecap="round"/>
        <path d="M82 82h76" stroke="#38BDF8" stroke-width="10" stroke-linecap="round" stroke-opacity="0.9"/>
        <path d="M70 136l50-54" stroke="#22C55E" stroke-width="8" stroke-linecap="round" stroke-opacity="0.95"/>
        <path d="M170 136l-50-54" stroke="#38BDF8" stroke-width="8" stroke-linecap="round" stroke-opacity="0.95"/>
        <circle cx="78" cy="128" r="10" fill="#0B1220" fill-opacity="0.35" stroke="#FBBF24" stroke-opacity="0.7" stroke-width="2"/>
        <circle cx="162" cy="128" r="10" fill="#0B1220" fill-opacity="0.35" stroke="#FBBF24" stroke-opacity="0.7" stroke-width="2"/>
      </svg>
    `,
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
  const styleScores = getCmsStyleScores(displayAnswers);

  const exportBaseName = `Conflict_Management_Style_${safeExportFilePart(displayUser.name)}_${new Date().toISOString().slice(0, 10)}`;

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
      console.warn('Export conflict management PDF:', e);
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
      console.warn('Export conflict management PNG:', e);
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
          <div className="relative w-full max-w-lg rounded-3xl border border-white/20 bg-gradient-to-b from-neutral-900/95 to-black/95 shadow-2xl shadow-sky-400/10 overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(56,189,248,0.12),transparent)] pointer-events-none" />
            <div className="relative p-8 md:p-10 text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-sky-400/20 border border-sky-400/35 flex items-center justify-center">
                <span className="text-3xl" aria-hidden>
                  🤝
                </span>
              </div>
              <p className="text-[10px] uppercase tracking-widest text-sky-400/90 mb-2">{SUBTITLE}</p>
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
            <p className="text-center text-[10px] uppercase tracking-widest text-sky-400/90 mb-2">{SUBTITLE}</p>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-2 text-center leading-snug text-yellow-400/95">
              {ASSESSMENT_TITLE}
            </h1>
            <p className="text-gray-400 text-sm text-center mb-6 max-w-sm mx-auto leading-relaxed">
              สำรวจรูปแบบการจัดการความขัดแย้งของคุณผ่านคำถาม 15 ข้อ และสเกล 4 ระดับ — ใช้ในห้องอบรมหรือเพื่อทำความเข้าใจตนเอง
            </p>
            <form
              onSubmit={handleLoginSubmit}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8 space-y-5"
            >
              <div>
                <label htmlFor="cms-name" className="block text-sm font-medium text-gray-400 mb-2">
                  ชื่อ
                </label>
                <input
                  id="cms-name"
                  type="text"
                  value={user.name}
                  onChange={(e) => setUser((u) => ({ ...u, name: e.target.value }))}
                  placeholder="กรอกชื่อ"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
                />
              </div>
              <div>
                <label htmlFor="cms-email" className="block text-sm font-medium text-gray-400 mb-2">
                  อีเมล
                </label>
                <input
                  id="cms-email"
                  type="email"
                  value={user.email}
                  onChange={(e) => setUser((u) => ({ ...u, email: e.target.value }))}
                  placeholder="กรอกอีเมล"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
                />
              </div>
              <div>
                <label htmlFor="cms-company" className="block text-sm font-medium text-gray-400 mb-2">
                  บริษัท / องค์กร
                </label>
                <input
                  id="cms-company"
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
              <span className="font-semibold text-sky-400/90">
                ส่วนที่ {sectionIndex + 1} · ข้อ {currentNums[0]}–{currentNums[currentNums.length - 1]}
              </span>
              <span>
                หน้า {sectionIndex + 1} / {totalSections}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-500/90 to-yellow-400 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="space-y-6">
              {(currentNums as CmsQuestionNum[]).map((num, i) => {
                const q = getCmsQuestionByNum(num);
                if (!q) return null;
                const globalIdx =
                  CMS_SECTION_QUESTION_NUMS.slice(0, sectionIndex).reduce((n, arr) => n + arr.length, 0) + i;
                return (
                  <div
                    key={num}
                    id={`cms-question-${num}`}
                    className="rounded-2xl border border-white/10 bg-white/5 p-5 md:p-6 space-y-4 shadow-lg shadow-black/20 scroll-mt-28"
                  >
                    <p className="text-xs font-bold text-yellow-400/90 uppercase tracking-widest">
                      ข้อที่ {globalIdx + 1} / {totalQuestions}
                    </p>
                    <p className="text-white text-sm md:text-base leading-relaxed font-medium">{q.text}</p>
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-gray-500">เลือก 1–4</p>
                      <div className="flex flex-wrap gap-2">
                        {([1, 2, 3, 4] as const).map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setScale(num, v)}
                            title={CMS_SCALE_LABELS[v]}
                            className={`min-w-[2.75rem] px-3 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                              answers[num] === v
                                ? 'bg-sky-400/20 border-sky-400 text-white'
                                : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/25'
                            }`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                      {answers[num] != null && (
                        <p className="text-xs text-gray-400 mt-1">{CMS_SCALE_LABELS[answers[num] as 1 | 2 | 3 | 4]}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div id="cms-assessment-nav" className="flex justify-between pt-6 scroll-mt-8">
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

        {step === 'result' && isCmsComplete(displayAnswers) && (
          <div className="space-y-10 max-w-xl mx-auto">
            <div ref={resultExportRef} className="space-y-8">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8 space-y-6 text-center">
                <p className="text-[10px] uppercase tracking-widest text-sky-400/90">{SUBTITLE}</p>
                <h1 className="text-2xl md:text-3xl font-black text-white leading-snug">{ASSESSMENT_TITLE}</h1>
                <p className="text-gray-400 text-sm">{displayUser.name}</p>
                <p className="text-xs text-gray-500 -mt-4">
                  {displayUser.company} · {displayUser.email}
                </p>

                <p className="text-sm text-gray-400 text-left">
                  คะแนนแต่ละรูปแบบคำนวณจากคำตอบ 3 ข้อต่อแบบ (ข้อละ 1–4 คะแนน) รวมเป็น <span className="text-white font-semibold">3–12 คะแนน</span> ต่อรูปแบบ
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-5">
                <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider text-center">
                  ผลคะแนน 5 รูปแบบ
                </h2>
                {CMS_STYLES.map((st) => {
                  const score = styleScores[st.id];
                  const pct = ((score - 3) / 9) * 100;
                  const artwork = STYLE_ARTWORK[st.id];
                  return (
                    <div
                      key={st.id}
                      className="border-t border-white/10 first:border-t-0 first:pt-0 pt-4 first:pt-0"
                    >
                      <div className="flex gap-3 items-start">
                        <div className="shrink-0">
                          <div
                            className="w-20 h-14 rounded-xl border border-white/10 bg-black/20 overflow-hidden flex items-center justify-center"
                            role="img"
                            aria-label={`${st.titleTh} artwork`}
                            dangerouslySetInnerHTML={{ __html: artwork.svg }}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between gap-2 text-sm mb-2">
                            <div>
                              <span className="text-white font-semibold block">{st.titleTh}</span>
                              <span className="text-xs text-gray-500">{st.titleEn}</span>
                            </div>
                            <span className="tabular-nums shrink-0 text-sky-400/90 font-bold">
                              {score} / 12
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 mb-2">
                            จากข้อ {st.questionNums.join(', ')}
                          </p>
                          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-sky-500/80 to-yellow-400/90 rounded-full transition-all"
                              style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-center text-[10px] text-gray-500 pb-2">MindDoJo · {ASSESSMENT_TITLE}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
              <button
                type="button"
                onClick={handleDownloadPng}
                disabled={pngLoading}
                className="px-6 py-3 rounded-xl font-bold border border-sky-400/50 text-sky-200 hover:bg-sky-400/10 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {pngLoading ? (
                  <>
                    <span
                      className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin shrink-0"
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

export default ConflictManagementStyleAssessment;
