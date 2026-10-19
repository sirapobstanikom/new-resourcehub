
import React from 'react';
import { InnovationUpdate } from '../types';
import BrandLogo from './BrandLogo';

interface UpdateDetailProps {
  update: InnovationUpdate;
  onBack: () => void;
}

const UpdateDetail: React.FC<UpdateDetailProps> = ({ update, onBack }) => {
  return (
    <div className="bg-transparent text-gray-900 min-h-screen max-w-4xl mx-auto px-6">
      {/* Navigation */}
      <div className="flex justify-between items-center mb-12 py-8 border-b border-[#D6D4CC]">
        <button 
          onClick={onBack}
          className="text-gray-500 hover:text-yellow-600 flex items-center gap-2 font-semibold uppercase tracking-tighter transition-colors"
        >
          <span className="text-xl">←</span> Back to Updates
        </button>
        <div className="flex items-center gap-2">
          <BrandLogo className="text-[24px]" tone="dark" />
          <span className="font-semibold tracking-tighter text-yellow-600">NEWS</span>
        </div>
      </div>

      <article className="space-y-12 pb-24">
        <header className="space-y-6">
          <div className="flex items-center gap-4">
             <span className="px-4 py-1 bg-[#FFCC00] text-black text-[10px] font-black uppercase tracking-widest rounded-full">Innovation</span>
             <span className="text-gray-500 text-sm font-bold">{update.date}</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-semibold text-gray-900 leading-tight tracking-tighter">
            {update.title}
          </h1>
        </header>

        <div className="rounded-[40px] overflow-hidden border border-[#D6D4CC] relative group shadow-sm max-h-[70vh] flex items-center justify-center bg-gray-50">
           <img 
            src={update.image.startsWith('/') ? encodeURI(update.image) : update.image} 
            alt={update.title} 
            className="w-full h-auto max-h-[70vh] object-contain"
           />
        </div>

        <div className="prose prose-gray max-w-none">
          <div className="text-xl md:text-2xl text-gray-700 leading-relaxed font-medium whitespace-pre-wrap">
            {update.fullContent || update.description}
          </div>
        </div>

        {(update.sourceUrl) && (
          <div className="p-8 bg-gray-50 rounded-3xl border border-[#D6D4CC] space-y-4">
             <h4 className="text-xs font-black text-yellow-700 uppercase tracking-widest">แหล่งข้อมูลอ้างอิง:</h4>
             <a 
              href={update.sourceUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-gray-600 hover:text-gray-900 transition-colors break-all flex items-center gap-2 font-bold"
             >
               {update.sourceUrl} <span className="text-yellow-600">↗</span>
             </a>
          </div>
        )}
      </article>
    </div>
  );
};

export default UpdateDetail;
