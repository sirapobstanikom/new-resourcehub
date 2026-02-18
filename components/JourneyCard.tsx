
import React from 'react';
import { JourneyCategory, Tool } from '../types';

interface JourneyCardProps {
  category: JourneyCategory;
  onToolClick: (tool: Tool) => void;
}

const JourneyCard: React.FC<JourneyCardProps> = ({ category, onToolClick }) => {
  return (
    <div className="group relative flex flex-col h-[600px] w-full bg-neutral-900/50 border border-white/10 rounded-[32px] overflow-hidden transition-all duration-500 hover:border-yellow-400/30 hover:bg-neutral-900/80">
      {/* Background Image with Gradient Overlay */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center grayscale group-hover:grayscale-0 transition-all duration-1000 opacity-20 group-hover:opacity-40 scale-110 group-hover:scale-100"
        style={{ backgroundImage: `url(${category.image})` }}
      />
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-neutral-900 via-neutral-900/60 to-transparent" />
      
      <div className="relative z-20 flex flex-col h-full p-8">
        <div className="mb-auto">
          <span className="text-yellow-400 text-xs font-bold uppercase tracking-widest mb-4 block">Section</span>
          <h3 className="text-3xl font-bold text-white leading-tight mb-4 group-hover:text-yellow-400 transition-colors">
            {category.title}
          </h3>
          <div className="w-12 h-1 bg-yellow-400/30 rounded-full group-hover:w-24 transition-all duration-500" />
        </div>

        <div className="space-y-3 mt-8">
          <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-2">Available Frameworks</p>
          {category.tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => onToolClick(tool)}
              className="w-full text-left p-4 rounded-2xl bg-white/5 border border-white/5 text-sm font-medium hover:bg-yellow-400 hover:text-black hover:border-yellow-400 transition-all transform hover:-translate-y-1"
            >
              {tool.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default JourneyCard;
