import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  EMPLOYEE_R1,
  EMPLOYEE_R2,
  EMPLOYEE_R3,
  EMPLOYEE_R4,
  EMPLOYEE_W1,
  MANAGER_R1,
  MANAGER_R2,
  MANAGER_R3,
  MANAGER_R4,
  MANAGER_W1,
  ROLE_OPTIONS,
  SCENARIO_GROUPS,
  whaleDoneHasDetail,
  type WhaleDoneRole,
  type WhaleDoneScenarioId,
} from '../data/whaleDoneRolePlayData';
import {
  ACCOUNTABILITY_WORKBOOK_CASES,
  ACCOUNTABILITY_WORKBOOK_FORMULA_HEADING,
  ACCOUNTABILITY_WORKBOOK_FORMULA_STEPS,
  ACCOUNTABILITY_WORKBOOK_HOW_TO_USE,
  ACCOUNTABILITY_WORKBOOK_META,
  ACCOUNTABILITY_WORKBOOK_TIMING_HEADING,
  ACCOUNTABILITY_WORKBOOK_TIMING_ROWS,
} from '../data/accountabilityWithoutDramaWorkbook';

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

function AccountabilityWithoutDramaWorkbookFrame() {
  const m = ACCOUNTABILITY_WORKBOOK_META;
  const how = ACCOUNTABILITY_WORKBOOK_HOW_TO_USE;
  const fh = ACCOUNTABILITY_WORKBOOK_FORMULA_HEADING;
  const th = ACCOUNTABILITY_WORKBOOK_TIMING_HEADING;

  return (
    <aside
      className="rounded-2xl border-2 border-violet-500/35 bg-violet-950/25 p-6 md:p-8 space-y-8 text-left ring-1 ring-inset ring-white/5"
      aria-label="****Accountability Without Drama workbook reference****"
    >
      <header className="space-y-3 border-b border-white/10 pb-6">
        <p className="text-[10px] uppercase tracking-widest text-violet-300/90">Workbook reference</p>
        <h2 className="text-lg md:text-xl font-black text-white tracking-tight leading-tight">{m.titleEn}</h2>
        <p className="text-sm text-violet-200/95 font-medium leading-snug">{m.titleTh}</p>
        <div className="text-xs text-gray-400 space-y-1 leading-relaxed">
          <p>{m.line1}</p>
          <p>{m.line2}</p>
          <p>{m.line3}</p>
        </div>
      </header>

      <section className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-violet-300/90">Cases / กรณีในเล่ม</h3>
        <ul className="space-y-3 text-sm text-gray-200">
          {ACCOUNTABILITY_WORKBOOK_CASES.map((c) => (
            <li key={c.id} className="border-l-2 border-violet-500/50 pl-3">
              <span className="text-violet-300/90 font-semibold">Case {c.id}</span>
              <span className="text-gray-500"> · </span>
              <span className="text-white/95">{c.titleEn}</span>
              <span className="text-gray-500"> · </span>
              <span>{c.titleTh}</span>
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-gray-500 pt-1">{m.footerNote}</p>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400/90">
          {how.headingEn} / {how.headingTh}
        </h3>
        <p className="text-sm text-gray-300 leading-relaxed">{how.bodyEn}</p>
        <p className="text-sm text-gray-300 leading-relaxed border-l-2 border-cyan-500/35 pl-4">{how.bodyTh}</p>
      </section>

      <section className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300/90">
          {fh.en} / {fh.th}
        </h3>
        <ol className="space-y-4">
          {ACCOUNTABILITY_WORKBOOK_FORMULA_STEPS.map((s) => (
            <li
              key={s.step}
              className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-1.5 text-sm text-gray-200"
            >
              <p className="text-[11px] font-bold uppercase tracking-wide text-amber-400/90">{s.step}</p>
              <p className="font-semibold text-white">
                {s.titleEn} / {s.titleTh}
              </p>
              <p className="text-gray-300 leading-relaxed">{s.bodyEn}</p>
              <p className="text-gray-400 leading-relaxed text-[13px] border-l-2 border-amber-500/30 pl-3">{s.bodyTh}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400/90">
          {th.en} / {th.th}
        </h3>
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.06] text-gray-300">
                <th className="px-3 py-2.5 font-semibold w-14">Case</th>
                <th className="px-3 py-2.5 font-semibold">Scenario / กรณี</th>
                <th className="px-3 py-2.5 font-semibold whitespace-nowrap w-24">Time / เวลา</th>
              </tr>
            </thead>
            <tbody>
              {ACCOUNTABILITY_WORKBOOK_TIMING_ROWS.map((row) => (
                <tr key={row.caseId} className="border-b border-white/5 last:border-0 text-gray-200">
                  <td className="px-3 py-2.5 align-top text-violet-300/90 font-medium">{row.caseId}</td>
                  <td className="px-3 py-2.5 align-top">
                    <span className="text-white/90">{row.labelEn}</span>
                    <span className="text-gray-500"> · </span>
                    <span className="text-gray-300">{row.labelTh}</span>
                  </td>
                  <td className="px-3 py-2.5 align-top text-gray-400 whitespace-nowrap">{row.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </aside>
  );
}

const WhaleDoneRolePlayPage: React.FC = () => {
  const [role, setRole] = useState<WhaleDoneRole | ''>('');
  const [scenarioId, setScenarioId] = useState<WhaleDoneScenarioId | ''>('');
  const [workbookOpen, setWorkbookOpen] = useState(false);

  const showDetail = role && scenarioId && whaleDoneHasDetail(role, scenarioId);
  const showComingSoon = role && scenarioId && !whaleDoneHasDetail(role, scenarioId);
  const showAccountabilityWorkbook = Boolean(showDetail && scenarioId.startsWith('r'));

  useEffect(() => {
    setWorkbookOpen(false);
  }, [scenarioId]);

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
            เลือกบทบาท แล้วเลือก R1–R4 (การเปลี่ยนทิศทาง) หรือ W1–W4 (Whale Done! ชื่นชมเชิงบวก) — R ทั้งหมดและ W1 เปิดใช้งานแล้ว
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
                setScenarioId('');
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
            <label htmlFor="wd-scenario" className="block text-sm font-medium text-gray-400">
              เลือก R หรือ W
            </label>
            <select
              id="wd-scenario"
              className={`${selectClass} ${!role ? 'opacity-50 cursor-not-allowed' : ''}`}
              value={scenarioId}
              disabled={!role}
              onChange={(e) => setScenarioId((e.target.value as WhaleDoneScenarioId) || '')}
            >
              <option value="">— เลือก R หรือ W —</option>
              {SCENARIO_GROUPS.map((group) => (
                <optgroup key={group.labelTh} label={group.labelTh}>
                  {group.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {!role && (
              <p className="text-xs text-gray-500">กรุณาเลือกบทบาทก่อน แล้วจึงเลือก R1–R4 หรือ W1–W4</p>
            )}
          </div>
        </div>

        {showComingSoon && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-center">
            <p className="font-bold text-amber-200 mb-1">เร็วๆ นี้</p>
            <p className="text-sm text-gray-300">
              เนื้อหาสำหรับบทบาทนี้และระดับ {scenarioId?.toUpperCase()} กำลังเตรียมไว้ให้
            </p>
          </div>
        )}

        {showDetail && role === 'manager' && scenarioId === 'r1' && (
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

        {showDetail && role === 'employee' && scenarioId === 'r1' && (
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

        {showDetail && role === 'manager' && scenarioId === 'r2' && (
          <WhaleDoneManagerScenario badge="ผู้จัดการ R2" data={MANAGER_R2} />
        )}

        {showDetail && role === 'manager' && scenarioId === 'r3' && (
          <WhaleDoneManagerScenario badge="ผู้จัดการ R3" data={MANAGER_R3} />
        )}

        {showDetail && role === 'manager' && scenarioId === 'r4' && (
          <WhaleDoneManagerScenario badge="ผู้จัดการ R4" data={MANAGER_R4} />
        )}

        {showDetail && role === 'employee' && scenarioId === 'r2' && (
          <WhaleDoneEmployeeScenario badge="พนักงาน R2" data={EMPLOYEE_R2} />
        )}

        {showDetail && role === 'employee' && scenarioId === 'r3' && (
          <WhaleDoneEmployeeScenario badge="พนักงาน R3" data={EMPLOYEE_R3} />
        )}

        {showDetail && role === 'employee' && scenarioId === 'r4' && (
          <WhaleDoneEmployeeScenario badge="พนักงาน R4" data={EMPLOYEE_R4} />
        )}

        {showDetail && role === 'manager' && scenarioId === 'w1' && (
          <WhaleDoneManagerScenario badge="ผู้จัดการ W1" data={MANAGER_W1} />
        )}

        {showDetail && role === 'employee' && scenarioId === 'w1' && (
          <WhaleDoneEmployeeScenario badge="พนักงาน W1" data={EMPLOYEE_W1} />
        )}

        {showAccountabilityWorkbook && (
          <div className="space-y-3">
            <button
              type="button"
              id="accountability-workbook-toggle"
              aria-expanded={workbookOpen}
              aria-controls="accountability-workbook-panel"
              aria-label={
                workbookOpen
                  ? 'ซ่อนเอกสารอ้างอิง Accountability Without Drama'
                  : 'แสดงเอกสารอ้างอิง Accountability Without Drama'
              }
              onClick={() => setWorkbookOpen((o) => !o)}
              className="w-full flex items-center justify-between gap-3 rounded-xl border border-violet-500/45 bg-violet-950/35 px-4 py-3.5 text-left text-sm text-violet-100 hover:bg-violet-950/50 hover:border-violet-400/55 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black/40 transition-colors"
            >
              <span className="min-w-0 font-semibold text-white leading-snug tracking-tight break-words">
                ****Accountability Without Drama workbook reference****
              </span>
              <span
                className="shrink-0 text-violet-300 text-lg font-mono w-8 text-center"
                aria-hidden
              >
                {workbookOpen ? '▲' : '▼'}
              </span>
            </button>
            {workbookOpen && (
              <div id="accountability-workbook-panel" role="region" aria-labelledby="accountability-workbook-toggle">
                <AccountabilityWithoutDramaWorkbookFrame />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default WhaleDoneRolePlayPage;
