import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  EMPLOYEE_R1,
  EMPLOYEE_R2,
  EMPLOYEE_R3,
  EMPLOYEE_R4,
  MANAGER_R1,
  MANAGER_R2,
  MANAGER_R3,
  MANAGER_R4,
  R_OPTIONS,
  ROLE_OPTIONS,
  whaleDoneHasDetail,
  type WhaleDoneR,
  type WhaleDoneRole,
} from '../data/whaleDoneRolePlayData';

const selectClass =
  'w-full max-w-md px-4 py-3 rounded-xl bg-black/50 border border-white/15 text-white focus:outline-none focus:border-yellow-400 appearance-none cursor-pointer';

type ManagerScenarioData = {
  headline: string;
  subhead: string;
  situationEn: string;
  situationTh: string;
  cardTitle: string;
  whoYouAre: string;
  stepsTitle: string;
  steps: readonly { readonly label: string; readonly body: string }[];
  avoidTitle: string;
  avoid: readonly string[];
};

function WhaleDoneManagerScenario({ badge, data }: { badge: string; data: ManagerScenarioData }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 md:p-8 space-y-8 text-left">
      <div className="space-y-2">
        <h2 className="text-lg md:text-xl font-bold text-yellow-400/95">{badge}</h2>
        <p className="text-sm md:text-base font-semibold text-white leading-snug">{data.headline}</p>
        <p className="text-xs text-cyan-400/90 font-medium">{data.subhead}</p>
      </div>

      <section className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400/90">
          THE SITUATION / สถานการณ์
        </h3>
        <p className="text-sm text-gray-300 leading-relaxed">{data.situationEn}</p>
        <p className="text-sm text-gray-300 leading-relaxed border-l-2 border-cyan-500/40 pl-4">{data.situationTh}</p>
      </section>

      <div>
        <p className="text-sm md:text-base font-semibold text-white leading-snug">{data.cardTitle}</p>
      </div>

      <section className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400/90">คุณคือใคร</h3>
        <p className="text-sm text-gray-200 leading-relaxed">{data.whoYouAre}</p>
      </section>

      <section className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-yellow-400/90">{data.stepsTitle}</h3>
        <ol className="space-y-4 list-decimal list-inside marker:text-yellow-400/80">
          {data.steps.map((s, idx) => (
            <li key={`${idx}-${s.label}`} className="text-sm text-gray-200 leading-relaxed pl-1">
              <span className="font-semibold text-white">{s.label}</span>
              <span className="text-gray-400"> : </span>
              {s.body}
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400/90">{data.avoidTitle}</h3>
        <ul className="space-y-2 text-sm text-gray-300">
          {data.avoid.map((line) => (
            <li key={line} className="flex gap-2">
              <span className="text-rose-400 shrink-0">✗</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}

type EmployeeScenarioData = {
  headline: string;
  subhead: string;
  situationEn: string;
  situationTh: string;
  cardTitle: string;
  whoYouAre: string;
  feelingsTitle: string;
  feelings: string;
  howToPlayTitle: string;
  howToPlay: readonly { readonly lead: string; readonly line: string }[];
};

function WhaleDoneEmployeeScenario({ badge, data }: { badge: string; data: EmployeeScenarioData }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 md:p-8 space-y-8 text-left">
      <div className="space-y-2">
        <h2 className="text-lg md:text-xl font-bold text-yellow-400/95">{badge}</h2>
        <p className="text-sm md:text-base font-semibold text-white leading-snug">{data.headline}</p>
        <p className="text-xs text-cyan-400/90 font-medium">{data.subhead}</p>
      </div>

      <section className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400/90">
          THE SITUATION / สถานการณ์
        </h3>
        <p className="text-sm text-gray-300 leading-relaxed">{data.situationEn}</p>
        <p className="text-sm text-gray-300 leading-relaxed border-l-2 border-cyan-500/40 pl-4">{data.situationTh}</p>
      </section>

      <div>
        <p className="text-sm md:text-base font-semibold text-white leading-snug">{data.cardTitle}</p>
      </div>

      <section className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400/90">คุณคือใคร</h3>
        <p className="text-sm text-gray-200 leading-relaxed">{data.whoYouAre}</p>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-yellow-400/90">{data.feelingsTitle}</h3>
        <p className="text-sm text-gray-200 leading-relaxed">{data.feelings}</p>
      </section>

      <section className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400/90">{data.howToPlayTitle}</h3>
        <ol className="space-y-4 list-decimal list-inside marker:text-emerald-400/80">
          {data.howToPlay.map((item, idx) => (
            <li key={`${idx}-${item.lead}`} className="text-sm text-gray-200 leading-relaxed pl-1">
              <span className="font-semibold text-white">{item.lead}</span>
              <span className="text-gray-400"> : </span>
              {item.line}
            </li>
          ))}
        </ol>
      </section>
    </article>
  );
}

const WhaleDoneRolePlayPage: React.FC = () => {
  const [role, setRole] = useState<WhaleDoneRole | ''>('');
  const [rLevel, setRLevel] = useState<WhaleDoneR | ''>('');

  const showDetail = role && rLevel && whaleDoneHasDetail(role, rLevel);
  const showComingSoon = role && rLevel && !whaleDoneHasDetail(role, rLevel);

  return (
    <div className="min-h-screen bg-transparent text-white bg-grid flex flex-col selection:bg-yellow-400 selection:text-black">
      <header className="flex justify-between items-center px-6 py-6 max-w-4xl mx-auto w-full">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center glow-yellow">
            <span className="text-black font-semibold text-xl">M</span>
          </div>
          <span className="text-xl font-semibold tracking-tighter">MindDoJo</span>
        </Link>
        <Link
          to="/"
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          กลับหน้าหลัก
        </Link>
      </header>

      <main className="flex-1 px-6 pb-16 max-w-3xl mx-auto w-full space-y-8">
        <div className="text-center space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-cyan-400/90">Gamification</p>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            Whale Done Role play
          </h1>
          <p className="text-gray-400 text-sm max-w-xl mx-auto leading-relaxed">
            เลือกบทบาทและระดับ R เพื่ออ่านสถานการณ์และคำแนะนำการรับบทสำหรับซ้อมบทสนทนา (R1–R4 เปิดใช้งานแล้ว)
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8 space-y-6">
          <div className="space-y-2">
            <label htmlFor="wd-role" className="block text-sm font-medium text-gray-400">
              เลือกบทบาท
            </label>
            <select
              id="wd-role"
              className={selectClass}
              value={role}
              onChange={(e) => {
                const v = e.target.value as WhaleDoneRole | '';
                setRole(v);
                setRLevel('');
              }}
            >
              <option value="">— เลือก —</option>
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.labelTh}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="wd-r" className="block text-sm font-medium text-gray-400">
              เลือกระดับ (R)
            </label>
            <select
              id="wd-r"
              className={`${selectClass} ${!role ? 'opacity-50 cursor-not-allowed' : ''}`}
              value={rLevel}
              disabled={!role}
              onChange={(e) => setRLevel((e.target.value as WhaleDoneR) || '')}
            >
              <option value="">— เลือก R —</option>
              {R_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {!role && (
              <p className="text-xs text-gray-500">กรุณาเลือกบทบาทก่อน แล้วจึงเลือก R1–R4</p>
            )}
          </div>
        </div>

        {showComingSoon && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-center">
            <p className="font-bold text-amber-200 mb-1">เร็วๆ นี้</p>
            <p className="text-sm text-gray-300">
              เนื้อหาสำหรับบทบาทนี้และระดับ {rLevel?.toUpperCase()} กำลังเตรียมไว้ให้
            </p>
          </div>
        )}

        {showDetail && role === 'manager' && rLevel === 'r1' && (
          <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 md:p-8 space-y-8 text-left">
            <div>
              <h2 className="text-lg md:text-xl font-bold text-yellow-400/95 mb-1">
                ผู้จัดการ R1
              </h2>
              <p className="text-sm md:text-base font-semibold text-white leading-snug">
                {MANAGER_R1.title}
              </p>
            </div>

            <section className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400/90">
                THE SITUATION / สถานการณ์
              </h3>
              <p className="text-sm text-gray-300 leading-relaxed">{MANAGER_R1.situationEn}</p>
              <p className="text-sm text-gray-300 leading-relaxed border-l-2 border-cyan-500/40 pl-4">
                {MANAGER_R1.situationTh}
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400/90">
                คุณคือใคร
              </h3>
              <p className="text-sm text-gray-200 leading-relaxed">{MANAGER_R1.whoYouAre}</p>
            </section>

            <section className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-yellow-400/90">
                {MANAGER_R1.stepsTitle}
              </h3>
              <ol className="space-y-4 list-decimal list-inside marker:text-yellow-400/80">
                {MANAGER_R1.steps.map((s) => (
                  <li key={s.label} className="text-sm text-gray-200 leading-relaxed pl-1">
                    <span className="font-semibold text-white">{s.label}</span>
                    <span className="text-gray-400"> : </span>
                    {s.body}
                  </li>
                ))}
              </ol>
            </section>

            <section className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400/90">
                {MANAGER_R1.avoidTitle}
              </h3>
              <ul className="space-y-2 text-sm text-gray-300">
                {MANAGER_R1.avoid.map((line) => (
                  <li key={line} className="flex gap-2">
                    <span className="text-rose-400 shrink-0">✗</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </section>
          </article>
        )}

        {showDetail && role === 'employee' && rLevel === 'r1' && (
          <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 md:p-8 space-y-8 text-left">
            <div>
              <h2 className="text-lg md:text-xl font-bold text-yellow-400/95 mb-1">
                พนักงาน R1
              </h2>
              <p className="text-sm md:text-base font-semibold text-white leading-snug">
                {EMPLOYEE_R1.title}
              </p>
              <p className="text-xs text-cyan-400/90 mt-2 font-medium">{EMPLOYEE_R1.subtitle}</p>
            </div>

            <section className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400/90">
                THE SITUATION / สถานการณ์
              </h3>
              <p className="text-sm text-gray-300 leading-relaxed">{EMPLOYEE_R1.situationEn}</p>
              <p className="text-sm text-gray-300 leading-relaxed border-l-2 border-cyan-500/40 pl-4">
                {EMPLOYEE_R1.situationTh}
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400/90">
                คุณคือใคร
              </h3>
              <p className="text-sm text-gray-200 leading-relaxed">{EMPLOYEE_R1.whoYouAre}</p>
            </section>

            <section className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-yellow-400/90">
                {EMPLOYEE_R1.feelingsTitle}
              </h3>
              <p className="text-sm text-gray-200 leading-relaxed">{EMPLOYEE_R1.feelings}</p>
            </section>

            <section className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400/90">
                {EMPLOYEE_R1.howToPlayTitle}
              </h3>
              <ol className="space-y-3 list-decimal list-inside marker:text-emerald-400/80">
                {EMPLOYEE_R1.howToPlay.map((line) => (
                  <li key={line} className="text-sm text-gray-200 leading-relaxed pl-1">
                    {line}
                  </li>
                ))}
              </ol>
            </section>
          </article>
        )}

        {showDetail && role === 'manager' && rLevel === 'r2' && (
          <WhaleDoneManagerScenario badge="ผู้จัดการ R2" data={MANAGER_R2} />
        )}

        {showDetail && role === 'manager' && rLevel === 'r3' && (
          <WhaleDoneManagerScenario badge="ผู้จัดการ R3" data={MANAGER_R3} />
        )}

        {showDetail && role === 'manager' && rLevel === 'r4' && (
          <WhaleDoneManagerScenario badge="ผู้จัดการ R4" data={MANAGER_R4} />
        )}

        {showDetail && role === 'employee' && rLevel === 'r2' && (
          <WhaleDoneEmployeeScenario badge="พนักงาน R2" data={EMPLOYEE_R2} />
        )}

        {showDetail && role === 'employee' && rLevel === 'r3' && (
          <WhaleDoneEmployeeScenario badge="พนักงาน R3" data={EMPLOYEE_R3} />
        )}

        {showDetail && role === 'employee' && rLevel === 'r4' && (
          <WhaleDoneEmployeeScenario badge="พนักงาน R4" data={EMPLOYEE_R4} />
        )}
      </main>
    </div>
  );
};

export default WhaleDoneRolePlayPage;
