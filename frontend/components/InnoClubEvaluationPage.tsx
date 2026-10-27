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
    <div className="grid grid-cols-5 gap-1.5 sm:flex sm:flex-wrap sm:gap-x-3 sm:gap-y-3">
      {SCORE_OPTIONS.map((n) => {
        const selected = form[field] === n;
        return (
          <label
            key={n}
            className={`ibx-score flex min-h-12 cursor-pointer items-center justify-center rounded-[12px] border-2 px-1 py-2.5 transition-all sm:min-h-[52px] sm:min-w-[52px] sm:rounded-[14px] sm:px-2 ${
              selected
                ? 'border-[#E09B00] bg-[#FFCC00] text-[#111] shadow-[0_3px_0_#E09B00]'
                : 'border-[#1E5FA8] bg-[#F8FAFC] text-[#0B1F3A] hover:border-[#FFB800] hover:bg-[#FFF8D6]'
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
            <span className="text-lg font-black sm:text-lg lg:text-xl">{n}</span>
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
    <div className="ibx-page relative min-h-dvh overflow-x-hidden text-[#0B1F3A]">
      <div className="ibx-bg pointer-events-none hidden sm:block" aria-hidden>
        <div className="ibx-bg-photo" />
        <div className="ibx-overlay" />
      </div>
      {children}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@600;700;800;900&display=swap');
        .ibx-page {
          font-family: "Nunito", "Prompt", "Anuphan", ui-sans-serif, system-ui, sans-serif;
          background:
            linear-gradient(180deg, #D8ECFF 0%, #EAF4FF 28%, #FFF8E8 100%);
        }
        .ibx-display { font-family: "Fredoka", "Nunito", sans-serif; letter-spacing: 0.01em; }
        .ibx-mobile-banner {
          position: relative;
          width: 100%;
          height: min(52vw, 228px);
          min-height: 176px;
          overflow: hidden;
          background: #5ec8f8;
          box-shadow: inset 0 -1px 0 rgba(15, 61, 122, 0.08);
        }
        .ibx-mobile-banner img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center 40%;
          -webkit-transform: translateZ(0);
          transform: translateZ(0);
        }
        .ibx-mobile-banner-fade {
          position: absolute;
          inset: auto 0 0 0;
          height: 42%;
          background: linear-gradient(
            180deg,
            rgba(216, 236, 255, 0) 0%,
            rgba(216, 236, 255, 0.55) 55%,
            #D8ECFF 100%
          );
          pointer-events: none;
        }
        .ibx-bg {
          position: fixed;
          inset: 0;
          z-index: -1;
          overflow: hidden;
        }
        .ibx-bg-photo {
          position: absolute;
          inset: 0;
          background-image: url('${BG_IMAGE}');
          background-repeat: no-repeat;
          background-size: cover;
          background-position: center center;
        }
        .ibx-overlay {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(180deg, rgba(125,211,252,0.35) 0%, rgba(240,249,255,0.72) 42%, rgba(255,247,214,0.88) 100%),
            radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,204,0,0.14), transparent 60%);
        }
        .ibx-card {
          background: #fff;
          border: 2px solid #1E90FF;
          box-shadow: 0 4px 0 rgba(15,61,122,0.12), 0 10px 24px rgba(15,61,122,0.08);
        }
        .ibx-hero {
          background: #fff;
          border: 3px solid #FFCC00;
          box-shadow: 0 5px 0 #E09B00, 0 12px 28px rgba(15,61,122,0.1);
        }
        .ibx-input {
          border: 2px solid #93C5FD;
          background: #fff;
          font-size: 16px;
        }
        .ibx-input:focus {
          outline: none;
          border-color: #FFB800;
          box-shadow: 0 0 0 3px rgba(255,204,0,0.35);
        }
        .ibx-score:active { transform: translateY(2px); }
        .ibx-q {
          color: #0B1F3A;
          font-weight: 800;
          line-height: 1.45;
        }
        @media (min-width: 640px) {
          .ibx-page { background: transparent; }
          .ibx-card {
            background: rgba(255,255,255,0.96);
            border-width: 3px;
            box-shadow: 0 8px 0 rgba(15,61,122,0.18), 0 18px 36px rgba(15,61,122,0.12);
          }
          .ibx-hero {
            background: linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,248,214,0.94));
            border-width: 4px;
            box-shadow: 0 10px 0 #E09B00, 0 22px 40px rgba(15,61,122,0.16);
          }
        }
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
      <header className="sticky top-0 z-30 border-b border-[#93C5FD] bg-white px-3 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] sm:border-b-2 sm:border-[#1E90FF]/35 sm:bg-white/90 sm:px-6 sm:py-3 sm:backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-[12px] border-2 border-[#93C5FD] bg-white px-3 py-2 text-sm font-extrabold text-[#0B1F3A] shadow-sm hover:border-[#FFB800]"
          >
            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
            หน้าหลัก
          </Link>
          <div className="flex items-center gap-2 rounded-[12px] border-2 border-[#E09B00] bg-[#FFCC00] px-2 py-1 text-black shadow-[0_3px_0_#E09B00] sm:rounded-[14px] sm:px-2.5 sm:py-1.5 sm:shadow-[0_4px_0_#E09B00]">
            <BrandLogo className="text-[16px] sm:text-[22px]" tone="dark" />
          </div>
        </div>
      </header>

      <div className="ibx-mobile-banner sm:hidden" aria-hidden>
        <img src={BG_IMAGE} alt="" decoding="async" />
        <div className="ibx-mobile-banner-fade" />
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 px-3 pb-28 pt-4 sm:px-6 sm:pb-12 sm:py-12 xl:px-10">
        <section className="ibx-hero mx-auto mb-5 max-w-5xl rounded-[20px] p-4 text-center sm:mb-10 sm:rounded-[28px] sm:p-8">
          <p className="ibx-display text-[11px] font-bold uppercase tracking-[0.18em] text-[#1E90FF] sm:text-sm sm:tracking-[0.28em]">
            PTT GROUP INNO CLUB · INNOBLOX
          </p>
          <h1 className="ibx-display mt-1.5 text-[1.45rem] font-bold leading-snug text-[#0B1F3A] sm:mt-2 sm:text-4xl lg:text-5xl">
            แบบประเมินความพึงพอใจ
          </h1>
          <p className="mx-auto mt-2.5 max-w-3xl text-[15px] font-extrabold leading-relaxed text-[#0B1F3A] sm:mt-3 sm:text-base lg:text-lg">
            ครั้งที่ 3 — วันที่ 27 ตุลาคม 2569
            <br />
            Synergy Hall EnCo C ชั้น 6
          </p>
          <p className="mt-3 inline-flex max-w-full rounded-full border-2 border-[#1E90FF] bg-[#E0F2FE] px-3 py-1.5 text-left text-[13px] font-extrabold leading-snug text-[#0B1F3A] sm:mt-4 sm:px-4 sm:text-sm">
            ระดับความพึงพอใจ: 5 = มากที่สุด · 1 = น้อยที่สุด
          </p>
        </section>

        <div className="mb-5 rounded-[16px] border-2 border-[#1E90FF] bg-white px-3.5 py-3 sm:static sm:mx-auto sm:mb-10 sm:max-w-5xl sm:rounded-[20px] sm:bg-white/95 lg:px-6">
          <div className="flex items-center justify-between gap-3 text-[15px] sm:text-base">
            <p className="font-extrabold text-[#0B1F3A]">ความคืบหน้า</p>
            <p className="font-black text-[#0B1F3A]">
              {answeredRequiredCount}/{requiredTotal}{' '}
              <span className="font-bold text-[#475569]">ข้อบังคับ</span>
            </p>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full border-2 border-[#93C5FD] bg-[#E0F2FE]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#1E90FF] via-[#38BDF8] to-[#FFCC00] transition-all duration-500"
              style={{ width: `${(answeredRequiredCount / requiredTotal) * 100}%` }}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mx-auto max-w-5xl space-y-4 sm:space-y-10">
          {error && (
            <div className="rounded-[16px] border-2 border-red-400 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {error}
            </div>
          )}

          <section className="ibx-card rounded-[18px] p-3.5 sm:rounded-[24px] sm:p-8 lg:p-10">
            <h2 className="ibx-display mb-4 text-lg font-bold text-[#1E90FF] sm:mb-6 sm:text-xl lg:text-3xl">Facilitator</h2>
            <div className="space-y-4 sm:space-y-5">
              <p className="ibx-q text-[15px] sm:text-base lg:text-xl">1. ความพึงพอใจโดยรวมต่อ Facilitator *</p>
              {renderScoreGroup('facilitator_score', 'facilitator_score')}
              <p className="mt-2 text-[14px] font-bold text-[#334155] sm:text-sm">2. ข้อเสนอแนะ</p>
              <textarea
                value={form.facilitator_comment}
                onChange={(e) => setText('facilitator_comment', e.target.value)}
                rows={3}
                placeholder="ระบุข้อเสนอแนะ (ถ้ามี)..."
                className="ibx-input w-full resize-none rounded-[14px] px-3.5 py-3 font-semibold text-[#0B1F3A] placeholder:text-slate-500"
              />
            </div>
          </section>

          <section className="ibx-card rounded-[18px] p-3.5 sm:rounded-[24px] sm:p-8 lg:p-10">
            <h2 className="ibx-display mb-4 text-lg font-bold text-[#1E90FF] sm:mb-6 sm:text-xl lg:text-3xl">
              เนื้อหาของ PTT GROUP INNO Club
            </h2>
            <div className="space-y-4 sm:space-y-5">
              <p className="ibx-q text-[15px] sm:text-base lg:text-xl">1. ความพึงพอใจโดยรวมต่อเนื้อหาของกิจกรรม *</p>
              {renderScoreGroup('content_score', 'content_score')}
              <p className="mt-2 text-[14px] font-bold text-[#334155] sm:text-sm">2. ข้อเสนอแนะ</p>
              <textarea
                value={form.content_comment}
                onChange={(e) => setText('content_comment', e.target.value)}
                rows={3}
                placeholder="ระบุข้อเสนอแนะ (ถ้ามี)..."
                className="ibx-input w-full resize-none rounded-[14px] px-3.5 py-3 font-semibold text-[#0B1F3A] placeholder:text-slate-500"
              />
            </div>
          </section>

          <section className="ibx-card rounded-[18px] p-3.5 sm:rounded-[24px] sm:p-8 lg:p-10">
            <h2 className="ibx-display mb-4 text-lg font-bold leading-snug text-[#1E90FF] sm:mb-6 sm:text-xl lg:text-3xl">
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
                <p className="mb-2 text-[14px] font-bold text-[#334155] sm:mb-3 sm:text-sm">4. ข้อเสนอแนะเพิ่มเติม</p>
                <textarea
                  value={form.overall_comment}
                  onChange={(e) => setText('overall_comment', e.target.value)}
                  rows={3}
                  placeholder="ระบุข้อเสนอแนะ (ถ้ามี)..."
                  className="ibx-input w-full resize-none rounded-[14px] px-3.5 py-3 font-semibold text-[#0B1F3A] placeholder:text-slate-500"
                />
              </div>
            </div>
          </section>

          <section className="ibx-card rounded-[18px] p-3.5 sm:rounded-[24px] sm:p-8 lg:p-10">
            <h2 className="ibx-display mb-4 text-lg font-bold text-[#1E90FF] sm:mb-6 sm:text-xl lg:text-3xl">
              ข้อเสนอแนะและแนวทางการนำไปใช้
            </h2>
            <div className="space-y-5 sm:space-y-7">
              <div>
                <p className="ibx-q mb-2.5 text-[15px] sm:mb-3 sm:text-base lg:text-xl">
                  1. ท่านมีความพึงพอใจต่อประสบการณ์การเรียนรู้ผ่าน Digital Simulation-Based Learning บนแพลตฟอร์ม Roblox ในระดับใด *
                </p>
                {renderScoreGroup('simulation_score', 'simulation_score')}
              </div>
              <div>
                <p className="ibx-q mb-2.5 text-[15px] sm:mb-3 sm:text-base lg:text-xl">
                  2. กิจกรรมจำลองสถานการณ์นี้ช่วยให้ท่านได้ฝึกทักษะการคิด การตัดสินใจ และการปรับตัวภายใต้ข้อจำกัดและการเปลี่ยนแปลงมากน้อยเพียงใด *
                </p>
                {renderScoreGroup('skill_score', 'skill_score')}
              </div>
              <div>
                <p className="ibx-q mb-2.5 text-[15px] sm:mb-3 sm:text-base lg:text-xl">
                  3. หากมีการจัดกิจกรรมลักษณะเดียวกันในอนาคต ท่านสนใจเข้าร่วมอีกครั้งหรือไม่ *
                </p>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
                  {(['สนใจ', 'ไม่สนใจ'] as const).map((choice) => {
                    const selected = form.rejoin_interest === choice;
                    return (
                      <label
                        key={choice}
                        className={`flex min-h-12 cursor-pointer items-center justify-center rounded-[12px] border-2 px-3 py-3 text-[15px] font-black transition-all sm:min-h-[52px] sm:rounded-[14px] sm:px-4 sm:text-base lg:text-lg ${
                          selected
                            ? 'border-[#E09B00] bg-[#FFCC00] text-[#111] shadow-[0_3px_0_#E09B00]'
                            : 'border-[#1E5FA8] bg-[#F8FAFC] text-[#0B1F3A] hover:border-[#FFB800]'
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
                <p className="ibx-q mb-2.5 text-[15px] sm:mb-3 sm:text-base lg:text-xl">
                  4. โปรดระบุข้อเสนอแนะเพิ่มเติมเพื่อปรับปรุงและพัฒนากิจกรรม
                </p>
                <textarea
                  value={form.improvement_suggestions}
                  onChange={(e) => setText('improvement_suggestions', e.target.value)}
                  rows={4}
                  placeholder="ระบุข้อเสนอแนะ (ถ้ามี)..."
                  className="ibx-input w-full resize-none rounded-[14px] px-3.5 py-3 font-semibold text-[#0B1F3A] placeholder:text-slate-500"
                />
              </div>
            </div>
          </section>

          <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[#93C5FD] bg-white px-3 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(15,61,122,0.12)] sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
            <div className="mx-auto flex max-w-5xl flex-col justify-center gap-2 sm:flex-row sm:gap-4 sm:pt-4">
              <button
                type="submit"
                disabled={loading || !allRequiredFilled}
                className="min-h-12 w-full rounded-[14px] border-2 border-[#E09B00] bg-[#FFCC00] px-6 py-3 text-[15px] font-black text-[#111] shadow-[0_4px_0_#E09B00] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0 sm:w-auto sm:rounded-[16px] sm:px-8 sm:py-4 sm:text-base sm:shadow-[0_6px_0_#E09B00] lg:px-10 lg:text-lg"
              >
                {loading ? 'กำลังส่ง...' : 'ส่งแบบประเมิน'}
              </button>
              <Link
                to="/"
                className="flex min-h-11 w-full items-center justify-center rounded-[14px] border-2 border-[#93C5FD] bg-white px-6 py-2.5 text-center text-[15px] font-extrabold text-[#0B1F3A] sm:min-h-0 sm:w-auto sm:rounded-[16px] sm:px-8 sm:py-4 sm:text-base lg:px-10 lg:text-lg"
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
