import React, { useState, useEffect, useCallback } from 'react';
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

/** เทมเพลตแสดงโพสต์ SIT ตามรูปแบบ worksheet (สร้างจากโค้ดเท่านั้น ไม่ใช้ภาพ) */
const SITPostTemplate: React.FC<{ blocks: SITParsedBlock[] }> = ({ blocks }) => {
  const [expanded, setExpanded] = useState(false);
  const order: string[] = ['Subtraction', 'Multiplication', 'Division', 'Task Unification', 'Attribute Dependency'];
  const displayed = order.filter((t) => blocks.some((b) => b.technique === t));
  const byTech = blocks.reduce<Record<string, SITParsedBlock>>((acc, b) => {
    acc[b.technique] = b;
    return acc;
  }, {});
  const hasMultiple = displayed.length > 1;
  const visibleTechs = hasMultiple && !expanded ? displayed.slice(0, 1) : displayed;
  const remainingCount = displayed.length - 1;

  return (
    <div className="bg-gradient-to-br from-amber-50 via-white to-amber-100 rounded-2xl overflow-hidden border border-amber-100 shadow-xl text-black">
      <div className="bg-amber-400/95 px-4 py-3 sm:py-4 text-center border-b border-amber-300/80">
        <p className="text-[11px] sm:text-xs font-semibold tracking-wide text-amber-950 uppercase">
          Systematic Inventive Thinking (SIT)
        </p>
        <p className="mt-1 text-sm sm:text-lg font-bold leading-snug text-amber-950">
          คุณใช้ SIT ปรับรูปแบบหรือกระบวนการอะไร
          <span className="hidden sm:inline"> ในงานของคุณ</span>
        </p>
        <p className="mt-1 text-[11px] sm:text-xs text-amber-950/90">
          เติมตัวอย่างจากงานจริงของคุณ เพื่อเก็บเป็นคลังกรณีศึกษาใน MindDojo
        </p>
      </div>
      <div className="bg-amber-200/90 px-3 sm:px-4 py-2 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 border-b border-amber-300/80">
        <div className="inline-flex items-center gap-1.5">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-red-600 border border-red-300" aria-hidden>
            !
          </span>
          <p className="text-[11px] sm:text-xs font-semibold text-amber-950">
            STEP 1:
          </p>
        </div>
        <p className="text-[11px] sm:text-xs text-amber-950">
          เลือกเทคนิค SIT อย่างน้อย 1 ตัว ที่คุณได้นำไปใช้กับงานจริงของคุณ
        </p>
      </div>
      <div className="p-3 sm:p-4 space-y-4">
        {visibleTechs.map((tech) => {
          const block = byTech[tech];
          const question = SIT_GUIDING_QUESTIONS[tech] || '';
          if (!block) return null;
          return (
            <div key={tech} className="border border-amber-200 rounded-xl overflow-hidden bg-white">
              <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr_1fr] gap-3 p-3 sm:p-4">
                <div className="flex items-start gap-2 sm:flex-col sm:items-center">
                  <div className="w-6 h-6 rounded border-2 border-amber-500 flex items-center justify-center flex-shrink-0 bg-amber-50">
                    <span className="text-amber-600 font-bold text-xs">✓</span>
                  </div>
                  <span className="font-bold text-amber-800 text-sm sm:text-base">{tech}</span>
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <p className="text-xs font-semibold text-amber-800/80">คำถามช่วยคิด (เพื่อโยงกับงานของคุณ)</p>
                  <p className="text-sm text-gray-700">{question}</p>
                </div>
              </div>
              <div className="px-3 sm:px-4 pb-3 sm:pb-4">
                <p className="text-xs font-semibold text-amber-800/80 mb-1">สถานการณ์และวิธีการแก้ไข (สิ่งที่คุณทำในงานของคุณ)</p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 min-h-[80px] text-sm text-gray-800 whitespace-pre-wrap">
                  <span className="font-medium text-amber-900/90">สถานการณ์:</span>
                  <br />
                  {block.situation || '—'}
                  <br />
                  <br />
                  <span className="font-medium text-amber-900/90">วิธีการแก้ไข:</span>
                  <br />
                  {block.solution || '—'}
                </div>
              </div>
            </div>
          );
        })}
        {hasMultiple && (
          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="text-sm font-medium text-amber-700 hover:text-amber-900 py-2 px-4 rounded-lg bg-amber-100 hover:bg-amber-200 transition-colors"
            >
              {expanded ? 'ย่อ' : `ดูเพิ่มเติม (อีก ${remainingCount} เทคนิค)`}
            </button>
          </div>
        )}
      </div>
      <div className="px-4 py-2 flex justify-end items-center gap-1 bg-amber-50/80 border-t border-amber-100">
        <span className="text-xs font-bold text-amber-800">MindDojo</span>
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
          <img src={post.authorAvatar} alt="Avatar" className="w-full h-full object-cover" />
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
                <img src={comment.authorAvatar} alt="Commenter" className="w-full h-full object-cover" />
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
              <img src={userAvatar} alt="My Avatar" className="w-full h-full object-cover" />
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
              <>
                <label className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-2 block">เลือกเทคนิคที่ต้องการ (กดแล้วเปลี่ยนสี = เลือกแล้ว)</label>
                <div className="flex flex-wrap gap-2 mb-4">
                  {SIT_TECHNIQUES.map((tech) => {
                    const isSelected = sitSlots.some((s) => s.technique === tech);
                    return (
                      <button
                        key={tech}
                        type="button"
                        onClick={() => handleSITTechniqueToggle(tech)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                          isSelected
                            ? 'bg-yellow-400 text-black border-yellow-400'
                            : 'bg-white/10 text-gray-400 border-white/10 hover:bg-white/15 hover:text-white'
                        }`}
                      >
                        {tech}
                      </button>
                    );
                  })}
                </div>
                {sitSlots.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">กรอก {sitSlots.length} เทคนิคที่เลือก</span>
                      <button
                        type="button"
                        onClick={() => setSitSlots([])}
                        className="text-xs text-yellow-400 hover:text-yellow-300 font-bold uppercase tracking-wider"
                      >
                        ล้างการเลือก
                      </button>
                    </div>
                    <div className="space-y-6">
                      {sitSlots.map((slot, index) => (
                        <div key={`${slot.technique}-${index}`} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                          <h4 className="text-sm font-bold text-yellow-400 uppercase tracking-wider">{slot.technique}</h4>
                          <div>
                            <label className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1 block">สถานการณ์</label>
                            <textarea
                              value={slot.situation}
                              onChange={(e) =>
                                setSitSlots((prev) => {
                                  const next = [...prev];
                                  next[index] = { ...next[index], situation: e.target.value };
                                  return next;
                                })
                              }
                              placeholder="อธิบายสถานการณ์หรือบริบท..."
                              disabled={!userName.trim()}
                              className="w-full bg-neutral-800 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 min-h-[80px] resize-none disabled:opacity-20 placeholder-gray-500"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1 block">วิธีการแก้ไข</label>
                            <textarea
                              value={slot.solution}
                              onChange={(e) =>
                                setSitSlots((prev) => {
                                  const next = [...prev];
                                  next[index] = { ...next[index], solution: e.target.value };
                                  return next;
                                })
                              }
                              placeholder="อธิบายแนวทางหรือวิธีการแก้ไข..."
                              disabled={!userName.trim()}
                              className="w-full bg-neutral-800 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 min-h-[80px] resize-none disabled:opacity-20 placeholder-gray-500"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-4">
                      <label className="cursor-pointer bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-gray-300 uppercase tracking-wider transition-colors disabled:opacity-50">
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
                      <div className="relative rounded-xl overflow-hidden border border-white/10 max-w-[220px] w-full mt-2">
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
                      disabled={
                        posting ||
                        !sitSlots.some((slot) => slot.situation.trim() && slot.solution.trim())
                      }
                      className="w-full md:w-auto mt-4 bg-yellow-400 text-black px-12 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-yellow-300 transition-all disabled:opacity-50 shadow-lg shadow-yellow-400/10"
                    >
                      {posting ? 'กำลังโพสต์...' : 'โพสต์'}
                    </button>
                  </>
                ) : null}
              </>
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
