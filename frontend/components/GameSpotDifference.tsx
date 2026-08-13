import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  fetchBestRunForEmail,
  fetchCardMatchLeaderboard,
  formatMatchTime,
  loadStoredRegistration,
  registerCardMatchPlayer,
  saveCardMatchRun,
  storeRegistration,
  subscribeCardMatchLeaderboard,
  type CardMatchLeaderboardEntry,
  type CardMatchRegistration,
  type SaveCardMatchOutcome,
} from '../services/cardMatchSupabase';

type CardDef = {
  uid: string;
  setId: string;
  emoji: string;
  label: string;
  tint: string;
};

type Phase = 'intro' | 'registering' | 'playing' | 'won';

const SETS = [
  { setId: 'fox', emoji: '🦊', label: 'จิ้งจอก', tint: 'from-orange-400 to-amber-500' },
  { setId: 'idea', emoji: '💡', label: 'ไอเดีย', tint: 'from-yellow-300 to-amber-400' },
  { setId: 'bolt', emoji: '⚡', label: 'พลัง', tint: 'from-cyan-300 to-sky-500' },
  { setId: 'target', emoji: '🎯', label: 'เป้า', tint: 'from-rose-400 to-red-500' },
  { setId: 'star', emoji: '⭐', label: 'ดาว', tint: 'from-amber-200 to-yellow-400' },
  { setId: 'fire', emoji: '🔥', label: 'ไฟ', tint: 'from-orange-500 to-red-500' },
  { setId: 'brain', emoji: '🧠', label: 'สมอง', tint: 'from-pink-300 to-fuchsia-500' },
  { setId: 'rocket', emoji: '🚀', label: 'จรวด', tint: 'from-sky-400 to-indigo-500' },
] as const;

const EMPTY_REGISTRATION: CardMatchRegistration = { name: '', email: '', company: '' };

function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function buildDeck(): CardDef[] {
  const cards: CardDef[] = [];
  SETS.forEach((set) => {
    for (let i = 0; i < 2; i += 1) {
      cards.push({
        uid: `${set.setId}-${i}`,
        setId: set.setId,
        emoji: set.emoji,
        label: set.label,
        tint: set.tint,
      });
    }
  });
  return shuffle(cards);
}

function saveOutcomeMessage(outcome: SaveCardMatchOutcome): string {
  if (outcome === 'updated') return 'ทำเวลาได้ดีกว่าสถิติเดิม — อัปเดตกระดานคะแนนแล้ว';
  if (outcome === 'unchanged') return 'บันทึกแล้ว แต่ยังไม่เร็วกว่าสถิติเดิม';
  return 'บันทึกคะแนนขึ้นกระดานแล้ว';
}

const GameSpotDifference: React.FC = () => {
  const [phase, setPhase] = useState<Phase>('intro');
  const [deck, setDeck] = useState<CardDef[]>(() => buildDeck());
  const [flipped, setFlipped] = useState<string[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [locked, setLocked] = useState(false);
  const [moves, setMoves] = useState(0);
  const [round, setRound] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [finalTimeMs, setFinalTimeMs] = useState<number | null>(null);
  const [registration, setRegistration] = useState<CardMatchRegistration>(EMPTY_REGISTRATION);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [bestRun, setBestRun] = useState<CardMatchLeaderboardEntry | null>(null);
  const [entries, setEntries] = useState<CardMatchLeaderboardEntry[]>([]);
  const [boardLoading, setBoardLoading] = useState(false);
  const [boardError, setBoardError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const startMsRef = useRef<number | null>(null);
  const savingRef = useRef(false);

  const matchedSets = useMemo(
    () =>
      SETS.filter((set) =>
        deck.filter((card) => card.setId === set.setId).every((card) => matched.includes(card.uid))
      ).length,
    [deck, matched]
  );

  const myRank = useMemo(() => {
    if (!registration.email) return null;
    const idx = entries.findIndex((row) => row.email === registration.email.trim().toLowerCase());
    return idx >= 0 ? idx + 1 : null;
  }, [entries, registration.email]);

  const loadBoard = useCallback(async () => {
    setBoardLoading(true);
    setBoardError(null);
    try {
      const next = await fetchCardMatchLeaderboard(20);
      setEntries(next);
    } catch (e) {
      setBoardError(e instanceof Error ? e.message : 'โหลดกระดานคะแนนไม่สำเร็จ');
    } finally {
      setBoardLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard]);

  useEffect(() => {
    return subscribeCardMatchLeaderboard(() => {
      void loadBoard();
    });
  }, [loadBoard]);

  useEffect(() => {
    if (phase !== 'playing' || !startMsRef.current) return;
    const tick = () => setElapsedMs(Date.now() - (startMsRef.current ?? Date.now()));
    tick();
    const id = window.setInterval(tick, 80);
    return () => window.clearInterval(id);
  }, [phase, round]);

  useEffect(() => {
    if (phase !== 'registering') return;
    const email = registration.email.trim();
    if (!email) {
      setBestRun(null);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetchBestRunForEmail(email)
        .then(setBestRun)
        .catch(() => setBestRun(null));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [phase, registration.email]);

  const openRegistration = () => {
    const stored = loadStoredRegistration();
    setRegistration(stored ?? EMPTY_REGISTRATION);
    setRegisterError(null);
    setPhase('registering');
  };

  const startGame = () => {
    setDeck(buildDeck());
    setFlipped([]);
    setMatched([]);
    setLocked(false);
    setMoves(0);
    setElapsedMs(0);
    setFinalTimeMs(null);
    setSaveMessage(null);
    setSaveError(null);
    savingRef.current = false;
    setRound((r) => r + 1);
    startMsRef.current = Date.now();
    setPhase('playing');
  };

  const finishGame = useCallback(
    async (timeMs: number, totalMoves: number) => {
      setFinalTimeMs(timeMs);
      setPhase('won');
      if (savingRef.current) return;
      if (!registration.name.trim() || !registration.email.trim()) return;
      savingRef.current = true;
      try {
        const outcome = await saveCardMatchRun({
          playerId,
          registration,
          completionTimeMs: timeMs,
          moves: totalMoves,
        });
        setSaveMessage(saveOutcomeMessage(outcome));
        setSaveError(null);
        await loadBoard();
      } catch (e) {
        savingRef.current = false;
        setSaveError(e instanceof Error ? e.message : 'บันทึกคะแนนไม่สำเร็จ');
      }
    },
    [loadBoard, playerId, registration]
  );

  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registration.name.trim() || !registration.email.trim() || !registration.company.trim()) return;
    setRegisterError(null);
    storeRegistration(registration);
    setRegistering(true);
    try {
      const player = await registerCardMatchPlayer(registration);
      setPlayerId(player.id);
      startGame();
    } catch (err) {
      setRegisterError(err instanceof Error ? err.message : 'ลงทะเบียนไม่สำเร็จ');
    } finally {
      setRegistering(false);
    }
  };

  const handleFlip = useCallback(
    (card: CardDef) => {
      if (phase !== 'playing' || locked) return;
      if (matched.includes(card.uid) || flipped.includes(card.uid)) return;
      if (flipped.length >= 2) return;

      const nextFlipped = [...flipped, card.uid];
      setFlipped(nextFlipped);
      if (nextFlipped.length < 2) return;

      const nextMoves = moves + 1;
      setMoves(nextMoves);
      const first = deck.find((c) => c.uid === nextFlipped[0]);
      const second = deck.find((c) => c.uid === nextFlipped[1]);
      if (!first || !second) return;

      if (first.setId === second.setId) {
        const nextMatched = [...matched, first.uid, second.uid];
        setMatched(nextMatched);
        setFlipped([]);
        if (nextMatched.length >= deck.length) {
          const timeMs = Date.now() - (startMsRef.current ?? Date.now());
          window.setTimeout(() => {
            void finishGame(timeMs, nextMoves);
          }, 420);
        }
        return;
      }

      setLocked(true);
      window.setTimeout(() => {
        setFlipped([]);
        setLocked(false);
      }, 800);
    },
    [phase, locked, matched, flipped, deck, moves, finishGame]
  );

  return (
    <div className="min-h-screen bg-[#070707] text-white selection:bg-cyan-300 selection:text-black">
      <div className="fixed top-4 left-4 right-4 z-20 flex items-center justify-between gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-white/90 hover:bg-white/20"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          หน้าหลัก
        </Link>
        {phase === 'playing' && (
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <span className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1.5 text-cyan-200">
              จับคู่แล้ว {matchedSets}/8
            </span>
            <span className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-2.5 py-1.5 font-semibold text-amber-200">
              ⏱ {formatMatchTime(elapsedMs)}
            </span>
          </div>
        )}
      </div>

      {(phase === 'intro' || phase === 'registering') && (
        <div className="mx-auto grid min-h-screen max-w-6xl gap-8 px-4 py-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="text-center lg:text-left">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-300/80">MindDoJo Gamification</p>
            <h1 className="mt-3 text-4xl font-black text-white sm:text-5xl">จับคู่การ์ด</h1>
            <p className="mx-auto mt-3 max-w-md text-sm text-zinc-400 sm:text-base lg:mx-0">
              ลงทะเบียนก่อนเล่น การ์ด 16 ใบ 8 คู่ แข่งกันที่เวลา
              คะแนนขึ้นกระดานเมื่อจับคู่ครบ
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-2xl lg:justify-start" aria-hidden>
              {SETS.map((set) => (
                <span key={set.setId}>{set.emoji}</span>
              ))}
            </div>

            {phase === 'intro' && (
              <button
                type="button"
                onClick={openRegistration}
                className="mt-8 rounded-2xl bg-cyan-400 px-8 py-3.5 text-base font-black text-black hover:bg-cyan-300"
              >
                ลงทะเบียนเพื่อเล่น
              </button>
            )}

            {phase === 'registering' && (
              <form onSubmit={handleRegistration} className="mx-auto mt-8 max-w-md space-y-3 text-left lg:mx-0">
                <h2 className="text-lg font-bold text-white">ลงทะเบียนผู้เล่น</h2>
                <input
                  type="text"
                  required
                  placeholder="ชื่อ-นามสกุล"
                  value={registration.name}
                  onChange={(e) => setRegistration({ ...registration, name: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-cyan-400/50"
                />
                <input
                  type="email"
                  required
                  placeholder="อีเมล"
                  value={registration.email}
                  onChange={(e) => setRegistration({ ...registration, email: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-cyan-400/50"
                />
                <input
                  type="text"
                  required
                  placeholder="บริษัท / หน่วยงาน"
                  value={registration.company}
                  onChange={(e) => setRegistration({ ...registration, company: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-cyan-400/50"
                />
                {bestRun ? (
                  <p className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-200">
                    เคยเล่นแล้ว · สถิติที่ดีที่สุด {formatMatchTime(bestRun.completionTimeMs)}
                  </p>
                ) : null}
                {registerError ? <p className="text-sm text-red-300">{registerError}</p> : null}
                {!isSupabaseConfigured ? (
                  <p className="text-xs text-amber-200/80">ยังไม่ได้ตั้งค่าฐานข้อมูล — จะเก็บคะแนนในเครื่องนี้ชั่วคราว</p>
                ) : null}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setPhase('intro')}
                    className="rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-zinc-300 hover:bg-white/5"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={registering}
                    className="flex-1 rounded-xl bg-cyan-400 px-4 py-3 text-sm font-black text-black hover:bg-cyan-300 disabled:opacity-60"
                  >
                    {registering ? 'กำลังลงทะเบียน...' : 'เริ่มเล่น'}
                  </button>
                </div>
              </form>
            )}
          </div>

          <LeaderboardCard
            entries={entries}
            loading={boardLoading}
            error={boardError}
            highlightEmail={registration.email}
          />
        </div>
      )}

      {phase === 'playing' && (
        <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4 py-24 sm:px-6">
          <div className="mb-5 text-center">
            <h2 className="text-2xl font-black text-white">เปิดการ์ดจับคู่</h2>
            <p className="mt-1 text-sm text-zinc-400">
              {registration.name} · กดเปิดทีละใบ แข่งกันที่เวลา
            </p>
          </div>

          <div key={round} className="grid grid-cols-4 gap-2 sm:gap-3">
            {deck.map((card) => {
              const isMatched = matched.includes(card.uid);
              const isOpen = isMatched || flipped.includes(card.uid);
              return (
                <button
                  key={card.uid}
                  type="button"
                  onClick={() => handleFlip(card)}
                  disabled={isOpen || locked}
                  aria-label={isOpen ? card.label : 'การ์ดคว่ำ'}
                  className="aspect-square [perspective:900px] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 rounded-2xl"
                >
                  <div
                    className={`relative h-full w-full rounded-2xl transition-transform duration-500 [transform-style:preserve-3d] ${
                      isOpen ? '[transform:rotateY(180deg)]' : ''
                    }`}
                  >
                    <div className="absolute inset-0 rounded-2xl border border-cyan-300/25 bg-gradient-to-br from-[#123] to-[#0a1628] shadow-lg [backface-visibility:hidden] flex items-center justify-center">
                      <span className="text-lg font-black tracking-widest text-cyan-200/80 sm:text-xl">MD</span>
                    </div>
                    <div
                      className={`absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-white/20 bg-gradient-to-br ${card.tint} text-black shadow-lg [backface-visibility:hidden] [transform:rotateY(180deg)]`}
                    >
                      <span className="text-3xl sm:text-4xl" aria-hidden>
                        {card.emoji}
                      </span>
                      <span className="mt-0.5 text-[10px] font-bold sm:text-xs">{card.label}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {phase === 'won' && (
        <div className="mx-auto grid min-h-screen max-w-6xl gap-8 px-4 py-24 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div className="text-center lg:text-left">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-300/80">จบเกม</p>
            <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">จับคู่ครบแล้ว!</h2>
            <p className="mt-3 text-2xl font-black text-cyan-300">
              {formatMatchTime(finalTimeMs ?? elapsedMs)}
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              {registration.name} · เปิดเทียบกัน {moves} ครั้ง
              {myRank ? ` · อันดับ ${myRank}` : ''}
            </p>
            {saveMessage ? <p className="mt-3 text-sm text-emerald-300">{saveMessage}</p> : null}
            {saveError ? <p className="mt-3 text-sm text-red-300">{saveError}</p> : null}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <button
                type="button"
                onClick={startGame}
                className="rounded-2xl bg-cyan-400 px-8 py-3.5 text-base font-black text-black hover:bg-cyan-300"
              >
                เล่นอีกครั้ง
              </button>
              <Link to="/" className="rounded-2xl border border-white/15 px-5 py-3.5 text-sm text-zinc-300 hover:bg-white/5">
                กลับหน้าหลัก
              </Link>
            </div>
          </div>
          <LeaderboardCard
            entries={entries}
            loading={boardLoading}
            error={boardError}
            highlightEmail={registration.email}
          />
        </div>
      )}
    </div>
  );
};

function LeaderboardCard({
  entries,
  loading,
  error,
  highlightEmail,
}: {
  entries: CardMatchLeaderboardEntry[];
  loading: boolean;
  error: string | null;
  highlightEmail?: string;
}) {
  const email = highlightEmail?.trim().toLowerCase() ?? '';

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-white">กระดานคะแนน</h2>
          <p className="text-xs text-zinc-500">เรียงจากเวลาเร็วสุด · อัปเดตเมื่อมีคนเล่นจบ</p>
        </div>
        <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-200">
          TOP {Math.min(entries.length, 20) || 20}
        </span>
      </div>

      {loading && entries.length === 0 ? (
        <p className="py-10 text-center text-sm text-zinc-500">กำลังโหลดอันดับ...</p>
      ) : error ? (
        <p className="py-10 text-center text-sm text-red-300">{error}</p>
      ) : entries.length === 0 ? (
        <p className="py-10 text-center text-sm text-zinc-500">
          ยังไม่มีคะแนน
          <br />
          เป็นคนแรกที่ขึ้นกระดาน!
        </p>
      ) : (
        <ol className="max-h-[28rem] space-y-2 overflow-auto pr-1">
          {entries.map((entry, index) => {
            const isMe = email && entry.email === email;
            return (
              <li
                key={entry.id}
                className={`grid grid-cols-[2rem_1fr_auto] items-center gap-3 rounded-2xl px-3 py-2.5 ${
                  isMe ? 'border border-cyan-400/40 bg-cyan-400/10' : 'bg-white/[0.03]'
                }`}
              >
                <span className="text-center text-sm font-black text-amber-300">{index + 1}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {entry.name}
                    {isMe ? ' · คุณ' : ''}
                  </p>
                  <p className="truncate text-xs text-zinc-500">{entry.company || '—'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-cyan-300">{formatMatchTime(entry.completionTimeMs)}</p>
                  <p className="text-[11px] text-zinc-500">{entry.moves} ครั้ง</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

export default GameSpotDifference;
