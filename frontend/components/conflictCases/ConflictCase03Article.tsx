import React from 'react';

export type ConflictCase03Role = 'role_a' | 'role_b' | null;

const practiceEn = [
  'Separating the problem (the gap) from the person (Khun Nat)',
  "Using shared interest ('both our teams look bad if this fails') not blame",
  'Negotiating without pulling rank or escalating',
  'Creating a documented micro-agreement both teams can hold',
] as const;

const practiceTh = [
  'แยกปัญหาเรื่องช่องว่างของงาน ออกจากตัวบุคคล',
  "ใช้กรอบผลประโยชน์ร่วม เช่น 'ถ้าโครงการล้มเหลว ทั้งสองทีมจะได้รับผลกระทบ' แทนการกล่าวโทษ",
  'เจรจาโดยไม่ใช้อำนาจตำแหน่งหรือรีบยกระดับปัญหา',
  'สร้างข้อตกลงสั้นๆ ที่เป็นลายลักษณ์อักษรและทั้งสองทีมใช้ยึดร่วมกันได้',
] as const;

const avoidEn = [
  "Going above Khun Nat's head before trying direct negotiation",
  'Debating whose fault it is (scope document vs. interpretation)',
  'Using pressure tactics that damage the relationship',
  "Accepting a non-solution ('we'll figure it out') with no clear owner",
] as const;

const avoidTh = [
  'ข้ามหัวคุณนัทไปหาผู้บริหารก่อนลองคุยตรงๆ',
  'ถกเถียงว่าใครผิด โดยวนอยู่กับเอกสาร scope หรือการตีความ',
  'ใช้วิธีกดดันจนทำลายความสัมพันธ์ในการทำงาน',
  "ยอมรับคำตอบกว้างๆ เช่น 'เดี๋ยวค่อยหาทางกัน' โดยไม่มีเจ้าของงานชัดเจน",
] as const;

type Props = {
  role: ConflictCase03Role;
};

export function ConflictCase03Article({ role }: Props) {
  return (
    <article className="rounded-2xl border border-violet-500/30 bg-violet-950/15 p-4 sm:p-6 md:p-8 space-y-8 text-left text-sm text-gray-200 leading-relaxed">
      <header className="space-y-3 border-b border-white/10 pb-6">
        <p className="text-xs font-bold uppercase tracking-wider text-violet-300/95">
          CASE 03 · BREAKING DOWN THE SILOS — CROSS-TEAM CONFLICT
        </p>
        <h2 className="text-lg sm:text-xl font-bold text-white leading-snug">การทำงานข้ามฝ่าย ข้ามหน่วยงาน</h2>
        <p className="text-xs sm:text-sm text-violet-200/80">
          Skills: Conflict Resolution · Collaboration · Influence Without Authority &nbsp;|&nbsp; การแก้ไขข้อขัดแย้ง ·
          ความร่วมมือ · การมีอิทธิพลโดยไม่มีอำนาจ &nbsp;|&nbsp; Time: 20 minutes
        </p>
      </header>

      <section className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400/90">
          📋 THE SITUATION / สถานการณ์
        </h3>
        <p className="text-gray-300">
          Your team and the IT Infrastructure team are supposed to collaborate on a shared systems project. The project
          has been delayed by 6 weeks because tasks keep falling into a gap between your two teams — each side says
          it&apos;s the other&apos;s responsibility. The IT Lead, Khun Nat, is not your subordinate and not your peer in
          the same division. In a recent project meeting, Khun Nat said flatly: &quot;Our team&apos;s scope ends at the
          API. What happens after that is your team&apos;s problem.&quot; The work isn&apos;t getting done and both
          teams look bad.
        </p>
        <p className="text-xs font-semibold text-violet-300/90">─── ฉบับภาษาไทย / THAI VERSION ───</p>
        <p className="border-l-2 border-violet-500/40 pl-4 text-gray-300">
          ทีมของคุณและทีม IT Infrastructure ต้องทำงานร่วมกันในโครงการระบบเดียวกัน แต่โครงการล่าช้ามา 6 สัปดาห์ เพราะมีงานบางส่วนตกอยู่ตรงกลางระหว่างสองทีม
          แต่ละฝ่ายมองว่าเป็นความรับผิดชอบของอีกฝ่าย คุณนัท หัวหน้าทีม IT ไม่ใช่ลูกน้องของคุณ และไม่ได้อยู่ในสายงานเดียวกัน ในการประชุมล่าสุด คุณนัทพูดชัดว่า
          &quot;ขอบเขตของทีมเราจบที่ API ส่วนหลังจากนั้นเป็นเรื่องของทีมคุณ&quot; ตอนนี้งานยังไม่เดิน และทั้งสองทีมเริ่มดูไม่ดีต่อผู้บริหาร
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400/90">
          🎯 YOUR CHALLENGE / ความท้าทายของคุณ
        </h3>
        <p className="text-gray-300">
          You need to get Khun Nat to take shared ownership of the gap — without formal authority over him, without
          burning the relationship, and without escalating to senior management.
        </p>
        <p className="border-l-2 border-amber-500/35 pl-4 text-gray-300">
          คุณต้องชวนคุณนัทมารับผิดชอบช่องว่างนี้ร่วมกัน โดยที่คุณไม่มีอำนาจสั่งเขา ต้องไม่ทำลายความสัมพันธ์ และยังไม่ควรยกระดับไปถึงผู้บริหาร
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
            ROLE A — YOUR ROLE (Requesting Collaboration)
            <span className="block text-sm font-normal text-violet-200/90 mt-1">บทบาท A — บทบาทของคุณ (ขอความร่วมมือ)</span>
          </h3>

          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-cyan-400/90">🇬🇧 ENGLISH</p>
            <p className="font-semibold text-white">WHO YOU ARE:</p>
            <p className="text-gray-300">
              You are a team lead — 5 years with the company, responsible for a shared systems project that has now
              stalled for 6 weeks. The project is behind because of an undefined gap between what your team does and
              what Khun Nat&apos;s IT team does. Each side says it&apos;s the other&apos;s problem. In a team meeting
              last week, Nat said flatly: &apos;Our scope ends at the API. What happens after that is your team&apos;s
              problem.&apos; You have no authority over him. You cannot force this. You cannot escalate to senior
              management without it looking like you&apos;ve failed to handle a peer relationship. Your manager has
              already asked you twice how the project is progressing. You told her it was &apos;almost resolved.&apos; It
              isn&apos;t. You are sitting across from Nat right now, and you have made a decision: you are not going to
              debate scope. You are going to frame this as a shared problem and come with a specific proposal. You need
              him to say yes to something concrete today.
            </p>
            <p className="font-semibold text-white pt-2">YOUR GOALS:</p>
            <ol className="list-decimal list-inside space-y-2 marker:text-violet-400/90 text-gray-300">
              <li>Acknowledge the scope ambiguity without assigning blame</li>
              <li>Frame the problem as &apos;our shared problem&apos; not &apos;your team&apos;s problem&apos;</li>
              <li>Propose a specific, small joint resolution</li>
              <li>Get explicit agreement on who does what, by when</li>
              <li>Preserve the working relationship for future projects</li>
            </ol>
            <p className="font-semibold text-white pt-2">OPENING LINE:</p>
            <p className="text-cyan-100/90 border-l-2 border-cyan-500/40 pl-4 italic">
              &quot;Khun Nat, thanks for 15 minutes. I want to talk about the gap in the project — I&apos;m not here to
              debate whose scope it is. I think we both agree the gap exists and affects both our teams. I want to
              propose something specific about how we close it together...&quot;
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold text-violet-300/90">─── ฉบับภาษาไทย / THAI VERSION ───</p>
            <p className="text-xs font-bold uppercase tracking-wider text-cyan-400/90">🇹🇭 ภาษาไทย</p>
            <p className="font-semibold text-white">คุณคือใคร:</p>
            <p className="border-l-2 border-cyan-500/35 pl-4 text-gray-300">
              คุณเป็น Team Lead ที่รับผิดชอบโครงการระบบร่วม ซึ่งตอนนี้ติดขัดมา 6 สัปดาห์ เพราะมีงานบางส่วนที่ไม่ชัดว่าเป็นของทีมคุณหรือทีม IT ของคุณนัท
              คุณไม่มีอำนาจสั่งคุณนัท และไม่อยากยกระดับเรื่องนี้ไปถึงผู้บริหารก่อนลองคุยกันตรงๆ วันนี้คุณตั้งใจจะไม่เถียงเรื่องขอบเขตงานเดิม
              แต่จะเสนอว่าเรื่องนี้เป็นปัญหาร่วม และต้องการข้อตกลงที่ชัดเจนว่าใครทำอะไร ภายในเมื่อไหร่
            </p>
            <p className="font-semibold text-white pt-2">เป้าหมายของคุณ:</p>
            <ol className="list-decimal list-inside space-y-2 marker:text-violet-400/90 text-gray-300">
              <li>ยอมรับความคลุมเครือของขอบเขตโดยไม่กล่าวโทษ</li>
              <li>นำเสนอปัญหาว่าเป็น &apos;ปัญหาร่วมของเรา&apos; ไม่ใช่ &apos;ปัญหาของทีมคุณ&apos;</li>
              <li>เสนอวิธีแก้ปัญหาร่วมที่เจาะจงและเล็ก</li>
              <li>ได้รับข้อตกลงชัดเจนว่าใครทำอะไร ภายในเมื่อไหร่</li>
              <li>รักษาความสัมพันธ์ในการทำงานสำหรับโครงการในอนาคต</li>
            </ol>
          </div>
        </section>
      )}

      {role === 'role_b' && (
        <section className="space-y-6 border-t border-white/10 pt-8">
          <h3 className="text-base font-bold text-white">
            ROLE B — KHUN NAT (IT Team Lead)
            <span className="block text-sm font-normal text-violet-200/90 mt-1">บทบาท B — คุณนัท (หัวหน้าทีม IT)</span>
          </h3>

          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-cyan-400/90">🇬🇧 ENGLISH</p>
            <p className="font-semibold text-white">WHO YOU ARE:</p>
            <p className="text-gray-300">
              You are Khun Nat — IT Infrastructure Team Lead, 7 years with the company. Your team delivered exactly what
              was agreed in the original scope document. The gap that exists was never formally assigned to anyone. You
              understand it&apos;s causing problems. You are not indifferent to that. But your team is already
              understaffed and running two other critical projects simultaneously. Taking on unscoped work without
              resourcing is not something you can do unilaterally — your own manager would push back. When the other team
              lead comes to talk to you, you are not hostile. But you have a position and you intend to hold it — at
              least until you hear something specific enough to evaluate. If they come with blame or vague requests,
              you&apos;ll stay firm. If they come with an actual proposal — specific tasks, clear owner, realistic
              timeline — you&apos;re willing to negotiate. You just need to be able to go back to your own manager with
              something that makes sense.
            </p>
            <p className="font-semibold text-white pt-2">YOUR MINDSET:</p>
            <ul className="space-y-2 list-none text-gray-300">
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">•</span>
                <span>Open with &apos;Our scope ends at the API&apos; — firm but not aggressive</span>
              </li>
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">•</span>
                <span>If the other party blames your team or pulls rank, become defensive</span>
              </li>
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">•</span>
                <span>If they acknowledge the scope ambiguity fairly, soften</span>
              </li>
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">•</span>
                <span>
                  Be willing to negotiate a partial ownership arrangement if the proposal is reasonable
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">•</span>
                <span>Ask: &apos;What specifically are you asking my team to do, and in what timeframe?&apos;</span>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold text-violet-300/90">─── ฉบับภาษาไทย / THAI VERSION ───</p>
            <p className="text-xs font-bold uppercase tracking-wider text-cyan-400/90">🇹🇭 ภาษาไทย</p>
            <p className="font-semibold text-white">คุณคือใคร:</p>
            <p className="border-l-2 border-cyan-500/35 pl-4 text-gray-300">
              คุณคือคุณนัท หัวหน้าทีม IT Infrastructure ทำงานกับบริษัทมา 7 ปี ทีมของคุณส่งมอบงานตามขอบเขตเดิมครบแล้ว ช่องว่างที่เกิดขึ้นมีอยู่จริง
              แต่ไม่เคยถูกกำหนดชัดว่าเป็นความรับผิดชอบของใคร คุณไม่ได้เพิกเฉยต่อปัญหา แต่ทีมของคุณกำลังขาดคน และยังมีอีก 2 โครงการสำคัญที่ต้องทำพร้อมกัน
              คุณไม่สามารถรับงานที่อยู่นอก scope เพิ่มได้เองโดยไม่มีเหตุผลหรือทรัพยากรรองรับ ถ้าอีกฝ่ายมาพร้อมการกล่าวโทษหรือคำขอกว้างๆ คุณจะยืนยันจุดยืนเดิม
              แต่ถ้าเขามาพร้อมข้อเสนอที่ชัดเจน งานชัด คนรับผิดชอบชัด และ timeline สมจริง คุณพร้อมเจรจา
            </p>
            <p className="font-semibold text-white pt-2">แนวคิดของคุณ:</p>
            <ul className="space-y-2 list-none text-gray-300">
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">•</span>
                <span>เริ่มด้วย &apos;ขอบเขตของเราจบที่ API&apos; — มั่นคงแต่ไม่ก้าวร้าว</span>
              </li>
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">•</span>
                <span>ถ้าอีกฝ่ายกล่าวโทษทีมคุณหรือใช้แรงกดดัน ให้ป้องกันตัวเอง</span>
              </li>
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">•</span>
                <span>ถ้าอีกฝ่ายยอมรับว่าขอบเขตงานคลุมเครือจริง และพูดอย่างยุติธรรม ให้ผ่อนคลายลง</span>
              </li>
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">•</span>
                <span>เต็มใจเจรจาข้อตกลงความเป็นเจ้าของบางส่วนถ้าข้อเสนอสมเหตุสมผล</span>
              </li>
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">•</span>
                <span>ถามว่า &apos;คุณต้องการให้ทีมผมทำอะไรอย่างเจาะจง และต้องการภายในเมื่อไหร่?&apos;</span>
              </li>
            </ul>
          </div>
        </section>
      )}
    </article>
  );
}
