import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const SCORE_OPTIONS = [1, 2, 3, 4, 5] as const;

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
    learn_apply: '',
    ai_plan_6months: '',
    activity_learning_satisfaction: '',
    networking_collaboration: '',
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
  const allRequiredFilled = requiredScores.every((s) => s >= 1 && s <= 5);
  const answeredRequiredCount = requiredScores.filter((s) => s >= 1 && s <= 5).length;

  const renderScoreGroup = (field: keyof typeof form, name: string) => (
    <div className="grid grid-cols-5 gap-2 sm:flex sm:flex-wrap sm:gap-x-4 sm:gap-y-3 lg:gap-x-5 lg:gap-y-4">
      {SCORE_OPTIONS.map((n) => {
        const selected = form[field] === n;
        return (
          <label
            key={n}
            className={`flex items-center justify-center cursor-pointer rounded-xl border px-2 py-2 min-h-[44px] sm:min-h-[48px] lg:min-h-[54px] lg:min-w-[54px] 2xl:min-h-[62px] 2xl:min-w-[62px] transition-all ${
              selected
                ? 'border-yellow-300 bg-yellow-300/20 text-yellow-100 shadow-[0_0_0_1px_rgba(252,211,77,0.4)]'
                : 'border-white/15 bg-black/20 text-white hover:border-yellow-300/40'
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
            <span className="text-sm sm:text-base lg:text-lg 2xl:text-xl font-semibold">{n}</span>
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
      learn_apply: form.learn_apply || null,
      ai_plan_6months: form.ai_plan_6months || null,
      activity_learning_satisfaction: form.activity_learning_satisfaction || null,
      networking_collaboration: form.networking_collaboration || null,
      improvement_suggestions: form.improvement_suggestions || null,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div
        className="min-h-screen bg-transparent text-white bg-grid flex flex-col selection:bg-yellow-400 selection:text-black innoclub-angsana"
      >
        <div className="flex flex-col items-center justify-center flex-1 px-6 py-16">
          <div className="max-w-md w-full rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
            <h2 className="text-xl font-bold text-yellow-400 mb-2">ส่งแบบประเมินแล้ว</h2>
            <p className="text-gray-400 mb-6">ขอบคุณที่ให้ความเห็น เราจะนำไปปรับปรุงกิจกรรมครั้งถัดไป</p>
            <Link
              to="/"
              className="inline-block px-6 py-3 rounded-xl font-medium bg-yellow-400 text-black hover:bg-yellow-300 transition-colors"
            >
              กลับหน้าหลัก
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-transparent text-white bg-grid flex flex-col selection:bg-yellow-400 selection:text-black innoclub-angsana"
    >
      <header className="border-b border-white/10 px-4 py-4 sm:px-6 xl:px-10 2xl:px-14">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 text-gray-400 hover:text-white text-sm lg:text-base font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            หน้าหลัก
          </Link>
          <div className="flex items-center gap-2 rounded-xl border border-yellow-200 bg-yellow-400 px-2 py-1.5 text-black shadow-[0_0_16px_rgba(250,204,21,0.35)] lg:px-3 lg:py-2">
            <div className="w-8 h-8 lg:w-9 lg:h-9 bg-yellow-300 rounded-lg flex items-center justify-center border border-yellow-100">
              <span className="text-black font-bold text-sm lg:text-base">M</span>
            </div>
            <span className="font-semibold tracking-tight text-sm lg:text-base text-black">MindDoJo</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 xl:px-10 2xl:px-14 py-8 sm:py-14 xl:py-16 2xl:py-20">
        <section className="mb-7 sm:mb-10 rounded-2xl border border-yellow-300/20 bg-gradient-to-br from-[#121212]/95 via-[#0f0f0f]/95 to-[#1a1a1a]/95 p-4 sm:p-6 lg:p-8 2xl:p-10 shadow-[0_10px_30px_rgba(0,0,0,0.35)] max-w-5xl mx-auto">
          <h1 className="text-xl sm:text-3xl lg:text-4xl 2xl:text-5xl font-bold text-center mb-3 lg:mb-4 leading-relaxed text-yellow-100">
            แบบประเมินความพึงพอใจในการร่วมกิจกรรม
          </h1>
          <p className="text-center text-white text-sm sm:text-base lg:text-lg 2xl:text-xl mb-5 lg:mb-6 leading-relaxed">
            PTT GROUP INNO Club #2 — วันที่ 30 มิถุนายน 2569 เวลา 09.00-12.00 น.
            <br />
            ห้อง The Enterprise ชั้น 8 ตึก ENTER
          </p>
          <p className="text-yellow-100/90 text-sm sm:text-base lg:text-lg 2xl:text-xl text-center leading-relaxed">
            ระดับความพึงพอใจ: 5 = มากที่สุด 4 = มาก 3 = ปานกลาง 2 = น้อย 1 = น้อยที่สุด
          </p>
        </section>

        <div className="sticky top-0 z-20 -mx-4 mb-8 border-y border-yellow-300/20 bg-[#101010]/90 px-4 py-3 backdrop-blur sm:static sm:mx-auto sm:mb-10 sm:max-w-5xl sm:rounded-xl sm:border sm:bg-white/5 lg:px-6 lg:py-4 2xl:px-8">
          <div className="flex items-center justify-between gap-3 text-sm lg:text-base 2xl:text-lg">
            <p className="text-yellow-100 font-medium">ความคืบหน้าแบบประเมิน</p>
            <p className="text-white font-medium">
              {answeredRequiredCount}/5 <span className="text-gray-400">ข้อบังคับ</span>
            </p>
          </div>
          <div className="mt-2 h-2 lg:h-2.5 2xl:h-3 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-500 via-amber-400 to-orange-400 transition-all"
              style={{ width: `${(answeredRequiredCount / requiredScores.length) * 100}%` }}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 sm:space-y-12 lg:space-y-14 max-w-5xl mx-auto">
          {error && (
            <div className="rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {/* Facilitator */}
          <section className="rounded-2xl border border-yellow-300/15 bg-gradient-to-b from-white/10 to-transparent p-4 sm:p-8 lg:p-10 2xl:p-12">
            <h2 className="text-lg lg:text-2xl 2xl:text-3xl font-bold text-yellow-400 mb-7">Facilitator</h2>
            <div className="space-y-5">
              <p className="text-white font-medium text-base lg:text-xl 2xl:text-2xl leading-relaxed">1. ความพึงพอใจโดยรวมต่อ Facilitator *</p>
              {renderScoreGroup('facilitator_score', 'facilitator_score')}
              <p className="text-gray-500 text-sm mt-3">2. ข้อเสนอแนะ</p>
              <textarea
                value={form.facilitator_comment}
                onChange={(e) => setText('facilitator_comment', e.target.value)}
                rows={3}
                placeholder="ระบุข้อเสนอแนะ (ถ้ามี)..."
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white placeholder-gray-500 text-base focus:outline-none focus:border-yellow-400 resize-none"
              />
            </div>
          </section>

          {/* เนื้อหาของ PTT GROUP INNO Club */}
          <section className="rounded-2xl border border-yellow-300/15 bg-gradient-to-b from-white/10 to-transparent p-4 sm:p-8 lg:p-10 2xl:p-12">
            <h2 className="text-lg lg:text-2xl 2xl:text-3xl font-bold text-yellow-400 mb-7">เนื้อหาของ PTT GROUP INNO Club</h2>
            <div className="space-y-5">
              <p className="text-white font-medium text-base lg:text-xl 2xl:text-2xl leading-relaxed">1. ความพึงพอใจโดยรวมต่อเนื้อหาของกิจกรรม *</p>
              {renderScoreGroup('content_score', 'content_score')}
              <p className="text-gray-500 text-sm mt-3">2. ข้อเสนอแนะ</p>
              <textarea
                value={form.content_comment}
                onChange={(e) => setText('content_comment', e.target.value)}
                rows={3}
                placeholder="ระบุข้อเสนอแนะ (ถ้ามี)..."
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white placeholder-gray-500 text-base focus:outline-none focus:border-yellow-400 resize-none"
              />
            </div>
          </section>

          {/* ความพึงพอใจโดยรวมและความคิดเห็น */}
          <section className="rounded-2xl border border-yellow-300/15 bg-gradient-to-b from-white/10 to-transparent p-4 sm:p-8 lg:p-10 2xl:p-12">
            <h2 className="text-lg lg:text-2xl 2xl:text-3xl font-bold text-yellow-400 mb-7 leading-relaxed">ความพึงพอใจโดยรวมและความคิดเห็นต่อ PTT GROUP INNO Club</h2>
            <div className="space-y-7">
              <div>
                <p className="text-white font-medium text-base lg:text-xl 2xl:text-2xl leading-relaxed mb-3">1. ความพึงพอใจโดยรวมต่อ PTT GROUP INNO Club *</p>
                {renderScoreGroup('overall_score', 'overall_score')}
              </div>
              <div>
                <p className="text-white font-medium text-base lg:text-xl 2xl:text-2xl leading-relaxed mb-3">2. ท่านเห็นบรรยากาศ PTT GROUP INNO Club ครั้งนี้ ส่งเสริมให้ทุกคนกล้าแสดงความคิดเห็น และสร้างการมีส่วนร่วมมากน้อยเพียงใด *</p>
                {renderScoreGroup('atmosphere_score', 'atmosphere_score')}
              </div>
              <div>
                <p className="text-white font-medium text-base lg:text-xl 2xl:text-2xl leading-relaxed mb-3">3. PTT GROUP INNO Club ครั้งนี้ มีการแบ่งปัน แลกเปลี่ยนข้อมูลระหว่างกันมากน้อยเพียงใด *</p>
                {renderScoreGroup('sharing_score', 'sharing_score')}
              </div>
              <div>
                <p className="text-gray-500 text-sm mb-3">4. ข้อเสนอแนะเพิ่มเติม</p>
                <textarea
                  value={form.overall_comment}
                  onChange={(e) => setText('overall_comment', e.target.value)}
                  rows={3}
                  placeholder="ระบุข้อเสนอแนะ (ถ้ามี)..."
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white placeholder-gray-500 text-base focus:outline-none focus:border-yellow-400 resize-none"
                />
              </div>
            </div>
          </section>

          {/* ข้อเสนอแนะและคำถามเปิด */}
          <section className="rounded-2xl border border-yellow-300/15 bg-gradient-to-b from-white/10 to-transparent p-4 sm:p-8 lg:p-10 2xl:p-12">
            <h2 className="text-lg lg:text-2xl 2xl:text-3xl font-bold text-yellow-400 mb-7">ข้อเสนอแนะและแนวทางการนำไปใช้</h2>
            <div className="space-y-7">
              <div>
                <p className="text-white font-medium text-base lg:text-xl 2xl:text-2xl leading-relaxed mb-3">1. จากกิจกรรมในวันนี้ ท่านได้เรียนรู้อะไรเกี่ยวกับการสื่อสารสินค้า บริการ หรือไอเดียใหม่ให้ผู้ฟังเข้าใจและสนใจมากขึ้น?</p>
                <textarea
                  value={form.learn_apply}
                  onChange={(e) => setText('learn_apply', e.target.value)}
                  rows={4}
                  placeholder="กรุณาตอบคำถาม..."
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white placeholder-gray-500 text-base focus:outline-none focus:border-yellow-400 resize-none"
                />
              </div>
              <div>
                <p className="text-white font-medium text-base lg:text-xl 2xl:text-2xl leading-relaxed mb-3">2. ท่านค้นพบโอกาสหรือแนวทางใหม่ในการใช้ AI เพื่อสนับสนุนงานด้านการสื่อสาร การนำเสนอ หรือการสร้างสรรค์ผลงานอย่างไรบ้าง?</p>
                <textarea
                  value={form.ai_plan_6months}
                  onChange={(e) => setText('ai_plan_6months', e.target.value)}
                  rows={4}
                  placeholder="กรุณาตอบคำถาม..."
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white placeholder-gray-500 text-base focus:outline-none focus:border-yellow-400 resize-none"
                />
              </div>
              <div>
                <p className="text-white font-medium text-base lg:text-xl 2xl:text-2xl leading-relaxed mb-3">3. หากมีโอกาสพัฒนาผลงานของทีมต่อไป ท่านคิดว่าจะปรับปรุงหรือเพิ่มเติมอะไร เพื่อให้การสื่อสารมีประสิทธิภาพและสร้างผลกระทบได้มากยิ่งขึ้น?</p>
                <textarea
                  value={form.networking_collaboration}
                  onChange={(e) => setText('networking_collaboration', e.target.value)}
                  rows={4}
                  placeholder="กรุณาตอบคำถาม..."
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white placeholder-gray-500 text-base focus:outline-none focus:border-yellow-400 resize-none"
                />
              </div>
            </div>
          </section>

          <div className="sticky bottom-0 z-20 -mx-4 border-t border-yellow-300/20 bg-[#101010]/95 px-4 pt-3 pb-4 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 lg:gap-5 justify-center pt-0 sm:pt-4">
            <button
              type="submit"
              disabled={loading || !allRequiredFilled}
              className="w-full sm:w-auto px-8 py-4 lg:px-10 lg:py-4 2xl:px-12 2xl:py-5 rounded-xl font-bold text-base lg:text-lg 2xl:text-xl bg-yellow-400 text-black hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'กำลังส่ง...' : 'ส่ง'}
            </button>
            <Link
              to="/"
              className="w-full sm:w-auto px-8 py-4 lg:px-10 lg:py-4 2xl:px-12 2xl:py-5 rounded-xl font-medium text-base lg:text-lg 2xl:text-xl bg-white/10 text-white hover:bg-white/20 border border-white/10 text-center transition-colors"
            >
              ยกเลิก
            </Link>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
};

export default InnoClubEvaluationPage;
