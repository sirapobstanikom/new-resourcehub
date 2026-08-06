import React, { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

const fieldClass =
  'w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/70';

const labelClass = 'block text-xs font-medium text-zinc-400 mb-1.5';

type CommitmentForm = {
  name: string;
  date: string;
  who: string;
  behavior: string;
  impact: string;
  when: string;
  start: string;
  stop: string;
  continue: string;
};

const emptyForm = (): CommitmentForm => ({
  name: '',
  date: '',
  who: '',
  behavior: '',
  impact: '',
  when: '',
  start: '',
  stop: '',
  continue: '',
});

type SaveStatus = 'idle' | 'saving' | 'success' | 'error';

type Props = {
  pageVersion?: string;
};

export function AccountabilityCommitmentCardCollapsible({ pageVersion }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CommitmentForm>(emptyForm);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (saveStatus !== 'success' && saveStatus !== 'error') return;
    const t = window.setTimeout(() => setSaveStatus('idle'), 4000);
    return () => window.clearTimeout(t);
  }, [saveStatus]);

  const set =
    (key: keyof CommitmentForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
      if (saveStatus !== 'idle') setSaveStatus('idle');
    };

  const handleSave = async () => {
    if (!isSupabaseConfigured) {
      setSaveStatus('error');
      setSaveError('บันทึกไม่สำเร็จ กรุณาลองใหม่');
      return;
    }
    if (!form.name.trim()) {
      setSaveStatus('error');
      setSaveError('กรุณากรอกชื่อก่อนบันทึก');
      return;
    }

    setSaveStatus('saving');
    setSaveError(null);

    const { error } = await supabase.from('whale_done_accountability_commitments').insert({
      page_version: pageVersion || null,
      participant_name: form.name.trim(),
      commitment_date: form.date.trim() || null,
      who_text: form.who.trim() || null,
      behavior: form.behavior.trim() || null,
      impact: form.impact.trim() || null,
      when_text: form.when.trim() || null,
      start_doing: form.start.trim() || null,
      stop_doing: form.stop.trim() || null,
      continue_doing: form.continue.trim() || null,
    });

    if (error) {
      setSaveStatus('error');
      setSaveError('บันทึกไม่สำเร็จ กรุณาลองใหม่');
      return;
    }
    setSaveStatus('success');
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full rounded-xl border border-amber-400/45 bg-gradient-to-r from-amber-500/15 to-yellow-500/10 px-4 py-3.5 text-center font-black tracking-wide text-amber-100 shadow-lg shadow-amber-900/20 transition hover:border-amber-300/70 hover:from-amber-500/25 hover:to-yellow-500/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black/40"
        aria-expanded={open}
      >
        <span className="block text-sm sm:text-base uppercase tracking-wide">
          Participant Commitment Card
        </span>
        <span className="mt-0.5 block text-xs font-semibold text-amber-200/85 normal-case tracking-normal">
          บัตรคำมั่นสัญญาของผู้เข้าร่วม
        </span>
        <span className="mt-1.5 block text-[11px] font-semibold text-amber-200/70 normal-case tracking-normal">
          {open ? 'แตะเพื่อซ่อนฟอร์ม' : 'แตะเพื่อเปิดและกรอกคำมั่นสัญญา'}
        </span>
      </button>

      {open && (
        <article
          className="rounded-2xl border border-amber-500/25 bg-black/40 p-5 sm:p-6 md:p-8 space-y-6 text-left"
          id="accountability-commitment-card-panel"
        >
          <header className="space-y-3 border-b border-white/10 pb-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-400/90">
              PARTICIPANT COMMITMENT CARD · บัตรคำมั่นสัญญาของผู้เข้าร่วม
            </p>
            <p className="text-sm text-zinc-300 leading-relaxed">
              A reflection without a commitment is just a pleasant conversation. Use this card to make
              one specific, dated commitment before you leave the workshop.
            </p>
            <p className="text-sm text-zinc-400 leading-relaxed border-l-2 border-amber-500/40 pl-3">
              การสะท้อนคิดโดยไม่มีคำมั่นสัญญาเป็นเพียงบทสนทนาที่น่าพอใจ ใช้บัตรนี้เพื่อสร้างคำมั่นสัญญาที่เจาะจงและมีวันกำหนดก่อนออกจากการอบรม
            </p>
          </header>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block min-w-0">
              <span className={labelClass}>Name / ชื่อ</span>
              <input
                value={form.name}
                onChange={set('name')}
                placeholder="กรอกชื่อของคุณ"
                className={fieldClass}
                autoComplete="name"
              />
            </label>
            <label className="block min-w-0">
              <span className={labelClass}>Date / วันที่</span>
              <input
                type="date"
                value={form.date}
                onChange={set('date')}
                className={fieldClass}
              />
            </label>
          </div>

          <section className="space-y-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300/95">
                THE ONE ACCOUNTABILITY CONVERSATION I HAVE BEEN AVOIDING
              </h3>
              <p className="mt-1 text-xs text-zinc-400">
                บทสนทนาเรื่องความรับผิดชอบที่ฉันหลีกเลี่ยงมาตลอด
              </p>
            </div>

            <label className="block">
              <span className={labelClass}>Who (name or role) / บุคคล (ชื่อหรือตำแหน่ง)</span>
              <input
                value={form.who}
                onChange={set('who')}
                placeholder="ชื่อหรือตำแหน่ง"
                className={fieldClass}
              />
            </label>

            <label className="block">
              <span className={labelClass}>
                What specific behavior needs to change / พฤติกรรมที่ต้องเปลี่ยน
              </span>
              <textarea
                value={form.behavior}
                onChange={set('behavior')}
                rows={2}
                placeholder="พฤติกรรมเฉพาะที่ต้องเปลี่ยน"
                className={`${fieldClass} resize-y`}
              />
            </label>

            <label className="block">
              <span className={labelClass}>What is the real impact / ผลกระทบที่แท้จริงคืออะไร</span>
              <textarea
                value={form.impact}
                onChange={set('impact')}
                rows={2}
                placeholder="ผลกระทบที่แท้จริง"
                className={`${fieldClass} resize-y`}
              />
            </label>

            <label className="block">
              <span className={labelClass}>
                When I will have this conversation / เมื่อไหร่ที่จะคุย
              </span>
              <input
                value={form.when}
                onChange={set('when')}
                placeholder="ระบุวัน/เวลา — ไม่ใช่ 'เร็วๆ นี้'"
                className={fieldClass}
              />
              <p className="mt-1 text-[11px] text-zinc-500">(not &apos;soon&apos; / ไม่ใช่ &apos;เร็วๆ นี้&apos;)</p>
            </label>
          </section>

          <section className="space-y-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300/95">
                WHAT I WILL DO DIFFERENTLY STARTING TOMORROW
              </h3>
              <p className="mt-1 text-xs text-zinc-400">สิ่งที่ฉันจะทำต่างออกไปตั้งแต่พรุ่งนี้</p>
            </div>

            <label className="block">
              <span className={labelClass}>START doing / เริ่มทำ</span>
              <textarea
                value={form.start}
                onChange={set('start')}
                rows={2}
                placeholder="สิ่งที่จะเริ่มทำ"
                className={`${fieldClass} resize-y`}
              />
            </label>

            <label className="block">
              <span className={labelClass}>STOP doing / หยุดทำ</span>
              <textarea
                value={form.stop}
                onChange={set('stop')}
                rows={2}
                placeholder="สิ่งที่จะหยุดทำ"
                className={`${fieldClass} resize-y`}
              />
            </label>

            <label className="block">
              <span className={labelClass}>CONTINUE doing / ทำต่อ</span>
              <textarea
                value={form.continue}
                onChange={set('continue')}
                rows={2}
                placeholder="สิ่งที่จะทำต่อไป"
                className={`${fieldClass} resize-y`}
              />
            </label>
          </section>

          <blockquote className="space-y-2 rounded-xl border border-amber-400/20 bg-amber-500/5 px-4 py-4">
            <p className="text-sm italic text-amber-100/90 leading-relaxed">
              &ldquo;Accountability is not about punishing people for failure. It is about creating
              clarity about what matters, and committing to doing something about it.&rdquo;
            </p>
            <p className="text-sm text-zinc-400 leading-relaxed border-l-2 border-amber-500/40 pl-3">
              &ldquo;ความรับผิดชอบไม่ใช่การลงโทษคนที่ล้มเหลว แต่คือการสร้างความชัดเจนในสิ่งที่สำคัญ
              และมุ่งมั่นที่จะทำบางอย่างกับมัน&rdquo;
            </p>
          </blockquote>

          <div className="space-y-2 border-t border-white/10 pt-5">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saveStatus === 'saving'}
              className="w-full rounded-xl border border-emerald-400/50 bg-emerald-700/35 px-4 py-3 text-sm font-semibold text-emerald-50 hover:bg-emerald-600/40 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/80"
            >
              {saveStatus === 'saving' ? 'กำลังบันทึก…' : 'บันทึก'}
            </button>
            {saveStatus === 'success' && (
              <p className="text-center text-sm text-emerald-300">บันทึกเรียบร้อย</p>
            )}
            {saveStatus === 'error' && saveError && (
              <p className="text-center text-sm text-red-300">{saveError}</p>
            )}
          </div>
        </article>
      )}
    </div>
  );
}
