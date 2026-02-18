
import React, { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

const STORAGE_PREFIX = 'minddojo_ai_chat_';

function getStorageKey(toolName: string): string {
  return STORAGE_PREFIX + toolName.replace(/\s+/g, '_');
}

function loadMessages(toolName: string): Message[] {
  try {
    const raw = localStorage.getItem(getStorageKey(toolName));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const ok = parsed.every(
      (m: unknown) => m && typeof m === 'object' && 'role' in m && 'text' in m
    );
    return ok ? (parsed as Message[]) : [];
  } catch {
    return [];
  }
}

function saveMessages(toolName: string, messages: Message[]) {
  try {
    localStorage.setItem(getStorageKey(toolName), JSON.stringify(messages));
  } catch {
    // ignore quota / private mode
  }
}

const defaultWelcome = (toolName: string): Message => ({
  role: 'assistant',
  text: `สวัสดีครับ! ผมคือผู้เชี่ยวชาญด้านนวัตกรรม มีอะไรอยากสอบถามเกี่ยวกับ ${toolName} ไหมครับ?`,
});

interface AIChatSidebarProps {
  toolName: string;
  /** ใช้ความสูงเต็ม (สำหรับแสดงในแผงมือถือ) */
  fillHeight?: boolean;
}

const AIChatSidebar: React.FC<AIChatSidebarProps> = ({ toolName, fillHeight }) => {
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = loadMessages(toolName);
    return saved.length > 0 ? saved : [defaultWelcome(toolName)];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    saveMessages(toolName, messages);
  }, [toolName, messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setLoading(true);

    try {
      const apiKey = process.env.API_KEY;
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { 
              role: 'system', 
              content: `คุณคือผู้เชี่ยวชาญด้านนวัตกรรมและเครื่องมือ ${toolName} ตอบคำถามของผู้ใช้อย่างมืออาชีพ กระชับ และเป็นกันเองในภาษาไทย` 
            },
            ...messages.map(m => ({ role: m.role, content: m.text })),
            { role: 'user', content: userMessage }
          ],
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      const aiText = data.choices[0].message.content;

      setMessages(prev => [...prev, { role: 'assistant', text: aiText || "ขออภัยครับ ผมไม่สามารถประมวลผลคำตอบได้ในขณะนี้" }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', text: "เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาตรวจสอบ API Key ของคุณ" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex flex-col bg-neutral-900 border border-white/10 overflow-hidden shadow-2xl ${fillHeight ? 'h-full min-h-0 rounded-none border-0' : 'h-[600px] rounded-[40px] border-white/10'}`}>
      <div className="p-6 bg-yellow-400 text-black flex items-center gap-3">
        <div className="w-8 h-8 bg-black text-yellow-400 rounded-full flex items-center justify-center font-black">AI</div>
        <h3 className="font-black uppercase tracking-tighter">AI Assistant: {toolName}</h3>
      </div>
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user' 
              ? 'bg-yellow-400 text-black font-bold rounded-tr-none' 
              : 'bg-white/5 text-gray-200 border border-white/10 rounded-tl-none shadow-sm'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl rounded-tl-none flex gap-1 items-center">
              <span className="text-[10px] text-yellow-400/50 mr-2 font-bold animate-pulse">Analyzing...</span>
              <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-bounce" />
              <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="p-4 bg-black/40 border-t border-white/5 flex gap-2">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="พิมพ์คำถามที่นี่..."
          className="flex-1 bg-neutral-800 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 text-white"
        />
        <button 
          type="submit"
          disabled={loading}
          className="bg-yellow-400 text-black w-12 h-12 rounded-xl flex items-center justify-center font-black hover:scale-105 transition-transform disabled:opacity-50"
        >
          →
        </button>
      </form>
    </div>
  );
};

export default AIChatSidebar;
