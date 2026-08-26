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

type TechSet = {
  setId: string;
  mark: string;
  label: string;
  category: string;
  blurb: string;
  description: string;
  tint: string;
  logoUrl?: string;
};

type CardDef = TechSet & { uid: string };

type Phase = 'intro' | 'registering' | 'playing' | 'won';

const SETS: TechSet[] = [
  {
    setId: 'slack',
    mark: 'Sl',
    label: 'Slack',
    category: 'Communication',
    blurb: 'Connect & Communicate',
    description: 'เทคโนโลยีช่วยให้ทีมสื่อสารเร็วและทำงานร่วมกันง่ายขึ้น',
    tint: 'from-fuchsia-300 to-purple-700',
    logoUrl:
      'https://axaasphuaaadzjoffznj.supabase.co/storage/v1/object/public/images/Logo%20-%20Matching%20Card%20Game/slack-logo-icon.png',
  },
  {
    setId: 'powerbi',
    mark: 'BI',
    label: 'Power BI',
    category: 'Data & Analytics',
    blurb: 'Turn Data into Insight',
    description: 'เปลี่ยนข้อมูลให้มองเห็น Pattern และช่วยตัดสินใจ',
    tint: 'from-amber-300 to-yellow-600',
    logoUrl:
      'https://axaasphuaaadzjoffznj.supabase.co/storage/v1/object/public/images/Logo%20-%20Matching%20Card%20Game/Power-BI-Logo.png',
  },
  {
    setId: 'asana',
    mark: 'As',
    label: 'Asana',
    category: 'Work Management',
    blurb: 'Plan & Get Things Done',
    description: 'วางแผนงาน มอบหมายงาน และติดตามความคืบหน้า',
    tint: 'from-rose-300 to-red-600',
    logoUrl:
      'https://axaasphuaaadzjoffznj.supabase.co/storage/v1/object/public/images/Logo%20-%20Matching%20Card%20Game/asana.png',
  },
  {
    setId: 'canva',
    mark: 'Cv',
    label: 'Canva',
    category: 'Creative Tech',
    blurb: 'Create Faster, Better',
    description: 'ใช้เทคโนโลยีช่วยสร้างสื่อ Presentation และ Visual Content',
    tint: 'from-violet-300 to-cyan-500',
    logoUrl:
      'https://axaasphuaaadzjoffznj.supabase.co/storage/v1/object/public/images/Logo%20-%20Matching%20Card%20Game/Canva-Logo-PNG.png',
  },
  {
    setId: 'claude',
    mark: 'Cl',
    label: 'Claude',
    category: 'AI Platform',
    blurb: 'AI as Your Co-worker',
    description: 'ใช้ AI เป็นผู้ช่วยคิด วิเคราะห์ สรุป และสร้างงาน',
    tint: 'from-orange-200 to-amber-700',
    logoUrl:
      'https://axaasphuaaadzjoffznj.supabase.co/storage/v1/object/public/images/Logo%20-%20Matching%20Card%20Game/Claude.png',
  },
  {
    setId: 'gdrive',
    mark: 'Gd',
    label: 'Google Drive',
    category: 'Cloud Storage',
    blurb: 'Access Work Anywhere',
    description: 'จัดเก็บ แชร์ และเข้าถึงไฟล์จากทุกที่',
    tint: 'from-yellow-300 to-blue-600',
    logoUrl:
      'https://axaasphuaaadzjoffznj.supabase.co/storage/v1/object/public/images/Logo%20-%20Matching%20Card%20Game/google-drive-logo.png',
  },
  {
    setId: 'notion',
    mark: 'No',
    label: 'Notion',
    category: 'Knowledge Management',
    blurb: 'Organize What We Know',
    description: 'รวบรวม จัดระบบ และแบ่งปันความรู้ของทีม',
    tint: 'from-zinc-100 to-stone-800',
    logoUrl:
      'https://axaasphuaaadzjoffznj.supabase.co/storage/v1/object/public/images/Logo%20-%20Matching%20Card%20Game/Notion.png',
  },
  {
    setId: 'zapier',
    mark: 'Zp',
    label: 'Zapier',
    category: 'Automation',
    blurb: 'Let Tech Do the Routine',
    description: 'ให้เทคโนโลยีจัดการงานซ้ำๆ และเชื่อม Workflow',
    tint: 'from-orange-300 to-orange-600',
    logoUrl:
      'https://axaasphuaaadzjoffznj.supabase.co/storage/v1/object/public/images/Logo%20-%20Matching%20Card%20Game/Zapier-Symbol.png',
  },
];

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
      cards.push({ uid: `${set.setId}-${i}`, ...set });
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
  const [phase, setPhase] = useState<Phase>('registering');
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
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const popupTimerRef = useRef<number | null>(null);
  const pendingFinishRef = useRef<{ timeMs: number; moves: number } | null>(null);
  const [matchFact, setMatchFact] = useState<TechSet | null>(null);
  const filledCount = [registration.name, registration.email, registration.company].filter((v) => v.trim().length >= 2).length;

  const formReady =
    registration.name.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registration.email.trim()) &&
    registration.company.trim().length >= 2;

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
    const stored = loadStoredRegistration();
    if (stored) setRegistration(stored);
    return () => {
      if (popupTimerRef.current) window.clearTimeout(popupTimerRef.current);
    };
  }, [loadBoard]);

  useEffect(() => {
    return subscribeCardMatchLeaderboard(() => {
      void loadBoard();
    });
  }, [loadBoard]);

  useEffect(() => {
    if (phase !== 'playing' || !startMsRef.current || matchFact) return;
    const tick = () => setElapsedMs(Date.now() - (startMsRef.current ?? Date.now()));
    tick();
    const id = window.setInterval(tick, 80);
    return () => window.clearInterval(id);
  }, [phase, round, matchFact]);

  useEffect(() => {
    if (phase !== 'registering') return;
    if (window.matchMedia('(max-width: 1023px)').matches) return;
    const id = window.setTimeout(() => nameInputRef.current?.focus(), 180);
    return () => window.clearTimeout(id);
  }, [phase]);

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

  const startGame = () => {
    if (popupTimerRef.current) {
      window.clearTimeout(popupTimerRef.current);
      popupTimerRef.current = null;
    }
    pendingFinishRef.current = null;
    setMatchFact(null);
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

  const closeMatchFact = useCallback(() => {
    if (popupTimerRef.current) {
      window.clearTimeout(popupTimerRef.current);
      popupTimerRef.current = null;
    }
    setMatchFact(null);
    setLocked(false);
    const pending = pendingFinishRef.current;
    if (pending) {
      pendingFinishRef.current = null;
      void finishGame(pending.timeMs, pending.moves);
    }
  }, [finishGame]);

  const openMatchFact = useCallback(
    (setId: string, completed: boolean, timeMs: number, totalMoves: number) => {
      const fact = SETS.find((item) => item.setId === setId) ?? null;
      if (!fact) return;
      if (popupTimerRef.current) {
        window.clearTimeout(popupTimerRef.current);
      }
      setMatchFact(fact);
      setLocked(true);
      if (completed) {
        pendingFinishRef.current = { timeMs, moves: totalMoves };
      }
      popupTimerRef.current = window.setTimeout(() => {
        closeMatchFact();
      }, 3000);
    },
    [closeMatchFact]
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
        setLocked(true);
        const nextMatched = [...matched, first.uid, second.uid];
        setMatched(nextMatched);
        setFlipped([]);
        const completed = nextMatched.length >= deck.length;
        const timeMs = Date.now() - (startMsRef.current ?? Date.now());
        window.setTimeout(() => {
          openMatchFact(first.setId, completed, timeMs, nextMoves);
        }, 280);
        return;
      }

      setLocked(true);
      window.setTimeout(() => {
        setFlipped([]);
        setLocked(false);
      }, 800);
    },
    [phase, locked, matched, flipped, deck, moves, openMatchFact]
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b0c10] text-white selection:bg-amber-300 selection:text-black">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(245,199,90,0.16),transparent_42%),radial-gradient(ellipse_at_bottom_right,rgba(56,189,248,0.12),transparent_40%)]" />
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />
      </div>

      <div className="fixed top-4 left-4 right-4 z-20 flex items-center justify-between gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur-md hover:bg-white/10"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          หน้าหลัก
        </Link>
        {phase === 'playing' && (
          <div className="flex items-center gap-2 text-sm sm:text-sm md:text-sm">
            <span className="rounded-full border border-amber-300/30 bg-black/50 px-3 py-2 text-base font-bold text-amber-200 backdrop-blur-md sm:text-sm sm:px-2.5 sm:py-1.5 sm:font-normal">
              จับคู่แล้ว {matchedSets}/8
            </span>
            <span className="rounded-full border border-white/10 bg-black/50 px-3 py-2 text-base font-bold text-white backdrop-blur-md sm:text-sm sm:px-2.5 sm:py-1.5 sm:font-semibold">
              ⏱ {formatMatchTime(elapsedMs)}
            </span>
          </div>
        )}
      </div>

      {(phase === 'intro' || phase === 'registering') && (
        <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-8 px-4 py-24 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="order-2 lg:order-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-amber-300/90">MindDoJo · Tech & Platforms</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-6xl">
              จับคู่การ์ด
              <span className="mt-2 block text-2xl font-semibold text-amber-200/90 sm:text-3xl">Tech ที่คนรู้จัก</span>
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-zinc-400">
              จับคู่แพลตฟอร์ม 8 คู่ เช่น Slack, Power BI, Claude, Notion
              จับคู่ถูกจะมีป๊อปอัปสั้นๆ บอกว่าคืออะไร แล้วแข่งกันที่เวลา
            </p>

            <div className="mt-7 max-w-md">
              <LobbyPreview />
            </div>

            <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold text-zinc-300">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">16 ใบ</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">8 คู่</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">จับเวลา</span>
              <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1.5 text-amber-200">จับคู่ถูกมีคำอธิบาย</span>
            </div>

            {entries[0] ? (
              <p className="mt-5 text-sm text-zinc-500">
                แชมป์ปัจจุบัน <span className="font-semibold text-amber-200">{entries[0].name}</span>
                {' · '}
                {formatMatchTime(entries[0].completionTimeMs)}
              </p>
            ) : null}
          </div>

          <form
            onSubmit={handleRegistration}
            className="order-1 lg:order-2 relative overflow-hidden rounded-[32px] bg-[#f4efe6] p-6 text-stone-900 shadow-[0_30px_80px_rgba(0,0,0,0.35)] sm:p-8"
          >
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-amber-400 via-orange-300 to-amber-500" />
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-stone-500">ลงทะเบียนผู้เล่น</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-stone-900 sm:text-3xl">พร้อมแข่งหรือยัง?</h2>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-semibold text-stone-500">{filledCount}/3</p>
                <div className="mt-1 h-1.5 w-16 overflow-hidden rounded-full bg-stone-200">
                  <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${(filledCount / 3) * 100}%` }} />
                </div>
              </div>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-stone-500">
              กรอกชื่อ อีเมล และบริษัท เพื่อบันทึกเวลาขึ้นกระดาน
            </p>

            {bestRun ? (
              <div className="mt-5 rounded-2xl border border-amber-300/70 bg-amber-50 px-4 py-3">
                <p className="text-sm font-bold text-amber-900">ยินดีต้อนรับกลับ {registration.name || ''}</p>
                <p className="mt-0.5 text-xs text-amber-800/80">
                  สถิติที่ดีที่สุด {formatMatchTime(bestRun.completionTimeMs)} · {bestRun.moves} ครั้ง
                </p>
              </div>
            ) : null}

            <div className="mt-6 space-y-3.5">
              <Field
                ref={nameInputRef}
                id="card-match-name"
                label="ชื่อ-นามสกุล"
                icon="user"
                autoComplete="name"
                placeholder="สมชาย ใจดี"
                value={registration.name}
                valid={registration.name.trim().length >= 2}
                onChange={(value) => setRegistration({ ...registration, name: value })}
              />
              <Field
                id="card-match-email"
                label="อีเมล"
                icon="mail"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="name@company.com"
                value={registration.email}
                valid={/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registration.email.trim())}
                onChange={(value) => setRegistration({ ...registration, email: value })}
              />
              <Field
                id="card-match-company"
                label="บริษัท / หน่วยงาน"
                icon="building"
                autoComplete="organization"
                placeholder="MindDoJo"
                value={registration.company}
                valid={registration.company.trim().length >= 2}
                onChange={(value) => setRegistration({ ...registration, company: value })}
              />
            </div>

            {registerError ? (
              <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{registerError}</p>
            ) : null}

            <button
              type="submit"
              disabled={registering || !formReady}
              className="mt-6 w-full rounded-2xl bg-stone-950 px-5 py-4 text-base font-black text-amber-200 shadow-[0_12px_30px_rgba(0,0,0,0.18)] transition hover:bg-black disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500 disabled:shadow-none"
            >
              {registering ? 'กำลังเข้าสู่เกม...' : formReady ? 'เริ่มจับคู่การ์ด' : 'กรอกข้อมูลให้ครบก่อน'}
            </button>
            <p className="mt-3 text-center text-xs text-stone-400">
              {isSupabaseConfigured ? 'ข้อมูลใช้สำหรับกระดานคะแนนของเกมนี้เท่านั้น' : 'ยังไม่ได้ตั้งค่าฐานข้อมูล — จะเก็บคะแนนในเครื่องนี้ชั่วคราว'}
            </p>

            <div className="mt-6 border-t border-stone-200 pt-5">
              <LeaderboardCard
                entries={entries}
                loading={boardLoading}
                error={boardError}
                highlightEmail={registration.email}
                compact
              />
            </div>
          </form>
        </div>
      )}

      {phase === 'playing' && (
        <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4 py-24 sm:px-6">
          <div className="mb-5 text-center">
            <h2 className="text-3xl font-black text-white sm:text-2xl">จับคู่ Tech & Platforms</h2>
            <p className="mt-1 text-base leading-relaxed text-zinc-300 sm:text-sm sm:text-zinc-400">
              {registration.name} · จับคู่ถูกจะบอกสั้นๆ ว่าแพลตฟอร์มนั้นคืออะไร
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
                      <span className="text-xl font-black tracking-widest text-cyan-200/80 sm:text-xl">MD</span>
                    </div>
                    <div
                      className={`absolute inset-0 flex flex-col items-center justify-center rounded-2xl border shadow-lg [backface-visibility:hidden] [transform:rotateY(180deg)] ${
                        card.logoUrl
                          ? 'border-white/20 bg-white text-stone-800'
                          : `border-white/20 bg-gradient-to-br ${card.tint} text-black`
                      }`}
                    >
                      <TechMark item={card} className="h-10 w-10 sm:h-10 sm:w-10 text-base font-black leading-none tracking-tight" />
                      <span className="mt-1 max-w-[94%] px-0.5 text-center text-xs font-bold leading-tight sm:text-[10px]">{card.label}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {matchFact ? <MatchFactPopup fact={matchFact} onClose={closeMatchFact} /> : null}
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
          <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-2 backdrop-blur-md sm:p-3">
            <LeaderboardCard
              entries={entries}
              loading={boardLoading}
              error={boardError}
              highlightEmail={registration.email}
            />
          </div>
        </div>
      )}
    </div>
  );
};

function LobbyPreview() {
  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-2.5" aria-hidden>
      {SETS.flatMap((set, setIndex) =>
        [0, 1].map((copy) => {
          const i = setIndex * 2 + copy;
          const faceUp = i === 1 || i === 4 || i === 10 || i === 15;
          return (
            <div
              key={`${set.setId}-${copy}`}
              className={`aspect-square rounded-2xl border shadow-[0_10px_24px_rgba(0,0,0,0.28)] ${
                faceUp
                  ? set.logoUrl
                    ? 'border-white/20 bg-white'
                    : `border-white/20 bg-gradient-to-br ${set.tint}`
                  : 'border-amber-200/20 bg-[linear-gradient(145deg,#182033,#0f1728)]'
              }`}
            >
              <div className="flex h-full flex-col items-center justify-center px-1 text-center">
                {faceUp ? (
                  <>
                    <TechMark item={set} className="h-6 w-6 sm:h-7 sm:w-7 text-xs font-black tracking-tight text-black" />
                    <span className="mt-0.5 text-[8px] font-bold text-black/70">{set.label}</span>
                  </>
                ) : (
                  <span className="text-[11px] font-black tracking-[0.2em] text-amber-200/80">MD</span>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

const Field = React.forwardRef<
  HTMLInputElement,
  {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    valid: boolean;
    icon: 'user' | 'mail' | 'building';
    type?: string;
    autoComplete?: string;
    inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  }
>(function Field(
  { id, label, value, onChange, placeholder, valid, icon, type = 'text', autoComplete, inputMode },
  ref
) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1.5 flex items-center justify-between text-[13px] font-bold text-stone-700">
        {label}
        {valid ? <span className="text-[11px] font-semibold text-emerald-600">ครบแล้ว</span> : null}
      </span>
      <span className="relative block">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
          <FieldIcon name={icon} />
        </span>
        <input
          ref={ref}
          id={id}
          type={type}
          required
          autoComplete={autoComplete}
          inputMode={inputMode}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-2xl border bg-white py-3.5 pl-11 pr-4 text-base text-stone-900 outline-none transition placeholder:text-stone-400 ${
            valid
              ? 'border-emerald-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100'
              : 'border-stone-200 focus:border-amber-400 focus:ring-4 focus:ring-amber-100'
          }`}
        />
      </span>
    </label>
  );
});

function TechMark({
  item,
  className,
}: {
  item: Pick<TechSet, 'mark' | 'label' | 'logoUrl'>;
  className?: string;
}) {
  if (item.logoUrl) {
    return <img src={item.logoUrl} alt={item.label} className={`object-contain ${className ?? ''}`} />;
  }
  return <span className={className}>{item.mark}</span>;
}

function MatchFactPopup({ fact, onClose }: { fact: TechSet; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/55 p-4 backdrop-blur-[2px] sm:items-center">
      <div
        role="dialog"
        aria-labelledby="match-fact-title"
        className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-white/15 bg-[#11141c] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:p-6"
      >
        <div className="absolute inset-x-0 top-0 h-1.5 overflow-hidden bg-white/10">
          <div className="h-full w-full origin-left bg-amber-300" style={{ animation: 'matchFactShrink 3s linear forwards' }} />
        </div>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          aria-label="ปิด"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex items-start gap-3 pr-10">
          <div
            className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl sm:h-14 sm:w-14 ${
              fact.logoUrl ? 'bg-white' : `bg-gradient-to-br ${fact.tint}`
            } text-base font-black text-black`}
          >
            <TechMark item={fact} className="max-h-10 max-w-[80%] text-base font-black sm:max-h-8 sm:text-sm" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300/90 sm:text-[11px]">{fact.category}</p>
            <h3 id="match-fact-title" className="mt-1 text-3xl font-black text-white sm:text-2xl">
              {fact.label}
            </h3>
            <p className="mt-1 text-base font-semibold text-zinc-200 sm:text-sm">{fact.blurb}</p>
          </div>
        </div>
        <p className="mt-4 text-base leading-relaxed text-zinc-300 sm:text-sm sm:text-zinc-400">{fact.description}</p>
        <p className="mt-4 text-center text-xs text-zinc-400 sm:text-[11px] sm:text-zinc-500">ปิดอัตโนมัติใน 3 วินาที หรือกดปิดได้เลย</p>
      </div>
      <style>{`
        @keyframes matchFactShrink {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }
      `}</style>
    </div>
  );
}

function FieldIcon({ name }: { name: 'user' | 'mail' | 'building' }) {
  if (name === 'mail') {
    return (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    );
  }
  if (name === 'building') {
    return (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 21h18M6 21V7l6-3 6 3v14M9 21v-6h6v6" />
      </svg>
    );
  }
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM4 21a8 8 0 1116 0" />
    </svg>
  );
}

function LeaderboardCard({
  entries,
  loading,
  error,
  highlightEmail,
  compact = false,
}: {
  entries: CardMatchLeaderboardEntry[];
  loading: boolean;
  error: string | null;
  highlightEmail?: string;
  compact?: boolean;
}) {
  const email = highlightEmail?.trim().toLowerCase() ?? '';
  const visible = compact ? entries.slice(0, 6) : entries;

  return (
    <div className={compact ? '' : 'p-4 sm:p-5'}>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className={`font-black ${compact ? 'text-sm text-stone-800' : 'text-lg text-white'}`}>กระดานคะแนน</h2>
          <p className={`text-xs ${compact ? 'text-stone-500' : 'text-zinc-500'}`}>เรียงจากเวลาเร็วสุด</p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
            compact ? 'bg-amber-100 text-amber-800' : 'border border-amber-300/20 bg-amber-300/10 text-amber-200'
          }`}
        >
          LIVE
        </span>
      </div>

      {loading && entries.length === 0 ? (
        <p className={`py-6 text-center text-sm ${compact ? 'text-stone-400' : 'text-zinc-500'}`}>กำลังโหลดอันดับ...</p>
      ) : error ? (
        <p className="py-6 text-center text-sm text-red-500">{error}</p>
      ) : entries.length === 0 ? (
        <div className={`rounded-2xl px-4 py-8 text-center ${compact ? 'bg-white' : 'border border-dashed border-white/10'}`}>
          <p className="text-xl" aria-hidden>🏆</p>
          <p className={`mt-2 text-sm ${compact ? 'text-stone-500' : 'text-zinc-400'}`}>ยังไม่มีคะแนน — เป็นคนแรกได้เลย</p>
        </div>
      ) : (
        <ol className={compact ? 'space-y-1.5' : 'max-h-[28rem] space-y-2 overflow-auto pr-1'}>
          {visible.map((entry, index) => {
            const isMe = email && entry.email === email;
            return (
              <li
                key={entry.id}
                className={`grid grid-cols-[2rem_1fr_auto] items-center gap-2 rounded-xl px-2.5 py-2 ${
                  compact
                    ? isMe
                      ? 'bg-amber-100'
                      : 'bg-white'
                    : isMe
                      ? 'border border-amber-300/40 bg-amber-300/10'
                      : 'bg-white/[0.04]'
                }`}
              >
                <span className={`text-center text-sm font-black ${index === 0 ? 'text-amber-500' : compact ? 'text-stone-400' : 'text-zinc-500'}`}>
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className={`truncate text-sm font-semibold ${compact ? 'text-stone-900' : 'text-white'}`}>
                    {entry.name}
                    {isMe ? ' · คุณ' : ''}
                  </p>
                  <p className={`truncate text-[11px] ${compact ? 'text-stone-400' : 'text-zinc-500'}`}>{entry.company || '—'}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-black ${compact ? 'text-stone-900' : 'text-amber-200'}`}>
                    {formatMatchTime(entry.completionTimeMs)}
                  </p>
                  <p className={`text-[11px] ${compact ? 'text-stone-400' : 'text-zinc-500'}`}>{entry.moves} ครั้ง</p>
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
