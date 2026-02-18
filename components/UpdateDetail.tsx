
import React from 'react';
import { InnovationUpdate } from '../types';

interface UpdateDetailProps {
  update: InnovationUpdate;
  onBack: () => void;
}

const UpdateDetail: React.FC<UpdateDetailProps> = ({ update, onBack }) => {
  return (
    <div className="bg-black text-white min-h-screen max-w-4xl mx-auto px-6">
      {/* Navigation */}
      <div className="flex justify-between items-center mb-12 py-8 border-b border-white/10">
        <button 
          onClick={onBack}
          className="text-gray-400 hover:text-yellow-400 flex items-center gap-2 font-black uppercase tracking-tighter transition-colors"
        >
          <span className="text-xl">←</span> Back to Updates
        </button>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-yellow-400 rounded flex items-center justify-center">
            <span className="text-black font-bold">M</span>
          </div>
          <span className="font-bold tracking-tighter">MindDoJo NEWS</span>
        </div>
      </div>

      <article className="space-y-12 pb-24">
        <header className="space-y-6">
          <div className="flex items-center gap-4">
             <span className="px-4 py-1 bg-yellow-400 text-black text-[10px] font-black uppercase tracking-widest rounded-full">Innovation</span>
             <span className="text-gray-500 text-sm font-bold">{update.date}</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white leading-tight tracking-tighter">
            {update.title}
          </h1>
        </header>

        <div className="rounded-[40px] overflow-hidden border border-white/10 aspect-video relative group shadow-2xl">
           <img 
            src={update.image} 
            alt={update.title} 
            className="w-full h-full object-cover"
           />
        </div>

        <div className="prose prose-invert prose-yellow max-w-none">
          <div className="text-xl md:text-2xl text-gray-300 leading-relaxed font-medium whitespace-pre-wrap">
            {update.fullContent || update.description}
          </div>
        </div>

        {(update.sourceUrl) && (
          <div className="p-8 bg-white/5 rounded-3xl border border-white/10 space-y-4">
             <h4 className="text-xs font-black text-yellow-400 uppercase tracking-widest">แหล่งข้อมูลอ้างอิง:</h4>
             <a 
              href={update.sourceUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-gray-400 hover:text-white transition-colors break-all flex items-center gap-2 font-bold"
             >
               {update.sourceUrl} <span className="text-yellow-400">↗</span>
             </a>
          </div>
        )}
      </article>
    </div>
  );
};

export default UpdateDetail;
