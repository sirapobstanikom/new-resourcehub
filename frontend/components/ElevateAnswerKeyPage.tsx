import React, { useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { CanvasSectionCard } from './elevate/ElevateAnswerKeySections';
import {
  getElevateCaseContent,
  getElevateCaseOption,
  isElevateCaseId,
} from './elevate/elevateCases';

function ElevateAnswerKeyPlaceholder({ caseCode }: { caseCode: string }) {
  return (
    <div className="min-h-screen bg-[#070707] text-white selection:bg-yellow-300 selection:text-black">
      <header className="border-b border-yellow-400/15 bg-[#0a0a0a]">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-400/80">Facilitator only</p>
            <h1 className="text-xl font-black text-white sm:text-2xl">ELEVATE · ANSWER KEY</h1>
            <p className="mt-1 text-sm text-gray-400">{caseCode}</p>
          </div>
          <Link
            to="/elevate-answer-key"
            className="shrink-0 self-start rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-4 py-2 text-sm font-medium text-yellow-200 hover:bg-yellow-400/15"
          >
            เปลี่ยน Case
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-[0.15em] text-yellow-400/80">{caseCode}</p>
        <h2 className="mt-3 text-2xl font-black text-white">ยังไม่มีข้อมูล Answer Key</h2>
        <p className="mt-3 text-sm leading-relaxed text-gray-400">
          เนื้อหา {caseCode} จะเพิ่มในภายหลัง — กรุณาเลือก Case อื่นหรือกลับไปหน้าเลือก Case
        </p>
        <Link
          to="/elevate-answer-key"
          className="mt-8 inline-flex rounded-xl bg-yellow-400 px-5 py-2.5 text-sm font-bold text-black hover:bg-yellow-300"
        >
          กลับไปเลือก Case
        </Link>
      </div>
    </div>
  );
}

const ElevateAnswerKeyPage: React.FC = () => {
  const { caseId = '' } = useParams<{ caseId: string }>();
  const validCaseId = isElevateCaseId(caseId) ? caseId : null;
  const caseOption = validCaseId ? getElevateCaseOption(validCaseId) : undefined;
  const caseContent = validCaseId ? getElevateCaseContent(validCaseId) : null;

  const navItems = useMemo(() => {
    if (!caseContent) return [];
    return [
      ...caseContent.day1Sections.map((section, index) => ({ id: section.id, label: `D1 · Canvas ${index + 1}` })),
      ...caseContent.day2Sections.map((section, index) => ({
        id: section.id,
        label: index === 0 ? 'D2 · Canvas 9' : 'D2 · Reference',
      })),
    ];
  }, [caseContent]);

  if (!validCaseId || !caseOption) {
    return <Navigate to="/elevate-answer-key" replace />;
  }

  if (!caseContent) {
    return <ElevateAnswerKeyPlaceholder caseCode={caseOption.code} />;
  }

  const { intro, day1Sections, day2Sections } = caseContent;

  return (
    <div className="min-h-screen bg-[#070707] text-white selection:bg-yellow-300 selection:text-black">
      <header className="sticky top-0 z-30 border-b border-yellow-400/15 bg-[#0a0a0a]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-400/80">Facilitator only</p>
            <h1 className="text-xl font-black text-white sm:text-2xl">{intro.title}</h1>
            <p className="mt-1 text-sm text-gray-400">
              {caseOption.code} — {intro.caseTitle.replace(/^Case [ABC] — /, '')}
            </p>
          </div>
          <Link
            to="/elevate-answer-key"
            className="shrink-0 self-start rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-4 py-2 text-sm font-medium text-yellow-200 hover:bg-yellow-400/15"
          >
            เปลี่ยน Case
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <section className="mb-6 rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-4 sm:p-5">
          <p className="text-sm font-semibold text-yellow-200">{intro.meta}</p>
          <p className="mt-3 text-sm leading-relaxed text-gray-300">{intro.note}</p>
        </section>

        <nav className="mb-6 flex flex-wrap gap-2">
          {navItems.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-300 hover:border-yellow-400/30 hover:text-yellow-200"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <section className="mb-8">
          <h2 className="mb-4 text-lg font-black text-white">DAY 1 — DIAGNOSE THE PLANT & BUILD THE 3-YEAR P-ROADMAP</h2>
          <div className="space-y-4">
            {day1Sections.map((section, index) => (
              <CanvasSectionCard key={section.id} section={section} index={index + 1} />
            ))}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-lg font-black text-white">DAY 2 — LEAD THE CHANGE & BUILD THE PROGRESS PLAN</h2>
          <div className="space-y-4">
            {day2Sections.map((section, index) => (
              <CanvasSectionCard key={section.id} section={section} index={index === 0 ? 9 : 10} />
            ))}
          </div>
        </section>

        <footer className="border-t border-white/10 pt-6 text-center text-sm text-gray-500">{intro.footer}</footer>
      </div>
    </div>
  );
};

export default ElevateAnswerKeyPage;
