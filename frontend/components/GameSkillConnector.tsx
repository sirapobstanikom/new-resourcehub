import React, { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Brain,
  Handshake,
  Lightbulb,
  Sparkles,
  Sprout,
  Target,
  Users,
  Cpu,
  Heart,
  RotateCw,
} from 'lucide-react';

type Dir = 0 | 1 | 2 | 3; // N E S W
type Shape = 'I' | 'L' | 'T' | 'X';

type SkillId =
  | 'creativity'
  | 'ei'
  | 'collaboration'
  | 'learning'
  | 'communication'
  | 'decision'
  | 'empathy'
  | 'agility';

type Skill = {
  id: SkillId;
  label: string;
  labelTh: string;
  Icon: React.ComponentType<{ className?: string }>;
};

type TileDef = {
  shape: Shape;
  skill: Skill;
};

type Mission = {
  id: string;
  title: string;
  titleTh: string;
  tagline: string;
  sourceLabel: string;
  sourceSub: string;
  destLabel: string;
  destSub: string;
  size: number;
  sourceRow: number;
  destRow: number;
  tiles: TileDef[];
  highlight: SkillId[];
  winMessage: string;
};

const SKILLS: Record<SkillId, Skill> = {
  creativity: { id: 'creativity', label: 'Creativity', labelTh: 'ความคิดสร้างสรรค์', Icon: Lightbulb },
  ei: { id: 'ei', label: 'Emotional Intelligence', labelTh: 'ความฉลาดทางอารมณ์', Icon: Heart },
  collaboration: { id: 'collaboration', label: 'Collaboration', labelTh: 'การร่วมมือ', Icon: Handshake },
  learning: { id: 'learning', label: 'Learning & Growth', labelTh: 'เรียนรู้และเติบโต', Icon: Sprout },
  communication: { id: 'communication', label: 'Communication', labelTh: 'การสื่อสาร', Icon: Users },
  decision: { id: 'decision', label: 'Decision Making', labelTh: 'การตัดสินใจ', Icon: Target },
  empathy: { id: 'empathy', label: 'Empathy', labelTh: 'ความเข้าใจผู้อื่น', Icon: Brain },
  agility: { id: 'agility', label: 'Agility', labelTh: 'ความคล่องตัว', Icon: Sparkles },
};

const SHAPE_OPENINGS: Record<Shape, Dir[]> = {
  I: [0, 2],
  L: [0, 1],
  T: [0, 1, 2],
  X: [0, 1, 2, 3],
};

const OPPOSITE: Record<Dir, Dir> = { 0: 2, 1: 3, 2: 0, 3: 1 };
const DELTA: Record<Dir, [number, number]> = {
  0: [0, -1],
  1: [1, 0],
  2: [0, 1],
  3: [-1, 0],
};

function rotateDirs(dirs: Dir[], rot: number): Dir[] {
  return dirs.map((d) => ((d + rot) % 4) as Dir);
}

function scrambleRotations(count: number): number[] {
  return Array.from({ length: count }, () => Math.floor(Math.random() * 4));
}

function scrambleUntilUnsolved(mission: Mission): number[] {
  for (let i = 0; i < 50; i += 1) {
    const next = scrambleRotations(mission.tiles.length);
    if (!isPathComplete(mission, next, poweredFromSource(mission, next))) return next;
  }
  return scrambleRotations(mission.tiles.length);
}

const MISSIONS: Mission[] = [
  {
    id: 'resilient',
    title: 'RESILIENT LEADERSHIP',
    titleTh: 'ผู้นำที่ยืดหยุ่น',
    tagline: 'Foundation + EI + Learning & Growth',
    sourceLabel: 'AI FOR EVERYONE',
    sourceSub: 'Foundation',
    destLabel: 'RESILIENT LEADERSHIP',
    destSub: 'ผู้นำที่ยืดหยุ่น',
    size: 3,
    sourceRow: 1,
    destRow: 1,
    tiles: [
      { shape: 'L', skill: SKILLS.communication },
      { shape: 'T', skill: SKILLS.ei },
      { shape: 'L', skill: SKILLS.decision },
      { shape: 'I', skill: SKILLS.empathy },
      { shape: 'T', skill: SKILLS.learning },
      { shape: 'I', skill: SKILLS.agility },
      { shape: 'L', skill: SKILLS.creativity },
      { shape: 'I', skill: SKILLS.collaboration },
      { shape: 'L', skill: SKILLS.communication },
    ],
    highlight: ['ei', 'learning'],
    winMessage:
      "คุณเชื่อมต่อเส้นทาง 'ผู้นำที่ยืดหยุ่น' สำเร็จ! นี่คือการรวมกันของ Foundation Skills + Emotional Intelligence + Learning & Growth ที่ MindDojo พร้อมสอนให้คุณ",
  },
  {
    id: 'innovation',
    title: 'INNOVATION TRANSFORMATION',
    titleTh: 'การเปลี่ยนแปลงด้วยนวัตกรรม',
    tagline: 'Foundation + Creativity + Collaboration',
    sourceLabel: 'AI FOR EVERYONE',
    sourceSub: 'Foundation',
    destLabel: 'INNOVATION TRANSFORMATION',
    destSub: 'นวัตกรรมและการเปลี่ยนแปลง',
    size: 4,
    sourceRow: 1,
    destRow: 2,
    tiles: [
      { shape: 'L', skill: SKILLS.communication },
      { shape: 'I', skill: SKILLS.creativity },
      { shape: 'L', skill: SKILLS.decision },
      { shape: 'L', skill: SKILLS.agility },
      { shape: 'I', skill: SKILLS.ei },
      { shape: 'T', skill: SKILLS.collaboration },
      { shape: 'T', skill: SKILLS.learning },
      { shape: 'I', skill: SKILLS.empathy },
      { shape: 'L', skill: SKILLS.agility },
      { shape: 'I', skill: SKILLS.communication },
      { shape: 'L', skill: SKILLS.creativity },
      { shape: 'L', skill: SKILLS.decision },
      { shape: 'I', skill: SKILLS.learning },
      { shape: 'T', skill: SKILLS.collaboration },
      { shape: 'I', skill: SKILLS.ei },
      { shape: 'L', skill: SKILLS.empathy },
    ],
    highlight: ['creativity', 'collaboration'],
    winMessage:
      "คุณเชื่อมต่อเส้นทาง 'การเปลี่ยนแปลงด้วยนวัตกรรม' สำเร็จ! นี่คือการรวมกันของ Foundation Skills + Creativity + Collaboration ที่ MindDojo พร้อมสอนให้คุณ",
  },
];

type Phase = 'select' | 'playing' | 'won';

function tileOpenings(tile: TileDef, rot: number): Dir[] {
  return rotateDirs(SHAPE_OPENINGS[tile.shape], rot);
}

function poweredFromSource(mission: Mission, rotations: number[]): Set<number> {
  const { size, sourceRow, tiles } = mission;
  const start = sourceRow * size + 0;
  const visited = new Set<number>();
  const startOpens = tileOpenings(tiles[start], rotations[start]);
  if (!startOpens.includes(3)) return visited;

  visited.add(start);
  const queue = [start];

  while (queue.length) {
    const idx = queue.shift()!;
    const x = idx % size;
    const y = Math.floor(idx / size);
    const opens = tileOpenings(tiles[idx], rotations[idx]);
    for (const dir of opens) {
      const [dx, dy] = DELTA[dir];
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
      const nidx = ny * size + nx;
      if (visited.has(nidx)) continue;
      const nopens = tileOpenings(tiles[nidx], rotations[nidx]);
      if (!nopens.includes(OPPOSITE[dir])) continue;
      visited.add(nidx);
      queue.push(nidx);
    }
  }
  return visited;
}

function isPathComplete(mission: Mission, rotations: number[], powered: Set<number>): boolean {
  const destIdx = mission.destRow * mission.size + (mission.size - 1);
  const destOpens = tileOpenings(mission.tiles[destIdx], rotations[destIdx]);
  return powered.has(destIdx) && destOpens.includes(1);
}

function TilePipes({
  opens,
  lit,
}: {
  opens: Dir[];
  lit: boolean;
}) {
  const stroke = lit ? '#2dd4bf' : '#a8a29e';
  const glow = lit ? 'drop-shadow(0 0 6px rgba(45,212,191,0.85))' : undefined;
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
      <circle cx="50" cy="50" r="9" fill={lit ? '#facc15' : '#e7e5e4'} style={{ filter: glow }} />
      {opens.includes(0) && <rect x="44" y="0" width="12" height="50" rx="6" fill={stroke} style={{ filter: glow }} />}
      {opens.includes(1) && <rect x="50" y="44" width="50" height="12" rx="6" fill={stroke} style={{ filter: glow }} />}
      {opens.includes(2) && <rect x="44" y="50" width="12" height="50" rx="6" fill={stroke} style={{ filter: glow }} />}
      {opens.includes(3) && <rect x="0" y="44" width="50" height="12" rx="6" fill={stroke} style={{ filter: glow }} />}
      <circle cx="50" cy="50" r="6" fill={lit ? '#fde68a' : '#fafaf9'} />
    </svg>
  );
}

const GameSkillConnector: React.FC = () => {
  const [phase, setPhase] = useState<Phase>('select');
  const [mission, setMission] = useState<Mission>(MISSIONS[0]);
  const [rotations, setRotations] = useState<number[]>(() => scrambleUntilUnsolved(MISSIONS[0]));
  const [moves, setMoves] = useState(0);

  const lit = useMemo(() => poweredFromSource(mission, rotations), [mission, rotations]);
  const pathComplete = isPathComplete(mission, rotations, lit);

  const startMission = (next: Mission) => {
    setMission(next);
    setRotations(scrambleUntilUnsolved(next));
    setMoves(0);
    setPhase('playing');
  };

  const rotateTile = useCallback(
    (index: number) => {
      if (phase !== 'playing') return;
      setRotations((prev) => {
        const next = [...prev];
        next[index] = (next[index] + 1) % 4;
        const powered = poweredFromSource(mission, next);
        if (isPathComplete(mission, next, powered)) {
          window.setTimeout(() => setPhase('won'), 420);
        }
        return next;
      });
      setMoves((n) => n + 1);
    },
    [mission, phase]
  );

  const pathSkills = useMemo(() => mission.highlight.map((id) => SKILLS[id]), [mission]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0a] text-white selection:bg-yellow-300 selection:text-black">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-yellow-400/12 blur-[110px]" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-teal-400/12 blur-[120px]" />
      </div>

      <div className="fixed top-4 left-4 z-20">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur-md hover:bg-white/10"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          หน้าหลัก
        </Link>
      </div>

      {phase === 'select' && (
        <div className="relative mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-4 py-24">
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-yellow-300/90">MindDoJo · Skill Connector</p>
          <h1 className="mt-3 text-center text-4xl font-black tracking-tight sm:text-5xl">ต่อสายวิชาชีพผู้นำ</h1>
          <p className="mt-3 max-w-lg text-center text-sm leading-relaxed text-zinc-400">
            เชื่อมทักษะจากแกน Foundation ไปสู่ผลลัพธ์ความเป็นผู้นำ
            แตะหมุนชิ้นส่วนเพื่อสร้างเส้นทาง
          </p>

          <div className="mt-10 grid w-full gap-4 sm:grid-cols-2">
            {MISSIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => startMission(item)}
                className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-left transition hover:border-yellow-400/40 hover:bg-white/[0.07]"
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-300">{item.sourceSub}</p>
                <h2 className="mt-2 text-xl font-black text-white">{item.titleTh}</h2>
                <p className="mt-1 text-xs font-semibold text-yellow-200/90">{item.title}</p>
                <p className="mt-3 text-sm text-zinc-400">{item.tagline}</p>
                <span className="mt-5 inline-flex rounded-full bg-yellow-400 px-4 py-2 text-xs font-black text-black">
                  เลือกเส้นทางนี้
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {(phase === 'playing' || phase === 'won') && (
        <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-3 py-20">
          <div className="mb-5 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-teal-300">Skill Connector</p>
            <h2 className="mt-1 text-2xl font-black sm:text-3xl">{mission.titleTh}</h2>
            <p className="mt-1 text-xs text-zinc-500">แตะชิ้นส่วนเพื่อหมุน · {moves} ครั้ง</p>
          </div>

          <div className="flex w-full max-w-3xl items-center gap-2 sm:gap-4">
            <SourceNode label={mission.sourceLabel} sub={mission.sourceSub} active={lit.size > 0} />

            <div
              className="grid flex-1 gap-1.5 sm:gap-2"
              style={{ gridTemplateColumns: `repeat(${mission.size}, minmax(0, 1fr))` }}
            >
              {mission.tiles.map((tile, index) => {
                const opens = tileOpenings(tile, rotations[index]);
                const isLit = lit.has(index);
                const Icon = tile.skill.Icon;
                return (
                  <button
                    key={`${tile.skill.id}-${index}`}
                    type="button"
                    onClick={() => rotateTile(index)}
                    disabled={phase === 'won'}
                    className={`relative aspect-square overflow-hidden rounded-2xl border transition active:scale-[0.97] ${
                      isLit
                        ? 'border-teal-300/70 bg-teal-400/10 shadow-[0_0_24px_rgba(45,212,191,0.25)]'
                        : 'border-white/10 bg-[#141414] hover:border-yellow-400/40'
                    }`}
                    aria-label={`หมุน ${tile.skill.labelTh}`}
                  >
                    <TilePipes opens={opens} lit={isLit} />
                    <div className="relative z-10 flex h-full flex-col items-center justify-center px-1 pt-3">
                      <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${isLit ? 'text-yellow-300' : 'text-zinc-300'}`} />
                      <span className={`mt-1 max-w-[96%] truncate text-[8px] font-bold sm:text-[10px] ${isLit ? 'text-white' : 'text-zinc-500'}`}>
                        {tile.skill.label}
                      </span>
                    </div>
                    <RotateCw className="absolute bottom-1.5 right-1.5 h-3 w-3 text-zinc-600" />
                  </button>
                );
              })}
            </div>

            <DestNode label={mission.destLabel} sub={mission.destSub} active={pathComplete} />
          </div>
        </div>
      )}

      {phase === 'won' && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center">
          <div className="relative w-full max-w-lg overflow-hidden rounded-[28px] border border-yellow-400/30 bg-[#111111] p-6 shadow-2xl sm:p-8">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-yellow-400 via-white to-teal-400" />
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-teal-300">ปลดล็อกศักยภาพ</p>
            <h3 className="mt-2 text-2xl font-black text-white">เชื่อมต่อสำเร็จ</h3>
            <p className="mt-3 text-sm leading-relaxed text-zinc-300">{mission.winMessage}</p>

            <div className="mt-5 flex flex-wrap gap-2">
              {pathSkills.map((skill) => {
                const Icon = skill.Icon;
                return (
                  <span
                    key={skill.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1.5 text-xs font-semibold text-yellow-100"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {skill.label}
                  </span>
                );
              })}
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <a
                href="https://www.minddojo.co.th/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 rounded-2xl bg-yellow-400 px-4 py-3.5 text-center text-sm font-black text-black hover:bg-yellow-300"
              >
                ดูหลักสูตรแบบละเอียด
              </a>
              <a
                href="https://www.minddojo.co.th/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 rounded-2xl border border-teal-300/40 px-4 py-3.5 text-center text-sm font-bold text-teal-200 hover:bg-teal-400/10"
              >
                ลงทะเบียนล่วงหน้า
              </a>
            </div>
            <button
              type="button"
              onClick={() => setPhase('select')}
              className="mt-3 w-full py-2 text-sm text-zinc-500 hover:text-white"
            >
              เลือกเส้นทางใหม่
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

function SourceNode({ label, sub, active }: { label: string; sub: string; active: boolean }) {
  return (
    <div className="flex w-20 shrink-0 flex-col items-center sm:w-28">
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-full border-2 sm:h-24 sm:w-24 ${
          active ? 'border-yellow-300 bg-yellow-400/20 shadow-[0_0_30px_rgba(250,204,21,0.35)]' : 'border-yellow-400/40 bg-black'
        }`}
      >
        <div className="relative h-10 w-10 sm:h-14 sm:w-14">
          <div className="absolute inset-0 animate-spin rounded-full border border-dashed border-yellow-300/70" />
          <Cpu className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-yellow-300 sm:h-6 sm:w-6" />
        </div>
      </div>
      <p className="mt-2 text-center text-[9px] font-black leading-tight text-yellow-200 sm:text-[11px]">{label}</p>
      <p className="text-center text-[8px] text-zinc-500 sm:text-[10px]">{sub}</p>
    </div>
  );
}

function DestNode({ label, sub, active }: { label: string; sub: string; active: boolean }) {
  return (
    <div className="flex w-20 shrink-0 flex-col items-center sm:w-28">
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-2xl border-2 p-2 text-center sm:h-24 sm:w-24 ${
          active
            ? 'border-teal-300 bg-teal-400/20 shadow-[0_0_34px_rgba(45,212,191,0.45)]'
            : 'border-white/15 bg-black'
        }`}
      >
        <Sparkles className={`h-6 w-6 sm:h-8 sm:w-8 ${active ? 'text-teal-200' : 'text-zinc-500'}`} />
      </div>
      <p className={`mt-2 text-center text-[9px] font-black leading-tight sm:text-[11px] ${active ? 'text-teal-200' : 'text-zinc-400'}`}>
        {label}
      </p>
      <p className="text-center text-[8px] text-zinc-500 sm:text-[10px]">{sub}</p>
    </div>
  );
}

export default GameSkillConnector;
