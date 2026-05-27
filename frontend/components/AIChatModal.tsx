
import React, { useState, useEffect } from 'react';
import { getToolInsights } from '../services/openai';

interface AIChatModalProps {
  toolName: string;
  onClose: () => void;
}

const MINDDOJO_CHATBOT_AVATAR_URL =
  'https://static.wixstatic.com/media/8f9517_2b5ddf78e35a4604a6eb0b28dde240af~mv2.jpg';

const AIChatModal: React.FC<AIChatModalProps> = ({ toolName, onClose }) => {
  const [insight, setInsight] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [context, setContext] = useState<string>("");

  const fetchInsight = async (userContext: string = "") => {
    setLoading(true);
    const result = await getToolInsights(toolName, userContext);
    setInsight(result || "No data returned.");
    setLoading(false);
  };

  useEffect(() => {
    fetchInsight();
  }, [toolName]);

  const handleContextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInsight(context);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-neutral-900 border border-yellow-400/30 rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
        {/* Header */}
        <div className="p-6 bg-yellow-400 flex justify-between items-center text-black">
          <div className="flex items-center gap-4 min-w-0">
            <img
              src={MINDDOJO_CHATBOT_AVATAR_URL}
              alt="AI"
              className="w-12 h-12 rounded-full object-cover ring-2 ring-black/20 shadow-sm shrink-0"
              loading="lazy"
              decoding="async"
            />
            <div className="min-w-0">
              <h2 className="text-2xl font-black uppercase tracking-tight truncate">AI Innovation Assistant</h2>
              <p className="text-sm font-semibold opacity-80 truncate">Guiding you through {toolName}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-black/10 rounded-full transition-colors font-bold text-xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-yellow-400 font-medium animate-pulse">Generating Expert Insights...</p>
            </div>
          ) : (
            <div className="prose prose-invert prose-yellow max-w-none">
              <div className="whitespace-pre-wrap break-words leading-relaxed text-gray-300">
                {insight}
              </div>
            </div>
          )}
        </div>

        {/* Footer Interaction */}
        <div className="p-6 border-t border-white/10 bg-black/40">
          <form onSubmit={handleContextSubmit} className="flex gap-3">
            <input 
              type="text" 
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Tell us about your project for personalized tips..."
              className="flex-1 bg-neutral-800 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-all text-white"
            />
            <button 
              type="submit"
              disabled={loading}
              className="bg-yellow-400 text-black px-6 py-3 rounded-lg font-bold hover:bg-yellow-300 transition-colors disabled:opacity-50"
            >
              Update
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AIChatModal;
