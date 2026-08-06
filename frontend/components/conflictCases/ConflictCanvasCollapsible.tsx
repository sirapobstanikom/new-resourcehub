import React, { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';

export type ConflictCanvasCaseKey = 'case1' | 'case2' | 'case3' | 'case4';

const fieldClass =
  'w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-400/70';

const labelClass = 'block text-xs font-medium text-zinc-400 mb-1.5';

const CASE_META: Record<
  ConflictCanvasCaseKey,
  { caseNo: string; titleEn: string }
> = {
  case1: {
    caseNo: '01',
    titleEn: 'MANAGING UNDERPERFORMANCE WITH COMPASSION',
  },
  case2: {
    caseNo: '02',
    titleEn: 'MANAGING SOMEONE OLDER THAN YOU',
  },
  case3: {
    caseNo: '03',
    titleEn: 'BREAKING DOWN THE SILOS — CROSS-TEAM CONFLICT',
  },
  case4: {
    caseNo: '04',
    titleEn: 'MANAGING HIGH-CONFIDENCE GEN Z TALENT',
  },
};

/** เปิดฟอร์มเฉพาะ Case ที่ได้รับเนื้อหาแล้วเท่านั้น — อย่าเปิดเองโดยไม่มีต้นฉบับ */
const CANVAS_READY: ReadonlySet<ConflictCanvasCaseKey> = new Set(['case1', 'case2', 'case3', 'case4']);

type CanvasForm = {
  participantName: string;
  atStake: string;
  emotionA: string;
  emotionB: string;
  workedWell: string;
  differently: string;
  agreement: string;
  realPerson: string;
  realConflict: string;
  firstStep: string;
};

const emptyForm = (): CanvasForm => ({
  participantName: '',
  atStake: '',
  emotionA: '',
  emotionB: '',
  workedWell: '',
  differently: '',
  agreement: '',
  realPerson: '',
  realConflict: '',
  firstStep: '',
});

type SaveStatus = 'idle' | 'saving' | 'success' | 'error';

type Props = {
  caseKey: ConflictCanvasCaseKey;
  pageVersion?: string;
};

export function ConflictCanvasCollapsible({ caseKey, pageVersion }: Props) {
  const meta = CASE_META[caseKey];
  const isReady = CANVAS_READY.has(caseKey);
  const [open, setOpen] = useState(false);
  const [formsByCase, setFormsByCase] = useState<Partial<Record<ConflictCanvasCaseKey, CanvasForm>>>({});
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  const form = formsByCase[caseKey] ?? emptyForm();

  useEffect(() => {
    if (saveStatus !== 'success' && saveStatus !== 'error') return;
    const t = window.setTimeout(() => setSaveStatus('idle'), 4000);
    return () => window.clearTimeout(t);
  }, [saveStatus]);

  const set =
    (key: keyof CanvasForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value;
      setFormsByCase((prev) => ({
        ...prev,
        [caseKey]: { ...(prev[caseKey] ?? emptyForm()), [key]: value },
      }));
      if (saveStatus !== 'idle') setSaveStatus('idle');
    };

  const handleSave = async () => {
    if (!isSupabaseConfigured) {
      setSaveStatus('error');
      setSaveError('บันทึกไม่สำเร็จ กรุณาลองใหม่');
      return;
    }
    if (!form.participantName.trim()) {
      setSaveStatus('error');
      setSaveError('กรุณากรอกชื่อผู้เข้าร่วมก่อนบันทึก');
      return;
    }

    setSaveStatus('saving');
    setSaveError(null);

    const { error } = await supabase.from('whale_done_conflict_canvas_responses').insert({
      page_version: pageVersion || null,
      case_key: caseKey,
      case_no: meta.caseNo,
      case_title: meta.titleEn,
      participant_name: form.participantName.trim(),
      at_stake: form.atStake.trim() || null,
      emotion_a: form.emotionA.trim() || null,
      emotion_b: form.emotionB.trim() || null,
      worked_well: form.workedWell.trim() || null,
      differently: form.differently.trim() || null,
      agreement: form.agreement.trim() || null,
      real_person: form.realPerson.trim() || null,
      real_conflict: form.realConflict.trim() || null,
      first_step: form.firstStep.trim() || null,
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
        className="w-full rounded-xl border border-violet-400/45 bg-gradient-to-r from-violet-500/20 to-fuchsia-500/10 px-4 py-3.5 text-center font-black tracking-wide text-violet-100 shadow-lg shadow-violet-900/20 transition hover:border-violet-300/70 hover:from-violet-500/30 hover:to-fuchsia-500/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black/40"
        aria-expanded={open}
      >
        <span className="block text-sm sm:text-base uppercase tracking-wide">
          Conflict Canvas · Case {meta.caseNo}
          {!isReady ? ' · เร็วๆ นี้' : ''}
        </span>
        <span className="mt-0.5 block text-xs font-semibold text-violet-200/85 normal-case tracking-normal">
          กรอบการวิเคราะห์ความขัดแย้ง
        </span>
        <span className="mt-1.5 block text-[11px] font-semibold text-violet-200/70 normal-case tracking-normal">
          {!isReady
            ? 'ยังไม่มีเนื้อหา — รออัปเดต'
            : open
              ? 'แตะเพื่อซ่อนฟอร์ม'
              : 'แตะเพื่อเปิดและกรอกระหว่าง debrief'}
        </span>
      </button>

      {open && !isReady && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-center">
          <p className="font-bold text-amber-200 mb-1">เร็วๆ นี้</p>
          <p className="text-sm text-gray-300">
            Conflict Canvas Case {meta.caseNo} ยังไม่มีเนื้อหา — จะเพิ่มเมื่อได้รับต้นฉบับ
          </p>
        </div>
      )}

      {open && isReady && (
        <article
          className="rounded-2xl border border-violet-500/30 bg-violet-950/20 p-5 sm:p-6 md:p-8 space-y-6 text-left"
          id={`conflict-canvas-panel-${caseKey}`}
        >
          <header className="space-y-3 border-b border-white/10 pb-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-300/95">
              CONFLICT CANVAS · CASE {meta.caseNo}
            </p>
            <h2 className="text-base sm:text-lg font-bold text-white leading-snug">
              Conflict Canvas · กรอบการวิเคราะห์ความขัดแย้ง ·{' '}
              <span className="text-violet-200/90 font-semibold uppercase tracking-wide text-sm sm:text-base">
                {meta.titleEn}
              </span>
            </h2>
            <p className="rounded-xl border border-amber-400/35 bg-amber-500/10 px-3 py-2.5 text-xs sm:text-sm text-amber-100/95 leading-relaxed">
              ⚠️ Complete this during the debrief — NOT during the role play / กรอกระหว่างการถกเถียง ไม่ใช่ระหว่างการแสดงบทบาทสมมติ
            </p>
          </header>

          <label className="block">
            <span className={labelClass}>Participant name / ชื่อผู้เข้าร่วม</span>
            <input
              value={form.participantName}
              onChange={set('participantName')}
              placeholder="กรอกชื่อของคุณ"
              className={fieldClass}
              autoComplete="name"
            />
          </label>

          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400/90">
              1. WHAT WAS AT STAKE / อะไรที่มีความเสี่ยง
            </h3>
            <label className="block">
              <span className={labelClass}>
                The real underlying need / ความต้องการพื้นฐานที่แท้จริง
              </span>
              <textarea
                value={form.atStake}
                onChange={set('atStake')}
                rows={3}
                placeholder="กรอกความต้องการพื้นฐานที่แท้จริง…"
                className={`${fieldClass} resize-y`}
              />
            </label>
          </section>

          <section className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400/90">
              2. EMOTIONS IN THE ROOM / อารมณ์ที่อยู่ในห้อง
            </h3>
            <label className="block">
              <span className={labelClass}>What did Role A feel? / Role A รู้สึกอย่างไร?</span>
              <textarea
                value={form.emotionA}
                onChange={set('emotionA')}
                rows={2}
                placeholder="Role A…"
                className={`${fieldClass} resize-y`}
              />
            </label>
            <label className="block">
              <span className={labelClass}>What did Role B feel? / Role B รู้สึกอย่างไร?</span>
              <textarea
                value={form.emotionB}
                onChange={set('emotionB')}
                rows={2}
                placeholder="Role B…"
                className={`${fieldClass} resize-y`}
              />
            </label>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400/90">
              3. WHAT WORKED WELL / อะไรที่ได้ผล
            </h3>
            <label className="block">
              <span className={labelClass}>
                Specific moment the conversation turned / ช่วงเวลาที่บทสนทนาเปลี่ยนทิศทาง
              </span>
              <textarea
                value={form.workedWell}
                onChange={set('workedWell')}
                rows={3}
                placeholder="ช่วงเวลาที่เปลี่ยนทิศทาง…"
                className={`${fieldClass} resize-y`}
              />
            </label>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400/90">
              4. WHAT YOU&apos;D DO DIFFERENTLY / สิ่งที่คุณจะทำต่างออกไป
            </h3>
            <label className="block">
              <span className={labelClass}>
                If you could restart the conversation... / ถ้าเริ่มบทสนทนาใหม่ได้...
              </span>
              <textarea
                value={form.differently}
                onChange={set('differently')}
                rows={3}
                placeholder="สิ่งที่จะทำต่างออกไป…"
                className={`${fieldClass} resize-y`}
              />
            </label>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-violet-300/95">
              5. AGREEMENT REACHED / ข้อตกลงที่ได้
            </h3>
            <label className="block">
              <span className={labelClass}>
                What specifically was agreed? Who does what by when? / ตกลงอะไรเจาะจง? ใครทำอะไรภายในเมื่อไหร่?
              </span>
              <textarea
                value={form.agreement}
                onChange={set('agreement')}
                rows={3}
                placeholder="ข้อตกลง ใครทำอะไร ภายในเมื่อไหร่…"
                className={`${fieldClass} resize-y`}
              />
            </label>
          </section>

          <section className="space-y-4 rounded-xl border border-violet-400/25 bg-violet-500/10 p-4 sm:p-5">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-violet-200/95">
                6. YOUR REAL CONVERSATION / บทสนทนาจริงของคุณ
              </h3>
              <p className="mt-1.5 text-xs sm:text-sm text-zinc-300 leading-relaxed">
                Who is your &apos;Khun Mint / Som / Nat / Petch&apos; right now? คุณมี &apos;คุณมินต์ / สม / นัท / เพชร&apos;
                ของคุณเองคนไหน?
              </p>
            </div>

            <label className="block">
              <span className={labelClass}>Name / role of person / ชื่อ / บทบาทของบุคคลนั้น</span>
              <input
                value={form.realPerson}
                onChange={set('realPerson')}
                placeholder="ชื่อ / บทบาท"
                className={fieldClass}
              />
            </label>

            <label className="block">
              <span className={labelClass}>
                What&apos;s the conflict / conversation I&apos;ve been avoiding? / ความขัดแย้ง / บทสนทนาที่ฉันหลีกเลี่ยงคืออะไร?
              </span>
              <textarea
                value={form.realConflict}
                onChange={set('realConflict')}
                rows={3}
                placeholder="ความขัดแย้งหรือบทสนทนาที่หลีกเลี่ยง…"
                className={`${fieldClass} resize-y`}
              />
            </label>

            <label className="block">
              <span className={labelClass}>
                What&apos;s my first step? By when? / ก้าวแรกของฉันคืออะไร? ภายในเมื่อไหร่?
              </span>
              <textarea
                value={form.firstStep}
                onChange={set('firstStep')}
                rows={2}
                placeholder="ก้าวแรก และกำหนดเวลา…"
                className={`${fieldClass} resize-y`}
              />
            </label>
          </section>

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
