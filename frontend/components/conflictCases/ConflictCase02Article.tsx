import React from 'react';

export type ConflictCase02Role = 'role_a' | 'role_b' | null;

const practiceEn = [
  'Leading with respect for his experience, not asserting rank',
  'Naming the behavior pattern clearly without blame',
  'Asking for his perspective before presenting yours',
  'Creating a working agreement about escalation and communication',
] as const;

const practiceTh = [
  'นำด้วยการเคารพประสบการณ์ของเขา ไม่ใช่การใช้ตำแหน่ง',
  'ระบุรูปแบบพฤติกรรมอย่างชัดเจนโดยไม่กล่าวโทษ',
  'ถามมุมมองของเขาก่อนนำเสนอมุมมองของคุณ',
  'สร้างข้อตกลงการทำงานเรื่องการส่งต่อปัญหาและการสื่อสาร',
] as const;

const avoidEn = [
  "Pulling rank or reminding him that you're the boss",
  "Pretending the behavior isn't happening to keep the peace",
  'Going to your manager to complain before talking to him directly',
  'Becoming defensive about your age or promotion',
] as const;

const avoidTh = [
  'การใช้ตำแหน่งหรือเตือนว่าคุณคือหัวหน้า',
  'แกล้งทำเป็นว่าพฤติกรรมนั้นไม่ได้เกิดขึ้นเพื่อรักษาสันติภาพ',
  'ไปหาผู้จัดการของคุณก่อนที่จะพูดคุยกับเขาโดยตรง',
  'ป้องกันตัวเองเรื่องอายุหรือการเลื่อนตำแหน่ง',
] as const;

type Props = {
  role: ConflictCase02Role;
};

export function ConflictCase02Article({ role }: Props) {
  return (
    <article className="rounded-2xl border border-violet-500/30 bg-violet-950/15 p-4 sm:p-6 md:p-8 space-y-8 text-left text-sm text-gray-200 leading-relaxed">
      <header className="space-y-3 border-b border-white/10 pb-6">
        <p className="text-xs font-bold uppercase tracking-wider text-violet-300/95">
          CASE 02 · MANAGING SOMEONE OLDER THAN YOU
        </p>
        <h2 className="text-lg sm:text-xl font-bold text-white leading-snug">การบริหารพนักงานที่อายุมากกว่า</h2>
        <p className="text-xs sm:text-sm text-violet-200/80">
          Skills: Authority · Respect · Feedback · Boundary-setting &nbsp;|&nbsp; อำนาจ · การให้ความเคารพ · การให้ข้อเสนอแนะ ·
          การกำหนดขอบเขต &nbsp;|&nbsp; Time: 20 minutes
        </p>
      </header>

      <section className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400/90">
          📋 THE SITUATION / สถานการณ์
        </h3>
        <p className="text-gray-300">
          You are 34 years old and recently promoted to Team Lead. One of your direct reports, Khun Som, is 52 — he&apos;s
          been with the company for 18 years and was passed over for this promotion. He is experienced, technically
          capable, and well-liked. However, he often ignores your instructions, gives minimal responses in team
          meetings, and has twice gone directly to your manager to escalate issues without telling you first. He
          isn&apos;t hostile — he&apos;s polite on the surface. But the team can see that he doesn&apos;t fully respect
          your authority.
        </p>
        <p className="text-xs font-semibold text-violet-300/90">─── ฉบับภาษาไทย / THAI VERSION ───</p>
        <p className="border-l-2 border-violet-500/40 pl-4 text-gray-300">
          คุณอายุ 34 ปีและเพิ่งได้รับการเลื่อนตำแหน่งเป็น Team Lead คุณสมชาย อายุ 52 ปี อยู่กับบริษัทมา 18 ปีและถูกข้ามสำหรับ
          การเลื่อนตำแหน่งนี้ เขาเชี่ยวชาญและเป็นที่รัก แต่บ่อยครั้งเพิกเฉยต่อคำสั่งของคุณ ตอบสนองน้อยในการประชุมทีม
          และเคยไปหาผู้จัดการของคุณโดยตรงสองครั้งโดยไม่บอกคุณก่อน เขาไม่ได้มีทัศนคติเป็นปฏิปักษ์ แต่ทีมมองเห็นว่าเขาไม่ได้ให้
          ความเคารพอำนาจของคุณอย่างเต็มที่
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400/90">
          🎯 YOUR CHALLENGE / ความท้าทายของคุณ
        </h3>
        <p className="text-gray-300">
          How do you establish your authority and get Khun Som&apos;s genuine buy-in — not just surface compliance —
          without creating an enemy or causing him to disengage?
        </p>
        <p className="border-l-2 border-amber-500/35 pl-4 text-gray-300">
          คุณจะสร้างอำนาจและได้รับการยอมรับอย่างจริงจังจากคุณสมได้อย่างไร โดยไม่สร้างศัตรูหรือทำให้เขาถอยห่าง?
        </p>
      </section>

      <section className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <div className="space-y-3 min-w-0">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400/90">
              ✓ WHAT TO PRACTICE / สิ่งที่ควรฝึก
            </h4>
            <ul className="space-y-2 list-none">
              {practiceEn.map((line) => (
                <li key={line} className="flex gap-2 text-gray-300">
                  <span className="text-emerald-400 shrink-0">✓</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <ul className="space-y-2 list-none pt-2 border-t border-white/10">
              {practiceTh.map((line) => (
                <li key={line} className="flex gap-2 text-gray-400 text-[13px]">
                  <span className="text-emerald-400/80 shrink-0">✓</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-3 min-w-0">
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400/90">
              ✗ WHAT TO AVOID / สิ่งที่ควรหลีกเลี่ยง
            </h4>
            <ul className="space-y-2 list-none">
              {avoidEn.map((line) => (
                <li key={line} className="flex gap-2 text-gray-300">
                  <span className="text-rose-400 shrink-0">✗</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <ul className="space-y-2 list-none pt-2 border-t border-white/10">
              {avoidTh.map((line) => (
                <li key={line} className="flex gap-2 text-gray-400 text-[13px]">
                  <span className="text-rose-400/80 shrink-0">✗</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {!role && (
        <p className="text-center text-sm text-violet-200/90 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3">
          เลือก <span className="font-semibold text-white">Role A</span> หรือ{' '}
          <span className="font-semibold text-white">Role B</span> ด้านบนเพื่ออ่านบัตรบทบาทฝั่งนั้น
          (สถานการณ์ด้านบนใช้ร่วมกันทั้งสองฝั่ง)
        </p>
      )}

      {role === 'role_a' && (
        <section className="space-y-6 border-t border-white/10 pt-8">
          <h3 className="text-base font-bold text-white">
            ROLE A — LINE MANAGER (Younger Team Lead)
            <span className="block text-sm font-normal text-violet-200/90 mt-1">
              บทบาท A — ผู้จัดการ (Team Lead ที่อายุน้อยกว่า)
            </span>
          </h3>

          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-cyan-400/90">🇬🇧 ENGLISH</p>
            <p className="font-semibold text-white">WHO YOU ARE:</p>
            <p className="text-gray-300">
              You are 34 years old, recently promoted to Team Lead — a position Khun Som applied for and expected to
              get. You have a master&apos;s degree, 6 years at the company, and strong results in your previous role.
              But you are newer here than Khun Som, and you know it. His behavior since your promotion has been
              unmistakable: he responds to your instructions with minimal engagement, has twice gone to your manager
              directly without telling you first, and in team meetings visibly checks out when you speak. He is never
              openly rude. He is polite on the surface. But the team sees it. You have avoided this conversation for 3
              weeks because you didn&apos;t know how to start it without sounding defensive about your own authority.
              You decided today that avoiding it costs more than having it. You are walking in with one rule for
              yourself: do not pull rank. You want to understand before you demand. You are more nervous than you
              expected to be.
            </p>
            <p className="font-semibold text-white pt-2">YOUR GOALS:</p>
            <ol className="list-decimal list-inside space-y-2 marker:text-violet-400/90 text-gray-300">
              <li>Acknowledge his experience and expertise genuinely — not as a tactic</li>
              <li>Name the specific behavior you&apos;ve observed (not a character judgment)</li>
              <li>Understand his perspective: what does he think the working relationship should look like?</li>
              <li>Agree on a clear escalation protocol</li>
              <li>End with a specific mutual commitment</li>
            </ol>
            <p className="font-semibold text-white pt-2">OPENING LINE:</p>
            <p className="text-cyan-100/90 border-l-2 border-cyan-500/40 pl-4 italic">
              &quot;Khun Som, I want to thank you for meeting with me. I&apos;ve been thinking about how we can work
              together more effectively. I genuinely respect your 18 years of experience here — that&apos;s something I
              can&apos;t replicate. But I also want to talk honestly about a few specific situations...&quot;
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold text-violet-300/90">─── ฉบับภาษาไทย / THAI VERSION ───</p>
            <p className="text-xs font-bold uppercase tracking-wider text-cyan-400/90">🇹🇭 ภาษาไทย</p>
            <p className="font-semibold text-white">คุณคือใคร:</p>
            <p className="border-l-2 border-cyan-500/35 pl-4 text-gray-300">
              คุณอายุ 34 ปี เพิ่งได้รับการเลื่อนตำแหน่งเป็น Team Lead — ตำแหน่งที่คุณสมสมัครและคาดว่าจะได้รับ คุณมีวุฒิการศึกษาสูง
              ประสบการณ์ 6 ปีในบริษัท และผลงานที่ดีในตำแหน่งก่อนหน้า แต่คุณอยู่ที่นี่น้อยกว่าคุณสม พฤติกรรมของเขาชัดเจน:
              ตอบสนองต่อคำสั่งอย่างน้อยที่สุด เคยไปหาผู้จัดการของคุณโดยตรงสองครั้งโดยไม่บอก และในการประชุมทีมแสดงออกชัดว่าเขาไม่ได้ฟัง
              คุณหลีกเลี่ยงบทสนทนานี้มาสามสัปดาห์เพราะไม่รู้จะเริ่มอย่างไรโดยไม่ฟังดูป้องกันตัวเอง คุณตัดสินใจวันนี้ว่าจะไม่อ้างตำแหน่ง
              คุณอยากเข้าใจก่อน — ก่อนที่จะพูดเรื่องความคาดหวัง
            </p>
            <p className="font-semibold text-white pt-2">เป้าหมายของคุณ:</p>
            <ol className="list-decimal list-inside space-y-2 marker:text-violet-400/90 text-gray-300">
              <li>ยอมรับประสบการณ์และความเชี่ยวชาญของเขาอย่างจริงใจ ไม่ใช่เป็นกลยุทธ์</li>
              <li>ระบุพฤติกรรมเฉพาะที่สังเกตเห็น (ไม่ใช่การตัดสินนิสัย)</li>
              <li>เข้าใจมุมมองของเขา ความสัมพันธ์ในการทำงานควรเป็นอย่างไร?</li>
              <li>ตกลงเรื่องโปรโตคอลการส่งต่อปัญหาที่ชัดเจน</li>
              <li>จบด้วยข้อผูกพันร่วมที่เจาะจง</li>
            </ol>
          </div>
        </section>
      )}

      {role === 'role_b' && (
        <section className="space-y-6 border-t border-white/10 pt-8">
          <h3 className="text-base font-bold text-white">
            ROLE B — EMPLOYEE (Khun Som)
            <span className="block text-sm font-normal text-violet-200/90 mt-1">บทบาท B — พนักงาน (คุณสม)</span>
          </h3>

          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-cyan-400/90">🇬🇧 ENGLISH</p>
            <p className="font-semibold text-white">WHO YOU ARE:</p>
            <p className="text-gray-300">
              You are Khun Som — 52 years old, 18 years in this company. You have been in this department for 12 of
              those years. You have trained most of the team that now reports to a 34-year-old. When the promotion
              decision was announced, no one explained the reasoning to you. No one called you in. You found out through
              an email. You are not a dramatic person. You did not make a scene. But something in you became quiet. You
              still do your work. You do it correctly. You are always on time. But the extra mile — the mentoring, the
              late nights before deadlines, the covering for colleagues, the bringing new ideas to the table —
              that&apos;s gone. Why give more to a place that didn&apos;t see what you offered? When your manager calls
              you in today, you expect either empty praise or a performance concern. You have your polite face ready.
              If this conversation is a lecture or a reprimand, you will say the right things and nothing will change.
              If this manager genuinely asks what you think — what you need, what would make this work — you might be
              surprised. Because no one has actually asked.
            </p>
            <p className="font-semibold text-white pt-2">YOUR MINDSET:</p>
            <ul className="space-y-2 list-none text-gray-300">
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">•</span>
                <span>Start politely but guarded. Be respectful in tone but minimal in engagement.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">•</span>
                <span>If the manager pulls rank or acts defensively, become even more minimal</span>
              </li>
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">•</span>
                <span>If the manager genuinely acknowledges your expertise and creates space, soften slightly</span>
              </li>
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">•</span>
                <span>
                  If asked directly about the escalation behavior, be honest: &apos;That&apos;s how decisions were made
                  here for years.&apos;
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">•</span>
                <span>You can be won over — but only through genuine respect, not flattery</span>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold text-violet-300/90">─── ฉบับภาษาไทย / THAI VERSION ───</p>
            <p className="text-xs font-bold uppercase tracking-wider text-cyan-400/90">🇹🇭 ภาษาไทย</p>
            <p className="font-semibold text-white">คุณคือใคร:</p>
            <p className="border-l-2 border-cyan-500/35 pl-4 text-gray-300">
              คุณคือคุณสม — อายุ 52 ปี อยู่กับบริษัทมา 18 ปี คุณเคยฝึกคนส่วนใหญ่ในชั้นนี้ ก่อนหน้านี้คุณคือคนที่ทุกคนไปถามเมื่อมีปัญหา
              แต่เจ็ดเดือนที่แล้วคุณสมัครตำแหน่ง Team Lead ไม่ได้รับ ไม่มีใครอธิบายเหตุผล คุณรู้ทาง email คุณไม่ได้ทำตัวดราม่า ไม่บ่น
              แต่บางอย่างในตัวคุณเงียบลง คุณยังทำงานได้ดีและไม่มีข้อผิดพลาด แต่สิ่งพิเศษ — การอยู่ดึก การช่วยพนักงานใหม่ การนำเสนอไอเดีย —
              หยุดไปแล้ว ทำไมต้องทุ่มเทกับที่ที่มองไม่เห็นคุณ? เมื่อคุณเดินเข้าห้องนี้ คุณคาดว่าจะได้รับหนึ่งในสองอย่าง:
              บทสนทนาคลุมเครือที่ไม่เปลี่ยนอะไร หรือการเตือนอย่างเป็นทางการ คุณมีกำแพงขึ้นแล้ว ถ้าผู้จัดการถามคำถามจริงๆ —
              และรอคำตอบจริงๆ — คุณอาจพูด เพราะไม่มีใครถามเลย
            </p>
            <p className="font-semibold text-white pt-2">แนวคิดของคุณ:</p>
            <ul className="space-y-2 list-none text-gray-300">
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">•</span>
                <span>เริ่มสุภาพแต่ระวังตัว ให้ความเคารพในน้ำเสียงแต่มีส่วนร่วมน้อย</span>
              </li>
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">•</span>
                <span>ถ้าผู้จัดการใช้ตำแหน่งหรือป้องกันตัวเอง ยิ่งมีส่วนร่วมน้อยลง</span>
              </li>
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">•</span>
                <span>ถ้าผู้จัดการยอมรับความเชี่ยวชาญของคุณและสร้างพื้นที่ ผ่อนคลายเล็กน้อย</span>
              </li>
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">•</span>
                <span>
                  ถ้าถามตรงๆ เรื่องพฤติกรรมการส่งต่อ ซื่อสัตย์: &apos;นั่นคือวิธีตัดสินใจที่นี่มาหลายปีแล้ว&apos;
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">•</span>
                <span>คุณสามารถถูกเอาชนะได้ แต่ต้องผ่านการเคารพจริงๆ ไม่ใช่การเยินยอ</span>
              </li>
            </ul>
          </div>
        </section>
      )}
    </article>
  );
}
