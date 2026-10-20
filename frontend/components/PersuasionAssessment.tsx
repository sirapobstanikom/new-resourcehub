import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  PERSUASION_QUESTIONS,
  getTotalPersuasionQuestionCount,
  type PersuasionChannelId,
} from '../data/persuasionData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import PersuasionResultView from './persuasion/PersuasionResultView';

const QUESTIONS_PER_PAGE = 5;
const PERSUASION_RESULT_KEY = 'persuasion_result';

type SavedPersuasionResult = {
  user: { name: string; email: string; company: string };
  scores: Record<PersuasionChannelId, number>;
  dominantChannels: PersuasionChannelId[];
};

type Step = 'login' | 'assessment' | 'result';

const INTRO_TITLE = 'แบบทดสอบ 6 ช่องทางในการโน้มน้าวจูงใจ';
const INTRO_BODY = (
  <>
    <p className="mb-4">
      แบบทดสอบหลักการทางจิตวิทยาที่ใช้ในการโน้มน้าวจูงใจผู้อื่น ด้วยการจูนเข้ากับผู้อื่นด้วย{' '}
      <strong className="text-yellow-800">ช่องสัญญาณ 6 ช่อง</strong> ซึ่งจะสะท้อนว่าคุณมักโน้มน้าวจูงใจผู้อื่นด้วยช่องทางใด
    </p>
    <p className="mb-4 text-gray-600">
      แบบทดสอบมีข้อคำถามทั้งสิ้น <strong className="text-yellow-800">{getTotalPersuasionQuestionCount()}</strong> ข้อ
      ในแต่ละข้อจะมีข้อความให้อ่าน 2 ข้อความ แนะนำให้อ่านทั้งสองข้อความก่อน แล้วค่อยตัดสินใจเลือกข้อความใดข้อความหนึ่งที่ตรงกับตัวคุณมากที่สุด
    </p>
    <div className="text-left bg-gray-50 rounded-xl p-4 border border-gray-200">
      <p className="font-semibold text-gray-900 text-sm mb-2">วิธีการทำแบบทดสอบ</p>
      <ol className="text-gray-600 text-sm space-y-1.5 list-decimal list-inside">
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
  const resultCardRef = useRef<HTMLDivElement>(null);

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
      backgroundColor: '#F3F2ED',
      scale: 2,
      logging: false,
      windowHeight: el.scrollHeight,
      height: el.scrollHeight,
    });
  };

  const hideExportUiForCapture = (): (() => void) => {
    if (typeof document === 'undefined') return () => {};
    const nodes = Array.from(document.querySelectorAll('[data-no-capture="true"]')) as HTMLElement[];
    const prev = nodes.map((n) => ({ node: n, visibility: n.style.visibility, display: n.style.display }));
    // ใช้ visibility เพื่อไม่ให้การ์ดสูงน้อยลง (ไม่ให้ html2canvas ตัดส่วนท้าย)
    for (const { node } of prev) node.style.visibility = 'hidden';
    return () => {
      for (const { node, visibility, display } of prev) {
        node.style.visibility = visibility;
        node.style.display = display;
      }
    };
  };

  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    let restore = () => {};
    try {
      restore = hideExportUiForCapture();
      const canvas = await captureResultCard();
      restore();
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      pdf.setFillColor(247, 247, 245);
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
      restore();
      setPdfLoading(false);
    }
  };

  const handleDownloadPng = async () => {
    setPngLoading(true);
    let restore = () => {};
    try {
      restore = hideExportUiForCapture();
      const canvas = await captureResultCard();
      restore();
      const link = document.createElement('a');
      link.download = 'ผลแบบทดสอบ-6-ช่องทางโน้มน้าวจูงใจ.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.warn('Export PNG:', e);
    } finally {
      restore();
      setPngLoading(false);
    }
  };

  if (step === 'result') {
    const scores = savedResult?.scores ?? getScoresByChannel();
    const dominantChannels = savedResult?.dominantChannels ?? getDominantChannels();
    const displayUser = savedResult?.user ?? user;
    return (
      <PersuasionResultView
        userName={displayUser.name}
        scores={scores}
        dominantChannels={dominantChannels}
        exportRef={resultCardRef}
        pdfLoading={pdfLoading}
        pngLoading={pngLoading}
        onDownloadPdf={handleDownloadPdf}
        onDownloadPng={handleDownloadPng}
        onRestart={() => {
          setStep('login');
          setAnswers({});
          setPageIndex(0);
          setSavedResult(null);
          try {
            localStorage.removeItem(PERSUASION_RESULT_KEY);
          } catch {
            /* ignore */
          }
          window.scrollTo(0, 0);
        }}
      />
    );
  }

  return (
    <div className="md-page">
      {showIntroModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={handleCloseIntroAndStartAssessment}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-lg rounded-3xl border border-yellow-200 bg-white shadow-2xl shadow-yellow-900/10 overflow-hidden">
            <div className="relative p-8 md:p-10 text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-yellow-100 border border-yellow-200 flex items-center justify-center">
                <span className="text-3xl">💬</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight mb-4">{INTRO_TITLE}</h2>
              <div className="text-sm md:text-base leading-relaxed mb-8 text-gray-600">{INTRO_BODY}</div>
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
          <BrandLogo className="text-[28px]" tone="dark" />
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
            <p className="text-gray-700 text-sm text-center mb-8 font-medium">
              Persuasion Test · MindDoJo
            </p>
            <form
              onSubmit={handleLoginSubmit}
              className="md-card p-6 md:p-8 space-y-5"
            >
              <div>
                <label htmlFor="persuasion-name" className="block text-sm font-medium text-gray-700 mb-2">ชื่อ</label>
                <input
                  id="persuasion-name"
                  type="text"
                  value={user.name}
                  onChange={(e) => setUser((u) => ({ ...u, name: e.target.value }))}
                  placeholder="กรอกชื่อ"
                  required
                  className="md-input"
                />
              </div>
              <div>
                <label htmlFor="persuasion-email" className="block text-sm font-medium text-gray-700 mb-2">อีเมล</label>
                <input
                  id="persuasion-email"
                  type="email"
                  value={user.email}
                  onChange={(e) => setUser((u) => ({ ...u, email: e.target.value }))}
                  placeholder="กรอกอีเมล"
                  required
                  className="md-input"
                />
              </div>
              <div>
                <label htmlFor="persuasion-company" className="block text-sm font-medium text-gray-700 mb-2">บริษัท</label>
                <input
                  id="persuasion-company"
                  type="text"
                  value={user.company}
                  onChange={(e) => setUser((u) => ({ ...u, company: e.target.value }))}
                  placeholder="กรอกชื่อบริษัท"
                  required
                  className="md-input"
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
            <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
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
                    className="md-card p-5 md:p-6 space-y-4"
                  >
                    <p className="text-xs font-bold text-yellow-800 uppercase tracking-widest mb-2">
                      ข้อที่ {globalIdx + 1} / {totalQuestions}
                    </p>
                    <h4 className="font-bold text-gray-900 text-sm mb-4">
                      ข้อไหนเป็นตัวตนของคุณมากที่สุด?
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setAnswer(q.id, 1)}
                        className={`text-left p-4 rounded-xl border-2 transition-all ${
                          answers[q.id] === 1
                            ? 'bg-yellow-50 border-yellow-400 text-gray-900'
                            : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <span className="font-bold text-yellow-800 mr-2">1 :</span>
                        {q.option1.text}
                      </button>
                      <button
                        type="button"
                        onClick={() => setAnswer(q.id, 2)}
                        className={`text-left p-4 rounded-xl border-2 transition-all ${
                          answers[q.id] === 2
                            ? 'bg-yellow-50 border-yellow-400 text-gray-900'
                            : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <span className="font-bold text-yellow-800 mr-2">2 :</span>
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
                className="md-btn-ghost disabled:opacity-40 disabled:cursor-not-allowed"
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

      </main>

      <footer className="py-6 border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-6 text-center text-gray-500 text-sm">
          © {new Date().getFullYear()} MindDoJo CO., LTD.
        </div>
      </footer>
    </div>
  );
};

export default PersuasionAssessment;
