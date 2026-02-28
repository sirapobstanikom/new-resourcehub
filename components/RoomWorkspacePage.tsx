import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const BMC_BLOCKS = [
  'Customer Segments',
  'Value Propositions',
  'Channels',
  'Customer Relationships',
  'Revenue Streams',
  'Key Resources',
  'Key Activities',
  'Key Partners',
  'Cost Structure',
];

const BOARD_TEMPLATES: { value: string; label: string }[] = [
  { value: 'bmc', label: 'Business Model Canvas (BMC)' },
  { value: 'lean_canvas', label: 'Lean Canvas' },
  { value: 'wild_ideas', label: 'Wild Ideas / Practical Solutions' },
  { value: 'blank', label: 'พื้นหลังว่าง' },
];

const STICKY_COLORS = [
  { name: 'yellow', hex: '#FEF08A' },
  { name: 'pink', hex: '#FBCFE8' },
  { name: 'blue', hex: '#BFDBFE' },
  { name: 'green', hex: '#BBF7D0' },
  { name: 'orange', hex: '#FED7AA' },
  { name: 'purple', hex: '#E9D5FF' },
];

type Room = { id: string; name: string; room_code: string };
type Board = { id: string; room_id: string; name: string; background_type: string; sort_order: number };
type Sticky = {
  id: string;
  board_id: string;
  content: string;
  x: number;
  y: number;
  color: string;
  width: number;
  height: number;
  author_name: string | null;
};

const RoomWorkspacePage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [room, setRoom] = useState<Room | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [currentBoardId, setCurrentBoardId] = useState<string | null>(null);
  const [stickies, setStickies] = useState<Sticky[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedColor, setSelectedColor] = useState(STICKY_COLORS[0].hex);
  const [addingSticky, setAddingSticky] = useState(false);
  const [newBoardOpen, setNewBoardOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardTemplate, setNewBoardTemplate] = useState('bmc');
  const [mobileBoardsOpen, setMobileBoardsOpen] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const lastDragPosRef = useRef<{ x: number; y: number } | null>(null);

  const currentBoard = boards.find((b) => b.id === currentBoardId);

  const fetchRoom = useCallback(async () => {
    if (!roomId || !isSupabaseConfigured) return;
    const { data, error: e } = await supabase
      .from('stickycloud_rooms')
      .select('id, name, room_code')
      .eq('id', roomId)
      .maybeSingle();
    if (e) {
      setError(e.message);
      setRoom(null);
      return;
    }
    setRoom(data as Room | null);
  }, [roomId]);

  const fetchBoards = useCallback(async () => {
    if (!roomId || !isSupabaseConfigured) return;
    const { data, error: e } = await supabase
      .from('stickycloud_boards')
      .select('id, room_id, name, background_type, sort_order')
      .eq('room_id', roomId)
      .order('sort_order', { ascending: true });
    if (e) return;
    const list = (data as Board[]) || [];
    setBoards(list);
    setCurrentBoardId((prev) => {
      if (list.length === 0) return null;
      if (prev && list.some((b) => b.id === prev)) return prev;
      return list[0].id;
    });
  }, [roomId]);

  const fetchStickies = useCallback(async () => {
    if (!currentBoardId || !isSupabaseConfigured) return;
    const { data, error: e } = await supabase
      .from('stickycloud_stickies')
      .select('id, board_id, content, x, y, color, width, height, author_name')
      .eq('board_id', currentBoardId)
      .order('created_at', { ascending: true });
    if (e) return;
    setStickies((data as Sticky[]) || []);
  }, [currentBoardId]);

  useEffect(() => {
    if (!roomId) {
      setLoading(false);
      setError('ไม่มี room');
      return;
    }
    setLoading(true);
    setError(null);
    fetchRoom().then(() => setLoading(false));
  }, [roomId, fetchRoom]);

  useEffect(() => {
    if (!roomId) return;
    fetchBoards();
  }, [roomId, fetchBoards]);

  useEffect(() => {
    if (!currentBoardId) return;
    fetchStickies();
    const channel = supabase
      .channel(`stickies-${currentBoardId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stickycloud_stickies', filter: `board_id=eq.${currentBoardId}` },
        () => { fetchStickies(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentBoardId, fetchStickies]);

  const handleAddSticky = useCallback(async () => {
    if (!currentBoardId || addingSticky) return;
    setAddingSticky(true);
    const { error: insertError } = await supabase
      .from('stickycloud_stickies')
      .insert({
        board_id: currentBoardId,
        content: 'ADD YOUR THOUGHT...',
        x: 80 + (stickies.length % 3) * 220,
        y: 80 + Math.floor(stickies.length / 3) * 140,
        color: selectedColor,
        width: 200,
        height: 120,
        author_name: 'ผู้ใช้',
      });
    setAddingSticky(false);
    if (!insertError) await fetchStickies();
  }, [currentBoardId, selectedColor, stickies.length, addingSticky, fetchStickies]);

  const handleCanvasDoubleClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    const el = canvasRef.current;
    if (!el || addingSticky || !currentBoardId) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left + el.scrollLeft;
    const y = e.clientY - rect.top + el.scrollTop;
    setAddingSticky(true);
    const { error: insertError } = await supabase
      .from('stickycloud_stickies')
      .insert({
        board_id: currentBoardId,
        content: 'ADD YOUR THOUGHT...',
        x: Math.max(0, x - 100),
        y: Math.max(0, y - 60),
        color: selectedColor,
        width: 200,
        height: 120,
        author_name: 'ผู้ใช้',
      });
    setAddingSticky(false);
    if (!insertError) await fetchStickies();
  };

  const handleNewBoard = async () => {
    const name = newBoardName.trim() || 'Board ใหม่';
    const { data } = await supabase
      .from('stickycloud_boards')
      .insert({
        room_id: roomId,
        name,
        background_type: newBoardTemplate,
        sort_order: boards.length,
      })
      .select('id')
      .single();
    if (data) {
      setNewBoardOpen(false);
      setNewBoardName('');
      setNewBoardTemplate('bmc');
      await fetchBoards();
      setCurrentBoardId((data as { id: string }).id);
    }
  };

  const onStickyMouseDown = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const s = stickies.find((x) => x.id === id);
    const el = canvasRef.current;
    if (!s || !el) return;
    const rect = el.getBoundingClientRect();
    const canvasX = e.clientX - rect.left + el.scrollLeft;
    const canvasY = e.clientY - rect.top + el.scrollTop;
    setDraggingId(id);
    setDragOffset({ x: canvasX - s.x, y: canvasY - s.y });
  };

  useEffect(() => {
    if (!draggingId) return;
    const el = canvasRef.current;
    const move = (e: MouseEvent) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const canvasX = e.clientX - rect.left + el.scrollLeft;
      const canvasY = e.clientY - rect.top + el.scrollTop;
      const newX = Math.max(0, canvasX - dragOffset.x);
      const newY = Math.max(0, canvasY - dragOffset.y);
      lastDragPosRef.current = { x: newX, y: newY };
      setStickies((prev) =>
        prev.map((s) => (s.id === draggingId ? { ...s, x: newX, y: newY } : s))
      );
    };
    const up = async () => {
      const id = draggingId;
      setDraggingId(null);
      if (!id) return;
      const pos = lastDragPosRef.current;
      if (pos) {
        await supabase.from('stickycloud_stickies').update({ x: pos.x, y: pos.y }).eq('id', id);
      }
      lastDragPosRef.current = null;
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, [draggingId, dragOffset]);

  const updateStickyContent = async (id: string, content: string) => {
    setStickies((prev) => prev.map((s) => (s.id === id ? { ...s, content } : s)));
    await supabase.from('stickycloud_stickies').update({ content }).eq('id', id);
  };

  const deleteSticky = async (id: string) => {
    if (!confirm('ลบโพสต์อิทนี้?')) return;
    await supabase.from('stickycloud_stickies').delete().eq('id', id);
    setStickies((prev) => prev.filter((s) => s.id !== id));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center animate-pulse">
            <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </div>
          <p className="text-slate-400 text-sm">กำลังโหลดห้อง...</p>
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col items-center justify-center gap-6 p-6">
        <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-red-300 text-center">{error || 'ไม่พบห้อง'}</p>
        <Link to="/room" className="px-5 py-2.5 rounded-xl font-medium bg-amber-400 text-slate-900 hover:bg-amber-300 transition shadow-lg shadow-amber-400/20">
          กลับไปใส่รหัสห้อง
        </Link>
      </div>
    );
  }

  const bgType = currentBoard?.background_type ?? 'blank';
  const isBmc = bgType === 'bmc';
  const isLean = bgType === 'lean_canvas';
  const isWildIdeas = bgType === 'wild_ideas';

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col selection:bg-amber-400 selection:text-slate-900 min-h-[100dvh]">
      {/* Header — โทรศัพท์: กดเมนูบอร์ด + ชื่อ/รหัส + Add Post-it */}
      <header className="shrink-0 flex items-center justify-between gap-2 px-3 py-3 sm:px-5 sm:py-3.5 bg-slate-800/90 border-b border-slate-700/50 backdrop-blur-sm" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setMobileBoardsOpen(true)}
            className="md:hidden flex items-center justify-center w-11 h-11 rounded-xl bg-slate-700/50 text-white hover:bg-slate-600/50 transition touch-manipulation"
            aria-label="เปิดเมนูบอร์ด"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/25 shrink-0">
              <span className="font-black text-slate-900 text-sm">WB</span>
            </div>
            <div className="min-w-0">
              <span className="font-semibold text-white truncate block text-sm sm:text-base">{room.name}</span>
              <span className="text-xs text-slate-400 font-mono hidden sm:inline">รหัส: {room.room_code}</span>
            </div>
          </div>
          <span className="hidden sm:inline-flex px-2.5 py-1 rounded-lg bg-slate-700/80 text-slate-300 text-xs font-mono border border-slate-600/50 shrink-0">
            {room.room_code}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link to="/room" className="hidden sm:inline text-sm text-slate-400 hover:text-white transition py-2">
            ออกจากห้อง
          </Link>
          <button
            type="button"
            onClick={handleAddSticky}
            disabled={addingSticky || !currentBoardId}
            className="flex items-center justify-center gap-1.5 min-h-[44px] min-w-[44px] px-3 py-2.5 sm:px-4 sm:gap-2 rounded-xl font-semibold bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900 hover:from-amber-300 hover:to-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-amber-500/25 touch-manipulation"
          >
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Add Post-it</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 relative">
        {/* Mobile overlay: บอร์ด */}
        {mobileBoardsOpen && (
          <>
            <div className="md:hidden fixed inset-0 bg-black/60 z-40" onClick={() => setMobileBoardsOpen(false)} aria-hidden />
            <aside className="md:hidden fixed top-0 left-0 bottom-0 w-[min(85vw,280px)] z-50 flex flex-col py-5 px-4 bg-slate-800 border-r border-slate-700 shadow-2xl" style={{ paddingLeft: 'max(1rem, env(safe-area-inset-left))', paddingTop: 'max(1rem, env(safe-area-inset-top))', paddingBottom: 'env(safe-area-inset-bottom)' }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Workshop Boards</h2>
                <button type="button" onClick={() => setMobileBoardsOpen(false)} className="w-10 h-10 rounded-xl text-slate-400 hover:bg-slate-700/50 hover:text-white flex items-center justify-center touch-manipulation" aria-label="ปิด">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto space-y-1">
                {boards.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => { setCurrentBoardId(b.id); setMobileBoardsOpen(false); }}
                    className={`w-full text-left px-3 py-3 rounded-xl text-sm font-medium transition-all touch-manipulation min-h-[48px] ${
                      currentBoardId === b.id ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' : 'text-slate-400 hover:bg-slate-700/50 hover:text-white border border-transparent'
                    }`}
                  >
                    {b.name}
                  </button>
                ))}
              </nav>
              <button
                type="button"
                onClick={() => { setNewBoardOpen(true); setMobileBoardsOpen(false); }}
                className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl border-2 border-dashed border-slate-600 text-slate-400 hover:border-amber-400/50 hover:text-amber-400 text-sm font-medium transition min-h-[48px] touch-manipulation"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                New Board
              </button>
            </aside>
          </>
        )}

        {/* Left: Boards (Desktop) */}
        <aside className="hidden md:flex w-60 shrink-0 border-r border-slate-700/50 bg-slate-800/50 flex-col py-5">
          <h2 className="px-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Workshop Boards</h2>
          <nav className="flex-1 overflow-y-auto px-3 space-y-1">
            {boards.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setCurrentBoardId(b.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  currentBoardId === b.id ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30 shadow-sm' : 'text-slate-400 hover:bg-slate-700/50 hover:text-white border border-transparent'
                }`}
              >
                {b.name}
              </button>
            ))}
          </nav>
          <button
            type="button"
            onClick={() => setNewBoardOpen(true)}
            className="mx-3 mt-3 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 border-dashed border-slate-600 text-slate-400 hover:border-amber-400/50 hover:text-amber-400 text-sm font-medium transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            New Board
          </button>
        </aside>

        {/* Main canvas */}
        <main
          ref={canvasRef}
          className="flex-1 overflow-auto min-h-0 bg-slate-800/30 pb-24 md:pb-0"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(148,163,184,0.15) 1px, transparent 0)',
            backgroundSize: '24px 24px',
            minHeight: 'calc(100dvh - 56px)',
          }}
        >
          <div
            className="relative min-w-full min-h-full"
            style={{
              width: isBmc || isLean || isWildIdeas ? 1200 : '100%',
              height: isBmc || isLean ? 800 : isWildIdeas ? 600 : '100%',
            }}
            onDoubleClick={handleCanvasDoubleClick}
          >
            {isBmc && (
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-px p-4 bg-slate-700/30 rounded-2xl m-4 border border-slate-600/30">
                {BMC_BLOCKS.map((title, i) => (
                  <div key={i} className="rounded-xl bg-slate-800/60 border border-slate-600/40 p-4 flex flex-col backdrop-blur-sm">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{title}</span>
                    <div className="flex-1 min-h-[60px]" />
                  </div>
                ))}
              </div>
            )}

            {isLean && (
              <div className="absolute inset-0 grid grid-cols-2 grid-rows-5 gap-px p-4 bg-slate-700/30 rounded-2xl m-4 border border-slate-600/30">
                {['Problem', 'Solution', 'Unique Value Proposition', 'Unfair Advantage', 'Customer Segments', 'Key Metrics', 'Channels', 'Early Adopters', 'Cost Structure', 'Revenue Streams'].map((t, i) => (
                  <div key={i} className="rounded-xl bg-slate-800/60 border border-slate-600/40 p-3 flex items-start">
                    <span className="text-xs text-slate-400">{t}</span>
                  </div>
                ))}
              </div>
            )}

            {isWildIdeas && (
              <div className="absolute inset-0 flex gap-6 p-8 m-4">
                <div className="flex-1 rounded-2xl border-2 border-slate-600/50 bg-slate-800/60 p-6 flex flex-col shadow-xl">
                  <h3 className="text-sm font-bold text-amber-400/90 uppercase tracking-widest mb-4">Wild Ideas</h3>
                  <div className="flex-1 min-h-[200px] rounded-xl bg-slate-900/30 border border-slate-700/50" />
                </div>
                <div className="flex-1 rounded-2xl border-2 border-slate-600/50 bg-slate-800/60 p-6 flex flex-col shadow-xl">
                  <h3 className="text-sm font-bold text-emerald-400/90 uppercase tracking-widest mb-4">Practical Solutions</h3>
                  <div className="flex-1 min-h-[200px] rounded-xl bg-slate-900/30 border border-slate-700/50" />
                </div>
              </div>
            )}

            {stickies.map((s) => (
              <div
                key={s.id}
                className="absolute rounded-xl overflow-hidden cursor-grab active:cursor-grabbing transition-shadow hover:shadow-xl"
                style={{
                  left: s.x,
                  top: s.y,
                  width: s.width,
                  height: s.height,
                  backgroundColor: s.color,
                  color: 'rgba(15,23,42,0.9)',
                  zIndex: draggingId === s.id ? 1000 : 1,
                  boxShadow: draggingId === s.id
                    ? '0 25px 50px -12px rgba(0,0,0,0.4)'
                    : '0 4px 6px -1px rgba(0,0,0,0.15), 0 2px 4px -2px rgba(0,0,0,0.1)',
                }}
                onMouseDown={(e) => onStickyMouseDown(e, s.id)}
              >
                <div className="p-3 h-full flex flex-col">
                  <textarea
                    className="flex-1 w-full min-h-[70px] resize-none bg-transparent border-none outline-none text-sm placeholder-slate-500 leading-relaxed"
                    value={s.content}
                    placeholder="เขียนความคิด..."
                    onChange={(e) => updateStickyContent(s.id, e.target.value)}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex justify-end mt-auto pt-2 border-t border-black/10">
                    <button
                      type="button"
                      className="text-xs text-slate-500 hover:text-red-600 transition px-2 py-1 rounded-md hover:bg-red-500/10"
                      onClick={(e) => { e.stopPropagation(); deleteSticky(s.id); }}
                    >
                      ลบ
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>

        {/* Right: Palette (Desktop) */}
        <aside className="hidden md:flex w-16 shrink-0 border-l border-slate-700/50 bg-slate-800/50 flex-col items-center py-6">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">สี</span>
          <div className="flex flex-col gap-3">
            {STICKY_COLORS.map((c) => (
              <button
                key={c.hex}
                type="button"
                onClick={() => setSelectedColor(c.hex)}
                className="w-9 h-9 rounded-xl transition-all ring-2 ring-offset-2 ring-offset-slate-800"
                style={{
                  backgroundColor: c.hex,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  ...(selectedColor === c.hex ? { ringColor: 'rgb(251 191 36)', transform: 'scale(1.1)' } : { ringColor: 'transparent' }),
                }}
                title={c.name}
              />
            ))}
          </div>
          <p className="mt-4 text-[10px] text-slate-500 text-center px-1">ดับเบิลคลิก<br />ที่ canvas เพิ่มโพสต์</p>
        </aside>
      </div>

      {/* Mobile: แถบสี + ออกจากห้อง ด้านล่าง */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-800/95 border-t border-slate-700/50 backdrop-blur-sm px-3 py-3" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 min-w-0">
            <span className="text-[10px] font-bold text-slate-500 uppercase shrink-0">สี:</span>
            {STICKY_COLORS.map((c) => (
              <button
                key={c.hex}
                type="button"
                onClick={() => setSelectedColor(c.hex)}
                className="w-10 h-10 rounded-xl shrink-0 transition-all ring-2 ring-offset-2 ring-offset-slate-800 touch-manipulation"
                style={{
                  backgroundColor: c.hex,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  ...(selectedColor === c.hex ? { ringColor: 'rgb(251 191 36)', transform: 'scale(1.08)' } : { ringColor: 'transparent' }),
                }}
                title={c.name}
              />
            ))}
          </div>
          <Link to="/room" className="shrink-0 text-sm text-slate-400 hover:text-white py-2 px-3 rounded-lg hover:bg-slate-700/50 touch-manipulation min-h-[44px] flex items-center">
            ออกจากห้อง
          </Link>
        </div>
        <p className="text-[10px] text-slate-500 mt-1.5 text-center">แตะสองครั้งที่ canvas เพื่อเพิ่มโพสต์</p>
      </div>

      {/* Modal: New Board */}
      {newBoardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4" onClick={() => setNewBoardOpen(false)}>
          <div className="bg-slate-800 rounded-2xl border border-slate-600/50 p-6 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-xl bg-amber-400/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">สร้าง Board ใหม่</h3>
            </div>
            <input
              type="text"
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              placeholder="ชื่อบอร์ด"
              className="w-full px-4 py-3 rounded-xl bg-slate-700/50 border border-slate-600 text-white placeholder-slate-500 focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/20 outline-none transition mb-4"
            />
            <label className="block text-sm font-medium text-slate-400 mb-2">Template</label>
            <select
              value={newBoardTemplate}
              onChange={(e) => setNewBoardTemplate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-700/50 border border-slate-600 text-white focus:border-amber-400/50 outline-none transition mb-6"
            >
              {BOARD_TEMPLATES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <div className="flex gap-3">
              <button type="button" onClick={() => setNewBoardOpen(false)} className="flex-1 py-3 rounded-xl border border-slate-600 text-slate-400 hover:bg-slate-700/50 font-medium transition">
                ยกเลิก
              </button>
              <button type="button" onClick={handleNewBoard} className="flex-1 py-3 rounded-xl bg-amber-400 text-slate-900 font-semibold hover:bg-amber-300 transition shadow-lg shadow-amber-500/20">
                สร้าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomWorkspacePage;
