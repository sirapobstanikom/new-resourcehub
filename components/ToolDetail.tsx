
import React from 'react';
import { Tool } from '../types';
import CommentSection from './CommentSection';
import AIChatSidebar from './AIChatSidebar';

interface ToolDetailProps {
  tool: Tool;
  onBack: () => void;
  onAskAI: () => void;
}

const ToolDetail: React.FC<ToolDetailProps> = ({ tool, onBack, onAskAI }) => {
  return (
    <div className="bg-black text-white min-h-screen">
      {/* Navigation */}
      <div className="flex justify-between items-center mb-12 py-4">
        <button 
          onClick={onBack}
          className="text-gray-400 hover:text-yellow-400 flex items-center gap-2 font-medium transition-colors"
        >
          <span className="text-xl">←</span> Back to Hub
        </button>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-yellow-400 rounded flex items-center justify-center">
            <span className="text-black font-bold">M</span>
          </div>
          <span className="font-bold">MindDoJo</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-16">
          <header>
            <h1 className="text-5xl md:text-6xl font-extrabold mb-6 tracking-tight leading-tight">{tool.name}</h1>
            <p className="text-xl text-gray-400 leading-relaxed max-w-3xl">
              {tool.longDescription || tool.description}
            </p>
          </header>

          {tool.usageInstructions && (
            <section className="bg-neutral-900/50 border border-white/10 rounded-3xl p-8 md:p-12">
              <h2 className="text-2xl font-bold mb-8 flex items-center gap-4 text-yellow-400">
                <span className="w-8 h-8 rounded-full bg-yellow-400/10 flex items-center justify-center text-sm">1</span>
                Instructions & Guidance
              </h2>
              <p className="text-lg font-semibold text-gray-200 mb-8">{tool.usageInstructions}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {tool.blocks?.map((block, idx) => (
                  <div key={idx} className="p-6 bg-white/5 rounded-2xl border border-white/5 hover:border-yellow-400/30 transition-all">
                    <h4 className="text-yellow-400 font-bold mb-2 text-sm uppercase tracking-widest">{block.title}</h4>
                    <p className="text-gray-400 text-sm leading-relaxed">{block.detail}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {tool.exampleImage && (
            <section>
              <h2 className="text-2xl font-bold mb-8 flex items-center gap-4 text-yellow-400">
                <span className="w-8 h-8 rounded-full bg-yellow-400/10 flex items-center justify-center text-sm">2</span>
                Template Visualization
              </h2>
              <div className="rounded-3xl overflow-hidden border border-white/10 bg-neutral-900 shadow-2xl">
                <img 
                  src={tool.exampleImage} 
                  alt="Framework Example" 
                  className="w-full h-auto opacity-80 hover:opacity-100 transition-opacity" 
                />
              </div>
            </section>
          )}

          {tool.source && (
            <div className="p-8 bg-white/5 rounded-2xl border border-white/5 italic text-gray-500 text-sm">
              Source: {tool.source}
            </div>
          )}

          <CommentSection toolId={tool.id} />
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          <div className="sticky top-8 space-y-8">
            <AIChatSidebar toolName={tool.name} />

            <div className="bg-yellow-400 p-8 rounded-3xl text-black shadow-xl shadow-yellow-400/10">
              <h3 className="text-2xl font-black mb-4 leading-tight">Professional Templates</h3>
              <p className="font-medium mb-8 opacity-80">Download high-resolution assets and execution guides for this framework.</p>
              
              <div className="space-y-4">
                {tool.templateUrl && (
                  <a 
                    href={tool.templateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full bg-black text-white text-center font-bold py-4 rounded-xl hover:bg-neutral-900 transition-all transform hover:-translate-y-1 shadow-lg"
                  >
                    Download PDF Template
                  </a>
                )}
              </div>

              {tool.additionalResources && tool.additionalResources.length > 0 && (
                <div className="mt-8 pt-6 border-t border-black/10">
                  <h4 className="font-bold text-xs uppercase tracking-widest mb-4 opacity-60">References</h4>
                  <ul className="space-y-3">
                    {tool.additionalResources.map((res, idx) => (
                      <li key={idx}>
                        <a href={res.url} target="_blank" rel="noopener noreferrer" className="text-sm font-bold hover:underline flex items-center justify-between">
                          {res.label} <span>↗</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToolDetail;
