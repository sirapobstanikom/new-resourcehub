import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getDigitalLeadershipFeedback } from '../services/openai';
import {
  DLC_SECTIONS,
  DLC_SCALE_LABELS,
  getDlcTotalQuestionCount,
  getDlcRawSum,
  getDlcOverallIndex,
  getDlcBand,
  DLC_BAND_LABELS,
  DLC_BAND_DOT,
  getDlcSectionIndex,
  getDlcAllQuestionIds,
  type DlcSection,
} from '../data/digitalLeadershipData';

type Step = 'login' | 'assessment' | 'result';

type SavedDlcResult = {
  user: { name: string; email: string; company: string };
  answers: Record<string, number>;
  /** เก็บคู่กับผลประเมิน — รีเฟรชแล้วไม่เรียก AI ซ้ำ */
  aiFeedback?: string;
};

const STORAGE_KEY = 'digital_leadership_assessment_result';

const INTRO_TITLE = 'Digital Leadership Competency Assessment';
const INTRO_BODY = (
  <>
    <p className="mb-4">
      แบบประเมินนี้วัดความพร้อมด้าน <strong className="text-white">Digital Leadership &amp; AI</strong> ในมิติ AI
      Mindset, AI Literacy, AI Application และ AI Leadership &amp; Governance
    </p>
    <p className="mb-4 text-gray-400">
      จำนวน <strong className="text-yellow-400/90">{getDlcTotalQuestionCount()}</strong> ข้อ (4 มิติ × มิติละ 5 ข้อ) รูปแบบ{' '}
      <strong className="text-yellow-400/90">Scale 1–5</strong> — 1 คือไม่เห็นด้วยเลย ถึง 5 คือเห็นด้วยมาก ใช้เวลาประมาณ{' '}
      <strong className="text-yellow-400/90">5–8 นาที</strong>
    </p>
    <div className="text-left bg-white/5 rounded-xl p-4 border border-white/10">
      <p className="font-semibold text-white text-sm mb-2">วิธีทำแบบประเมิน</p>
      <ol className="text-gray-400 text-sm space-y-1.5 list-decimal list-inside">
        <li>อ่านข้อความแต่ละข้อแล้วเลือกระดับที่สะท้อนคุณมากที่สุด</li>
        <li>ทำครบทั้ง 4 Section แล้วกดดูผลลัพธ์</li>
        <li>ผลรวมจะถูกแปลงเป็นดัชนี 5–25 เพื่อสรุประดับ Beginner ถึง AI Leader</li>
      </ol>
    </div>
  </>
);

function isCompleteAnswers(answers: Record<string, number>): boolean {
  return getDlcAllQuestionIds().every((id) => {
    const v = answers[id];
    return typeof v === 'number' && v >= 1 && v <= 5;
  });
}

const DigitalLeadershipAssessment: React.FC = () => {
  const [showIntroModal, setShowIntroModal] = useState(false);
  const [step, setStep] = useState<Step>('login');
  const [user, setUser] = useState({ name: '', email: '', company: '' });
  const [sectionIndex, setSectionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [savedSnapshot, setSavedSnapshot] = useState<SavedDlcResult | null>(null);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRefresh, setAiRefresh] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as SavedDlcResult;
      if (parsed?.answers && parsed?.user && isCompleteAnswers(parsed.answers)) {
        setSavedSnapshot(parsed);
        setAnswers(parsed.answers);
        setUser(parsed.user);
        setStep('result');
        if (typeof parsed.aiFeedback === 'string' && parsed.aiFeedback.trim()) {
          setAiFeedback(parsed.aiFeedback);
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  const totalSections = DLC_SECTIONS.length;
  const currentSection: DlcSection = DLC_SECTIONS[sectionIndex];
  const totalQuestions = getDlcTotalQuestionCount();
  const answeredCount = DLC_SECTIONS.flatMap((s) => s.questions).filter(
    (q) => answers[q.id] != null,
  ).length;
  const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  const isSectionComplete = (s: DlcSection) =>
    s.questions.every((q) => answers[q.id] != null);

  const canNextSection = isSectionComplete(currentSection);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (user.name.trim() && user.email.trim() && user.company.trim()) {
      setSectionIndex(0);
      setAnswers({});
      setSavedSnapshot(null);
      setAiFeedback(null);
      setAiRefresh(0);
      setShowIntroModal(true);
    }
  };

  const handleCloseIntroAndStart = () => {
    setShowIntroModal(false);
    setStep('assessment');
  };

  const setScale = (questionId: string, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const finishAssessment = () => {
    setAiFeedback(null);
    setAiRefresh(0);
    const payload: SavedDlcResult = {
      user: { name: user.name.trim(), email: user.email.trim(), company: user.company.trim() },
      answers: { ...answers },
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* ignore */
    }
    setSavedSnapshot(payload);
    setStep('result');
    window.scrollTo(0, 0);
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
    setAiFeedback(null);
    setAiRefresh(0);
  };

  const displayAnswers = savedSnapshot?.answers ?? answers;
  const displayUser = savedSnapshot?.user ?? user;
  const rawSum = getDlcRawSum(displayAnswers);
  const overallIndex = getDlcOverallIndex(rawSum);
  const band = getDlcBand(overallIndex);
  const bandInfo = DLC_BAND_LABELS[band];

  const resultFetchKey = useMemo(() => {
    if (step !== 'result' || !isCompleteAnswers(displayAnswers)) return '';
    const dimPart = DLC_SECTIONS.map((s) => getDlcSectionIndex(s, displayAnswers)).join(',');
    return `${displayUser.name}|${rawSum}|${dimPart}|${aiRefresh}`;
  }, [step, displayUser.name, rawSum, displayAnswers, aiRefresh]);

  useEffect(() => {
    if (!resultFetchKey) return;
    const cached = savedSnapshot?.aiFeedback?.trim();
    if (aiRefresh === 0 && cached) {
      setAiFeedback(cached);
      setAiLoading(false);
      return;
    }
    let cancelled = false;
    setAiLoading(true);
    if (aiRefresh > 0) setAiFeedback(null);
    const payload = {
      user: displayUser,
      rawSum,
      overallIndex,
      bandLevelEn: bandInfo.levelEn,
      bandLine1Th: bandInfo.line1,
      bandFocusTh: bandInfo.line2,
      dimensions: DLC_SECTIONS.map((s) => ({
        title: s.title.replace(/^Section \d+: /, ''),
        score: getDlcSectionIndex(s, displayAnswers),
      })),
    };
    void getDigitalLeadershipFeedback(payload).then((text) => {
      if (cancelled) return;
      setAiFeedback(text);
      setAiLoading(false);
      try {
        const entry: SavedDlcResult = {
          user: displayUser,
          answers: displayAnswers,
          aiFeedback: text,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
        setSavedSnapshot(entry);
      } catch {
        /* ignore */
      }
    });
    return () => {
      cancelled = true;
      setAiLoading(false);
    };
  }, [resultFetchKey, savedSnapshot?.aiFeedback, aiRefresh]);

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
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-yellow-400/20 border border-yellow-400/30 flex items-center justify-center">
                <span className="text-3xl">📊</span>
              </div>
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight mb-4">{INTRO_TITLE}</h2>
              <div className="text-sm md:text-base leading-relaxed mb-8 text-gray-400 text-left">{INTRO_BODY}</div>
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
            <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-2 text-center">
              Digital Leadership Competency Assessment
            </h1>
            <p className="text-gray-400 text-sm text-center mb-8">
              20 ข้อ · Scale 1–5 · MindDoJo
            </p>
            <form
              onSubmit={handleLoginSubmit}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8 space-y-5"
            >
              <div>
                <label htmlFor="dlc-name" className="block text-sm font-medium text-gray-400 mb-2">
                  ชื่อ
                </label>
                <input
                  id="dlc-name"
                  type="text"
                  value={user.name}
                  onChange={(e) => setUser((u) => ({ ...u, name: e.target.value }))}
                  placeholder="กรอกชื่อ"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
                />
              </div>
              <div>
                <label htmlFor="dlc-email" className="block text-sm font-medium text-gray-400 mb-2">
                  อีเมล
                </label>
                <input
                  id="dlc-email"
                  type="email"
                  value={user.email}
                  onChange={(e) => setUser((u) => ({ ...u, email: e.target.value }))}
                  placeholder="กรอกอีเมล"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
                />
              </div>
              <div>
                <label htmlFor="dlc-company" className="block text-sm font-medium text-gray-400 mb-2">
                  บริษัท
                </label>
                <input
                  id="dlc-company"
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
                เข้าสู่แบบประเมิน
              </button>
            </form>
          </div>
        )}

        {step === 'assessment' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between gap-2 text-sm text-gray-500">
              <span className="font-semibold text-yellow-400/90">{currentSection.title}</span>
              <span>
                Section {sectionIndex + 1} / {totalSections}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-yellow-400 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="space-y-6">
              {currentSection.questions.map((q, i) => {
                const globalIdx =
                  DLC_SECTIONS.slice(0, sectionIndex).reduce((n, s) => n + s.questions.length, 0) + i;
                return (
                  <div
                    key={q.id}
                    className="rounded-2xl border border-white/10 bg-white/5 p-5 md:p-6 space-y-4"
                  >
                    <p className="text-xs font-bold text-yellow-400/90 uppercase tracking-widest">
                      ข้อที่ {globalIdx + 1} / {totalQuestions}
                    </p>
                    <p className="text-white text-sm md:text-base leading-relaxed font-medium">{q.text}</p>
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-gray-500">เลือก 1–5</p>
                      <div className="flex flex-wrap gap-2">
                        {([1, 2, 3, 4, 5] as const).map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setScale(q.id, v)}
                            title={DLC_SCALE_LABELS[v]}
                            className={`min-w-[2.75rem] px-3 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                              answers[q.id] === v
                                ? 'bg-yellow-400/25 border-yellow-400 text-white'
                                : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/25'
                            }`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                      {answers[q.id] != null && (
                        <p className="text-xs text-gray-400 mt-1">
                          {DLC_SCALE_LABELS[answers[q.id]]}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between pt-6">
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

        {step === 'result' && (
          <div className="space-y-10 max-w-xl mx-auto">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8 space-y-6 text-center">
              <p className="text-[10px] uppercase tracking-widest text-gray-500">Digital Leadership</p>
              <h1 className="text-2xl md:text-3xl font-black text-white">ผลการประเมิน</h1>
              <p className="text-gray-400 text-sm">{displayUser.name}</p>

              <div className="rounded-2xl bg-black/40 border border-yellow-400/20 p-6">
                <p className="text-sm text-gray-400 mb-1">ดัชนีรวม (ช่วง 5–25)</p>
                <p className="text-4xl md:text-5xl font-black text-yellow-400 tabular-nums">
                  {overallIndex.toFixed(1)}
                </p>
                <p className="text-xs text-gray-500 mt-2">คะแนนดิบรวม {rawSum} / 100</p>
              </div>

              <div className="text-left rounded-xl border border-white/10 bg-white/[0.04] p-5">
                <p className="text-lg font-bold text-white flex items-center gap-2">
                  <span aria-hidden>{DLC_BAND_DOT[band]}</span>
                  {bandInfo.levelEn}
                </p>
                <p className="text-gray-300 text-sm mt-2">{bandInfo.line1}</p>
                <p className="text-yellow-400/90 text-sm mt-2 font-medium">{bandInfo.line2}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
              <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider">คะแนนแต่ละมิติ (5–25)</h2>
              {DLC_SECTIONS.map((s) => {
                const idx = getDlcSectionIndex(s, displayAnswers);
                const pct = ((idx - 5) / 20) * 100;
                return (
                  <div key={s.id}>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span className="text-white font-medium pr-2">{s.title.replace(/^Section \d+: /, '')}</span>
                      <span className="tabular-nums shrink-0">{idx} / 25</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-yellow-400/90 rounded-full transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-2xl border border-yellow-400/25 bg-white/[0.06] p-6 space-y-4">
              <h2 className="text-sm font-bold text-yellow-400/90 uppercase tracking-wider">
                คำแนะนำจาก AI
              </h2>
              <p className="text-xs text-gray-500 -mt-2">
                วิเคราะห์จากดัชนีรวม คะแนนแต่ละมิติ และระดับสรุป — เพื่อแนะนำการพัฒนาต่อยอด
              </p>
              {aiLoading && (
                <div className="flex items-center gap-3 text-gray-400">
                  <div
                    className="w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin shrink-0"
                    aria-hidden
                  />
                  <span>กำลังวิเคราะห์คะแนนและสร้างคำแนะนำ...</span>
                </div>
              )}
              {!aiLoading && aiFeedback && (
                <div className="whitespace-pre-wrap text-gray-200 text-sm leading-relaxed border-t border-white/10 pt-4">
                  {aiFeedback}
                </div>
              )}
              {!aiLoading && !aiFeedback && (
                <div className="space-y-3">
                  <p className="text-gray-500 text-sm">ยังไม่มีคำแนะนำ</p>
                  <button
                    type="button"
                    onClick={() => setAiRefresh((n) => n + 1)}
                    className="px-4 py-2 rounded-xl text-sm font-bold bg-yellow-400/20 text-yellow-400 border border-yellow-400/40 hover:bg-yellow-400/30 transition-colors"
                  >
                    ขอคำแนะนำจาก AI
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs text-gray-500 space-y-1">
              <p className="font-semibold text-gray-400">เกณฑ์สรุประดับ</p>
              <p>5–10 Beginner · 11–17 Developing · 18–21 Advanced · 22–25 AI Leader</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
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

export default DigitalLeadershipAssessment;
