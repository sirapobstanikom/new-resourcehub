
import React from 'react';
import { JourneyCategory, Tool } from '../types';

interface JourneyCardProps {
  category: JourneyCategory;
  onToolClick: (tool: Tool) => void;
}

const JourneyCard: React.FC<JourneyCardProps> = ({ category, onToolClick }) => {
  return (
    <div className="group relative flex w-full flex-col overflow-hidden rounded-2xl border-2 border-[#B8B4A8] bg-white shadow-[0_4px_0_rgba(0,0,0,0.06),0_12px_28px_rgba(0,0,0,0.08)] transition-all duration-500 hover:border-[#FFCC00] hover:shadow-[0_6px_0_rgba(224,155,0,0.35),0_16px_32px_rgba(0,0,0,0.1)] min-h-[420px] sm:min-h-[480px] lg:h-[560px]">
      {/* Background Image — เต็มการ์ด */}
      <div
        className="absolute inset-0 z-0 scale-105 bg-cover bg-center transition-all duration-700 group-hover:scale-100"
        style={{ backgroundImage: `url(${category.image})` }}
      />
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-white via-white/75 to-white/25" />

      <div className="relative z-20 flex h-full flex-col p-5 sm:p-6 lg:p-8">
        <div className="mb-auto shrink-0">
          <span className="mb-3 inline-flex items-center rounded-full border-2 border-black/10 bg-[#FFCC00] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-black shadow-sm sm:mb-4 sm:text-xs">
            Section
          </span>
          <h3 className="mb-3 text-xl font-black leading-tight text-gray-950 transition-colors group-hover:text-yellow-950 sm:mb-4 sm:text-2xl lg:text-3xl line-clamp-2">
            {category.title}
          </h3>
          <div className="h-1.5 w-12 rounded-full bg-[#FFCC00] transition-all duration-500 group-hover:w-24 sm:w-14" />
        </div>

        <div className="mt-4 min-h-0 space-y-2 sm:mt-6 sm:space-y-3 lg:mt-8">
          <p className="mb-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#5C4A00] sm:mb-2 sm:text-xs">
            Available Frameworks
          </p>
          <div className="flex max-h-[200px] flex-col gap-2 overflow-y-auto pr-1 sm:max-h-[240px] sm:gap-3 lg:max-h-none">
            {category.tools.map((tool) => (
              <button
                key={tool.id}
                type="button"
                onClick={() => onToolClick(tool)}
                className="min-h-[44px] w-full rounded-xl border-2 border-[#C8C5BA] bg-white/95 px-3 py-3 text-left text-xs font-bold text-gray-950 shadow-sm transition-all hover:-translate-y-0.5 hover:border-black hover:bg-[#FFCC00] active:scale-[0.98] sm:min-h-[48px] sm:rounded-2xl sm:px-4 sm:py-4 sm:text-sm sm:hover:-translate-y-1"
              >
                {tool.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JourneyCard;
