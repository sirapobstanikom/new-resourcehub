import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  EMPLOYEE_R1,
  EMPLOYEE_R2,
  EMPLOYEE_R3,
  EMPLOYEE_R4,
  EMPLOYEE_W1,
  EMPLOYEE_W2,
  EMPLOYEE_W3,
  EMPLOYEE_W4,
  MANAGER_R1,
  MANAGER_R2,
  MANAGER_R3,
  MANAGER_R4,
  MANAGER_W1,
  MANAGER_W2,
  MANAGER_W3,
  MANAGER_W4,
  ROLE_OPTIONS,
  SCENARIO_GROUPS,
  whaleDoneHasDetail,
  type WhaleDoneRole,
  type WhaleDoneScenarioId,
} from '../data/whaleDoneRolePlayData';
import {
  ACCOUNT_CASE_OPTIONS,
  getAccountabilityCard,
  type AccountabilityCard,
  type AccountabilitySection,
  type AccountCaseKey,
} from '../data/accountabilityRolePlayData';
import { AccountabilityWorkbookCollapsible } from './AccountabilityWorkbookCollapsible';

const selectClass =
  'w-full max-w-md px-4 py-3 rounded-xl bg-black/50 border border-white/15 text-white focus:outline-none focus:border-yellow-400 appearance-none cursor-pointer';

type WhaleDonePageTab = 'whaledone' | 'accountability';

/** บทบาทแท็บ Account: ผู้จัดการ/พนักงาน (กรณี 01–03) · ผู้ขอความร่วมมือ/คู่เจรจา (กรณี 04 เท่านั้น) */
type AccountTabRole = WhaleDoneRole | 'requester' | 'peer';

const ACCOUNT_TAB_ROLE_OPTIONS: { value: AccountTabRole; label: string }[] = [
  { value: 'manager', label: 'บทบาทผู้จัดการ' },
  { value: 'employee', label: 'บทบาทพนักงาน' },
  { value: 'requester', label: 'ผู้ขอความร่วมมือ' },
  { value: 'peer', label: 'คู่เจรจา' },
];

function mapAccountTabRoleToCardRole(role: AccountTabRole | ''): WhaleDoneRole | '' {
  if (role === 'requester') return 'manager';
  if (role === 'peer') return 'employee';
  if (role === 'manager' || role === 'employee') return role;
  return '';
}

function accountCaseOptionsForTabRole(role: AccountTabRole | '') {
  if (!role) return [];
  if (role === 'requester' || role === 'peer') {
    return ACCOUNT_CASE_OPTIONS.filter((o) => o.value === 'case4');
  }
  return ACCOUNT_CASE_OPTIONS.filter((o) => o.value !== 'case4');
}

const headerNavBtnBase =
  'px-4 py-2 rounded-lg text-sm font-semibold transition-colors border focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black/30';

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

function AccountabilitySectionBlock({ section }: { section: AccountabilitySection }) {
  switch (section.type) {
    case 'who':
      return (
        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400/90">คุณคือใคร</h3>
          {section.body
            .split('\n')
            .filter((p) => p.trim())
            .map((p, i) => (
              <p key={i} className="text-sm text-gray-200 leading-relaxed">
                {p}
              </p>
            ))}
        </section>
      );
    case 'feelings':
      return (
        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-yellow-400/90">{section.title}</h3>
          <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-line">{section.body}</p>
        </section>
      );
    case 'goals':
      return (
        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400/90">{section.title}</h3>
          <ol className="space-y-2 list-decimal list-inside marker:text-emerald-400/80 text-sm text-gray-200 leading-relaxed">
            {section.items.map((item, i) => (
              <li key={i} className="pl-1">
                {item}
              </li>
            ))}
          </ol>
        </section>
      );
    case 'paragraph':
      return (
        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white/90">{section.title}</h3>
          <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-line">{section.body}</p>
        </section>
      );
    case 'avoid':
      return (
        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400/90">{section.title}</h3>
          <ul className="space-y-2 text-sm text-gray-200 leading-relaxed">
            {section.items.map((item, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-rose-400/90 shrink-0">✗</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      );
    case 'opening':
      return (
        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400/90">{section.title}</h3>
          <p className="text-sm text-cyan-100/90 leading-relaxed border-l-2 border-cyan-500/40 pl-4">
            {section.body}
          </p>
        </section>
      );
    case 'howTo':
      return (
        <section className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400/90">{section.title}</h3>
          <ol className="space-y-4 list-decimal list-inside marker:text-emerald-400/80">
            {section.items.map((item, idx) => (
              <li key={idx} className="text-sm text-gray-200 leading-relaxed pl-1">
                <span className="font-semibold text-white">{item.lead}</span>
                {item.line ? (
                  <>
                    <span className="text-gray-400"> : </span>
                    {item.line}
                  </>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      );
    default: {
      const _exhaustive: never = section;
      return _exhaustive;
    }
  }
}

function AccountabilityRoleCardArticle({ card }: { card: AccountabilityCard }) {
  return (
    <article className="rounded-2xl border border-cyan-500/20 bg-white/[0.04] p-6 md:p-8 space-y-8 text-left">
      <h2 className="text-lg md:text-xl font-bold text-cyan-300/95 leading-snug">{card.headline}</h2>
      {card.sections.map((sec, idx) => (
        <React.Fragment key={idx}>
          <AccountabilitySectionBlock section={sec} />
        </React.Fragment>
      ))}
    </article>
  );
}

const WhaleDoneRolePlayPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<WhaleDonePageTab>('whaledone');
  const [role, setRole] = useState<WhaleDoneRole | ''>('');
  const [scenarioId, setScenarioId] = useState<WhaleDoneScenarioId | ''>('');
  const [accountRole, setAccountRole] = useState<AccountTabRole | ''>('');
  const [accountCase, setAccountCase] = useState<AccountCaseKey | ''>('');

  const showDetail = role && scenarioId && whaleDoneHasDetail(role, scenarioId);
  const showComingSoon = role && scenarioId && !whaleDoneHasDetail(role, scenarioId);
  const accountCardRole = mapAccountTabRoleToCardRole(accountRole);
  const accountCard =
    accountCardRole && accountCase ? getAccountabilityCard(accountCase, accountCardRole) : null;

  return (
    <div className="min-h-screen bg-transparent text-white bg-grid flex flex-col selection:bg-yellow-400 selection:text-black">
      <header className="px-6 py-6 max-w-4xl mx-auto w-full">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center glow-yellow">
              <span className="text-black font-semibold text-xl">M</span>
            </div>
            <span className="text-xl font-semibold tracking-tighter">MindDoJo</span>
          </Link>

          <div className="flex flex-wrap items-center gap-2 sm:justify-center">
            <button
              type="button"
              onClick={() => setActiveTab('whaledone')}
              className={`${headerNavBtnBase} ${
                activeTab === 'whaledone'
                  ? 'bg-yellow-400/20 border-yellow-400 text-yellow-200'
                  : 'bg-white/5 border-white/15 text-gray-300 hover:border-white/30 hover:text-white'
              }`}
            >
              WhaleDone
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('accountability')}
              className={`${headerNavBtnBase} ${
                activeTab === 'accountability'
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-100'
                  : 'bg-white/5 border-white/15 text-gray-300 hover:border-white/30 hover:text-white'
              }`}
            >
              Accountability
            </button>
          </div>

          <Link
            to="/"
            className="text-sm text-gray-400 hover:text-white transition-colors sm:text-right shrink-0"
          >
            กลับหน้าหลัก
          </Link>
        </div>
      </header>

      <main className="flex-1 px-6 pb-16 max-w-3xl mx-auto w-full space-y-8">
        {activeTab === 'whaledone' && (
          <>
        <div className="text-center space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-cyan-400/90">Gamification</p>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            Whale Done Role play
          </h1>
          <p className="text-gray-400 text-sm max-w-xl mx-auto leading-relaxed">
            เลือกบทบาท แล้วเลือก R1–R4 (การเปลี่ยนทิศทาง) หรือ W1–W4 (Whale Done! ชื่นชมเชิงบวก) — เปิดใช้งานครบทุกระดับแล้ว
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

        {showDetail && role === 'manager' && scenarioId === 'w2' && (
          <WhaleDoneManagerScenario badge="ผู้จัดการ W2" data={MANAGER_W2} />
        )}

        {showDetail && role === 'employee' && scenarioId === 'w2' && (
          <WhaleDoneEmployeeScenario badge="พนักงาน W2" data={EMPLOYEE_W2} />
        )}

        {showDetail && role === 'manager' && scenarioId === 'w3' && (
          <WhaleDoneManagerScenario badge="ผู้จัดการ W3" data={MANAGER_W3} />
        )}

        {showDetail && role === 'employee' && scenarioId === 'w3' && (
          <WhaleDoneEmployeeScenario badge="พนักงาน W3" data={EMPLOYEE_W3} />
        )}

        {showDetail && role === 'manager' && scenarioId === 'w4' && (
          <WhaleDoneManagerScenario badge="ผู้จัดการ W4" data={MANAGER_W4} />
        )}

        {showDetail && role === 'employee' && scenarioId === 'w4' && (
          <WhaleDoneEmployeeScenario badge="พนักงาน W4" data={EMPLOYEE_W4} />
        )}
          </>
        )}

        {activeTab === 'accountability' && (
          <>
            <div className="text-center space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-cyan-400/90">Accountability</p>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Accountability</h1>
              <p className="text-gray-400 text-sm max-w-xl mx-auto leading-relaxed">
                เลือกบทบาทและกรณีด้านล่างเพื่อแสดงบัตรบทบาทสำหรับซ้อมบทสนทนาเรื่องความรับผิดชอบ (Accountability)
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8 space-y-6">
              <div className="space-y-2">
                <label htmlFor="acct-role" className="block text-sm font-medium text-gray-400">
                  เลือกบทบาท
                </label>
                <select
                  id="acct-role"
                  className={selectClass}
                  value={accountRole}
                  onChange={(e) => {
                    const v = (e.target.value as AccountTabRole) || '';
                    setAccountRole(v);
                    if (v === 'requester' || v === 'peer') {
                      setAccountCase('case4');
                    } else if (v === 'manager' || v === 'employee') {
                      setAccountCase((c) => (c === 'case4' ? '' : c));
                    } else {
                      setAccountCase('');
                    }
                  }}
                >
                  <option value="">— เลือก —</option>
                  {ACCOUNT_TAB_ROLE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="acct-case" className="block text-sm font-medium text-gray-400">
                  เลือกกรณี
                </label>
                <select
                  id="acct-case"
                  className={selectClass}
                  value={accountCase}
                  disabled={!accountRole}
                  onChange={(e) => setAccountCase((e.target.value as AccountCaseKey | '') || '')}
                >
                  <option value="">— เลือกกรณี —</option>
                  {accountCaseOptionsForTabRole(accountRole).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {accountRole === 'requester' || accountRole === 'peer' ? (
                  <p className="text-xs text-cyan-300/85 leading-relaxed">
                    บทบาทนี้ใช้กับ <span className="font-semibold text-cyan-200">กรณีที่ 04</span> เท่านั้น
                    (ระบบเลือกกรณีให้อัตโนมัติ)
                  </p>
                ) : accountRole === 'manager' || accountRole === 'employee' ? (
                  <p className="text-xs text-gray-500 leading-relaxed">
                    บทบาทผู้จัดการ / พนักงาน ใช้กับกรณีที่ 01–03
                  </p>
                ) : null}
              </div>
            </div>

            {!accountRole || !accountCase ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
                <p className="text-sm text-gray-400 leading-relaxed">
                  เลือกทั้งบทบาทและกรณีเพื่อแสดงบัตรบทบาท
                </p>
              </div>
            ) : accountCard ? (
              <div className="space-y-6">
                <AccountabilityRoleCardArticle card={accountCard} />
                <AccountabilityWorkbookCollapsible key={`${accountRole}-${accountCase}`} />
              </div>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
};

export default WhaleDoneRolePlayPage;
