import React, { useState } from 'react';

const timingRows = [
  {
    num: '01',
    titleEn: 'THE HABITUAL PATTERN',
    titleTh: 'รูปแบบพฤติกรรมซ้ำๆ: เมื่อการโค้ชไม่ได้ผล',
    time: '~20 min',
  },
  {
    num: '02',
    titleEn: 'THE CHECKED-OUT VETERAN',
    titleTh: 'พนักงานอาวุโสที่หมดแรงจูงใจ',
    time: '~20 min',
  },
  {
    num: '03',
    titleEn: 'THE CONFIDENT YOUNG ENGINEER',
    titleTh: 'วิศวกรรุ่นใหม่ที่มั่นใจสูง',
    time: '~20 min',
  },
  {
    num: '04',
    titleEn: 'PEER ACCOUNTABILITY WITHOUT AUTHORITY',
    titleTh: 'ความรับผิดชอบระหว่างเพื่อนร่วมงาน: เมื่อไม่มีอำนาจโดยตรง',
    time: '~20 min',
  },
] as const;

const steps = [
  {
    step: 'STEP 1',
    label: 'SET UP  /  เปิดการสนทนา',
    en: "Name the purpose of the conversation — don't ambush.",
    th: 'ระบุวัตถุประสงค์ของบทสนทนา อย่าทำให้อีกฝ่ายตกใจ',
  },
  {
    step: 'STEP 2',
    label: 'DESCRIBE  /  อธิบายข้อเท็จจริง',
    en: 'State the facts only — no judgment or interpretation.',
    th: 'บอกเฉพาะสิ่งที่สังเกตพบ ไม่มีการตัดสิน',
  },
  {
    step: 'STEP 3',
    label: 'IMPACT  /  บอกผลกระทบ',
    en: 'Explain the consequence to the team, client, or project.',
    th: 'อธิบายผลลัพธ์ต่อทีม ลูกค้า หรือโครงการ',
  },
  {
    step: 'STEP 4',
    label: 'UNDERSTAND  /  ทำความเข้าใจ',
    en: "Ask, don't assume. This is the step most managers skip.",
    th: 'ถาม ไม่ใช่สมมติ นี่คือขั้นตอนที่ผู้จัดการมักข้ามมากที่สุด',
  },
  {
    step: 'STEP 5',
    label: 'AGREE  /  ตกลงร่วมกัน',
    en: "Co-create the solution. Ask: 'What do you need from me?'",
    th: "สร้างแนวทางแก้ไขร่วมกัน ถาม: 'คุณต้องการอะไรจากฉัน?'",
  },
] as const;

export function AccountabilityWorkbookCollapsible() {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full rounded-xl border border-cyan-400/45 bg-gradient-to-r from-cyan-500/15 to-emerald-500/10 px-4 py-3.5 text-center font-black tracking-wide text-cyan-100 shadow-lg shadow-cyan-900/20 transition hover:border-cyan-300/70 hover:from-cyan-500/25 hover:to-emerald-500/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black/40"
        aria-expanded={open}
      >
        <span className="text-yellow-300/90">****</span>
        <span className="mx-1">ACCOUNTABILITY WITHOUT DRAMA</span>
        <span className="text-yellow-300/90">****</span>
        <span className="mt-1 block text-xs font-semibold text-cyan-200/80 normal-case tracking-normal">
          {open ? 'แตะเพื่อซ่อนคู่มือ' : 'แตะเพื่อเปิดคู่มือ'}
        </span>
      </button>

      {open && (
        <article
          className="rounded-2xl border border-cyan-500/25 bg-black/40 p-6 md:p-8 space-y-8 text-left text-sm text-gray-200 leading-relaxed"
          id="accountability-workbook-panel"
        >
          <header className="space-y-3 border-b border-white/10 pb-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400/90">
              ACCOUNTABILITY WITHOUT DRAMA
            </p>
            <h2 className="text-lg md:text-xl font-bold text-white leading-snug">
              การสร้างความรับผิดชอบโดยไม่ทำลายความสัมพันธ์
            </h2>
            <div className="space-y-1 text-xs text-gray-400">
              <p>Role Play Workbook · CK Power — May 2026 · Confidential</p>
              <p>People Management for Leaders · คนคือหัวใจของการบริหาร</p>
              <p>CK Power · May 2026</p>
            </div>
          </header>

          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400/90">Cases / กรณี</h3>
            <ul className="space-y-2 list-none">
              <li>
                <span className="font-semibold text-cyan-200">Case 01</span> THE HABITUAL PATTERN · รูปแบบพฤติกรรมซ้ำๆ:
                เมื่อการโค้ชไม่ได้ผล
              </li>
              <li>
                <span className="font-semibold text-cyan-200">Case 02</span> THE CHECKED-OUT VETERAN · พนักงานอาวุโสที่หมดแรงจูงใจ
              </li>
              <li>
                <span className="font-semibold text-cyan-200">Case 03</span> THE CONFIDENT YOUNG ENGINEER · วิศวกรรุ่นใหม่ที่มั่นใจสูง
              </li>
              <li>
                <span className="font-semibold text-cyan-200">Case 04</span> PEER ACCOUNTABILITY WITHOUT AUTHORITY ·
                ความรับผิดชอบระหว่างเพื่อนร่วมงาน: เมื่อไม่มีอำนาจโดยตรง
              </li>
            </ul>
          </section>

          <p className="text-xs text-gray-500 border-t border-white/10 pt-4">
            Prepared by MindDojo for CK Power · May 2026 · For Workshop Use Only
          </p>

          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400/90">
              HOW TO USE THIS WORKBOOK · วิธีใช้คู่มือนี้
            </h3>
            <p className="text-gray-300">
              Each case has a Manager Role Card and an Employee Role Card. Distribute separately — the surprise is part
              of the learning. Use the 5-step formula to guide the manager&apos;s approach.
            </p>
            <p className="text-gray-300 border-l-2 border-cyan-500/35 pl-4">
              แต่ละกรณีมี บัตรบทบาทผู้จัดการ และ บัตรบทบาทพนักงาน แจกแยกกัน — ความประหลาดใจเป็นส่วนหนึ่งของการเรียนรู้
              ใช้สูตร 5 ขั้นตอนเป็นแนวทางสำหรับผู้จัดการ
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400/90">
              THE 5-STEP ACCOUNTABILITY FORMULA · สูตรการสร้างความรับผิดชอบ 5 ขั้นตอน
            </h3>
            <ol className="space-y-5 list-none">
              {steps.map((s) => (
                <li key={s.step} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-2">
                  <p className="font-bold text-white">
                    {s.step} {s.label}
                  </p>
                  <p className="text-gray-300">{s.en}</p>
                  <p className="text-gray-400 border-l-2 border-emerald-500/30 pl-3">{s.th}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="space-y-3 overflow-x-auto">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400/90">TIMING · เวลา</h3>
            <table className="w-full min-w-[280px] text-left text-xs md:text-sm border-collapse">
              <thead>
                <tr className="border-b border-white/15 text-cyan-300/90">
                  <th className="py-2 pr-3 font-semibold">Case</th>
                  <th className="py-2 pr-3 font-semibold">Scenario / กรณี</th>
                  <th className="py-2 font-semibold whitespace-nowrap">Time / เวลา</th>
                </tr>
              </thead>
              <tbody>
                {timingRows.map((row) => (
                  <tr key={row.num} className="border-b border-white/10 align-top">
                    <td className="py-3 pr-3 font-mono text-cyan-200/90 whitespace-nowrap">{row.num}</td>
                    <td className="py-3 pr-3 text-gray-300">
                      <span className="font-medium text-white/90">{row.titleEn}</span>
                      <span className="text-gray-500"> · </span>
                      <span>{row.titleTh}</span>
                    </td>
                    <td className="py-3 text-gray-400 whitespace-nowrap">{row.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </article>
      )}
    </div>
  );
}
