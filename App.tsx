
import React, { useState } from 'react';
import { JOURNEY_DATA, UPDATES_DATA } from './constants';
import { Tool, AppView } from './types';
import JourneyCard from './components/JourneyCard';
import UpdateCard from './components/UpdateCard';
import ToolDetail from './components/ToolDetail';
import AIChatModal from './components/AIChatModal';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.TOOLS);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

  const handleToolClick = (tool: Tool) => {
    setSelectedTool(tool);
    setView(AppView.TOOL_DETAIL);
    window.scrollTo(0, 0);
  };

  const renderContent = () => {
    switch (view) {
      case AppView.TOOLS:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {JOURNEY_DATA.map((category) => (
              <JourneyCard 
                key={category.id} 
                category={category} 
                onToolClick={handleToolClick}
              />
            ))}
          </div>
        );
      case AppView.UPDATES:
        return (
          <div className="flex flex-col gap-12 max-w-5xl mx-auto">
            {UPDATES_DATA.map((update) => (
              <UpdateCard key={update.id} update={update} />
            ))}
          </div>
        );
      case AppView.TOOL_DETAIL:
        return selectedTool ? (
          <ToolDetail 
            tool={selectedTool} 
            onBack={() => { setView(AppView.TOOLS); setSelectedTool(null); }} 
            onAskAI={() => setIsAIModalOpen(true)}
          />
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white bg-grid flex flex-col selection:bg-yellow-400 selection:text-black">
      {view !== AppView.TOOL_DETAIL && (
        <header className="pt-24 pb-16 px-6 relative">
          <div className="max-w-7xl mx-auto text-center relative z-10">
            <div className="flex justify-center mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center glow-yellow">
                  <span className="text-black font-black text-xl">M</span>
                </div>
                <span className="text-2xl font-bold tracking-tighter text-glow">MindDoJo</span>
              </div>
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight leading-tight">
              INNOVATION <span className="text-yellow-400">NEXUS</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-12">
              Explore our curated library of strategic frameworks and operational tools designed for modern organizational growth.
            </p>

            <div className="flex justify-center gap-4">
              <button 
                onClick={() => setView(AppView.TOOLS)}
                className={`px-8 py-3 rounded-xl font-bold transition-all ${
                  view === AppView.TOOLS 
                  ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20' 
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                Operational Tools
              </button>
              <button 
                onClick={() => setView(AppView.UPDATES)}
                className={`px-8 py-3 rounded-xl font-bold transition-all ${
                  view === AppView.UPDATES 
                  ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20' 
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                Industry Updates
              </button>
            </div>
          </div>
        </header>
      )}

      <main className={`flex-1 max-w-[1440px] mx-auto w-full px-6 pb-24 ${view === AppView.TOOL_DETAIL ? 'pt-8' : 'pt-12'}`}>
        {renderContent()}
      </main>

      <footer className="py-12 border-t border-white/5 bg-black/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-yellow-400 rounded flex items-center justify-center">
              <span className="text-black font-bold text-lg">M</span>
            </div>
            <span className="font-bold tracking-tight">MindDoJo</span>
          </div>
          <div className="text-gray-500 text-sm">
            © 2024 MindDoJo CO., LTD. All rights reserved.
          </div>
        </div>
      </footer>

      {selectedTool && isAIModalOpen && (
        <AIChatModal 
          toolName={selectedTool.name} 
          onClose={() => setIsAIModalOpen(false)} 
        />
      )}
    </div>
  );
};

export default App;
