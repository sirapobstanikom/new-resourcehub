import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const SCORE_OPTIONS = [1, 2, 3, 4, 5] as const;
const BG_IMAGE = '/images/innoclub/innoblox-bg.jpg';

const InnoClubEvaluationPage: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    simulation_score: 0 as number,
    skill_score: 0 as number,
    rejoin_interest: '',
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
    form.simulation_score,
    form.skill_score,
  ];
  const allRequiredFilled =
    requiredScores.every((s) => s >= 1 && s <= 5) &&
    (form.rejoin_interest === 'สนใจ' || form.rejoin_interest === 'ไม่สนใจ');
  const answeredRequiredCount =
    requiredScores.filter((s) => s >= 1 && s <= 5).length +
    (form.rejoin_interest === 'สนใจ' || form.rejoin_interest === 'ไม่สนใจ' ? 1 : 0);
  const requiredTotal = requiredScores.length + 1;

  const renderScoreGroup = (field: keyof typeof form, name: string) => (
    <div className="grid grid-cols-5 gap-2 sm:flex sm:flex-wrap sm:gap-x-3 sm:gap-y-3">
      {SCORE_OPTIONS.map((n) => {
        const selected = form[field] === n;
        return (
          <label
            key={n}
            className={`ibx-score flex cursor-pointer items-center justify-center rounded-[14px] border-2 px-2 py-2 min-h-[48px] sm:min-h-[52px] sm:min-w-[52px] transition-all ${
              selected
                ? 'border-[#FFB800] bg-[#FFCC00] text-[#1a1a1a] shadow-[0_4px_0_#E09B00]'
                : 'border-[#2B6CB0] bg-white text-[#0F3D7A] hover:border-[#FFB800] hover:bg-[#FFF8D6]'
            }`}
          >
            <input
              type="radio"
              name={name}
              checked={form[field] === n}
              onChange={() => setScore(field, n)}
              className="sr-only"
              aria-label={`${name}-${n}`}
            />
            <span className="text-base font-black sm:text-lg lg:text-xl">{n}</span>
          </label>
        );
      })}
    </div>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!allRequiredFilled) {
      setError('กรุณาตอบคำถามที่จำเป็น (ระดับความพึงพอใจ 1–5) ให้ครบทุกข้อ');
      return;
    }
    if (!isSupabaseConfigured) {
      setError('ยังไม่ได้ตั้งค่า Supabase กรุณาติดต่อผู้ดูแล');
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.from('innoclub_evaluation_responses').insert({
      facilitator_score: form.facilitator_score,
      facilitator_comment: form.facilitator_comment || null,
      content_score: form.content_score,
      content_comment: form.content_comment || null,
      overall_score: form.overall_score,
      atmosphere_score: form.atmosphere_score,
      sharing_score: form.sharing_score,
      overall_comment: form.overall_comment || null,
      learn_apply: form.skill_score ? String(form.skill_score) : null,
      ai_plan_6months: null,
      activity_learning_satisfaction: form.simulation_score ? String(form.simulation_score) : null,
      networking_collaboration: form.rejoin_interest || null,
      improvement_suggestions: form.improvement_suggestions || null,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSubmitted(true);
  };

  const pageShell = (children: React.ReactNode) => (
    <div className="ibx-page relative min-h-dvh overflow-x-hidden text-[#102A56]">
      <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden>
        <img src={BG_IMAGE} alt="" className="h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#7DD3FC]/55 via-[#F0F9FF]/78 to-[#FFF7D6]/92" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(255,204,0,0.18),transparent_60%)]" />
      </div>
      {children}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@600;700;800;900&display=swap');
        .ibx-page { font-family: "Nunito", "Prompt", "Anuphan", ui-sans-serif, system-ui, sans-serif; }
        .ibx-display { font-family: "Fredoka", "Nunito", sans-serif; letter-spacing: 0.02em; }
        .ibx-card {
          background: rgba(255,255,255,0.94);
          border: 3px solid #1E90FF;
          box-shadow: 0 8px 0 rgba(15,61,122,0.18), 0 18px 36px rgba(15,61,122,0.12);
        }
        .ibx-hero {
          background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,248,214,0.95));
          border: 4px solid #FFCC00;
          box-shadow: 0 10px 0 #E09B00, 0 22px 40px rgba(15,61,122,0.16);
        }
        .ibx-input {
          border: 2px solid #93C5FD;
          background: #fff;
        }
        .ibx-input:focus {
          outline: none;
          border-color: #FFB800;
          box-shadow: 0 0 0 3px rgba(255,204,0,0.35);
        }
        .ibx-score:active { transform: translateY(2px); }
      `}</style>
    </div>
  );

  if (submitted) {
    return pageShell(
      <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-16">
        <div className="ibx-hero w-full max-w-md rounded-[28px] p-8 text-center">
          <p className="ibx-display text-sm font-bold uppercase tracking-[0.2em] text-[#1E90FF]">INNOBLOX</p>
          <h2 className="ibx-display mt-2 text-2xl font-bold text-[#0F3D7A]">ส่งแบบประเมินแล้ว!</h2>
          <p className="mt-3 text-base font-semibold text-[#334155]">
            ขอบคุณที่ให้ความเห็น เราจะนำไปปรับปรุงกิจกรรมครั้งถัดไป
          </p>
          <Link
            to="/"
            className="mt-6 inline-block rounded-[16px] border-2 border-[#E09B00] bg-[#FFCC00] px-6 py-3 text-base font-black text-[#1a1a1a] shadow-[0_5px_0_#E09B00] transition hover:brightness-105"
          >
            กลับหน้าหลัก
          </Link>
        </div>
      </div>
    );
  }

  return pageShell(
    <>
      <header className="sticky top-0 z-30 border-b-2 border-[#1E90FF]/35 bg-white/80 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-[12px] border-2 border-[#93C5FD] bg-white px-3 py-2 text-sm font-extrabold text-[#0F3D7A] shadow-sm hover:border-[#FFB800]"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
            หน้าหลัก
          </Link>
          <div className="flex items-center gap-2 rounded-[14px] border-2 border-[#E09B00] bg-[#FFCC00] px-2.5 py-1.5 text-black shadow-[0_4px_0_#E09B00]">
            <BrandLogo className="text-[18px] sm:text-[22px]" tone="dark" />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12 xl:px-10">
        <section className="ibx-hero mx-auto mb-8 max-w-5xl rounded-[28px] p-5 text-center sm:mb-10 sm:p-8">
          <p className="ibx-display text-xs font-bold uppercase tracking-[0.28em] text-[#1E90FF] sm:text-sm">
            PTT GROUP INNO CLUB · INNOBLOX
          </p>
          <h1 className="ibx-display mt-2 text-2xl font-bold leading-tight text-[#0F3D7A] sm:text-4xl lg:text-5xl">
            แบบประเมินความพึงพอใจ
          </h1>
          <p className="mx-auto mt-3 max-w-3xl text-sm font-extrabold leading-relaxed text-[#1E3A5F] sm:text-base lg:text-lg">
            ครั้งที่ 3 — วันที่ 27 ตุลาคม 2569
            <br />
            Synergy Hall EnCo C ชั้น 6
          </p>
          <p className="mt-4 inline-flex rounded-full border-2 border-[#1E90FF] bg-[#E0F2FE] px-4 py-1.5 text-xs font-extrabold text-[#0F3D7A] sm:text-sm">
            ระดับความพึงพอใจ: 5 = มากที่สุด · 1 = น้อยที่สุด
          </p>
        </section>

        <div className="sticky top-[4.25rem] z-20 -mx-4 mb-8 border-y-2 border-[#1E90FF]/40 bg-white/90 px-4 py-3 backdrop-blur sm:static sm:mx-auto sm:mb-10 sm:max-w-5xl sm:rounded-[20px] sm:border-2 sm:border-[#1E90FF] sm:bg-white/95 lg:px-6">
          <div className="flex items-center justify-between gap-3 text-sm lg:text-base">
            <p className="font-extrabold text-[#0F3D7A]">ความคืบหน้าแบบประเมิน</p>
            <p className="font-black text-[#0F3D7A]">
              {answeredRequiredCount}/{requiredTotal}{' '}
              <span className="font-bold text-[#64748B]">ข้อบังคับ</span>
            </p>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full border-2 border-[#93C5FD] bg-[#E0F2FE]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#1E90FF] via-[#38BDF8] to-[#FFCC00] transition-all duration-500"
              style={{ width: `${(answeredRequiredCount / requiredTotal) * 100}%` }}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mx-auto max-w-5xl space-y-7 sm:space-y-10">
          {error && (
            <div className="rounded-[16px] border-2 border-red-400 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {error}
            </div>
          )}

          <section className="ibx-card rounded-[24px] p-4 sm:p-8 lg:p-10">
            <h2 className="ibx-display mb-6 text-xl font-bold text-[#1E90FF] lg:text-3xl">Facilitator</h2>
            <div className="space-y-5">
              <p className="text-base font-extrabold leading-relaxed text-[#0F172A] lg:text-xl">
                1. ความพึงพอใจโดยรวมต่อ Facilitator *
              </p>
              {renderScoreGroup('facilitator_score', 'facilitator_score')}
              <p className="mt-3 text-sm font-bold text-[#475569]">2. ข้อเสนอแนะ</p>
              <textarea
                value={form.facilitator_comment}
                onChange={(e) => setText('facilitator_comment', e.target.value)}
                rows={3}
                placeholder="ระบุข้อเสนอแนะ (ถ้ามี)..."
                className="ibx-input w-full resize-none rounded-[14px] px-4 py-3 text-base font-semibold text-[#0F172A] placeholder:text-slate-400"
              />
            </div>
          </section>

          <section className="ibx-card rounded-[24px] p-4 sm:p-8 lg:p-10">
            <h2 className="ibx-display mb-6 text-xl font-bold text-[#1E90FF] lg:text-3xl">
              เนื้อหาของ PTT GROUP INNO Club
            </h2>
            <div className="space-y-5">
              <p className="text-base font-extrabold leading-relaxed text-[#0F172A] lg:text-xl">
                1. ความพึงพอใจโดยรวมต่อเนื้อหาของกิจกรรม *
              </p>
              {renderScoreGroup('content_score', 'content_score')}
              <p className="mt-3 text-sm font-bold text-[#475569]">2. ข้อเสนอแนะ</p>
              <textarea
                value={form.content_comment}
                onChange={(e) => setText('content_comment', e.target.value)}
                rows={3}
                placeholder="ระบุข้อเสนอแนะ (ถ้ามี)..."
                className="ibx-input w-full resize-none rounded-[14px] px-4 py-3 text-base font-semibold text-[#0F172A] placeholder:text-slate-400"
              />
            </div>
          </section>

          <section className="ibx-card rounded-[24px] p-4 sm:p-8 lg:p-10">
            <h2 className="ibx-display mb-6 text-xl font-bold leading-relaxed text-[#1E90FF] lg:text-3xl">
              ความพึงพอใจโดยรวมและความคิดเห็นต่อ PTT GROUP INNO Club
            </h2>
            <div className="space-y-7">
              <div>
                <p className="mb-3 text-base font-extrabold leading-relaxed text-[#0F172A] lg:text-xl">
                  1. ความพึงพอใจโดยรวมต่อ PTT GROUP INNO Club *
                </p>
                {renderScoreGroup('overall_score', 'overall_score')}
              </div>
              <div>
                <p className="mb-3 text-base font-extrabold leading-relaxed text-[#0F172A] lg:text-xl">
                  2. ท่านเห็นบรรยากาศ PTT GROUP INNO Club ครั้งนี้ ส่งเสริมให้ทุกคนกล้าแสดงความคิดเห็น และสร้างการมีส่วนร่วมมากน้อยเพียงใด *
                </p>
                {renderScoreGroup('atmosphere_score', 'atmosphere_score')}
              </div>
              <div>
                <p className="mb-3 text-base font-extrabold leading-relaxed text-[#0F172A] lg:text-xl">
                  3. PTT GROUP INNO Club ครั้งนี้ มีการแบ่งปัน แลกเปลี่ยนข้อมูลระหว่างกันมากน้อยเพียงใด *
                </p>
                {renderScoreGroup('sharing_score', 'sharing_score')}
              </div>
              <div>
                <p className="mb-3 text-sm font-bold text-[#475569]">4. ข้อเสนอแนะเพิ่มเติม</p>
                <textarea
                  value={form.overall_comment}
                  onChange={(e) => setText('overall_comment', e.target.value)}
                  rows={3}
                  placeholder="ระบุข้อเสนอแนะ (ถ้ามี)..."
                  className="ibx-input w-full resize-none rounded-[14px] px-4 py-3 text-base font-semibold text-[#0F172A] placeholder:text-slate-400"
                />
              </div>
            </div>
          </section>

          <section className="ibx-card rounded-[24px] p-4 sm:p-8 lg:p-10">
            <h2 className="ibx-display mb-6 text-xl font-bold text-[#1E90FF] lg:text-3xl">
              ข้อเสนอแนะและแนวทางการนำไปใช้
            </h2>
            <div className="space-y-7">
              <div>
                <p className="mb-3 text-base font-extrabold leading-relaxed text-[#0F172A] lg:text-xl">
                  1. ท่านมีความพึงพอใจต่อประสบการณ์การเรียนรู้ผ่าน Digital Simulation-Based Learning บนแพลตฟอร์ม Roblox ในระดับใด *
                </p>
                {renderScoreGroup('simulation_score', 'simulation_score')}
              </div>
              <div>
                <p className="mb-3 text-base font-extrabold leading-relaxed text-[#0F172A] lg:text-xl">
                  2. กิจกรรมจำลองสถานการณ์นี้ช่วยให้ท่านได้ฝึกทักษะการคิด การตัดสินใจ และการปรับตัวภายใต้ข้อจำกัดและการเปลี่ยนแปลงมากน้อยเพียงใด *
                </p>
                {renderScoreGroup('skill_score', 'skill_score')}
              </div>
              <div>
                <p className="mb-3 text-base font-extrabold leading-relaxed text-[#0F172A] lg:text-xl">
                  3. หากมีการจัดกิจกรรมลักษณะเดียวกันในอนาคต ท่านสนใจเข้าร่วมอีกครั้งหรือไม่ *
                </p>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
                  {(['สนใจ', 'ไม่สนใจ'] as const).map((choice) => {
                    const selected = form.rejoin_interest === choice;
                    return (
                      <label
                        key={choice}
                        className={`flex min-h-[52px] cursor-pointer items-center justify-center rounded-[14px] border-2 px-4 py-3 text-base font-black transition-all lg:text-lg ${
                          selected
                            ? 'border-[#FFB800] bg-[#FFCC00] text-[#1a1a1a] shadow-[0_4px_0_#E09B00]'
                            : 'border-[#2B6CB0] bg-white text-[#0F3D7A] hover:border-[#FFB800]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="rejoin_interest"
                          checked={selected}
                          onChange={() => setText('rejoin_interest', choice)}
                          className="sr-only"
                        />
                        {choice}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="mb-3 text-base font-extrabold leading-relaxed text-[#0F172A] lg:text-xl">
                  4. โปรดระบุข้อเสนอแนะเพิ่มเติมเพื่อปรับปรุงและพัฒนากิจกรรม
                </p>
                <textarea
                  value={form.improvement_suggestions}
                  onChange={(e) => setText('improvement_suggestions', e.target.value)}
                  rows={4}
                  placeholder="ระบุข้อเสนอแนะ (ถ้ามี)..."
                  className="ibx-input w-full resize-none rounded-[14px] px-4 py-3 text-base font-semibold text-[#0F172A] placeholder:text-slate-400"
                />
              </div>
            </div>
          </section>

          <div className="sticky bottom-0 z-20 -mx-4 border-t-2 border-[#1E90FF]/30 bg-white/90 px-4 pt-3 pb-4 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
            <div className="flex flex-col justify-center gap-3 pt-0 sm:flex-row sm:gap-4 sm:pt-4">
              <button
                type="submit"
                disabled={loading || !allRequiredFilled}
                className="w-full rounded-[16px] border-2 border-[#E09B00] bg-[#FFCC00] px-8 py-4 text-base font-black text-[#1a1a1a] shadow-[0_6px_0_#E09B00] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto lg:px-10 lg:text-lg"
              >
                {loading ? 'กำลังส่ง...' : 'ส่งแบบประเมิน'}
              </button>
              <Link
                to="/"
                className="w-full rounded-[16px] border-2 border-[#93C5FD] bg-white px-8 py-4 text-center text-base font-extrabold text-[#0F3D7A] shadow-[0_4px_0_rgba(30,144,255,0.25)] transition hover:border-[#1E90FF] sm:w-auto lg:px-10 lg:text-lg"
              >
                ยกเลิก
              </Link>
            </div>
          </div>
        </form>
      </main>
    </>
  );
};

export default InnoClubEvaluationPage;
