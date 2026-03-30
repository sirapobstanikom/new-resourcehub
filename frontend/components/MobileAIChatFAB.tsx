import React, { useState } from 'react';
import AIChatSidebar from './AIChatSidebar';

interface MobileAIChatFABProps {
  toolName: string;
}

const MINDDOJO_CHATBOT_AVATAR_URL =
  'https://static.wixstatic.com/media/8f9517_2b5ddf78e35a4604a6eb0b28dde240af~mv2.jpg';

const MobileAIChatFAB: React.FC<MobileAIChatFABProps> = ({ toolName }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* ปุ่มลอย - แสดงเฉพาะมุมมองมือถือ */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 z-40 w-16 h-16 rounded-full bg-yellow-400 text-black shadow-lg shadow-yellow-400/30 border-2 border-yellow-500 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform focus:outline-none focus:ring-4 focus:ring-yellow-400/50"
        aria-label="เปิด AI Chat"
      >
        <img
          src={MINDDOJO_CHATBOT_AVATAR_URL}
          alt="AI"
          className="w-10 h-10 rounded-full object-cover ring-2 ring-black/20"
          loading="lazy"
          decoding="async"
        />
      </button>

      {/* แผงแชทเต็มจอเมื่อเปิด - เฉพาะมือถือ */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col bg-black">
          {/* Header พร้อมปุ่มปิด */}
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-yellow-400 text-black border-b border-yellow-500">
            <div className="flex items-center gap-2">
              <img
                src={MINDDOJO_CHATBOT_AVATAR_URL}
                alt="AI"
                className="w-8 h-8 rounded-full object-cover ring-2 ring-black/20"
                loading="lazy"
                decoding="async"
              />
              <span className="font-black text-sm uppercase tracking-tight">AI Assistant</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-full hover:bg-black/10 font-bold text-xl transition-colors"
              aria-label="ปิดแชท"
            >
              ✕
            </button>
          </div>
          {/* เนื้อที่แชท */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <AIChatSidebar toolName={toolName} fillHeight />
          </div>
        </div>
      )}
    </>
  );
};

export default MobileAIChatFAB;
