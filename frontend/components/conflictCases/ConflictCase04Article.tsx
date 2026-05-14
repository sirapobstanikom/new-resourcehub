import React from 'react';

export type ConflictCase04Role = 'role_a' | 'role_b' | null;

const practiceEn = [
  "Acknowledging what's working before addressing what isn't",
  "Explaining the 'why' behind process and hierarchy — not just asserting it",
  'Making the feedback about professional risk (to him), not organizational rules',
  'Co-creating a working style that channels his energy productively',
] as const;

const practiceTh = [
  'ยอมรับสิ่งที่เขาทำได้ดีก่อนพูดถึงสิ่งที่ต้องปรับ',
  'อธิบายเหตุผลเบื้องหลังกระบวนการและลำดับชั้น ไม่ใช่แค่บอกให้ทำตาม',
  'เชื่อม feedback กับความเสี่ยงต่อชื่อเสียงและอาชีพของเขา ไม่ใช่แค่กฎขององค์กร',
  'ตกลงวิธีทำงานร่วมกันที่ใช้พลังและความคิดของเขาให้เกิดผล โดยไม่ข้ามขั้นตอนสำคัญ',
] as const;

const avoidEn = [
  "Telling him 'that's how we do it here' without explanation",
  'Making it a lecture about respect and hierarchy',
  "Softening the feedback so much it doesn't land",
  'Treating this as a discipline issue rather than a development conversation',
] as const;

const avoidTh = [
  "บอกแค่ว่า 'ที่นี่ทำกันแบบนี้' โดยไม่อธิบายเหตุผล",
  'เปลี่ยนบทสนทนาให้เป็นการสั่งสอนเรื่องความเคารพหรือลำดับชั้น',
  'พูด feedback อ้อมเกินไปจนเขาไม่เข้าใจความรุนแรงของผลกระทบ',
  'มองเรื่องนี้เป็นการลงวินัย แทนที่จะเป็นบทสนทนาเพื่อพัฒนา',
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
          คุณเพชรอายุ 24 ปี เข้าทีมมา 8 เดือน และเป็นคนมีความสามารถจริงๆ ทั้งทำงานเร็ว คิดสร้างสรรค์ และเก่งด้านดิจิทัล แต่เขามักเสนอไอเดียเหมือนเป็นข้อสรุปสุดท้าย
          ข้ามขั้นตอนการเช็กกับหัวหน้า และล่าสุดบอกข้อมูลกับลูกค้าบางอย่างที่ขัดกับจุดยืนที่บริษัทตกลงกันไว้ โดยไม่ได้ปรึกษาคุณก่อน เมื่อคุณให้ feedback เขาตอบว่า
          &quot;ผมคิดว่ามันชัดเจนอยู่แล้ว ทำไมเราต้องทำแบบเดิม?&quot; เขาไม่ได้ตั้งใจไม่เคารพใคร แต่ยังไม่เข้าใจจริงๆ ว่าทำไมกระบวนการ ลำดับชั้น และการขออนุมัติจึงสำคัญ
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
          คุณจะปรับพฤติกรรมของคุณเพชรอย่างไร โดยไม่ดับพลังหรือทำให้เขาถอยห่าง และจะให้ feedback แบบไหนที่เขารับฟังจริงๆ?
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
              didn&apos;t ask you first. He didn&apos;t check. He was confident it was the right answer — and honestly, in
              a different context, it might have been a reasonable view. But it wasn&apos;t the position you and the
              leadership team had agreed to present. You spent an hour in a call with the client walking it back and
              smoothing it over. When you gave Petch feedback, he said: &apos;I thought that was obvious — why would we
              keep doing it the old way?&apos; He is not being insolent. He genuinely doesn&apos;t understand why process
              and hierarchy matter more than being right. Your job today is to help him see what he can&apos;t see yet —
              that professional trust is built slowly and destroyed fast, and that his confidence, without the system to
              back it up, is a liability to his own career. You do not want to lecture him. You want him to actually
              understand.
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
              คุณคือผู้จัดการของคุณเพชร มีประสบการณ์ในอุตสาหกรรมนี้ 9 ปี และอยู่ในบทบาทผู้จัดการมา 3 ปี คุณเพชรอยู่ในทีมมา 8 เดือน และเป็นคนมีศักยภาพจริง
              ทั้งทำงานเร็ว คิดสร้างสรรค์ เข้าใจเทคนิค และมีไอเดียเยอะ สามวันที่แล้ว เขาบอกลูกค้าบางอย่างที่ขัดกับจุดยืนที่บริษัทและทีมผู้บริหารตกลงกันไว้ โดยไม่ได้ถามคุณก่อน
              เขามั่นใจว่านั่นคือคำตอบที่ถูกต้อง และในบางบริบท มุมมองของเขาอาจมีเหตุผล แต่ครั้งนี้ไม่ใช่สิ่งที่บริษัทตกลงจะสื่อสารกับลูกค้า คุณต้องใช้เวลา 1 ชั่วโมงคุยกับลูกค้าเพื่ออธิบายและแก้สถานการณ์
              เมื่อคุณให้ feedback เขาตอบว่า &quot;ผมคิดว่ามันชัดเจนอยู่แล้ว ทำไมเราต้องทำแบบเดิม?&quot; เขาไม่ได้หยาบคาย แต่ยังไม่เข้าใจว่าทำไมกระบวนการและลำดับชั้นจึงสำคัญ
              งานของคุณวันนี้คือช่วยให้เขาเห็นว่า ความไว้วางใจในวิชาชีพสร้างช้าแต่เสียได้เร็ว และความมั่นใจที่ไม่มีระบบรองรับ อาจกลายเป็นความเสี่ยงต่อชื่อเสียงและการเติบโตของเขาเอง
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
            <span className="block text-sm font-normal text-violet-200/90 mt-1">บทบาท B — คุณเพชร (พนักงาน Gen Z)</span>
          </h3>

          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-cyan-400/90">🇬🇧 ENGLISH</p>
            <p className="font-semibold text-white">WHO YOU ARE:</p>
            <p className="text-gray-300">
              You are Khun Petch — 24 years old, 8 months in this company. You graduated with high marks from one of the
              best engineering programs in the country. You applied here because the company seemed forward-thinking.
              Sometimes it still feels that way. Other times it feels like people are attached to how things were done 10
              years ago. Three days ago, in a client meeting, you answered a question the way you genuinely believed it
              should be answered. The position you took was, in your mind, clearly more accurate and more useful to the
              client than the company&apos;s outdated official line. You didn&apos;t think to check first because it felt
              obvious. When your manager gave you feedback, your first reaction was defensive — and you said so: &apos;Why
              would we keep doing it the old way?&apos; You are walking into this meeting braced for a lecture about
              hierarchy and rules. You already have your counter-arguments ready. But here&apos;s the thing: part of you
              knows you might be missing something. You are not incapable of changing your mind. You are just not going to
              do it because someone told you to. If your manager explains why this matters in terms of your career —
              your reputation, your ability to be trusted with bigger things — you will actually listen.
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
                  If manager explains with rules and hierarchy alone, push back: &apos;But why does that matter more than
                  getting it right?&apos;
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">•</span>
                <span>
                  If manager explains in terms of professional risk to you personally, genuinely listen
                </span>
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
              คุณคือคุณเพชร อายุ 24 ปี อยู่กับบริษัทมา 8 เดือน คุณเรียนจบด้วยผลการเรียนดีจากหลักสูตรวิศวกรรมชั้นนำ และเลือกสมัครที่นี่เพราะคิดว่าเป็นองค์กรที่เปิดกว้างและทันสมัย
              บางครั้งคุณก็รู้สึกแบบนั้น แต่บางครั้งคุณรู้สึกว่าคนยังยึดติดกับวิธีทำงานแบบเดิมเมื่อ 10 ปีก่อน สามวันที่แล้ว ในการประชุมกับลูกค้า คุณตอบคำถามตามสิ่งที่คุณเชื่อว่าถูกต้องและเป็นประโยชน์ที่สุด
              คุณไม่ได้คิดว่าต้องเช็กก่อน เพราะสำหรับคุณมันชัดเจนมากว่าคำตอบเดิมของบริษัทล้าสมัย ตอนผู้จัดการให้ feedback คุณรู้สึกป้องกันตัวและพูดว่า &quot;ทำไมเราต้องทำแบบเดิม?&quot;
              วันนี้คุณเข้าห้องประชุมโดยเตรียมเหตุผลไว้โต้แย้ง แต่ลึกๆ คุณก็รู้ว่าอาจมีบางอย่างที่คุณยังไม่เห็น ถ้าผู้จัดการพูดแค่เรื่องกฎและลำดับชั้น คุณจะฟังแต่ไม่เชื่อจริงๆ
              แต่ถ้าเขาอธิบายว่าเรื่องนี้กระทบชื่อเสียง ความไว้วางใจ และโอกาสเติบโตของคุณอย่างไร คุณจะตั้งใจฟัง
            </p>
            <p className="font-semibold text-white pt-2">แนวคิดของคุณ:</p>
            <ul className="space-y-2 list-none text-gray-300">
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">•</span>
                <span>เริ่มด้วยท่าทีป้องกันตัวเล็กน้อย: &apos;ผมคิดว่าผมกำลังช่วยนะครับ จุดยืนเดิมมันล้าสมัยแล้ว&apos;</span>
              </li>
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">•</span>
                <span>
                  ถ้าผู้จัดการอธิบายแค่เรื่องกฎและลำดับชั้น ให้ถามกลับอย่างสุภาพว่า &apos;แต่ทำไมเรื่องนั้นถึงสำคัญกว่าการให้คำตอบที่ถูกต้องครับ?&apos;
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">•</span>
                <span>ถ้าผู้จัดการอธิบายให้เห็นความเสี่ยงต่อชื่อเสียงและการเติบโตของคุณ ให้ฟังอย่างจริงจัง</span>
              </li>
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">•</span>
                <span>ถ้าผู้จัดการถามความคิดเห็นและปฏิบัติกับคุณเหมือนผู้ใหญ่ที่มีเหตุผล ให้มีส่วนร่วมในเชิงบวก</span>
              </li>
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">•</span>
                <span>ตอนจบ ถ้าบทสนทนาดี ให้เสนอข้อตกลงที่ชัดเจน แต่ถ้าเป็นแค่การสั่งสอน ให้ตอบรับเท่าที่จำเป็น</span>
              </li>
            </ul>
          </div>
        </section>
      )}
    </article>
  );
}
