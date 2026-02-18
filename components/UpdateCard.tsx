
import React from 'react';
import { InnovationUpdate } from '../types';

interface UpdateCardProps {
  update: InnovationUpdate;
  onClick: (update: InnovationUpdate) => void;
}

const UpdateCard: React.FC<UpdateCardProps> = ({ update, onClick }) => {
  return (
    <div className="bg-black border border-white/20 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row gap-8 hover:border-yellow-400/50 transition-all group overflow-hidden">
      <div className="flex-1 flex flex-col justify-between">
        <div>
          {update.date && <span className="text-yellow-400 text-xs font-bold uppercase tracking-widest mb-2 block">{update.date}</span>}
          <h3 className="text-2xl md:text-3xl font-black text-white mb-4 underline decoration-yellow-400 decoration-4 underline-offset-8">
            {update.title}
          </h3>
          <p className="text-gray-300 text-base md:text-lg leading-relaxed mb-8">
            {update.description}
          </p>
        </div>
        <button 
          onClick={() => onClick(update)}
          className="self-start px-10 py-3 bg-neutral-300 text-black font-black rounded-lg hover:bg-yellow-400 transition-colors uppercase text-sm tracking-tight"
        >
          Detail
        </button>
      </div>
      <div className="flex-1 min-h-[250px] relative overflow-hidden rounded-2xl">
        <img 
          src={update.image} 
          alt={update.title} 
          className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 scale-100 group-hover:scale-105"
        />
      </div>
    </div>
  );
};

export default UpdateCard;
