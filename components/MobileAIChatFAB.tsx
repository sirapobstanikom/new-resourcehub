import React, { useState } from 'react';
import AIChatSidebar from './AIChatSidebar';

interface MobileAIChatFABProps {
  toolName: string;
}

/** ไอคอนการ์ตูนผู้ช่วยแชท - ใบหน้ามิตร เห็นชัดบนปุ่มเหลือง */
const ChatAssistantIcon: React.FC<{ className?: string }> = ({ className = 'w-10 h-10' }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden
  >
    {/* หัวกลม - ใช้ currentColor ให้เป็นดำบนปุ่มเหลือง */}
    <circle cx="32" cy="32" r="26" stroke="currentColor" strokeWidth="2.5" fill="none" />
    {/* ตาซ้าย */}
    <circle cx="24" cy="28" r="4" fill="currentColor" />
    <circle cx="25" cy="27" r="1" fill="white" opacity="0.9" />
    {/* ตาขวา */}
    <circle cx="40" cy="28" r="4" fill="currentColor" />
    <circle cx="41" cy="27" r="1" fill="white" opacity="0.9" />
    {/* ปากยิ้ม */}
    <path
      d="M24 38 Q32 44 40 38"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      fill="none"
    />
    {/* ขนคิ้วเป็นมิตร */}
    <path d="M22 22 Q24 20 26 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <path d="M38 22 Q40 20 42 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
  </svg>
);

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
        <ChatAssistantIcon className="w-10 h-10" />
      </button>

      {/* แผงแชทเต็มจอเมื่อเปิด - เฉพาะมือถือ */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col bg-black">
          {/* Header พร้อมปุ่มปิด */}
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-yellow-400 text-black border-b border-yellow-500">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-black text-yellow-400 flex items-center justify-center">
                <ChatAssistantIcon className="w-5 h-5" />
              </div>
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
