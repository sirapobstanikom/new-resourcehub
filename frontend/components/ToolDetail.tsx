
import React from 'react';
import { Tool } from '../types';
import CommentSection from './CommentSection';
import AIChatSidebar from './AIChatSidebar';
import MobileAIChatFAB from './MobileAIChatFAB';
import BrandLogo from './BrandLogo';

interface ToolDetailProps {
  tool: Tool;
  onBack: () => void;
  onAskAI: () => void;
}

const ToolDetail: React.FC<ToolDetailProps> = ({ tool, onBack, onAskAI }) => {
  return (
    <div className="bg-transparent text-gray-900 min-h-screen">
      {/* Navigation */}
      <div className="flex justify-between items-center mb-12 py-4">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 font-semibold text-gray-700 transition-colors hover:text-yellow-700"
        >
          <span className="text-xl">←</span> Back to Hub
        </button>
        <BrandLogo className="text-[24px]" tone="dark" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-16">
          <header>
            <h1 className="text-5xl md:text-6xl font-extrabold mb-6 tracking-tight leading-tight text-gray-900">{tool.name}</h1>
            <p className="max-w-3xl text-xl font-medium leading-relaxed text-gray-800">
              {tool.longDescription || tool.description}
            </p>
          </header>

          {tool.usageInstructions && (
            <section className="md-card p-8 md:p-12">
              <h2 className="text-2xl font-bold mb-8 flex items-center gap-4 text-yellow-700">
                <span className="w-8 h-8 rounded-full bg-[#FFCC00]/25 flex items-center justify-center text-sm text-gray-900">1</span>
                Instructions & Guidance
              </h2>
              <p className="text-lg font-semibold text-gray-800 mb-8">{tool.usageInstructions}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {tool.blocks?.map((block, idx) => (
                  <div key={idx} className="p-6 bg-gray-50 rounded-2xl border border-[#D6D4CC] hover:border-yellow-300/60 transition-all">
                    <h4 className="text-yellow-700 font-bold mb-2 text-sm uppercase tracking-widest">{block.title}</h4>
                    <p className="text-gray-600 text-sm leading-relaxed">{block.detail}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {tool.exampleImage && (
            <section>
              <h2 className="text-2xl font-bold mb-8 flex items-center gap-4 text-yellow-700">
                <span className="w-8 h-8 rounded-full bg-[#FFCC00]/25 flex items-center justify-center text-sm text-gray-900">2</span>
                Template Visualization
              </h2>
              <div className="rounded-3xl overflow-hidden border border-[#D6D4CC] bg-white shadow-sm">
                <img 
                  src={tool.exampleImage} 
                  alt="Framework Example" 
                  className="w-full h-auto opacity-90 hover:opacity-100 transition-opacity" 
                />
              </div>
            </section>
          )}

          {tool.source && (
            <div className="p-8 bg-gray-50 rounded-2xl border border-[#D6D4CC] italic text-gray-500 text-sm">
              Source: {tool.source}
            </div>
          )}

          <CommentSection toolId={tool.id} />
        </div>

        {/* Sidebar - ซ่อนบนมือถือ แสดงเป็น FAB แทน */}
        <div className="hidden lg:block space-y-8">
          <div className="sticky top-8 space-y-8">
            <AIChatSidebar toolName={tool.name} />

            {(tool.templateUrl || (tool.additionalResources && tool.additionalResources.length > 0)) && (
              <div className="bg-[#FFCC00] p-8 rounded-3xl text-black shadow-md shadow-yellow-400/20">
                {tool.templateUrl && (
                  <>
                    <h3 className="text-2xl font-black mb-4 leading-tight">Professional Templates</h3>
                    <p className="font-medium mb-8 opacity-80">Download high-resolution assets and execution guides for this framework.</p>
                    <div className="space-y-4">
                      <a
                        href={tool.templateUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full bg-gray-900 text-white text-center font-bold py-4 rounded-xl hover:bg-gray-800 transition-all transform hover:-translate-y-1 shadow-lg"
                      >
                        Download PDF Template
                      </a>
                    </div>
                  </>
                )}

                {tool.additionalResources && tool.additionalResources.length > 0 && (
                  <div className={tool.templateUrl ? 'mt-8 pt-6 border-t border-black/10' : ''}>
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
            )}
          </div>
        </div>
      </div>

      {/* มือถือ: ไอคอนการ์ตูนผู้ช่วยแชท ลอยมุมขวาล่าง กดเปิดแชท */}
      <MobileAIChatFAB toolName={tool.name} />
    </div>
  );
};

export default ToolDetail;
