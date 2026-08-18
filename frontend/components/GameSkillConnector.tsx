import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Brain,
  Handshake,
  Lightbulb,
  Sparkles,
  Sprout,
  Target,
  Users,
  Heart,
  User,
} from 'lucide-react';

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
  labelTh: string;
  Icon: React.ComponentType<{ className?: string }>;
};

type Mission = {
  id: string;
  titleTh: string;
  tagline: string;
  destSub: string;
  size: number;
  startRow: number;
  destRow: number;
  skills: Skill[];
  highlight: SkillId[];
  winMessage: string;
};

const SKILLS: Record<SkillId, Skill> = {
  creativity: { id: 'creativity', labelTh: 'สร้างสรรค์', Icon: Lightbulb },
  ei: { id: 'ei', labelTh: 'เข้าใจอารมณ์', Icon: Heart },
  collaboration: { id: 'collaboration', labelTh: 'ร่วมมือ', Icon: Handshake },
  learning: { id: 'learning', labelTh: 'เรียนรู้', Icon: Sprout },
  communication: { id: 'communication', labelTh: 'สื่อสาร', Icon: Users },
  decision: { id: 'decision', labelTh: 'ตัดสินใจ', Icon: Target },
  empathy: { id: 'empathy', labelTh: 'เข้าใจคน', Icon: Brain },
  agility: { id: 'agility', labelTh: 'คล่องตัว', Icon: Sparkles },
};

const MISSIONS: Mission[] = [
  {
    id: 'resilient',
    titleTh: 'ผู้นำที่ยืดหยุ่น',
    tagline: 'กระดานเล็ก 3×3 — เริ่มจากตรงนี้',
    destSub: 'ผู้นำที่ยืดหยุ่น',
    size: 3,
    startRow: 1,
    destRow: 1,
    skills: [
      SKILLS.communication,
      SKILLS.ei,
      SKILLS.decision,
      SKILLS.empathy,
      SKILLS.learning,
      SKILLS.agility,
      SKILLS.creativity,
      SKILLS.collaboration,
      SKILLS.communication,
    ],
    highlight: ['ei', 'learning'],
    winMessage: 'คุณต่อเส้นสำเร็จแล้ว ผู้นำที่ดีต้องเข้าใจความรู้สึกคนอื่น และไม่หยุดเรียนรู้ — MindDoJo สอนเรื่องนี้ได้',
  },
  {
    id: 'innovation',
    titleTh: 'นวัตกรรม',
    tagline: 'กระดานใหญ่ขึ้น 4×4 — ท้าทายนิดหน่อย',
    destSub: 'นวัตกรรม',
    size: 4,
    startRow: 1,
    destRow: 1,
    skills: [
      SKILLS.communication,
      SKILLS.creativity,
      SKILLS.decision,
      SKILLS.agility,
      SKILLS.ei,
      SKILLS.collaboration,
      SKILLS.learning,
      SKILLS.empathy,
      SKILLS.agility,
      SKILLS.communication,
      SKILLS.creativity,
      SKILLS.decision,
      SKILLS.learning,
      SKILLS.collaboration,
      SKILLS.ei,
      SKILLS.empathy,
    ],
    highlight: ['creativity', 'collaboration'],
    winMessage: 'คุณต่อเส้นสำเร็จแล้ว การสร้างของใหม่ต้องคิดสร้างสรรค์ และทำงานกับคนอื่นเป็น — MindDoJo สอนเรื่องนี้ได้',
  },
];

type Phase = 'select' | 'playing' | 'won';

function startIndex(mission: Mission): number {
  return mission.startRow * mission.size + 0;
}

function destIndex(mission: Mission): number {
  return mission.destRow * mission.size + (mission.size - 1);
}

function neighbors(index: number, size: number): number[] {
  const x = index % size;
  const y = Math.floor(index / size);
  const out: number[] = [];
  if (y > 0) out.push(index - size);
  if (x < size - 1) out.push(index + 1);
  if (y < size - 1) out.push(index + size);
  if (x > 0) out.push(index - 1);
  return out;
}

const GameSkillConnector: React.FC = () => {
  const [phase, setPhase] = useState<Phase>('select');
  const [mission, setMission] = useState<Mission>(MISSIONS[0]);
  const [path, setPath] = useState<number[]>([]);

  const startIdx = startIndex(mission);
  const destIdx = destIndex(mission);
  const last = path[path.length - 1];
  const complete = last === destIdx;
  const nextChoices = useMemo(() => {
    if (path.length === 0) return new Set([startIdx]);
    return new Set(neighbors(last, mission.size).filter((i) => !path.includes(i)));
  }, [path, last, mission.size, startIdx]);

  const pathSkills = useMemo(() => mission.highlight.map((id) => SKILLS[id]), [mission]);

  const startMission = (next: Mission) => {
    setMission(next);
    setPath([]);
    setPhase('playing');
  };

  const tapTile = (index: number) => {
    if (phase !== 'playing') return;
    if (path.length && path[path.length - 1] === index) {
      setPath((prev) => prev.slice(0, -1));
      return;
    }
    if (path.includes(index)) return;
    if (path.length === 0) {
      if (index !== startIdx) return;
      setPath([index]);
      return;
    }
    if (!nextChoices.has(index)) return;
    const nextPath = [...path, index];
    setPath(nextPath);
    if (index === destIdx) {
      window.setTimeout(() => setPhase('won'), 380);
    }
  };

  const helpOne = () => {
    if (phase !== 'playing' || complete) return;
    if (path.length === 0) {
      setPath([startIdx]);
      return;
    }
    const choices = neighbors(last, mission.size).filter((i) => !path.includes(i));
    if (choices.length === 0) {
      setPath((prev) => prev.slice(0, -1));
      return;
    }
    const destX = destIdx % mission.size;
    const destY = Math.floor(destIdx / mission.size);
    const best = choices
      .slice()
      .sort((a, b) => {
        const ax = a % mission.size;
        const ay = Math.floor(a / mission.size);
        const bx = b % mission.size;
        const by = Math.floor(b / mission.size);
        const da = Math.abs(ax - destX) + Math.abs(ay - destY);
        const db = Math.abs(bx - destX) + Math.abs(by - destY);
        return da - db;
      })[0];
    const nextPath = [...path, best];
    setPath(nextPath);
    if (best === destIdx) {
      window.setTimeout(() => setPhase('won'), 380);
    }
  };

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
          <p className="text-sm font-semibold text-yellow-300">เกมต่อเส้นทักษะ</p>
          <h1 className="mt-2 text-center text-3xl font-black tracking-tight sm:text-5xl">Skill Connector</h1>
          <ol className="mt-6 max-w-md space-y-2 text-base leading-relaxed text-zinc-200">
            <li>
              1. กดช่องติดปุ่ม <span className="font-bold text-yellow-200">เริ่ม</span>
            </li>
            <li>2. กดช่องที่ติดกันต่อไปเรื่อย ๆ</li>
            <li>
              3. ไปให้ถึงปุ่ม <span className="font-bold text-teal-200">เส้นชัย</span>
            </li>
          </ol>

          <div className="mt-10 grid w-full gap-4 sm:grid-cols-2">
            {MISSIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => startMission(item)}
                className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-left transition hover:border-yellow-400/40 hover:bg-white/[0.07]"
              >
                <p className="text-sm font-semibold text-teal-300">{item.size}×{item.size} ช่อง</p>
                <h2 className="mt-2 text-xl font-black text-white">{item.titleTh}</h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{item.tagline}</p>
                <span className="mt-5 inline-flex rounded-full bg-yellow-400 px-4 py-2 text-sm font-black text-black">
                  เริ่มเล่น
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {(phase === 'playing' || phase === 'won') && (
        <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-3 py-20">
          <div className="mb-5 text-center">
            <h2 className="text-2xl font-black sm:text-3xl">{mission.titleTh}</h2>
            <p className="mt-2 text-base text-zinc-200">
              กดช่องติดกัน จาก <span className="font-bold text-yellow-200">เริ่ม</span> ไป{' '}
              <span className="font-bold text-teal-200">เส้นชัย</span>
            </p>
            {path.length === 0 ? (
              <p className="mt-1 text-sm font-semibold text-yellow-300">กดช่องซ้ายสุดแถวกลางก่อน</p>
            ) : (
              <p className="mt-1 text-sm text-zinc-500">ต่อแล้ว {path.length} ช่อง · กดช่องล่าสุดอีกครั้งเพื่อย้อนกลับ</p>
            )}
          </div>

          <div className="flex w-full max-w-3xl items-center gap-2 sm:gap-4">
            <SideNode kind="start" active={path.length > 0} sub="คุณ" />

            <div
              className="grid flex-1 gap-1.5 sm:gap-2"
              style={{ gridTemplateColumns: `repeat(${mission.size}, minmax(0, 1fr))` }}
            >
              {mission.skills.map((skill, index) => {
                const Icon = skill.Icon;
                const step = path.indexOf(index);
                const inPath = step >= 0;
                const isNext = nextChoices.has(index);
                const isStart = index === startIdx;
                const isDest = index === destIdx;
                return (
                  <button
                    key={`${skill.id}-${index}`}
                    type="button"
                    onClick={() => tapTile(index)}
                    disabled={phase === 'won'}
                    className={`relative aspect-square overflow-hidden rounded-2xl border-2 transition active:scale-[0.97] ${
                      inPath
                        ? 'border-teal-300 bg-teal-400/15 shadow-[0_0_24px_rgba(45,212,191,0.28)]'
                        : isNext
                          ? 'border-yellow-400/80 bg-yellow-400/10 animate-pulse'
                          : 'border-white/10 bg-[#141414]'
                    }`}
                    aria-label={skill.labelTh}
                  >
                    {isStart && !inPath && (
                      <span className="absolute left-1 top-1 rounded bg-yellow-400 px-1.5 py-0.5 text-[9px] font-black text-black">
                        กดที่นี่
                      </span>
                    )}
                    {isDest && (
                      <span className="absolute right-1 top-1 rounded bg-teal-400 px-1.5 py-0.5 text-[9px] font-black text-black">
                        เส้นชัย
                      </span>
                    )}
                    <div className="relative z-10 flex h-full flex-col items-center justify-center px-1">
                      {inPath ? (
                        <span className="mb-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-yellow-400 text-sm font-black text-black">
                          {step + 1}
                        </span>
                      ) : (
                        <Icon className={`h-6 w-6 ${isNext ? 'text-yellow-300' : 'text-zinc-400'}`} />
                      )}
                      <span
                        className={`mt-1 max-w-[96%] text-center text-[10px] font-bold leading-tight sm:text-xs ${
                          inPath ? 'text-white' : isNext ? 'text-yellow-100' : 'text-zinc-400'
                        }`}
                      >
                        {skill.labelTh}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <SideNode kind="goal" active={complete} sub={mission.destSub} />
          </div>

          {phase === 'playing' && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setPath([])}
                className="rounded-full border border-white/15 px-4 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-white/5"
              >
                เริ่มใหม่
              </button>
              <button
                type="button"
                onClick={helpOne}
                className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-5 py-2.5 text-sm font-semibold text-yellow-200 hover:bg-yellow-400/20"
              >
                ช่วยต่อให้ 1 ช่อง
              </button>
            </div>
          )}
        </div>
      )}

      {phase === 'won' && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center">
          <div className="relative w-full max-w-lg overflow-hidden rounded-[28px] border border-yellow-400/30 bg-[#111111] p-6 shadow-2xl sm:p-8">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-yellow-400 via-white to-teal-400" />
            <p className="text-sm font-semibold text-teal-300">เยี่ยมมาก</p>
            <h3 className="mt-2 text-2xl font-black text-white">คุณชนะแล้ว!</h3>
            <p className="mt-3 text-base leading-relaxed text-zinc-200">{mission.winMessage}</p>

            <div className="mt-5 flex flex-wrap gap-2">
              {pathSkills.map((skill) => {
                const Icon = skill.Icon;
                return (
                  <span
                    key={skill.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1.5 text-xs font-semibold text-yellow-100"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {skill.labelTh}
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
                ดูหลักสูตร MindDoJo
              </a>
              <a
                href="https://www.minddojo.co.th/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 rounded-2xl border border-teal-300/40 px-4 py-3.5 text-center text-sm font-bold text-teal-200 hover:bg-teal-400/10"
              >
                สนใจเรียน คลิกที่นี่
              </a>
            </div>
            <button
              type="button"
              onClick={() => setPhase('select')}
              className="mt-3 w-full py-2 text-sm text-zinc-500 hover:text-white"
            >
              เล่นอีกครั้ง
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

function SideNode({
  kind,
  active,
  sub,
}: {
  kind: 'start' | 'goal';
  active: boolean;
  sub: string;
}) {
  const isStart = kind === 'start';
  return (
    <div className="flex w-20 shrink-0 flex-col items-center sm:w-28">
      <div
        className={`flex h-16 w-16 items-center justify-center sm:h-24 sm:w-24 ${
          isStart ? 'rounded-full border-2' : 'rounded-2xl border-2 p-2'
        } ${
          isStart
            ? active
              ? 'border-yellow-300 bg-yellow-400/20 shadow-[0_0_30px_rgba(250,204,21,0.35)]'
              : 'border-yellow-400/40 bg-black'
            : active
              ? 'border-teal-300 bg-teal-400/20 shadow-[0_0_34px_rgba(45,212,191,0.45)]'
              : 'border-white/15 bg-black'
        }`}
      >
        {isStart ? (
            <User className="h-6 w-6 text-yellow-300 sm:h-8 sm:w-8" />
        ) : (
          <Sparkles className={`h-6 w-6 sm:h-8 sm:w-8 ${active ? 'text-teal-200' : 'text-zinc-500'}`} />
        )}
      </div>
      <p
        className={`mt-2 text-center text-[11px] font-black leading-tight sm:text-sm ${
          isStart ? 'text-yellow-200' : active ? 'text-teal-200' : 'text-zinc-300'
        }`}
      >
        {isStart ? 'เริ่ม' : 'เส้นชัย'}
      </p>
      <p className="text-center text-[10px] text-zinc-400 sm:text-xs">{sub}</p>
    </div>
  );
}

export default GameSkillConnector;
