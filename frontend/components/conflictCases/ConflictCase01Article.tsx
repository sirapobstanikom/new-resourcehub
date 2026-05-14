import React from 'react';

export type ConflictCase01Role = 'role_a' | 'role_b' | null;

const practiceEn = [
  'Separating the performance issue from the personal situation — both are real',
  'Opening the conversation without assumption or judgment',
  'Creating a Performance Improvement Plan that is supportive, not punitive',
  "Agreeing on what 'support' actually looks like vs. lowering the standard",
] as const;

const practiceTh = [
  'แยกเรื่องผลงานออกจากเรื่องส่วนตัวอย่างชัดเจน เพราะทั้งสองเรื่องเกิดขึ้นจริง',
  'เริ่มคุยโดยไม่ด่วนสรุปและไม่ตัดสินล่วงหน้า',
  'สร้างแผนพัฒนาผลงานที่ช่วยสนับสนุน ไม่ใช่ทำให้รู้สึกถูกลงโทษ',
  "ตกลงให้ชัดว่า 'การช่วยเหลือ' คืออะไร และต่างจากการลดมาตรฐานอย่างไร",
] as const;

const avoidEn = [
  'Avoiding the conversation entirely out of sympathy',
  'Leading with the performance data before understanding her perspective',
  "Promising outcomes you can't control ('nothing will happen to your job')",
  'Treating it purely as a process/compliance issue',
] as const;

const avoidTh = [
  'เลี่ยงไม่คุยเพราะรู้สึกสงสารหรือเห็นใจ',
  'เริ่มด้วยตัวเลขผลงานทันที ก่อนฟังมุมมองของเธอ',
  'รับปากในสิ่งที่คุณควบคุมไม่ได้ เช่น บอกว่าจะไม่มีผลต่อหน้าที่การงานแน่นอน',
  'มองเรื่องนี้เป็นแค่เรื่องกระบวนการหรือการทำตามกฎเท่านั้น',
] as const;

type Props = {
  role: ConflictCase01Role;
};

export function ConflictCase01Article({ role }: Props) {
  return (
    <article className="rounded-2xl border border-violet-500/30 bg-violet-950/15 p-4 sm:p-6 md:p-8 space-y-8 text-left text-sm text-gray-200 leading-relaxed">
      <header className="space-y-3 border-b border-white/10 pb-6">
        <p className="text-xs font-bold uppercase tracking-wider text-violet-300/95">
          CASE 01 · MANAGING UNDERPERFORMANCE WITH COMPASSION
        </p>
        <h2 className="text-lg sm:text-xl font-bold text-white leading-snug">
          การคุยกับพนักงานที่ผลงานตกลงด้วยความเข้าใจ
        </h2>
        <p className="text-xs sm:text-sm text-violet-200/80">
          Skills: Accountability · Feedback · Emotional Intelligence &nbsp;|&nbsp; ความรับผิดชอบ · การให้ข้อเสนอแนะ ·
          ความฉลาดทางอารมณ์ &nbsp;|&nbsp; Time: 20 minutes
        </p>
      </header>

      <section className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400/90">
          📋 THE SITUATION / สถานการณ์
        </h3>
        <p className="text-gray-300">
          Khun Mint has been with your team for 4 years and was always a reliable performer. Over the past 3 months,
          her work quality has dropped noticeably — she misses deadlines, makes data errors she never made before, and
          seems distracted in meetings. You&apos;ve heard through the team that she&apos;s going through serious family
          difficulties. She has not brought this up with you directly. You need to have a performance conversation
          because her team members are starting to pick up her missed work and morale is at risk.
        </p>
        <p className="text-xs font-semibold text-violet-300/90">─── ฉบับภาษาไทย / THAI VERSION ───</p>
        <p className="border-l-2 border-violet-500/40 pl-4 text-gray-300">
          คุณมินต์อยู่ในทีมมา 4 ปี และที่ผ่านมาเป็นคนที่ทำงานได้ดีและไว้ใจได้เสมอ แต่ในช่วง 3 เดือนที่ผ่านมา
          คุณภาพงานของเธอลดลงอย่างเห็นได้ชัด ทั้งส่งงานไม่ทัน มีข้อผิดพลาดด้านข้อมูล และดูไม่มีสมาธิในการประชุม
          คุณได้ยินจากทีมว่าเธอกำลังเจอปัญหาครอบครัวค่อนข้างหนัก แต่เธอยังไม่ได้พูดเรื่องนี้กับคุณโดยตรง
          ตอนนี้คุณจำเป็นต้องคุยเรื่องผลงานกับเธอ เพราะเพื่อนร่วมทีมเริ่มต้องรับงานที่เธอทำไม่ทันไปช่วย
          และขวัญกำลังใจของทีมเริ่มได้รับผลกระทบ
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400/90">
          🎯 YOUR CHALLENGE / ความท้าทายของคุณ
        </h3>
        <p className="text-gray-300">
          How do you hold Khun Mint accountable for her performance without damaging the relationship or making her
          feel punished for a personal struggle?
        </p>
        <p className="border-l-2 border-amber-500/35 pl-4 text-gray-300">
          คุณจะคุยกับคุณมินต์เรื่องความรับผิดชอบต่อผลงานอย่างไร โดยยังรักษาความสัมพันธ์
          และไม่ทำให้เธอรู้สึกว่าถูกลงโทษจากปัญหาส่วนตัว?
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
              You are Khun Mint&apos;s direct manager — 6 years with the company, managing a team of 5. Khun Mint has
              been one of your most consistent performers for 4 years. But for the past 3 months, something has
              clearly changed. Missed deadlines. Data errors she never made before. A distracted look in meetings when
              she used to be engaged. You heard through a colleague that she&apos;s going through serious family
              difficulties — possibly financial. She has not brought this up with you. You have been waiting for her to
              say something. She hasn&apos;t. Meanwhile, her teammates are absorbing her missed work. Two have quietly
              complained. You cannot ignore the performance impact any longer — but you also don&apos;t want to punish
              someone for struggling. You are walking into this meeting genuinely uncertain how to start. You have
              decided that you will not lead with the data. You will ask how she is doing — and actually wait for the
              answer.
            </p>
            <p className="font-semibold text-white pt-2">YOUR GOALS:</p>
            <ol className="list-decimal list-inside space-y-2 marker:text-violet-400/90 text-gray-300">
              <li>Open the conversation with genuine care, not accusation</li>
              <li>Get her perspective before presenting the performance data</li>
              <li>
                Be clear that performance issues must be addressed — compassion doesn&apos;t mean lowering the bar
              </li>
              <li>Co-create a support plan, not just hand down a PIP</li>
              <li>End with a specific follow-up date and agreement</li>
            </ol>
            <p className="font-semibold text-white pt-2">OPENING LINE:</p>
            <p className="text-cyan-100/90 border-l-2 border-cyan-500/40 pl-4 italic">
              &quot;Khun Mint, thanks for making time. I wanted to connect just the two of us. I really value what you
              bring to this team — your history here matters to me. And because of that, I want to talk honestly about
              something I&apos;ve been noticing in the last few months...&quot;
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold text-violet-300/90">─── ฉบับภาษาไทย / THAI VERSION ───</p>
            <p className="text-xs font-bold uppercase tracking-wider text-cyan-400/90">🇹🇭 ภาษาไทย</p>
            <p className="font-semibold text-white">คุณคือใคร:</p>
            <p className="border-l-2 border-cyan-500/35 pl-4 text-gray-300">
              คุณเป็นผู้จัดการโดยตรงของคุณมินต์ ทำงานกับบริษัทมา 6 ปี และดูแลทีม 5 คน ตลอด 4 ปีที่ผ่านมา
              คุณมินต์เป็นหนึ่งในคนที่ทำงานสม่ำเสมอที่สุด แต่ช่วง 3 เดือนที่ผ่านมา มีหลายอย่างเปลี่ยนไปอย่างชัดเจน
              เธอส่งงานไม่ทัน มีข้อผิดพลาดที่ไม่เคยเกิดขึ้น และดูไม่มีสมาธิในการประชุม คุณได้ยินจากเพื่อนร่วมงานว่าเธอกำลังเจอปัญหาครอบครัว
              แต่เธอยังไม่ได้บอกคุณเอง คุณรอให้เธอเป็นฝ่ายพูด แต่ก็ยังไม่มีอะไรเกิดขึ้น ขณะเดียวกัน เพื่อนร่วมทีมเริ่มต้องรับงานแทน
              และมีสองคนแอบมาบ่นกับคุณแล้ว วันนี้คุณตั้งใจว่าจะเริ่มจากการถามว่าเธอเป็นอย่างไรบ้าง และรอฟังคำตอบจริงๆ
              ไม่ใช่เริ่มด้วยตัวเลขผลงานทันที
            </p>
            <p className="font-semibold text-white pt-2">เป้าหมายของคุณ:</p>
            <ol className="list-decimal list-inside space-y-2 marker:text-violet-400/90 text-gray-300">
              <li>เริ่มการสนทนาด้วยความห่วงใยจริงใจ ไม่ใช่การกล่าวหา</li>
              <li>รับฟังมุมมองของเธอก่อนนำเสนอข้อมูลผลงาน</li>
              <li>ชัดเจนว่าปัญหาผลงานต้องได้รับการแก้ไข ความเห็นใจไม่ได้หมายถึงการลดมาตรฐาน</li>
              <li>สร้างแผนสนับสนุนร่วมกัน ไม่ใช่แค่มอบ PIP</li>
              <li>จบด้วยวันติดตามและข้อตกลงที่ชัดเจน</li>
            </ol>
          </div>
        </section>
      )}

      {role === 'role_b' && (
        <section className="space-y-6 border-t border-white/10 pt-8">
          <h3 className="text-base font-bold text-white">
            ROLE B — EMPLOYEE (Khun Mint)
            <span className="block text-sm font-normal text-violet-200/90 mt-1">บทบาท B — พนักงาน (คุณมินต์)</span>
          </h3>

          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-cyan-400/90">🇬🇧 ENGLISH</p>
            <p className="font-semibold text-white">WHO YOU ARE:</p>
            <p className="text-gray-300">
              You are Khun Mint — 34 years old, on this team for 4 years. Three months ago your husband lost his job.
              Since then, you have been the sole income for your household including two children. The financial
              pressure is constant. You go home after work and deal with paperwork, calls, and stress that leaves you
              with almost nothing left for the next morning. You have not told anyone at work. You are embarrassed. You
              also fear that if your manager knows, she will see you differently — as unreliable, as a liability, as
              someone on the way out. You know your work has suffered. You feel ashamed about it. You come into this
              meeting braced for a warning, maybe something formal. You have your professional face on. If your manager
              opens with data and performance metrics, you will answer politely but stay closed — you will not share
              anything personal. If your manager creates genuine space by asking how you are doing, you may — just may
              — say something true.
            </p>
            <p className="font-semibold text-white pt-2">YOUR MINDSET:</p>
            <ul className="space-y-2 list-none text-gray-300">
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">•</span>
                <span>Begin the meeting guarded. Don&apos;t volunteer personal information immediately.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">•</span>
                <span>If the manager creates genuine psychological safety, gradually open up</span>
              </li>
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">•</span>
                <span>If the manager goes straight to &apos;fix it,&apos; stay defensive</span>
              </li>
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">•</span>
                <span>If you feel judged, shut down completely</span>
              </li>
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">•</span>
                <span>If you feel heard, you might share that you&apos;ve been going through something difficult</span>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold text-violet-300/90">─── ฉบับภาษาไทย / THAI VERSION ───</p>
            <p className="text-xs font-bold uppercase tracking-wider text-cyan-400/90">🇹🇭 ภาษาไทย</p>
            <p className="font-semibold text-white">คุณคือใคร:</p>
            <p className="border-l-2 border-cyan-500/35 pl-4 text-gray-300">
              คุณคือคุณมินต์ อายุ 34 ปี อยู่ในทีมนี้มา 4 ปี สามีของคุณตกงานเมื่อ 3 เดือนก่อน ตั้งแต่นั้นมา
              คุณกลายเป็นรายได้หลักคนเดียวของครอบครัวที่มีลูก 2 คน ความกดดันเรื่องเงินเกิดขึ้นทุกวัน
              หลังเลิกงานคุณยังต้องกลับไปจัดการเอกสาร โทรศัพท์ และปัญหาต่างๆ ที่บ้าน จนแทบไม่เหลือแรงสำหรับวันรุ่งขึ้น
              คุณไม่ได้บอกใครในที่ทำงาน เพราะรู้สึกอาย และกลัวว่าถ้าผู้จัดการรู้ เขาจะมองคุณเป็นคนไม่น่าไว้ใจหรือเป็นภาระ
              คุณรู้ว่างานของตัวเองแย่ลง และรู้สึกละอายใจกับเรื่องนี้ คุณเข้าประชุมครั้งนี้ด้วยความระวังตัว
              ถ้าผู้จัดการเริ่มด้วยตัวเลขผลงาน คุณจะตอบอย่างสุภาพแต่ไม่เปิดใจ แต่ถ้าเขาถามจริงๆ ว่าคุณเป็นอย่างไร และรอฟังจริงๆ
              คุณอาจค่อยๆ เล่าความจริงออกมา
            </p>
            <p className="font-semibold text-white pt-2">แนวคิดของคุณ:</p>
            <ul className="space-y-2 list-none text-gray-300">
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">•</span>
                <span>เริ่มการประชุมแบบระวังตัว และยังไม่เล่าเรื่องส่วนตัวทันที</span>
              </li>
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">•</span>
                <span>ถ้าผู้จัดการสร้างความปลอดภัยทางจิตวิทยาจริงๆ ค่อยๆ เปิดใจ</span>
              </li>
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">•</span>
                <span>ถ้าผู้จัดการรีบพูดว่า &apos;ต้องแก้ไขทันที&apos; โดยไม่ฟังมุมมองของคุณ ให้ป้องกันตัวไว้ก่อน</span>
              </li>
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">•</span>
                <span>ถ้ารู้สึกว่าถูกตัดสิน ให้ปิดตัวและตอบเท่าที่จำเป็น</span>
              </li>
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">•</span>
                <span>ถ้ารู้สึกว่าถูกรับฟังจริงๆ อาจเล่าว่ากำลังผ่านช่วงเวลาที่ยากลำบาก</span>
              </li>
            </ul>
          </div>
        </section>
      )}
    </article>
  );
}
