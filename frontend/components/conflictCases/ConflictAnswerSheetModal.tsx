import React, { useEffect, useRef, useState } from 'react';

/** รหัสสำหรับเปิด Answer sheet (ฝั่ง client — ใช้สำหรับกั้นเนื้อหาหลัง role play เท่านั้น) */
const ANSWER_SHEET_PASSWORD = '1234';

export type ConflictAnswerSheetCaseKey = 'case1' | 'case2' | 'case3' | 'case4';

export type ConflictAnswerSheetRoleKey = 'role_a' | 'role_b';

const goodEn = [
  'Manager opened with appreciation before raising the issue',
  "Manager asked 'what's been going on for you?' before presenting data",
  'Manager separated the support from the standard clearly',
  'A concrete plan with dates was agreed — not vague reassurance',
  'Employee felt safe enough to share (or chose not to, and that was respected)',
] as const;

const goodTh = [
  'ผู้จัดการเริ่มด้วยการยอมรับคุณค่าของพนักงาน ก่อนพูดถึงปัญหา',
  "ผู้จัดการถามว่า 'ช่วงนี้เกิดอะไรขึ้นบ้าง?' ก่อนนำข้อมูลผลงานมาพูด",
  'ผู้จัดการแยกให้ชัดว่าอะไรคือการช่วยเหลือ และอะไรคือมาตรฐานที่ยังต้องรักษา',
  'มีแผนที่ชัดเจนพร้อมวันติดตาม ไม่ใช่แค่คำพูดกว้างๆ',
  'พนักงานรู้สึกปลอดภัยพอที่จะเล่า หรือหากเลือกไม่เล่า ก็ได้รับการเคารพ',
] as const;

const warnEn = [
  'Manager jumped straight to the performance data',
  "Manager lowered the standard 'given your situation'",
  "Manager gave reassurance they can't guarantee",
  'Conversation ended with no clear next step',
] as const;

const warnTh = [
  'ผู้จัดการเริ่มด้วยข้อมูลผลงานทันที',
  'ผู้จัดการลดมาตรฐานเพียงเพราะเห็นใจสถานการณ์ส่วนตัว',
  'ผู้จัดการให้คำมั่นในสิ่งที่รับประกันไม่ได้',
  'คุยจบโดยไม่มีขั้นตอนถัดไปที่ชัดเจน',
] as const;

function Case01AnswerBodyRoleA() {
  return (
    <div className="space-y-6 text-sm text-gray-200 leading-relaxed">
      <p className="text-xs font-semibold text-violet-200/90 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2">
        สำหรับผู้รับบท <span className="text-white">Role A — LINE MANAGER</span>
      </p>
      <header className="space-y-2 border-b border-white/10 pb-4">
        <p className="text-xs font-bold uppercase tracking-wider text-violet-300/95">
          ANSWER SHEET · CASE 01 · MANAGING UNDERPERFORMANCE WITH COMPASSION
        </p>
        <p className="text-xs sm:text-sm text-amber-200/95 font-semibold">
          ⚠️ DISTRIBUTE TO PARTICIPANTS AFTER ROLE PLAY IS COMPLETE · แจกให้ผู้เข้าอบรมหลังจบ Role Play เท่านั้น
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        <div className="space-y-3 min-w-0">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400/90">
            ✅ WHAT GOOD LOOKS LIKE / สิ่งที่ควรเห็นในบทสนทนาที่ดี
          </h3>
          <ul className="space-y-2 list-none">
            {goodEn.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="text-emerald-400 shrink-0">✅</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <ul className="space-y-2 list-none pt-2 border-t border-white/10">
            {goodTh.map((line) => (
              <li key={line} className="flex gap-2 text-[13px] text-gray-400">
                <span className="text-emerald-400/80 shrink-0">✅</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-3 min-w-0">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400/90">
            ⚠️ WARNING SIGNS / สัญญาณที่ควรระวัง
          </h3>
          <ul className="space-y-2 list-none">
            {warnEn.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="text-amber-400 shrink-0">⚠️</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <ul className="space-y-2 list-none pt-2 border-t border-white/10">
            {warnTh.map((line) => (
              <li key={line} className="flex gap-2 text-[13px] text-gray-400">
                <span className="text-amber-400/80 shrink-0">⚠️</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <section className="space-y-3 rounded-xl border border-cyan-500/25 bg-cyan-950/20 p-4 sm:p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400/90">
          💡 KEY INSIGHT / Key Insight / ข้อคิดสำคัญ
        </h3>
        <p className="text-gray-300">
          Compassion and accountability are not opposites. The most supportive thing you can do for an employee in
          distress is to be honest about the performance requirement — and then ask how you can help them meet it.
        </p>
        <p className="text-gray-400 border-l-2 border-cyan-500/35 pl-3">
          ความเห็นใจและความรับผิดชอบไม่ใช่เรื่องตรงข้ามกัน สิ่งที่ช่วยพนักงานได้มากที่สุด คือพูดให้ชัดเรื่องมาตรฐานผลงาน
          แล้วถามว่าเราจะช่วยให้เขากลับมาทำได้ตามมาตรฐานนั้นอย่างไร
        </p>
      </section>
    </div>
  );
}

const goodBEn = [
  'The manager created space before pushing performance data; you could respond at your own pace',
  'You stayed professional while guarded, and opened up only when psychological safety felt genuine',
  'You engaged with performance expectations without equating them with being a "bad person"',
  'You left with concrete next steps you could realistically commit to — or a clear follow-up date',
  'If you chose not to share personal details, that boundary was respected',
] as const;

const goodBTh = [
  'ผู้จัดการเปิดพื้นที่ให้พูดก่อนเร่งเรื่องผลงาน คุณตอบได้ตามจังหวะของตัวเอง',
  'คุณรักษามารยาททางวิชาชีพขณะระวังตัว และค่อยๆ เปิดใจเมื่อรู้สึกว่าปลอดภัยจริง',
  'คุณรับมือกับมาตรฐานผลงานโดยไม่มองว่านั่นคือการตัดสินตัวตน',
  'คุณจบด้วยขั้นตอนถัดไปที่ชัดเจนหรือวันติดตามที่ทำได้จริง',
  'หากเลือกไม่เล่าเรื่องส่วนตัว ขอบเขตนั้นได้รับการเคารพ',
] as const;

const warnBEn = [
  'You stonewalled or gave one-word answers even when the manager opened with genuine care',
  'You agreed vaguely just to end the meeting — without intent to follow through',
  'You became hostile or defensive the moment performance was mentioned',
  'You shut down entirely after mild feedback, with no path to repair',
] as const;

const warnBTh = [
  'ผู้จัดการเปิดอย่างจริงใจแล้ว แต่คุณตอบสั้นๆ ปิดทางไม่คุย',
  'คุณรับปากกว้างๆ เพื่อจบประชุม โดยไม่ตั้งใจทำตาม',
  'คุณโต้แยงหรือป้องกันตัวรุนแรงทันทีที่มีคำพูดถึงผลงาน',
  'คุณปิดตัวทันทีหลังฟีดแบ็กเล็กน้อย โดยไม่มีทางกลับมาคุยต่อ',
] as const;

function Case01AnswerBodyRoleB() {
  return (
    <div className="space-y-6 text-sm text-gray-200 leading-relaxed">
      <p className="text-xs font-semibold text-violet-200/90 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2">
        สำหรับผู้รับบท <span className="text-white">Role B — Khun Mint (พนักงาน)</span>
      </p>
      <header className="space-y-2 border-b border-white/10 pb-4">
        <p className="text-xs font-bold uppercase tracking-wider text-violet-300/95">
          ANSWER SHEET · CASE 01 · MANAGING UNDERPERFORMANCE WITH COMPASSION
        </p>
        <p className="text-xs sm:text-sm text-amber-200/95 font-semibold">
          ⚠️ DISTRIBUTE TO PARTICIPANTS AFTER ROLE PLAY IS COMPLETE · แจกให้ผู้เข้าอบรมหลังจบ Role Play เท่านั้น
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        <div className="space-y-3 min-w-0">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400/90">
            ✅ WHAT GOOD LOOKS LIKE / มุมมองพนักงาน
          </h3>
          <ul className="space-y-2 list-none">
            {goodBEn.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="text-emerald-400 shrink-0">✅</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <ul className="space-y-2 list-none pt-2 border-t border-white/10">
            {goodBTh.map((line) => (
              <li key={line} className="flex gap-2 text-[13px] text-gray-400">
                <span className="text-emerald-400/80 shrink-0">✅</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-3 min-w-0">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400/90">
            ⚠️ WARNING SIGNS / สัญญาณที่ควรระวัง
          </h3>
          <ul className="space-y-2 list-none">
            {warnBEn.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="text-amber-400 shrink-0">⚠️</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <ul className="space-y-2 list-none pt-2 border-t border-white/10">
            {warnBTh.map((line) => (
              <li key={line} className="flex gap-2 text-[13px] text-gray-400">
                <span className="text-amber-400/80 shrink-0">⚠️</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <section className="space-y-3 rounded-xl border border-cyan-500/25 bg-cyan-950/20 p-4 sm:p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400/90">
          💡 KEY INSIGHT / ข้อคิดสำคัญ (มุมพนักงาน)
        </h3>
        <p className="text-gray-300">
          Psychological safety doesn&apos;t mean no accountability — it means you can be honest about what you need
          and still own the performance bar. The best outcome is naming reality together.
        </p>
        <p className="text-gray-400 border-l-2 border-cyan-500/35 pl-3">
          ความปลอดภัยทางใจไม่ได้แปลว่าไม่ต้องรับผิดชอบต่อผลงาน แต่หมายถึงคุณพูดความต้องการของตัวเองได้
          และยังยอมรับมาตรฐานที่ต้องร่วมกันทำให้ได้ — ผลลัพธ์ที่ดีคือการตั้งชื่อความจริงร่วมกัน
        </p>
      </section>
    </div>
  );
}

const c2GoodEn = [
  "Manager started with genuine acknowledgment of Khun Som's experience",
  'Manager named specific behaviors, not character',
  "Manager asked for Khun Som's perspective before presenting the problem",
  'Clear escalation protocol was agreed',
  'Meeting ended with mutual commitment',
] as const;

const c2GoodTh = [
  'ผู้จัดการเริ่มด้วยการยอมรับประสบการณ์ของคุณสมอย่างจริงใจ',
  'ผู้จัดการระบุพฤติกรรมเฉพาะ ไม่ใช่นิสัย',
  'ผู้จัดการถามมุมมองของคุณสมก่อนนำเสนอปัญหา',
  'ตกลงโปรโตคอลการส่งต่อปัญหาที่ชัดเจน',
  'การประชุมจบด้วยข้อผูกพันร่วม',
] as const;

const c2WarnEn = [
  "Manager invoked authority ('I'm the manager, so...')",
  'Manager became defensive about age or the promotion',
  'Conversation stayed vague — no specific behavior change agreement',
  'Manager dominated; Khun Som barely spoke',
] as const;

const c2WarnTh = [
  "ผู้จัดการอ้างอำนาจ ('ฉันคือผู้จัดการ...')",
  'ผู้จัดการป้องกันตัวเองเรื่องอายุหรือการเลื่อนตำแหน่ง',
  'บทสนทนาคลุมเครือ ไม่มีข้อตกลงเรื่องการเปลี่ยนแปลงพฤติกรรม',
  'ผู้จัดการครอบงำ คุณสมแทบไม่ได้พูด',
] as const;

function Case02AnswerBodyRoleA() {
  return (
    <div className="space-y-6 text-sm text-gray-200 leading-relaxed">
      <p className="text-xs font-semibold text-violet-200/90 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2">
        สำหรับผู้รับบท <span className="text-white">Role A — LINE MANAGER (Younger Team Lead)</span>
      </p>
      <header className="space-y-2 border-b border-white/10 pb-4">
        <p className="text-xs font-bold uppercase tracking-wider text-violet-300/95">
          ANSWER SHEET · CASE 02 · MANAGING SOMEONE OLDER THAN YOU
        </p>
        <p className="text-xs sm:text-sm text-amber-200/95 font-semibold">
          ⚠️ DISTRIBUTE TO PARTICIPANTS AFTER ROLE PLAY IS COMPLETE · แจกให้ผู้เข้าอบรมหลังจบ Role Play เท่านั้น
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        <div className="space-y-3 min-w-0">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400/90">
            ✅ WHAT GOOD LOOKS LIKE / สิ่งที่ควรเห็นในบทสนทนาที่ดี
          </h3>
          <ul className="space-y-2 list-none">
            {c2GoodEn.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="text-emerald-400 shrink-0">✅</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <ul className="space-y-2 list-none pt-2 border-t border-white/10">
            {c2GoodTh.map((line) => (
              <li key={line} className="flex gap-2 text-[13px] text-gray-400">
                <span className="text-emerald-400/80 shrink-0">✅</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-3 min-w-0">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400/90">
            ⚠️ WARNING SIGNS / สัญญาณที่ควรระวัง
          </h3>
          <ul className="space-y-2 list-none">
            {c2WarnEn.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="text-amber-400 shrink-0">⚠️</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <ul className="space-y-2 list-none pt-2 border-t border-white/10">
            {c2WarnTh.map((line) => (
              <li key={line} className="flex gap-2 text-[13px] text-gray-400">
                <span className="text-amber-400/80 shrink-0">⚠️</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <section className="space-y-3 rounded-xl border border-cyan-500/25 bg-cyan-950/20 p-4 sm:p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400/90">
          💡 KEY INSIGHT / Key Insight / ข้อคิดสำคัญ
        </h3>
        <p className="text-gray-300">
          Authority is granted by the organization but earned in the relationship. Khun Som&apos;s respect won&apos;t
          come from the org chart — it will come from demonstrating that you value what he knows.
        </p>
        <p className="text-gray-400 border-l-2 border-cyan-500/35 pl-3">
          ตำแหน่งอาจมาจากองค์กร แต่ความไว้วางใจต้องสร้างผ่านความสัมพันธ์ การยอมรับจากคุณสมไม่ได้เกิดจากผังองค์กร
          แต่เกิดจากการที่เขารู้สึกว่าคุณเห็นคุณค่าประสบการณ์และความรู้ของเขาจริงๆ
        </p>
      </section>
    </div>
  );
}

const c2GoodBEn = [
  'You stayed professional and specific when describing what has been hard for you',
  'You answered direct questions about bypassing your manager honestly, without contempt',
  'You contributed to a clearer escalation path instead of only defending the past',
  'You left with at least one commitment you helped shape — not only passive agreement',
  'You softened when respect for your tenure felt authentic, not performative',
] as const;

const c2GoodBTh = [
  'คุณยังรักษามารยาทและพูดถึงสิ่งที่ลำบากใจอย่างเฉพาะเจาะจง',
  'คุณตอบคำถามเรื่องการข้ามผู้จัดการอย่างตรงไปตรงมา โดยไม่ดูถูกอีกฝ่าย',
  'คุณช่วยสร้างความชัดเจนเรื่องการส่งต่อปัญหา ไม่ใช่แค่ยึดวิธีเดิม',
  'คุณจบด้วยข้อตกลงที่คุณมีส่วนร่วมกำหนด ไม่ใช่แค่พยักหน้าไปวันๆ',
  'คุณผ่อนคลายเมื่อการให้เกียรติประสบการณ์รู้สึกจริง ไม่ใช่พูดหวานๆ',
] as const;

const c2WarnBEn = [
  'You used seniority as a weapon ("I was here before you...")',
  'You gave minimal answers throughout even after a fair, respectful opening',
  'You agreed vaguely to end the meeting with no intention to follow through',
  'You signaled to peers afterward that the conversation was illegitimate',
] as const;

const c2WarnBTh = [
  'คุณใช้อาวุโสเป็นท่อนไม้กด ("ผมอยู่ที่นี่ก่อนคุณ...")',
  'คุณตอบน้อยตลอดแม้ผู้จัดการจะเปิดอย่างเคารพ',
  'คุณรับปากกว้างๆ เพื่อจบโดยไม่ตั้งใจทำตาม',
  'คุณไปบอกเพื่อนร่วมงานภายหลังว่าบทสนทนาไม่น่าเชื่อถือ',
] as const;

function Case02AnswerBodyRoleB() {
  return (
    <div className="space-y-6 text-sm text-gray-200 leading-relaxed">
      <p className="text-xs font-semibold text-violet-200/90 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2">
        สำหรับผู้รับบท <span className="text-white">Role B — Khun Som (พนักงาน)</span>
      </p>
      <header className="space-y-2 border-b border-white/10 pb-4">
        <p className="text-xs font-bold uppercase tracking-wider text-violet-300/95">
          ANSWER SHEET · CASE 02 · MANAGING SOMEONE OLDER THAN YOU
        </p>
        <p className="text-xs sm:text-sm text-amber-200/95 font-semibold">
          ⚠️ DISTRIBUTE TO PARTICIPANTS AFTER ROLE PLAY IS COMPLETE · แจกให้ผู้เข้าอบรมหลังจบ Role Play เท่านั้น
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        <div className="space-y-3 min-w-0">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400/90">
            ✅ WHAT GOOD LOOKS LIKE / มุมมองพนักงาน
          </h3>
          <ul className="space-y-2 list-none">
            {c2GoodBEn.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="text-emerald-400 shrink-0">✅</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <ul className="space-y-2 list-none pt-2 border-t border-white/10">
            {c2GoodBTh.map((line) => (
              <li key={line} className="flex gap-2 text-[13px] text-gray-400">
                <span className="text-emerald-400/80 shrink-0">✅</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-3 min-w-0">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400/90">
            ⚠️ WARNING SIGNS / สัญญาณที่ควรระวัง
          </h3>
          <ul className="space-y-2 list-none">
            {c2WarnBEn.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="text-amber-400 shrink-0">⚠️</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <ul className="space-y-2 list-none pt-2 border-t border-white/10">
            {c2WarnBTh.map((line) => (
              <li key={line} className="flex gap-2 text-[13px] text-gray-400">
                <span className="text-amber-400/80 shrink-0">⚠️</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <section className="space-y-3 rounded-xl border border-cyan-500/25 bg-cyan-950/20 p-4 sm:p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400/90">
          💡 KEY INSIGHT / ข้อคิดสำคัญ (มุมพนักงาน)
        </h3>
        <p className="text-gray-300">
          Respect is a two-way street: you can hold your dignity and still help a younger manager lead the team well.
          The strongest move is clarity — about what hurt, what you need, and what you&apos;re willing to commit to
          next.
        </p>
        <p className="text-gray-400 border-l-2 border-cyan-500/35 pl-3">
          ความเคารพเป็นสองทาง: คุณรักษาศักดิ์ศรีได้ และยังช่วยให้หัวหน้ารุ่นใหม่นำทีมได้ดีขึ้น การเคลื่อนไหวที่แข็งแรงคือความชัดเจน
          — ว่าอะไรที่เจ็บ ต้องการอะไร และพร้อมผูกมัดกับอะไรต่อไป
        </p>
      </section>
    </div>
  );
}

const c3GoodEn = [
  "Manager opened with 'our shared problem' framing, not blame",
  'Manager came with a specific proposal, not just a complaint',
  'Both teams agreed on explicit tasks, owners, and deadlines',
  'Relationship was preserved throughout',
  "Resolution didn't require senior management intervention",
] as const;

const c3GoodTh = [
  "ผู้จัดการเริ่มด้วยกรอบ 'ปัญหาร่วมของเรา' ไม่ใช่การกล่าวโทษ",
  'ผู้จัดการมาพร้อมข้อเสนอเจาะจง ไม่ใช่แค่ข้อร้องเรียน',
  'ทั้งสองทีมตกลงงาน เจ้าของ และกำหนดเวลาที่ชัดเจน',
  'รักษาความสัมพันธ์ตลอด',
  'การแก้ปัญหาไม่ต้องการการแทรกแซงจากผู้บริหาร',
] as const;

const c3WarnEn = [
  'Conversation became a debate about the original scope document',
  'One party threatened escalation as a first move',
  'Agreement was vague with no clear owners',
  'Khun Nat felt pressured rather than genuinely negotiated with',
] as const;

const c3WarnTh = [
  'บทสนทนากลายเป็นการถกเถียงเรื่องเอกสารขอบเขตเดิม',
  'ฝ่ายหนึ่งขู่จะส่งต่อเป็นก้าวแรก',
  'ข้อตกลงคลุมเครือโดยไม่มีเจ้าของชัดเจน',
  'คุณนัทรู้สึกถูกกดดันแทนที่จะได้เจรจาจริงๆ',
] as const;

function Case03AnswerBodyRoleA() {
  return (
    <div className="space-y-6 text-sm text-gray-200 leading-relaxed">
      <p className="text-xs font-semibold text-violet-200/90 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2">
        สำหรับผู้รับบท <span className="text-white">Role A — YOUR ROLE (Requesting Collaboration)</span>
      </p>
      <header className="space-y-2 border-b border-white/10 pb-4">
        <p className="text-xs font-bold uppercase tracking-wider text-violet-300/95">
          ANSWER SHEET · CASE 03 · BREAKING DOWN THE SILOS — CROSS-TEAM CONFLICT
        </p>
        <p className="text-xs sm:text-sm text-amber-200/95 font-semibold">
          ⚠️ DISTRIBUTE TO PARTICIPANTS AFTER ROLE PLAY IS COMPLETE · แจกให้ผู้เข้าอบรมหลังจบ Role Play เท่านั้น
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        <div className="space-y-3 min-w-0">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400/90">
            ✅ WHAT GOOD LOOKS LIKE / สิ่งที่ควรเห็นในบทสนทนาที่ดี
          </h3>
          <ul className="space-y-2 list-none">
            {c3GoodEn.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="text-emerald-400 shrink-0">✅</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <ul className="space-y-2 list-none pt-2 border-t border-white/10">
            {c3GoodTh.map((line) => (
              <li key={line} className="flex gap-2 text-[13px] text-gray-400">
                <span className="text-emerald-400/80 shrink-0">✅</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-3 min-w-0">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400/90">
            ⚠️ WARNING SIGNS / สัญญาณที่ควรระวัง
          </h3>
          <ul className="space-y-2 list-none">
            {c3WarnEn.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="text-amber-400 shrink-0">⚠️</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <ul className="space-y-2 list-none pt-2 border-t border-white/10">
            {c3WarnTh.map((line) => (
              <li key={line} className="flex gap-2 text-[13px] text-gray-400">
                <span className="text-amber-400/80 shrink-0">⚠️</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <section className="space-y-3 rounded-xl border border-cyan-500/25 bg-cyan-950/20 p-4 sm:p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400/90">
          💡 KEY INSIGHT / Key Insight / ข้อคิดสำคัญ
        </h3>
        <p className="text-gray-300">
          Influence without authority is one of the most important leadership skills in matrix organizations. Make it
          easy for the other party to say yes: acknowledge their constraints, frame it as a shared problem, come with a
          specific proposal.
        </p>
        <p className="text-gray-400 border-l-2 border-cyan-500/35 pl-3">
          การมีอิทธิพลโดยไม่มีอำนาจเป็นทักษะสำคัญมากในองค์กรที่ต้องทำงานข้ามทีม วิธีทำให้อีกฝ่ายตอบรับง่ายขึ้น คือยอมรับข้อจำกัดของเขา วางกรอบว่าเป็นปัญหาร่วม
          และมาพร้อมข้อเสนอที่ชัดเจน
        </p>
      </section>
    </div>
  );
}

const c3GoodBEn = [
  'You stated your boundary without attacking the other lead personally',
  'You asked for specifics (tasks, owner, timeline) instead of rejecting in the abstract',
  'You acknowledged the real gap once the other party framed it fairly',
  'You negotiated a partial lift your team could defend to your own manager',
  'You left with a written micro-agreement you could operationalize',
] as const;

const c3GoodBTh = [
  'คุณยืนขอบเขตโดยไม่โจมตีบุคคลของหัวหน้าอีกทีม',
  'คุณถามรายละเอียด (งาน คนรับผิดชอบ timeline) แทนการปฏิเสธแบบกว้างๆ',
  'คุณยอมรับช่องว่างจริงเมื่ออีกฝ่ายวางกรอบอย่างยุติธรรม',
  'คุณเจรจารับบางส่วนที่ทีมคุณอธิบายต่อผู้จัดการของคุณได้',
  'คุณจบด้วยข้อตกลงสั้นๆ ที่เป็นลายลักษณ์อักษรและนำไปทำงานต่อได้',
] as const;

const c3WarnBEn = [
  'You used the API line as a conversation-ender, not a starting point for problem-solving',
  'You became defensive before hearing an actual proposal',
  'You threatened escalation early instead of negotiating',
  'You agreed under pressure without capacity check or clear owners',
] as const;

const c3WarnBTh = [
  'คุณใช้ประโยคจบที่ API เป็นการปิดบทสนทนา แทนที่จะเป็นจุดเริ่มหาทางออก',
  'คุณป้องกันตัวเองก่อนฟังข้อเสนอที่แท้จริง',
  'คุณขู่ยกระดับเร็วเกินไปแทนการเจรจา',
  'คุณรับปากภายใต้แรงกดดันโดยไม่เช็คกำลังคนหรือเจ้าของงาน',
] as const;

function Case03AnswerBodyRoleB() {
  return (
    <div className="space-y-6 text-sm text-gray-200 leading-relaxed">
      <p className="text-xs font-semibold text-violet-200/90 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2">
        สำหรับผู้รับบท <span className="text-white">Role B — Khun Nat (IT Team Lead)</span>
      </p>
      <header className="space-y-2 border-b border-white/10 pb-4">
        <p className="text-xs font-bold uppercase tracking-wider text-violet-300/95">
          ANSWER SHEET · CASE 03 · BREAKING DOWN THE SILOS — CROSS-TEAM CONFLICT
        </p>
        <p className="text-xs sm:text-sm text-amber-200/95 font-semibold">
          ⚠️ DISTRIBUTE TO PARTICIPANTS AFTER ROLE PLAY IS COMPLETE · แจกให้ผู้เข้าอบรมหลังจบ Role Play เท่านั้น
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        <div className="space-y-3 min-w-0">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400/90">
            ✅ WHAT GOOD LOOKS LIKE / มุมมองหัวหน้า IT
          </h3>
          <ul className="space-y-2 list-none">
            {c3GoodBEn.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="text-emerald-400 shrink-0">✅</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <ul className="space-y-2 list-none pt-2 border-t border-white/10">
            {c3GoodBTh.map((line) => (
              <li key={line} className="flex gap-2 text-[13px] text-gray-400">
                <span className="text-emerald-400/80 shrink-0">✅</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-3 min-w-0">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400/90">
            ⚠️ WARNING SIGNS / สัญญาณที่ควรระวัง
          </h3>
          <ul className="space-y-2 list-none">
            {c3WarnBEn.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="text-amber-400 shrink-0">⚠️</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <ul className="space-y-2 list-none pt-2 border-t border-white/10">
            {c3WarnBTh.map((line) => (
              <li key={line} className="flex gap-2 text-[13px] text-gray-400">
                <span className="text-amber-400/80 shrink-0">⚠️</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <section className="space-y-3 rounded-xl border border-cyan-500/25 bg-cyan-950/20 p-4 sm:p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400/90">
          💡 KEY INSIGHT / ข้อคิดสำคัญ (มุมหัวหน้า IT)
        </h3>
        <p className="text-gray-300">
          Protecting your team from unscoped work is legitimate — but rigidity without curiosity burns cross-team trust.
          The strongest stance pairs a clear constraint with a willingness to evaluate a concrete, resourced proposal.
        </p>
        <p className="text-gray-400 border-l-2 border-cyan-500/35 pl-3">
          การปกป้องทีมจากงานนอก scope เป็นสิทธิ์ที่ถูกต้อง — แต่ความแข็งโดยไม่สนใจหาทางออกจะทำลายความไว้วางใจข้ามทีม
          จุดยืนที่แข็งแรงคือผูกข้อจำกัดไว้ชัด และยังพร้อมพิจารณาข้อเสนอที่เจาะจงและสอดคล้องทรัพยากรจริง
        </p>
      </section>
    </div>
  );
}

const c4GoodEn = [
  'Manager opened with genuine recognition of strengths',
  'Feedback was framed around professional risk to Petch — not company loyalty',
  'Manager asked questions rather than lecturing',
  'Petch was treated as intelligent and able to reason',
  'Specific protocol for future client communication was agreed',
] as const;

const c4GoodTh = [
  'ผู้จัดการเริ่มด้วยการยอมรับจุดแข็งอย่างแท้จริง',
  'Feedback ถูกนำเสนอรอบๆ ความเสี่ยงทางวิชาชีพต่อเพชร ไม่ใช่ความจงรักภักดีต่อบริษัท',
  'ผู้จัดการถามคำถามแทนการบรรยาย',
  'เพชรถูกปฏิบัติเหมือนคนฉลาดที่สามารถใช้เหตุผลได้',
  'ตกลงโปรโตคอลเฉพาะสำหรับการสื่อสารกับลูกค้าในอนาคต',
] as const;

const c4WarnEn = [
  'Manager invoked rules and hierarchy without explanation',
  "Feedback was so softened that Petch didn't grasp the severity",
  "Manager became frustrated with Petch's pushback",
  'No specific commitment or working agreement at the end',
] as const;

const c4WarnTh = [
  'ผู้จัดการอ้างกฎและลำดับชั้นโดยไม่มีคำอธิบาย',
  'Feedback อ่อนลงมากจนเพชรไม่เข้าใจความรุนแรง',
  'ผู้จัดการหงุดหงิดกับการโต้แย้งของเพชรและปิดบทสนทนา',
  'ไม่มีข้อผูกพันหรือข้อตกลงการทำงานที่ท้าย',
] as const;

function Case04AnswerBodyRoleA() {
  return (
    <div className="space-y-6 text-sm text-gray-200 leading-relaxed">
      <p className="text-xs font-semibold text-violet-200/90 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2">
        สำหรับผู้รับบท <span className="text-white">Role A — LINE MANAGER</span>
      </p>
      <header className="space-y-2 border-b border-white/10 pb-4">
        <p className="text-xs font-bold uppercase tracking-wider text-violet-300/95">
          ANSWER SHEET · CASE 04 · MANAGING HIGH-CONFIDENCE GEN Z TALENT
        </p>
        <p className="text-xs sm:text-sm text-amber-200/95 font-semibold">
          ⚠️ DISTRIBUTE TO PARTICIPANTS AFTER ROLE PLAY IS COMPLETE · แจกให้ผู้เข้าอบรมหลังจบ Role Play เท่านั้น
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        <div className="space-y-3 min-w-0">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400/90">
            ✅ WHAT GOOD LOOKS LIKE / สิ่งที่ควรเห็นในบทสนทนาที่ดี
          </h3>
          <ul className="space-y-2 list-none">
            {c4GoodEn.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="text-emerald-400 shrink-0">✅</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <ul className="space-y-2 list-none pt-2 border-t border-white/10">
            {c4GoodTh.map((line) => (
              <li key={line} className="flex gap-2 text-[13px] text-gray-400">
                <span className="text-emerald-400/80 shrink-0">✅</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-3 min-w-0">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400/90">
            ⚠️ WARNING SIGNS / สัญญาณที่ควรระวัง
          </h3>
          <ul className="space-y-2 list-none">
            {c4WarnEn.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="text-amber-400 shrink-0">⚠️</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <ul className="space-y-2 list-none pt-2 border-t border-white/10">
            {c4WarnTh.map((line) => (
              <li key={line} className="flex gap-2 text-[13px] text-gray-400">
                <span className="text-amber-400/80 shrink-0">⚠️</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <section className="space-y-3 rounded-xl border border-cyan-500/25 bg-cyan-950/20 p-4 sm:p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400/90">
          💡 KEY INSIGHT / Key Insight / ข้อคิดสำคัญ
        </h3>
        <p className="text-gray-300">
          Gen Z talent responds to &apos;why&apos; not &apos;what.&apos; They resist rules-based authority but often
          embrace reasoning-based authority. If you can explain professional consequences in terms of their career —
          not company loyalty — you&apos;ll get genuine buy-in.
        </p>
        <p className="text-gray-400 border-l-2 border-cyan-500/35 pl-3">
          Talent Gen Z มักตอบสนองต่อเหตุผลมากกว่าคำสั่ง พวกเขาอาจไม่ชอบอำนาจที่อ้างแค่กฎ แต่สามารถยอมรับเหตุผลที่ชัดเจนได้ โดยเฉพาะเมื่ออธิบายให้เห็นผลกระทบต่อชื่อเสียง โอกาส
          และการเติบโตในอาชีพของเขาเอง
        </p>
      </section>
    </div>
  );
}

const c4GoodBEn = [
  'You listened when consequences were framed as trust and career impact, not just compliance',
  'You asked clarifying questions instead of defaulting to slogans about the old way',
  'You owned the client impact without contempt for your manager',
  'You co-created a realistic protocol for client-facing communication',
  'You ended with a specific commitment you actually intended to keep',
] as const;

const c4GoodBTh = [
  'คุณฟังเมื่อผลกระทบถูกอธิบายเป็นความไว้วางใจและอาชีพ ไม่ใช่แค่การทำตามกฎ',
  'คุณถามคำถามชี้แจงแทนการใช้คำขวัญเรื่องวิธีเดิม',
  'คุณรับผิดชอบต่อผลกระทบต่อลูกค้าโดยไม่ดูหมิ่นผู้จัดการ',
  'คุณช่วยออกแบบโปรโตคอลการคุยกับลูกค้าที่ทำได้จริง',
  'คุณจบด้วยข้อผูกพันที่ชัดและตั้งใจทำตาม',
] as const;

const c4WarnBEn = [
  "You dismissed the whole conversation as 'outdated culture' without engaging with consequences",
  "You only pushed back with one-liners ('old way') instead of reasoning",
  'You pretended to agree to escape the meeting',
  'You framed it purely as attack vs defense, not a joint problem to solve',
] as const;

const c4WarnBTh = [
  'คุณตัดบทสนทนาว่าเป็นเรื่องวัฒนธรรมล้าสมัย โดยไม่พูดถึงผลกระทบจริง',
  'คุณโต้แย้งแค่ประโยคสั้นๆ เรื่องวิธีเดิม แทนการใช้เหตุผล',
  'คุณแกล้งรับปากเพื่อให้จบเร็ว',
  'คุณมองเป็นศัตรูกับผู้จัดการ แทนที่จะเป็นปัญหาร่วมที่แก้ได้',
] as const;

function Case04AnswerBodyRoleB() {
  return (
    <div className="space-y-6 text-sm text-gray-200 leading-relaxed">
      <p className="text-xs font-semibold text-violet-200/90 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2">
        สำหรับผู้รับบท <span className="text-white">Role B — Khun Petch (Gen Z)</span>
      </p>
      <header className="space-y-2 border-b border-white/10 pb-4">
        <p className="text-xs font-bold uppercase tracking-wider text-violet-300/95">
          ANSWER SHEET · CASE 04 · MANAGING HIGH-CONFIDENCE GEN Z TALENT
        </p>
        <p className="text-xs sm:text-sm text-amber-200/95 font-semibold">
          ⚠️ DISTRIBUTE TO PARTICIPANTS AFTER ROLE PLAY IS COMPLETE · แจกให้ผู้เข้าอบรมหลังจบ Role Play เท่านั้น
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        <div className="space-y-3 min-w-0">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400/90">
            ✅ WHAT GOOD LOOKS LIKE / มุมมองพนักงาน
          </h3>
          <ul className="space-y-2 list-none">
            {c4GoodBEn.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="text-emerald-400 shrink-0">✅</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <ul className="space-y-2 list-none pt-2 border-t border-white/10">
            {c4GoodBTh.map((line) => (
              <li key={line} className="flex gap-2 text-[13px] text-gray-400">
                <span className="text-emerald-400/80 shrink-0">✅</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-3 min-w-0">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400/90">
            ⚠️ WARNING SIGNS / สัญญาณที่ควรระวัง
          </h3>
          <ul className="space-y-2 list-none">
            {c4WarnBEn.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="text-amber-400 shrink-0">⚠️</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <ul className="space-y-2 list-none pt-2 border-t border-white/10">
            {c4WarnBTh.map((line) => (
              <li key={line} className="flex gap-2 text-[13px] text-gray-400">
                <span className="text-amber-400/80 shrink-0">⚠️</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <section className="space-y-3 rounded-xl border border-cyan-500/25 bg-cyan-950/20 p-4 sm:p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400/90">
          💡 KEY INSIGHT / ข้อคิดสำคัญ (มุมพนักงาน)
        </h3>
        <p className="text-gray-300">
          High standards for being right pair best with curiosity about what you don&apos;t yet see — especially in
          client-facing roles where trust is the product. The upgrade is learning to win with the system, not against it.
        </p>
        <p className="text-gray-400 border-l-2 border-cyan-500/35 pl-3">
          การยึดมั่นในความถูกต้องจะแข็งแรงขึ้นเมื่อคู่กับความอยากรู้ว่ายังมองไม่ครบ โดยเฉพาะงานที่ต้องเจอลูกค้า
          เพราะความไว้วางใจคือสิ่งที่ขาย — การเติบโตคือเรียนรู้ที่จะชนะร่วมกับระบบ ไม่ใช่ต่อต้านระบบอย่างเดียว
        </p>
      </section>
    </div>
  );
}

function caseTitle(caseKey: ConflictAnswerSheetCaseKey) {
  switch (caseKey) {
    case 'case1':
      return 'CASE 01';
    case 'case2':
      return 'CASE 02';
    case 'case3':
      return 'CASE 03';
    case 'case4':
      return 'CASE 04';
    default:
      return 'CASE';
  }
}

function roleTitle(role: ConflictAnswerSheetRoleKey) {
  return role === 'role_a' ? 'ROLE A' : 'ROLE B';
}

type Props = {
  open: boolean;
  onClose: () => void;
  caseKey: ConflictAnswerSheetCaseKey;
  role: ConflictAnswerSheetRoleKey;
};

export function ConflictAnswerSheetModal({ open, onClose, caseKey, role }: Props) {
  const [verified, setVerified] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [wrongPassword, setWrongPassword] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setVerified(false);
    setPasswordInput('');
    setWrongPassword(false);
  }, [open]);

  useEffect(() => {
    if (!open || verified) return;
    const id = window.requestAnimationFrame(() => {
      passwordInputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [open, verified]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ANSWER_SHEET_PASSWORD) {
      setWrongPassword(false);
      setVerified(true);
    } else {
      setWrongPassword(true);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="ปิด"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="answer-sheet-title"
        className="relative z-[101] w-full max-h-[92vh] sm:max-h-[85vh] sm:max-w-2xl rounded-t-2xl sm:rounded-2xl border border-violet-500/35 bg-[#0f0a18] shadow-2xl shadow-black/50 flex flex-col max-sm:max-h-[90vh]"
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10 shrink-0">
          <h2 id="answer-sheet-title" className="text-sm sm:text-base font-bold text-white pr-2 leading-snug">
            ANSWER SHEET · {caseTitle(caseKey)} · {roleTitle(role)}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-white/15 px-3 py-1.5 text-sm font-semibold text-gray-300 hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
          >
            ปิด
          </button>
        </div>
        {!verified ? (
          <div className="px-4 py-8 sm:px-6 sm:py-10">
            <form onSubmit={handlePasswordSubmit} className="mx-auto max-w-sm space-y-4">
              <p className="text-center text-sm text-violet-200/90 leading-relaxed">
                กรุณาใส่รหัสผ่านเพื่อเปิดเนื้อหา Answer sheet
                <span className="block mt-1 text-xs text-gray-500">แจกหลังจบ Role Play เท่านั้น</span>
              </p>
              <div className="space-y-2">
                <label htmlFor="answer-sheet-password" className="block text-xs font-medium text-gray-400">
                  รหัสผ่าน
                </label>
                <input
                  id="answer-sheet-password"
                  ref={passwordInputRef}
                  type="password"
                  autoComplete="off"
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    if (wrongPassword) setWrongPassword(false);
                  }}
                  className="w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400/50"
                  placeholder="••••"
                />
                {wrongPassword ? (
                  <p className="text-sm text-rose-400" role="alert">
                    รหัสผ่านไม่ถูกต้อง
                  </p>
                ) : null}
              </div>
              <button
                type="submit"
                className="w-full min-h-[48px] rounded-xl border border-violet-400/50 bg-violet-700/40 px-4 py-3 text-sm font-bold text-violet-50 hover:bg-violet-600/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
              >
                ยืนยัน
              </button>
            </form>
          </div>
        ) : (
          <div className="overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
            {caseKey === 'case1' && role === 'role_a' ? (
              <Case01AnswerBodyRoleA />
            ) : caseKey === 'case1' && role === 'role_b' ? (
              <Case01AnswerBodyRoleB />
            ) : caseKey === 'case2' && role === 'role_a' ? (
              <Case02AnswerBodyRoleA />
            ) : caseKey === 'case2' && role === 'role_b' ? (
              <Case02AnswerBodyRoleB />
            ) : caseKey === 'case3' && role === 'role_a' ? (
              <Case03AnswerBodyRoleA />
            ) : caseKey === 'case3' && role === 'role_b' ? (
              <Case03AnswerBodyRoleB />
            ) : caseKey === 'case4' && role === 'role_a' ? (
              <Case04AnswerBodyRoleA />
            ) : caseKey === 'case4' && role === 'role_b' ? (
              <Case04AnswerBodyRoleB />
            ) : (
              <div className="text-center py-10 space-y-2">
                <p className="font-bold text-amber-200">เร็วๆ นี้</p>
                <p className="text-sm text-gray-400">
                  Answer sheet สำหรับ {caseTitle(caseKey)} · {roleTitle(role)} กำลังจัดเตรียม
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
