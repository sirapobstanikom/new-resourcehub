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

const DEFAULT_STICKY_WIDTH = 280;
const DEFAULT_STICKY_HEIGHT = 200;
const MIN_STICKY_WIDTH = 160;
const MIN_STICKY_HEIGHT = 100;
const MAX_STICKY_WIDTH = 480;
const MAX_STICKY_HEIGHT = 400;

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
  const [resizingId, setResizingId] = useState<string | null>(null);
  type ResizeCorner = 'nw' | 'ne' | 'sw' | 'se';
  const resizeStartRef = useRef<{ id: string; x: number; y: number; w: number; h: number; clientX: number; clientY: number; corner: ResizeCorner } | null>(null);
  const lastRectRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const lastDragPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const DOUBLE_TAP_MS = 400;
  const DOUBLE_TAP_MAX_DIST = 50;

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
        content: '',
        x: 80 + (stickies.length % 3) * (DEFAULT_STICKY_WIDTH + 24),
        y: 80 + Math.floor(stickies.length / 3) * (DEFAULT_STICKY_HEIGHT + 24),
        color: selectedColor,
        width: DEFAULT_STICKY_WIDTH,
        height: DEFAULT_STICKY_HEIGHT,
        author_name: 'ผู้ใช้',
      });
    setAddingSticky(false);
    if (!insertError) await fetchStickies();
  }, [currentBoardId, selectedColor, stickies.length, addingSticky, fetchStickies]);

  const addStickyAt = useCallback(
    async (clientX: number, clientY: number) => {
      const el = canvasRef.current;
      if (!el || addingSticky || !currentBoardId) return;
      const rect = el.getBoundingClientRect();
      const x = clientX - rect.left + el.scrollLeft;
      const y = clientY - rect.top + el.scrollTop;
      setAddingSticky(true);
      const { error: insertError } = await supabase
        .from('stickycloud_stickies')
        .insert({
          board_id: currentBoardId,
          content: '',
          x: Math.max(0, x - DEFAULT_STICKY_WIDTH / 2),
          y: Math.max(0, y - DEFAULT_STICKY_HEIGHT / 2),
          color: selectedColor,
          width: DEFAULT_STICKY_WIDTH,
          height: DEFAULT_STICKY_HEIGHT,
          author_name: 'ผู้ใช้',
        });
      setAddingSticky(false);
      if (!insertError) await fetchStickies();
    },
    [currentBoardId, selectedColor, addingSticky, fetchStickies]
  );

  const handleCanvasDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-sticky-id]')) return;
    addStickyAt(e.clientX, e.clientY);
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

  const getCanvasPoint = useCallback((clientX: number, clientY: number) => {
    const el = canvasRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {
      x: clientX - rect.left + el.scrollLeft,
      y: clientY - rect.top + el.scrollTop,
    };
  }, []);

  const startDrag = useCallback((id: string, clientX: number, clientY: number) => {
    const s = stickies.find((x) => x.id === id);
    const pt = getCanvasPoint(clientX, clientY);
    if (!s || !pt) return;
    setDraggingId(id);
    setDragOffset({ x: pt.x - s.x, y: pt.y - s.y });
  }, [stickies, getCanvasPoint]);

  const onStickyMouseDown = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    startDrag(id, e.clientX, e.clientY);
  };

  const onStickyTouchStart = (e: React.TouchEvent, id: string) => {
    const t = e.touches[0];
    if (!t) return;
    startDrag(id, t.clientX, t.clientY);
  };

  useEffect(() => {
    if (!draggingId) return;
    const el = canvasRef.current;
    const updatePos = (clientX: number, clientY: number) => {
      if (!el) return;
      const pt = getCanvasPoint(clientX, clientY);
      if (!pt) return;
      const newX = Math.max(0, pt.x - dragOffset.x);
      const newY = Math.max(0, pt.y - dragOffset.y);
      lastDragPosRef.current = { x: newX, y: newY };
      setStickies((prev) =>
        prev.map((s) => (s.id === draggingId ? { ...s, x: newX, y: newY } : s))
      );
    };
    const move = (e: MouseEvent) => updatePos(e.clientX, e.clientY);
    const touchMove = (e: TouchEvent) => {
      if (e.touches.length) {
        e.preventDefault();
        updatePos(e.touches[0].clientX, e.touches[0].clientY);
      }
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
    const touchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) up();
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', touchMove, { passive: false });
    window.addEventListener('touchend', touchEnd);
    window.addEventListener('touchcancel', touchEnd);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', touchMove);
      window.removeEventListener('touchend', touchEnd);
      window.removeEventListener('touchcancel', touchEnd);
    };
  }, [draggingId, dragOffset, getCanvasPoint]);

  const startResize = useCallback((id: string, clientX: number, clientY: number, corner: ResizeCorner) => {
    const s = stickies.find((x) => x.id === id);
    if (!s) return;
    setResizingId(id);
    resizeStartRef.current = { id, x: s.x, y: s.y, w: s.width, h: s.height, clientX, clientY, corner };
  }, [stickies]);

  const onResizeMouseDown = (e: React.MouseEvent, id: string, corner: ResizeCorner) => {
    e.preventDefault();
    e.stopPropagation();
    startResize(id, e.clientX, e.clientY, corner);
  };

  const onResizeTouchStart = (e: React.TouchEvent, id: string, corner: ResizeCorner) => {
    const t = e.touches[0];
    if (!t) return;
    startResize(id, t.clientX, t.clientY, corner);
  };

  useEffect(() => {
    if (!resizingId || !resizeStartRef.current) return;
    const start = resizeStartRef.current;
    const updateRect = (clientX: number, clientY: number) => {
      const dx = clientX - start.clientX;
      const dy = clientY - start.clientY;
      let newX = start.x, newY = start.y, newW = start.w, newH = start.h;
      switch (start.corner) {
        case 'se':
          newW = Math.min(MAX_STICKY_WIDTH, Math.max(MIN_STICKY_WIDTH, start.w + dx));
          newH = Math.min(MAX_STICKY_HEIGHT, Math.max(MIN_STICKY_HEIGHT, start.h + dy));
          break;
        case 'sw':
          newX = start.x + dx;
          newW = Math.min(MAX_STICKY_WIDTH, Math.max(MIN_STICKY_WIDTH, start.w - dx));
          newH = Math.min(MAX_STICKY_HEIGHT, Math.max(MIN_STICKY_HEIGHT, start.h + dy));
          if (newW <= MIN_STICKY_WIDTH) { newX = start.x + start.w - MIN_STICKY_WIDTH; newW = MIN_STICKY_WIDTH; }
          break;
        case 'ne':
          newY = start.y + dy;
          newW = Math.min(MAX_STICKY_WIDTH, Math.max(MIN_STICKY_WIDTH, start.w + dx));
          newH = Math.min(MAX_STICKY_HEIGHT, Math.max(MIN_STICKY_HEIGHT, start.h - dy));
          if (newH <= MIN_STICKY_HEIGHT) { newY = start.y + start.h - MIN_STICKY_HEIGHT; newH = MIN_STICKY_HEIGHT; }
          break;
        case 'nw':
          newX = start.x + dx;
          newY = start.y + dy;
          newW = Math.min(MAX_STICKY_WIDTH, Math.max(MIN_STICKY_WIDTH, start.w - dx));
          newH = Math.min(MAX_STICKY_HEIGHT, Math.max(MIN_STICKY_HEIGHT, start.h - dy));
          if (newW <= MIN_STICKY_WIDTH) { newX = start.x + start.w - MIN_STICKY_WIDTH; newW = MIN_STICKY_WIDTH; }
          if (newH <= MIN_STICKY_HEIGHT) { newY = start.y + start.h - MIN_STICKY_HEIGHT; newH = MIN_STICKY_HEIGHT; }
          break;
      }
      newX = Math.max(0, newX);
      newY = Math.max(0, newY);
      lastRectRef.current = { x: newX, y: newY, w: newW, h: newH };
      setStickies((prev) =>
        prev.map((s) => (s.id === resizingId ? { ...s, x: newX, y: newY, width: newW, height: newH } : s))
      );
      resizeStartRef.current = { ...start, x: newX, y: newY, w: newW, h: newH, clientX, clientY };
    };
    const move = (e: MouseEvent) => updateRect(e.clientX, e.clientY);
    const touchMove = (e: TouchEvent) => {
      if (e.touches.length) {
        e.preventDefault();
        updateRect(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const up = async () => {
      const id = resizingId;
      setResizingId(null);
      const r = lastRectRef.current;
      if (id && r) {
        await supabase.from('stickycloud_stickies').update({ x: r.x, y: r.y, width: r.w, height: r.h }).eq('id', id);
      }
      resizeStartRef.current = null;
      lastRectRef.current = null;
    };
    const touchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) up();
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', touchMove, { passive: false });
    window.addEventListener('touchend', touchEnd);
    window.addEventListener('touchcancel', touchEnd);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', touchMove);
      window.removeEventListener('touchend', touchEnd);
      window.removeEventListener('touchcancel', touchEnd);
    };
  }, [resizingId]);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onTouchEnd = (e: TouchEvent) => {
      if ((e.target as HTMLElement).closest?.('[data-sticky-id]')) return;
      const t = e.changedTouches?.[0];
      if (!t) return;
      const x = t.clientX;
      const y = t.clientY;
      const now = Date.now();
      const last = lastTapRef.current;
      if (last && now - last.time < DOUBLE_TAP_MS) {
        const dist = Math.hypot(x - last.x, y - last.y);
        if (dist < DOUBLE_TAP_MAX_DIST) {
          e.preventDefault();
          lastTapRef.current = null;
          addStickyAt(x, y);
          return;
        }
      }
      lastTapRef.current = { time: now, x, y };
    };
    el.addEventListener('touchend', onTouchEnd, { passive: false, capture: true });
    return () => el.removeEventListener('touchend', onTouchEnd, { capture: true });
  }, [addStickyAt, loading]);

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
                data-sticky-id={s.id}
                className="absolute rounded-xl overflow-hidden transition-shadow hover:shadow-xl select-none"
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
                  touchAction: draggingId === s.id ? 'none' : 'auto',
                }}
              >
                {/* แถบจับลาก — ลากจากตรงนี้ได้ทั้งเมาส์และมือถือ */}
                <div
                  data-drag-handle
                  className="w-full h-8 shrink-0 flex items-center justify-center cursor-grab active:cursor-grabbing touch-manipulation border-b border-black/10 bg-black/5"
                  onMouseDown={(e) => onStickyMouseDown(e, s.id)}
                  onTouchStart={(e) => onStickyTouchStart(e, s.id)}
                  title="ลากเพื่อย้าย"
                >
                  <span className="w-8 h-1 rounded-full bg-black/20" aria-hidden />
                </div>
                <div className="p-3 flex-1 flex flex-col min-h-0">
                  <textarea
                    className="flex-1 w-full min-h-[60px] resize-none bg-transparent border-none outline-none text-sm placeholder-slate-500 leading-relaxed touch-manipulation select-text"
                    value={s.content}
                    placeholder="เขียนความคิด"
                    onChange={(e) => updateStickyContent(s.id, e.target.value)}
                  />
                  <div className="flex justify-end items-center gap-1 mt-auto pt-2 border-t border-black/10">
                    <button
                      type="button"
                      className="text-xs text-slate-500 hover:text-red-600 transition px-2 py-1.5 rounded-md hover:bg-red-500/10 touch-manipulation min-h-[32px]"
                      onClick={(e) => { e.stopPropagation(); deleteSticky(s.id); }}
                    >
                      ลบ
                    </button>
                  </div>
                </div>
                {/* 4 มุม: จับลากเพื่อปรับขนาด */}
                {(['nw', 'ne', 'sw', 'se'] as const).map((corner) => {
                  const cursor = { nw: 'nw-resize', ne: 'ne-resize', sw: 'sw-resize', se: 'se-resize' }[corner];
                  const pos = {
                    nw: 'top-0 left-0 items-start justify-start rounded-br-lg',
                    ne: 'top-0 right-0 items-start justify-end rounded-bl-lg',
                    sw: 'bottom-0 left-0 items-end justify-start rounded-tr-lg',
                    se: 'bottom-0 right-0 items-end justify-end rounded-tl-lg',
                  }[corner];
                  return (
                    <div
                      key={corner}
                      data-resize-handle
                      className={`absolute w-10 h-10 flex p-1 touch-manipulation ${pos}`}
                      style={{ touchAction: 'none', cursor } as React.CSSProperties}
                      onMouseDown={(e) => onResizeMouseDown(e, s.id, corner)}
                      onTouchStart={(e) => onResizeTouchStart(e, s.id, corner)}
                      title="ลากเพื่อปรับขนาด"
                    >
                      <svg className="w-5 h-5 text-black/30 pointer-events-none shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M8 8l4 4 4-4M8 16l4-4 4 4" />
                      </svg>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </main>

        {/* Right: เลือกสีโพสต์อิท / สติกเกอร์ (Desktop) */}
        <aside className="hidden md:flex w-52 shrink-0 border-l border-slate-700/50 bg-slate-800/50 flex-col p-4">
          <div className="rounded-xl bg-slate-700/40 border border-slate-600/50 p-4">
            <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-400/20">
                <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
              </span>
              เลือกสีโพสต์อิท
            </h3>
            <p className="text-xs text-slate-400 mb-3">กดเลือกสี แล้วกด Add Post-it หรือดับเบิลคลิกที่ canvas</p>
            <div className="grid grid-cols-2 gap-2">
              {STICKY_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setSelectedColor(c.hex)}
                  className="flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all touch-manipulation text-left"
                  style={{
                    backgroundColor: `${c.hex}22`,
                    borderColor: selectedColor === c.hex ? 'rgb(251 191 36)' : 'rgba(0,0,0,0.1)',
                    boxShadow: selectedColor === c.hex ? '0 0 0 1px rgb(251 191 36)' : 'none',
                  }}
                  title={c.name}
                >
                  <span className="w-8 h-8 rounded-lg shrink-0 shadow-md" style={{ backgroundColor: c.hex }} />
                  <span className="text-sm font-medium text-slate-200 capitalize truncate">{c.name}</span>
                </button>
              ))}
            </div>
          </div>
          <p className="mt-3 text-[10px] text-slate-500 px-1">ดับเบิลคลิกที่ canvas เพื่อเพิ่มโพสต์</p>
        </aside>
      </div>

      {/* Mobile: ปุ่มเลือกสติกเกอร์ + แถบสี */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-800/98 border-t border-slate-700/50 backdrop-blur-sm" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <div className="px-3 pt-3">
          <button
            type="button"
            onClick={() => setPaletteOpen((o) => !o)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-400/20 border-2 border-amber-400/40 text-amber-300 font-semibold touch-manipulation"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
            {paletteOpen ? 'ปิดการเลือกสติกเกอร์' : 'เลือกสติกเกอร์ (สีโพสต์อิท)'}
          </button>
        </div>
        {paletteOpen && (
          <div className="px-3 py-3 border-t border-slate-700/50">
            <p className="text-xs text-slate-400 mb-2">เลือกสีแล้วกด Add Post-it หรือแตะสองครั้งที่ canvas</p>
            <div className="grid grid-cols-3 gap-2">
              {STICKY_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setSelectedColor(c.hex)}
                  className="flex items-center gap-2 p-3 rounded-xl border-2 transition-all touch-manipulation min-h-[52px]"
                  style={{
                    backgroundColor: `${c.hex}33`,
                    borderColor: selectedColor === c.hex ? 'rgb(251 191 36)' : 'rgba(0,0,0,0.15)',
                    boxShadow: selectedColor === c.hex ? '0 0 0 2px rgb(251 191 36)' : 'none',
                  }}
                >
                  <span className="w-10 h-10 rounded-lg shrink-0 shadow" style={{ backgroundColor: c.hex }} />
                  <span className="text-sm font-medium text-white capitalize truncate">{c.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-slate-700/30">
          <span className="text-xs text-slate-500">สีที่เลือก: <span className="font-medium text-slate-300" style={{ textShadow: '0 0 0 1px var(--tw-shadow-color)' }}>{STICKY_COLORS.find((c) => c.hex === selectedColor)?.name ?? '—'}</span></span>
          <Link to="/room" className="text-sm text-slate-400 hover:text-white py-2 px-3 rounded-lg hover:bg-slate-700/50 touch-manipulation min-h-[44px] flex items-center">
            ออกจากห้อง
          </Link>
        </div>
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
