import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
import { getLeadershipFeedback, type LeadershipResultPayload } from '../services/gemini';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

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

const INTRO_TITLE = 'แบบประเมินสมรรถนะภาวะผู้นำ';
const INTRO_BODY = (
  <>
    <p className="mb-4">
      แบบประเมินนี้ใช้กรอบ <strong className="text-white">Dynamic Leadership Capability Wheel</strong> ในการประเมินสมรรถนะภาวะผู้นำของคุณ
    </p>
    <p className="mb-4 text-gray-400">
      ประกอบด้วย 3 หมวดหลัก คือ <strong className="text-yellow-400/90">Be AWARE</strong> (การตระหนักรู้),{' '}
      <strong className="text-yellow-400/90">ADAPT</strong> (การปรับตัวและเรียนรู้) และ{' '}
      <strong className="text-yellow-400/90">ACT</strong> (การลงมือทำและผลักดันการเปลี่ยนแปลง) เพื่อให้คุณเห็นจุดแข็งและพื้นที่ที่ควรพัฒนา
    </p>
    <p className="mb-4 text-gray-400">
      แบบประเมินรวมทั้งหมด <strong className="text-yellow-400/90">{getTotalQuestionCount()}</strong> ข้อ
    </p>
    <div className="text-left bg-white/5 rounded-xl p-4 border border-white/10">
      <p className="font-semibold text-white text-sm mb-2">วิธีการทำแบบประเมิน</p>
      <ol className="text-gray-400 text-sm space-y-1.5 list-decimal list-inside">
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
  const progress = totalDimensions > 0 ? ((dimensionIndex + 1) / totalDimensions) * 100 : 0;

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
        backgroundColor: '#ffffff',
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
        backgroundColor: '#ffffff',
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

  return (
    <div className="min-h-screen bg-transparent text-white bg-grid flex flex-col selection:bg-yellow-400 selection:text-black">
      {/* ป๊อปอัพแนะนำก่อนเริ่มแบบประเมิน */}
      {showIntroModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          aria-modal="true"
          role="dialog"
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={handleCloseIntroAndStartAssessment}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-lg rounded-3xl border border-white/20 bg-gradient-to-b from-neutral-900/95 to-black/95 shadow-2xl shadow-yellow-400/10 overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(250,204,21,0.12),transparent)] pointer-events-none" />
            <div className="relative p-8 md:p-10 text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-yellow-400/20 border border-yellow-400/30 flex items-center justify-center">
                <span className="text-3xl">📋</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-4">
                {INTRO_TITLE}
              </h2>
              <div className="text-sm md:text-base leading-relaxed mb-8 text-gray-400">
                {INTRO_BODY}
              </div>
              <button
                type="button"
                onClick={handleCloseIntroAndStartAssessment}
                className="w-full py-3.5 px-6 rounded-xl font-bold bg-yellow-400 text-black hover:bg-yellow-300 shadow-lg shadow-yellow-400/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
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
            {dimensionIndex + 1} / {totalDimensions}
          </span>
        )}
      </header>

      <main className="flex-1 px-6 py-8 max-w-3xl mx-auto w-full pb-24">
        {/* Login */}
        {step === 'login' && (
          <div className="max-w-md mx-auto">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-2 text-center">
              แบบประเมินสมรรถนะภาวะผู้นำ
            </h1>
            <p className="text-gray-400 text-sm text-center mb-8">
              Dynamic Leadership Capability Wheel Self Assessment
            </p>
            <form
              onSubmit={handleLoginSubmit}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8 space-y-5"
            >
              <div>
                <label htmlFor="lead-name" className="block text-sm font-medium text-gray-400 mb-2">
                  ชื่อ
                </label>
                <input
                  id="lead-name"
                  type="text"
                  value={user.name}
                  onChange={(e) => setUser((u) => ({ ...u, name: e.target.value }))}
                  placeholder="กรอกชื่อ"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
                />
              </div>
              <div>
                <label htmlFor="lead-email" className="block text-sm font-medium text-gray-400 mb-2">
                  อีเมล
                </label>
                <input
                  id="lead-email"
                  type="email"
                  value={user.email}
                  onChange={(e) => setUser((u) => ({ ...u, email: e.target.value }))}
                  placeholder="กรอกอีเมล"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
                />
              </div>
              <div>
                <label htmlFor="lead-company" className="block text-sm font-medium text-gray-400 mb-2">
                  บริษัท
                </label>
                <input
                  id="lead-company"
                  type="text"
                  value={user.company}
                  onChange={(e) => setUser((u) => ({ ...u, company: e.target.value }))}
                  placeholder="กรอกชื่อบริษัท"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl font-bold bg-yellow-400 text-black hover:bg-yellow-300 shadow-lg shadow-yellow-400/20 transition-all"
              >
                เข้าสู่แบบทดสอบ
              </button>
            </form>
          </div>
        )}

        {/* Assessment */}
        {step === 'assessment' && currentDimension && (
          <div className="space-y-8">
            <div className="flex items-center justify-between gap-2 text-sm text-gray-500">
              <span>
                หมวด {dimensionIndex + 1}/{totalDimensions}
              </span>
              <span>
                หมวดนี้ {getAllQuestionIds(currentDimension).length} ข้อ
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-yellow-400 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>

            <h2 className="text-3xl md:text-4xl font-black text-yellow-400 text-center">
              {currentDimension.name}
            </h2>

            <p className="text-gray-400 text-sm md:text-base leading-relaxed text-center max-w-2xl mx-auto">
              {DIMENSION_MEANING[currentDimension.id] || DIMENSION_DESCRIPTIONS[currentDimension.id]}
            </p>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-gray-400">
              <p className="font-semibold text-gray-300 mb-3">คำอธิบาย</p>
              <ul className="space-y-2">
                {RATING_ORDER.map((r) => (
                  <li key={r}>
                    <span className="font-medium text-gray-200">{RATING_LABELS[r]}</span>
                    <span className="text-gray-500"> – {RATING_DESCRIPTIONS[r]}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-10">
              {currentDimension.subItems.map((subItem) => (
                <SubItemSection
                  key={subItem.id}
                  subItem={subItem}
                  dimensionId={currentDimension.id}
                  getQuestionRating={getQuestionRating}
                  setQuestionRating={setQuestionRating}
                />
              ))}
            </div>

            <div className="flex justify-between pt-6">
              <button
                type="button"
                onClick={handlePrevDimension}
                disabled={dimensionIndex === 0}
                className="px-5 py-2.5 rounded-xl font-bold border border-white/10 text-gray-400 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                ← ก่อนหน้า
              </button>
              <button
                type="button"
                onClick={handleNextDimension}
                disabled={!canNextDimension}
                className="px-6 py-2.5 rounded-xl font-bold bg-yellow-400 text-black hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {dimensionIndex < totalDimensions - 1 ? 'ถัดไป →' : 'ดูผลลัพธ์'}
              </button>
            </div>
          </div>
        )}

        {/* Result */}
        {step === 'result' && (
          <div className="space-y-10 bg-white min-h-screen -mx-6 px-6 py-8 md:-mx-8 md:px-8">
            {/* สถานะการบันทึก — แสดงบนเว็บเท่านั้น ไม่รวมใน PDF, หายหลัง 3 วินาที */}
            <div className="exclude-from-pdf">
              {saveStatus === 'saving' && (
                <p className="text-center text-black/70 text-sm">กำลังบันทึกผลลง ระบบ...</p>
              )}
              {saveStatus === 'success' && (
                <p className="text-center text-green-700 text-sm">บันทึกผลลง ระบบ แล้ว</p>
              )}
              {saveStatus === 'error' && (
                <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-center">
                  <p className="text-red-700 text-sm font-medium">บันทึกลง ระบบ ไม่สำเร็จ</p>
                  {saveError && <p className="text-red-600 text-xs mt-1">{saveError}</p>}
                </div>
              )}
              {!isSupabaseConfigured && (
                <p className="text-center text-black/70 text-xs">
                  ไม่ได้บันทึกลง ระบบ (ขาดการเชื่อมต่อกับ ระบบ)
                </p>
              )}
            </div>

            <div ref={resultPdfRef} className="space-y-8 rounded-xl bg-white p-6 shadow-sm">
              <div className="bg-white rounded-lg px-4 py-3 text-center">
                <h1 className="text-2xl md:text-3xl font-black text-black">
                  ผลแบบประเมินสมรรถนะภาวะผู้นำ
                </h1>
              </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {LEADERSHIP_DIMENSIONS.map((dim, idx) => (
                <div
                  key={dim.id}
                  className="rounded-2xl bg-white p-6 flex flex-col items-center text-center shadow-[0_-6px_16px_-4px_rgba(0,0,0,0.08),0_10px_24px_-4px_rgba(0,0,0,0.12)]"
                >
                  <div className="inline-flex items-center gap-2 rounded-full bg-white shadow-sm border border-[#fed201]/40 px-3 py-1.5 mb-4">
                    <span className="w-2 h-2 rounded-full bg-[#fed201] flex-shrink-0" />
                    <span className="text-black font-medium text-sm">{dim.name}</span>
                  </div>
                  <div className="relative w-36 h-36 flex items-center justify-center mb-3">
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <DonutChart
                        percent={getDimensionPercent(dim)}
                        size={140}
                        strokeColor="#fed201"
                        backgroundColor="rgba(254, 210, 1, 0.25)"
                      />
                    </div>
                    <img
                      src={DIMENSION_ARTWORK[dim.id]}
                      alt={dim.name}
                      className="relative z-10 w-20 h-20 object-contain"
                    />
                  </div>
                  <div className="text-2xl md:text-3xl font-black text-black">
                    {getDimensionPercent(dim)}%
                  </div>
                  <p className="text-black/80 text-sm mt-1">
                    {DIMENSION_CARD_DESC[dim.id]}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-[#fed201]/50 bg-white p-6 space-y-4 shadow-sm">
              <h3 className="text-lg font-bold text-black">Feedback จาก AI</h3>
              {aiLoading && (
                <div className="flex items-center gap-3 text-black/70">
                  <div className="w-5 h-5 border-2 border-[#fed201] border-t-transparent rounded-full animate-spin" />
                  <span>กำลังสร้าง feedback...</span>
                </div>
              )}
              {!aiLoading && !aiFeedback && (
                <button
                  type="button"
                  onClick={fetchAIFeedback}
                  className="px-6 py-3 rounded-xl font-bold bg-[#fed201] text-black hover:bg-[#fed201]/90 transition-all"
                >
                  รับ Feedback จาก AI
                </button>
              )}
              {aiFeedback && (
                <div className="prose max-w-none">
                  <div className="whitespace-pre-wrap text-gray-800 text-sm leading-relaxed">
                    {aiFeedback}
                  </div>
                </div>
              )}
            </div>

            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4 flex-wrap">
              <button
                type="button"
                onClick={handleDownloadPng}
                disabled={pngLoading}
                className="px-6 py-3 rounded-xl font-bold border-2 border-[#fed201] text-black bg-white hover:bg-black/5 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                {pngLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-[#fed201] border-t-transparent rounded-full animate-spin" />
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
                className="px-6 py-3 rounded-xl font-bold border-2 border-[#fed201] text-black bg-white hover:bg-black/5 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                {pdfLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-[#fed201] border-t-transparent rounded-full animate-spin" />
                    กำลังสร้าง PDF...
                  </>
                ) : (
                  'ดาวน์โหลด PDF'
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep('assessment');
                  setDimensionIndex(0);
                  setAnswers({});
                  setAiFeedback(null);
                  setSaveStatus('idle');
                  setSaveError(null);
                }}
                className="px-6 py-3 rounded-xl font-bold border border-[#fed201]/60 text-black bg-white hover:bg-black/5 transition-all shadow-sm"
              >
                ทำแบบประเมินใหม่
              </button>
              <Link
                to="/"
                className="px-6 py-3 rounded-xl font-bold bg-[#fed201] text-black hover:bg-[#fed201]/90 text-center transition-all shadow-sm"
              >
                กลับหน้าแรก
              </Link>
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
  dimensionId: string;
  getQuestionRating: (dimId: string, questionId: string) => RatingLevel | undefined;
  setQuestionRating: (dimId: string, questionId: string, rating: RatingLevel) => void;
}

const SubItemSection: React.FC<SubItemSectionProps> = ({
  subItem,
  dimensionId,
  getQuestionRating,
  setQuestionRating,
}) => (
  <div className="space-y-6">
    <h3 className="text-xl font-bold text-yellow-400/90 border-b border-white/10 pb-2">
      {subItem.name}
    </h3>
    <div className="space-y-6">
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
  </div>
);

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
    <div ref={blockRef} className="rounded-2xl border border-white/10 bg-white/5 p-5 md:p-6 space-y-4">
      <div>
        <h4 className="font-bold text-base text-white">
          {index}. {question.title}
        </h4>
        <p className="text-gray-400 text-sm leading-relaxed mt-1">{question.description}</p>
      </div>
      <div className="flex gap-1 md:gap-2 flex-wrap">
        {RATING_ORDER.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => handleSelect(r)}
            title={`${RATING_LABELS[r]} – ${RATING_DESCRIPTIONS[r]}`}
            className={`flex-1 min-w-0 py-3 rounded-xl text-xs md:text-sm font-medium transition-all ${
              selected === r
                ? 'bg-yellow-400 text-black ring-2 ring-yellow-400'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
            }`}
          >
            {RATING_LABELS[r]}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LeadershipAssessment;
