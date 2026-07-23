import React from 'react';

export type ConflictCase04Role = 'role_a' | 'role_b' | null;

const practiceEn = [
  "Acknowledging what's working before addressing what isn't",
  "Explaining the 'why' behind process and hierarchy — not just asserting it",
  'Making the feedback about professional risk (to him), not organizational rules',
  'Co-creating a working style that channels his energy productively',
] as const;

const practiceTh = [
  'ยอมรับสิ่งที่ได้ผลก่อนจัดการสิ่งที่ไม่ได้ผล',
  "อธิบาย 'เหตุผล' เบื้องหลังกระบวนการและลำดับชั้น ไม่ใช่แค่ยืนยัน",
  'ทำให้ feedback เกี่ยวกับความเสี่ยงทางวิชาชีพ (ต่อเขา) ไม่ใช่กฎขององค์กร',
  'สร้างรูปแบบการทำงานร่วมกันที่นำพลังงานของเขาไปในทิศทางที่มีประสิทธิผล',
] as const;

const avoidEn = [
  "Telling him 'that's how we do it here' without explanation",
  'Making it a lecture about respect and hierarchy',
  "Softening the feedback so much it doesn't land",
  'Treating this as a discipline issue rather than a development conversation',
] as const;

const avoidTh = [
  "บอกว่า 'นั่นคือวิธีที่เราทำที่นี่' โดยไม่มีคำอธิบาย",
  'ทำให้กลายเป็นการบรรยายเรื่องความเคารพและลำดับชั้น',
  'ทำให้ feedback อ่อนลงจนไม่มีผล',
  'มองว่าเป็นเรื่องวินัยแทนที่จะเป็นบทสนทนาการพัฒนา',
] as const;

type Props = {
  role: ConflictCase04Role;
};

export function ConflictCase04Article({ role }: Props) {
  return (
    <article className="rounded-2xl border border-violet-500/30 bg-violet-950/15 p-4 sm:p-6 md:p-8 space-y-8 text-left text-sm text-gray-200 leading-relaxed">
      <header className="space-y-3 border-b border-white/10 pb-6">
        <p className="text-xs font-bold uppercase tracking-wider text-violet-300/95">
          CASE 04 · MANAGING HIGH-CONFIDENCE GEN Z TALENT
        </p>
        <h2 className="text-lg sm:text-xl font-bold text-white leading-snug">การบริหาร Gen Z ที่มีความมั่นใจสูง</h2>
        <p className="text-xs sm:text-sm text-violet-200/80">
          Skills: Coaching · Feedback · Managing Expectations · Retention &nbsp;|&nbsp; การโค้ช · การให้ข้อเสนอแนะ ·
          การบริหารความคาดหวัง · การรักษาพนักงาน &nbsp;|&nbsp; Time: 20 minutes
        </p>
      </header>

      <section className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400/90">
          📋 THE SITUATION / สถานการณ์
        </h3>
        <p className="text-gray-300">
          Khun Petch is 24 years old, joined your team 8 months ago, and is genuinely talented — fast, creative,
          digitally sharp. But he often presents his ideas as final decisions, skips the checking-in step, and recently
          told a client something that contradicted the agreed-upon company position without consulting you first. When
          you gave him feedback, he said: &quot;I thought that was obvious — why would we keep doing it the old
          way?&quot; He&apos;s not disrespectful — he just genuinely doesn&apos;t understand why hierarchy, process, and
          senior approval matter.
        </p>
        <p className="text-xs font-semibold text-violet-300/90">─── ฉบับภาษาไทย / THAI VERSION ───</p>
        <p className="border-l-2 border-violet-500/40 pl-4 text-gray-300">
          คุณเพชรอายุ 24 ปี เข้าร่วมทีมมา 8 เดือนและมีพรสวรรค์จริงๆ — เร็ว สร้างสรรค์ เก่งเรื่องดิจิทัล แต่เขามักนำเสนอความคิดว่าเป็น
          การตัดสินใจสุดท้าย ข้ามขั้นตอนการเช็คอิน และเพิ่งบอกลูกค้าบางอย่างที่ขัดแย้งกับจุดยืนของบริษัทโดยไม่ปรึกษาคุณก่อน
          เมื่อคุณให้ feedback เขาพูดว่า &quot;ฉันคิดว่าชัดเจนอยู่แล้ว ทำไมเราถึงยังทำแบบเดิม?&quot; เขาไม่ได้หยาบคาย แต่จริงๆ ไม่เข้าใจว่า
          ทำไมลำดับชั้น กระบวนการ และการอนุมัติจากผู้อาวุโสถึงสำคัญ
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400/90">
          🎯 YOUR CHALLENGE / ความท้าทายของคุณ
        </h3>
        <p className="text-gray-300">
          How do you correct Khun Petch&apos;s behavior without crushing his energy and causing him to disengage or
          leave? How do you give feedback he&apos;ll actually hear?
        </p>
        <p className="border-l-2 border-amber-500/35 pl-4 text-gray-300">
          คุณจะแก้ไขพฤติกรรมของคุณเพชรได้อย่างไรโดยไม่ทำลายพลังงานและทำให้เขาถอยห่างหรือลาออก? จะให้ feedback อย่างไรที่เขาจะได้ยินจริงๆ?
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
            ROLE A — LINE MANAGER
            <span className="block text-sm font-normal text-violet-200/90 mt-1">บทบาท A — ผู้จัดการสายงาน</span>
          </h3>

          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-cyan-400/90">🇬🇧 ENGLISH</p>
            <p className="font-semibold text-white">WHO YOU ARE:</p>
            <p className="text-gray-300">
              You are Khun Petch&apos;s manager — 9 years in the industry, 3 in this role. Petch has been on your team
              for 8 months and is genuinely talented: fast, creative, technically sharp, full of ideas. Three days ago,
              he told a client something that contradicted the company&apos;s agreed position on a regulatory matter. He
              didn&apos;t ask you first. He didn&apos;t check. He was confident it was the right answer — and honestly,
              in a different context, it might have been a reasonable view. But it wasn&apos;t the position you and the
              leadership team had agreed to present. You spent an hour in a call with the client walking it back and
              smoothing it over. When you gave Petch feedback, he said: &apos;I thought that was obvious — why would we
              keep doing it the old way?&apos; He is not being insolent. He genuinely doesn&apos;t understand why
              process and hierarchy matter more than being right. Your job today is to help him see what he can&apos;t
              see yet — that professional trust is built slowly and destroyed fast, and that his confidence, without the
              system to back it up, is a liability to his own career. You do not want to lecture him. You want him to
              actually understand.
            </p>
            <p className="font-semibold text-white pt-2">YOUR GOALS:</p>
            <ol className="list-decimal list-inside space-y-2 marker:text-violet-400/90 text-gray-300">
              <li>Start with genuine recognition of his strengths — because it&apos;s true</li>
              <li>Describe the client incident specifically and its real consequences</li>
              <li>Help him see this as professional risk to himself — not company loyalty</li>
              <li>Understand his perspective: why did he do it? What did he think would happen?</li>
              <li>Agree on a specific working protocol for client communication</li>
            </ol>
            <p className="font-semibold text-white pt-2">OPENING LINE:</p>
            <p className="text-cyan-100/90 border-l-2 border-cyan-500/40 pl-4 italic">
              &quot;Khun Petch, I wanted to talk with you directly because I genuinely see potential in you and want to
              help you develop in the right direction. I need to be honest about something that happened with the client
              last week — because if we don&apos;t address it, it could become a real problem for your professional
              reputation. Can I share what I observed?&quot;
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold text-violet-300/90">─── ฉบับภาษาไทย / THAI VERSION ───</p>
            <p className="text-xs font-bold uppercase tracking-wider text-cyan-400/90">🇹🇭 ภาษาไทย</p>
            <p className="font-semibold text-white">คุณคือใคร:</p>
            <p className="border-l-2 border-cyan-500/35 pl-4 text-gray-300">
              คุณคือผู้จัดการของคุณเพชร — 9 ปีในอุตสาหกรรม 3 ปีในบทบาทนี้ คุณเพชรอยู่ในทีม 8 เดือนและมีความสามารถจริงๆ: เร็ว
              สร้างสรรค์ เต็มไปด้วยไอเดีย สามวันที่แล้วเขาบอกลูกค้าบางอย่างที่ขัดแย้งกับจุดยืนที่บริษัทและทีมผู้บริหารตกลงกัน
              โดยไม่ได้ถามคุณก่อน คุณใช้เวลาหนึ่งชั่วโมงในการโทรกับลูกค้าเพื่อแก้ไขและบรรเทาสถานการณ์ เมื่อคุณให้ feedback เขาพูดว่า
              &quot;ผมคิดว่ามันชัดเจนอยู่แล้ว ทำไมเราถึงยังทำแบบเดิม?&quot; เขาไม่ได้หยาบคาย เขาแค่จริงๆ ไม่เข้าใจว่าทำไมกระบวนการและลำดับชั้นถึงสำคัญ
              งานของคุณวันนี้คือช่วยให้เขาเข้าใจว่าความไว้วางใจในอาชีพสร้างช้าและพังเร็ว — และความมั่นใจของเขา ถ้าไม่มีระบบสนับสนุน
              เป็นความเสี่ยงต่ออาชีพของเขาเอง
            </p>
            <p className="font-semibold text-white pt-2">เป้าหมายของคุณ:</p>
            <ol className="list-decimal list-inside space-y-2 marker:text-violet-400/90 text-gray-300">
              <li>เริ่มด้วยการยอมรับจุดแข็งของเขาอย่างแท้จริง</li>
              <li>อธิบายเหตุการณ์ลูกค้าอย่างเจาะจงและผลที่เกิดขึ้นจริง</li>
              <li>ช่วยให้เขามองว่าเป็นความเสี่ยงทางวิชาชีพต่อตัวเขาเอง ไม่ใช่ความจงรักภักดีต่อบริษัท</li>
              <li>เข้าใจมุมมองของเขา ทำไมเขาถึงทำ? เขาคิดว่าจะเกิดอะไรขึ้น?</li>
              <li>ตกลงโปรโตคอลการทำงานเฉพาะสำหรับการสื่อสารกับลูกค้า</li>
            </ol>
          </div>
        </section>
      )}

      {role === 'role_b' && (
        <section className="space-y-6 border-t border-white/10 pt-8">
          <h3 className="text-base font-bold text-white">
            ROLE B — KHUN PETCH (Gen Z Employee)
            <span className="block text-sm font-normal text-violet-200/90 mt-1">
              บทบาท B — คุณเพชร (พนักงาน Gen Z)
            </span>
          </h3>

          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-cyan-400/90">🇬🇧 ENGLISH</p>
            <p className="font-semibold text-white">WHO YOU ARE:</p>
            <p className="text-gray-300">
              You are Khun Petch — 24 years old, 8 months in this company. You graduated with high marks from one of the
              best engineering programs in the country. You applied here because the company seemed forward-thinking.
              Sometimes it still feels that way. Other times it feels like people are attached to how things were done
              10 years ago. Three days ago, in a client meeting, you answered a question the way you genuinely believed
              it should be answered. The position you took was, in your mind, clearly more accurate and more useful to
              the client than the company&apos;s outdated official line. You didn&apos;t think to check first because it
              felt obvious. When your manager gave you feedback, your first reaction was defensive — and you said so:
              &apos;Why would we keep doing it the old way?&apos; You are walking into this meeting braced for a lecture
              about hierarchy and rules. You already have your counter-arguments ready. But here&apos;s the thing: part
              of you knows you might be missing something. You are not incapable of changing your mind. You are just not
              going to do it because someone told you to. If your manager explains why this matters in terms of your
              career — your reputation, your ability to be trusted with bigger things — you will actually listen.
            </p>
            <p className="font-semibold text-white pt-2">YOUR MINDSET:</p>
            <ul className="space-y-2 list-none text-gray-300">
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">•</span>
                <span>
                  Open somewhat defensively: &apos;I thought I was being helpful — the old position was outdated&apos;
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">•</span>
                <span>
                  If manager explains with rules and hierarchy alone, push back: &apos;But why does that matter more
                  than getting it right?&apos;
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">•</span>
                <span>If manager explains in terms of professional risk to you personally, genuinely listen</span>
              </li>
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">•</span>
                <span>If manager asks your opinion and treats you like an intelligent adult, engage positively</span>
              </li>
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">•</span>
                <span>
                  End: if the conversation was good, offer a specific commitment; if it was a lecture, give minimal
                  compliance
                </span>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold text-violet-300/90">─── ฉบับภาษาไทย / THAI VERSION ───</p>
            <p className="text-xs font-bold uppercase tracking-wider text-cyan-400/90">🇹🇭 ภาษาไทย</p>
            <p className="font-semibold text-white">คุณคือใคร:</p>
            <p className="border-l-2 border-cyan-500/35 pl-4 text-gray-300">
              คุณคือคุณเพชร — อายุ 24 ปี อยู่ในบริษัทมา 8 เดือน คุณเรียนจบด้วยเกียรตินิยมจากสถาบันชั้นนำ สมัครที่นี่เพราะดูก้าวหน้า
              บางครั้งก็เป็นอย่างนั้น บางครั้งรู้สึกว่าคนยึดติดกับวิธีทำงานแบบ 10 ปีที่แล้ว สามวันก่อนในการประชุมลูกค้า
              คุณตอบคำถามด้วยสิ่งที่คุณเชื่อว่าถูกต้องที่สุด โดยไม่ได้คิดว่าต้องถามก่อน มันชัดเจนสำหรับคุณว่าเป็นคำตอบที่ดีกว่า
              ตอนที่ผู้จัดการให้ feedback คุณตอบโต้: &quot;ทำไมเราถึงยังทำแบบเดิม?&quot; คุณเข้าห้องนี้เตรียมพร้อมถกเถียงด้วยเหตุผล
              ถ้าผู้จัดการพูดถึงกฎและลำดับชั้นเพียงอย่างเดียว คุณจะฟังภายนอกแต่ไม่เชื่อภายใน แต่ถ้าผู้จัดการอธิบายในแง่ความเสี่ยงต่ออาชีพของคุณ —
              ต่อชื่อเสียงและโอกาสของคุณเอง — คุณจะฟังจริงๆ
            </p>
            <p className="font-semibold text-white pt-2">แนวคิดของคุณ:</p>
            <ul className="space-y-2 list-none text-gray-300">
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">•</span>
                <span>เริ่มค่อนข้างป้องกันตัวเอง: &apos;ฉันคิดว่าฉันกำลังช่วย จุดยืนเดิมล้าสมัย&apos;</span>
              </li>
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">•</span>
                <span>
                  ถ้าผู้จัดการอธิบายด้วยกฎและลำดับชั้นเพียงอย่างเดียว โต้แย้ง: &apos;แต่ทำไมสิ่งนั้นถึงสำคัญกว่าการทำให้ถูกต้อง?&apos;
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">•</span>
                <span>ถ้าผู้จัดการอธิบายในแง่ความเสี่ยงทางวิชาชีพต่อคุณเป็นการส่วนตัว ฟังอย่างจริงจัง</span>
              </li>
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">•</span>
                <span>ถ้าผู้จัดการถามความคิดเห็นและปฏิบัติกับคุณเหมือนผู้ใหญ่ที่ฉลาด มีส่วนร่วมในเชิงบวก</span>
              </li>
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">•</span>
                <span>ท้าย: ถ้าบทสนทนาดี เสนอข้อผูกพันเจาะจง; ถ้าเป็นการบรรยาย ให้ปฏิบัติตามน้อยที่สุด</span>
              </li>
            </ul>
          </div>
        </section>
      )}
    </article>
  );
}
