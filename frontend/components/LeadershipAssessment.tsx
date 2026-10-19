import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  LEADERSHIP_DIMENSIONS,
  RATING_LABELS,
  RATING_DESCRIPTIONS,
  RATING_SCORE,
  DIMENSION_DESCRIPTIONS,
  DIMENSION_MEANING,
  getAllQuestionIds,
  type RatingLevel,
  type LeadershipDimension,
  type LeadershipQuestion,
  type LeadershipSubItem,
} from '../data/leadershipWheelData';
import { getLeadershipFeedback, type LeadershipResultPayload } from '../services/openai';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  LEADERSHIP_BG,
  LEADERSHIP_HEADLINE_FONT as HEADLINE_FONT,
  LEADERSHIP_RIBBON_BG,
  LEADERSHIP_YELLOW,
} from '../lib/leadershipTheme';
import LeadershipLoginScreen from './LeadershipLoginScreen';

type Step = 'login' | 'assessment' | 'result';

/** เรียงจากซ้าย (ต้องพัฒนาอย่างจริงจัง) → ขวา (จุดแข็ง) */
const RATING_ORDER: RatingLevel[] = ['ASD', 'AFI', 'ME', 'S'];

/** Artwork สำหรับแต่ละหมวด (Be AWARE, ADAPT, ACT) */
const DIMENSION_ARTWORK: Record<string, string> = {
  aware: 'https://static.wixstatic.com/media/8f9517_4a4e1857cee1428c8864aa4d1a232bf0~mv2.png',
  adapt: 'https://static.wixstatic.com/media/8f9517_24a9a186e21a426d8904e8fe90a5ef94~mv2.png',
  act: 'https://static.wixstatic.com/media/8f9517_148bb0e9ac6c4571834c6f7abd23ab29~mv2.png',
};

/** คำอธิบายสั้นสำหรับการ์ดผลลัพธ์แต่ละหมวด */
const DIMENSION_CARD_DESC: Record<string, string> = {
  aware: 'การตระหนักรู้',
  adapt: 'ปรับตัว ยืดหยุ่น เรียนรู้',
  act: 'ลงมือทำ ตัดสินใจ ผลักดันการเปลี่ยนแปลง',
};

/** จำนวนข้อรวมทั้งแบบประเมิน */
const getTotalQuestionCount = () =>
  LEADERSHIP_DIMENSIONS.reduce((acc, d) => acc + getAllQuestionIds(d).length, 0);

/** แปลงเปอร์เซ็นต์ (คะแนนเฉลี่ย 1–4) กลับเป็นระดับที่ใกล้ที่สุด */
const getLevelFromPercent = (percent: number): RatingLevel => {
  const avg = percent / 25;
  if (avg >= 3.5) return 'S';
  if (avg >= 2.5) return 'ME';
  if (avg >= 1.5) return 'AFI';
  return 'ASD';
};

const INTRO_BODY = (
  <>
    <p className="mb-4">
      แบบประเมินนี้ใช้กรอบ <strong className="text-gray-900">Dynamic Leadership Capability Wheel</strong> ในการประเมินสมรรถนะภาวะผู้นำของคุณ
    </p>
    <p className="mb-4 text-gray-400">
      ประกอบด้วย 3 หมวดหลัก คือ <strong className="text-[#FFCC00]">Be AWARE</strong> (การตระหนักรู้),{' '}
      <strong className="text-[#FFCC00]">ADAPT</strong> (การปรับตัวและเรียนรู้) และ{' '}
      <strong className="text-[#FFCC00]">ACT</strong> (การลงมือทำและผลักดันการเปลี่ยนแปลง) เพื่อให้คุณเห็นจุดแข็งและพื้นที่ที่ควรพัฒนา
    </p>
    <p className="mb-5 text-gray-400">
      แบบประเมินรวมทั้งหมด <strong className="text-[#FFCC00]">{getTotalQuestionCount()}</strong> ข้อ
    </p>
    <div className="rounded-xl border border-gray-200 bg-[#F3F2ED]/80 p-4 text-left">
      <p className="mb-2 text-sm font-semibold text-gray-900">วิธีการทำแบบประเมิน</p>
      <ol className="list-inside list-decimal space-y-1.5 text-sm text-gray-400">
        <li>อ่านแต่ละข้อแล้วพิจารณาว่าตรงกับคุณมากที่สุด</li>
        <li>เลือกหนึ่งระดับจาก 4 ระดับ ได้แก่ ต้องพัฒนาอย่างจริงจัง / ควรพัฒนา / ดี / จุดแข็ง</li>
        <li>ทำครบทั้ง 3 หมวด แล้วกดดูผลลัพธ์</li>
      </ol>
    </div>
  </>
);

const LeadershipAssessment: React.FC = () => {
  const [showIntroModal, setShowIntroModal] = useState(false);
  const [step, setStep] = useState<Step>('login');
  const [user, setUser] = useState({ name: '', email: '', company: '' });
  const [dimensionIndex, setDimensionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [dimId: string]: { [capId: string]: RatingLevel } }>({});
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pngLoading, setPngLoading] = useState(false);
  const resultPdfRef = useRef<HTMLDivElement>(null);

  const currentDimension = LEADERSHIP_DIMENSIONS[dimensionIndex];
  const totalDimensions = LEADERSHIP_DIMENSIONS.length;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user.name.trim() && user.email.trim() && user.company.trim()) {
      setDimensionIndex(0);
      setAnswers({});
      setAiFeedback(null);
      setShowIntroModal(true);
    }
  };

  const handleCloseIntroAndStartAssessment = () => {
    setShowIntroModal(false);
    setStep('assessment');
  };

  const saveToSupabase = async (payload: {
    name: string;
    email: string;
    company: string;
    score_aware: number;
    score_adapt: number;
    score_act: number;
  }) => {
    if (!isSupabaseConfigured) return;
    setSaveStatus('saving');
    setSaveError(null);
    const { error } = await supabase.from('leadership_entries').insert(payload);
    if (error) {
      setSaveStatus('error');
      setSaveError(error.message);
    } else {
      setSaveStatus('success');
    }
  };

  // ซ่อนข้อความสถานะการบันทึกหลัง 3 วินาที
  useEffect(() => {
    if (saveStatus !== 'success' && saveStatus !== 'error') return;
    const t = setTimeout(() => setSaveStatus('idle'), 3000);
    return () => clearTimeout(t);
  }, [saveStatus]);

  const setQuestionRating = (dimId: string, questionId: string, rating: RatingLevel) => {
    setAnswers((prev) => ({
      ...prev,
      [dimId]: {
        ...(prev[dimId] || {}),
        [questionId]: rating,
      },
    }));
  };

  const getQuestionRating = (dimId: string, questionId: string): RatingLevel | undefined =>
    answers[dimId]?.[questionId];

  const isDimensionComplete = (dim: LeadershipDimension): boolean =>
    getAllQuestionIds(dim).every((id) => getQuestionRating(dim.id, id) != null);

  const countAnswered = (dim: LeadershipDimension): number =>
    getAllQuestionIds(dim).filter((id) => getQuestionRating(dim.id, id) != null).length;

  const canNextDimension =
    currentDimension && isDimensionComplete(currentDimension);

  const handleNextDimension = async () => {
    if (dimensionIndex < totalDimensions - 1) {
      setDimensionIndex((i) => i + 1);
      window.scrollTo(0, 0);
    } else {
      if (LEADERSHIP_DIMENSIONS.length >= 3) {
        const dimAware = LEADERSHIP_DIMENSIONS[0];
        const dimAdapt = LEADERSHIP_DIMENSIONS[1];
        const dimAct = LEADERSHIP_DIMENSIONS[2];
        const scoreAware = getDimensionPercent(dimAware);
        const scoreAdapt = getDimensionPercent(dimAdapt);
        const scoreAct = getDimensionPercent(dimAct);
        await saveToSupabase({
          name: user.name.trim(),
          email: user.email.trim(),
          company: user.company.trim(),
          score_aware: scoreAware,
          score_adapt: scoreAdapt,
          score_act: scoreAct,
        });
      }
      setStep('result');
      window.scrollTo(0, 0);
    }
  };

  const handlePrevDimension = () => {
    if (dimensionIndex > 0) {
      setDimensionIndex((i) => i - 1);
      window.scrollTo(0, 0);
    }
  };

  const fetchAIFeedback = async () => {
    setAiLoading(true);
    setAiFeedback(null);
    const payload: LeadershipResultPayload = {
      user: { name: user.name, email: user.email, company: user.company },
      results: answers,
    };
    const text = await getLeadershipFeedback(payload);
    setAiFeedback(text);
    setAiLoading(false);
  };

  const handleDownloadPdf = async () => {
    if (!resultPdfRef.current) return;
    setPdfLoading(true);
    try {
      const canvas = await html2canvas(resultPdfRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: LEADERSHIP_BG,
        logging: false,
        ignoreElements: (el) => el.classList?.contains('exclude-from-pdf') === true,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;
      const totalPages = Math.ceil(imgH / pageH) || 1;
      for (let p = 0; p < totalPages; p++) {
        if (p > 0) pdf.addPage();
        pdf.setFillColor(LEADERSHIP_BG);
        pdf.rect(0, 0, pageW, pageH, 'F');
        pdf.addImage(imgData, 'PNG', 0, -p * pageH, imgW, imgH);
      }
      const fileName = `ผลการประเมินสมรรถนะภาวะผู้นำ_${user.name || 'ผู้ประเมิน'}_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(fileName);
    } catch (e) {
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDownloadPng = async () => {
    if (!resultPdfRef.current) return;
    setPngLoading(true);
    try {
      const canvas = await html2canvas(resultPdfRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: LEADERSHIP_BG,
        logging: false,
        ignoreElements: (el) => el.classList?.contains('exclude-from-pdf') === true,
      });
      const fileName = `ผลการประเมินสมรรถนะภาวะผู้นำ_${user.name || 'ผู้ประเมิน'}_${new Date().toISOString().slice(0, 10)}.png`;
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 0);

      await new Promise<void>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('toBlob failed'));
              return;
            }
            const file = new File([blob], fileName, { type: 'image/png' });
            const blobUrl = URL.createObjectURL(blob);

            const tryShare = () => {
              if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
                navigator
                  .share({
                    files: [file],
                    title: 'ผลแบบประเมินสมรรถนะภาวะผู้นำ',
                  })
                  .then(() => {
                    URL.revokeObjectURL(blobUrl);
                    resolve();
                  })
                  .catch(() => {
                    fallbackSave(blobUrl);
                    resolve();
                  });
              } else {
                fallbackSave(blobUrl);
                resolve();
              }
            };

            const fallbackSave = (url: string) => {
              if (isMobile) {
                window.open(url, '_blank', 'noopener');
                setTimeout(() => URL.revokeObjectURL(url), 2000);
              } else {
                const link = document.createElement('a');
                link.download = fileName;
                link.href = url;
                link.click();
                URL.revokeObjectURL(url);
              }
            };

            tryShare();
          },
          'image/png',
          1
        );
      });
    } catch (e) {
    } finally {
      setPngLoading(false);
    }
  };

  /** คะแนนเฉลี่ยต่อหมวด (1–4) แปลงเป็น percent 0–100 */
  const getDimensionPercent = (dim: LeadershipDimension): number => {
    const dimAnswers = answers[dim.id] || {};
    const ids = getAllQuestionIds(dim);
    let sum = 0;
    let count = 0;
    ids.forEach((questionId) => {
      const r = dimAnswers[questionId];
      if (r != null) {
        sum += RATING_SCORE[r];
        count += 1;
      }
    });
    if (count === 0) return 0;
    const avg = sum / count;
    return Math.round((avg / 4) * 100);
  };

  const getSubItemPercent = (dimId: string, subItem: LeadershipSubItem): number => {
    const dimAnswers = answers[dimId] || {};
    let sum = 0;
    let count = 0;
    subItem.questions.forEach((q) => {
      const r = dimAnswers[q.id];
      if (r != null) {
        sum += RATING_SCORE[r];
        count += 1;
      }
    });
    if (count === 0) return 0;
    return Math.round((sum / count / 4) * 100);
  };

  const currentTotal = currentDimension ? getAllQuestionIds(currentDimension).length : 0;
  const currentAnswered = currentDimension ? countAnswered(currentDimension) : 0;
  const currentAnsweredPct = currentTotal > 0 ? (currentAnswered / currentTotal) * 100 : 0;

  const overallPercent =
    totalDimensions > 0
      ? Math.round(LEADERSHIP_DIMENSIONS.reduce((acc, d) => acc + getDimensionPercent(d), 0) / totalDimensions)
      : 0;

  const resetAssessment = () => {
    setStep('assessment');
    setDimensionIndex(0);
    setAnswers({});
    setAiFeedback(null);
    setSaveStatus('idle');
    setSaveError(null);
    window.scrollTo(0, 0);
  };

  return (
    <div className="md-page relative flex min-h-[100dvh] flex-col">
      {/* ป๊อปอัพแนะนำก่อนเริ่มแบบประเมิน */}
      {showIntroModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleCloseIntroAndStartAssessment}
            aria-hidden="true"
          />
          <div className="relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-gray-200 bg-white/95 shadow-2xl shadow-black/60">
            <div className="h-1 w-full" style={{ backgroundColor: LEADERSHIP_YELLOW }} />
            <div className="p-7 text-center sm:p-9">
              <BrandLogo className="mb-6 text-[22px]" tone="dark" />
              <h2 className="mb-5 text-2xl font-bold leading-tight sm:text-3xl">
                แบบประเมิน
                <span className="block" style={{ color: LEADERSHIP_YELLOW }}>
                  สมรรถนะภาวะผู้นำ
                </span>
              </h2>
              <div className="mb-7 text-sm leading-relaxed text-gray-600 sm:text-base">{INTRO_BODY}</div>
              <button
                type="button"
                onClick={handleCloseIntroAndStartAssessment}
                className="w-full rounded-lg py-3.5 font-bold text-black shadow-lg shadow-[#FFCC00]/20 transition-all hover:brightness-105 active:scale-[0.99]"
                style={{ backgroundColor: LEADERSHIP_YELLOW }}
              >
                เริ่มทำแบบประเมิน
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'login' && (
        <LeadershipLoginScreen
          user={user}
          onChange={(field, value) => setUser((u) => ({ ...u, [field]: value }))}
          onSubmit={handleLoginSubmit}
        />
      )}

      {step !== 'login' && (
        <>
          <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
            <img
              src={LEADERSHIP_RIBBON_BG}
              alt=""
              className="h-full w-full select-none object-cover object-[78%_center] opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#F3F2ED]//50 via-[#F3F2ED]//85 to-[#F3F2ED]" />
          </div>

          <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 pt-5 sm:px-8 sm:pt-7">
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center">
                <BrandLogo className="text-[24px] sm:text-[26px]" tone="dark" />
              </Link>
              <span className="hidden h-5 w-px bg-white/30 sm:block" />
              <span
                className="hidden text-[10px] font-medium uppercase tracking-[0.2em] text-gray-600 sm:block"
                style={HEADLINE_FONT}
              >
                Leadership Assessment
              </span>
            </div>
            {user.name && (
              <span className="max-w-[45%] truncate rounded-full border border-gray-200 bg-white/70 px-3 py-1 text-xs text-gray-600">
                {user.name}
              </span>
            )}
          </header>

          <main
            className={`relative z-10 mx-auto w-full max-w-5xl flex-1 px-5 pt-8 sm:px-8 sm:pt-10 ${
              step === 'assessment' ? 'pb-36' : 'pb-12'
            }`}
          >
            {/* Assessment */}
            {step === 'assessment' && currentDimension && (
              <div className="mx-auto max-w-4xl">
                <ol className="grid grid-cols-3 gap-2 sm:gap-3">
                  {LEADERSHIP_DIMENSIONS.map((dim, idx) => {
                    const total = getAllQuestionIds(dim).length;
                    const pct = total > 0 ? (countAnswered(dim) / total) * 100 : 0;
                    const isCurrent = idx === dimensionIndex;
                    return (
                      <li key={dim.id}>
                        <div className="h-1 overflow-hidden rounded-full bg-[#474747]">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: LEADERSHIP_YELLOW }}
                          />
                        </div>
                        <p
                          className={`mt-2 truncate text-[10px] font-semibold uppercase tracking-[0.2em] sm:text-xs ${
                            isCurrent ? 'text-gray-900' : 'text-gray-500'
                          }`}
                          style={HEADLINE_FONT}
                        >
                          <span style={isCurrent ? { color: LEADERSHIP_YELLOW } : undefined}>0{idx + 1}</span> · {dim.name}
                        </p>
                      </li>
                    );
                  })}
                </ol>

                <section className="mt-10 sm:mt-14">
                  <p className="text-sm font-semibold" style={{ color: LEADERSHIP_YELLOW }}>
                    หมวดที่ {dimensionIndex + 1} จาก {totalDimensions}
                  </p>
                  <h1
                    className="mt-2 text-[clamp(2.75rem,11vw,5.5rem)] font-extrabold uppercase leading-[0.95] tracking-tight"
                    style={HEADLINE_FONT}
                  >
                    <DimensionTitle name={currentDimension.name} />
                  </h1>
                  <div className="mt-5 h-0.5 w-12" style={{ backgroundColor: LEADERSHIP_YELLOW }} />
                  <p className="mt-4 max-w-2xl text-sm leading-relaxed text-gray-600 sm:text-base">
                    {DIMENSION_MEANING[currentDimension.id] || DIMENSION_DESCRIPTIONS[currentDimension.id]}
                  </p>
                </section>

                <section className="mt-8 rounded-2xl border border-gray-200 bg-white/70 p-3 backdrop-blur-md sm:p-4">
                  <p className="mb-3 px-1 text-xs font-semibold text-gray-600">ระดับการประเมิน</p>
                  <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                    {RATING_ORDER.map((r, i) => (
                      <div key={r} className="rounded-xl border border-gray-200/60 bg-[#F3F2ED]/80 p-3">
                        <div className="flex items-center gap-2">
                          <LevelBars level={i + 1} />
                          <span className="text-sm font-bold text-gray-900">{RATING_LABELS[r]}</span>
                        </div>
                        <p className="mt-1.5 text-[11px] leading-snug text-gray-500 sm:text-xs">{RATING_DESCRIPTIONS[r]}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <div className="mt-12 space-y-14">
                  {currentDimension.subItems.map((subItem, subIdx) => (
                    <SubItemSection
                      key={subItem.id}
                      subItem={subItem}
                      label={`${dimensionIndex + 1}.${subIdx + 1}`}
                      dimensionId={currentDimension.id}
                      getQuestionRating={getQuestionRating}
                      setQuestionRating={setQuestionRating}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Result */}
            {step === 'result' && (
              <div>
                <div className="exclude-from-pdf mb-4 empty:hidden">
                  {saveStatus === 'saving' && (
                    <p className="text-center text-sm text-gray-400">กำลังบันทึกผลลงระบบ...</p>
                  )}
                  {saveStatus === 'success' && (
                    <p className="text-center text-sm text-emerald-400">บันทึกผลลงระบบแล้ว</p>
                  )}
                  {saveStatus === 'error' && (
                    <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-center">
                      <p className="text-sm font-medium text-red-300">บันทึกลงระบบไม่สำเร็จ</p>
                      {saveError && <p className="mt-1 text-xs text-red-300/80">{saveError}</p>}
                    </div>
                  )}
                  {!isSupabaseConfigured && (
                    <p className="text-center text-xs text-gray-500">ไม่ได้บันทึกลงระบบ (ขาดการเชื่อมต่อกับระบบ)</p>
                  )}
                </div>

                <div
                  ref={resultPdfRef}
                  className="relative overflow-hidden rounded-3xl border border-gray-200 bg-[#F3F2ED] p-5 sm:p-8 lg:p-10"
                >
                  <div
                    className="pointer-events-none absolute inset-0 opacity-40"
                    style={{
                      backgroundImage: `url(${LEADERSHIP_RIBBON_BG})`,
                      backgroundSize: 'cover',
                      backgroundPosition: '75% center',
                    }}
                    aria-hidden="true"
                  />
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      backgroundImage: `linear-gradient(180deg, rgba(30,30,30,0.35) 0%, rgba(30,30,30,0.85) 45%, ${LEADERSHIP_BG} 100%)`,
                    }}
                    aria-hidden="true"
                  />

                  <div className="relative">
                    <div className="flex items-center justify-between gap-4">
                      <BrandLogo className="text-[22px]" tone="dark" />
                      <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-gray-400" style={HEADLINE_FONT}>
                        {new Date().toLocaleDateString('th-TH', { dateStyle: 'long' })}
                      </span>
                    </div>

                    <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                      <div>
                        <p className="text-sm font-semibold" style={{ color: LEADERSHIP_YELLOW }}>
                          ผลแบบประเมินสมรรถนะภาวะผู้นำ
                        </p>
                        <h1
                          className="mt-3 text-[clamp(2.5rem,9vw,4.75rem)] font-extrabold uppercase leading-[0.95] tracking-tight"
                          style={HEADLINE_FONT}
                        >
                          <span className="block text-gray-900">Your</span>
                          <span className="block text-gray-500">Leadership</span>
                          <span className="block" style={{ color: LEADERSHIP_YELLOW }}>
                            Profile
                          </span>
                        </h1>
                        <div className="mt-7 h-0.5 w-12" style={{ backgroundColor: LEADERSHIP_YELLOW }} />
                        <p className="mt-3 text-xs text-gray-600 sm:text-sm">Dynamic Leadership Capability Wheel Self Assessment</p>
                      </div>

                      <div className="w-full rounded-2xl border border-gray-200 bg-white/85 p-5 lg:w-80">
                        <p className="text-xs text-gray-500">ผู้ทำแบบประเมิน</p>
                        <p className="mt-1 text-lg font-bold leading-tight">{user.name}</p>
                        <p className="text-sm text-gray-600">{user.company}</p>
                        <p className="mt-0.5 break-all text-xs text-gray-500">{user.email}</p>
                        <div className="mt-4 flex items-end justify-between gap-3 border-t border-white/10 pt-4">
                          <div>
                            <p className="text-xs text-gray-500">คะแนนภาพรวม</p>
                            <p className="mt-1 text-sm font-semibold text-gray-900">
                              {RATING_LABELS[getLevelFromPercent(overallPercent)]}
                            </p>
                          </div>
                          <p
                            className="text-5xl font-extrabold leading-none"
                            style={{ ...HEADLINE_FONT, color: LEADERSHIP_YELLOW }}
                          >
                            {overallPercent}
                            <span className="text-2xl text-gray-500">%</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
                      {LEADERSHIP_DIMENSIONS.map((dim, idx) => {
                        const pct = getDimensionPercent(dim);
                        return (
                          <div key={dim.id} className="flex flex-col rounded-2xl border border-gray-200 bg-white/85 p-5 sm:p-6">
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className="text-sm font-semibold tracking-[0.25em]"
                                style={{ ...HEADLINE_FONT, color: LEADERSHIP_YELLOW }}
                              >
                                0{idx + 1}
                              </span>
                              <span className="rounded-full border border-[#FFCC00]/40 bg-[#FFCC00]/10 px-2.5 py-1 text-[11px] font-semibold text-[#FFCC00]">
                                {RATING_LABELS[getLevelFromPercent(pct)]}
                              </span>
                            </div>
                            <h3 className="mt-2 text-2xl font-extrabold uppercase tracking-tight" style={HEADLINE_FONT}>
                              {dim.name}
                            </h3>
                            <p className="text-sm leading-snug text-gray-500 md:min-h-[2.5rem]">{DIMENSION_CARD_DESC[dim.id]}</p>

                            <div className="relative mx-auto my-6 flex h-40 w-40 items-center justify-center">
                              <div className="absolute inset-0">
                                <DonutChart percent={pct} size={160} strokeColor={LEADERSHIP_YELLOW} backgroundColor="#474747" />
                              </div>
                              <div
                                role="img"
                                aria-label={dim.name}
                                className="relative h-[104px] w-[104px] rounded-full bg-[#F7F5F0]"
                                style={{
                                  backgroundImage: `url(${DIMENSION_ARTWORK[dim.id]})`,
                                  backgroundSize: 'cover',
                                  backgroundPosition: 'center',
                                }}
                              />
                            </div>

                            <p className="text-center text-5xl font-extrabold leading-none" style={HEADLINE_FONT}>
                              {pct}
                              <span className="text-2xl text-gray-500">%</span>
                            </p>

                            <div className="mt-6 space-y-3 border-t border-white/10 pt-5">
                              {dim.subItems.map((sub) => {
                                const subPct = getSubItemPercent(dim.id, sub);
                                return (
                                  <div key={sub.id}>
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="font-semibold tracking-[0.15em] text-gray-600" style={HEADLINE_FONT}>
                                        {sub.name}
                                      </span>
                                      <span className="font-bold" style={{ color: LEADERSHIP_YELLOW }}>
                                        {subPct}%
                                      </span>
                                    </div>
                                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#474747]">
                                      <div
                                        className="h-full rounded-full"
                                        style={{ width: `${subPct}%`, backgroundColor: LEADERSHIP_YELLOW }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div
                      className={`mt-5 rounded-2xl border border-gray-200 bg-white/85 p-5 sm:p-6 ${
                        aiFeedback ? '' : 'exclude-from-pdf'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="h-6 w-1 rounded-full" style={{ backgroundColor: LEADERSHIP_YELLOW }} />
                        <h3 className="text-lg font-bold">Feedback จาก AI</h3>
                      </div>
                      {aiLoading && (
                        <div className="mt-4 flex items-center gap-3 text-gray-600">
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#FFCC00] border-t-transparent" />
                          <span>กำลังสร้าง feedback...</span>
                        </div>
                      )}
                      {!aiLoading && !aiFeedback && (
                        <button
                          type="button"
                          onClick={fetchAIFeedback}
                          className="exclude-from-pdf mt-4 rounded-lg px-6 py-3 font-bold text-black transition-all hover:brightness-105"
                          style={{ backgroundColor: LEADERSHIP_YELLOW }}
                        >
                          รับ Feedback จาก AI
                        </button>
                      )}
                      {aiFeedback && (
                        <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{aiFeedback}</div>
                      )}
                    </div>

                    <p className="mt-8 text-center text-[11px] text-gray-500">
                      © {new Date().getFullYear()} MindDojo Co., Ltd.
                    </p>
                  </div>
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
                  <button
                    type="button"
                    onClick={handleDownloadPng}
                    disabled={pngLoading}
                    className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white/80 px-6 py-3 font-bold text-gray-800 transition-colors hover:border-[#FFCC00] hover:text-[#FFCC00] disabled:opacity-50"
                  >
                    {pngLoading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#FFCC00] border-t-transparent" />
                        กำลังสร้างภาพ...
                      </>
                    ) : (
                      'ดาวน์โหลด PNG'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    disabled={pdfLoading}
                    className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white/80 px-6 py-3 font-bold text-gray-800 transition-colors hover:border-[#FFCC00] hover:text-[#FFCC00] disabled:opacity-50"
                  >
                    {pdfLoading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#FFCC00] border-t-transparent" />
                        กำลังสร้าง PDF...
                      </>
                    ) : (
                      'ดาวน์โหลด PDF'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={resetAssessment}
                    className="rounded-lg border border-gray-200 bg-white/80 px-6 py-3 font-bold text-gray-800 transition-colors hover:border-[#FFCC00] hover:text-[#FFCC00]"
                  >
                    ทำแบบประเมินใหม่
                  </button>
                  <Link
                    to="/"
                    className="rounded-lg px-6 py-3 text-center font-bold text-black shadow-lg shadow-[#FFCC00]/20 transition-all hover:brightness-105"
                    style={{ backgroundColor: LEADERSHIP_YELLOW }}
                  >
                    กลับหน้าแรก
                  </Link>
                </div>
              </div>
            )}
          </main>

          {step === 'assessment' && currentDimension && (
            <div
              className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#F3F2ED]/90 backdrop-blur-md"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              <div className="mx-auto flex max-w-4xl items-center gap-3 px-5 py-3 sm:gap-5 sm:px-8">
                <button
                  type="button"
                  onClick={handlePrevDimension}
                  disabled={dimensionIndex === 0}
                  className="shrink-0 rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-bold text-gray-600 transition-colors hover:border-[#828282] hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30 sm:px-5"
                >
                  ← <span className="hidden sm:inline">ก่อนหน้า</span>
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 text-[11px] text-gray-400 sm:text-xs">
                    <span className="truncate">
                      หมวด {dimensionIndex + 1}/{totalDimensions} · {currentDimension.name}
                    </span>
                    <span className="shrink-0">
                      <span className="font-bold" style={{ color: LEADERSHIP_YELLOW }}>
                        {currentAnswered}
                      </span>
                      /{currentTotal} ข้อ
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[#474747]">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${currentAnsweredPct}%`, backgroundColor: LEADERSHIP_YELLOW }}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleNextDimension}
                  disabled={!canNextDimension}
                  className="shrink-0 rounded-lg bg-[#FFCC00] px-4 py-2.5 text-sm font-bold text-black shadow-lg shadow-[#FFCC00]/20 transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:bg-[#474747] disabled:text-gray-500 disabled:shadow-none sm:px-6"
                >
                  {dimensionIndex < totalDimensions - 1 ? 'ถัดไป →' : 'ดูผลลัพธ์'}
                </button>
              </div>
            </div>
          )}

          {step === 'result' && (
            <footer className="relative z-10 py-6 text-center text-[11px] text-gray-500">
              © {new Date().getFullYear()} MindDojo Co., Ltd.
            </footer>
          )}
        </>
      )}
    </div>
  );
};

/** "Be AWARE" → "Be" สีขาว + "AWARE" สีเหลือง */
const DimensionTitle: React.FC<{ name: string }> = ({ name }) => {
  const parts = name.trim().split(/\s+/);
  const last = parts.pop();
  return (
    <>
      {parts.length > 0 && <span className="block text-gray-900">{parts.join(' ')}</span>}
      <span className="block" style={{ color: LEADERSHIP_YELLOW }}>
        {last}
      </span>
    </>
  );
};

/** แท่งระดับ 1–4 ใช้คู่กับป้ายระดับการประเมิน */
const LevelBars: React.FC<{ level: number; active?: boolean }> = ({ level, active = false }) => (
  <span className="inline-flex items-end gap-[3px]" aria-hidden="true">
    {[1, 2, 3, 4].map((n) => (
      <span
        key={n}
        className={`w-[3px] rounded-full ${
          n <= level ? (active ? 'bg-gray-900' : 'bg-[#FFCC00]') : active ? 'bg-gray-200' : 'bg-[#474747]'
        }`}
        style={{ height: 4 + n * 3 }}
      />
    ))}
  </span>
);

/** Donut (pie) chart แสดงเปอร์เซ็นต์ 0–100 */
interface DonutChartProps {
  percent: number;
  size?: number;
  strokeColor?: string;
  backgroundColor?: string;
  className?: string;
}

const DonutChart: React.FC<DonutChartProps> = ({
  percent,
  size = 120,
  strokeColor = 'rgb(250, 204, 21)',
  backgroundColor = 'rgba(255,255,255,0.1)',
  className,
}) => {
  const strokeWidth = 12;
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const filled = Math.max(0, Math.min(100, percent)) / 100;
  const dash = filled * circumference;
  const gap = circumference - dash;
  return (
    <svg
      width={size}
      height={size}
      className={`transform -rotate-90 ${className ?? ''}`}
    >
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={backgroundColor}
        strokeWidth={strokeWidth}
      />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={`${dash} ${gap}`}
        strokeLinecap="round"
        className="transition-all duration-700"
      />
    </svg>
  );
};

interface SubItemSectionProps {
  subItem: LeadershipSubItem;
  label: string;
  dimensionId: string;
  getQuestionRating: (dimId: string, questionId: string) => RatingLevel | undefined;
  setQuestionRating: (dimId: string, questionId: string, rating: RatingLevel) => void;
}

const SubItemSection: React.FC<SubItemSectionProps> = ({
  subItem,
  label,
  dimensionId,
  getQuestionRating,
  setQuestionRating,
}) => {
  const answered = subItem.questions.filter((q) => getQuestionRating(dimensionId, q.id) != null).length;
  return (
    <section className="space-y-4">
      <div className="flex items-end gap-3 border-b border-white/10 pb-3">
        <span className="pb-1 text-xs font-semibold tracking-[0.2em]" style={{ ...HEADLINE_FONT, color: LEADERSHIP_YELLOW }}>
          {label}
        </span>
        <h3 className="text-2xl font-extrabold uppercase tracking-tight sm:text-3xl" style={HEADLINE_FONT}>
          {subItem.name}
        </h3>
        <span className="ml-auto pb-1 text-xs text-gray-500">
          {answered}/{subItem.questions.length}
        </span>
      </div>
      <div className="space-y-4">
        {subItem.questions.map((q, idx) => (
          <QuestionBlock
            key={q.id}
            index={idx + 1}
            question={q}
            dimensionId={dimensionId}
            selected={getQuestionRating(dimensionId, q.id)}
            onSelect={(rating) => setQuestionRating(dimensionId, q.id, rating)}
          />
        ))}
      </div>
    </section>
  );
};

interface QuestionBlockProps {
  index: number;
  question: LeadershipQuestion;
  dimensionId: string;
  selected: RatingLevel | undefined;
  onSelect: (r: RatingLevel) => void;
}

/** เลื่อนไป element อย่างนุ่มนวล (ease-out, ประมาณ 600ms) */
function smoothScrollToElement(el: HTMLElement, durationMs = 600) {
  const startY = window.scrollY;
  const endY = el.getBoundingClientRect().top + startY - 24;
  const distance = endY - startY;
  if (Math.abs(distance) < 10) return;
  const start = performance.now();
  function easeOutCubic(t: number) {
    return 1 - (1 - t) ** 3;
  }
  function tick(now: number) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / durationMs, 1);
    const eased = easeOutCubic(progress);
    window.scrollTo(0, startY + distance * eased);
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

const QuestionBlock: React.FC<QuestionBlockProps> = ({
  index,
  question,
  selected,
  onSelect,
}) => {
  const blockRef = useRef<HTMLDivElement>(null);

  const handleSelect = (r: RatingLevel) => {
    onSelect(r);
    requestAnimationFrame(() => {
      const next = blockRef.current?.nextElementSibling as HTMLElement | null;
      if (next) smoothScrollToElement(next);
    });
  };

  return (
    <div
      ref={blockRef}
      className={`rounded-2xl border p-5 backdrop-blur-md transition-colors sm:p-6 ${
        selected ? 'border-[#FFCC00]/35 bg-white/80' : 'border-white/10 bg-white/60'
      }`}
    >
      <div className="flex gap-4">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold transition-colors ${
            selected ? 'bg-[#FFCC00] text-black' : 'bg-gray-200 text-gray-800'
          }`}
          style={HEADLINE_FONT}
        >
          {index}
        </span>
        <div className="min-w-0">
          <h4 className="text-base font-bold text-gray-900 sm:text-lg">{question.title}</h4>
          <p className="mt-1 text-sm leading-relaxed text-gray-400">{question.description}</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {RATING_ORDER.map((r, i) => {
          const isActive = selected === r;
          return (
            <button
              key={r}
              type="button"
              onClick={() => handleSelect(r)}
              title={`${RATING_LABELS[r]} – ${RATING_DESCRIPTIONS[r]}`}
              aria-pressed={isActive}
              className={`flex min-h-[3.25rem] items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition-all sm:flex-col sm:items-center sm:justify-center sm:gap-1.5 sm:text-center sm:text-sm ${
                isActive
                  ? 'border-[#FFCC00] bg-[#FFCC00] text-black shadow-lg shadow-[#FFCC00]/20'
                  : 'border-gray-200 bg-[#F3F2ED]/70 text-gray-600 hover:border-[#828282] hover:text-gray-900'
              }`}
            >
              <LevelBars level={i + 1} active={isActive} />
              <span className="leading-tight">{RATING_LABELS[r]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LeadershipAssessment;
