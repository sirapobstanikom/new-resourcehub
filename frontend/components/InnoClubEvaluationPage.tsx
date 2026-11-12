import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const SCORE_OPTIONS = [1, 2, 3, 4, 5] as const;
const BG_IMAGE = '/images/innoclub/inno-on-tour.png';
const EVALUATION_TABLE = 'innoclub_evaluation_responses';

const EVALUATION_SETUP_SQL = `create table if not exists public.innoclub_evaluation_responses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.innoclub_evaluation_responses
  add column if not exists facilitator_score smallint,
  add column if not exists facilitator_comment text,
  add column if not exists content_score smallint,
  add column if not exists content_comment text,
  add column if not exists overall_score smallint,
  add column if not exists atmosphere_score smallint,
  add column if not exists sharing_score smallint,
  add column if not exists overall_comment text,
  add column if not exists innovation_insight text,
  add column if not exists innovation_value text,
  add column if not exists innovation_application text,
  add column if not exists improvement_suggestions text,
  add column if not exists activity_learning_satisfaction text,
  add column if not exists learn_apply text,
  add column if not exists ai_plan_6months text;

alter table public.innoclub_evaluation_responses enable row level security;

grant select, insert on public.innoclub_evaluation_responses to anon, authenticated;

drop policy if exists "Allow insert innoclub_evaluation" on public.innoclub_evaluation_responses;
create policy "Allow insert innoclub_evaluation"
  on public.innoclub_evaluation_responses
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Allow read innoclub_evaluation" on public.innoclub_evaluation_responses;
create policy "Allow read innoclub_evaluation"
  on public.innoclub_evaluation_responses
  for select
  to anon, authenticated
  using (true);`;

type EvaluationInsert = Record<string, string | number | null>;

const OPEN_ANSWER_GROUPS = [
  ['innovation_insight', 'activity_learning_satisfaction'],
  ['innovation_value', 'learn_apply'],
  ['innovation_application', 'ai_plan_6months'],
] as const;

function missingColumnFromError(message: string): string | null {
  const fromCache = message.match(/Could not find the '([^']+)' column/i);
  if (fromCache) return fromCache[1];
  const fromPostgres = message.match(/column "([^"]+)" of relation/i);
  return fromPostgres?.[1] ?? null;
}

function needsDatabaseSetup(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('row-level security') ||
    normalized.includes('permission denied') ||
    normalized.includes('schema cache') ||
    normalized.includes('could not find the table')
  );
}

function keepsOpenAnswers(payload: EvaluationInsert): boolean {
  return OPEN_ANSWER_GROUPS.every((group) => group.some((column) => column in payload));
}

async function insertEvaluation(payload: EvaluationInsert): Promise<{ error: string | null; needsSetup: boolean }> {
  let current = { ...payload };
  for (let attempt = 0; attempt < 12; attempt += 1) {
    if (!keepsOpenAnswers(current)) {
      return {
        error: 'ตารางยังไม่มีคอลัมน์เก็บคำตอบปลายเปิด จึงยังบันทึกไม่ได้',
        needsSetup: true,
      };
    }
    const { error } = await supabase.from(EVALUATION_TABLE).insert(current);
    if (!error) return { error: null, needsSetup: false };
    const missingColumn = missingColumnFromError(error.message);
    if (missingColumn && missingColumn in current) {
      const next = { ...current };
      delete next[missingColumn];
      current = next;
      continue;
    }
    return { error: error.message, needsSetup: needsDatabaseSetup(error.message) };
  }
  return { error: 'บันทึกคำตอบไม่สำเร็จ', needsSetup: true };
}

const InnoClubEvaluationPage: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupSql, setSetupSql] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    facilitator_score: 0 as number,
    facilitator_comment: '',
    content_score: 0 as number,
    content_comment: '',
    overall_score: 0 as number,
    atmosphere_score: 0 as number,
    sharing_score: 0 as number,
    overall_comment: '',
    innovation_insight: '',
    innovation_value: '',
    innovation_application: '',
    improvement_suggestions: '',
  });

  const setScore = (key: keyof typeof form, value: number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };
  const setText = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const requiredScores = [
    form.facilitator_score,
    form.content_score,
    form.overall_score,
    form.atmosphere_score,
    form.sharing_score,
  ];
  const allRequiredFilled =
    requiredScores.every((s) => s >= 1 && s <= 5) &&
    form.innovation_insight.trim() !== '' &&
    form.innovation_value.trim() !== '' &&
    form.innovation_application.trim() !== '';
  const answeredRequiredCount =
    requiredScores.filter((s) => s >= 1 && s <= 5).length +
    [form.innovation_insight, form.innovation_value, form.innovation_application].filter((answer) => answer.trim() !== '')
      .length;
  const requiredTotal = requiredScores.length + 3;

  const renderScoreGroup = (field: keyof typeof form, name: string) => (
    <div className="grid grid-cols-5 gap-1.5 sm:flex sm:flex-wrap sm:gap-x-3 sm:gap-y-3">
      {SCORE_OPTIONS.map((n) => {
        const selected = form[field] === n;
        return (
          <label
            key={n}
            className={[
              'ibx-score flex min-h-12 cursor-pointer items-center justify-center rounded-[12px] border px-1 py-2.5 transition-all sm:min-h-[52px] sm:min-w-[52px] sm:rounded-[14px]',
              selected ? 'is-selected' : '',
            ].join(' ')}
          >
            <input
              type="radio"
              name={name}
              checked={form[field] === n}
              onChange={() => setScore(field, n)}
              className="sr-only"
              aria-label={`${name}-${n}`}
            />
            <span className="text-lg font-black sm:text-lg lg:text-xl">{n}</span>
          </label>
        );
      })}
    </div>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSetupSql(null);
    if (!allRequiredFilled) {
      setError('กรุณาตอบคำถามที่มี * ให้ครบ ทั้งคะแนน 5 ข้อและคำตอบปลายเปิด 3 ข้อ');
      window.setTimeout(
        () => document.getElementById('ibx-form-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
        0
      );
      return;
    }
    if (!isSupabaseConfigured) {
      setError('ยังไม่ได้ตั้งค่า Supabase กรุณาติดต่อผู้ดูแล');
      return;
    }
    setLoading(true);
    const { error: err, needsSetup } = await insertEvaluation({
      facilitator_score: form.facilitator_score,
      facilitator_comment: form.facilitator_comment.trim() || null,
      content_score: form.content_score,
      content_comment: form.content_comment.trim() || null,
      overall_score: form.overall_score,
      atmosphere_score: form.atmosphere_score,
      sharing_score: form.sharing_score,
      overall_comment: form.overall_comment.trim() || null,
      innovation_insight: form.innovation_insight.trim(),
      innovation_value: form.innovation_value.trim(),
      innovation_application: form.innovation_application.trim(),
      activity_learning_satisfaction: form.innovation_insight.trim(),
      learn_apply: form.innovation_value.trim(),
      ai_plan_6months: form.innovation_application.trim(),
      improvement_suggestions: form.improvement_suggestions.trim() || null,
    });
    setLoading(false);
    if (err) {
      setError(err);
      setSetupSql(needsSetup ? EVALUATION_SETUP_SQL : null);
      window.setTimeout(
        () => document.getElementById('ibx-form-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
        0
      );
      return;
    }
    setSubmitted(true);
  };

  const pageShell = (children: React.ReactNode) => (
    <div className="ibx-page relative min-h-dvh overflow-x-hidden text-white">
      <div className="ibx-bg" aria-hidden>
        <img className="ibx-bg-img" src={BG_IMAGE} alt="" decoding="async" />
      </div>
      <div className="ibx-content relative z-[1]">{children}</div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@600;700;800&family=Noto+Sans+Thai:wght@500;600;700;800&display=swap');
        .ibx-page {
          font-family: "Noto Sans Thai", "Prompt", "Anuphan", ui-sans-serif, system-ui, sans-serif;
          background-color: #1a0b2e;
          color: #f5f3ff;
        }
        .ibx-display {
          font-family: "Orbitron", "Noto Sans Thai", sans-serif;
          letter-spacing: 0.04em;
        }
        .ibx-bg {
          position: fixed;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          pointer-events: none;
        }
        .ibx-bg-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center top;
          display: block;
        }
        .ibx-content {
          text-shadow: 0 1px 2px rgba(0,0,0,0.45);
        }
        .ibx-panel {
          background: rgba(10, 6, 24, 0.42);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 18px;
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }
        .ibx-hero.ibx-panel {
          background: rgba(10, 6, 24, 0.36);
          border-color: rgba(0, 245, 255, 0.28);
        }
        .ibx-title-glow {
          color: #fff;
          text-shadow:
            0 1px 3px rgba(0,0,0,0.75),
            0 0 18px rgba(0, 245, 255, 0.35);
        }
        .ibx-kicker {
          color: #9afbff;
          text-shadow: 0 1px 2px rgba(0,0,0,0.7), 0 0 12px rgba(0, 245, 255, 0.4);
        }
        .ibx-chip {
          border: 1px solid rgba(0, 245, 255, 0.35);
          background: rgba(0, 245, 255, 0.12);
          color: #fff;
          border-radius: 999px;
          box-shadow: none;
        }
        .ibx-q {
          color: #fff;
          font-weight: 800;
          line-height: 1.45;
          text-shadow: 0 1px 2px rgba(0,0,0,0.55);
        }
        .ibx-muted {
          color: #f0ebff;
          text-shadow: 0 1px 2px rgba(0,0,0,0.5);
        }
        .ibx-section-title {
          color: #9afbff;
          text-shadow: 0 1px 2px rgba(0,0,0,0.65), 0 0 12px rgba(0, 245, 255, 0.3);
        }
        .ibx-block {
          padding: 1rem 1rem 1.15rem;
        }
        @media (min-width: 640px) {
          .ibx-block {
            padding: 1.5rem 1.75rem 1.75rem;
            border-radius: 22px;
          }
        }
        .ibx-input {
          border: 1px solid rgba(255, 255, 255, 0.4);
          background: rgba(0, 0, 0, 0.45);
          color: #fff;
          font-size: 16px;
          text-shadow: none;
        }
        .ibx-input::placeholder { color: rgba(226,232,240,0.72); }
        .ibx-input:focus {
          outline: none;
          border-color: #67f6ff;
          background: rgba(0, 0, 0, 0.58);
          box-shadow: 0 0 0 3px rgba(0, 245, 255, 0.22), 0 0 20px rgba(255, 0, 200, 0.18);
        }
        .ibx-score {
          border-color: rgba(255, 255, 255, 0.55);
          background: rgba(0, 0, 0, 0.4);
          color: #fff;
          text-shadow: 0 1px 2px rgba(0,0,0,0.7);
        }
        .ibx-score:hover {
          border-color: #ff6ad5;
          background: rgba(80, 0, 60, 0.7);
        }
        .ibx-score.is-selected {
          border-color: #67f6ff;
          background: rgba(0, 80, 90, 0.75);
          color: #fff;
          box-shadow: 0 0 18px rgba(0, 245, 255, 0.45);
        }
        .ibx-score:active { transform: translateY(1px); }
        .ibx-progress-track {
          border: 1px solid rgba(255, 255, 255, 0.4);
          background: rgba(0, 0, 0, 0.55);
        }
        .ibx-progress-fill {
          background: linear-gradient(90deg, #00f5ff 0%, #ff3ec8 55%, #ffb347 100%);
          box-shadow: 0 0 16px rgba(0, 245, 255, 0.45);
        }
        .ibx-footer {
          border-top: 1px solid rgba(255, 255, 255, 0.18);
          background: rgba(0, 0, 0, 0.35);
          backdrop-filter: blur(8px);
          box-shadow: none;
        }
        .ibx-btn-primary {
          border: 1px solid rgba(0, 245, 255, 0.65);
          background: linear-gradient(120deg, #00d4ff 0%, #7c3aed 48%, #ff2db8 100%);
          color: #fff;
          box-shadow: 0 0 24px rgba(0, 245, 255, 0.28), 0 8px 0 rgba(76, 29, 149, 0.55);
        }
        .ibx-btn-primary:hover { filter: brightness(1.08); }
        .ibx-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; filter: none; }
        .ibx-btn-ghost {
          border: 1px solid rgba(0, 245, 255, 0.35);
          background: rgba(8, 4, 20, 0.65);
          color: #e8fbff;
        }
        .ibx-btn-ghost:hover {
          border-color: rgba(255, 0, 200, 0.55);
          background: rgba(255, 0, 200, 0.12);
        }
        .ibx-error {
          border: 1px solid rgba(248, 113, 113, 0.55);
          background: rgba(127, 29, 29, 0.45);
          color: #fecaca;
        }
        @media (min-width: 640px) {
          .ibx-bg-img { object-position: center 18%; }
          .ibx-footer {
            background: transparent;
            border-top: 0;
            backdrop-filter: none;
          }
        }
      `}</style>
    </div>
  );

  if (submitted) {
    return pageShell(
      <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-16">
        <div className="ibx-panel ibx-hero w-full max-w-md p-8 text-center">
          <p className="ibx-display ibx-kicker text-sm font-bold uppercase tracking-[0.2em]">INNO ON TOUR</p>
          <h2 className="ibx-display ibx-title-glow mt-2 text-2xl font-bold">ส่งแบบประเมินแล้ว!</h2>
          <p className="ibx-muted mt-3 text-base font-semibold">
            ขอบคุณที่ให้ความเห็น เราจะนำไปปรับปรุงกิจกรรมครั้งถัดไป
          </p>
          <Link
            to="/"
            className="ibx-btn-primary mt-6 inline-block rounded-[16px] px-6 py-3 text-base font-black transition"
          >
            กลับหน้าหลัก
          </Link>
        </div>
      </div>
    );
  }

  return pageShell(
    <>
      <main className="mx-auto w-full max-w-6xl flex-1 px-3 pb-28 pt-4 sm:px-6 sm:pb-12 sm:py-12 xl:px-10">
        <section className="ibx-panel ibx-hero mx-auto mb-5 max-w-5xl p-4 text-center sm:mb-8 sm:p-7">
          <p className="ibx-display ibx-kicker text-[11px] font-bold uppercase tracking-[0.18em] sm:text-sm sm:tracking-[0.28em]">
            PTT GROUP INNO CLUB · INNO ON TOUR
          </p>
          <h1 className="ibx-display ibx-title-glow mt-1.5 text-[1.45rem] font-bold leading-snug sm:mt-2 sm:text-4xl lg:text-5xl">
            แบบประเมินความพึงพอใจ
          </h1>
          <p className="ibx-muted mx-auto mt-2.5 max-w-3xl text-[15px] font-extrabold leading-relaxed sm:mt-3 sm:text-base lg:text-lg">
            ครั้งที่ 4 — วันที่ 13 พฤศจิกายน 2569
            <br />
            มหาวิทยาลัยพระจอมเกล้าธนบุรี วิทยาเขตบางขุนเทียน
          </p>
          <p className="ibx-chip mt-3 inline-flex max-w-full px-3 py-1.5 text-left text-[13px] font-extrabold leading-snug sm:mt-4 sm:px-4 sm:text-sm">
            ระดับความพึงพอใจ: 5 = มากที่สุด · 1 = น้อยที่สุด
          </p>
        </section>

        <div className="ibx-panel mb-5 px-3.5 py-3 sm:mx-auto sm:mb-8 sm:max-w-5xl sm:px-5">
          <div className="flex items-center justify-between gap-3 text-[15px] sm:text-base">
            <p className="font-extrabold text-white">ความคืบหน้า</p>
            <p className="font-black text-white">
              {answeredRequiredCount}/{requiredTotal}{' '}
              <span className="ibx-muted font-bold">ข้อบังคับ</span>
            </p>
          </div>
          <div className="ibx-progress-track mt-2 h-3 overflow-hidden rounded-full">
            <div
              className="ibx-progress-fill h-full rounded-full transition-all duration-500"
              style={{ width: `${(answeredRequiredCount / requiredTotal) * 100}%` }}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mx-auto max-w-5xl space-y-4 sm:space-y-6">
          {error && (
            <div id="ibx-form-error" className="ibx-error rounded-[12px] px-4 py-3 text-sm font-bold">
              <p>{error}</p>
              {setupSql && (
                <>
                  <p className="mt-2 font-extrabold text-white">
                    เปิด Supabase → SQL Editor แล้วรันคำสั่งนี้หนึ่งครั้ง จากนั้นส่งแบบประเมินอีกครั้ง
                  </p>
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-black/40 p-3 text-xs font-medium text-[#e2e8f0]">
                    {setupSql}
                  </pre>
                </>
              )}
            </div>
          )}

          <section className="ibx-panel ibx-block">
            <h2 className="ibx-display ibx-section-title mb-4 text-lg font-bold sm:mb-6 sm:text-xl lg:text-3xl">
              Facilitator
            </h2>
            <div className="space-y-4 sm:space-y-5">
              <p className="ibx-q text-[15px] sm:text-base lg:text-xl">1. ความพึงพอใจโดยรวมต่อ ผู้นำบรรยาย*</p>
              {renderScoreGroup('facilitator_score', 'facilitator_score')}
              <p className="ibx-muted mt-2 text-[14px] font-bold sm:text-sm">2. ข้อเสนอแนะ</p>
              <textarea
                value={form.facilitator_comment}
                onChange={(e) => setText('facilitator_comment', e.target.value)}
                rows={3}
                placeholder="ระบุข้อเสนอแนะ (ถ้ามี)..."
                className="ibx-input w-full resize-none rounded-[14px] px-3.5 py-3 font-semibold"
              />
            </div>
          </section>

          <section className="ibx-panel ibx-block">
            <h2 className="ibx-display ibx-section-title mb-4 text-lg font-bold sm:mb-6 sm:text-xl lg:text-3xl">
              เนื้อหาของ PTT GROUP INNO Club
            </h2>
            <div className="space-y-4 sm:space-y-5">
              <p className="ibx-q text-[15px] sm:text-base lg:text-xl">1. ความพึงพอใจโดยรวมต่อเนื้อหาของกิจกรรม *</p>
              {renderScoreGroup('content_score', 'content_score')}
              <p className="ibx-muted mt-2 text-[14px] font-bold sm:text-sm">2. ข้อเสนอแนะ</p>
              <textarea
                value={form.content_comment}
                onChange={(e) => setText('content_comment', e.target.value)}
                rows={3}
                placeholder="ระบุข้อเสนอแนะ (ถ้ามี)..."
                className="ibx-input w-full resize-none rounded-[14px] px-3.5 py-3 font-semibold"
              />
            </div>
          </section>

          <section className="ibx-panel ibx-block">
            <h2 className="ibx-display ibx-section-title mb-4 text-lg font-bold leading-snug sm:mb-6 sm:text-xl lg:text-3xl">
              ความพึงพอใจโดยรวมและความคิดเห็นต่อ PTT GROUP INNO Club
            </h2>
            <div className="space-y-5 sm:space-y-7">
              <div>
                <p className="ibx-q mb-2.5 text-[15px] sm:mb-3 sm:text-base lg:text-xl">
                  1. ความพึงพอใจโดยรวมต่อ PTT GROUP INNO Club *
                </p>
                {renderScoreGroup('overall_score', 'overall_score')}
              </div>
              <div>
                <p className="ibx-q mb-2.5 text-[15px] sm:mb-3 sm:text-base lg:text-xl">
                  2. ท่านเห็นบรรยากาศ PTT GROUP INNO Club ครั้งนี้ ส่งเสริมให้ทุกคนกล้าแสดงความคิดเห็น และสร้างการมีส่วนร่วมมากน้อยเพียงใด *
                </p>
                {renderScoreGroup('atmosphere_score', 'atmosphere_score')}
              </div>
              <div>
                <p className="ibx-q mb-2.5 text-[15px] sm:mb-3 sm:text-base lg:text-xl">
                  3. PTT GROUP INNO Club ครั้งนี้ มีการแบ่งปัน แลกเปลี่ยนข้อมูลระหว่างกันมากน้อยเพียงใด *
                </p>
                {renderScoreGroup('sharing_score', 'sharing_score')}
              </div>
              <div>
                <p className="ibx-muted mb-2 text-[14px] font-bold sm:mb-3 sm:text-sm">4. ข้อเสนอแนะเพิ่มเติม</p>
                <textarea
                  value={form.overall_comment}
                  onChange={(e) => setText('overall_comment', e.target.value)}
                  rows={3}
                  placeholder="ระบุข้อเสนอแนะ (ถ้ามี)..."
                  className="ibx-input w-full resize-none rounded-[14px] px-3.5 py-3 font-semibold"
                />
              </div>
            </div>
          </section>

          <section className="ibx-panel ibx-block">
            <h2 className="ibx-display ibx-section-title mb-4 text-lg font-bold sm:mb-6 sm:text-xl lg:text-3xl">
              ข้อเสนอแนะและแนวทางการนำไปใช้
            </h2>
            <div className="space-y-5 sm:space-y-7">
              <div>
                <p className="ibx-q mb-2.5 text-[15px] sm:mb-3 sm:text-base lg:text-xl">
                  1. Innovation Insight (Discover): จากการเยี่ยมชม BIOTEC ท่านได้เห็นแนวคิด เทคโนโลยี หรือนวัตกรรมใดที่น่าสนใจในความคิดเห็นของท่าน? *
                </p>
                <textarea
                  value={form.innovation_insight}
                  onChange={(e) => setText('innovation_insight', e.target.value)}
                  rows={4}
                  placeholder="ระบุแนวคิด เทคโนโลยี หรือนวัตกรรมที่ท่านสนใจ พร้อมเหตุผล..."
                  className="ibx-input w-full resize-y rounded-[14px] px-3.5 py-3 font-semibold"
                />
              </div>
              <div>
                <p className="ibx-q mb-2.5 text-[15px] sm:mb-3 sm:text-base lg:text-xl">
                  2. Innovation Value (Understand): จากนวัตกรรมที่ได้เรียนรู้จากข้อที่ 1 ท่านคิดว่านวัตกรรมนั้นกำลังแก้ปัญหาอะไร สร้างคุณค่าให้กับใคร และมีปัจจัยสำคัญอะไรที่ทำให้นวัตกรรมสามารถนำไปใช้ประโยชน์ได้จริง? *
                </p>
                <textarea
                  value={form.innovation_value}
                  onChange={(e) => setText('innovation_value', e.target.value)}
                  rows={4}
                  placeholder="อธิบายปัญหาที่นวัตกรรมช่วยแก้ คุณค่าที่สร้าง และปัจจัยที่ทำให้นำไปใช้ได้จริง..."
                  className="ibx-input w-full resize-y rounded-[14px] px-3.5 py-3 font-semibold"
                />
              </div>
              <div>
                <p className="ibx-q mb-2.5 text-[15px] sm:mb-3 sm:text-base lg:text-xl">
                  3. Innovation Application (Apply): หากท่านต้องนำแนวคิดหรือองค์ความรู้ที่ได้รับจาก BIOTEC มาประยุกต์ใช้ในการทำงานหรือพัฒนานวัตกรรมใหม่ใน PTT Group ท่านจะนำไปใช้กับเรื่องใด อย่างไร? *
                </p>
                <textarea
                  value={form.innovation_application}
                  onChange={(e) => setText('innovation_application', e.target.value)}
                  rows={4}
                  placeholder="ระบุเรื่องที่ต้องการนำไปประยุกต์ใช้ และแนวทางที่จะดำเนินการใน PTT Group..."
                  className="ibx-input w-full resize-y rounded-[14px] px-3.5 py-3 font-semibold"
                />
              </div>
              <div>
                <p className="ibx-q mb-2.5 text-[15px] sm:mb-3 sm:text-base lg:text-xl">
                  4. โปรดระบุข้อเสนอแนะเพิ่มเติมเพื่อปรับปรุงและพัฒนากิจกรรม
                </p>
                <textarea
                  value={form.improvement_suggestions}
                  onChange={(e) => setText('improvement_suggestions', e.target.value)}
                  rows={4}
                  placeholder="ระบุข้อเสนอแนะ (ถ้ามี)..."
                  className="ibx-input w-full resize-none rounded-[14px] px-3.5 py-3 font-semibold"
                />
              </div>
            </div>
          </section>

          <div className="ibx-footer fixed inset-x-0 bottom-0 z-20 px-3 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-filter-none">
            <div className="mx-auto max-w-5xl sm:pt-4">
              {!allRequiredFilled && (
                <p className="ibx-muted mb-2 text-center text-[13px] font-extrabold">
                  ตอบข้อที่มี * ให้ครบ {answeredRequiredCount}/{requiredTotal} ข้อก่อนส่ง
                </p>
              )}
              <div className="flex flex-col justify-center gap-2 sm:flex-row sm:gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="ibx-btn-primary min-h-12 w-full rounded-[14px] px-6 py-3 text-[15px] font-black transition sm:min-h-0 sm:w-auto sm:rounded-[16px] sm:px-8 sm:py-4 sm:text-base lg:px-10 lg:text-lg"
                >
                  {loading ? 'กำลังส่ง...' : 'ส่งแบบประเมิน'}
                </button>
                <Link
                  to="/"
                  className="ibx-btn-ghost flex min-h-11 w-full items-center justify-center rounded-[14px] px-6 py-2.5 text-center text-[15px] font-extrabold sm:min-h-0 sm:w-auto sm:rounded-[16px] sm:px-8 sm:py-4 sm:text-base lg:px-10 lg:text-lg"
                >
                  ยกเลิก
                </Link>
              </div>
            </div>
          </div>
        </form>
      </main>
    </>
  );
};

export default InnoClubEvaluationPage;
