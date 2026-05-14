import React from 'react';

export type ConflictCase02Role = 'role_a' | 'role_b' | null;

const practiceEn = [
  'Leading with respect for his experience, not asserting rank',
  'Naming the behavior pattern clearly without blame',
  'Asking for his perspective before presenting yours',
  'Creating a working agreement about escalation and communication',
] as const;

const practiceTh = [
  'เริ่มจากการให้เกียรติประสบการณ์ของเขา ไม่ใช่ใช้อำนาจตำแหน่ง',
  'พูดถึงพฤติกรรมที่เห็นอย่างชัดเจน โดยไม่กล่าวโทษตัวบุคคล',
  'ถามมุมมองของเขาก่อนอธิบายมุมมองของคุณ',
  'ตกลงวิธีทำงานร่วมกันให้ชัด โดยเฉพาะเรื่องการยกระดับปัญหาและการสื่อสาร',
] as const;

const avoidEn = [
  "Pulling rank or reminding him that you're the boss",
  "Pretending the behavior isn't happening to keep the peace",
  'Going to your manager to complain before talking to him directly',
  'Becoming defensive about your age or promotion',
] as const;

const avoidTh = [
  'ใช้ตำแหน่งกด หรือย้ำว่าคุณคือหัวหน้า',
  'ทำเหมือนไม่มีอะไรเกิดขึ้นเพื่อเลี่ยงความขัดแย้ง',
  'ไปบ่นกับผู้จัดการของคุณก่อนคุยกับเขาตรงๆ',
  'ป้องกันตัวเองเรื่องอายุหรือการได้รับตำแหน่ง',
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
          คุณอายุ 34 ปี และเพิ่งได้รับการเลื่อนตำแหน่งเป็น Team Lead หนึ่งในลูกทีมของคุณคือคุณสม อายุ 52 ปี อยู่กับบริษัทมา 18 ปี
          และเคยคาดหวังว่าจะได้ตำแหน่งนี้ เขามีประสบการณ์สูง ทำงานเก่ง และเป็นที่รักของทีม แต่หลังจากคุณได้รับตำแหน่ง
          เขามักไม่ค่อยทำตามแนวทางที่คุณให้ ตอบน้อยในการประชุม และเคยข้ามไปคุยกับผู้จัดการของคุณโดยตรง 2 ครั้งโดยไม่บอกคุณก่อน
          เขาไม่ได้แสดงท่าทีเป็นศัตรู ยังสุภาพเหมือนเดิม แต่ทีมเริ่มเห็นว่าเขายังไม่ได้ยอมรับบทบาทหัวหน้าของคุณอย่างเต็มที่
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
          คุณจะสร้างการยอมรับในบทบาทหัวหน้าจากคุณสมได้อย่างไร โดยไม่ทำให้เขารู้สึกเป็นศัตรูหรือถอยห่างจากทีม?
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
            <span className="block text-sm font-normal text-violet-200/90 mt-1">บทบาท A — ผู้จัดการ (Team Lead ที่อายุน้อยกว่า)</span>
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
              คุณอายุ 34 ปี เพิ่งได้รับการเลื่อนตำแหน่งเป็น Team Lead ซึ่งเป็นตำแหน่งที่คุณสมเคยสมัครและคาดหวังว่าจะได้
              คุณมีวุฒิการศึกษาดี ทำงานกับบริษัทมา 6 ปี และมีผลงานดีในบทบาทก่อนหน้า แต่คุณก็รู้ว่าคุณอยู่ที่นี่น้อยกว่าคุณสมมาก
              หลังจากคุณได้รับตำแหน่ง พฤติกรรมของเขาชัดเจนขึ้น เขาตอบรับคำสั่งแบบสั้นๆ เคยข้ามไปคุยกับผู้จัดการของคุณโดยตรง 2 ครั้ง
              และในการประชุมทีม เขาดูเหมือนไม่มีส่วนร่วมเวลาคุณพูด เขาไม่เคยหยาบคาย แต่ทีมก็เห็นสิ่งที่เกิดขึ้น
              คุณหลีกเลี่ยงบทสนทนานี้มา 3 สัปดาห์ เพราะไม่รู้จะเริ่มอย่างไรโดยไม่ดูเหมือนกำลังปกป้องอำนาจของตัวเอง
              วันนี้คุณตัดสินใจว่าจะไม่ใช้ตำแหน่งกดเขา แต่จะเริ่มจากการทำความเข้าใจ ก่อนพูดเรื่องความคาดหวัง
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
                <span>
                  If the manager genuinely acknowledges your expertise and creates space, soften slightly
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">•</span>
                <span>
                  If asked directly about the escalation behavior, be honest: &apos;That&apos;s how decisions were
                  made here for years.&apos;
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
              คุณคือคุณสม อายุ 52 ปี อยู่กับบริษัทมา 18 ปี และอยู่ในแผนกนี้มา 12 ปี คุณเคยสอนงานคนส่วนใหญ่ในทีม
              และเคยเป็นคนที่ทุกคนมาถามเมื่อมีปัญหา เมื่อมีการประกาศตำแหน่ง Team Lead คุณไม่ได้รับเลือก ทั้งที่คุณสมัครและคาดหวังไว้
              ไม่มีใครเรียกคุยหรืออธิบายเหตุผล คุณรู้ผลผ่านอีเมล คุณไม่ได้โวยวายหรือสร้างปัญหา แต่ภายในคุณเริ่มถอยออกมา
              คุณยังทำงานได้ถูกต้อง ตรงเวลา และไม่มีข้อผิดพลาด แต่สิ่งที่เคยทำเกินหน้าที่ เช่น การช่วยสอนคนใหม่ การอยู่ดึกก่อน deadline
              หรือการเสนอไอเดียใหม่ๆ เริ่มหายไป เพราะคุณรู้สึกว่าองค์กรไม่เห็นคุณค่าของสิ่งที่คุณให้มา
              เมื่อผู้จัดการเรียกคุยวันนี้ คุณคาดว่าอาจเป็นคำชมกว้างๆ หรือการเตือนเรื่องผลงาน คุณจึงเตรียมตัวรับแบบสุภาพแต่ระวังตัว
              ถ้าบทสนทนาเป็นการสั่งสอน คุณจะพูดตามที่ควรพูด แต่คงไม่มีอะไรเปลี่ยน แต่ถ้าผู้จัดการถามจริงๆ ว่าคุณคิดอย่างไรและต้องการอะไร
              คุณอาจเปิดใจ เพราะที่ผ่านมาแทบไม่มีใครถาม
            </p>
            <p className="font-semibold text-white pt-2">แนวคิดของคุณ:</p>
            <ul className="space-y-2 list-none text-gray-300">
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">•</span>
                <span>เริ่มสุภาพแต่ระวังตัว ให้ความเคารพในน้ำเสียงแต่มีส่วนร่วมน้อย</span>
              </li>
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">•</span>
                <span>ถ้าผู้จัดการใช้อำนาจตำแหน่งหรือดูป้องกันตัวเอง ให้ตอบให้น้อยลง</span>
              </li>
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">•</span>
                <span>ถ้าผู้จัดการยอมรับความเชี่ยวชาญของคุณจริงๆ และเปิดพื้นที่ให้พูด ให้ผ่อนคลายลงเล็กน้อย</span>
              </li>
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">•</span>
                <span>
                  ถ้าถูกถามตรงๆ เรื่องการข้ามไปคุยกับผู้จัดการ ให้ตอบตามจริงว่า &apos;ที่ผ่านมา วิธีตัดสินใจของที่นี่ก็เป็นแบบนี้มาตลอด&apos;
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
