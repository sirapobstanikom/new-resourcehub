import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  LEADERSHIP_DIMENSIONS,
  RATING_SCORE,
  DIMENSION_DESCRIPTIONS,
  getAllQuestionIds,
  type RatingLevel,
  type LeadershipDimension,
  type LeadershipQuestion,
  type LeadershipSubItem,
} from '../data/leadershipWheelData';
import { getLeadershipFeedback, type LeadershipResultPayload } from '../services/gemini';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

type Step = 'login' | 'assessment' | 'result';

const RATING_ORDER: RatingLevel[] = ['S', 'ME', 'AFI', 'ASD'];

/** Artwork สำหรับแต่ละหมวด (Be AWARE, ADAPT, ACT) */
const DIMENSION_ARTWORK: Record<string, string> = {
  aware: 'https://static.wixstatic.com/media/8f9517_4a4e1857cee1428c8864aa4d1a232bf0~mv2.png',
  adapt: 'https://static.wixstatic.com/media/8f9517_24a9a186e21a426d8904e8fe90a5ef94~mv2.png',
  act: 'https://static.wixstatic.com/media/8f9517_148bb0e9ac6c4571834c6f7abd23ab29~mv2.png',
};

const LeadershipAssessment: React.FC = () => {
  const [step, setStep] = useState<Step>('login');
  const [user, setUser] = useState({ name: '', email: '', company: '' });
  const [dimensionIndex, setDimensionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [dimId: string]: { [capId: string]: RatingLevel } }>({});
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
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
      setStep('assessment');
    }
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
      console.error('Failed to save leadership scores:', error);
    } else {
      setSaveStatus('success');
    }
  };

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
        backgroundColor: '#000000',
        logging: false,
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
      console.error('PDF export failed:', e);
    } finally {
      setPdfLoading(false);
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
    <div className="min-h-screen bg-black text-white bg-grid flex flex-col selection:bg-yellow-400 selection:text-black">
      <header className="flex justify-between items-center px-6 py-6 max-w-4xl mx-auto w-full">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center glow-yellow">
            <span className="text-black font-black text-xl">M</span>
          </div>
          <span className="text-xl font-bold tracking-tighter">MindDoJo</span>
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
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-yellow-400 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>

            <h2 className="text-3xl md:text-4xl font-black text-yellow-400 text-center">
              {currentDimension.name}
            </h2>

            <div className="flex justify-between items-center text-xs text-gray-500 px-1">
              <span>เป็นไปได้น้อยที่สุด</span>
              <span>เป็นไปได้มากที่สุด</span>
            </div>
            <div className="flex gap-0 border border-white/10 rounded-xl overflow-hidden bg-white/5">
              {RATING_ORDER.map((r) => (
                <div
                  key={r}
                  className="flex-1 text-center py-2 text-[10px] md:text-xs font-medium text-gray-400 border-r border-white/10 last:border-r-0"
                >
                  {r}
                </div>
              ))}
            </div>
            <p className="text-gray-500 text-sm text-center">{currentDimension.name} — เลือกระดับ S, ME, AFI หรือ ASD ที่ตรงกับคุณที่สุดในแต่ละข้อ (คะแนน 1–4)</p>

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
          <div className="space-y-10">
            <div ref={resultPdfRef} className="space-y-10 rounded-2xl border border-transparent p-4">
              <h1 className="text-2xl md:text-3xl font-black text-center">
                ผลการประเมินสมรรถนะภาวะผู้นำ
              </h1>

              {/* สถานะการบันทึกลง Supabase */}
            {saveStatus === 'saving' && (
              <p className="text-center text-gray-400 text-sm">กำลังบันทึกผลลง ระบบ...</p>
            )}
            {saveStatus === 'success' && (
              <p className="text-center text-green-400 text-sm">บันทึกผลลง ระบบ แล้ว</p>
            )}
            {saveStatus === 'error' && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center">
                <p className="text-red-400 text-sm font-medium">บันทึกลง ระบบ ไม่สำเร็จ</p>
                {saveError && <p className="text-red-300/80 text-xs mt-1">{saveError}</p>}
              </div>
            )}
            {!isSupabaseConfigured && (
              <p className="text-center text-amber-400/80 text-xs">
                ไม่ได้บันทึกลง ระบบ (ขาดการเชื่อมต่อกับ ระบบ)
              </p>
            )}

            <div className="space-y-6">
              {LEADERSHIP_DIMENSIONS.map((dim, idx) => (
                <div
                  key={dim.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-6 flex flex-col sm:flex-row gap-6 items-center"
                >
                  <div className="flex-shrink-0 w-32 h-32 sm:w-40 sm:h-40 rounded-xl overflow-hidden bg-white/5 border border-white/10">
                    <img
                      src={DIMENSION_ARTWORK[dim.id]}
                      alt={dim.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex-1 flex flex-col sm:flex-row items-center gap-4 w-full">
                    <div className="flex-shrink-0">
                      <DonutChart percent={getDimensionPercent(dim)} size={120} />
                    </div>
                    <div className="flex-1 text-center sm:text-left min-w-0">
                      <div className="text-gray-500 text-sm font-medium">
                        {idx + 1}. {dim.name}
                      </div>
                      <div className="text-2xl font-black text-yellow-400">
                        {getDimensionPercent(dim)}%
                      </div>
                      {DIMENSION_DESCRIPTIONS[dim.id] && (
                        <p className="text-gray-500 text-xs mt-1">
                          {DIMENSION_DESCRIPTIONS[dim.id]}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-yellow-400/30 bg-yellow-400/5 p-6 space-y-4">
              <h3 className="text-lg font-bold text-yellow-400">Feedback จาก AI</h3>
              {aiLoading && (
                <div className="flex items-center gap-3 text-gray-400">
                  <div className="w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                  <span>กำลังสร้าง feedback...</span>
                </div>
              )}
              {!aiLoading && !aiFeedback && (
                <button
                  type="button"
                  onClick={fetchAIFeedback}
                  className="px-6 py-3 rounded-xl font-bold bg-yellow-400 text-black hover:bg-yellow-300 transition-all"
                >
                  รับ Feedback จาก AI
                </button>
              )}
              {aiFeedback && (
                <div className="prose prose-invert prose-yellow max-w-none">
                  <div className="whitespace-pre-wrap text-gray-300 text-sm leading-relaxed">
                    {aiFeedback}
                  </div>
                </div>
              )}
            </div>

            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4 flex-wrap">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={pdfLoading}
                className="px-6 py-3 rounded-xl font-bold border border-yellow-400/50 text-yellow-400 hover:bg-yellow-400/10 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {pdfLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
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
                className="px-6 py-3 rounded-xl font-bold border border-white/10 hover:bg-white/5 transition-all"
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
}

const DonutChart: React.FC<DonutChartProps> = ({ percent, size = 120 }) => {
  const strokeWidth = 12;
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const filled = Math.max(0, Math.min(100, percent)) / 100;
  const dash = filled * circumference;
  const gap = circumference - dash;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="rgb(250, 204, 21)"
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

const QuestionBlock: React.FC<QuestionBlockProps> = ({
  index,
  question,
  selected,
  onSelect,
}) => {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 md:p-6 space-y-4">
      <div>
        <h4 className="font-bold text-base text-white">
          {index}. {question.title}
        </h4>
        <p className="text-gray-400 text-sm leading-relaxed mt-1">{question.description}</p>
      </div>
      <div className="flex gap-1 md:gap-2">
        {RATING_ORDER.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => onSelect(r)}
            className={`flex-1 py-3 rounded-xl text-xs md:text-sm font-medium transition-all ${
              selected === r
                ? 'bg-yellow-400 text-black ring-2 ring-yellow-400'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
            }`}
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LeadershipAssessment;
