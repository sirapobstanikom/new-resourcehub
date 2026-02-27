import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

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
    decision_score: 0 as number,
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
    form.decision_score,
  ];
  const allRequiredFilled = requiredScores.every((s) => s >= 1 && s <= 5);

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
      decision_score: form.decision_score,
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
      <div className="min-h-screen bg-black text-white bg-grid flex flex-col selection:bg-yellow-400 selection:text-black">
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
    <div className="min-h-screen bg-black text-white bg-grid flex flex-col selection:bg-yellow-400 selection:text-black">
      <header className="border-b border-white/10 px-4 py-4 sm:px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-gray-400 hover:text-white text-sm font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            หน้าหลัก
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center">
              <span className="text-black font-bold text-sm">M</span>
            </div>
            <span className="font-bold tracking-tight text-sm">MindDoJo</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-bold text-center mb-2">
          แบบประเมินความพึงพอใจในการร่วมกิจกรรม
        </h1>
        <p className="text-center text-gray-400 text-sm sm:text-base mb-8">
          PTT GROUP INNO Club #1 — วันที่ 13 มีนาคม 2569 เวลา 09.00–12.00 น.
          <br />
          สถานที่ Synergy Hall, EnCo C ชั้น 6
        </p>
        <p className="text-gray-500 text-sm mb-8 text-center">
          ระดับความพึงพอใจ: 5 = มากที่สุด 4 = มาก 3 = ปานกลาง 2 = น้อย 1 = น้อยที่สุด
        </p>

        <form onSubmit={handleSubmit} className="space-y-10">
          {error && (
            <div className="rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {/* Facilitator */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
            <h2 className="text-lg font-bold text-yellow-400 mb-6">Facilitator</h2>
            <div className="space-y-4">
              <p className="text-white font-medium">1. ความพึงพอใจโดยรวมต่อ Facilitator *</p>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <label key={n} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="facilitator_score"
                      checked={form.facilitator_score === n}
                      onChange={() => setScore('facilitator_score', n)}
                      className="w-4 h-4 text-yellow-400 border-white/30 focus:ring-yellow-400"
                    />
                    <span className="text-sm">{n}</span>
                  </label>
                ))}
              </div>
              <p className="text-gray-500 text-sm mt-2">2. ข้อเสนอแนะ</p>
              <textarea
                value={form.facilitator_comment}
                onChange={(e) => setText('facilitator_comment', e.target.value)}
                rows={3}
                placeholder="ระบุข้อเสนอแนะ (ถ้ามี)..."
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-yellow-400 resize-none"
              />
            </div>
          </section>

          {/* เนื้อหาของ PTT GROUP INNO Club */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
            <h2 className="text-lg font-bold text-yellow-400 mb-6">เนื้อหาของ PTT GROUP INNO Club</h2>
            <div className="space-y-4">
              <p className="text-white font-medium">1. ความพึงพอใจโดยรวมต่อเนื้อหาของกิจกรรม *</p>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <label key={n} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="content_score"
                      checked={form.content_score === n}
                      onChange={() => setScore('content_score', n)}
                      className="w-4 h-4 text-yellow-400 border-white/30 focus:ring-yellow-400"
                    />
                    <span className="text-sm">{n}</span>
                  </label>
                ))}
              </div>
              <p className="text-gray-500 text-sm mt-2">2. ข้อเสนอแนะ</p>
              <textarea
                value={form.content_comment}
                onChange={(e) => setText('content_comment', e.target.value)}
                rows={3}
                placeholder="ระบุข้อเสนอแนะ (ถ้ามี)..."
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-yellow-400 resize-none"
              />
            </div>
          </section>

          {/* ความพึงพอใจโดยรวมและความคิดเห็น */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
            <h2 className="text-lg font-bold text-yellow-400 mb-6">ความพึงพอใจโดยรวมและความคิดเห็นต่อ PTT GROUP INNO Club</h2>
            <div className="space-y-6">
              <div>
                <p className="text-white font-medium mb-2">1. ความพึงพอใจโดยรวมต่อ PTT GROUP INNO Club *</p>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <label key={n} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="overall_score"
                        checked={form.overall_score === n}
                        onChange={() => setScore('overall_score', n)}
                        className="w-4 h-4 text-yellow-400 border-white/30 focus:ring-yellow-400"
                      />
                      <span className="text-sm">{n}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-white font-medium mb-2">2. ท่านเห็นบรรยากาศ PTT GROUP INNO Club ครั้งนี้ ส่งเสริมให้ทุกคนกล้าแสดงความคิดเห็น และสร้างการมีส่วนร่วมมากน้อยเพียงใด *</p>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <label key={n} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="atmosphere_score"
                        checked={form.atmosphere_score === n}
                        onChange={() => setScore('atmosphere_score', n)}
                        className="w-4 h-4 text-yellow-400 border-white/30 focus:ring-yellow-400"
                      />
                      <span className="text-sm">{n}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-white font-medium mb-2">3. PTT GROUP INNO Club ครั้งนี้ มีการแบ่งปัน แลกเปลี่ยนข้อมูลระหว่างกันมากน้อยเพียงใด *</p>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <label key={n} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="sharing_score"
                        checked={form.sharing_score === n}
                        onChange={() => setScore('sharing_score', n)}
                        className="w-4 h-4 text-yellow-400 border-white/30 focus:ring-yellow-400"
                      />
                      <span className="text-sm">{n}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-white font-medium mb-2">4. PTT GROUP INNO Club ครั้งนี้มีการรับมือกับสถานการณ์ต่าง ๆ หรือมีการตัดสินใจได้อย่างรวดเร็ว มากน้อยเพียงใด *</p>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <label key={n} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="decision_score"
                        checked={form.decision_score === n}
                        onChange={() => setScore('decision_score', n)}
                        className="w-4 h-4 text-yellow-400 border-white/30 focus:ring-yellow-400"
                      />
                      <span className="text-sm">{n}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-gray-500 text-sm mb-2">5. ข้อเสนอแนะเพิ่มเติม</p>
                <textarea
                  value={form.overall_comment}
                  onChange={(e) => setText('overall_comment', e.target.value)}
                  rows={3}
                  placeholder="ระบุข้อเสนอแนะ (ถ้ามี)..."
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-yellow-400 resize-none"
                />
              </div>
            </div>
          </section>

          {/* ข้อเสนอแนะและคำถามเปิด */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
            <h2 className="text-lg font-bold text-yellow-400 mb-6">ข้อเสนอแนะและแนวทางการนำไปใช้</h2>
            <div className="space-y-6">
              <div>
                <p className="text-white font-medium mb-2">1. จากกิจกรรม Innoclub ในครั้งนี้ ช่วยให้ท่าน "เห็นภาพ"ขั้นตอน DMAIC ชัดเจนขึ้นเพียงใด?</p>
                <textarea
                  value={form.learn_apply}
                  onChange={(e) => setText('learn_apply', e.target.value)}
                  rows={4}
                  placeholder="กรุณาตอบคำถาม..."
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-yellow-400 resize-none"
                />
              </div>
              <div>
                <p className="text-white font-medium mb-2">2. ท่านสามารถนำกระบวนการ "ลดปัญหาหรือเพิ่มประสิทธิภาพการทำงาน" จากกิจกรรมในวันนี้ไปประยุกต์กับงานของท่านได้มากน้อยเพียงใด?</p>
                <textarea
                  value={form.ai_plan_6months}
                  onChange={(e) => setText('ai_plan_6months', e.target.value)}
                  rows={4}
                  placeholder="กรุณาตอบคำถาม..."
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-yellow-400 resize-none"
                />
              </div>
              <div>
                <p className="text-white font-medium mb-2">3. ท่านพึงพอใจต่อรูปแบบการเรียนรู้ผ่านกิจกรรม (Activity Based Learning) ในครั้งนี้เพียงใด?</p>
                <textarea
                  value={form.activity_learning_satisfaction}
                  onChange={(e) => setText('activity_learning_satisfaction', e.target.value)}
                  rows={4}
                  placeholder="กรุณาตอบคำถาม..."
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-yellow-400 resize-none"
                />
              </div>
              <div>
                <p className="text-white font-medium mb-2">4. club นี้ช่วยให้ท่านสร้างเครือข่าย (Networking) และ Innovation Collaboration ได้ดีเพียงใด?</p>
                <textarea
                  value={form.networking_collaboration}
                  onChange={(e) => setText('networking_collaboration', e.target.value)}
                  rows={4}
                  placeholder="กรุณาตอบคำถาม..."
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-yellow-400 resize-none"
                />
              </div>
              <div>
                <p className="text-white font-medium mb-2">5. สิ่งที่ควรพัฒนาหรือปรับปรุง?</p>
                <textarea
                  value={form.improvement_suggestions}
                  onChange={(e) => setText('improvement_suggestions', e.target.value)}
                  rows={4}
                  placeholder="กรุณาตอบคำถาม..."
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-yellow-400 resize-none"
                />
              </div>
            </div>
          </section>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <button
              type="submit"
              disabled={loading || !allRequiredFilled}
              className="px-8 py-4 rounded-xl font-bold bg-yellow-400 text-black hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'กำลังส่ง...' : 'ส่ง'}
            </button>
            <Link
              to="/"
              className="px-8 py-4 rounded-xl font-medium bg-white/10 text-white hover:bg-white/20 border border-white/10 text-center transition-colors"
            >
              ยกเลิก
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
};

export default InnoClubEvaluationPage;
