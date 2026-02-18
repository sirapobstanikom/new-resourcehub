import React, { useState, useEffect, useCallback } from 'react';
import { Post, Comment } from '../types';
import { isSupabaseConfigured } from '../lib/supabase';
import { getPosts, createPost, addComment } from '../services/strategyExchange';

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

interface PostItemProps {
  post: Post;
  userAvatar: string;
  userName: string;
  onAddComment: (postId: string, commentText: string) => void;
}

const PostItem: React.FC<PostItemProps> = ({ post, userAvatar, userName, onAddComment }) => {
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');

  const handleReply = () => {
    if (!replyText.trim() || !userName.trim()) return;
    onAddComment(post.id, replyText);
    setReplyText('');
    setIsReplying(false);
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex gap-4">
        <div className="w-14 h-14 rounded-2xl flex-shrink-0 overflow-hidden bg-yellow-400 border-2 border-yellow-400/20">
          <img src={post.authorAvatar} alt="Avatar" className="w-full h-full object-cover" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-white">{post.authorName || 'Anonymous'}</h4>
            <span className="text-xs text-gray-500">
              {new Date(post.createdAt).toLocaleDateString()}
            </span>
          </div>
          <p className="text-gray-300 leading-relaxed mb-4">{post.content}</p>
          
          <button 
            onClick={() => setIsReplying(!isReplying)}
            className="text-xs font-bold text-yellow-400 hover:text-yellow-300 transition-colors uppercase tracking-widest"
          >
            {isReplying ? 'Cancel' : 'Reply'}
          </button>
        </div>
      </div>

      {post.comments && post.comments.length > 0 && (
        <div className="ml-12 space-y-4 border-l border-white/10 pl-6">
          {post.comments.map(comment => (
            <div key={comment.id} className="flex gap-4 animate-in fade-in slide-in-from-left-2">
              <div className="w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden bg-white/10 border border-white/10">
                <img src={comment.authorAvatar} alt="Commenter" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 bg-white/5 rounded-2xl p-4">
                <span className="text-xs font-bold text-white block mb-1">{comment.authorName}</span>
                <p className="text-gray-400 text-sm">{comment.commentText}</p>
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
  const [userName, setUserName] = useState(() => localStorage.getItem('minddojo_user') || '');
  const [userGender, setUserGender] = useState('female');
  const [userAvatar, setUserAvatar] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [mainInput, setMainInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);

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

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !mainInput.trim()) return;

    if (isSupabaseConfigured) {
      setPosting(true);
      try {
        const newPost = await createPost(toolId, {
          authorName: userName,
          authorAvatar: userAvatar,
          content: mainInput,
        });
        if (newPost) {
          setPosts((prev) => [newPost, ...prev]);
          setMainInput('');
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
      content: mainInput,
      createdAt: new Date().toISOString(),
      comments: [],
    };
    setPosts((prev) => [newPost, ...prev]);
    setMainInput('');
  };

  const handleAddComment = async (postId: string, commentText: string) => {
    if (isSupabaseConfigured) {
      const newComment = await addComment(postId, {
        authorName: userName,
        authorAvatar: userAvatar,
        commentText,
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
            
            <div className="relative">
              <label className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-2 block">แชร์ความคิดเห็น</label>
              <textarea 
                value={mainInput}
                onChange={(e) => setMainInput(e.target.value)}
                placeholder="Share a strategic insight or ask a question..."
                disabled={!userName.trim()}
                className="w-full bg-neutral-800 border border-white/10 rounded-2xl px-6 py-6 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 min-h-[120px] resize-none disabled:opacity-20 transition-all mb-4"
              />
              <button 
                onClick={handleCreatePost}
                disabled={!mainInput.trim() || posting}
                className="w-full md:w-auto bg-yellow-400 text-black px-12 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-yellow-300 transition-all disabled:opacity-50 shadow-lg shadow-yellow-400/10"
              >
                {posting ? 'Posting...' : 'Post Insight'}
              </button>
            </div>
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
              userAvatar={userAvatar} 
              userName={userName} 
              onAddComment={handleAddComment}
            />
          ))
        ) : (
          <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl text-gray-600 font-medium">
            ยังไม่มีการแลกเปลี่ยนข้อมูล เริ่มต้นโพสต์คนแรกได้เลย!
          </div>
        )}
      </div>
    </section>
  );
};

export default CommentSection;
