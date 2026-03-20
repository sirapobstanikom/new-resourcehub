import React, { useState, useEffect, useCallback } from 'react';
import { Check, MinusCircle, GitBranch, Link2, CopyPlus, SlidersHorizontal, Lightbulb } from 'lucide-react';
import { Post, Comment } from '../types';
import { isSupabaseConfigured } from '../lib/supabase';
import { getPosts, createPost, addComment, incrementPostLike } from '../services/strategyExchange';

// ปรับปรุงชุดข้อมูล Seeds ให้มีความชัดเจนของเพศชายและหญิงมากขึ้นสำหรับสไตล์ adventurer
const GENDER_OPTIONS = [
  { 
    label: 'ชาย', 
    value: 'male', 
    seeds: ['Jack', 'George', 'James', 'Robert', 'Thomas', 'Max', 'Felix', 'Jasper'] 
  },
  { 
    label: 'หญิง', 
    value: 'female', 
    seeds: ['Mia', 'Sophie', 'Emily', 'Sarah', 'Lily', 'Luna', 'Willow', 'Zoe'] 
  }
];

const getAvatarUrl = (seed: string) => {
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}&backgroundColor=facc15`;
};

const SIT_TECHNIQUES = [
  'Subtraction',
  'Task Unification',
  'Multiplication',
  'Division',
  'Attribute Dependency',
] as const;
type SITTechnique = (typeof SIT_TECHNIQUES)[number];

/** คำถามช่วยคิดต่อเทคนิค SIT (ตามเทมเพลต Systematic Inventive Thinking) */
const SIT_GUIDING_QUESTIONS: Record<string, string> = {
  'Subtraction': 'คุณจะยกเลิกหรือลดขั้นตอนใด 1 รายการในงาน เพื่อให้งานดำเนินการได้ง่ายและคล่องตัวขึ้น?',
  'Multiplication': 'คุณจะเพิ่มหรือขยายการทำสิ่งใด 1 อย่างที่ได้ผลดี เพื่อยกระดับผลลัพธ์ของงานให้ดีขึ้น?',
  'Division': 'คุณจะปรับการทำงานส่วนใด 1 จุด โดยแบ่งเป็นงานย่อยหรือจัดลำดับใหม่ เพื่อให้ดำเนินการได้รวดเร็วขึ้น?',
  'Task Unification': 'คุณจะเริ่มบูรณาการงาน 2 ส่วน หรือใช้ทรัพยากรเดียวให้ทำได้มากกว่าหนึ่งบทบาท?',
  'Attribute Dependency': 'ในรอบงานถัดไป คุณจะปรับวิธีดำเนินงานให้สอดคล้องกับเงื่อนไขใด 1 ประการ (เช่น เวลา ลูกค้า หรือระดับความเร่งด่วน) เพื่อเพิ่มประสิทธิภาพได้อย่างไร?',
};

const SIT_ITEMS: Array<{
  id: string;
  label: SITTechnique;
  icon: React.ComponentType<{ className?: string }>;
  prompt: string;
  placeholderSituation: string;
  placeholderSolution: string;
}> = [
  { id: 'subtraction', label: 'Subtraction', icon: MinusCircle, prompt: SIT_GUIDING_QUESTIONS['Subtraction'], placeholderSituation: 'อธิบายสถานการณ์หรือบริบท...', placeholderSolution: 'ตัวอย่าง: ตัดขั้นตอนการส่งอนุมัติซ้ำ 2 รอบ เหลือรอบเดียว พร้อมใช้ฟอร์มมาตรฐานกลาง' },
  { id: 'multiplication', label: 'Multiplication', icon: CopyPlus, prompt: SIT_GUIDING_QUESTIONS['Multiplication'], placeholderSituation: 'อธิบายสถานการณ์หรือบริบท...', placeholderSolution: 'ตัวอย่าง: เพิ่มการติดตามผลรายสัปดาห์จากเฉพาะโปรเจกต์ใหญ่ เป็นทุกโปรเจกต์ที่มีความเสี่ยง' },
  { id: 'division', label: 'Division', icon: GitBranch, prompt: SIT_GUIDING_QUESTIONS['Division'], placeholderSituation: 'อธิบายสถานการณ์หรือบริบท...', placeholderSolution: 'ตัวอย่าง: แยกงานเตรียมข้อมูล อนุมัติ และสรุปผล ออกเป็น 3 ขั้นตอนที่เจ้าของงานชัดเจน' },
  { id: 'task-unification', label: 'Task Unification', icon: Link2, prompt: SIT_GUIDING_QUESTIONS['Task Unification'], placeholderSituation: 'อธิบายสถานการณ์หรือบริบท...', placeholderSolution: 'ตัวอย่าง: ใช้แดชบอร์ดเดียวทั้งติดตาม KPI และสถานะงานแทนการแยกหลายไฟล์' },
  { id: 'attribute-dependency', label: 'Attribute Dependency', icon: SlidersHorizontal, prompt: SIT_GUIDING_QUESTIONS['Attribute Dependency'], placeholderSituation: 'อธิบายสถานการณ์หรือบริบท...', placeholderSolution: 'ตัวอย่าง: งานด่วนใช้ SLA 4 ชั่วโมง ส่วนงานทั่วไปใช้ SLA 24 ชั่วโมง พร้อมแจ้งเตือนอัตโนมัติ' },
];

const SIT_ID_TO_TECH: Record<string, SITTechnique> = Object.fromEntries(SIT_ITEMS.map((item) => [item.id, item.label]));
const SIT_TECH_TO_ID = Object.fromEntries(SIT_ITEMS.map((item) => [item.label, item.id])) as Record<SITTechnique, string>;

type SITParsedBlock = { technique: string; situation: string; solution: string };

function parseSITPostContent(content: string): SITParsedBlock[] | null {
  const blocks = content.split(/\n\n---\n\n/).map((b) => b.trim()).filter(Boolean);
  if (blocks.length === 0) return null;
  const result: SITParsedBlock[] = [];
  for (const block of blocks) {
    const titleMatch = block.match(/^【([^】]+)】/);
    if (!titleMatch) continue;
    const technique = titleMatch[1].trim();
    const sitIdx = block.indexOf('สถานการณ์:');
    const fixIdx = block.indexOf('วิธีการแก้ไข:');
    if (sitIdx === -1 || fixIdx === -1 || fixIdx <= sitIdx) continue;
    const situation = block.slice(sitIdx + 'สถานการณ์:'.length, fixIdx).replace(/^\s*\n+|\n+\s*$/g, '').trim();
    const solution = block.slice(fixIdx + 'วิธีการแก้ไข:'.length).replace(/^\s*\n+|\n+\s*$/g, '').trim();
    result.push({ technique, situation, solution });
  }
  return result.length > 0 ? result : null;
}

/** เทมเพลตแสดงโพสต์ SIT (โหมดแสดงผล) — ตาราง 3 คอลัมน์ จัดกลางเท่ากัน | 1 รายการแสดงแค่ 1, มากกว่านั้นมีปุ่มแสดงเพิ่มเติม */
const SITPostTemplate: React.FC<{ blocks: SITParsedBlock[] }> = ({ blocks }) => {
  const [expanded, setExpanded] = useState(false);
  const byTech = blocks.reduce((acc, b) => {
    acc[b.technique] = b;
    return acc;
  }, {} as Record<string, SITParsedBlock>);
  const displayedItems = SIT_ITEMS.filter((item) => byTech[item.label]);
  const hasMultiple = displayedItems.length > 1;
  const visibleItems = hasMultiple && !expanded ? displayedItems.slice(0, 1) : displayedItems;
  const remainingCount = displayedItems.length - 1;

  return (
    <div className="rounded-2xl overflow-hidden border border-black/10 bg-[#f5f5f5] text-[#1a1a1a] shadow-lg max-w-4xl mx-auto">
      <div className="p-4 sm:p-5 md:p-6">
        {/* Header — มือถือ: stack จัดกลาง */}
        <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-5">
          <div className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:justify-center sm:text-left gap-3 sm:gap-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-full bg-[#FFEB00] border-2 border-[#1a1a1a]/90 shadow-sm">
                <Lightbulb className="h-5 w-5 sm:h-7 sm:w-7 text-[#1a1a1a]" />
              </div>
              <h2 className="text-base sm:text-xl font-semibold text-black/90" style={{ fontFamily: "'Caveat', cursive" }}>
                Systematic Inventive Thinking Template
              </h2>
            </div>
            <div className="flex items-center justify-center sm:justify-start gap-2 w-full sm:w-auto">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-amber-500 bg-white text-amber-600">
                <Check className="h-3 w-3" strokeWidth={2.5} />
              </span>
              <span className="text-xs sm:text-sm font-medium text-black/70 text-left">
                เลือก SIT อย่างน้อย 1 ตัว ที่คุณได้นำเอาไปใช้ในการทำงานจริง
              </span>
            </div>
          </div>
          <div className="rounded-xl bg-[#FFEB00] border border-amber-400/60 px-3 py-3 sm:px-6 sm:py-4 text-center">
            <h3 className="text-sm sm:text-lg font-bold text-black/95 leading-snug">
              คุณใช้ SIT ปรับรูปแบบหรือกระบวนการอะไร ในงานของคุณ
            </h3>
          </div>
        </div>

        {/* หัวตาราง — มือถือ: ซ่อน (ใช้ใน card แทน) | เดสก์: แสดง 3 คอลัมน์ */}
        <div className="hidden md:block overflow-x-auto rounded-t-xl border border-black/10 border-b-0 bg-[#F3F3F3]">
          <div className="grid grid-cols-[1fr_1fr_1fr] gap-0 min-w-[320px]">
            <div className="px-3 py-3 sm:px-4 sm:py-4 text-center">
              <div className="text-xs sm:text-sm font-bold text-black/85">เลือก</div>
              <div className="text-[10px] sm:text-xs text-black/55 mt-0.5">( SIT )</div>
            </div>
            <div className="px-3 py-3 sm:px-4 sm:py-4 text-center border-l border-black/10">
              <div className="text-xs sm:text-sm font-bold text-black/85">คำถามช่วยคิด</div>
              <div className="text-[10px] sm:text-xs text-black/55 mt-0.5">( เพื่อโยงกับงานของคุณ )</div>
            </div>
            <div className="px-3 py-3 sm:px-4 sm:py-4 text-center border-l border-black/10">
              <div className="text-[10px] sm:text-xs font-bold text-black/85 leading-tight">สถานการณ์และวิธีการแก้ไข</div>
              <div className="text-[10px] sm:text-xs text-black/55 mt-0.5">( สิ่งที่คุณทำในงานของคุณ )</div>
            </div>
          </div>
        </div>

        {/* แถวข้อมูล — มือถือ: การ์ด stack | เดสก์: ตาราง 3 คอลัมน์ */}
        <div className="border border-black/10 md:border-t-0 rounded-b-xl md:rounded-t-none overflow-hidden bg-white min-w-0">
          {visibleItems.map((item) => {
            const block = byTech[item.label];
            if (!block) return null;
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="border-b border-dotted border-black/20 last:border-b-0"
              >
                {/* มือถือ: การ์ดแนวตั้ง */}
                <div className="md:hidden flex flex-col gap-0 p-4">
                  <div className="flex items-center justify-center gap-2 py-3 bg-[#fafafa] rounded-t-lg border border-black/5 border-b-0">
                    <span className="text-base font-semibold text-black/90" style={{ fontFamily: "'Caveat', cursive" }}>
                      {item.label}
                    </span>
                    <Icon className="h-5 w-5 text-black/50 shrink-0" />
                    <span className="flex h-9 w-9 items-center justify-center rounded border-2 border-amber-500 bg-amber-100 text-amber-700 shrink-0">
                      <Check className="h-5 w-5" strokeWidth={2.5} />
                    </span>
                  </div>
                  <div className="px-4 py-3 bg-[#f0f4f8] border-x border-black/5">
                    <p className="text-xs font-semibold text-black/60 uppercase tracking-wider mb-1">คำถามช่วยคิด</p>
                    <p className="text-sm leading-relaxed text-black/75">{item.prompt}</p>
                  </div>
                  <div className="px-4 py-3 bg-[#FFF9E1] rounded-b-lg border border-black/5 border-t-0">
                    <p className="text-xs font-semibold text-black/60 uppercase tracking-wider mb-1">สถานการณ์และวิธีการแก้ไข</p>
                    <div className="text-sm text-black/85 whitespace-pre-wrap leading-relaxed">
                      {block.situation ? (
                        <>
                          <span className="font-medium text-black/70">สถานการณ์:</span>
                          {'\n'}
                          {block.situation}
                        </>
                      ) : null}
                      {block.situation && block.solution ? '\n\n' : null}
                      {block.solution ? (
                        <>
                          <span className="font-medium text-black/70">วิธีการแก้ไข:</span>
                          {'\n'}
                          {block.solution}
                        </>
                      ) : null}
                      {!block.situation && !block.solution ? '—' : null}
                    </div>
                  </div>
                </div>
                {/* เดสก์: แถวตาราง 3 คอลัมน์ */}
                <div className="hidden md:grid md:grid-cols-[1fr_1fr_1fr] gap-0 min-w-[320px]">
                  <div className="flex items-center justify-center gap-2 px-3 py-4 sm:px-4 sm:py-5 bg-[#fafafa] border-r border-black/6 min-h-[88px]">
                    <span className="text-sm sm:text-base font-semibold text-black/90 text-center break-words" style={{ fontFamily: "'Caveat', cursive" }}>
                      {item.label}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Icon className="h-4 w-4 text-black/50" />
                      <span className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded border-2 border-amber-500 bg-amber-100 text-amber-700">
                        <Check className="h-4 w-4" strokeWidth={2.5} />
                      </span>
                    </div>
                  </div>
                  <div className="px-3 py-4 sm:px-4 sm:py-5 border-r border-black/6 bg-[#f0f4f8] min-h-[88px] flex flex-col justify-center">
                    <p className="text-xs sm:text-sm leading-relaxed text-black/75 text-center sm:text-left">{item.prompt}</p>
                  </div>
                  <div className="px-3 py-4 sm:px-4 sm:py-5 bg-[#FFF9E1] min-h-[88px] flex flex-col justify-center border-l border-black/5">
                    <div className="text-xs sm:text-sm text-black/85 whitespace-pre-wrap leading-relaxed">
                      {block.situation ? (
                        <>
                          <span className="font-medium text-black/70">สถานการณ์:</span>
                          {'\n'}
                          {block.situation}
                        </>
                      ) : null}
                      {block.situation && block.solution ? '\n\n' : null}
                      {block.solution ? (
                        <>
                          <span className="font-medium text-black/70">วิธีการแก้ไข:</span>
                          {'\n'}
                          {block.solution}
                        </>
                      ) : null}
                      {!block.situation && !block.solution ? '—' : null}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ปุ่มแสดงเพิ่มเติม / ย่อ — ขนาดกดง่ายบนมือถือ */}
        {hasMultiple && (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="min-h-[44px] min-w-[44px] rounded-xl border border-amber-400/80 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-900 shadow-sm active:bg-amber-100 transition-colors touch-manipulation"
            >
              {expanded ? 'ย่อ' : `แสดงเพิ่มเติม (อีก ${remainingCount} เทคนิค)`}
            </button>
          </div>
        )}

        <div className="mt-4 px-2 py-1.5 flex justify-end items-center gap-1 text-black/50">
          <span className="text-xs font-bold">MindDojo</span>
        </div>
      </div>
    </div>
  );
};

/** สติกเกอร์ให้เลือกใส่ในคอมเมนต์ (ทุกช่องตอบ) */
const COMMENT_STICKERS = ['👍', '❤️', '😂', '🔥', '👏', '💡', '✨', '🎯', '🙏', '⭐', '💪', '🙌', '👋', '😊', '🌟'];

const StickerBar: React.FC<{
  onSelect: (sticker: string) => void;
  className?: string;
}> = ({ onSelect, className = '' }) => (
  <div className={`flex items-center gap-1 flex-wrap ${className}`}>
    <span className="text-xs text-gray-400 mr-1">สติกเกอร์:</span>
    <div className="flex flex-wrap gap-1">
      {COMMENT_STICKERS.map((sticker) => (
        <button
          key={sticker}
          type="button"
          onClick={() => onSelect(sticker)}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-lg transition-colors"
          title="เพิ่มสติกเกอร์"
          aria-label={`เพิ่มสติกเกอร์ ${sticker}`}
        >
          {sticker}
        </button>
      ))}
    </div>
  </div>
);

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

/** Lightbox แสดงรูปเต็มหน้าจอ คลิกปิด */
const ImageLightbox: React.FC<{ src: string | null; onClose: () => void }> = ({ src, onClose }) => {
  if (!src) return null;
  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4"
      onClick={onClose}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      aria-label="ปิด"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white text-xl font-bold flex items-center justify-center"
        aria-label="ปิด"
      >
        ×
      </button>
      <img
        src={src}
        alt="ดูรูปเต็ม"
        className="max-w-full max-h-full w-auto h-auto object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
};

interface PostItemProps {
  post: Post;
  toolId?: string;
  userAvatar: string;
  userName: string;
  onAddComment: (postId: string, commentText: string, imageUrl?: string) => void;
  onImageClick?: (url: string) => void;
  onLike?: (postId: string) => void;
}

const PostItem: React.FC<PostItemProps> = ({ post, toolId, userAvatar, userName, onAddComment, onImageClick, onLike }) => {
  const sitParsed = toolId === 'systematic-inventive-thinking' ? parseSITPostContent(post.content) : null;
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyImageUrl, setReplyImageUrl] = useState('');
  const [replyImageFile, setReplyImageFile] = useState<File | null>(null);
  const [replyImagePreview, setReplyImagePreview] = useState('');

  const handleReplyImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setReplyImageFile(file);
      readFileAsDataUrl(file).then(setReplyImagePreview);
      setReplyImageUrl('');
    }
    e.target.value = '';
  };

  const handleReply = async () => {
    if (!replyText.trim() || !userName.trim()) return;
    let imageUrl = replyImageUrl.trim() || undefined;
    if (replyImageFile) {
      imageUrl = await readFileAsDataUrl(replyImageFile);
    }
    onAddComment(post.id, replyText, imageUrl);
    setReplyText('');
    setReplyImageUrl('');
    setReplyImageFile(null);
    setReplyImagePreview('');
    setIsReplying(false);
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex gap-4">
        <div className="w-14 h-14 rounded-2xl flex-shrink-0 overflow-hidden bg-yellow-400 border-2 border-yellow-400/20">
          {post.authorAvatar ? (
            <img src={post.authorAvatar} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-lg font-bold text-black/50" aria-hidden>?</div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-white">{post.authorName || 'Anonymous'}</h4>
            <span className="text-xs text-gray-500">
              {new Date(post.createdAt).toLocaleDateString()}
            </span>
          </div>
          {sitParsed ? (
            <div className="mb-4">
              <SITPostTemplate blocks={sitParsed} />
            </div>
          ) : (
            <p className="text-gray-300 leading-relaxed mb-2 whitespace-pre-wrap break-words">{post.content}</p>
          )}
          {post.imageUrl && (
            <div
              className="rounded-2xl overflow-hidden border border-white/10 mb-3 max-w-full w-full sm:max-w-md cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onImageClick?.(post.imageUrl!)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onImageClick?.(post.imageUrl!)}
            >
              <img src={post.imageUrl} alt="Post attachment คลิกดูเต็ม" className="w-full h-auto max-h-64 sm:max-h-72 object-contain bg-white/5" />
            </div>
          )}
          <div className="flex items-center gap-4 flex-wrap">
            {onLike && (
              <button
                type="button"
                onClick={() => onLike(post.id)}
                className="flex items-center gap-1.5 text-gray-400 hover:text-yellow-400 transition-colors"
                title="ไลค์"
              >
                <span className="text-lg" aria-hidden>♥</span>
                <span className="text-sm font-medium">{post.likeCount ?? 0}</span>
              </button>
            )}
            <button 
              onClick={() => setIsReplying(!isReplying)}
              className="text-xs font-bold text-yellow-400 hover:text-yellow-300 transition-colors uppercase tracking-widest"
            >
              {isReplying ? 'Cancel' : 'Reply'}
            </button>
          </div>
        </div>
      </div>

      {post.comments && post.comments.length > 0 && (
        <div className="ml-12 space-y-4 border-l border-white/10 pl-6">
          {post.comments.map(comment => (
            <div key={comment.id} className="flex gap-4 animate-in fade-in slide-in-from-left-2">
              <div className="w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden bg-white/10 border border-white/10">
                {comment.authorAvatar ? (
                  <img src={comment.authorAvatar} alt="Commenter" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white/50" aria-hidden>?</div>
                )}
              </div>
              <div className="flex-1 min-w-0 bg-white/5 rounded-2xl p-4">
                <span className="text-xs font-bold text-white block mb-1">{comment.authorName}</span>
                <p className="text-gray-400 text-sm">{comment.commentText}</p>
                {comment.imageUrl && (
                  <div
                    className={`mt-2 rounded-xl overflow-hidden border border-white/10 max-w-full w-full sm:max-w-[280px] ${onImageClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
                    onClick={onImageClick ? () => onImageClick(comment.imageUrl!) : undefined}
                    role={onImageClick ? 'button' : undefined}
                    tabIndex={onImageClick ? 0 : undefined}
                    onKeyDown={onImageClick ? (e) => e.key === 'Enter' && onImageClick(comment.imageUrl!) : undefined}
                  >
                    <img src={comment.imageUrl} alt="Comment attachment คลิกดูเต็ม" className="w-full h-auto max-h-44 sm:max-h-52 object-contain bg-white/5" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {isReplying && (
        <div className="ml-12 space-y-3 animate-in fade-in slide-in-from-top-2">
          <textarea 
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Type your reply..."
            className="w-full bg-neutral-800 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm min-h-[100px] resize-none"
          />
          <StickerBar onSelect={(sticker) => setReplyText((prev) => prev + sticker)} />
          <div className="flex flex-wrap items-center gap-2">
            <label className="cursor-pointer bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-gray-300 uppercase tracking-wider transition-colors">
              <input type="file" accept="image/*" className="hidden" onChange={handleReplyImageChange} />
              เพิ่มรูป
            </label>
            <input
              type="url"
              value={replyImageUrl}
              onChange={(e) => { setReplyImageUrl(e.target.value); setReplyImageFile(null); setReplyImagePreview(''); }}
              placeholder="หรือวางลิงก์รูป"
              className="flex-1 min-w-[160px] bg-neutral-800 border border-white/10 rounded-xl px-4 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>
          {replyImagePreview && (
            <div className="relative rounded-xl overflow-hidden border border-white/10 max-w-[200px] w-full">
              <img src={replyImagePreview} alt="Preview" className="w-full h-auto max-h-28 object-contain bg-white/5" />
              <button
                type="button"
                onClick={() => { setReplyImageFile(null); setReplyImagePreview(''); }}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white text-xs font-bold hover:bg-black"
              >
                ×
              </button>
            </div>
          )}
          <div className="flex justify-end">
            <button 
              onClick={handleReply}
              disabled={!replyText.trim()}
              className="bg-yellow-400 text-black px-6 py-2 rounded-xl font-bold text-xs uppercase tracking-widest disabled:opacity-50"
            >
              Post Reply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const CommentSection: React.FC<{ toolId?: string }> = ({ toolId = "bmc" }) => {
  const isSIT = toolId === 'systematic-inventive-thinking';
  const [userName, setUserName] = useState(() => localStorage.getItem('minddojo_user') || '');
  const [userGender, setUserGender] = useState('female');
  const [userAvatar, setUserAvatar] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [mainInput, setMainInput] = useState('');
  const [mainImageUrl, setMainImageUrl] = useState('');
  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [mainImagePreview, setMainImagePreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  // SIT: เลือกเทคนิคจากชื่อ (กดแล้วเปลี่ยนสี) แล้วแสดงช่องกรอกตามที่เลือก
  const [sitSlots, setSitSlots] = useState<Array<{ technique: SITTechnique; situation: string; solution: string }>>([]);

  const randomizeAvatar = (gender: string) => {
    const options = GENDER_OPTIONS.find(g => g.value === gender);
    if (options) {
      const randomSeed = options.seeds[Math.floor(Math.random() * options.seeds.length)] + Math.floor(Math.random() * 1000);
      const newAvatarUrl = getAvatarUrl(randomSeed);
      setUserAvatar(newAvatarUrl);
      localStorage.setItem('minddojo_avatar', newAvatarUrl);
    }
  };

  useEffect(() => {
    const savedAvatar = localStorage.getItem('minddojo_avatar');
    if (savedAvatar) {
      setUserAvatar(savedAvatar);
      // พยายามระบุเพศจาก avatar ที่เซฟไว้ (ถ้ามีใน seeds หญิง ให้เป็นหญิง)
      const isFemale = GENDER_OPTIONS[1].seeds.some(s => savedAvatar.includes(s));
      setUserGender(isFemale ? 'female' : 'male');
    } else {
      randomizeAvatar('female');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('minddojo_user', userName);
  }, [userName]);

  const loadPosts = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    try {
      const list = await getPosts(toolId);
      setPosts(list);
    } finally {
      setLoading(false);
    }
  }, [toolId]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handleGenderChange = (gender: string) => {
    setUserGender(gender);
    randomizeAvatar(gender);
  };

  const handleMainImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setMainImageFile(file);
      readFileAsDataUrl(file).then(setMainImagePreview);
      setMainImageUrl('');
    }
    e.target.value = '';
  };

  const handleSITTechniqueToggle = (tech: SITTechnique) => {
    setSitSlots((prev) => {
      const idx = prev.findIndex((s) => s.technique === tech);
      if (idx >= 0) {
        return prev.filter((_, i) => i !== idx);
      }
      return [...prev, { technique: tech, situation: '', solution: '' }];
    });
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    let contentToPost: string;
    if (isSIT) {
      const parts = sitSlots
        .filter((slot) => slot.situation.trim() && slot.solution.trim())
        .map(
          (slot) =>
            `【${slot.technique}】\n\nสถานการณ์:\n${slot.situation.trim()}\n\nวิธีการแก้ไข:\n${slot.solution.trim()}`
        );
      contentToPost = parts.join('\n\n---\n\n');
    } else {
      contentToPost = mainInput;
    }
    if (!userName.trim() || !contentToPost.trim()) return;

    let imageUrl: string | undefined = mainImageUrl.trim() || undefined;
    if (mainImageFile) {
      imageUrl = await readFileAsDataUrl(mainImageFile);
    }

    if (isSupabaseConfigured) {
      setPosting(true);
      try {
        const newPost = await createPost(toolId, {
          authorName: userName,
          authorAvatar: userAvatar,
          content: contentToPost,
          imageUrl,
        });
        if (newPost) {
          setPosts((prev) => [newPost, ...prev]);
          setMainInput('');
          setMainImageUrl('');
          setMainImageFile(null);
          setMainImagePreview('');
          if (isSIT) {
            setSitSlots((prev) =>
              prev.map((slot) =>
                slot.situation.trim() && slot.solution.trim()
                  ? { ...slot, situation: '', solution: '' }
                  : slot
              )
            );
          }
        }
      } finally {
        setPosting(false);
      }
      return;
    }

    const newPost: Post = {
      id: Date.now().toString(),
      authorName: userName,
      authorAvatar: userAvatar,
      content: contentToPost,
      imageUrl,
      createdAt: new Date().toISOString(),
      comments: [],
    };
    setPosts((prev) => [newPost, ...prev]);
    setMainInput('');
    setMainImageUrl('');
    setMainImageFile(null);
    setMainImagePreview('');
    if (isSIT) {
      setSitSlots((prev) =>
        prev.map((slot) =>
          slot.situation.trim() && slot.solution.trim() ? { ...slot, situation: '', solution: '' } : slot
        )
      );
    }
  };

  const handleImageClick = (url: string) => setLightboxSrc(url);

  const handleLike = useCallback(async (postId: string) => {
    if (!isSupabaseConfigured) {
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, likeCount: (p.likeCount ?? 0) + 1 } : p))
      );
      return;
    }
    const next = await incrementPostLike(postId);
    if (next != null) {
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, likeCount: next } : p))
      );
    }
  }, []);

  const handleAddComment = async (postId: string, commentText: string, imageUrl?: string) => {
    if (isSupabaseConfigured) {
      const newComment = await addComment(postId, {
        authorName: userName,
        authorAvatar: userAvatar,
        commentText,
        imageUrl,
      });
      if (newComment) {
        setPosts((prev) =>
          prev.map((post) =>
            post.id === postId
              ? { ...post, comments: [...post.comments, newComment] }
              : post
          )
        );
      }
      return;
    }
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id === postId) {
          const newComment: Comment = {
            id: Date.now().toString(),
            authorName: userName,
            authorAvatar: userAvatar,
            commentText,
            imageUrl,
            createdAt: new Date().toISOString(),
          };
          return { ...post, comments: [...post.comments, newComment] };
        }
        return post;
      })
    );
  };

  return (
    <section className="mt-24 border-t border-white/10 pt-16">
      <div className="mb-12">
        <h2 className="text-3xl font-bold mb-2">Strategy Exchange</h2>
        <p className="text-gray-500">Collaborate and share insights with other practitioners.</p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 mb-12">
        <div className="flex flex-col md:flex-row gap-8 items-start mb-8">
          <div className="flex flex-col items-center gap-4">
            <div
              className="w-24 h-24 rounded-3xl overflow-hidden bg-yellow-400 border-4 border-yellow-400/20 shadow-xl group relative cursor-pointer"
              onClick={() => randomizeAvatar(userGender)}
            >
              {userAvatar ? (
                <img src={userAvatar} alt="My Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-black/50" aria-hidden>?</div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <span className="text-[10px] font-bold text-white uppercase tracking-tighter">สุ่มใหม่</span>
              </div>
            </div>
            <div className="flex gap-2 p-1 bg-white/5 rounded-lg border border-white/10">
              {GENDER_OPTIONS.map(g => (
                <button
                  key={g.value}
                  onClick={() => handleGenderChange(g.value)}
                  className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest transition-all ${
                    userGender === g.value ? 'bg-yellow-400 text-black' : 'text-gray-500 hover:text-white'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 w-full space-y-4">
            <div>
              <label className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-2 block">ระบุชื่อของคุณ</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="ชื่อของคุณ..."
                className="w-full bg-neutral-800 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 font-bold"
              />
            </div>

            {isSIT ? (
              <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#f5f5f5] text-[#1a1a1a] shadow-lg -mx-1 sm:mx-0 px-1 sm:px-0">
                <div className="p-4 sm:p-6">
                  {/* Header — มือถือ: stack จัดกลาง */}
                  <div className="flex flex-col items-center text-center sm:items-start sm:text-left gap-3 sm:gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-full bg-[#FFEB00] border-2 border-[#1a1a1a]/90 shadow-sm">
                        <Lightbulb className="h-5 w-5 sm:h-7 sm:w-7 text-[#1a1a1a]" />
                      </div>
                      <h2 className="text-base sm:text-xl font-semibold text-black/90" style={{ fontFamily: "'Caveat', cursive" }}>
                        Systematic Inventive Thinking Template
                      </h2>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-start">
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border bg-white ${sitSlots.length > 0 ? 'border-amber-500 text-amber-600' : 'border-black/20 text-black/40'}`}>
                        {sitSlots.length > 0 ? <Check className="h-3 w-3" strokeWidth={2.5} /> : null}
                      </span>
                      <span className="text-xs sm:text-sm font-medium text-black/70">
                        เลือก SIT อย่างน้อย 1 ตัว ที่คุณได้นำเอาไปใช้ในการทำงานจริง
                      </span>
                    </div>
                    <div className="rounded-xl bg-[#FFEB00] border border-amber-400/60 px-3 py-3 sm:px-5 sm:py-4 w-full text-center">
                      <h3 className="text-sm sm:text-lg font-bold text-black/95 leading-snug">
                        คุณใช้ SIT ปรับรูปแบบหรือกระบวนการอะไร ในงานของคุณ
                      </h3>
                    </div>
                  </div>

                  {/* ปุ่มเลือกเทคนิค — มือถือ: ปุ่มใหญ่กดง่าย min-h-[44px] */}
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-black/60 uppercase tracking-wider mb-2">เลือกเทคนิคที่ต้องการ (กดแล้วเปลี่ยนสี = เลือกแล้ว)</p>
                    <div className="flex flex-wrap gap-2">
                      {SIT_ITEMS.map((item) => {
                        const Icon = item.icon;
                        const active = sitSlots.some((s) => s.technique === item.label);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleSITTechniqueToggle(item.label)}
                            className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3.5 min-h-[44px] text-sm font-semibold transition-all touch-manipulation active:scale-[0.98] ${
                              active
                                ? 'border-amber-400 bg-amber-50 text-amber-900 shadow-sm ring-1 ring-amber-200/60'
                                : 'border-black/15 bg-white text-black/70 hover:border-black/25 hover:bg-gray-50/80'
                            }`}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* แสดงช่องกรอกเฉพาะเทคนิคที่เลือกแล้ว */}
                  {sitSlots.length > 0 && (
                    <div className="space-y-4">
                      {sitSlots.map((slot, index) => {
                        const item = SIT_ITEMS.find((i) => i.label === slot.technique);
                        if (!item) return null;
                        return (
                          <div
                            key={`${slot.technique}-${index}`}
                            className="rounded-xl border border-black/10 bg-white p-4 sm:p-5 space-y-3"
                          >
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <h4 className="text-sm font-bold text-amber-800 uppercase tracking-wider flex items-center gap-2">
                                <span className="flex h-7 w-7 items-center justify-center rounded-lg border-2 border-amber-500 bg-amber-50 text-amber-700">
                                  <Check className="h-4 w-4" strokeWidth={2.5} />
                                </span>
                                {slot.technique}
                              </h4>
                              <button
                                type="button"
                                onClick={() => handleSITTechniqueToggle(slot.technique)}
                                className="min-h-[44px] min-w-[44px] py-2 px-3 -my-2 -mx-1 text-xs font-medium text-black/50 hover:text-red-600 underline touch-manipulation"
                              >
                                ยกเลิกเลือก
                              </button>
                            </div>
                            <p className="text-xs sm:text-sm text-black/75 leading-relaxed bg-[#fafafa] rounded-lg px-3 py-2 border border-black/5">
                              {item.prompt}
                            </p>
                            <div>
                              <label className="text-xs font-semibold text-black/60 uppercase tracking-wider mb-1 block">สถานการณ์</label>
                              <textarea
                                value={slot.situation}
                                onChange={(e) => {
                                  const i = sitSlots.findIndex((s) => s.technique === slot.technique);
                                  if (i < 0) return;
                                  setSitSlots((prev) => {
                                    const next = [...prev];
                                    next[i] = { ...next[i], situation: e.target.value };
                                    return next;
                                  });
                                }}
                                placeholder={item.placeholderSituation}
                                // ให้พิมพ์ได้เสมอ (ปุ่มโพสต์จะ disable เองตามเงื่อนไข)
                                disabled={posting}
                                className="min-h-[80px] w-full resize-y rounded-lg border border-amber-200/80 bg-white px-3 py-2.5 text-base sm:text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200/50 disabled:opacity-50 placeholder:text-black/35"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-black/60 uppercase tracking-wider mb-1 block">วิธีการแก้ไข</label>
                              <textarea
                                value={slot.solution}
                                onChange={(e) => {
                                  const i = sitSlots.findIndex((s) => s.technique === slot.technique);
                                  if (i < 0) return;
                                  setSitSlots((prev) => {
                                    const next = [...prev];
                                    next[i] = { ...next[i], solution: e.target.value };
                                    return next;
                                  });
                                }}
                                placeholder={item.placeholderSolution}
                                // ให้พิมพ์ได้เสมอ (ปุ่มโพสต์จะ disable เองตามเงื่อนไข)
                                disabled={posting}
                                className="min-h-[88px] w-full resize-y rounded-lg border border-amber-200/80 bg-white px-3 py-2.5 text-base sm:text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200/50 disabled:opacity-50 placeholder:text-black/35"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Actions — มือถือ: stack, ปุ่มใหญ่ touch-friendly */}
                  <div className="mt-4 flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2">
                      <label className="cursor-pointer rounded-lg border border-black/10 bg-white px-4 py-3 min-h-[44px] flex items-center justify-center text-xs font-semibold text-black/70 uppercase tracking-wider active:bg-black/5 transition-colors disabled:opacity-50 touch-manipulation">
                        <input type="file" accept="image/*" className="hidden" onChange={handleMainImageChange} disabled={!userName.trim()} />
                        เพิ่มรูป
                      </label>
                      <input
                        type="url"
                        value={mainImageUrl}
                        onChange={(e) => { setMainImageUrl(e.target.value); setMainImageFile(null); setMainImagePreview(''); }}
                        placeholder="หรือวางลิงก์รูป"
                        disabled={!userName.trim()}
                        className="flex-1 min-w-0 rounded-lg border border-black/10 bg-white px-3 py-3 text-base sm:text-sm text-black placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-amber-300/50 disabled:opacity-50 min-h-[44px]"
                      />
                      {mainImagePreview && (
                        <div className="relative max-w-full w-full sm:max-w-[180px] overflow-hidden rounded-lg border border-black/10">
                          <img src={mainImagePreview} alt="Preview" className="max-h-28 w-full object-contain bg-black/5" />
                          <button
                            type="button"
                            onClick={() => { setMainImageFile(null); setMainImagePreview(''); setMainImageUrl(''); }}
                            className="absolute top-1 right-1 h-8 w-8 rounded-full bg-black/70 text-white text-sm font-bold hover:bg-black flex items-center justify-center touch-manipulation"
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setSitSlots([])}
                        className="text-sm font-medium text-black/50 hover:text-black/70 underline py-2 min-h-[44px] flex items-center justify-center sm:justify-start touch-manipulation"
                      >
                        ล้าง
                      </button>
                      <button
                        onClick={handleCreatePost}
                        disabled={
                          posting ||
                          !sitSlots.some((slot) => slot.situation.trim() && slot.solution.trim())
                        }
                        className="w-full sm:w-auto bg-[#FFEB00] text-black px-6 py-3.5 min-h-[48px] rounded-xl font-bold text-sm uppercase tracking-wider shadow-md hover:bg-[#f5e000] active:scale-[0.98] transition-all disabled:opacity-50 touch-manipulation"
                      >
                        {posting ? 'กำลังโพสต์...' : 'โพสต์'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative">
                <label className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-2 block">แชร์ความคิดเห็น</label>
                <textarea
                  value={mainInput}
                  onChange={(e) => setMainInput(e.target.value)}
                  placeholder="Share a strategic insight or ask a question..."
                  disabled={!userName.trim()}
                  className="w-full bg-neutral-800 border border-white/10 rounded-2xl px-6 py-6 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 min-h-[120px] resize-none disabled:opacity-20 transition-all mb-3"
                />
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <label className="cursor-pointer bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-gray-300 uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <input type="file" accept="image/*" className="hidden" onChange={handleMainImageChange} disabled={!userName.trim()} />
                    เพิ่มรูป
                  </label>
                  <input
                    type="url"
                    value={mainImageUrl}
                    onChange={(e) => { setMainImageUrl(e.target.value); setMainImageFile(null); setMainImagePreview(''); }}
                    placeholder="หรือวางลิงก์รูป"
                    disabled={!userName.trim()}
                    className="flex-1 min-w-[180px] bg-neutral-800 border border-white/10 rounded-xl px-4 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-50"
                  />
                </div>
                {mainImagePreview && (
                  <div className="relative rounded-xl overflow-hidden border border-white/10 max-w-[220px] w-full mb-3">
                    <img src={mainImagePreview} alt="Preview" className="w-full h-auto max-h-36 object-contain bg-white/5" />
                    <button
                      type="button"
                      onClick={() => { setMainImageFile(null); setMainImagePreview(''); setMainImageUrl(''); }}
                      className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/70 text-white text-sm font-bold hover:bg-black"
                    >
                      ×
                    </button>
                  </div>
                )}
                <button
                  onClick={handleCreatePost}
                  disabled={!mainInput.trim() || posting}
                  className="w-full md:w-auto bg-yellow-400 text-black px-12 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-yellow-300 transition-all disabled:opacity-50 shadow-lg shadow-yellow-400/10"
                >
                  {posting ? 'Posting...' : 'Post Insight'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {loading ? (
          <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl text-gray-500 font-medium">
            กำลังโหลด...
          </div>
        ) : posts.length > 0 ? (
          posts.map((post) => (
<PostItem
              key={post.id}
              post={post}
              toolId={toolId}
              userAvatar={userAvatar}
              userName={userName}
              onAddComment={handleAddComment}
              onImageClick={handleImageClick}
              onLike={handleLike}
            />
          ))
        ) : (
          <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl text-gray-600 font-medium">
            ยังไม่มีการแลกเปลี่ยนข้อมูล เริ่มต้นโพสต์คนแรกได้เลย!
          </div>
        )}
      </div>

      <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </section>
  );
};

export default CommentSection;
