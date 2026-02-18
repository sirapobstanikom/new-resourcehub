
import React from 'react';
import { InnovationUpdate } from '../types';

interface UpdateCardProps {
  update: InnovationUpdate;
}

const UpdateCard: React.FC<UpdateCardProps> = ({ update }) => {
  return (
    <div className="bg-black border border-white/20 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row gap-8 hover:border-yellow-400/50 transition-all group">
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-2xl md:text-3xl font-black text-white mb-4 underline decoration-yellow-400 decoration-4 underline-offset-8">
            {update.title}
          </h3>
          <p className="text-gray-300 text-base md:text-lg leading-relaxed mb-8">
            {update.description}
          </p>
        </div>
        <button className="self-start px-10 py-2 bg-neutral-300 text-black font-bold rounded-lg hover:bg-yellow-400 transition-colors uppercase">
          Detail
        </button>
      </div>
      <div className="flex-1 min-h-[250px] relative overflow-hidden rounded-2xl">
        <img 
          src={update.image} 
          alt={update.title} 
          className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
        />
      </div>
    </div>
  );
};

export default UpdateCard;
