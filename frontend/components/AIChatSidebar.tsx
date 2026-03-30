
import React, { useState, useRef, useEffect } from 'react';
import { supabaseFunctionsUrl, supabaseAnonKey } from '../lib/supabase';
import { openaiChatStream } from '../services/gemini';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

const STORAGE_PREFIX = 'minddojo_ai_chat_';
const MINDDOJO_CHATBOT_AVATAR_URL =
  'https://static.wixstatic.com/media/8f9517_2b5ddf78e35a4604a6eb0b28dde240af~mv2.jpg';

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

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
      (m: unknown) => m && typeof m === 'object' && 'id' in m && 'role' in m && 'text' in m
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
  id: uid(),
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
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isStreaming) return;
    saveMessages(toolName, messages);
  }, [toolName, messages, isStreaming]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    const userId = uid();
    const assistantId = uid();
    setMessages(prev => [
      ...prev,
      { id: userId, role: 'user', text: userMessage },
      { id: assistantId, role: 'assistant', text: '' },
    ]);
    setLoading(true);
    setIsStreaming(true);

    try {
      if (!supabaseFunctionsUrl || !supabaseAnonKey) {
        setMessages(prev =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  text: 'กรุณาตั้งค่า VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY ใน .env และ deploy ฟังก์ชัน openai-proxy พร้อมใส่ OPENAI_API_KEY ใน Supabase Secrets',
                }
              : m,
          ),
        );
        return;
      }
      const systemContent = `คุณคือผู้เชี่ยวชาญด้านนวัตกรรมและเครื่องมือ ${toolName} ตอบคำถามของผู้ใช้อย่างมืออาชีพ กระชับ และเป็นกันเองในภาษาไทย`;

      await openaiChatStream(
        [
          { role: 'system', content: systemContent },
          ...messages.map((m) => ({ role: m.role, content: m.text })),
          { role: 'user', content: userMessage },
        ],
        0.7,
        (delta) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, text: m.text + delta } : m)),
          );
        },
      );
    } catch (error) {
      setMessages(prev =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, text: 'เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาตรวจสอบ API Key ของคุณ' } : m,
        ),
      );
    } finally {
      setLoading(false);
      setIsStreaming(false);
    }
  };

  return (
    <div className={`flex flex-col bg-neutral-900 border border-white/10 overflow-hidden shadow-2xl ${fillHeight ? 'h-full min-h-0 rounded-none border-0' : 'h-[600px] rounded-[40px] border-white/10'}`}>
      <div className="p-6 bg-yellow-400 text-black flex items-center gap-3">
        <img
          src={MINDDOJO_CHATBOT_AVATAR_URL}
          alt="AI"
          className="w-10 h-10 rounded-full object-cover ring-2 ring-black/20 shadow-sm"
          loading="lazy"
          decoding="async"
        />
        <h3 className="font-black uppercase tracking-tighter">AI Assistant: {toolName}</h3>
      </div>
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
        {messages.map((msg) => (
          msg.role === 'assistant' ? (
            <div key={msg.id} className="flex w-full justify-start gap-3 items-start">
              <img
                src={MINDDOJO_CHATBOT_AVATAR_URL}
                alt="AI"
                className="w-8 h-8 rounded-full object-cover shrink-0 ring-2 ring-white/10 shadow-sm"
                loading="lazy"
                decoding="async"
              />
              <div className="max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed bg-white/5 text-gray-200 border border-white/10 rounded-tl-none shadow-sm">
                <div className="text-[11px] font-semibold text-gray-500 mb-1">AI</div>
                <div className="whitespace-pre-wrap break-words">{msg.text}</div>
              </div>
            </div>
          ) : (
            <div key={msg.id} className="flex w-full justify-end">
              <div className="max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed bg-yellow-400 text-black font-bold rounded-tr-none">
                <div className="text-[11px] font-semibold text-black/70 mb-1">คุณ</div>
                <div className="whitespace-pre-wrap break-words">{msg.text}</div>
              </div>
            </div>
          )
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
