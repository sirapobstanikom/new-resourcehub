import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { ELEVATE_CASE_OPTIONS } from './elevate/elevateCases';

const ElevateAnswerKeySelectPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#070707] text-white selection:bg-yellow-300 selection:text-black">
      <header className="border-b border-yellow-400/15 bg-[#0a0a0a]">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-400/80">Facilitator only</p>
          <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">ELEVATE · ANSWER KEY</h1>
          <p className="mt-2 text-sm text-gray-400">เลือก Case ก่อนเข้าดูข้อมูล Answer Key</p>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {ELEVATE_CASE_OPTIONS.map((option) => (
            <Link
              key={option.id}
              to={`/elevate-answer-key/${option.id}`}
              className="group flex min-h-[180px] flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-all hover:border-yellow-400/40 hover:bg-yellow-400/5"
            >
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-yellow-400/70">ELEVATE</p>
              <h2 className="mt-2 text-2xl font-black text-white group-hover:text-yellow-300">{option.code}</h2>
              <p className="mt-2 text-sm font-medium text-gray-300">{option.subtitle}</p>
              <p className="mt-2 flex-1 text-xs leading-relaxed text-gray-500">{option.hint}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-yellow-400">
                เข้าดู Answer Key
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ElevateAnswerKeySelectPage;
