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
        ? isMobileSafariLike()
          ? 1.1
          : 1.25
        : isMobileSafariLike()
          ? Math.min(1.8, window.devicePixelRatio || 1.5)
          : 1.8;
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
      // JPEG เร็วกว่า PNG สำหรับงาน screenshot ยาว ๆ และไฟล์เล็กลง
      const imgData = canvas.toDataURL('image/jpeg', 0.86);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      pdf.setFillColor(10, 10, 10);
      pdf.rect(0, 0, pageW, pageH, 'F');
      // ผู้ใช้ต้องการให้อยู่หน้าเดียว: ย่อทั้งภาพให้ fit ใน A4 โดยไม่ครอป
      const margin = 6;
      const maxW = pageW - margin * 2;
      const maxH = pageH - margin * 2;
      const fitRatio = Math.min(maxW / canvas.width, maxH / canvas.height);
      const renderW = canvas.width * fitRatio;
      const renderH = canvas.height * fitRatio;
      const offsetX = (pageW - renderW) / 2;
      const offsetY = (pageH - renderH) / 2;
      pdf.addImage(imgData, 'JPEG', offsetX, offsetY, renderW, renderH, undefined, 'FAST');
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
          <div className="space-y-10 max-w-2xl mx-auto">
            <div ref={resultExportRef} className="space-y-8">
              <div className="rounded-3xl border border-white/12 bg-gradient-to-b from-white/[0.08] via-sky-500/[0.04] to-black/40 p-6 sm:p-9 text-center shadow-xl shadow-black/40 ring-1 ring-sky-500/10">
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
                {CMS_STYLES.map((st) => {
                  const score = styleScores[st.id];
                  const pct = ((score - 3) / 9) * 100;
                  const artwork = STYLE_ARTWORK[st.id];
                  const isTop = score > 0 && score === maxStyleScore;
                  return (
                    <div
                      key={st.id}
                      className={`rounded-2xl border p-4 sm:p-5 transition-colors ${
                        isTop
                          ? 'border-amber-400/40 bg-gradient-to-r from-amber-400/10 via-yellow-500/5 to-transparent ring-1 ring-amber-400/20'
                          : 'border-white/8 bg-black/20'
                      }`}
                    >
                      <div className="flex gap-4 items-start">
                        <div className="shrink-0">
                          <div
                            className="w-[5.25rem] h-[3.75rem] sm:w-24 sm:h-[4.25rem] rounded-xl border border-white/12 bg-black/30 overflow-hidden flex items-center justify-center shadow-inner"
                            role="img"
                            aria-label={`${st.titleTh} artwork`}
                            dangerouslySetInnerHTML={{ __html: artwork.svg }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                            <div>
                              <span className="text-white font-bold block leading-tight">{st.titleTh}</span>
                              <span className="text-[11px] sm:text-xs text-gray-500">{st.titleEn}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {isTop ? (
                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300/95 hidden sm:inline">
                                  สูงสุด
                                </span>
                              ) : null}
                              <span className="tabular-nums text-lg font-black text-sky-300">
                                {score}
                                <span className="text-sm font-bold text-gray-500">/12</span>
                              </span>
                            </div>
                          </div>
                          <p className="text-[11px] text-gray-500 mb-3">จากข้อ {st.questionNums.join(', ')}</p>
                          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-sky-500 to-amber-400 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-center text-[10px] text-gray-600 pb-1">MindDoJo · {ASSESSMENT_TITLE}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                <span className="tabular-nums">{pngLoading ? 'กำลังสร้าง PNG...' : 'ดาวน์โหลด PNG'}</span>
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
                <span className="tabular-nums">{pdfLoading ? 'กำลังสร้าง PDF...' : 'ดาวน์โหลด PDF'}</span>
              </button>
              <button
                type="button"
                onClick={restart}
                className="min-h-[52px] rounded-2xl font-bold text-sm border border-white/15 text-gray-300 hover:bg-white/6 transition-all sm:col-span-2"
              >
                ทำแบบประเมินใหม่
              </button>
              <Link
                to="/"
                className="min-h-[52px] rounded-2xl font-bold text-sm bg-gradient-to-r from-yellow-400 to-amber-300 text-black hover:from-yellow-300 hover:to-amber-200 flex items-center justify-center text-center transition-all shadow-lg shadow-yellow-500/15 sm:col-span-2"
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
