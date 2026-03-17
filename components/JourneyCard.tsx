
import React from 'react';
import { JourneyCategory, Tool } from '../types';

interface JourneyCardProps {
  category: JourneyCategory;
  onToolClick: (tool: Tool) => void;
}

const JourneyCard: React.FC<JourneyCardProps> = ({ category, onToolClick }) => {
  return (
    <div className="group relative flex flex-col min-h-[420px] sm:min-h-[480px] lg:h-[560px] w-full bg-neutral-900/50 border border-white/10 rounded-2xl sm:rounded-[28px] lg:rounded-[32px] overflow-hidden transition-all duration-500 hover:border-yellow-400/30 hover:bg-neutral-900/80">
      {/* Background Image with Gradient Overlay */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center grayscale group-hover:grayscale-0 transition-all duration-1000 opacity-20 group-hover:opacity-40 scale-110 group-hover:scale-100"
        style={{ backgroundImage: `url(${category.image})` }}
      />
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-neutral-900 via-neutral-900/60 to-transparent" />

      <div className="relative z-20 flex flex-col h-full p-5 sm:p-6 lg:p-8">
        <div className="mb-auto shrink-0">
          <span className="text-yellow-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-2 sm:mb-4 block">Section</span>
          <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white leading-tight mb-3 sm:mb-4 group-hover:text-yellow-400 transition-colors line-clamp-2">
            {category.title}
          </h3>
          <div className="w-10 sm:w-12 h-0.5 sm:h-1 bg-yellow-400/30 rounded-full group-hover:w-20 sm:group-hover:w-24 transition-all duration-500" />
        </div>

        <div className="space-y-2 sm:space-y-3 mt-4 sm:mt-6 lg:mt-8 min-h-0">
          <p className="text-[10px] sm:text-xs text-gray-500 uppercase font-bold tracking-widest mb-1 sm:mb-2">Available Frameworks</p>
          <div className="flex flex-col gap-2 sm:gap-3 overflow-y-auto max-h-[200px] sm:max-h-[240px] lg:max-h-none pr-1">
            {category.tools.map((tool) => (
              <button
                key={tool.id}
                type="button"
                onClick={() => onToolClick(tool)}
                className="w-full text-left py-3 sm:py-4 px-3 sm:px-4 rounded-xl sm:rounded-2xl bg-white/5 border border-white/5 text-xs sm:text-sm font-medium hover:bg-yellow-400 hover:text-black hover:border-yellow-400 transition-all transform hover:-translate-y-0.5 sm:hover:-translate-y-1 active:scale-[0.98] min-h-[44px] sm:min-h-[48px]"
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
