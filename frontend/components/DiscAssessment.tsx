import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DISC_QUESTIONS,
  DISC_LABELS,
  DISC_DESCRIPTIONS,
  type DiscType,
} from '../data/discData';

type Step = 'start' | 'questions' | 'result';

const DiscAssessment: React.FC = () => {
  const [step, setStep] = useState<Step>('start');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, DiscType>>({});

  const currentQuestion = DISC_QUESTIONS[currentIndex];
  const totalQuestions = DISC_QUESTIONS.length;
  const progress = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0;

  const handleStart = () => {
    setAnswers({});
    setCurrentIndex(0);
    setStep('questions');
  };

  const handleSelect = (type: DiscType) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: type }));
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setStep('result');
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  };

  const calculateScores = (): Record<DiscType, number> => {
    const scores: Record<DiscType, number> = { D: 0, I: 0, S: 0, C: 0 };
    Object.values(answers).forEach((type) => {
      scores[type] += 1;
    });
    return scores;
  };

  const getPrimaryType = (scores: Record<DiscType, number>): DiscType => {
    return (Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0] as DiscType);
  };

  const selectedOption = currentQuestion ? answers[currentQuestion.id] : null;
  const canNext = step === 'questions' && selectedOption != null;

  return (
    <div className="min-h-screen bg-transparent text-white bg-grid flex flex-col selection:bg-yellow-400 selection:text-black">
      {/* Header */}
      <header className="flex justify-between items-center px-6 py-6 max-w-4xl mx-auto w-full">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center glow-yellow">
            <span className="text-black font-black text-xl">M</span>
          </div>
          <span className="text-xl font-bold tracking-tighter">MindDoJo</span>
        </Link>
        {step === 'questions' && (
          <span className="text-gray-500 text-sm font-medium">
            {currentIndex + 1} / {totalQuestions}
          </span>
        )}
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-8 max-w-2xl mx-auto w-full">
        {/* Start */}
        {step === 'start' && (
          <div className="text-center w-full">
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-2">
              <span className="text-yellow-400">D</span>{' '}
              <span className="text-yellow-400">I</span>{' '}
              <span className="text-yellow-400">S</span>{' '}
              <span className="text-yellow-400">C</span>
            </h1>
            <p className="text-gray-400 text-lg mb-2">แบบทดสอบบุคลิกภาพ</p>
            <p className="text-gray-500 text-sm mb-10 max-w-md mx-auto">
              เลือกข้อความที่ตรงกับคุณที่สุดในแต่ละข้อ (รวม {totalQuestions} ข้อ)
              ใช้เวลาประมาณ 3–5 นาที
            </p>
            <button
              onClick={handleStart}
              className="px-10 py-4 rounded-2xl font-bold bg-yellow-400 text-black hover:bg-yellow-300 shadow-lg shadow-yellow-400/20 transition-all"
            >
              เริ่มทำแบบทดสอบ
            </button>
          </div>
        )}

        {/* Questions */}
        {step === 'questions' && currentQuestion && (
          <div className="w-full space-y-8">
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-yellow-400 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-white">
              {currentQuestion.text}
            </h2>
            <p className="text-gray-500 text-sm">เลือกข้อที่ตรงกับคุณที่สุด</p>
            <div className="space-y-3">
              {currentQuestion.options.map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => handleSelect(opt.type)}
                  className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all ${
                    selectedOption === opt.type
                      ? 'border-yellow-400 bg-yellow-400/10 text-white'
                      : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/20'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="px-5 py-2.5 rounded-xl font-bold border border-white/10 text-gray-400 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                ← ก่อนหน้า
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={!canNext}
                className="px-6 py-2.5 rounded-xl font-bold bg-yellow-400 text-black hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {currentIndex < totalQuestions - 1 ? 'ถัดไป →' : 'ดูผลลัพธ์'}
              </button>
            </div>
          </div>
        )}

        {/* Result */}
        {step === 'result' && (
          <div className="w-full space-y-8">
            <h1 className="text-3xl md:text-4xl font-black text-center">
              ผลลัพธ์แบบทดสอบ <span className="text-yellow-400">DISC</span>
            </h1>
            {(() => {
              const scores = calculateScores();
              const primary = getPrimaryType(scores);
              const maxScore = Math.max(...Object.values(scores));
              return (
                <>
                  <div className="space-y-4">
                    {(['D', 'I', 'S', 'C'] as DiscType[]).map((type) => (
                      <div key={type}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-300">
                            {DISC_LABELS[type]}
                          </span>
                          <span className="text-yellow-400">
                            {scores[type]} / {totalQuestions}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                            style={{
                              width: `${maxScore > 0 ? (scores[type] / maxScore) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-2xl border border-yellow-400/30 bg-yellow-400/5 p-6">
                    <p className="text-yellow-400 font-bold text-sm uppercase tracking-wider mb-2">
                      บุคลิกภาพหลักของคุณ
                    </p>
                    <h2 className="text-xl font-bold mb-3">{DISC_LABELS[primary]}</h2>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {DISC_DESCRIPTIONS[primary]}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                    <button
                      type="button"
                      onClick={handleStart}
                      className="px-6 py-3 rounded-xl font-bold border border-white/10 hover:bg-white/5 transition-all"
                    >
                      ทำแบบทดสอบใหม่
                    </button>
                    <Link
                      to="/"
                      className="px-6 py-3 rounded-xl font-bold bg-yellow-400 text-black hover:bg-yellow-300 text-center transition-all"
                    >
                      กลับหน้าแรก
                    </Link>
                  </div>
                </>
              );
            })()}
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

export default DiscAssessment;
