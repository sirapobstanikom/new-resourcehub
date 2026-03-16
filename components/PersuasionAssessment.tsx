import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Chart } from 'react-google-charts';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  PERSUASION_QUESTIONS,
  PERSUASION_CHANNEL_LABELS,
  PERSUASION_CHANNEL_DESCRIPTIONS,
  PERSUASION_CHANNEL_DASHBOARD_LABELS,
  getTotalPersuasionQuestionCount,
  type PersuasionChannelId,
} from '../data/persuasionData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const QUESTIONS_PER_PAGE = 5;
const PERSUASION_RESULT_KEY = 'persuasion_result';

type SavedPersuasionResult = {
  user: { name: string; email: string; company: string };
  scores: Record<PersuasionChannelId, number>;
  dominantChannels: PersuasionChannelId[];
};

/** ลำดับช่องทางสำหรับ Pie Chart (เรียงตาม PIE_COLORS) */
const PIE_CHANNEL_ORDER: { id: PersuasionChannelId; label: string }[] = [
  { id: 'authority', label: 'Authority' },
  { id: 'logic', label: 'Rationality' },
  { id: 'vision', label: 'Vision' },
  { id: 'relationship', label: 'Relationship' },
  { id: 'influence', label: 'Interest-Based' },
  { id: 'negotiation', label: 'Politics' },
];
/** สีพายชาร์ต 6 ช่องทาง – ใช้สีเหลือง #fed201 ทั้งหมด */
const PIE_COLORS = ['#fed201', '#fed201', '#fed201', '#fed201', '#fed201', '#fed201'];

function hexToRgb(hex: string): string {
  const r = Math.min(255, Math.max(0, parseInt(hex.slice(1, 3), 16) || 0));
  const g = Math.min(255, Math.max(0, parseInt(hex.slice(3, 5), 16) || 0));
  const b = Math.min(255, Math.max(0, parseInt(hex.slice(5, 7), 16) || 0));
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}
function hexBlendWithDark(hex: string, mix: number): string {
  const R = parseInt(hex.slice(1, 3), 16) || 0;
  const G = parseInt(hex.slice(3, 5), 16) || 0;
  const B = parseInt(hex.slice(5, 7), 16) || 0;
  const r = Math.min(255, Math.max(0, Math.round(R * mix + 38 * (1 - mix))));
  const g = Math.min(255, Math.max(0, Math.round(G * mix + 38 * (1 - mix))));
  const b = Math.min(255, Math.max(0, Math.round(B * mix + 38 * (1 - mix))));
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}

type Step = 'login' | 'assessment' | 'result';

const INTRO_TITLE = 'แบบทดสอบ 6 ช่องทางในการโน้มน้าวจูงใจ';
const INTRO_BODY = (
  <>
    <p className="mb-4">
      แบบทดสอบหลักการทางจิตวิทยาที่ใช้ในการโน้มน้าวจูงใจผู้อื่น ด้วยการจูนเข้ากับผู้อื่นด้วย{' '}
      <strong className="text-yellow-400/90">ช่องสัญญาณ 6 ช่อง</strong> ซึ่งจะสะท้อนว่าคุณมักโน้มน้าวจูงใจผู้อื่นด้วยช่องทางใด
    </p>
    <p className="mb-4 text-gray-400">
      แบบทดสอบมีข้อคำถามทั้งสิ้น <strong className="text-yellow-400/90">{getTotalPersuasionQuestionCount()}</strong> ข้อ
      ในแต่ละข้อจะมีข้อความให้อ่าน 2 ข้อความ แนะนำให้อ่านทั้งสองข้อความก่อน แล้วค่อยตัดสินใจเลือกข้อความใดข้อความหนึ่งที่ตรงกับตัวคุณมากที่สุด
    </p>
    <div className="text-left bg-white/5 rounded-xl p-4 border border-white/10">
      <p className="font-semibold text-white text-sm mb-2">วิธีการทำแบบทดสอบ</p>
      <ol className="text-gray-400 text-sm space-y-1.5 list-decimal list-inside">
        <li>อ่านทั้งสองข้อความในแต่ละข้อ</li>
        <li>เลือกข้อความใดข้อความหนึ่งที่ตรงกับตัวตนของคุณมากที่สุด</li>
        <li>ทำครบ 30 ข้อ แล้วกดดูผลลัพธ์</li>
      </ol>
    </div>
  </>
);

const PersuasionAssessment: React.FC = () => {
  const [showIntroModal, setShowIntroModal] = useState(false);
  const [step, setStep] = useState<Step>('login');
  const [user, setUser] = useState({ name: '', email: '', company: '' });
  const [answers, setAnswers] = useState<Record<string, 1 | 2>>({});
  const [pageIndex, setPageIndex] = useState(0);
  const [savedResult, setSavedResult] = useState<SavedPersuasionResult | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pngLoading, setPngLoading] = useState(false);
  const [chartHeight, setChartHeight] = useState(580);
  const resultCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateChartHeight = () => {
      const w = typeof window !== 'undefined' ? window.innerWidth : 768;
      if (w < 640) setChartHeight(340);
      else if (w < 768) setChartHeight(480);
      else setChartHeight(580);
    };
    updateChartHeight();
    window.addEventListener('resize', updateChartHeight);
    return () => window.removeEventListener('resize', updateChartHeight);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PERSUASION_RESULT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SavedPersuasionResult;
        if (parsed?.scores && parsed?.dominantChannels && parsed?.user) {
          setSavedResult(parsed);
          setStep('result');
        }
      }
    } catch (_) {}
  }, []);

  const totalQuestions = getTotalPersuasionQuestionCount();
  const totalPages = Math.ceil(totalQuestions / QUESTIONS_PER_PAGE);
  const answeredCount = Object.keys(answers).length;
  const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  const startIdx = pageIndex * QUESTIONS_PER_PAGE;
  const endIdx = Math.min(startIdx + QUESTIONS_PER_PAGE, totalQuestions);
  const questionsOnPage = PERSUASION_QUESTIONS.slice(startIdx, endIdx);

  const isPageComplete = questionsOnPage.every((q) => answers[q.id] != null);
  const isLastPage = pageIndex >= totalPages - 1;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (user.name.trim() && user.email.trim() && user.company.trim()) {
      setAnswers({});
      setShowIntroModal(true);
    }
  };

  const handleCloseIntroAndStartAssessment = () => {
    setShowIntroModal(false);
    setStep('assessment');
    setPageIndex(0);
  };

  const setAnswer = (questionId: string, value: 1 | 2) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const isComplete = answeredCount === totalQuestions;

  const getScoresByChannel = (): Record<PersuasionChannelId, number> => {
    const scores: Record<PersuasionChannelId, number> = {
      authority: 0,
      logic: 0,
      vision: 0,
      relationship: 0,
      negotiation: 0,
      influence: 0,
    };
    PERSUASION_QUESTIONS.forEach((q) => {
      const choice = answers[q.id];
      if (choice === 1) scores[q.option1.channel] += 1;
      else if (choice === 2) scores[q.option2.channel] += 1;
    });
    return scores;
  };

  const getDominantChannels = (): PersuasionChannelId[] => {
    const s = getScoresByChannel();
    const entries = (Object.entries(s) as [PersuasionChannelId, number][]).sort((a, b) => b[1] - a[1]);
    const maxScore = entries[0]?.[1] ?? 0;
    return entries.filter(([, v]) => v === maxScore && maxScore > 0).map(([id]) => id);
  };

  const captureResultCard = (): Promise<HTMLCanvasElement> => {
    const el = resultCardRef.current;
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
    setPdfLoading(true);
    try {
      const canvas = await captureResultCard();
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
      pdf.save('ผลแบบทดสอบ-6-ช่องทางโน้มน้าวจูงใจ.pdf');
    } catch (e) {
      console.warn('Export PDF:', e);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDownloadPng = async () => {
    setPngLoading(true);
    try {
      const canvas = await captureResultCard();
      const link = document.createElement('a');
      link.download = 'ผลแบบทดสอบ-6-ช่องทางโน้มน้าวจูงใจ.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.warn('Export PNG:', e);
    } finally {
      setPngLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white bg-grid flex flex-col selection:bg-yellow-400 selection:text-black">
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
                <span className="text-3xl">💬</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-4">{INTRO_TITLE}</h2>
              <div className="text-sm md:text-base leading-relaxed mb-8 text-gray-400">{INTRO_BODY}</div>
              <button
                type="button"
                onClick={handleCloseIntroAndStartAssessment}
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
            <span className="text-black font-black text-xl">M</span>
          </div>
          <span className="text-xl font-bold tracking-tighter">MindDoJo</span>
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
            <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-2 text-center">
              แบบทดสอบ 6 ช่องทางในการโน้มน้าวจูงใจ
            </h1>
            <p className="text-gray-400 text-sm text-center mb-8">
              Persuasion Test · MindDoJo
            </p>
            <form
              onSubmit={handleLoginSubmit}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8 space-y-5"
            >
              <div>
                <label htmlFor="persuasion-name" className="block text-sm font-medium text-gray-400 mb-2">ชื่อ</label>
                <input
                  id="persuasion-name"
                  type="text"
                  value={user.name}
                  onChange={(e) => setUser((u) => ({ ...u, name: e.target.value }))}
                  placeholder="กรอกชื่อ"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
                />
              </div>
              <div>
                <label htmlFor="persuasion-email" className="block text-sm font-medium text-gray-400 mb-2">อีเมล</label>
                <input
                  id="persuasion-email"
                  type="email"
                  value={user.email}
                  onChange={(e) => setUser((u) => ({ ...u, email: e.target.value }))}
                  placeholder="กรอกอีเมล"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
                />
              </div>
              <div>
                <label htmlFor="persuasion-company" className="block text-sm font-medium text-gray-400 mb-2">บริษัท</label>
                <input
                  id="persuasion-company"
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

        {step === 'assessment' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between gap-2 text-sm text-gray-500">
              <span>ข้อที่ {startIdx + 1}–{endIdx} / {totalQuestions}</span>
              <span>หน้า {pageIndex + 1} / {totalPages}</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-yellow-400 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="space-y-6">
              {questionsOnPage.map((q, i) => {
                const globalIdx = startIdx + i;
                return (
                  <div
                    key={q.id}
                    className="rounded-2xl border border-white/10 bg-white/5 p-5 md:p-6 space-y-4"
                  >
                    <p className="text-xs font-bold text-yellow-400/90 uppercase tracking-widest mb-2">
                      ข้อที่ {globalIdx + 1} / {totalQuestions}
                    </p>
                    <h4 className="font-bold text-white text-sm mb-4">
                      ข้อไหนเป็นตัวตนของคุณมากที่สุด?
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setAnswer(q.id, 1)}
                        className={`text-left p-4 rounded-xl border-2 transition-all ${
                          answers[q.id] === 1
                            ? 'bg-yellow-400/20 border-yellow-400 text-white'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:bg-white/10'
                        }`}
                      >
                        <span className="font-bold text-yellow-400/90 mr-2">1 :</span>
                        {q.option1.text}
                      </button>
                      <button
                        type="button"
                        onClick={() => setAnswer(q.id, 2)}
                        className={`text-left p-4 rounded-xl border-2 transition-all ${
                          answers[q.id] === 2
                            ? 'bg-yellow-400/20 border-yellow-400 text-white'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:bg-white/10'
                        }`}
                      >
                        <span className="font-bold text-yellow-400/90 mr-2">2 :</span>
                        {q.option2.text}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between pt-6">
              <button
                type="button"
                onClick={() => { setPageIndex((p) => p - 1); window.scrollTo(0, 0); }}
                disabled={pageIndex === 0}
                className="px-5 py-2.5 rounded-xl font-bold border border-white/10 text-gray-400 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                ← ก่อนหน้า
              </button>
              {isLastPage ? (
                <button
                  type="button"
                  onClick={() => {
                    const scores = getScoresByChannel();
                    const dominantChannels = getDominantChannels();
                    const payload: SavedPersuasionResult = { user: { ...user }, scores, dominantChannels };
                    try {
                      localStorage.setItem(PERSUASION_RESULT_KEY, JSON.stringify(payload));
                    } catch (_) {}
                    setSavedResult(payload);
                    setStep('result');
                    window.scrollTo(0, 0);
                    if (isSupabaseConfigured) {
                      supabase
                        .from('persuasion_results')
                        .insert({
                          name: user.name.trim(),
                          email: user.email.trim(),
                          company: user.company.trim(),
                          scores,
                          dominant_channels: dominantChannels,
                        })
                        .then(({ error }) => {
                          if (error) console.warn('Persuasion save to DB:', error.message);
                        });
                    }
                  }}
                  disabled={!isPageComplete}
                  className="px-6 py-2.5 rounded-xl font-bold bg-yellow-400 text-black hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  แสดงผล
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { setPageIndex((p) => p + 1); window.scrollTo(0, 0); }}
                  disabled={!isPageComplete}
                  className="px-6 py-2.5 rounded-xl font-bold bg-yellow-400 text-black hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  ถัดไป →
                </button>
              )}
            </div>
          </div>
        )}

        {step === 'result' && (() => {
          const scores = savedResult?.scores ?? getScoresByChannel();
          const dominantChannels = savedResult?.dominantChannels ?? getDominantChannels();
          const displayUser = savedResult?.user ?? user;
          const maxScore = Math.max(...Object.values(scores).map(Number), 1);
          const chartData: (string | number)[][] = [
            ['Channel', 'Score'],
            ...PIE_CHANNEL_ORDER.map((item) => [item.label, Math.max(scores[item.id], 0.001)]),
          ];
          const slices: Record<number, { color: string; offset?: number }> = {};
          const FROSTED_GRAY = '#9ca3af';
          PIE_CHANNEL_ORDER.forEach((item, i) => {
            const isDominant = dominantChannels.includes(item.id);
            const score = scores[item.id];
            let color: string;
            if (isDominant) {
              color = hexToRgb(PIE_COLORS[i]);
            } else if (score === 0) {
              color = hexBlendWithDark(FROSTED_GRAY, 0.12);
            } else {
              color = hexBlendWithDark(FROSTED_GRAY, 0.22);
            }
            slices[i] = {
              color,
              ...(isDominant ? { offset: 0.1 } : {}),
            };
          });
          const sortedByScore = ([...PIE_CHANNEL_ORDER] as { id: PersuasionChannelId; label: string }[]).sort(
            (a, b) => scores[b.id] - scores[a.id]
          );
          const sliceFontSize = chartHeight <= 400 ? 9 : chartHeight <= 500 ? 11 : 12;
          const chartOptions = {
            title: '6 ช่องทางโน้มน้าวจูงใจ',
            pieHole: 0.38,
            is3D: true,
            pieSliceText: 'label',
            pieSliceTextStyle: { color: '#ffffff', fontSize: sliceFontSize, bold: true },
            titleTextStyle: { color: '#fbbf24', fontSize: chartHeight <= 400 ? 14 : 16 },
            legend: 'none',
            slices,
            backgroundColor: 'transparent',
            chartArea: { left: 24, top: chartHeight <= 400 ? 44 : 56, width: '88%', height: '74%' },
            pieSliceBorderColor: '#1f2937',
            pieSliceBorderWidth: 2,
          };
          return (
            <div className="space-y-10">
              <div ref={resultCardRef} className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8 space-y-8 overflow-visible">
                <div className="text-center">
                  <h1 className="text-2xl md:text-4xl font-black text-white mb-2">
                    6 Channel Persuasion Test
                  </h1>
                  <p className="text-lg md:text-xl text-yellow-400/90 font-semibold">
                    &quot;ความถนัด&quot; ทางธรรมชาติในการโน้มน้าวใจของคุณ
                  </p>
                  <p className="text-gray-400 text-sm mt-2">
                    {displayUser.name || 'ผู้ประเมิน'}
                  </p>
                </div>

                {/* Pie Chart 3D (Google Charts - ไม่มี trial) */}
                <div className="w-full max-w-4xl mx-auto rounded-xl bg-black/20 flex items-center justify-center overflow-visible" style={{ minHeight: chartHeight }}>
                  <Chart
                    chartType="PieChart"
                    data={chartData}
                    options={chartOptions}
                    width="100%"
                    height={chartHeight}
                    style={{ maxWidth: '100%' }}
                    loader={<div className="text-gray-400 py-20">กำลังโหลดกราฟ...</div>}
                  />
                </div>

                {/* หลอดคะแนน เรียงลำดับจากสูงไปต่ำ */}
                <div className="space-y-2 min-w-0 overflow-visible pb-2">
                  <p className="text-sm font-semibold text-gray-400 mb-3 leading-normal">คะแนนแต่ละช่องทาง (เรียงจากสูงไปต่ำ)</p>
                  {sortedByScore.map((item, rank) => {
                    const score = scores[item.id];
                    const isDominant = dominantChannels.includes(item.id);
                    const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center gap-2 sm:gap-3 min-w-0 py-2.5 px-3 rounded-xl transition-colors leading-normal min-h-[2.25rem] ${
                          isDominant ? 'bg-yellow-400/10 border border-yellow-400/30' : 'bg-white/[0.03] border border-transparent'
                        } ${!isDominant && score < maxScore ? 'opacity-75' : ''}`}
                      >
                        <span className="text-xs font-bold text-gray-500 w-5 flex-shrink-0 tabular-nums leading-normal">{rank + 1}</span>
                        <span
                          className={`text-sm w-28 sm:w-32 flex-shrink-0 leading-normal ${
                            isDominant ? 'text-yellow-400/95 font-semibold' : 'text-gray-400'
                          }`}
                        >
                          {item.label}
                        </span>
                        <div className="flex-1 min-w-[60px] h-6 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500 min-w-0"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: isDominant ? 'rgb(250, 204, 21)' : 'rgba(250, 204, 21, 0.4)',
                            }}
                          />
                        </div>
                        <span className={`text-sm tabular-nums w-10 text-right ${isDominant ? 'text-yellow-400/90 font-semibold' : 'text-gray-500'}`}>
                          {score}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* คำอธิบายช่องทางที่ถนัด (ใช้ displayUser จาก savedResult หรือ user) */}
                {dominantChannels.length > 0 && (
                  <div className="rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-5 md:p-6">
                    <p className="text-sm font-bold text-yellow-400/90 mb-2">ความถนัดของคุณ</p>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {PERSUASION_CHANNEL_DESCRIPTIONS[dominantChannels[0]]}
                    </p>
                    {dominantChannels.length > 1 && (
                      <p className="text-gray-400 text-xs mt-2">
                        คุณอาจถนัดหลายรูปแบบ: {dominantChannels.map((id) => PERSUASION_CHANNEL_LABELS[id]).join(' · ')}
                      </p>
                    )}
                  </div>
                )}

                <div className="pt-4 border-t border-white/10">
                  <p className="text-gray-400 text-sm mb-4">ดาวน์โหลดผลลัพธ์</p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleDownloadPdf}
                      disabled={pdfLoading}
                      className="flex-1 min-w-[140px] py-3.5 px-6 rounded-xl font-bold bg-yellow-400 text-black hover:bg-yellow-300 text-center shadow-lg shadow-yellow-400/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {pdfLoading ? 'กำลังสร้าง...' : 'โหลดเป็น PDF'}
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadPng}
                      disabled={pngLoading}
                      className="flex-1 min-w-[140px] py-3.5 px-6 rounded-xl font-bold border-2 border-yellow-400 text-yellow-400 hover:bg-yellow-400/10 text-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {pngLoading ? 'กำลังสร้าง...' : 'โหลดเป็น PNG'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setStep('login');
                    setAnswers({});
                    setPageIndex(0);
                    setSavedResult(null);
                    try { localStorage.removeItem(PERSUASION_RESULT_KEY); } catch (_) {}
                    window.scrollTo(0, 0);
                  }}
                  className="px-6 py-3 rounded-xl font-bold border border-yellow-400/60 text-yellow-400 hover:bg-yellow-400/10 transition-all"
                >
                  ทำแบบประเมินใหม่
                </button>
                <Link
                  to="/"
                  className="px-6 py-3 rounded-xl font-bold bg-yellow-400 text-black hover:bg-yellow-300 text-center transition-all"
                >
                  กลับหน้าแรก
                </Link>
              </div>
            </div>
          );
        })()}
      </main>

      <footer className="py-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-6 text-center text-gray-500 text-sm">
          © {new Date().getFullYear()} MindDoJo CO., LTD.
        </div>
      </footer>
    </div>
  );
};

export default PersuasionAssessment;
