import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  formatScore,
  isTeambuildingTableMissingError,
  mapTeambuildingRow,
  rankTeams,
  TEAMBUILDING_SELECT,
  TEAMBUILDING_TEAMS_TABLE,
  type RankedTeambuildingTeam,
  type TeambuildingTeam,
} from '../lib/teambuilding';

const HINO_LOGO = 'https://www.hinomanufacturing.co.th/th/_content_images/website/logo.png?vs=20260124080023';
const HINO_RED = '#CC0000';
const HINO_GRAY = '#4D4D4D';

const RANK_MASCOTS: Record<1 | 2 | 3, string> = {
  1: '/images/teambuilding/rank-mascot-1.jpg',
  2: '/images/teambuilding/rank-mascot-2.jpg',
  3: '/images/teambuilding/rank-mascot-3.jpg',
};
const BOOBY_MASCOT = '/images/teambuilding/rank-mascot-last.jpg';
const SCOREBOARD_BGM = '/sounds/teambuilding/scoreboard-bgm.mp3';

type SfxKind = 'enter' | 'reveal3' | 'reveal2' | 'reveal1' | 'booby' | 'rest';

function tone(
  ctx: AudioContext,
  {
    freq,
    when,
    dur = 0.18,
    type = 'triangle',
    gain = 0.08,
    slideTo,
  }: {
    freq: number;
    when: number;
    dur?: number;
    type?: OscillatorType;
    gain?: number;
    slideTo?: number;
  }
) {
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, when);
  if (slideTo != null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), when + dur);
  }
  amp.gain.setValueAtTime(0.0001, when);
  amp.gain.exponentialRampToValueAtTime(gain, when + 0.02);
  amp.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  osc.connect(amp);
  amp.connect(ctx.destination);
  osc.start(when);
  osc.stop(when + dur + 0.02);
}

function playSynthesizedSfx(ctx: AudioContext, kind: SfxKind) {
  const t0 = ctx.currentTime + 0.01;
  if (kind === 'enter') {
    tone(ctx, { freq: 220, when: t0, dur: 0.22, type: 'sine', gain: 0.06, slideTo: 440 });
    tone(ctx, { freq: 330, when: t0 + 0.12, dur: 0.28, type: 'triangle', gain: 0.05, slideTo: 660 });
    return;
  }
  if (kind === 'reveal3') {
    [392, 494, 587].forEach((f, i) => tone(ctx, { freq: f, when: t0 + i * 0.09, dur: 0.2, gain: 0.07 }));
    return;
  }
  if (kind === 'reveal2') {
    [440, 554, 659, 880].forEach((f, i) => tone(ctx, { freq: f, when: t0 + i * 0.08, dur: 0.22, gain: 0.075 }));
    return;
  }
  if (kind === 'reveal1') {
    [523, 659, 784, 1046].forEach((f, i) =>
      tone(ctx, { freq: f, when: t0 + i * 0.07, dur: 0.35, type: i === 3 ? 'square' : 'triangle', gain: 0.07 + i * 0.01 })
    );
    tone(ctx, { freq: 1568, when: t0 + 0.35, dur: 0.45, type: 'sine', gain: 0.04 });
    return;
  }
  if (kind === 'booby') {
    [392, 349, 311, 262].forEach((f, i) =>
      tone(ctx, { freq: f, when: t0 + i * 0.14, dur: 0.28, type: 'sine', gain: 0.06 })
    );
    tone(ctx, { freq: 180, when: t0 + 0.55, dur: 0.4, type: 'triangle', gain: 0.045, slideTo: 120 });
    return;
  }
  // rest
  tone(ctx, { freq: 480, when: t0, dur: 0.25, type: 'sine', gain: 0.045, slideTo: 240 });
  tone(ctx, { freq: 720, when: t0 + 0.05, dur: 0.2, type: 'triangle', gain: 0.03, slideTo: 360 });
}

function useScoreboardAudio() {
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const bgmVolRef = useRef(0.42);
  const duckTimerRef = useRef<number | null>(null);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  mutedRef.current = muted;

  const ensureCtx = useCallback(() => {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!ctxRef.current) ctxRef.current = new AC();
    if (ctxRef.current.state === 'suspended') void ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const ensureBgm = useCallback(() => {
    if (!bgmRef.current) {
      const audio = new Audio(SCOREBOARD_BGM);
      audio.loop = true;
      audio.preload = 'auto';
      audio.volume = bgmVolRef.current;
      bgmRef.current = audio;
    }
    return bgmRef.current;
  }, []);

  const playBgm = useCallback(async () => {
    if (mutedRef.current) return;
    const audio = ensureBgm();
    audio.volume = bgmVolRef.current;
    try {
      ensureCtx();
      await audio.play();
    } catch {
      // autoplay blocked until user gesture
    }
  }, [ensureBgm, ensureCtx]);

  const stopBgm = useCallback(() => {
    const audio = bgmRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  }, []);

  const setBgmVolume = useCallback((vol: number) => {
    bgmVolRef.current = Math.max(0, Math.min(1, vol));
    if (bgmRef.current) bgmRef.current.volume = bgmVolRef.current;
  }, []);

  const playSfx = useCallback(
    (kind: SfxKind) => {
      if (mutedRef.current) return;
      try {
        const ctx = ensureCtx();
        if (duckTimerRef.current != null) window.clearTimeout(duckTimerRef.current);
        if (bgmRef.current) bgmRef.current.volume = Math.min(bgmVolRef.current, 0.16);
        playSynthesizedSfx(ctx, kind);
        duckTimerRef.current = window.setTimeout(() => {
          duckTimerRef.current = null;
          if (!mutedRef.current && bgmRef.current) bgmRef.current.volume = bgmVolRef.current;
        }, kind === 'reveal1' ? 900 : kind === 'booby' ? 800 : 650);
      } catch {
        // ignore
      }
    },
    [ensureCtx]
  );

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      mutedRef.current = next;
      const audio = bgmRef.current;
      if (next) {
        audio?.pause();
      } else {
        void playBgm();
      }
      return next;
    });
  }, [playBgm]);

  useEffect(() => {
    return () => {
      if (duckTimerRef.current != null) window.clearTimeout(duckTimerRef.current);
      bgmRef.current?.pause();
      bgmRef.current = null;
      void ctxRef.current?.close();
      ctxRef.current = null;
    };
  }, []);

  return { muted, playBgm, stopBgm, playSfx, toggleMute, setBgmVolume };
}

const FIREWORK_COLORS = [
  '#CC0000',
  '#FFD700',
  '#FF6B35',
  '#FF4D4D',
  '#FFC107',
  '#FFFFFF',
  '#E53935',
  '#FFEB3B',
  '#FF8A65',
  '#FFF59D',
  '#FF1744',
  '#FFAB00',
];

/** หน้ารอ / หน้าเปิดงาน — กด Enter เพื่อเข้าหน้าแสดงลำดับ */
function ShowcaseIdle({
  teams,
  canEnter,
  onEnter,
  onStartMusic,
}: {
  teams: RankedTeambuildingTeam[];
  canEnter: boolean;
  onEnter: () => void;
  onStartMusic: () => void;
}) {
  useEffect(() => {
    void onStartMusic();
    const unlock = () => void onStartMusic();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [onStartMusic]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      if (!canEnter) return;
      e.preventDefault();
      void onStartMusic();
      onEnter();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canEnter, onEnter, onStartMusic]);

  return (
    <div
      className={`hino-show relative flex h-full w-full flex-col items-center justify-center overflow-hidden ${
        canEnter ? 'is-ready' : ''
      }`}
      role={canEnter ? 'button' : undefined}
      tabIndex={canEnter ? 0 : undefined}
      onClick={() => {
        void onStartMusic();
        if (canEnter) onEnter();
      }}
      onKeyDown={(e) => {
        if (canEnter && e.key === 'Enter') {
          e.preventDefault();
          void onStartMusic();
          onEnter();
        }
      }}
    >
      <div className="hino-show-orbit hino-show-orbit-a" aria-hidden />
      <div className="hino-show-orbit hino-show-orbit-b" aria-hidden />
      <div className="hino-show-orbit hino-show-orbit-c" aria-hidden />
      <div className="hino-show-orbit hino-show-orbit-d" aria-hidden />
      <div className="hino-show-beam" aria-hidden />
      <div className="hino-show-beam hino-show-beam-2" aria-hidden />
      <div className="hino-show-core" aria-hidden />

      {Array.from({ length: 16 }).map((_, i) => (
        <span
          key={i}
          className="hino-show-particle"
          style={{
            ['--x' as string]: `${12 + ((i * 73) % 76)}%`,
            ['--y' as string]: `${10 + ((i * 47) % 70)}%`,
            ['--d' as string]: `${2.4 + (i % 5) * 0.55}s`,
            ['--delay' as string]: `${(i % 8) * 0.28}s`,
            background: teams[i % Math.max(teams.length, 1)]?.color || HINO_RED,
          }}
          aria-hidden
        />
      ))}

      <div className="relative z-10 flex flex-col items-center px-[4vw] text-center">
        <div className="hino-show-logo-wrap mb-[2.2vh]">
          <img src={HINO_LOGO} alt="Hino" className="hino-show-logo h-[min(9vh,12vw)] w-auto object-contain" />
        </div>
        <p className="hino-show-eyebrow text-[clamp(0.7rem,1.25vw,1.1rem)] font-bold uppercase tracking-[0.42em] text-[#CC0000]">
          Hino Motors Manufacturing (Thailand)
        </p>
        <h2 className="hino-show-title mt-[1.4vh] text-[clamp(2.4rem,6.2vw,6.5rem)] font-black leading-[0.92] tracking-tight text-[#1A1A1A]">
          <span className="hino-show-word">TEAM</span>
          <span className="hino-show-word hino-show-word-red">BUILDING</span>
        </h2>
        <div className="hino-show-rule mt-[2vh] h-[0.35vh] w-[min(28vw,220px)] rounded-full" aria-hidden />

        {canEnter ? (
          <>
            <p className="hino-show-sub mt-[1.8vh] text-[clamp(1rem,2.1vw,1.8rem)] font-bold text-[#4D4D4D]">
              พร้อมเปิดหน้าแสดงลำดับ
            </p>
            <button
              type="button"
              className="hino-show-enter"
              onClick={(e) => {
                e.stopPropagation();
                void onStartMusic();
                onEnter();
              }}
            >
              <kbd>ENTER</kbd>
              <span>กดเพื่อเข้าหน้าแสดงลำดับ</span>
            </button>
            <p className="hino-show-wait mt-[1.2vh] text-[clamp(0.7rem,1.2vw,1rem)] font-semibold tracking-[0.28em] text-[#CC0000]">
              PRESS ENTER TO START
            </p>
            <p className="mt-[0.7vh] text-[clamp(0.65rem,1vw,0.85rem)] font-semibold tracking-[0.08em] text-[#8A8A8A]">
              แตะหน้าจอเพื่อเปิดเพลงประกอบ
            </p>
          </>
        ) : (
          <>
            <p className="hino-show-sub mt-[1.8vh] text-[clamp(1rem,2.1vw,1.8rem)] font-bold text-[#4D4D4D]">
              กำลังเตรียมเปิดสกอร์บอร์ด
            </p>
            <p className="hino-show-wait mt-[0.8vh] text-[clamp(0.7rem,1.2vw,1rem)] font-semibold tracking-[0.28em] text-[#CC0000]">
              WAITING FOR FIRST SCORE
            </p>
            <p className="mt-[0.7vh] text-[clamp(0.65rem,1vw,0.85rem)] font-semibold tracking-[0.08em] text-[#8A8A8A]">
              แตะหน้าจอเพื่อเปิดเพลงประกอบ
            </p>
          </>
        )}

        {teams.length > 0 ? (
          <div className="hino-show-teams mt-[3.2vh] flex max-w-[88vw] flex-wrap items-center justify-center gap-[0.7vw]">
            {teams.map((team, i) => (
              <span
                key={team.id}
                className="hino-show-chip"
                style={{
                  ['--team' as string]: team.color || HINO_RED,
                  animationDelay: `${0.9 + i * 0.08}s`,
                }}
              >
                <span className="hino-show-chip-dot" aria-hidden />
                {team.name}
              </span>
            ))}
          </div>
        ) : (
          <p className="hino-show-hint mt-[3vh] text-[clamp(0.75rem,1.2vw,1rem)] text-[#6B6B6B]">
            เพิ่มทีมได้ที่ Admin → Dashboard Teambuilding
          </p>
        )}
      </div>
    </div>
  );
}

function OrbitSpectacle({ teams, active }: { teams: RankedTeambuildingTeam[]; active: boolean }) {
  return (
    <div className={`hino-orbit-fx ${active ? 'is-on' : ''}`} aria-hidden>
      <div className="hino-orbit-fx-glow" />
      <div className="hino-orbit-fx-ring r1" />
      <div className="hino-orbit-fx-ring r2" />
      <div className="hino-orbit-fx-ring r3" />
      <div className="hino-orbit-fx-ring r4" />
      <div className="hino-orbit-fx-beam b1" />
      <div className="hino-orbit-fx-beam b2" />
      <div className="hino-orbit-fx-core" />
      {Array.from({ length: 18 }).map((_, i) => (
        <span
          key={i}
          className="hino-orbit-fx-spark"
          style={{
            ['--i' as string]: String(i),
            ['--c' as string]: teams[i % Math.max(teams.length, 1)]?.color || HINO_RED,
            animationDelay: `${(i % 9) * 0.22}s`,
          }}
        />
      ))}
    </div>
  );
}

/** คะแนนวิ่ง — restartKey เปลี่ยนแล้วเริ่มนับใหม่จาก 0 */
function useAnimatedNumber(target: number, durationMs = 750, restartKey: number | string = 0): number {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);
  const keyRef = useRef(restartKey);

  useEffect(() => {
    const restarted = keyRef.current !== restartKey;
    keyRef.current = restartKey;
    const from = restarted ? 0 : fromRef.current;
    if (!restarted && from === target) return;

    if (restarted) {
      fromRef.current = 0;
      setValue(0);
    }

    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // ease-out แรงๆ ให้ช่วงท้ายช้าลงแบบนับคะแนน
      const eased = 1 - Math.pow(1 - t, 4);
      const next = from + (target - from) * eased;
      setValue(next);
      fromRef.current = next;
      if (t < 1) frame = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs, restartKey]);

  return value;
}

function formatRunningScore(shown: number, target: number): string {
  if (Math.abs(shown - target) < 0.05) return formatScore(target);
  if (Number.isInteger(target)) return formatScore(Math.round(shown));
  return formatScore(Math.round(shown * 10) / 10);
}

function ScoreDelta({ score }: { score: number }) {
  const prevScore = useRef(score);
  const [delta, setDelta] = useState<{ value: number; key: number } | null>(null);

  useEffect(() => {
    const diff = score - prevScore.current;
    prevScore.current = score;
    if (diff === 0) return;
    setDelta({ value: diff, key: Date.now() });
    const t = window.setTimeout(() => setDelta(null), 1800);
    return () => window.clearTimeout(t);
  }, [score]);

  if (!delta) return null;
  return (
    <span key={delta.key} className={`hino-tb-delta ${delta.value > 0 ? 'is-up' : 'is-down'}`}>
      {delta.value > 0 ? `+${formatScore(delta.value)}` : formatScore(delta.value)}
    </span>
  );
}

/** FLIP: เลื่อนตำแหน่งลื่นๆ เมื่อการ์ดย้ายช่องอันดับ */
function useFlipMove(deps: unknown[]) {
  const ref = useRef<HTMLDivElement>(null);
  const prevRect = useRef<DOMRect | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const next = el.getBoundingClientRect();
    const prev = prevRect.current;
    prevRect.current = next;
    if (!prev) return;
    const dx = prev.left - next.left;
    const dy = prev.top - next.top;
    const dw = prev.width / Math.max(next.width, 1);
    const dh = prev.height / Math.max(next.height, 1);
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(dw - 1) < 0.02 && Math.abs(dh - 1) < 0.02) {
      return;
    }
    el.animate(
      [
        {
          transform: `translate(${dx}px, ${dy}px) scale(${dw}, ${dh})`,
          offset: 0,
        },
        {
          transform: `translate(${dx * 0.18}px, ${dy * 0.18}px) scale(1.03)`,
          offset: 0.7,
        },
        { transform: 'translate(0, 0) scale(1)', offset: 1 },
      ],
      { duration: 780, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
    );
  }, deps);

  return ref;
}

function RankMascot({ place, celebrate }: { place: 1 | 2 | 3; celebrate?: boolean }) {
  return (
    <div className={`hino-mascot is-place-${place} ${celebrate ? 'is-celebrate' : ''}`} aria-hidden>
      <img src={RANK_MASCOTS[place]} alt="" className="hino-mascot-img" draggable={false} />
      <span className="hino-mascot-glow" />
    </div>
  );
}

function FireworkBurst({
  active,
  place,
  burstKey,
}: {
  active: boolean;
  place: 1 | 2 | 3 | 'last' | null;
  burstKey: number;
}) {
  const show = useMemo(() => {
    if (!active || !place) return null;

    const origins =
      place === 1
        ? [
            { left: 50, top: 38, wave: 0 },
            { left: 22, top: 48, wave: 0.28 },
            { left: 78, top: 46, wave: 0.42 },
            { left: 36, top: 28, wave: 0.7 },
            { left: 64, top: 26, wave: 0.85 },
            { left: 50, top: 55, wave: 1.15 },
          ]
        : place === 2
          ? [
              { left: 50, top: 40, wave: 0 },
              { left: 28, top: 50, wave: 0.32 },
              { left: 72, top: 48, wave: 0.48 },
              { left: 50, top: 30, wave: 0.85 },
            ]
          : place === 'last'
            ? [
                { left: 50, top: 48, wave: 0 },
                { left: 30, top: 58, wave: 0.25 },
                { left: 70, top: 56, wave: 0.4 },
              ]
            : [
              { left: 50, top: 42, wave: 0 },
              { left: 32, top: 52, wave: 0.35 },
              { left: 68, top: 50, wave: 0.55 },
            ];

    const perBurst = place === 1 ? 48 : place === 2 ? 38 : place === 'last' ? 28 : 30;
    const sparks = origins.flatMap((origin, oi) =>
      Array.from({ length: perBurst }, (_, i) => {
        const angle = (i / perBurst) * Math.PI * 2 + oi * 0.2;
        const dist = 18 + (i % 9) * 7 + (place === 1 ? 10 : 4) + (oi % 3) * 3;
        return {
          id: `${oi}-${i}`,
          left: origin.left,
          top: origin.top,
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist * 0.78 - 6,
          color: FIREWORK_COLORS[(i + oi * 3) % FIREWORK_COLORS.length],
          delay: origin.wave + (i % 10) * 0.018,
          size: 4 + (i % 5) * 2.2,
          spin: (i % 2 === 0 ? 1 : -1) * (220 + (i % 8) * 50),
          kind: i % 7 === 0 ? 'star' : i % 5 === 0 ? 'streak' : 'dot',
        };
      })
    );

    const fwColors =
      place === 'last'
        ? ['#8D6E63', '#BCAAA4', '#FFD54F', '#90A4AE', '#CC0000', '#FFE082', '#FFFFFF']
        : FIREWORK_COLORS;

    const rockets = Array.from({ length: place === 1 ? 10 : place === 2 ? 7 : place === 'last' ? 6 : 5 }, (_, i) => ({
      id: i,
      left: 10 + ((i * 17) % 80),
      delay: 0.05 + i * 0.09,
      height: 38 + (i % 5) * 8,
      color: fwColors[i % fwColors.length],
    }));

    const confetti = Array.from({ length: place === 1 ? 64 : place === 2 ? 48 : place === 'last' ? 40 : 36 }, (_, i) => ({
      id: i,
      left: 2 + ((i * 13) % 96),
      cx: -30 + ((i * 29) % 60),
      color: fwColors[i % fwColors.length],
      delay: 0.08 + (i % 14) * 0.07,
      rot: (i % 2 === 0 ? 1 : -1) * (140 + i * 21),
      w: 7 + (i % 4) * 3,
      h: 11 + (i % 5) * 3,
      shape: i % 3 === 0 ? 'circle' : i % 3 === 1 ? 'rect' : 'ribbon',
    }));

    const glitter = Array.from({ length: place === 1 ? 40 : place === 'last' ? 20 : 24 }, (_, i) => ({
      id: i,
      left: 5 + ((i * 23) % 90),
      top: 8 + ((i * 17) % 55),
      delay: 0.15 + (i % 12) * 0.08,
      color: fwColors[i % fwColors.length],
    }));

    // recolor sparks for last place
    const tintedSparks = sparks.map((s, i) => ({
      ...s,
      color: fwColors[i % fwColors.length],
    }));

    return { origins, sparks: tintedSparks, rockets, confetti, glitter };
  }, [active, place, burstKey]);

  if (!show || !place) return null;

  return (
    <div className={`hino-fw is-place-${place}`} aria-hidden>
      <div className="hino-fw-sky" />
      {show.rockets.map((r) => (
        <span
          key={`rk-${burstKey}-${r.id}`}
          className="hino-fw-rocket"
          style={{
            left: `${r.left}%`,
            ['--h' as string]: `${r.height}vh`,
            ['--c' as string]: r.color,
            ['--d' as string]: `${r.delay}s`,
          }}
        />
      ))}
      {show.origins.map((o, i) => (
        <div
          key={`ori-${burstKey}-${i}`}
          className="hino-fw-origin"
          style={{
            left: `${o.left}%`,
            top: `${o.top}%`,
            ['--d' as string]: `${o.wave}s`,
          }}
        >
          <span className="hino-fw-flash" />
          {[0, 1, 2, 3].map((ring) => (
            <span
              key={`ring-${i}-${ring}`}
              className={`hino-fw-ring r${ring + 1}`}
              style={{ animationDelay: `${o.wave + ring * 0.1}s` }}
            />
          ))}
        </div>
      ))}
      {show.sparks.map((p) => (
        <span
          key={`sp-${burstKey}-${p.id}`}
          className={`hino-fw-spark is-${p.kind}`}
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            ['--x' as string]: `${p.x}vmin`,
            ['--y' as string]: `${p.y}vmin`,
            ['--c' as string]: p.color,
            ['--d' as string]: `${p.delay}s`,
            ['--s' as string]: `${p.size}px`,
            ['--spin' as string]: `${p.spin}deg`,
          }}
        />
      ))}
      {show.glitter.map((g) => (
        <span
          key={`gl-${burstKey}-${g.id}`}
          className="hino-fw-glitter"
          style={{
            left: `${g.left}%`,
            top: `${g.top}%`,
            ['--c' as string]: g.color,
            ['--d' as string]: `${g.delay}s`,
          }}
        />
      ))}
      {show.confetti.map((c) => (
        <span
          key={`cf-${burstKey}-${c.id}`}
          className={`hino-fw-confetti is-${c.shape}`}
          style={{
            left: `${c.left}%`,
            width: `${c.w}px`,
            height: `${c.h}px`,
            ['--cx' as string]: `${c.cx}vw`,
            ['--c' as string]: c.color,
            ['--d' as string]: `${c.delay}s`,
            ['--rot' as string]: `${c.rot}deg`,
          }}
        />
      ))}
    </div>
  );
}

function PodiumCard({
  team,
  place,
  slideFrom,
  justRevealed,
  maxScore,
}: {
  team: RankedTeambuildingTeam;
  place: 1 | 2 | 3;
  slideFrom: 'up' | 'left' | 'right';
  justRevealed: boolean;
  maxScore: number;
}) {
  const [runKey, setRunKey] = useState(1);
  const wasRevealed = useRef(false);
  const countDuration = place === 1 ? 2600 : place === 2 ? 2200 : 2000;
  const shown = useAnimatedNumber(team.score, countDuration, runKey);
  const counting = Math.abs(shown - team.score) > 0.08;
  // หลอดวิ่งตามเลขที่นับทุกเฟรม (0 → คะแนนทีม = 0% → 100%)
  const fillPct =
    team.score > 0 ? Math.max(0, Math.min(100, (shown / team.score) * 100)) : 0;
  const rankPct =
    maxScore > 0 ? Math.max(0, Math.min(100, (shown / maxScore) * 100)) : fillPct;
  const prevPlace = useRef(place);
  const [rankShift, setRankShift] = useState<'up' | 'down' | null>(null);
  const [scoreBump, setScoreBump] = useState(false);
  const prevScore = useRef(team.score);
  const flipRef = useFlipMove([place, team.id]);

  useEffect(() => {
    if (justRevealed && wasRevealed.current) {
      setRunKey((k) => k + 1);
    }
    wasRevealed.current = justRevealed;
  }, [justRevealed]);

  useEffect(() => {
    if (prevPlace.current !== place) {
      setRankShift(place < prevPlace.current ? 'up' : 'down');
      prevPlace.current = place;
      setRunKey((k) => k + 1);
      const t = window.setTimeout(() => setRankShift(null), 900);
      return () => window.clearTimeout(t);
    }
  }, [place]);

  useEffect(() => {
    if (prevScore.current === team.score) return;
    prevScore.current = team.score;
    setScoreBump(true);
    const t = window.setTimeout(() => setScoreBump(false), 700);
    return () => window.clearTimeout(t);
  }, [team.score]);

  return (
    <div
      ref={flipRef}
      className={`hino-podium-slot is-${place} ${rankShift ? `is-shift-${rankShift}` : ''}`}
    >
      <RankMascot place={place} celebrate={justRevealed} />
      <article
        className={`hino-podium-card is-place-${place} ${justRevealed ? `slide-${slideFrom}` : ''} ${
          rankShift ? 'is-rank-move' : ''
        } ${scoreBump ? 'is-score-bump' : ''} ${counting ? 'is-counting' : ''}`}
        style={{ ['--team' as string]: team.color || HINO_RED }}
        aria-label={`อันดับ ${place} ${team.name}`}
      >
        {place === 1 && (
          <div className="hino-podium-crown" aria-hidden>
            <svg viewBox="0 0 64 40" className="hino-podium-crown-svg">
              <path d="M6 32 L10 14 L22 26 L32 8 L42 26 L54 14 L58 32 Z" fill="currentColor" />
              <rect x="6" y="32" width="52" height="6" rx="1.5" fill="currentColor" />
            </svg>
          </div>
        )}
        <div className={`hino-podium-rank ${rankShift ? 'is-flip' : ''}`} aria-hidden>
          {place}
        </div>
        <p className="hino-podium-label">อันดับ {place}</p>
        <h3 className="hino-podium-name">{team.name}</h3>
        <div className="hino-podium-score-wrap">
          <ScoreDelta score={team.score} />
          <span className={`hino-podium-score ${scoreBump || counting ? 'is-pulse' : ''} ${counting ? 'is-running' : ''}`}>
            {formatRunningScore(shown, team.score)}
          </span>
          <span className="hino-podium-pts">PTS</span>
        </div>
        <div
          className={`hino-podium-base ${counting ? 'is-sliding' : ''}`}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={Math.round(team.score)}
          aria-valuenow={Math.round(shown)}
          aria-label="แถบคะแนน"
        >
          <div className="hino-podium-base-track">
            <div
              className="hino-podium-base-fill"
              style={{ transform: `scaleX(${fillPct / 100})` }}
            />
            <span
              className="hino-podium-base-knob"
              style={{ left: `${fillPct}%` }}
            />
          </div>
          <div className="hino-podium-base-meta" aria-hidden>
            <span>{formatRunningScore(shown, team.score)}</span>
            <span>{Math.round(rankPct)}%</span>
          </div>
        </div>
        {rankShift && (
          <span className={`hino-podium-move-badge is-${rankShift}`} aria-hidden>
            {rankShift === 'up' ? '↑' : '↓'}
          </span>
        )}
      </article>
    </div>
  );
}

function RestCard({
  team,
  index,
  maxScore,
}: {
  team: RankedTeambuildingTeam;
  index: number;
  maxScore: number;
}) {
  const shown = useAnimatedNumber(team.score, 1100 + Math.min(index, 8) * 40, 1);
  const counting = Math.abs(shown - team.score) > 0.08;
  const fillPct =
    team.score > 0 ? Math.max(0, Math.min(100, (shown / team.score) * 100)) : 0;
  const flipRef = useFlipMove([team.rank, index, team.id]);
  const prevRank = useRef(team.rank);
  const [moved, setMoved] = useState(false);

  useEffect(() => {
    if (prevRank.current === team.rank) return;
    prevRank.current = team.rank;
    setMoved(true);
    const t = window.setTimeout(() => setMoved(false), 800);
    return () => window.clearTimeout(t);
  }, [team.rank]);

  return (
    <div
      ref={flipRef}
      className={`hino-rest-card ${moved ? 'is-rank-move' : ''} ${counting ? 'is-counting' : ''}`}
      style={{
        ['--team' as string]: team.color || HINO_RED,
        animationDelay: `${Math.min(index, 12) * 0.04}s`,
      }}
    >
      <span className="hino-rest-rank">{team.rank}</span>
      <div className="hino-rest-main">
        <span className="hino-rest-name">{team.name}</span>
        <div className="hino-rest-bar" aria-hidden>
          <span
            className="hino-rest-bar-fill"
            style={{ transform: `scaleX(${fillPct / 100})` }}
          />
        </div>
      </div>
      <span className={`hino-rest-score ${counting ? 'is-running' : ''}`}>
        {formatRunningScore(shown, team.score)}
      </span>
    </div>
  );
}

type RevealStage = number;

function getRevealPlan(teams: RankedTeambuildingTeam[]) {
  const top3 = teams.slice(0, 3);
  const first = top3[0];
  const second = top3[1];
  const third = top3[2];
  const revealOrder: { team: RankedTeambuildingTeam; place: 1 | 2 | 3; slideFrom: 'up' | 'left' | 'right' }[] = [];
  if (third) revealOrder.push({ team: third, place: 3, slideFrom: 'right' });
  if (second) revealOrder.push({ team: second, place: 2, slideFrom: 'left' });
  if (first) revealOrder.push({ team: first, place: 1, slideFrom: 'up' });

  const topRevealCount = revealOrder.length;
  const booby = teams.length >= 2 ? teams[teams.length - 1] : null;
  const middleRest = booby ? teams.slice(3).filter((t) => t.id !== booby.id) : teams.slice(3);
  const hasMiddle = middleRest.length > 0;
  const hasBooby = Boolean(booby);
  // หลัง 3→2→1 เปิดบ๊วยก่อน แล้วค่อยอันดับที่เหลือ
  const boobyStage = hasBooby ? topRevealCount + 1 : null;
  const middleStage = hasMiddle ? topRevealCount + (hasBooby ? 1 : 0) + 1 : null;
  const maxStage = middleStage ?? boobyStage ?? topRevealCount;

  return {
    revealOrder,
    topRevealCount,
    middleRest,
    booby,
    hasMiddle,
    hasBooby,
    middleStage,
    boobyStage,
    maxStage,
  };
}

function BoobyCard({
  team,
  justRevealed,
}: {
  team: RankedTeambuildingTeam;
  maxScore: number;
  justRevealed: boolean;
}) {
  const shown = useAnimatedNumber(team.score, 2200, justRevealed ? 2 : 1);
  const counting = Math.abs(shown - team.score) > 0.08;
  const fillPct = team.score > 0 ? Math.max(0, Math.min(100, (shown / team.score) * 100)) : 0;

  return (
    <aside
      className={`hino-booby ${justRevealed ? 'is-in' : ''} ${counting ? 'is-counting' : ''}`}
      style={{ ['--team' as string]: team.color || '#8D6E63' }}
      aria-label={`อันดับบ๊วย ${team.name}`}
    >
      <div className={`hino-mascot is-place-last ${justRevealed ? 'is-celebrate' : ''}`} aria-hidden>
        <img src={BOOBY_MASCOT} alt="" className="hino-mascot-img" draggable={false} />
        <span className="hino-mascot-glow" />
      </div>
      <div className="hino-booby-card">
        <p className="hino-booby-badge">อันดับบ๊วย</p>
        <div className="hino-booby-rank" aria-hidden>
          {team.rank}
        </div>
        <h3 className="hino-booby-name">{team.name}</h3>
        <p className="hino-booby-sub">LAST PLACE · SPIRIT AWARD</p>
        <div className="hino-booby-score-wrap">
          <span className={`hino-booby-score ${counting ? 'is-running' : ''}`}>
            {formatRunningScore(shown, team.score)}
          </span>
          <span className="hino-booby-pts">PTS</span>
        </div>
        <div className="hino-booby-bar" aria-hidden>
          <span className="hino-booby-bar-fill" style={{ transform: `scaleX(${fillPct / 100})` }} />
        </div>
        <p className="hino-booby-note">สู้ต่อไปนะ — หัวใจแชมป์ไม่แพ้ใคร</p>
      </div>
    </aside>
  );
}

function RevealBoard({
  teams,
  stage,
  onAdvance,
  onBack,
  onReset,
  onPlaySfx,
}: {
  teams: RankedTeambuildingTeam[];
  stage: RevealStage;
  onAdvance: () => void;
  onBack: () => void;
  onReset: () => void;
  onPlaySfx: (kind: SfxKind) => void;
}) {
  const plan = useMemo(() => getRevealPlan(teams), [teams]);
  const {
    revealOrder,
    topRevealCount,
    middleRest,
    booby,
    hasMiddle,
    hasBooby,
    middleStage,
    boobyStage,
    maxStage,
  } = plan;

  const prevStage = useRef(stage);
  const [freshPlaces, setFreshPlaces] = useState<Set<number>>(() => new Set());
  const [firework, setFirework] = useState<{ place: 1 | 2 | 3 | 'last'; key: number } | null>(null);
  const [boobyFresh, setBoobyFresh] = useState(false);

  useEffect(() => {
    const prev = prevStage.current;
    prevStage.current = stage;
    if (stage > prev && stage >= 1 && stage <= revealOrder.length) {
      const place = revealOrder[stage - 1]?.place;
      if (place) {
        setFreshPlaces(new Set([place]));
        setFirework({ place, key: Date.now() });
        onPlaySfx(place === 1 ? 'reveal1' : place === 2 ? 'reveal2' : 'reveal3');
      }
      const t = window.setTimeout(() => setFreshPlaces(new Set()), 1400);
      const t2 = window.setTimeout(() => setFirework(null), 4200);
      return () => {
        window.clearTimeout(t);
        window.clearTimeout(t2);
      };
    }
    if (stage > prev && hasBooby && stage === boobyStage) {
      setBoobyFresh(true);
      setFirework({ place: 'last', key: Date.now() });
      onPlaySfx('booby');
      const t = window.setTimeout(() => setBoobyFresh(false), 1600);
      const t2 = window.setTimeout(() => setFirework(null), 4200);
      return () => {
        window.clearTimeout(t);
        window.clearTimeout(t2);
      };
    }
    if (stage > prev && hasMiddle && stage === middleStage) {
      onPlaySfx('rest');
    }
    if (stage < prev) {
      setFreshPlaces(new Set());
      setFirework(null);
      setBoobyFresh(false);
    }
  }, [stage, revealOrder, hasBooby, boobyStage, hasMiddle, middleStage, onPlaySfx]);

  const boardMaxScore = useMemo(() => {
    if (teams.length === 0) return 1;
    return Math.max(1, ...teams.map((t) => t.score));
  }, [teams]);

  const podiumEntries = useMemo(() => {
    if (stage < 1) return [];
    return revealOrder.slice(0, Math.min(stage, revealOrder.length));
  }, [stage, revealOrder]);

  const showMiddle = hasMiddle && middleStage != null && stage >= middleStage;
  const showBooby = hasBooby && boobyStage != null && stage >= boobyStage && booby;

  const nextHint =
    stage >= maxStage
      ? 'ครบแล้ว — กด RESET เพื่อเริ่มใหม่'
      : stage < topRevealCount
        ? `กดเพื่อเปิด อันดับ ${revealOrder[stage]?.place}`
        : hasBooby && stage + 1 === boobyStage
          ? 'กดเพื่อเปิด อันดับบ๊วย'
          : hasMiddle && stage + 1 === middleStage
            ? 'กดเพื่อเปิดอันดับที่เหลือ'
            : 'กดขั้นถัดไป';

  return (
    <div className="hino-orbit-stage">
      <OrbitSpectacle teams={teams} active={stage >= 1} />
      <FireworkBurst
        active={Boolean(firework)}
        place={firework?.place ?? null}
        burstKey={firework?.key ?? 0}
      />
      <div
        className={`hino-reveal-board stage-${stage} hino-reveal-enter`}
        role="button"
        tabIndex={0}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('[data-reveal-ctrl]')) return;
          if (stage < maxStage) onAdvance();
        }}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') {
            e.preventDefault();
            if (stage < maxStage) onAdvance();
          } else if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
            e.preventDefault();
            onBack();
          } else if (e.key === 'r' || e.key === 'R') {
            e.preventDefault();
            onReset();
          }
        }}
        aria-label={nextHint}
      >
        <div className="hino-reveal-hint" aria-live="polite">
          <span className="hino-reveal-hint-step">
            {stage === 0
              ? 'READY'
              : stage >= maxStage
                ? 'COMPLETE'
                : `STEP ${stage}/${maxStage}`}
          </span>
          <span className="hino-reveal-hint-text">{nextHint}</span>
          <span className="hino-reveal-hint-keys">SPACE / ENTER · ← ย้อน · R รีเซ็ต · ESC กลับหน้ารอ</span>
        </div>

        <div className="hino-reveal-controls" data-reveal-ctrl>
          <button type="button" className="hino-reveal-btn" onClick={onBack} disabled={stage === 0}>
            ← BACK
          </button>
          <button
            type="button"
            className="hino-reveal-btn is-primary"
            onClick={onAdvance}
            disabled={stage >= maxStage}
          >
            {stage >= maxStage ? 'DONE' : 'NEXT →'}
          </button>
          <button type="button" className="hino-reveal-btn" onClick={onReset}>
            RESET
          </button>
        </div>

        <div className={`hino-podium-area ${showBooby ? 'has-booby' : ''}`}>
          {stage === 0 && (
            <div className="hino-reveal-ready">
              <div className="hino-reveal-ready-orbit" aria-hidden>
                <span />
                <span />
                <span />
              </div>
              <p className="hino-reveal-ready-kicker">ORBITAL SCORE REVEAL</p>
              <h2 className="hino-reveal-ready-title">พร้อมเปิดอันดับ</h2>
              <p className="hino-reveal-ready-sub">
                กด NEXT / SPACE / ENTER เพื่อเลื่อนเปิดอันดับ 3 → 2 → 1
                {hasBooby ? ' → บ๊วย' : ''}
                {hasMiddle ? ' → ที่เหลือ' : ''}
              </p>
              <p className="hino-reveal-ready-audio">มีเสียงเอฟเฟกต์ตอนเปิดแต่ละอันดับ</p>
              <div className="hino-reveal-ready-pulse" aria-hidden />
            </div>
          )}

          {stage >= 1 && (
            <div className={`hino-podium-grid show-count-${Math.min(3, Math.max(1, topRevealCount))} is-live-move`}>
              {podiumEntries.map(({ team, place, slideFrom }) => (
                <PodiumCard
                  key={team.id}
                  team={team}
                  place={place}
                  slideFrom={slideFrom}
                  justRevealed={freshPlaces.has(place)}
                  maxScore={boardMaxScore}
                />
              ))}
            </div>
          )}

          {showBooby && booby && (
            <BoobyCard team={booby} maxScore={boardMaxScore} justRevealed={boobyFresh} />
          )}
        </div>

        {showMiddle && middleRest.length > 0 && (
          <section className="hino-rest-strip" aria-label="อันดับที่เหลือ">
            <div className="hino-rest-head">
              <span>อันดับที่เหลือ</span>
              <span className="hino-rest-count">{middleRest.length} ทีม</span>
            </div>
            <div className="hino-rest-list">
              {middleRest.map((team, i) => (
                <RestCard key={team.id} team={team} index={i} maxScore={boardMaxScore} />
              ))}
            </div>
          </section>
        )}

        {stage >= 1 && stage >= maxStage && !hasMiddle && !hasBooby && (
          <p className="hino-reveal-done-note">แสดงครบทุกทีมแล้ว</p>
        )}
      </div>
    </div>
  );
}

const TeambuildingScoreboardPage: React.FC = () => {
  const [teams, setTeams] = useState<TeambuildingTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [liveConnected, setLiveConnected] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [revealStage, setRevealStage] = useState<RevealStage>(0);
  const [boardEntered, setBoardEntered] = useState(false);
  const { muted, playBgm, playSfx, toggleMute, setBgmVolume } = useScoreboardAudio();

  const loadTeams = useCallback(async (options?: { silent?: boolean }) => {
    if (!isSupabaseConfigured) {
      setError('ยังไม่ได้ตั้งค่า Supabase');
      setLoading(false);
      return;
    }
    if (!options?.silent) setLoading(true);
    const { data, error: fetchError } = await supabase
      .from(TEAMBUILDING_TEAMS_TABLE)
      .select(TEAMBUILDING_SELECT)
      .eq('is_active', true);
    if (!options?.silent) setLoading(false);
    if (fetchError) {
      setError(
        isTeambuildingTableMissingError(fetchError.message)
          ? 'ยังไม่มีตารางทีม — ให้แอดมินตั้งค่าในหน้า Admin ก่อน'
          : fetchError.message
      );
      return;
    }
    setError('');
    setTeams(((data as Record<string, unknown>[]) || []).map(mapTeambuildingRow));
  }, []);

  useEffect(() => {
    void loadTeams();
    if (!isSupabaseConfigured) return;
    const refresh = () => void loadTeams({ silent: true });
    const channel = supabase
      .channel('teambuilding-scoreboard-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: TEAMBUILDING_TEAMS_TABLE }, refresh)
      .subscribe((status) => setLiveConnected(status === 'SUBSCRIBED'));
    const pollId = window.setInterval(refresh, 6000);
    return () => {
      window.clearInterval(pollId);
      setLiveConnected(false);
      void supabase.removeChannel(channel);
    };
  }, [loadTeams]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.();
  };

  const ranked = useMemo(() => rankTeams(teams), [teams]);
  const maxScore = useMemo(() => Math.max(0, ...ranked.map((t) => t.score)), [ranked]);

  const maxStage = useMemo(() => getRevealPlan(ranked).maxStage, [ranked]);

  useEffect(() => {
    if (maxScore <= 0) {
      setRevealStage(0);
      setBoardEntered(false);
      return;
    }
    setRevealStage((s) => (s > maxStage ? maxStage : s));
  }, [maxScore, maxStage]);

  const enterBoard = useCallback(() => {
    if (maxScore <= 0) return;
    setBgmVolume(0.34);
    void playBgm();
    playSfx('enter');
    setRevealStage(0);
    setBoardEntered(true);
  }, [maxScore, playBgm, playSfx, setBgmVolume]);

  const exitBoard = useCallback(() => {
    setBoardEntered(false);
    setRevealStage(0);
    setBgmVolume(0.42);
    void playBgm();
  }, [playBgm, setBgmVolume]);

  useEffect(() => {
    if (!boardEntered) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        exitBoard();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [boardEntered, exitBoard]);

  const advance = useCallback(() => {
    setRevealStage((s) => (s < maxStage ? ((s + 1) as RevealStage) : s));
  }, [maxStage]);

  const back = useCallback(() => {
    setRevealStage((s) => (s > 0 ? ((s - 1) as RevealStage) : s));
  }, []);

  const reset = useCallback(() => setRevealStage(0), []);

  return (
    <div className="hino-tb-stage relative flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden text-[#1A1A1A]">
      <div className="hino-tb-bg pointer-events-none absolute inset-0" aria-hidden />
      <div className="hino-tb-pattern pointer-events-none absolute inset-0" aria-hidden />
      <div className="hino-tb-glow pointer-events-none absolute -left-[10%] top-[-8%] h-[42vh] w-[48vw] rounded-full" aria-hidden />
      <div className="hino-tb-redline pointer-events-none absolute inset-x-0 top-0 h-[0.55vh]" aria-hidden />

      <header className="hino-tb-header relative z-20 flex shrink-0 items-center justify-between gap-2 border-b border-[#D8D8D8] bg-white/90 px-[clamp(0.5rem,2vw,2rem)] py-[clamp(0.35rem,1.2vh,0.9rem)] backdrop-blur-sm">
        <div className="flex min-w-0 flex-1 items-center gap-[clamp(0.4rem,1vw,1rem)]">
          <img
            src={HINO_LOGO}
            alt="Hino Motors Manufacturing (Thailand)"
            className="hino-tb-logo h-[clamp(1.35rem,4vh,2.6rem)] w-auto max-w-[28vw] object-contain object-left"
          />
          <span className="hidden h-[2.2vh] w-px shrink-0 bg-[#D0D0D0] sm:block" />
          <div className="min-w-0">
            <p className="hino-tb-kicker hidden truncate text-[clamp(0.55rem,1vw,0.8rem)] font-bold uppercase tracking-[0.22em] text-[#CC0000] sm:block">
              Hino Motors Manufacturing (Thailand) Ltd.
            </p>
            <h1 className="truncate text-[clamp(0.9rem,2.2vw,1.85rem)] font-black leading-none tracking-tight text-[#1A1A1A]">
              Teambuilding Scoreboard
            </h1>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`flex items-center gap-2 rounded-md px-2.5 py-1 text-[clamp(0.55rem,0.85vw,0.75rem)] font-bold tracking-[0.18em] ${
              liveConnected
                ? 'border border-[#CC0000]/35 bg-[#CC0000]/08 text-[#CC0000]'
                : 'border border-[#CFCFCF] text-[#4D4D4D]'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${liveConnected ? 'hino-tb-live-dot bg-[#CC0000]' : 'bg-[#9A9A9A]'}`}
            />
            {liveConnected ? 'LIVE' : 'SYNC'}
          </span>
          <button
            type="button"
            onClick={() => {
              void playBgm();
              toggleMute();
            }}
            className="rounded-md border border-[#CFCFCF] bg-white px-2.5 py-1 text-[clamp(0.55rem,0.85vw,0.75rem)] font-bold tracking-[0.14em] text-[#4D4D4D] transition hover:border-[#CC0000] hover:bg-[#CC0000] hover:text-white"
            aria-label={muted ? 'เปิดเสียง' : 'ปิดเสียง'}
          >
            {muted ? 'UNMUTE' : 'MUTE'}
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="rounded-md border border-[#CFCFCF] bg-white px-2.5 py-1 text-[clamp(0.55rem,0.85vw,0.75rem)] font-bold tracking-[0.14em] text-[#4D4D4D] transition hover:border-[#CC0000] hover:bg-[#CC0000] hover:text-white"
          >
            {isFullscreen ? 'EXIT' : 'FULLSCREEN'}
          </button>
        </div>
      </header>

      <main className="hino-tb-main relative z-10 min-h-0 flex-1 overflow-hidden">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="hino-tb-spinner h-[7.5vmin] w-[7.5vmin] rounded-full border-4" />
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center p-4">
            <p className="rounded-xl border border-[#CC0000]/40 bg-white px-6 py-5 text-[clamp(0.95rem,1.6vw,1.4rem)] font-semibold text-[#CC0000] shadow-sm">
              {error}
            </p>
          </div>
        ) : !boardEntered ? (
          <ShowcaseIdle
            teams={ranked}
            canEnter={maxScore > 0}
            onEnter={enterBoard}
            onStartMusic={playBgm}
          />
        ) : (
          <RevealBoard
            teams={ranked}
            stage={revealStage}
            onAdvance={advance}
            onBack={back}
            onReset={reset}
            onPlaySfx={playSfx}
          />
        )}
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@600;700;800;900&family=Barlow+Condensed:wght@600;700;800&display=swap');

        .hino-tb-stage {
          --hino-red: ${HINO_RED};
          --hino-gray: ${HINO_GRAY};
          --stage-pad-x: clamp(0.4rem, 1.2vw, 1rem);
          --stage-pad-y: clamp(0.3rem, 0.9vh, 0.7rem);
          background: #F3F3F3;
          font-family: "Noto Sans Thai", "Sarabun", "Anuphan", ui-sans-serif, system-ui, sans-serif;
          width: 100%;
          max-width: 100vw;
          box-sizing: border-box;
        }
        .hino-tb-stage *, .hino-tb-stage *::before, .hino-tb-stage *::after { box-sizing: border-box; }
        .hino-tb-logo, .hino-podium-rank, .hino-podium-score, .hino-rest-rank, .hino-rest-score {
          font-family: "Barlow Condensed", "Noto Sans Thai", sans-serif;
        }
        .hino-tb-bg {
          background:
            radial-gradient(ellipse 55% 40% at 0% 0%, rgba(204,0,0,0.10), transparent 60%),
            radial-gradient(ellipse 45% 35% at 100% 100%, rgba(77,77,77,0.08), transparent 55%),
            linear-gradient(180deg, #FAFAFA 0%, #F0F0F0 55%, #EAEAEA 100%);
        }
        .hino-tb-pattern {
          opacity: 0.3;
          background-image:
            linear-gradient(rgba(77,77,77,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(77,77,77,0.06) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: linear-gradient(180deg, #000 0%, transparent 88%);
          animation: hinoTbGridDrift 28s linear infinite;
        }
        .hino-tb-glow {
          background: radial-gradient(ellipse at center, rgba(204,0,0,0.14), transparent 68%);
          filter: blur(18px);
          animation: hinoTbGlow 6s ease-in-out infinite;
        }
        .hino-tb-redline {
          background: linear-gradient(90deg, #CC0000 0%, #FF4D4D 35%, #CC0000 70%, #990000 100%);
          background-size: 220% 100%;
          animation: hinoTbShimmer 3.8s ease-in-out infinite;
        }
        .hino-tb-header { animation: hinoTbHeaderIn 0.7s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .hino-tb-logo { animation: hinoTbLogoIn 0.8s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .hino-tb-kicker { animation: hinoTbPulseSoft 2.8s ease-in-out infinite; }
        .hino-tb-live-dot { animation: hinoTbPulse 1.4s ease-in-out infinite; }
        .hino-tb-spinner {
          animation: hinoTbSpin 0.9s linear infinite;
          border-color: rgba(77,77,77,0.18);
          border-top-color: #CC0000;
        }
        .hino-tb-delta {
          position: absolute;
          top: -1.1em;
          right: 0;
          border-radius: 8px;
          padding: 0.15em 0.5em;
          font-size: 0.45em;
          font-weight: 900;
          animation: hinoTbPop 1.8s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .hino-tb-delta.is-up { background: #CC0000; color: #fff; }
        .hino-tb-delta.is-down { background: #4D4D4D; color: #fff; }

        /* —— Orbital spectacle (ranking page) —— */
        .hino-tb-main {
          padding: var(--stage-pad-y) var(--stage-pad-x);
        }
        .hino-orbit-stage {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 0;
          overflow: hidden;
          border-radius: clamp(10px, 1.5vw, 18px);
          container-type: size;
          container-name: orbit-stage;
        }
        .hino-orbit-fx {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.55;
          transition: opacity 0.6s ease;
          z-index: 0;
        }
        .hino-orbit-fx.is-on { opacity: 1; }
        .hino-orbit-fx-glow {
          position: absolute;
          left: 50%;
          top: 48%;
          width: min(70vmin, 70%);
          height: min(70vmin, 70%);
          transform: translate(-50%, -50%);
          border-radius: 50%;
          background: radial-gradient(circle, rgba(204,0,0,0.2) 0%, rgba(204,0,0,0.06) 42%, transparent 70%);
          animation: hinoTbGlow 5s ease-in-out infinite;
        }
        .hino-orbit-fx-ring {
          position: absolute;
          left: 50%;
          top: 48%;
          border-radius: 50%;
          border: 2px solid rgba(204,0,0,0.18);
          transform: translate(-50%, -50%);
        }
        .hino-orbit-fx-ring.r1 { width: min(28vmin, 32%); height: min(28vmin, 32%); border-width: 3px; animation: hinoShowSpin 18s linear infinite; }
        .hino-orbit-fx-ring.r2 { width: min(46vmin, 50%); height: min(46vmin, 50%); border-color: rgba(77,77,77,0.14); animation: hinoShowSpin 28s linear infinite reverse; }
        .hino-orbit-fx-ring.r3 { width: min(66vmin, 70%); height: min(66vmin, 70%); border-style: dashed; border-color: rgba(204,0,0,0.16); animation: hinoShowSpin 40s linear infinite; }
        .hino-orbit-fx-ring.r4 { width: min(86vmin, 90%); height: min(86vmin, 90%); border-color: rgba(77,77,77,0.1); border-width: 1px; animation: hinoShowSpin 56s linear infinite reverse; }
        .hino-orbit-fx-ring::before {
          content: "";
          position: absolute;
          top: -5px;
          left: 50%;
          width: 10px;
          height: 10px;
          margin-left: -5px;
          border-radius: 50%;
          background: #CC0000;
          box-shadow: 0 0 16px rgba(204,0,0,0.55);
        }
        .hino-orbit-fx-ring.r2::before { background: #4D4D4D; box-shadow: 0 0 12px rgba(77,77,77,0.35); }
        .hino-orbit-fx-beam {
          position: absolute;
          inset: -30% -15%;
          background: linear-gradient(118deg, transparent 44%, rgba(204,0,0,0.08) 50%, transparent 56%);
          animation: hinoShowBeam 8s ease-in-out infinite;
        }
        .hino-orbit-fx-beam.b2 { animation-delay: 4s; opacity: 0.65; }
        .hino-orbit-fx-core {
          position: absolute;
          left: 50%;
          top: 48%;
          width: min(10vmin, 10%);
          height: min(10vmin, 10%);
          transform: translate(-50%, -50%);
          border-radius: 50%;
          background: radial-gradient(circle, rgba(204,0,0,0.35), transparent 70%);
          animation: hinoOrbitCore 2.8s ease-in-out infinite;
        }
        .hino-orbit-fx-spark {
          position: absolute;
          left: 50%;
          top: 48%;
          width: 7px;
          height: 7px;
          margin: -3.5px;
          border-radius: 50%;
          background: var(--c);
          box-shadow: 0 0 10px color-mix(in srgb, var(--c) 60%, transparent);
          animation: hinoOrbitSpark 6.5s linear infinite;
          animation-delay: calc(var(--i) * -0.35s);
          offset-path: none;
          transform: rotate(calc(var(--i) * 20deg)) translateX(min(34vmin, 36%)) scale(0.7);
          opacity: 0.55;
        }
        .hino-orbit-fx.is-on .hino-orbit-fx-spark {
          animation-name: hinoOrbitSparkLive;
        }

        /* —— Reveal board —— */
        .hino-reveal-board {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          width: 100%;
          height: 100%;
          min-height: 0;
          gap: clamp(0.25rem, 0.8vh, 0.65rem);
          outline: none;
          cursor: pointer;
          user-select: none;
          padding: clamp(0.25rem, 0.7vh, 0.55rem);
        }
        .hino-reveal-enter {
          animation: hinoBoardEnter 0.85s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .hino-reveal-hint {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.35rem 0.75rem;
          flex-shrink: 0;
          max-width: 100%;
          padding: clamp(0.3rem, 0.7vh, 0.45rem) clamp(0.5rem, 1vw, 0.85rem);
          border-radius: 12px;
          background: rgba(255,255,255,0.88);
          border: 1px solid #E2E2E2;
        }
        .hino-reveal-hint-step {
          font-family: "Barlow Condensed", sans-serif;
          font-weight: 800;
          font-size: clamp(0.65rem, 1.1vw + 0.2vh, 1rem);
          letter-spacing: 0.12em;
          color: #CC0000;
        }
        .hino-reveal-hint-text {
          flex: 1 1 8rem;
          min-width: 0;
          font-weight: 800;
          font-size: clamp(0.7rem, 1.1vw + 0.25vh, 1.05rem);
          color: #1A1A1A;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .hino-reveal-hint-keys {
          font-size: clamp(0.55rem, 0.9vw + 0.15vh, 0.8rem);
          font-weight: 700;
          letter-spacing: 0.06em;
          color: #6B6B6B;
        }
        .hino-reveal-controls {
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem;
          flex-shrink: 0;
          max-width: 100%;
        }
        .hino-reveal-btn {
          border-radius: 10px;
          border: 1px solid #CFCFCF;
          background: #fff;
          padding: clamp(0.3rem, 0.7vh, 0.45rem) clamp(0.55rem, 1.1vw, 0.9rem);
          font-size: clamp(0.62rem, 0.95vw + 0.15vh, 0.85rem);
          font-weight: 800;
          letter-spacing: 0.1em;
          color: #4D4D4D;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s, color 0.2s, opacity 0.2s;
        }
        .hino-reveal-btn:hover:not(:disabled) {
          border-color: #CC0000;
          color: #CC0000;
        }
        .hino-reveal-btn.is-primary {
          background: #CC0000;
          border-color: #CC0000;
          color: #fff;
        }
        .hino-reveal-btn.is-primary:hover:not(:disabled) {
          background: #990000;
          color: #fff;
        }
        .hino-reveal-btn:disabled {
          opacity: 0.4;
          cursor: default;
        }

        .hino-podium-area {
          position: relative;
          flex: 1 1 auto;
          min-height: 0;
          display: flex;
          align-items: stretch;
          justify-content: center;
          overflow: hidden;
          width: 100%;
          gap: clamp(0.4rem, 1.2vw, 1rem);
        }
        .hino-podium-area.has-booby {
          align-items: flex-end;
        }
        .hino-podium-area.has-booby .hino-podium-grid {
          flex: 1 1 auto;
          min-width: 0;
        }
        .hino-booby {
          position: relative;
          z-index: 4;
          flex: 0 0 auto;
          width: min(28vw, 260px);
          max-width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          gap: 0;
          margin-bottom: 0.2rem;
        }
        .hino-booby.is-in {
          animation: hinoSlideUp 0.85s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .hino-booby .hino-mascot {
          margin-bottom: -1.1rem;
          z-index: 2;
        }
        .hino-booby-card {
          position: relative;
          z-index: 1;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: clamp(1.5rem, 3vh, 2.1rem) clamp(0.7rem, 1.3vw, 1.1rem) 0.85rem;
          border-radius: 22px;
          border: 2px solid color-mix(in srgb, var(--team) 40%, #D7CCC8);
          background: linear-gradient(180deg, #ffffff 0%, #faf6f2 100%);
          box-shadow: 0 12px 28px rgba(26,26,26,0.1);
        }
        .hino-booby-badge {
          padding: 0.2rem 0.7rem;
          border-radius: 999px;
          background: #8D6E63;
          color: #fff;
          font-size: clamp(0.65rem, 1.1vh, 0.85rem);
          font-weight: 900;
          letter-spacing: 0.14em;
        }
        .hino-booby-rank {
          margin-top: 0.45rem;
          width: clamp(2.2rem, 5vh, 3.2rem);
          height: clamp(2.2rem, 5vh, 3.2rem);
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: color-mix(in srgb, var(--team) 75%, #8D6E63);
          color: #fff;
          font-family: "Barlow Condensed", "Noto Sans Thai", sans-serif;
          font-weight: 900;
          font-size: clamp(1.2rem, 2.8vh, 1.9rem);
        }
        .hino-booby-name {
          margin-top: 0.35rem;
          width: 100%;
          font-size: clamp(0.95rem, 2.2vh, 1.45rem);
          font-weight: 900;
          line-height: 1.15;
          color: #1A1A1A;
          overflow-wrap: anywhere;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .hino-booby-sub {
          margin-top: 0.25rem;
          font-size: clamp(0.55rem, 1vh, 0.75rem);
          font-weight: 800;
          letter-spacing: 0.16em;
          color: #8D6E63;
        }
        .hino-booby-score-wrap {
          margin-top: 0.55rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          line-height: 1;
        }
        .hino-booby-score {
          font-family: "Barlow Condensed", "Noto Sans Thai", sans-serif;
          font-weight: 900;
          font-size: clamp(1.5rem, 4vh, 2.6rem);
          color: #5D4037;
        }
        .hino-booby-score.is-running {
          animation: hinoScoreRun 0.28s steps(2, end) infinite;
          color: #CC0000;
        }
        .hino-booby-pts {
          margin-top: 0.25rem;
          font-size: clamp(0.55rem, 1vh, 0.75rem);
          font-weight: 800;
          letter-spacing: 0.2em;
          color: #6D4C41;
        }
        .hino-booby-bar {
          margin-top: 0.55rem;
          width: 100%;
          height: 0.55rem;
          border-radius: 999px;
          background: rgba(141,110,99,0.18);
          overflow: hidden;
        }
        .hino-booby-bar-fill {
          display: block;
          width: 100%;
          height: 100%;
          transform-origin: left center;
          transform: scaleX(0);
          border-radius: inherit;
          background: linear-gradient(90deg, #A1887F, var(--team), #FFD54F);
        }
        .hino-booby-note {
          margin-top: 0.55rem;
          font-size: clamp(0.65rem, 1.15vh, 0.85rem);
          font-weight: 700;
          color: #6D4C41;
        }
        .hino-fw.is-place-last .hino-fw-sky {
          background:
            radial-gradient(ellipse 55% 40% at 50% 48%, rgba(141,110,99,0.18), transparent 62%),
            radial-gradient(ellipse 40% 30% at 30% 55%, rgba(255,213,79,0.12), transparent 60%);
        }
        .hino-reveal-ready {
          position: relative;
          margin: auto;
          text-align: center;
          padding: clamp(0.75rem, 2vh, 1.5rem);
          max-width: min(92%, 520px);
          animation: hinoShowFadeUp 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .hino-reveal-ready-orbit {
          position: relative;
          width: min(22vmin, 160px);
          height: min(22vmin, 160px);
          margin: 0 auto clamp(0.5rem, 1.2vh, 1.2rem);
        }
        .hino-reveal-ready-orbit span {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 2px solid rgba(204,0,0,0.22);
          animation: hinoShowSpin 10s linear infinite;
        }
        .hino-reveal-ready-orbit span:nth-child(2) {
          inset: 14%;
          border-color: rgba(77,77,77,0.18);
          animation-duration: 14s;
          animation-direction: reverse;
        }
        .hino-reveal-ready-orbit span:nth-child(3) {
          inset: 30%;
          border-style: dashed;
          border-color: rgba(204,0,0,0.28);
          animation-duration: 7s;
        }
        .hino-reveal-ready-orbit span::before {
          content: "";
          position: absolute;
          top: -4px;
          left: 50%;
          width: 8px;
          height: 8px;
          margin-left: -4px;
          border-radius: 50%;
          background: #CC0000;
          box-shadow: 0 0 12px rgba(204,0,0,0.5);
        }
        .hino-reveal-ready-kicker {
          font-weight: 800;
          letter-spacing: 0.28em;
          color: #CC0000;
          font-size: clamp(0.7rem, 1.1vw, 0.9rem);
        }
        .hino-reveal-ready-title {
          margin-top: 0.6rem;
          font-size: clamp(1.8rem, 4.5vw, 3.4rem);
          font-weight: 900;
          line-height: 1.05;
          color: #1A1A1A;
        }
        .hino-reveal-ready-sub {
          margin-top: 0.75rem;
          font-size: clamp(0.85rem, 1.4vw, 1.15rem);
          font-weight: 700;
          color: #4D4D4D;
        }
        .hino-reveal-ready-pulse {
          margin: 1.4rem auto 0;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #CC0000;
          animation: hinoTbPulse 1.4s ease-in-out infinite;
        }
        .hino-reveal-ready-audio {
          margin-top: 0.65rem;
          font-size: clamp(0.7rem, 1.1vw, 0.9rem);
          font-weight: 700;
          color: #8A8A8A;
          letter-spacing: 0.04em;
        }

        .hino-podium-grid {
          display: grid;
          width: 100%;
          height: 100%;
          min-height: 0;
          max-height: 100%;
          align-items: end;
          justify-items: center;
          gap: clamp(0.3rem, 1.1vw, 1.1rem);
          padding: clamp(0.15rem, 0.8vh, 0.6rem) clamp(0.15rem, 0.8vw, 0.6rem) 0;
          transition: gap 0.45s ease;
        }
        .hino-podium-grid.show-count-1 {
          grid-template-columns: minmax(0, 1fr);
          grid-template-areas: "p1";
          justify-items: center;
        }
        .hino-podium-grid.show-count-1 .hino-podium-slot.is-2,
        .hino-podium-grid.show-count-1 .hino-podium-slot.is-3 {
          grid-area: p1;
        }
        .hino-podium-grid.show-count-2 {
          grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
          grid-template-areas: "p2 p1";
        }
        .hino-podium-grid.show-count-3 {
          /* เปิด 3→2→1 แต่ตำแหน่งคงที่: 2 | 1 | 3 */
          grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr) minmax(0, 1fr);
          grid-template-areas: "p2 p1 p3";
        }
        .hino-podium-slot {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          height: 100%;
          max-height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          will-change: transform;
          overflow: hidden;
          gap: 0;
        }
        .hino-mascot {
          position: relative;
          z-index: 3;
          flex: 0 0 auto;
          width: min(46%, 168px);
          aspect-ratio: 1;
          margin-bottom: -1.35rem;
          filter: drop-shadow(0 8px 14px rgba(26,26,26,0.16));
          animation: hinoMascotIdle 2.8s ease-in-out infinite;
          isolation: isolate;
        }
        .hino-mascot.is-place-1 {
          width: min(48%, 180px);
          animation-duration: 2.4s;
        }
        .hino-mascot.is-place-2 { width: min(40%, 140px); }
        .hino-mascot.is-place-3 { width: min(36%, 125px); }
        .hino-mascot.is-place-last {
          width: min(42%, 160px);
          animation-duration: 3.2s;
        }
        .hino-mascot.is-place-last .hino-mascot-glow {
          background: radial-gradient(ellipse, rgba(141,110,99,0.35), rgba(255,213,79,0.18), transparent 72%);
        }
        .hino-mascot-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position: bottom center;
          border-radius: 0;
          background: transparent;
          user-select: none;
          pointer-events: none;
          mix-blend-mode: multiply;
          -webkit-mask-image: radial-gradient(ellipse 72% 78% at 50% 48%, #000 58%, transparent 78%);
          mask-image: radial-gradient(ellipse 72% 78% at 50% 48%, #000 58%, transparent 78%);
        }
        .hino-mascot-glow {
          position: absolute;
          left: 50%;
          bottom: 2%;
          width: 78%;
          height: 22%;
          transform: translateX(-50%);
          border-radius: 50%;
          background: radial-gradient(ellipse, rgba(204,0,0,0.2), transparent 72%);
          filter: blur(8px);
          z-index: -1;
          pointer-events: none;
        }
        .hino-mascot.is-place-1 .hino-mascot-glow {
          background: radial-gradient(ellipse, rgba(255,215,0,0.4), rgba(204,0,0,0.2), transparent 72%);
        }
        .hino-mascot.is-celebrate {
          animation: hinoMascotCelebrate 1.1s cubic-bezier(0.22, 1, 0.36, 1);
        }

        /* Fireworks — grand multi-wave */
        .hino-fw {
          position: absolute;
          inset: 0;
          z-index: 6;
          pointer-events: none;
          overflow: hidden;
        }
        .hino-fw-sky {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 60% 45% at 50% 35%, rgba(255,215,0,0.18), transparent 60%),
            radial-gradient(ellipse 50% 40% at 20% 50%, rgba(204,0,0,0.14), transparent 55%),
            radial-gradient(ellipse 50% 40% at 80% 48%, rgba(255,107,53,0.12), transparent 55%);
          animation: hinoFwSky 3.6s ease-out both;
        }
        .hino-fw.is-place-1 .hino-fw-sky {
          background:
            radial-gradient(ellipse 70% 50% at 50% 32%, rgba(255,230,120,0.28), transparent 62%),
            radial-gradient(ellipse 55% 42% at 18% 48%, rgba(204,0,0,0.2), transparent 58%),
            radial-gradient(ellipse 55% 42% at 82% 46%, rgba(255,107,53,0.18), transparent 58%),
            radial-gradient(ellipse 40% 30% at 50% 60%, rgba(255,215,0,0.12), transparent 70%);
        }
        .hino-fw-origin {
          position: absolute;
          width: 0;
          height: 0;
        }
        .hino-fw-flash {
          position: absolute;
          left: 0;
          top: 0;
          width: min(46vmin, 48%);
          height: min(46vmin, 48%);
          transform: translate(-50%, -50%);
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,240,180,0.85), rgba(255,215,0,0.35), rgba(204,0,0,0.18), transparent 72%);
          animation: hinoFwFlash 1.05s ease-out var(--d, 0s) both;
        }
        .hino-fw.is-place-1 .hino-fw-flash {
          width: min(56vmin, 56%);
          height: min(56vmin, 56%);
          background: radial-gradient(circle, #fff 0%, rgba(255,230,120,0.85) 18%, rgba(255,215,0,0.4) 40%, rgba(204,0,0,0.22) 60%, transparent 75%);
        }
        .hino-fw-ring {
          position: absolute;
          left: 0;
          top: 0;
          width: 10vmin;
          height: 10vmin;
          margin: -5vmin 0 0 -5vmin;
          border-radius: 50%;
          border: 3px solid rgba(255,215,0,0.65);
          transform: scale(0.15);
          animation: hinoFwRing 1.35s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .hino-fw-ring.r2 { border-color: rgba(204,0,0,0.55); border-width: 2px; }
        .hino-fw-ring.r3 { border-color: rgba(255,107,53,0.5); border-style: dashed; }
        .hino-fw-ring.r4 { border-color: rgba(255,255,255,0.45); border-width: 2px; }
        .hino-fw-spark {
          position: absolute;
          width: var(--s);
          height: var(--s);
          margin: calc(var(--s) / -2) 0 0 calc(var(--s) / -2);
          border-radius: 50%;
          background: var(--c);
          box-shadow:
            0 0 8px var(--c),
            0 0 18px color-mix(in srgb, var(--c) 70%, white);
          animation: hinoFwSpark 1.85s cubic-bezier(0.12, 0.8, 0.2, 1) var(--d) both;
        }
        .hino-fw-spark.is-streak {
          width: calc(var(--s) * 0.45);
          height: calc(var(--s) * 2.4);
          border-radius: 999px;
          box-shadow: 0 0 12px var(--c), 0 0 24px var(--c);
        }
        .hino-fw-spark.is-star {
          clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
          border-radius: 0;
          width: calc(var(--s) * 1.5);
          height: calc(var(--s) * 1.5);
          margin: calc(var(--s) * -0.75) 0 0 calc(var(--s) * -0.75);
          box-shadow: 0 0 16px var(--c);
        }
        .hino-fw-rocket {
          position: absolute;
          bottom: 0;
          width: 4px;
          height: 18px;
          border-radius: 999px;
          background: linear-gradient(180deg, #fff, var(--c));
          box-shadow: 0 0 12px var(--c), 0 0 24px color-mix(in srgb, var(--c) 60%, white);
          animation: hinoFwRocket 0.85s cubic-bezier(0.2, 0.8, 0.2, 1) var(--d) both;
          transform-origin: bottom center;
        }
        .hino-fw-rocket::after {
          content: "";
          position: absolute;
          left: 50%;
          bottom: -8px;
          width: 10px;
          height: 22px;
          transform: translateX(-50%);
          border-radius: 50%;
          background: linear-gradient(180deg, var(--c), transparent);
          opacity: 0.85;
        }
        .hino-fw-glitter {
          position: absolute;
          width: 6px;
          height: 6px;
          margin: -3px 0 0 -3px;
          border-radius: 50%;
          background: var(--c);
          box-shadow: 0 0 12px var(--c), 0 0 22px #fff;
          animation: hinoFwGlitter 1.6s ease-out var(--d) both;
        }
        .hino-fw-confetti {
          position: absolute;
          top: -5%;
          border-radius: 2px;
          background: var(--c);
          box-shadow: 0 0 8px color-mix(in srgb, var(--c) 50%, transparent);
          animation: hinoFwConfetti 2.8s cubic-bezier(0.22, 1, 0.36, 1) var(--d) both;
          opacity: 0;
        }
        .hino-fw-confetti.is-circle { border-radius: 50%; }
        .hino-fw-confetti.is-ribbon {
          width: 5px !important;
          border-radius: 999px;
        }
        .hino-podium-slot.is-1 { grid-area: p1; z-index: 3; }
        .hino-podium-slot.is-2 { grid-area: p2; z-index: 2; }
        .hino-podium-slot.is-3 { grid-area: p3; z-index: 1; }
        .hino-podium-slot.is-shift-up { z-index: 5; }
        .hino-podium-slot.is-shift-down { z-index: 4; }
        .hino-podium-grid.show-count-1 .hino-podium-slot.is-1 {
          max-width: min(100%, 520px);
        }

        .hino-podium-card {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          max-width: 100%;
          min-height: 0;
          max-height: calc(100% - clamp(4.5rem, 16vh, 9rem));
          height: 68%;
          flex: 0 1 auto;
          padding: clamp(1.35rem, 3.2vh, 2rem) clamp(0.4rem, 1.2vw, 1.1rem) 0;
          border-radius: clamp(14px, 1.8vw, 24px) clamp(14px, 1.8vw, 24px) 0 0;
          border: 2px solid color-mix(in srgb, var(--team) 35%, #E0E0E0);
          border-bottom: none;
          background: linear-gradient(180deg, #ffffff 0%, #f7f7f7 100%);
          box-shadow: 0 12px 28px rgba(26,26,26,0.08);
          text-align: center;
          overflow: hidden;
          transition:
            height 0.55s cubic-bezier(0.22, 1, 0.36, 1),
            border-color 0.35s ease,
            background 0.35s ease,
            box-shadow 0.35s ease;
        }
        .hino-podium-card::before {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          top: 0;
          height: 5px;
          background: var(--team);
        }
        .hino-podium-card.is-place-1 {
          height: 78%;
          border-color: rgba(204,0,0,0.45);
          background: linear-gradient(180deg, #ffffff 0%, #fff5f5 100%);
          box-shadow:
            0 0 0 3px rgba(204,0,0,0.06),
            0 18px 40px rgba(204,0,0,0.14);
        }
        .hino-podium-card.is-place-1::before {
          height: 6px;
          background: linear-gradient(90deg, #990000, #CC0000, #FFD700);
        }
        .hino-podium-card.is-place-2 { height: 70%; }
        .hino-podium-card.is-place-3 { height: 62%; }
        .hino-podium-card.slide-up { animation: hinoSlideUp 0.85s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .hino-podium-card.slide-left { animation: hinoSlideLeft 0.85s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .hino-podium-card.slide-right { animation: hinoSlideRight 0.85s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .hino-podium-card.is-rank-move {
          animation: hinoRankPop 0.85s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .hino-podium-card.is-score-bump {
          box-shadow:
            inset 0 5px 0 0 var(--team),
            0 0 0 3px color-mix(in srgb, var(--team) 35%, transparent),
            0 16px 34px color-mix(in srgb, var(--team) 22%, transparent);
        }
        .hino-podium-move-badge {
          position: absolute;
          top: 0.55rem;
          right: 0.55rem;
          width: 1.7rem;
          height: 1.7rem;
          display: grid;
          place-items: center;
          border-radius: 999px;
          font-size: 0.95rem;
          font-weight: 900;
          color: #fff;
          animation: hinoMoveBadge 0.85s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .hino-podium-move-badge.is-up { background: #CC0000; }
        .hino-podium-move-badge.is-down { background: #4D4D4D; }

        .hino-podium-crown {
          color: #CC0000;
          margin-bottom: 0.25rem;
          animation: hinoCrownBob 2.4s ease-in-out infinite;
        }
        .hino-podium-crown-svg {
          width: clamp(1.2rem, 3.5vh, 3rem);
          height: auto;
          display: block;
        }
        .hino-podium-rank {
          display: grid;
          place-items: center;
          width: clamp(1.8rem, 5.2vh, 3.8rem);
          height: clamp(1.8rem, 5.2vh, 3.8rem);
          flex-shrink: 0;
          border-radius: clamp(8px, 1.2vw, 14px);
          background: var(--team);
          color: #111;
          font-weight: 900;
          font-size: clamp(1rem, 3vh, 2.2rem);
          line-height: 1;
          box-shadow: 0 8px 16px color-mix(in srgb, var(--team) 35%, transparent);
          transition: width 0.45s ease, height 0.45s ease, font-size 0.45s ease, background 0.35s ease, color 0.35s ease;
        }
        .hino-podium-rank.is-flip {
          animation: hinoRankFlip 0.7s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .hino-podium-card.is-place-1 .hino-podium-rank {
          background: linear-gradient(145deg, #CC0000, #990000);
          color: #fff;
          width: clamp(2.2rem, 6.5vh, 4.8rem);
          height: clamp(2.2rem, 6.5vh, 4.8rem);
          font-size: clamp(1.25rem, 3.8vh, 3rem);
        }
        .hino-podium-label {
          margin-top: clamp(0.2rem, 0.6vh, 0.45rem);
          font-size: clamp(0.55rem, 1vh, 0.85rem);
          font-weight: 800;
          letter-spacing: 0.16em;
          color: #CC0000;
          text-transform: uppercase;
        }
        .hino-podium-name {
          margin-top: clamp(0.15rem, 0.5vh, 0.35rem);
          width: 100%;
          font-size: clamp(0.85rem, 2.2vh + 0.35vw, 1.75rem);
          font-weight: 900;
          line-height: 1.15;
          color: #1A1A1A;
          overflow-wrap: anywhere;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .hino-podium-card.is-place-1 .hino-podium-name {
          font-size: clamp(1rem, 2.8vh + 0.4vw, 2.2rem);
        }
        .hino-podium-score-wrap {
          position: relative;
          margin-top: auto;
          padding: clamp(0.35rem, 0.9vh, 0.75rem) 0 clamp(0.4rem, 1vh, 0.85rem);
          display: flex;
          flex-direction: column;
          align-items: center;
          line-height: 1;
          flex-shrink: 0;
        }
        .hino-podium-score {
          font-weight: 900;
          font-size: clamp(1.25rem, 4vh + 0.35vw, 3.2rem);
          color: #1A1A1A;
          transition: font-size 0.45s ease, color 0.35s ease;
          display: inline-block;
        }
        .hino-podium-card.is-place-1 .hino-podium-score {
          font-size: clamp(1.6rem, 5.2vh + 0.4vw, 4.2rem);
          color: #CC0000;
        }
        .hino-podium-score.is-pulse {
          animation: hinoScoreNumPulse 0.7s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .hino-podium-score.is-running {
          animation: hinoScoreRun 0.28s steps(2, end) infinite;
          text-shadow: 0 0 18px color-mix(in srgb, #CC0000 35%, transparent);
        }
        .hino-podium-card.is-counting .hino-podium-score-wrap::after {
          content: "";
          position: absolute;
          inset: -20% -10%;
          border-radius: 12px;
          background: linear-gradient(180deg, transparent 0%, rgba(204,0,0,0.08) 50%, transparent 100%);
          animation: hinoScoreScan 0.55s linear infinite;
          pointer-events: none;
        }
        .hino-rest-score.is-running {
          animation: hinoScoreRun 0.28s steps(2, end) infinite;
          color: #CC0000;
        }
        .hino-podium-pts {
          margin-top: 0.3rem;
          font-size: clamp(0.6rem, 1vh, 0.8rem);
          font-weight: 800;
          letter-spacing: 0.22em;
          color: #4D4D4D;
        }
        .hino-podium-base {
          width: calc(100% + 4px);
          margin: 0.15rem -2px 0;
          padding: 0.35rem 0.55rem 0.45rem;
          border-radius: 0 0 10px 10px;
          background: linear-gradient(180deg, rgba(26,26,26,0.06), rgba(26,26,26,0.14));
          flex-shrink: 0;
        }
        .hino-podium-base-track {
          position: relative;
          width: 100%;
          height: clamp(0.65rem, 1.35vh, 0.95rem);
          border-radius: 999px;
          background: rgba(255,255,255,0.55);
          border: 1px solid rgba(77,77,77,0.18);
          overflow: visible;
          box-shadow: inset 0 1px 3px rgba(0,0,0,0.12);
        }
        .hino-podium-base-fill {
          height: 100%;
          width: 100%;
          border-radius: inherit;
          transform-origin: left center;
          transform: scaleX(0);
          will-change: transform;
          background: linear-gradient(90deg, color-mix(in srgb, var(--team) 75%, #4D4D4D), var(--team), color-mix(in srgb, var(--team) 70%, white));
          box-shadow: 0 0 10px color-mix(in srgb, var(--team) 45%, transparent);
          position: relative;
        }
        .hino-podium-card.is-place-1 .hino-podium-base-fill {
          background: linear-gradient(90deg, #990000, #CC0000, #FFD700);
          box-shadow: 0 0 14px rgba(204,0,0,0.45);
        }
        .hino-podium-base-fill::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.45) 45%, transparent 70%);
          background-size: 220% 100%;
          animation: hinoTbShimmer 1.4s linear infinite;
          opacity: 0.7;
        }
        .hino-podium-base-knob {
          position: absolute;
          top: 50%;
          left: 0%;
          width: clamp(0.95rem, 1.7vh, 1.25rem);
          height: clamp(0.95rem, 1.7vh, 1.25rem);
          border-radius: 50%;
          background: #fff;
          border: 2px solid var(--team);
          box-shadow: 0 2px 8px rgba(26,26,26,0.25), 0 0 0 3px color-mix(in srgb, var(--team) 18%, transparent);
          transform: translate(-50%, -50%);
          will-change: left;
          z-index: 2;
        }
        .hino-podium-card.is-place-1 .hino-podium-base-knob {
          border-color: #CC0000;
          box-shadow: 0 2px 10px rgba(204,0,0,0.35), 0 0 0 3px rgba(204,0,0,0.15);
        }
        .hino-podium-base.is-sliding .hino-podium-base-knob {
          animation: hinoKnobPulse 0.45s ease-in-out infinite;
        }
        .hino-podium-base-meta {
          display: flex;
          justify-content: space-between;
          margin-top: 0.25rem;
          font-family: "Barlow Condensed", "Noto Sans Thai", sans-serif;
          font-size: clamp(0.65rem, 1.1vh, 0.85rem);
          font-weight: 800;
          letter-spacing: 0.04em;
          color: #4D4D4D;
        }
        .hino-podium-card.is-place-1 .hino-podium-base-meta { color: #CC0000; }

        .hino-rest-strip {
          flex: 0 0 auto;
          width: 100%;
          max-height: min(28%, 240px);
          min-height: 0;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          padding: clamp(0.4rem, 0.8vh, 0.6rem) clamp(0.45rem, 1vw, 0.7rem);
          border-radius: 16px;
          background: rgba(255,255,255,0.92);
          border: 1px solid #E0E0E0;
          box-shadow: 0 10px 24px rgba(26,26,26,0.06);
          animation: hinoSlideUp 0.65s cubic-bezier(0.22, 1, 0.36, 1) both;
          overflow: hidden;
        }
        .hino-rest-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          flex-shrink: 0;
          font-size: clamp(0.75rem, 1.2vw, 0.95rem);
          font-weight: 800;
          color: #1A1A1A;
        }
        .hino-rest-count {
          color: #CC0000;
          letter-spacing: 0.06em;
        }
        .hino-rest-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
          overflow: auto;
          min-height: 0;
          padding-bottom: 0.15rem;
          align-content: flex-start;
        }
        .hino-rest-card {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          max-width: 100%;
          padding: 0.4rem 0.65rem;
          border-radius: 999px;
          border: 1px solid color-mix(in srgb, var(--team) 40%, #D4D4D4);
          background: color-mix(in srgb, var(--team) 8%, #fff);
          box-shadow: inset 3px 0 0 var(--team);
          opacity: 0;
          animation: hinoShowChipIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          will-change: transform;
        }
        .hino-rest-card.is-rank-move {
          animation: hinoRestMove 0.75s cubic-bezier(0.22, 1, 0.36, 1);
          opacity: 1;
          box-shadow:
            inset 3px 0 0 var(--team),
            0 0 0 2px color-mix(in srgb, var(--team) 35%, transparent);
        }
        .hino-rest-rank {
          display: grid;
          place-items: center;
          min-width: 1.5rem;
          height: 1.5rem;
          padding: 0 0.25rem;
          border-radius: 999px;
          background: var(--team);
          color: #111;
          font-weight: 900;
          font-size: 0.9rem;
        }
        .hino-rest-main {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          min-width: 0;
          flex: 1;
        }
        .hino-rest-name {
          max-width: min(28vw, 9rem);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: clamp(0.7rem, 1.1vw, 0.9rem);
          font-weight: 800;
          color: #1A1A1A;
        }
        .hino-rest-bar {
          width: 100%;
          max-width: min(28vw, 9rem);
          height: 5px;
          border-radius: 999px;
          background: rgba(77,77,77,0.12);
          overflow: hidden;
        }
        .hino-rest-bar-fill {
          display: block;
          height: 100%;
          width: 100%;
          border-radius: inherit;
          transform-origin: left center;
          transform: scaleX(0);
          will-change: transform;
          background: linear-gradient(90deg, color-mix(in srgb, var(--team) 70%, #fff), var(--team));
        }
        .hino-rest-score {
          font-weight: 900;
          font-size: clamp(0.85rem, 1.2vw, 1.05rem);
          color: #1A1A1A;
        }
        .hino-reveal-done-note {
          flex-shrink: 0;
          text-align: center;
          font-size: clamp(0.75rem, 1.1vw, 0.9rem);
          font-weight: 700;
          color: #6B6B6B;
        }

        /* —— Showcase idle —— */
        .hino-show {
          isolation: isolate;
          outline: none;
          width: 100%;
          height: 100%;
          min-height: 0;
          overflow: auto;
          overscroll-behavior: contain;
          padding: clamp(0.5rem, 1.5vh, 1.25rem) clamp(0.5rem, 2vw, 1.5rem);
        }
        .hino-show.is-ready { cursor: pointer; }
        .hino-show > .relative.z-10 {
          width: 100%;
          max-width: min(920px, 100%);
        }
        .hino-show-orbit {
          position: absolute;
          left: 50%;
          top: 48%;
          border: 1.5px solid rgba(204,0,0,0.18);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
        }
        .hino-show-orbit-a { width: min(36vh, 42vw); height: min(36vh, 42vw); animation: hinoShowSpin 16s linear infinite; }
        .hino-show-orbit-b { width: min(52vh, 58vw); height: min(52vh, 58vw); border-color: rgba(77,77,77,0.12); animation: hinoShowSpin 26s linear infinite reverse; }
        .hino-show-orbit-c { width: min(68vh, 74vw); height: min(68vh, 74vw); border-style: dashed; border-color: rgba(204,0,0,0.12); animation: hinoShowSpin 38s linear infinite; }
        .hino-show-orbit-d { width: min(84vh, 90vw); height: min(84vh, 90vw); border-color: rgba(77,77,77,0.08); border-width: 1px; animation: hinoShowSpin 52s linear infinite reverse; }
        .hino-show-core {
          position: absolute;
          left: 50%;
          top: 48%;
          width: min(12vh, 14vw);
          height: min(12vh, 14vw);
          transform: translate(-50%, -50%);
          border-radius: 50%;
          background: radial-gradient(circle, rgba(204,0,0,0.22), transparent 70%);
          animation: hinoOrbitCore 3.2s ease-in-out infinite;
          pointer-events: none;
        }
        .hino-show.is-ready .hino-show-orbit-a { border-color: rgba(204,0,0,0.38); animation-duration: 10s; }
        .hino-show.is-ready .hino-show-orbit-b { border-color: rgba(204,0,0,0.28); animation-duration: 14s; }
        .hino-show.is-ready .hino-show-orbit-c { border-color: rgba(204,0,0,0.28); animation-duration: 18s; }
        .hino-show.is-ready .hino-show-orbit-d { border-color: rgba(204,0,0,0.18); animation-duration: 24s; }
        .hino-show-enter {
          margin-top: clamp(0.8rem, 1.6vh, 1.4rem);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: 0.55rem 0.75rem;
          max-width: 100%;
          padding: clamp(0.55rem, 1.2vh, 0.85rem) clamp(0.85rem, 2vw, 1.35rem);
          border-radius: 999px;
          border: 2px solid #CC0000;
          background: linear-gradient(90deg, #CC0000, #990000);
          color: #fff;
          font-size: clamp(0.75rem, 1.3vw + 0.2vh, 1.15rem);
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 12px 28px rgba(204,0,0,0.3);
          animation: hinoEnterPulse 1.8s ease-in-out infinite;
        }
        .hino-show-enter kbd {
          display: inline-grid;
          place-items: center;
          min-width: 4.2rem;
          padding: 0.25rem 0.55rem;
          border-radius: 8px;
          background: rgba(255,255,255,0.18);
          border: 1px solid rgba(255,255,255,0.35);
          font-family: "Barlow Condensed", sans-serif;
          font-size: 0.95em;
          letter-spacing: 0.12em;
        }
        .hino-show-orbit::before {
          content: "";
          position: absolute;
          top: -5px;
          left: 50%;
          width: 10px;
          height: 10px;
          margin-left: -5px;
          border-radius: 50%;
          background: #CC0000;
          box-shadow: 0 0 16px rgba(204,0,0,0.55);
        }
        .hino-show-beam {
          position: absolute;
          inset: -20% -10%;
          background: linear-gradient(115deg, transparent 42%, rgba(204,0,0,0.07) 50%, transparent 58%);
          animation: hinoShowBeam 7s ease-in-out infinite;
          pointer-events: none;
        }
        .hino-show-beam-2 { animation-delay: 3.5s; opacity: 0.7; }
        .hino-show-particle {
          position: absolute;
          left: var(--x);
          top: var(--y);
          width: 7px;
          height: 7px;
          border-radius: 50%;
          opacity: 0;
          animation: hinoShowFloat var(--d) ease-in-out var(--delay) infinite;
          pointer-events: none;
        }
        .hino-show-logo-wrap {
          position: relative;
          padding: 1.6vh 2vw;
          animation: hinoShowLogo 1.1s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .hino-show-logo-wrap::after {
          content: "";
          position: absolute;
          inset: -18%;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(204,0,0,0.16), transparent 68%);
          animation: hinoTbGlow 4.5s ease-in-out infinite;
          z-index: -1;
        }
        .hino-show-eyebrow { animation: hinoShowFadeUp 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.15s both; }
        .hino-show-title { font-family: "Barlow Condensed", "Noto Sans Thai", sans-serif; }
        .hino-show-word { display: inline-block; animation: hinoShowFadeUp 0.85s cubic-bezier(0.22, 1, 0.36, 1) 0.28s both; }
        .hino-show-word-red { margin-left: 0.18em; color: #CC0000; animation-delay: 0.42s; }
        .hino-show-rule {
          background: linear-gradient(90deg, transparent, #CC0000, transparent);
          background-size: 200% 100%;
          animation: hinoShowFadeUp 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.5s both, hinoTbShimmer 3.2s ease-in-out 0.8s infinite;
        }
        .hino-show-sub { animation: hinoShowFadeUp 0.75s cubic-bezier(0.22, 1, 0.36, 1) 0.58s both; }
        .hino-show-wait {
          animation: hinoShowFadeUp 0.75s cubic-bezier(0.22, 1, 0.36, 1) 0.68s both, hinoTbPulseSoft 2.2s ease-in-out 1.4s infinite;
        }
        .hino-show-hint { animation: hinoShowFadeUp 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.85s both; }
        .hino-show-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.45vw;
          padding: 0.7vh 1.1vw;
          border-radius: 999px;
          border: 1px solid color-mix(in srgb, var(--team) 45%, #D0D0D0);
          background: color-mix(in srgb, var(--team) 10%, white);
          color: #1A1A1A;
          font-size: clamp(0.7rem, 1.15vw, 0.95rem);
          font-weight: 800;
          opacity: 0;
          animation: hinoShowChipIn 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .hino-show-chip-dot {
          width: 0.7vw;
          height: 0.7vw;
          min-width: 8px;
          min-height: 8px;
          border-radius: 50%;
          background: var(--team);
          box-shadow: 0 0 10px color-mix(in srgb, var(--team) 55%, transparent);
        }

        @keyframes hinoTbHeaderIn {
          from { opacity: 0; transform: translateY(-1.2vh); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes hinoTbLogoIn {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes hinoTbPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(204,0,0,0.55); }
          50% { box-shadow: 0 0 0 7px rgba(204,0,0,0); }
        }
        @keyframes hinoTbPulseSoft {
          0%, 100% { opacity: 0.72; }
          50% { opacity: 1; }
        }
        @keyframes hinoTbShimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes hinoTbGlow {
          0%, 100% { opacity: 0.45; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.06); }
        }
        @keyframes hinoCrownBob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-0.35vh); }
        }
        @keyframes hinoTbGridDrift {
          from { background-position: 0 0, 0 0; }
          to { background-position: 48px 48px, 48px 48px; }
        }
        @keyframes hinoTbSpin { to { transform: rotate(360deg); } }
        @keyframes hinoTbPop {
          0% { opacity: 0; transform: translateY(35%) scale(0.7); }
          15% { opacity: 1; transform: translateY(0) scale(1.08); }
          80% { opacity: 1; }
          100% { opacity: 0; transform: translateY(-70%); }
        }
        @keyframes hinoShowSpin {
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes hinoShowBeam {
          0%, 100% { transform: translateX(-8%) rotate(0deg); opacity: 0.35; }
          50% { transform: translateX(8%) rotate(2deg); opacity: 0.75; }
        }
        @keyframes hinoShowFloat {
          0%, 100% { opacity: 0; transform: translateY(0) scale(0.6); }
          20% { opacity: 0.85; }
          50% { opacity: 0.55; transform: translateY(-2.4vh) scale(1); }
          80% { opacity: 0.2; }
        }
        @keyframes hinoShowLogo {
          from { opacity: 0; transform: scale(0.82) translateY(1.5vh); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes hinoShowFadeUp {
          from { opacity: 0; transform: translateY(1.6vh); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes hinoShowChipIn {
          from { opacity: 0; transform: translateY(1.2vh) scale(0.92); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes hinoSlideUp {
          0% { opacity: 0; transform: translateY(22%) scale(0.92); }
          65% { opacity: 1; transform: translateY(-3%) scale(1.03); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes hinoSlideLeft {
          0% { opacity: 0; transform: translateX(-22%) scale(0.92); }
          65% { opacity: 1; transform: translateX(3%) scale(1.03); }
          100% { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes hinoSlideRight {
          0% { opacity: 0; transform: translateX(22%) scale(0.92); }
          65% { opacity: 1; transform: translateX(-3%) scale(1.03); }
          100% { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes hinoRankPop {
          0% { transform: scale(1); }
          35% { transform: scale(1.06); }
          100% { transform: scale(1); }
        }
        @keyframes hinoRankFlip {
          0% { transform: rotateX(0deg) scale(1); }
          40% { transform: rotateX(90deg) scale(0.85); }
          100% { transform: rotateX(0deg) scale(1); }
        }
        @keyframes hinoMoveBadge {
          0% { opacity: 0; transform: translateY(6px) scale(0.6); }
          30% { opacity: 1; transform: translateY(0) scale(1.1); }
          100% { opacity: 0; transform: translateY(-10px) scale(0.9); }
        }
        @keyframes hinoRestMove {
          0% { transform: translateY(0) scale(1); }
          40% { transform: translateY(-4px) scale(1.05); }
          100% { transform: translateY(0) scale(1); }
        }
        @keyframes hinoScoreNumPulse {
          0% { transform: scale(1); }
          40% { transform: scale(1.12); }
          100% { transform: scale(1); }
        }
        @keyframes hinoScoreRun {
          0%, 100% { transform: translateY(0) scale(1); filter: blur(0); }
          50% { transform: translateY(-1px) scale(1.03); filter: blur(0.2px); }
        }
        @keyframes hinoScoreScan {
          0% { transform: translateY(-40%); opacity: 0.2; }
          50% { opacity: 0.7; }
          100% { transform: translateY(40%); opacity: 0.2; }
        }
        @keyframes hinoKnobPulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.12); }
        }
        @keyframes hinoBoardEnter {
          0% { opacity: 0; transform: scale(0.94) translateY(2vh); filter: blur(6px); }
          100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
        }
        @keyframes hinoOrbitCore {
          0%, 100% { opacity: 0.45; transform: translate(-50%, -50%) scale(0.9); }
          50% { opacity: 0.95; transform: translate(-50%, -50%) scale(1.15); }
        }
        @keyframes hinoOrbitSpark {
          0%, 100% { opacity: 0.25; }
          50% { opacity: 0.8; }
        }
        @keyframes hinoOrbitSparkLive {
          0% { opacity: 0.2; transform: rotate(calc(var(--i) * 20deg)) translateX(min(28vmin, 30%)) scale(0.5); }
          50% { opacity: 0.95; transform: rotate(calc(var(--i) * 20deg + 180deg)) translateX(min(40vmin, 42%)) scale(1); }
          100% { opacity: 0.2; transform: rotate(calc(var(--i) * 20deg + 360deg)) translateX(min(28vmin, 30%)) scale(0.5); }
        }
        @keyframes hinoEnterPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 12px 28px rgba(204,0,0,0.28); }
          50% { transform: scale(1.035); box-shadow: 0 16px 36px rgba(204,0,0,0.42); }
        }
        @keyframes hinoMascotIdle {
          0%, 100% { transform: translateY(0) rotate(-1.5deg); }
          50% { transform: translateY(-0.55vh) rotate(1.5deg); }
        }
        @keyframes hinoMascotCelebrate {
          0% { transform: translateY(18%) scale(0.55) rotate(-8deg); opacity: 0; }
          55% { transform: translateY(-8%) scale(1.12) rotate(4deg); opacity: 1; }
          100% { transform: translateY(0) scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes hinoFwSky {
          0% { opacity: 0; }
          12% { opacity: 1; }
          70% { opacity: 0.85; }
          100% { opacity: 0; }
        }
        @keyframes hinoFwFlash {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.2); }
          18% { opacity: 1; }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1.85); }
        }
        @keyframes hinoFwRing {
          0% { opacity: 0.95; transform: scale(0.12); }
          100% { opacity: 0; transform: scale(5.4); }
        }
        @keyframes hinoFwSpark {
          0% { opacity: 0; transform: translate(0, 0) scale(0.35) rotate(0deg); }
          10% { opacity: 1; }
          55% { opacity: 1; }
          100% { opacity: 0; transform: translate(var(--x), calc(var(--y) + 8vmin)) scale(0.15) rotate(var(--spin)); }
        }
        @keyframes hinoFwRocket {
          0% { opacity: 0; transform: translateY(0) scaleY(0.6); }
          15% { opacity: 1; }
          75% { opacity: 1; }
          100% { opacity: 0; transform: translateY(calc(var(--h) * -1)) scaleY(1.2); }
        }
        @keyframes hinoFwGlitter {
          0% { opacity: 0; transform: scale(0.2); }
          25% { opacity: 1; transform: scale(1.4); }
          100% { opacity: 0; transform: scale(0.3) translateY(12px); }
        }
        @keyframes hinoFwConfetti {
          0% { opacity: 0; transform: translateY(0) rotate(0deg) scale(0.6); }
          10% { opacity: 1; }
          100% { opacity: 0; transform: translate(var(--cx), 115vh) rotate(var(--rot)) scale(1.05); }
        }

        /* จอสั้น / โปรเจคเตอร์ — คงโพเดียมแนวนอน แต่ย่อช่องว่าง */
        @media (max-height: 820px) {
          .hino-tb-header { padding-top: 0.35rem !important; padding-bottom: 0.35rem !important; }
          .hino-reveal-hint-keys { display: none; }
          .hino-reveal-ready-orbit { width: min(16vmin, 110px); height: min(16vmin, 110px); }
          .hino-rest-strip { max-height: min(24%, 160px); }
          .hino-mascot { width: min(34%, 110px); }
          .hino-mascot.is-place-1 { width: min(38%, 130px); }
          .hino-podium-card.is-place-1 { height: 76%; }
          .hino-podium-card.is-place-2 { height: 68%; }
          .hino-podium-card.is-place-3 { height: 60%; }
          .hino-show-teams { margin-top: 1.2vh !important; }
        }

        @media (max-height: 640px) {
          .hino-reveal-controls { display: none; }
          .hino-podium-crown { display: none; }
          .hino-podium-label { display: none; }
          .hino-podium-pts { display: none; }
          .hino-reveal-ready-orbit { display: none; }
          .hino-mascot { width: min(28%, 84px); margin-bottom: -0.15rem; }
          .hino-mascot.is-place-1 { width: min(32%, 96px); }
          .hino-rest-strip { max-height: min(22%, 120px); }
          .hino-show-orbit-d { display: none; }
        }

        /* จอแคบแนวตั้ง — เรียงโพเดียมลงแนวตั้ง */
        @media (max-width: 720px) {
          .hino-podium-area {
            flex-direction: column;
            align-items: stretch;
            overflow: auto;
          }
          .hino-booby {
            width: 100%;
            max-width: none;
            order: 5;
          }
          .hino-booby .hino-mascot.is-place-last {
            width: clamp(4rem, 18vw, 6rem);
          }
          .hino-booby-card {
            flex-direction: row;
            flex-wrap: wrap;
            justify-content: flex-start;
            text-align: left;
            gap: 0.35rem 0.7rem;
          }
          .hino-booby-score-wrap { margin-left: auto; align-items: flex-end; }
          .hino-booby-bar { margin-top: 0.2rem; }
          .hino-booby-note { width: 100%; }
          .hino-podium-grid.show-count-2,
          .hino-podium-grid.show-count-3 {
            grid-template-columns: minmax(0, 1fr);
            grid-auto-rows: minmax(0, 1fr);
            align-items: stretch;
            overflow: auto;
            gap: 0.45rem;
            padding-bottom: 0.35rem;
          }
          .hino-podium-grid.show-count-2 {
            grid-template-areas:
              "p2"
              "p1";
          }
          .hino-podium-grid.show-count-3 {
            grid-template-areas:
              "p3"
              "p2"
              "p1";
          }
          .hino-podium-slot {
            flex-direction: row;
            align-items: center;
            justify-content: flex-start;
            height: auto;
            min-height: clamp(5.5rem, 18vh, 9rem);
            overflow: visible;
            gap: 0.55rem;
          }
          .hino-podium-grid.show-count-1 .hino-podium-slot.is-1 { max-width: 100%; }
          .hino-mascot,
          .hino-mascot.is-place-1,
          .hino-mascot.is-place-2,
          .hino-mascot.is-place-3 {
            width: clamp(3.4rem, 14vw, 5rem);
            margin-bottom: 0;
            flex-shrink: 0;
          }
          .hino-podium-card,
          .hino-podium-card.is-place-1,
          .hino-podium-card.is-place-2,
          .hino-podium-card.is-place-3 {
            height: auto;
            min-height: 0;
            max-height: none;
            width: 100%;
            max-width: 100%;
            flex: 1 1 auto;
            border-radius: 14px;
            border-bottom: 2px solid color-mix(in srgb, var(--team) 45%, #D0D0D0);
            padding: 0.65rem 0.8rem;
            flex-direction: row;
            flex-wrap: wrap;
            justify-content: flex-start;
            align-items: center;
            gap: 0.45rem 0.7rem;
            text-align: left;
          }
          .hino-podium-card.is-place-1 { border-bottom-color: #CC0000; }
          .hino-podium-base {
            width: 100%;
            margin: 0.35rem 0 0;
            padding: 0.25rem 0 0;
            background: transparent;
            border-radius: 0;
          }
          .hino-podium-base-track { height: 0.45rem; }
          .hino-podium-base-knob {
            width: 0.75rem;
            height: 0.75rem;
          }
          .hino-podium-crown { display: none; }
          .hino-podium-score-wrap {
            margin-top: 0;
            margin-left: auto;
            padding: 0;
            align-items: flex-end;
          }
          .hino-podium-name {
            flex: 1 1 8rem;
            -webkit-line-clamp: 1;
            font-size: clamp(0.95rem, 3.5vw, 1.25rem);
          }
          .hino-podium-card.is-place-1 .hino-podium-name { font-size: clamp(1.05rem, 4vw, 1.4rem); }
          .hino-podium-score,
          .hino-podium-card.is-place-1 .hino-podium-score {
            font-size: clamp(1.35rem, 5vw, 2rem);
          }
          .hino-rest-strip { max-height: min(32%, 200px); }
          .hino-rest-name { max-width: min(42vw, 8rem); }
          .hino-reveal-hint-keys { display: none; }
        }

        @container orbit-stage (max-height: 480px) {
          .hino-reveal-hint { padding: 0.25rem 0.5rem; }
          .hino-podium-label { display: none; }
          .hino-rest-strip { max-height: 28%; }
        }

        @container orbit-stage (max-width: 640px) {
          .hino-orbit-fx-ring.r4 { display: none; }
        }

        @media (prefers-reduced-motion: reduce) {
          .hino-tb-header, .hino-tb-logo, .hino-tb-kicker, .hino-tb-live-dot, .hino-tb-spinner,
          .hino-tb-redline, .hino-tb-glow, .hino-tb-pattern, .hino-tb-delta,
          .hino-podium-card, .hino-podium-crown, .hino-podium-rank, .hino-podium-score,
          .hino-podium-move-badge, .hino-rest-strip, .hino-rest-card, .hino-mascot,
          .hino-fw-sky, .hino-fw-flash, .hino-fw-ring, .hino-fw-spark, .hino-fw-rocket,
          .hino-fw-glitter, .hino-fw-confetti,
          .hino-reveal-ready, .hino-reveal-ready-pulse, .hino-reveal-ready-orbit span,
          .hino-reveal-enter, .hino-orbit-fx-ring, .hino-orbit-fx-beam, .hino-orbit-fx-core,
          .hino-orbit-fx-spark, .hino-orbit-fx-glow, .hino-show-enter, .hino-show-core,
          .hino-show-orbit, .hino-show-beam, .hino-show-particle, .hino-show-logo-wrap,
          .hino-show-eyebrow, .hino-show-word, .hino-show-rule, .hino-show-sub,
          .hino-show-wait, .hino-show-hint, .hino-show-chip {
            animation: none !important;
            transition: none !important;
          }
          .hino-show-chip, .hino-rest-card { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default TeambuildingScoreboardPage;
