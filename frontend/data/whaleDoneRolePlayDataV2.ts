/** Whale Done Role Play — Version 2 content */

export const V2_SECTION1 = {
  title: 'SECTION 1  ·  REDIRECTION ROLE PLAYS  ·  บทบาทสมมติ: การเปลี่ยนทิศทาง',
  blurbEn:
    'When something goes wrong: redirect immediately, privately, constructively — and close on a positive.',
  blurbTh: 'เมื่อมีอะไรผิดพลาด: เปลี่ยนทิศทางทันที เป็นส่วนตัว สร้างสรรค์ และปิดเชิงบวก',
} as const;

export const R1_V2_SITUATION = {
  situationEn:
    'Operations/Maintenance, Bangpa-in Cogeneration. During a scheduled maintenance shift, Khun Arm (junior engineer, 8 months) skipped the lockout-tagout isolation procedure and proceeded directly to the repair. No incident occurred — but this is a non-negotiable safety requirement.',
  situationTh:
    'ฝ่ายปฏิบัติการ/ซ่อมบำรุง, บางปะอินโคเจนเนอเรชั่น ระหว่างกะซ่อมบำรุงตามกำหนด คุณอาร์ม (วิศวกรระดับล่าง, 8 เดือน) ข้ามขั้นตอน lockout-tagout และดำเนินการซ่อมทันที ไม่มีเหตุการณ์เกิดขึ้น แต่นี่คือข้อกำหนดความปลอดภัยที่ไม่อาจประนีประนอมได้',
} as const;

export const MANAGER_R1_V2 = {
  ...R1_V2_SITUATION,
  headline: 'R1  ·  SAFETY SHORTCUT  —  ข้ามขั้นตอนความปลอดภัย',
  subhead: 'REDIRECTION — MANAGER ROLE  ·  การเปลี่ยนทิศทาง — บทบาทผู้จัดการ',
  cardTitleEn: 'R1  ·  MANAGER ROLE CARD — REDIRECTION',
  cardTitleTh: 'R1  ·  บัตรบทบาทผู้จัดการ — การเปลี่ยนทิศทาง',
  whoYouAreEn:
    'You are the Section Leader, Maintenance — 14 years in power generation, 3 years in this role. Khun Arm is a junior engineer, 8 months on your team. You found out 20 minutes ago from a colleague who saw the lockout-tagout bypass happen. Arm didn\'t report it himself. You took 5 minutes to calm down before walking over, because your first reaction was anger. In power generation, lockout-tagout is non-negotiable. The procedure exists because people have died without it. Arm doesn\'t have that reference point yet. Your goal is not to humiliate him — and not to bury it. It is to redirect him: immediately, privately, specifically. He needs to understand exactly what he did, exactly why it matters, and exactly what happens differently from now on. This conversation should take 10 minutes. It should be calm. It should end with complete clarity and a specific commitment.',
  whoYouAreTh:
    'คุณคือหัวหน้าส่วนงานซ่อมบำรุง คุณเพิ่งรู้ว่าคุณอาร์มข้ามขั้นตอน lockout-tagout การตอบสนองที่ถูกต้องคือการเปลี่ยนทิศทางทันที ไม่ใช่เพิกเฉย (\'ไม่มีอะไรเกิดขึ้น\') หรือตอบสนองมากเกินไป (\'ไล่ออก\') Whale Done Redirection หมายถึง ยืนยันสิ่งที่สังเกตเห็น อธิบายผลกระทบ เปลี่ยนทิศทางอย่างชัดเจน และทำอย่างเป็นส่วนตัว',
  stepsTitleEn: 'THE WHALE DONE STEPS',
  stepsTitleTh: 'ขั้นตอน Whale Done',
  stepsEn: [
    {
      label: 'DESCRIBE',
      body: "'Arm, I need to talk with you about the maintenance procedure this morning. I noticed you went straight to the repair without completing the lockout-tagout isolation step.'",
    },
    {
      label: 'IMPACT',
      body: "'In power generation, skipping that step — even once, even when nothing goes wrong — creates a precedent that puts you and your team at risk. Documented safety incidents can end careers.'",
    },
    {
      label: 'TAKE RESPONSIBILITY',
      body: "'I should also ask myself — have I made it clear enough why this protocol exists? Not just that it's a rule, but what it actually protects against. If I haven't made that real for you, that's on me.'",
    },
    {
      label: 'REDIRECT',
      body: "'Going forward: the isolation procedure is completed before any repair begins. Every time. This is not a preference — it's non-negotiable.'",
    },
    {
      label: 'CLOSE POSITIVELY',
      body: "'I know you're capable and I want to see you advance here. That's why I'm telling you directly — not writing it up.'",
    },
  ],
  stepsTh: [
    {
      label: 'อธิบาย',
      body: "'คุณอาร์ม อยากคุยเรื่องขั้นตอนซ่อมบำรุงเมื่อเช้า สังเกตว่าคุณไปซ่อมทันทีโดยไม่ทำขั้นตอน lockout-tagout ก่อน'",
    },
    {
      label: 'ผลกระทบ',
      body: "'ในการผลิตไฟฟ้า การข้ามขั้นตอนนั้น แม้แต่ครั้งเดียว แม้ไม่มีอะไรผิดพลาด สร้างบรรทัดฐานที่เสี่ยงต่อคุณและทีม เหตุการณ์ความปลอดภัยที่บันทึกไว้อาจทำลายอาชีพได้'",
    },
    {
      label: 'รับผิดชอบ',
      body: "'ฉันต้องถามตัวเองด้วยว่า — ฉันทำให้ชัดเจนพอไหมว่าทำไมขั้นตอนนี้ถึงมีอยู่ ไม่ใช่แค่ว่ามันคือกฎ แต่มันปกป้องอะไรกันแน่ ถ้าฉันไม่ได้ทำให้ชัดสำหรับคุณ นั่นเป็นความรับผิดชอบของฉัน'",
    },
    {
      label: 'เปลี่ยนทิศทาง',
      body: "'ต่อจากนี้: ขั้นตอน isolation ต้องทำเสร็จก่อนเริ่มซ่อมทุกครั้ง ทุกครั้ง นี่ไม่ใช่ความชอบส่วนตัว แต่เป็นสิ่งที่ไม่อาจประนีประนอม'",
    },
    {
      label: 'ปิดเชิงบวก',
      body: "'ฉันรู้ว่าคุณมีความสามารถและอยากเห็นคุณก้าวหน้าที่นี่ นั่นคือเหตุผลที่บอกตรงๆ ไม่ใช่เขียนรายงาน'",
    },
  ],
  avoidTitleEn: 'DO NOT',
  avoidTitleTh: 'สิ่งที่ต้องหลีกเลี่ยง',
  avoidEn: [
    "Say 'luckily nothing happened' — this minimizes the violation",
    'Publicly correct him in front of the team — redirection is always private',
    "Skip the 'close positively' — end on the redirect, not pure criticism",
  ],
  avoidTh: [
    "พูดว่า 'โชคดีที่ไม่มีอะไรเกิดขึ้น' — นี่คือการลดความสำคัญของการละเมิด",
    'แก้ไขต่อหน้าทีมทุกคน — การเปลี่ยนทิศทางทำเป็นส่วนตัวเสมอ',
    "ข้ามการ 'ปิดเชิงบวก' — ไม่จบแค่การวิจารณ์",
  ],
} as const;

export const EMPLOYEE_R1_V2 = {
  ...R1_V2_SITUATION,
  headline: 'R1  ·  SAFETY SHORTCUT  —  ข้ามขั้นตอนความปลอดภัย',
  subhead: 'REDIRECTION — EMPLOYEE ROLE  ·  การเปลี่ยนทิศทาง — บทบาทพนักงาน',
  cardTitleEn: 'R1  ·  EMPLOYEE ROLE CARD',
  cardTitleTh: 'R1  ·  บัตรบทบาทพนักงาน',
  whoYouAreEn:
    'You are Khun Arm — 25 years old, Junior Engineer, 8 months in Maintenance. You are not reckless. You genuinely study equipment and take the work seriously. This morning you skipped lockout-tagout on a small task because you have watched senior engineers do the same thing dozens of times without incident. In your mind, it was a judgment call on a low-risk task. You did not think to report it because nothing went wrong. Now your manager wants to see you, and you have a feeling you know why. You are not fully sure what you did wrong — or rather, you know the rule you technically broke, but you don\'t understand why it\'s treated as serious when nothing happened and senior staff do it too. If your manager explains this in terms of rules and consequences, you\'ll accept it externally but feel the double standard is unfair. If your manager explains it differently — the real reason it exists, what it protects against — you will actually reconsider.',
  whoYouAreTh:
    'คุณคือคุณอาร์ม, Junior Engineer, 8 เดือน คุณข้ามขั้นตอน lockout-tagout เพราะเคยเห็นวิศวกรอาวุโสทำแบบนั้นมาก่อนและไม่มีอะไรเกิดขึ้น คุณไม่คิดว่ามันสำคัญ',
  feelingsTitleEn: 'HOW YOU FEEL',
  feelingsTitleTh: 'คุณรู้สึกอย่างไร',
  feelingsEn:
    "Surprised and slightly defensive. You've seen others do the same. If the manager is calm and explains the real risk (not just 'rules are rules'), you'll take it seriously.",
  feelingsTh:
    "ประหลาดใจและค่อนข้างป้องกันตัว คุณเคยเห็นคนอื่นทำแบบเดียวกัน ถ้าหัวหน้าสงบและอธิบายความเสี่ยงที่แท้จริง (ไม่ใช่แค่ 'กฎคือกฎ') คุณจะรับฟังอย่างจริงจัง",
  howToPlayTitleEn: 'HOW TO PLAY THIS ROLE',
  howToPlayTitleTh: 'วิธีรับบทบาทนี้',
  howToPlayEn: [
    {
      lead: 'If manager addresses you privately and calmly',
      line: 'listen and acknowledge',
    },
    {
      lead: 'If manager explains it in terms of your career risk',
      line: 'take it seriously',
    },
    {
      lead: 'If manager lectures in front of others',
      line: 'get defensive',
    },
    {
      lead: 'Commit clearly if the conversation is done correctly',
      line: "'Understood. I'll complete the isolation step every time.'",
    },
  ],
  howToPlayTh: [
    {
      lead: 'ถ้าหัวหน้าพูดกับคุณอย่างเป็นส่วนตัวและสงบ',
      line: 'ฟังและยอมรับ',
    },
    {
      lead: 'ถ้าหัวหน้าอธิบายในแง่ความเสี่ยงต่ออาชีพของคุณ',
      line: 'รับฟังอย่างจริงจัง',
    },
    {
      lead: 'ถ้าหัวหน้าบรรยายต่อหน้าคนอื่น',
      line: 'ป้องกันตัว',
    },
    {
      lead: 'ยืนยันอย่างชัดเจนถ้าบทสนทนาทำได้ถูกต้อง',
      line: "'เข้าใจแล้ว จะทำขั้นตอน isolation ทุกครั้ง'",
    },
  ],
} as const;

export function whaleDoneV2HasDetail(
  _role: 'manager' | 'employee',
  scenario: string
): boolean {
  return (
    scenario === 'r1' ||
    scenario === 'r2' ||
    scenario === 'r3' ||
    scenario === 'r4' ||
    scenario === 'w1' ||
    scenario === 'w2' ||
    scenario === 'w3' ||
    scenario === 'w4'
  );
}

export const R2_V2_SITUATION = {
  situationEn:
    "Admin Department, CK Power. Khun Bua (Admin Coordinator, 1 year) replied to an external vendor email, agreeing to a payment timeline and service scope that hadn't been approved by her manager. The vendor now believes this is confirmed.",
  situationTh:
    'ฝ่ายธุรการ, CK Power คุณบัว (ผู้ประสานงานธุรการ, 1 ปี) ตอบอีเมล vendor ภายนอก ยอมรับ timeline การชำระเงินและขอบเขตบริการที่ยังไม่ได้รับอนุมัติจากผู้จัดการ ตอนนี้ vendor เชื่อว่าได้รับการยืนยันแล้ว',
} as const;

export const MANAGER_R2_V2 = {
  ...R2_V2_SITUATION,
  headline: 'R2  ·  COMMITMENT WITHOUT APPROVAL  —  การให้คำมั่นโดยไม่ได้รับอนุมัติ',
  subhead: 'REDIRECTION — MANAGER ROLE  ·  การเปลี่ยนทิศทาง — บทบาทผู้จัดการ',
  cardTitleEn: 'R2  ·  MANAGER ROLE CARD — REDIRECTION',
  cardTitleTh: 'R2  ·  บัตรบทบาทผู้จัดการ — การเปลี่ยนทิศทาง',
  whoYouAreEn:
    'You are the Admin Department Manager. Bua sent the email with good intentions — she was trying to be responsive. But she created a commitment without authority. You now have to manage the vendor expectation AND redirect Bua without crushing her initiative.',
  whoYouAreTh:
    'คุณคือผู้จัดการฝ่ายธุรการ คุณบัวส่งอีเมลด้วยเจตนาดี เธอพยายามตอบสนองอย่างรวดเร็ว แต่เธอสร้างคำมั่นสัญญาโดยไม่มีอำนาจ ตอนนี้คุณต้องจัดการความคาดหวังของ vendor และเปลี่ยนทิศทางบัวโดยไม่ทำลายความริเริ่มของเธอ',
  stepsTitleEn: 'THE WHALE DONE STEPS',
  stepsTitleTh: 'ขั้นตอน Whale Done',
  stepsEn: [
    {
      label: 'DESCRIBE',
      body: "'Bua, I saw the email you sent to the vendor this morning. I want to talk about it.'",
    },
    {
      label: 'IMPACT',
      body: "'The vendor is now operating on the assumption that the payment timeline and scope are confirmed. That's a commitment we haven't approved. It puts us in a difficult position to walk back.'",
    },
    {
      label: 'TAKE RESPONSIBILITY',
      body: "'I also realize I haven't made it completely clear which decisions you're authorized to confirm with vendors on your own. That's on me — you shouldn't have to guess where the line is.'",
    },
    {
      label: 'REDIRECT',
      body: "'For any external commitment on payment, scope, or timeline — please run it by me first, even if it's a quick message. I want you to be responsive, but with my sign-off on the terms.'",
    },
    {
      label: 'CLOSE POSITIVELY',
      body: "'I can see you were trying to be helpful and responsive — that's exactly the initiative I want from you. Let's just channel it with the right checkpoint.'",
    },
  ],
  stepsTh: [
    {
      label: 'อธิบาย',
      body: "'คุณบัว ฉันเห็นอีเมลที่คุณส่งให้ vendor เมื่อเช้า อยากคุยเรื่องนี้'",
    },
    {
      label: 'ผลกระทบ',
      body: "'ตอนนี้ vendor กำลังดำเนินการโดยคิดว่า timeline การชำระเงินและขอบเขตได้รับการยืนยันแล้ว นั่นคือคำมั่นสัญญาที่เรายังไม่ได้อนุมัติ ทำให้เราอยู่ในตำแหน่งที่ยากในการถอนคืน'",
    },
    {
      label: 'รับผิดชอบ',
      body: "'ฉันยังตระหนักว่าฉันไม่ได้ระบุให้ชัดเจนว่าคุณได้รับอนุญาตให้ยืนยันอะไรกับ vendor ได้เองบ้าง นั่นเป็นความผิดของฉัน คุณไม่ควรต้องเดาว่าขอบเขตอยู่ที่ไหน'",
    },
    {
      label: 'เปลี่ยนทิศทาง',
      body: "'สำหรับคำมั่นสัญญาภายนอกใดๆ เกี่ยวกับการชำระเงิน ขอบเขต หรือ timeline โปรดแจ้งให้ฉันทราบก่อน แม้แต่ข้อความสั้นๆ ฉันต้องการให้คุณตอบสนองได้ดี แต่ต้องได้รับการอนุมัติจากฉันก่อน'",
    },
    {
      label: 'ปิดเชิงบวก',
      body: "'ฉันเห็นว่าคุณพยายามช่วยเหลือและตอบสนองอย่างรวดเร็ว นั่นแหละคือความริเริ่มที่ฉันต้องการจากคุณ แค่ต้องมีจุด checkpoint ที่ถูกต้อง'",
    },
  ],
  avoidTitleEn: 'DO NOT',
  avoidTitleTh: 'สิ่งที่ต้องหลีกเลี่ยง',
  avoidEn: [
    "Say 'you should have known better' — focus on the protocol, not the person",
    'Prevent her from communicating externally in the future — that\'s overcorrection',
    'Skip the positive close — she had good intentions',
  ],
  avoidTh: [
    "พูดว่า 'คุณควรรู้อยู่แล้ว' — มุ่งที่ขั้นตอน ไม่ใช่ที่คน",
    'ป้องกันไม่ให้เธอสื่อสารภายนอกในอนาคต นั่นคือการแก้ไขมากเกินไป',
    'ข้ามการปิดเชิงบวก เธอมีเจตนาดี',
  ],
} as const;

export const EMPLOYEE_R2_V2 = {
  ...R2_V2_SITUATION,
  headline: 'R2  ·  COMMITMENT WITHOUT APPROVAL  —  การให้คำมั่นโดยไม่ได้รับอนุมัติ',
  subhead: 'REDIRECTION — EMPLOYEE ROLE  ·  การเปลี่ยนทิศทาง — บทบาทพนักงาน',
  cardTitleEn: 'R2  ·  EMPLOYEE ROLE CARD',
  cardTitleTh: 'R2  ·  บัตรบทบาทพนักงาน',
  whoYouAreEn:
    'You are Khun Bua, Admin Coordinator. You replied to the vendor because they were waiting and you thought you were being helpful. You had no idea you were overstepping.',
  whoYouAreTh:
    'คุณคือคุณบัว, ผู้ประสานงานธุรการ คุณตอบ vendor เพราะพวกเขากำลังรอและคุณคิดว่ากำลังช่วยเหลือ คุณไม่รู้ว่าตัวเองกำลังก้าวเกิน',
  feelingsTitleEn: 'HOW YOU FEEL',
  feelingsTitleTh: 'คุณรู้สึกอย่างไร',
  feelingsEn:
    "Confused and slightly hurt. You were trying to be proactive. If manager is calm and explains the business reason clearly, you'll get it immediately.",
  feelingsTh:
    'สับสนและเจ็บปวดเล็กน้อย คุณพยายามจะรุกก้าวล่วงหน้า ถ้าหัวหน้าสงบและอธิบายเหตุผลทางธุรกิจอย่างชัดเจน คุณจะเข้าใจทันที',
  howToPlayTitleEn: 'HOW TO PLAY THIS ROLE',
  howToPlayTitleTh: 'วิธีรับบทบาทนี้',
  howToPlayEn: [
    {
      lead: 'Open with genuine confusion',
      line: "'I was trying to help — the vendor had been waiting for days'",
    },
    {
      lead: 'If manager explains the business risk clearly',
      line: "'Ah, I didn't realize that created a formal commitment. I understand now.'",
    },
    {
      lead: 'If manager is harsh or critical, get defensive',
      line: "'I was just trying to be helpful'",
    },
    {
      lead: 'Commit if handled well',
      line: "'I'll check with you before sending anything with numbers or scope.'",
    },
  ],
  howToPlayTh: [
    {
      lead: 'เปิดด้วยความสับสนจริงๆ',
      line: "'ฉันพยายามช่วย vendor รอมาหลายวันแล้ว'",
    },
    {
      lead: 'ถ้าหัวหน้าอธิบายความเสี่ยงทางธุรกิจอย่างชัดเจน',
      line: "'อ้อ ฉันไม่รู้ว่านั่นสร้างคำมั่นสัญญาอย่างเป็นทางการ เข้าใจแล้ว'",
    },
    {
      lead: 'ถ้าหัวหน้าพูดรุนแรงหรือวิจารณ์ ป้องกันตัว',
      line: "'ฉันแค่พยายามช่วยเหลือ'",
    },
    {
      lead: 'ยืนยันถ้าจัดการได้ดี',
      line: "'จะ check กับคุณก่อนส่งอะไรก็ตามที่มีตัวเลขหรือขอบเขต'",
    },
  ],
} as const;

export const R3_V2_SITUATION = {
  situationEn:
    "Accounting Department, CK Power. Khun Tae (Accounting Specialist, 3 years) missed the monthly cost report deadline for the second time this quarter. He didn't communicate — the manager found out when the requesting department asked. No explanation was given.",
  situationTh:
    'ฝ่ายบัญชี, CK Power คุณแท (Accounting Specialist, 3 ปี) พลาดกำหนดส่งรายงานต้นทุนรายเดือนเป็นครั้งที่สองในไตรมาสนี้ เขาไม่ได้แจ้ง ผู้จัดการรู้เมื่อฝ่ายที่ขอมาถามเอง ไม่มีคำอธิบาย',
} as const;

export const MANAGER_R3_V2 = {
  ...R3_V2_SITUATION,
  headline: 'R3  ·  DEADLINE MISS — NO COMMUNICATION  —  พลาดกำหนดโดยไม่แจ้ง',
  subhead: 'REDIRECTION — MANAGER ROLE  ·  การเปลี่ยนทิศทาง — บทบาทผู้จัดการ',
  cardTitleEn: 'R3  ·  MANAGER ROLE CARD — REDIRECTION',
  cardTitleTh: 'R3  ·  บัตรบทบาทผู้จัดการ — การเปลี่ยนทิศทาง',
  whoYouAreEn:
    "You are the Accounting Manager. This is the second miss in one quarter. The issue is not just the deadline — it's the silence. If Tae had communicated early, you could have helped. The redirection is about the communication failure, not just the missed deadline.",
  whoYouAreTh:
    'คุณคือผู้จัดการฝ่ายบัญชี นี่คือครั้งที่สองที่พลาดในหนึ่งไตรมาส ปัญหาไม่ใช่แค่กำหนดส่ง แต่คือความเงียบ ถ้าคุณแท้แจ้งเร็ว คุณสามารถช่วยได้ การเปลี่ยนทิศทางเกี่ยวกับความล้มเหลวในการสื่อสาร ไม่ใช่แค่กำหนดที่พลาด',
  stepsTitleEn: 'THE WHALE DONE STEPS',
  stepsTitleTh: 'ขั้นตอน Whale Done',
  stepsEn: [
    {
      label: 'DESCRIBE',
      body: "'Tae, this is the second time the cost report has missed the deadline this quarter. More importantly — both times I found out from the other department, not from you.'",
    },
    {
      label: 'IMPACT',
      body: "'When I find out that way, I have no time to manage the situation. It affects our department's credibility — not just the report.'",
    },
    {
      label: 'TAKE RESPONSIBILITY',
      body: "'I should have checked in with you earlier in the week when I hadn't heard anything. If I had made it clearer that I'm here to help when there's a problem, you might have reached out sooner — that's on me too.'",
    },
    {
      label: 'REDIRECT',
      body: "'Going forward: if you're going to miss a deadline — for any reason — I need to know at least 24 hours in advance. That's the new standard.'",
    },
    {
      label: 'CLOSE POSITIVELY',
      body: "'You have the skills to do this well. I just need you to communicate early when there's a problem — that's what I need from you.'",
    },
  ],
  stepsTh: [
    {
      label: 'อธิบาย',
      body: "'คุณแท นี่คือครั้งที่สองที่รายงานต้นทุนพลาดกำหนดในไตรมาสนี้ ที่สำคัญกว่า ทั้งสองครั้งฉันรู้จากฝ่ายอื่น ไม่ใช่จากคุณ'",
    },
    {
      label: 'ผลกระทบ',
      body: "'เมื่อฉันรู้ทางนั้น ฉันไม่มีเวลาจัดการสถานการณ์ มันกระทบความน่าเชื่อถือของฝ่ายเรา ไม่ใช่แค่รายงาน'",
    },
    {
      label: 'รับผิดชอบ',
      body: "'ฉันควรจะติดตามคุณก่อนในช่วงต้นสัปดาห์เมื่อยังไม่ได้ข่าว ถ้าฉันทำให้ชัดเจนกว่านี้ว่าฉันพร้อมช่วยเมื่อมีปัญหา คุณอาจจะแจ้งมาเร็วกว่านี้ นั่นก็เป็นส่วนของฉันด้วย'",
    },
    {
      label: 'เปลี่ยนทิศทาง',
      body: "'ต่อจากนี้ ถ้าคุณจะพลาดกำหนด ด้วยเหตุใดก็ตาม ฉันต้องรู้ล่วงหน้าอย่างน้อย 24 ชั่วโมง นั่นคือมาตรฐานใหม่'",
    },
    {
      label: 'ปิดเชิงบวก',
      body: "'คุณมีทักษะที่จะทำงานนี้ได้ดี ฉันแค่ต้องให้คุณสื่อสารเร็วเมื่อมีปัญหา นั่นคือสิ่งที่ฉันต้องการจากคุณ'",
    },
  ],
  avoidTitleEn: 'DO NOT',
  avoidTitleTh: 'สิ่งที่ต้องหลีกเลี่ยง',
  avoidEn: [
    'Focus only on the deadline — the real issue is the communication gap',
    'Threaten formal action in the opening — explore understanding first',
    "Accept 'sorry' without a specific new behavior commitment",
  ],
  avoidTh: [
    'มุ่งแค่ที่กำหนดส่ง ปัญหาที่แท้จริงคือช่องว่างในการสื่อสาร',
    'ขู่การดำเนินการอย่างเป็นทางการตั้งแต่ต้น สำรวจความเข้าใจก่อน',
    "ยอมรับแค่ 'ขอโทษ' โดยไม่มีคำมั่นสัญญาพฤติกรรมใหม่ที่เจาะจง",
  ],
} as const;

export const EMPLOYEE_R3_V2 = {
  ...R3_V2_SITUATION,
  headline: 'R3  ·  DEADLINE MISS — NO COMMUNICATION  —  พลาดกำหนดโดยไม่แจ้ง',
  subhead: 'REDIRECTION — EMPLOYEE ROLE  ·  การเปลี่ยนทิศทาง — บทบาทพนักงาน',
  cardTitleEn: 'R3  ·  EMPLOYEE ROLE CARD',
  cardTitleTh: 'R3  ·  บัตรบทบาทพนักงาน',
  whoYouAreEn:
    "You are Khun Tae, Accounting Specialist. The report was late because you were waiting on input from another team that arrived late. You didn't communicate because you hoped to finish it quickly and didn't want to seem incompetent.",
  whoYouAreTh:
    'คุณคือคุณแท, Accounting Specialist รายงานล่าช้าเพราะคุณรอข้อมูลจากทีมอื่นที่มาช้า คุณไม่ได้แจ้งเพราะหวังว่าจะทำเสร็จเร็วและไม่อยากดูไม่มีความสามารถ',
  feelingsTitleEn: 'HOW YOU FEEL',
  feelingsTitleTh: 'คุณรู้สึกอย่างไร',
  feelingsEn:
    "Embarrassed and slightly defensive. If manager focuses only on the deadline, you'll apologize and promise to do better. If manager asks why you didn't communicate, you'll open up about the upstream delay.",
  feelingsTh:
    'อับอายและค่อนข้างป้องกันตัว ถ้าหัวหน้ามุ่งแค่กำหนดส่ง คุณจะขอโทษและสัญญาว่าจะทำดีขึ้น ถ้าหัวหน้าถามว่าทำไมถึงไม่แจ้ง คุณจะบอกเรื่องความล่าช้าจากต้นน้ำ',
  howToPlayTitleEn: 'HOW TO PLAY THIS ROLE',
  howToPlayTitleTh: 'วิธีรับบทบาทนี้',
  howToPlayEn: [
    {
      lead: 'Open with apology',
      line: "'Sorry, I was waiting on data from IT and it came late'",
    },
    {
      lead: 'If manager asks why you didn\'t communicate',
      line: "'I thought I'd be able to finish quickly... I didn't want to make it seem like a bigger issue'",
    },
    {
      lead: 'If manager sets clear communication protocol, accept and commit',
      line: "'I'll flag it 24 hours in advance going forward'",
    },
    {
      lead: 'If manager is harsh or doesn\'t ask the real question',
      line: 'stay minimal',
    },
  ],
  howToPlayTh: [
    {
      lead: 'เปิดด้วยการขอโทษ',
      line: "'ขอโทษ รอข้อมูลจาก IT แต่มาช้า'",
    },
    {
      lead: 'ถ้าหัวหน้าถามว่าทำไมถึงไม่แจ้ง',
      line: "'ผมคิดว่าจะทำเสร็จเร็ว ไม่อยากทำให้ดูเหมือนปัญหาใหญ่'",
    },
    {
      lead: 'ถ้าหัวหน้ากำหนดขั้นตอนการสื่อสารที่ชัดเจน ยอมรับและยืนยัน',
      line: "'จะแจ้งล่วงหน้า 24 ชั่วโมงต่อจากนี้'",
    },
    {
      lead: 'ถ้าหัวหน้าพูดรุนแรงหรือไม่ถามคำถามที่แท้จริง',
      line: 'ให้น้อยที่สุด',
    },
  ],
} as const;

export const R4_V2_SITUATION = {
  situationEn:
    "IT/Operations, CK Power. Khun Ploy (IT Data Specialist, 2 years) submitted monthly operational data to the Finance team with incorrect figures — a formula error. Finance used the data in an executive report before the error was caught. The discrepancy was flagged by the CFO's office.",
  situationTh:
    'IT/Operations, CK Power คุณพลอย (IT Data Specialist, 2 ปี) ส่งข้อมูลการดำเนินงานรายเดือนให้ฝ่ายการเงินพร้อมตัวเลขผิด — ข้อผิดพลาดในสูตร ฝ่ายการเงินนำข้อมูลไปใช้ในรายงานผู้บริหารก่อนพบข้อผิดพลาด ความคลาดเคลื่อนถูกตรวจพบโดยสำนักงาน CFO',
} as const;

export const MANAGER_R4_V2 = {
  ...R4_V2_SITUATION,
  headline: 'R4  ·  DATA ERROR IN SHARED REPORT  —  ข้อผิดพลาดข้อมูลในรายงานร่วม',
  subhead: 'REDIRECTION — MANAGER ROLE  ·  การเปลี่ยนทิศทาง — บทบาทผู้จัดการ',
  cardTitleEn: 'R4  ·  MANAGER ROLE CARD — REDIRECTION',
  cardTitleTh: 'R4  ·  บัตรบทบาทผู้จัดการ — การเปลี่ยนทิศทาง',
  whoYouAreEn:
    'You are the IT Team Lead. The error reached the CFO level. Ploy is normally careful — this appears to be a process gap (no double-check procedure) more than individual carelessness. Your redirection needs to address BOTH the behavior (verify before submitting cross-team data) AND the process (create a check procedure).',
  whoYouAreTh:
    'คุณคือ IT Team Lead ข้อผิดพลาดถึงระดับ CFO คุณพลอยปกติระมัดระวัง ดูเหมือนเป็นช่องว่างในกระบวนการ (ไม่มีขั้นตอนตรวจสอบซ้ำ) มากกว่าความประมาทส่วนบุคคล การเปลี่ยนทิศทางต้องพูดถึงทั้งพฤติกรรม (ตรวจสอบก่อนส่งข้อมูลข้ามทีม) และกระบวนการ (สร้างขั้นตอนตรวจสอบ)',
  stepsTitleEn: 'THE WHALE DONE STEPS',
  stepsTitleTh: 'ขั้นตอน Whale Done',
  stepsEn: [
    {
      label: 'DESCRIBE',
      body: "'Ploy, I want to talk about the monthly data that went to Finance. There was a formula error — it made it into the executive report.'",
    },
    {
      label: 'IMPACT',
      body: "'This reached the CFO level. It created a correction cycle that took half a day and flagged our team's data quality. That's a significant credibility impact.'",
    },
    {
      label: 'TAKE RESPONSIBILITY',
      body: "'Our team hasn't had a formal double-check procedure for cross-team data submissions, and that's something I should have put in place. If we'd had one, this might not have slipped through.'",
    },
    {
      label: 'REDIRECT',
      body: "'For all cross-team data submissions going forward: please run the key totals through a second verification before sending. I'd also like to work with you to build a simple checklist for these submissions.'",
    },
    {
      label: 'CLOSE POSITIVELY',
      body: "'I know you're normally rigorous — this is about building a process so that one formula error doesn't slip through next time.'",
    },
  ],
  stepsTh: [
    {
      label: 'อธิบาย',
      body: "'คุณพลอย อยากคุยเรื่องข้อมูลรายเดือนที่ส่งให้ฝ่ายการเงิน มีข้อผิดพลาดในสูตรที่เข้าไปอยู่ในรายงานผู้บริหาร'",
    },
    {
      label: 'ผลกระทบ',
      body: "'เรื่องนี้ถึงระดับ CFO สร้างวงจรแก้ไขที่ใช้เวลาครึ่งวันและทำให้คุณภาพข้อมูลของทีมเราถูกตั้งคำถาม นั่นคือผลกระทบด้านความน่าเชื่อถืออย่างมีนัยสำคัญ'",
    },
    {
      label: 'รับผิดชอบ',
      body: "'ทีมเราไม่มีขั้นตอนตรวจสอบซ้ำอย่างเป็นทางการสำหรับการส่งข้อมูลข้ามทีม และนั่นเป็นสิ่งที่ฉันควรจัดให้มีตั้งนานแล้ว ถ้ามีขั้นตอนนั้น ข้อผิดพลาดนี้อาจไม่ผ่านออกไปได้'",
    },
    {
      label: 'เปลี่ยนทิศทาง',
      body: "'สำหรับการส่งข้อมูลข้ามทีมต่อจากนี้: โปรดตรวจสอบยอดรวมหลักผ่านการยืนยันครั้งที่สองก่อนส่ง อยากทำงานร่วมกับคุณเพื่อสร้าง checklist ง่ายๆ สำหรับการส่งเหล่านี้ด้วย'",
    },
    {
      label: 'ปิดเชิงบวก',
      body: "'ฉันรู้ว่าคุณปกติเข้มงวดมาก เรื่องนี้เกี่ยวกับการสร้างกระบวนการเพื่อให้ข้อผิดพลาดในสูตรไม่หลุดผ่านในครั้งถัดไป'",
    },
  ],
  avoidTitleEn: 'DO NOT',
  avoidTitleTh: 'สิ่งที่ต้องหลีกเลี่ยง',
  avoidEn: [
    'Focus blame on Ploy personally — the process gap is a team problem',
    "Skip the 'close positively' — the error is significant but the pattern isn't",
    'Stop at redirection without building a corrective process together',
  ],
  avoidTh: [
    'ตำหนิคุณพลอยโดยตรง ช่องว่างในกระบวนการเป็นปัญหาของทีม',
    'ข้ามการปิดเชิงบวก ข้อผิดพลาดสำคัญแต่รูปแบบไม่ใช่',
    'หยุดแค่การเปลี่ยนทิศทางโดยไม่สร้างกระบวนการแก้ไขร่วมกัน',
  ],
} as const;

export const EMPLOYEE_R4_V2 = {
  ...R4_V2_SITUATION,
  headline: 'R4  ·  DATA ERROR IN SHARED REPORT  —  ข้อผิดพลาดข้อมูลในรายงานร่วม',
  subhead: 'REDIRECTION — EMPLOYEE ROLE  ·  การเปลี่ยนทิศทาง — บทบาทพนักงาน',
  cardTitleEn: 'R4  ·  EMPLOYEE ROLE CARD',
  cardTitleTh: 'R4  ·  บัตรบทบาทพนักงาน',
  whoYouAreEn:
    "You are Khun Ploy, IT Data Specialist. You made a formula error. You submitted without double-checking because time was tight. You're genuinely embarrassed — you pride yourself on accuracy.",
  whoYouAreTh:
    'คุณคือคุณพลอย, IT Data Specialist คุณทำสูตรผิด คุณส่งโดยไม่ตรวจสอบซ้ำเพราะเวลาตึง คุณอับอายจริงๆ คุณภาคภูมิใจในความแม่นยำ',
  feelingsTitleEn: 'HOW YOU FEEL',
  feelingsTitleTh: 'คุณรู้สึกอย่างไร',
  feelingsEn:
    "Genuinely mortified. You don't need the manager to tell you this was a problem — you already know. If manager focuses on blame, you'll shut down. If manager helps build a better process, you'll engage fully.",
  feelingsTh:
    'อับอายอย่างแท้จริง คุณไม่ต้องให้หัวหน้ามาบอกว่านี่คือปัญหา คุณรู้อยู่แล้ว ถ้าหัวหน้ามุ่งตำหนิ คุณจะปิดตัว ถ้าหัวหน้าช่วยสร้างกระบวนการที่ดีขึ้น คุณจะมีส่วนร่วมอย่างเต็มที่',
  howToPlayTitleEn: 'HOW TO PLAY THIS ROLE',
  howToPlayTitleTh: 'วิธีรับบทบาทนี้',
  howToPlayEn: [
    {
      lead: 'Open proactively',
      line: "'I know — I'm really sorry. I should have double-checked those formulas before sending.'",
    },
    {
      lead: 'If manager is blame-focused, stay minimal',
      line: "'Yes, it won't happen again'",
    },
    {
      lead: 'If manager proposes a checklist or process improvement, engage actively',
      line: "suggest specific checks you'd add",
    },
    {
      lead: 'Commit clearly if handled well',
      line: "'I'll build a verification step into my submission process'",
    },
  ],
  howToPlayTh: [
    {
      lead: 'เปิดเชิงรุก',
      line: "'ทราบแล้ว ขอโทษมาก ควรตรวจสอบสูตรเหล่านั้นก่อนส่ง'",
    },
    {
      lead: 'ถ้าหัวหน้ามุ่งตำหนิ ให้น้อยที่สุด',
      line: "'ครับ จะไม่เกิดขึ้นอีก'",
    },
    {
      lead: 'ถ้าหัวหน้าเสนอ checklist หรือการปรับปรุงกระบวนการ มีส่วนร่วมอย่างแข็งขัน',
      line: 'เสนอการตรวจสอบเฉพาะที่คุณจะเพิ่ม',
    },
    {
      lead: 'ยืนยันอย่างชัดเจนถ้าจัดการได้ดี',
      line: "'จะสร้างขั้นตอนการยืนยันเข้าไปในกระบวนการส่งของฉัน'",
    },
  ],
} as const;

export const W1_V2_SITUATION = {
  situationEn:
    "Team meeting, any department. Khun Ying has been on the team for 18 months. She's technically competent but has rarely spoken in group meetings. Today, unprompted, she raised a potential data inconsistency that no one else had noticed — potentially saving the team from submitting a flawed report.",
  situationTh:
    'การประชุมทีม, ฝ่ายใดก็ได้ คุณหญิงอยู่ในทีมมา 18 เดือน เธอมีความสามารถทางเทคนิคแต่แทบไม่เคยพูดในการประชุมกลุ่ม วันนี้เธอยกเรื่องความไม่สอดคล้องของข้อมูลที่ไม่มีใครสังเกตเห็น ช่วยทีมจากการส่งรายงานที่มีข้อผิดพลาด',
} as const;

export const MANAGER_W1_V2 = {
  ...W1_V2_SITUATION,
  headline: 'W1  ·  QUIET EMPLOYEE SPEAKS UP  —  พนักงานเงียบพูดขึ้นมา',
  subhead: 'WHALE DONE! — MANAGER ROLE  ·  Whale Done! — บทบาทผู้จัดการ',
  cardTitleEn: 'W1  ·  MANAGER ROLE CARD — WHALE DONE!',
  cardTitleTh: 'W1  ·  บัตรบทบาทผู้จัดการ — Whale Done!',
  whoYouAreEn:
    "You are the team manager — five people report to you, a mixed team of analysts and coordinators. You have worked with Khun Ying for 14 months. She is excellent at her work but almost invisible in group settings. You have never heard her challenge anything in a meeting. She speaks when spoken to and keeps her head down.  That's why what just happened matters. In the middle of a team report review — with four colleagues and you present — she paused and said: \"I think there might be an inconsistency in the Q3 figures on page 7.\" She was right. The figures had been pulled from different base periods.  She didn't make a big announcement. She said it quietly, looking at the table. But she said it. For Ying, that took courage.  You need to give her a Whale Done right now — not in a group email later, not casually mentioned next week. Now. After the meeting, before she leaves the room. If you miss this moment, you miss the chance to rewire her relationship with speaking up. The Whale Done formula: name exactly what she did, describe the real impact, express genuine appreciation.",
  whoYouAreTh:
    'คุณคือผู้จัดการทีม คุณหญิงเพิ่งชี้ให้เห็นความไม่สอดคล้องในการประชุม คุณต้องการให้ Whale Done แก่เธอ ทันที เจาะจง และจริงใจ สูตร Whale Done: อธิบายพฤติกรรมเฉพาะ อธิบายผลกระทบ แสดงความขอบคุณอย่างจริงใจ',
  stepsTitleEn: 'THE WHALE DONE STEPS',
  stepsTitleTh: 'ขั้นตอน Whale Done',
  stepsEn: [
    {
      label: 'DESCRIBE',
      body: "'Ying — what you just did. You saw an inconsistency in the data that the rest of us had missed, and you said something.'",
    },
    {
      label: 'IMPACT',
      body: "'That caught a potential error before it went into the report. That's exactly the kind of attention this team needs.'",
    },
    {
      label: 'APPRECIATE',
      body: "'I want to say directly: that took courage, and it made a real difference. Thank you for speaking up.'",
    },
    {
      label: 'ENCOURAGE FUTURE',
      body: "'I hope you'll keep doing that — your eye for detail is exactly what makes this team stronger.'",
    },
  ],
  stepsTh: [
    {
      label: 'อธิบาย',
      body: "'คุณหญิง สิ่งที่คุณเพิ่งทำ คุณเห็นความไม่สอดคล้องในข้อมูลที่พวกเราพลาดไป และพูดออกมา'",
    },
    {
      label: 'ผลกระทบ',
      body: "'นั่นจับข้อผิดพลาดที่อาจเกิดขึ้นก่อนเข้าไปในรายงาน นั่นแหละคือความใส่ใจที่ทีมนี้ต้องการ'",
    },
    {
      label: 'ขอบคุณ',
      body: "'อยากบอกตรงๆ นั่นต้องใช้ความกล้า และมันสร้างความแตกต่างที่แท้จริง ขอบคุณที่พูดขึ้นมา'",
    },
    {
      label: 'ส่งเสริมอนาคต',
      body: "'หวังว่าคุณจะทำแบบนั้นต่อไป สายตาที่ใส่ใจรายละเอียดของคุณคือสิ่งที่ทำให้ทีมนี้แข็งแกร่งขึ้น'",
    },
  ],
  avoidTitleEn: 'DO NOT',
  avoidTitleTh: 'สิ่งที่ต้องหลีกเลี่ยง',
  avoidEn: [
    "Be generic: 'Great job everyone' — specificity is what makes Whale Done work",
    'Save it for later — Whale Done is most powerful when immediate',
    "Overdo it: 'You're amazing, best thing that's happened to this team!' — sincerity matters more than enthusiasm",
  ],
  avoidTh: [
    "พูดกว้างๆ: 'ทำงานดีทุกคน' ความเจาะจงคือสิ่งที่ทำให้ Whale Done ได้ผล",
    'เก็บไว้ทีหลัง Whale Done ทรงพลังที่สุดเมื่อทำทันที',
    "ทำมากเกินไป: 'คุณเก่งมาก สิ่งที่ดีที่สุดที่เกิดขึ้นกับทีมนี้!' ความจริงใจสำคัญกว่าความกระตือรือร้น",
  ],
} as const;

export const EMPLOYEE_W1_V2 = {
  ...W1_V2_SITUATION,
  headline: 'W1  ·  QUIET EMPLOYEE SPEAKS UP  —  พนักงานเงียบพูดขึ้นมา',
  subhead: 'WHALE DONE! — EMPLOYEE ROLE  ·  Whale Done! — บทบาทพนักงาน',
  cardTitleEn: 'W1  ·  EMPLOYEE ROLE CARD',
  cardTitleTh: 'W1  ·  บัตรบทบาทพนักงาน',
  whoYouAreEn:
    "You are Khun Ying — 31 years old, data analyst, 14 months in this team. Group meetings make you uncomfortable. Not because you don't have opinions — you have plenty. But you have learned to keep them to yourself. The last time you challenged something in a previous job, the team leader dismissed you in front of everyone. That stayed with you.  Today, you spotted something. The Q3 figures on page 7 didn't match the base data you had reviewed separately. You knew you were right. You also knew that pointing it out meant speaking up in front of everyone, including your manager.  For about 30 seconds you debated with yourself. Then you said it. Quietly. Looking at the table.  Now the meeting is wrapping up and you're not sure how that landed. Did you seem like you were undermining the person who prepared the report? Did it come across as too small a thing to flag? Part of you wishes you had just emailed someone privately instead. You won't say any of this. But if your manager acknowledges — specifically — what you did and why it mattered, you will feel genuinely seen. If no one says anything, you will be less likely to speak up next time.",
  whoYouAreTh:
    'คุณคือคุณหญิง การพูดในการประชุมไม่เคยสบายสำหรับคุณ คุณแจ้งปัญหาเพราะกังวลจริงๆ ไม่ใช่เพราะต้องการความสนใจ ตอนนี้คุณค่อนข้างกังวลว่าคุณทำสิ่งที่ถูกต้องหรือไม่',
  feelingsTitleEn: 'HOW YOU FEEL',
  feelingsTitleTh: 'คุณรู้สึกอย่างไร',
  feelingsEn:
    "Uncertain and quietly hoping you didn't overstep. If the manager acknowledges it specifically and sincerely, you'll feel genuinely seen. If it's ignored or generic, you'll be less likely to speak up next time.",
  feelingsTh:
    'ไม่แน่ใจและหวังเงียบๆ ว่าคุณไม่ก้าวเกิน ถ้าผู้จัดการยอมรับอย่างเจาะจงและจริงใจ คุณจะรู้สึกว่าถูกมองเห็นจริงๆ ถ้าถูกเพิกเฉยหรือพูดกว้างๆ คุณจะพูดขึ้นน้อยลงครั้งต่อไป',
  howToPlayTitleEn: 'HOW TO PLAY THIS ROLE',
  howToPlayTitleTh: 'วิธีรับบทบาทนี้',
  howToPlayEn: [
    {
      lead: 'Receive specific Whale Done gracefully',
      line: "'Thank you — I wasn't sure if I should say something'",
    },
    {
      lead: 'If Whale Done is generic or vague, respond politely but not warmly',
      line: "'Oh, thanks'",
    },
    {
      lead: 'If done well, you visibly relax and become more engaged in the rest of the meeting',
      line: '',
    },
  ],
  howToPlayTh: [
    {
      lead: 'รับ Whale Done ที่เจาะจงอย่างสง่างาม',
      line: "'ขอบคุณ ไม่แน่ใจว่าควรพูดหรือเปล่า'",
    },
    {
      lead: 'ถ้า Whale Done กว้างหรือคลุมเครือ ตอบสุภาพแต่ไม่อบอุ่น',
      line: "'อ้อ ขอบคุณ'",
    },
    {
      lead: 'ถ้าทำได้ดี คุณผ่อนคลายอย่างเห็นได้ชัดและมีส่วนร่วมมากขึ้นในการประชุมที่เหลือ',
      line: '',
    },
  ],
} as const;

export const W2_V2_SITUATION = {
  situationEn:
    'Operations/Maintenance. Khun In (the confident junior engineer from previous accountability discussions) came to check in with you BEFORE acting on a non-standard maintenance approach — exactly as you discussed. This is new behavior for him. He normally just does it.',
  situationTh:
    'ฝ่ายปฏิบัติการ/ซ่อมบำรุง คุณอิน (วิศวกรระดับล่างที่มั่นใจจากการถกเถียงความรับผิดชอบก่อนหน้า) มา check in กับคุณก่อนดำเนินการวิธีซ่อมบำรุงที่ไม่ได้มาตรฐาน ตรงตามที่คุณคุยกัน นี่คือพฤติกรรมใหม่สำหรับเขา ปกติเขาทำเลย',
} as const;

export const MANAGER_W2_V2 = {
  ...W2_V2_SITUATION,
  headline: 'W2  ·  GEN Z BEHAVIOR CHANGE — CAUGHT IN THE ACT  —  Gen Z เปลี่ยนพฤติกรรม — จับได้ในขณะกระทำ',
  subhead: 'WHALE DONE! — MANAGER ROLE  ·  Whale Done! — บทบาทผู้จัดการ',
  cardTitleEn: 'W2  ·  MANAGER ROLE CARD — WHALE DONE!',
  cardTitleTh: 'W2  ·  บัตรบทบาทผู้จัดการ — Whale Done!',
  whoYouAreEn:
    'You are the Section Leader. Khun In just came to you to check in before a non-standard procedure — the exact behavior change you asked for. This moment matters enormously. How you respond now will determine whether he does this again or reverts to his default.',
  whoYouAreTh:
    'คุณคือหัวหน้าส่วนงาน คุณอินเพิ่งมาหาคุณเพื่อ check in ก่อนขั้นตอนที่ไม่ได้มาตรฐาน พฤติกรรมที่เปลี่ยนแปลงที่คุณขอพอดี ช่วงเวลานี้สำคัญมาก วิธีที่คุณตอบสนองตอนนี้จะกำหนดว่าเขาจะทำอีกครั้งหรือกลับไปเป็นเหมือนเดิม',
  stepsTitleEn: 'THE WHALE DONE STEPS',
  stepsTitleTh: 'ขั้นตอน Whale Done',
  stepsEn: [
    {
      label: 'DESCRIBE',
      body: "'In, I notice you came to check with me before doing anything. That's exactly what we talked about.'",
    },
    {
      label: 'IMPACT',
      body: "'This is how we build trust — and it means I can actually support you when you have a good idea, instead of just finding out after the fact.'",
    },
    {
      label: 'APPRECIATE',
      body: "'I want you to know I genuinely appreciate this. It shows you took our conversation seriously — and I take that seriously too.'",
    },
    {
      label: 'EMPOWER',
      body: "'Now let's look at what you're proposing. I want to hear your thinking.'",
    },
  ],
  stepsTh: [
    {
      label: 'อธิบาย',
      body: "'คุณอิน สังเกตว่าคุณมา check กับฉันก่อนทำอะไร นั่นแหละคือสิ่งที่เราคุยกัน'",
    },
    {
      label: 'ผลกระทบ',
      body: "'นี่คือวิธีที่เราสร้างความไว้วางใจ และหมายความว่าฉันสามารถสนับสนุนคุณจริงๆ เมื่อคุณมีความคิดดี แทนที่จะรู้หลังจากนั้น'",
    },
    {
      label: 'ขอบคุณ',
      body: "'อยากให้คุณรู้ว่าฉันขอบคุณสิ่งนี้อย่างจริงใจ มันแสดงว่าคุณรับบทสนทนาของเราอย่างจริงจัง และฉันก็รับมันอย่างจริงจังเช่นกัน'",
    },
    {
      label: 'มอบอำนาจ',
      body: "'ตอนนี้มาดูสิ่งที่คุณเสนอ อยากฟังความคิดของคุณ'",
    },
  ],
  avoidTitleEn: 'DO NOT',
  avoidTitleTh: 'สิ่งที่ต้องหลีกเลี่ยง',
  avoidEn: [
    "Say 'finally' or make him feel late to the party",
    'Skip straight to evaluating his proposal without acknowledging the check-in behavior first',
    "Be sarcastic: 'Wow, you actually checked in!'",
  ],
  avoidTh: [
    "พูดว่า 'ในที่สุด' หรือทำให้เขารู้สึกมาช้า",
    'ข้ามไปประเมินข้อเสนอโดยไม่ยอมรับพฤติกรรมการ check in ก่อน',
    "พูดแดกดัน: 'ว้าว คุณมา check in ด้วย!'",
  ],
} as const;

export const EMPLOYEE_W2_V2 = {
  ...W2_V2_SITUATION,
  headline: 'W2  ·  GEN Z BEHAVIOR CHANGE — CAUGHT IN THE ACT  —  Gen Z เปลี่ยนพฤติกรรม — จับได้ในขณะกระทำ',
  subhead: 'WHALE DONE! — EMPLOYEE ROLE  ·  Whale Done! — บทบาทพนักงาน',
  cardTitleEn: 'W2  ·  EMPLOYEE ROLE CARD',
  cardTitleTh: 'W2  ·  บัตรบทบาทพนักงาน',
  whoYouAreEn:
    "You are Khun In — the same person from the accountability role play. Your manager had a direct conversation with you about a non-standard maintenance decision you made without checking in. At the time, you defended your reasoning — and internally you still think your technical assessment was correct. But your manager said something that landed: 'The issue isn't whether your idea was good. The issue is that when I find out after the fact, I can't support you or protect you — even when I would have said yes.' That made sense to you, grudgingly. Today you have an idea about the cooling system procedure that is genuinely not standard. Old you would have just done it. Today, you walked over and knocked on your manager's door. You said: 'I have an idea about the cooling system — I wanted to check with you before I did anything.' You feel a little awkward doing this. It feels like asking permission, which is not how you think of yourself. But you did it. If your manager jumps straight to evaluating the idea without acknowledging that you came to check in first, you'll feel like the change made no difference. If your manager pauses and specifically recognizes what you just did, you'll feel that the new behavior is worth repeating.",
  whoYouAreTh:
    'คุณคือคุณอิน คุณมา check in ก่อนดำเนินการ ซึ่งเป็นเรื่องใหม่สำหรับคุณ คุณไม่แน่ใจว่ามันจะเป็นอย่างไร ส่วนหนึ่งรู้สึกไม่สบายใจเล็กน้อยที่ทำแบบนี้ แต่คุณทำเพราะบทสนทนาก่อนหน้าสมเหตุสมผลจริงๆ',
  feelingsTitleEn: 'HOW YOU FEEL',
  feelingsTitleTh: 'คุณรู้สึกอย่างไร',
  feelingsEn:
    "Slightly uncertain, but internally hoping this goes well. If the manager receives this positively and genuinely, you'll feel rewarded. If the manager treats it as 'about time' or skips straight to the proposal, you'll be less motivated to check in next time.",
  feelingsTh:
    "ไม่แน่ใจเล็กน้อย แต่ภายในหวังว่าจะเป็นไปได้ดี ถ้าผู้จัดการรับสิ่งนี้อย่างดีและจริงใจ คุณจะรู้สึกได้รับรางวัล ถ้าผู้จัดการปฏิบัติต่อมันว่า 'สมควรแล้ว' หรือข้ามไปที่ข้อเสนอทันที คุณจะมีแรงจูงใจน้อยลงที่จะ check in ครั้งถัดไป",
  howToPlayTitleEn: 'HOW TO PLAY THIS ROLE',
  howToPlayTitleTh: 'วิธีรับบทบาทนี้',
  howToPlayEn: [
    {
      lead: 'Come in with a slightly uncertain but professional tone',
      line: "'I have an idea about the cooling system procedure — I wanted to check with you before I did anything'",
    },
    {
      lead: 'If manager receives it warmly and specifically, relax and engage fully in discussing the proposal',
      line: '',
    },
    {
      lead: 'If manager is neutral or skips the acknowledgment, give minimal engagement in the discussion',
      line: '',
    },
  ],
  howToPlayTh: [
    {
      lead: 'เข้ามาด้วยน้ำเสียงไม่แน่ใจเล็กน้อยแต่เป็นมืออาชีพ',
      line: "'ผมมีความคิดเกี่ยวกับขั้นตอนระบบทำความเย็น อยากมา check กับคุณก่อนจะทำอะไร'",
    },
    {
      lead: 'ถ้าผู้จัดการรับอย่างอบอุ่นและเจาะจง ผ่อนคลายและมีส่วนร่วมอย่างเต็มที่ในการอภิปรายข้อเสนอ',
      line: '',
    },
    {
      lead: 'ถ้าผู้จัดการเป็นกลางหรือข้ามการยอมรับ ให้การมีส่วนร่วมน้อยในการอภิปราย',
      line: '',
    },
  ],
} as const;

export const W3_V2_SITUATION = {
  situationEn:
    "IT and Operations, CK Power. Khun Sakda (IT Specialist) stayed late to help resolve an operational data issue that was technically outside his team's scope — preventing a production delay that would have affected the Operations team's quarterly numbers.",
  situationTh:
    'IT และฝ่ายปฏิบัติการ, CK Power คุณศักดิ์ดา (IT Specialist) อยู่ดึกเพื่อช่วยแก้ไขปัญหาข้อมูลการดำเนินงานที่ทางเทคนิคอยู่นอกขอบเขตของทีมเขา ป้องกันความล่าช้าในการผลิตที่จะกระทบตัวเลขรายไตรมาสของทีมปฏิบัติการ',
} as const;

export const MANAGER_W3_V2 = {
  ...W3_V2_SITUATION,
  headline: 'W3  ·  CROSS-TEAM — ABOVE AND BEYOND  —  ข้ามทีม — เกินกว่าหน้าที่',
  subhead: 'WHALE DONE! — MANAGER ROLE  ·  Whale Done! — บทบาทผู้จัดการ',
  cardTitleEn: 'W3  ·  MANAGER ROLE CARD — WHALE DONE!',
  cardTitleTh: 'W3  ·  บัตรบทบาทผู้จัดการ — Whale Done!',
  whoYouAreEn:
    'You are the Operations Manager (the team that benefited). You want to give Sakda a Whale Done — not because he did his job, but because he went beyond his defined scope to help you. This kind of cross-team collaboration is exactly what the organization needs more of.',
  whoYouAreTh:
    'คุณคือผู้จัดการฝ่ายปฏิบัติการ (ทีมที่ได้รับประโยชน์) คุณต้องการให้ Whale Done แก่คุณศักดิ์ดา ไม่ใช่เพราะเขาทำงานของเขา แต่เพราะเขาไปเกินขอบเขตที่กำหนดเพื่อช่วยคุณ การทำงานร่วมข้ามทีมแบบนี้คือสิ่งที่องค์กรต้องการมากขึ้น',
  stepsTitleEn: 'THE WHALE DONE STEPS',
  stepsTitleTh: 'ขั้นตอน Whale Done',
  stepsEn: [
    {
      label: 'DESCRIBE',
      body: "'Sakda — I want to acknowledge what you did last night. You stayed to fix a data issue that was technically outside your team's scope — because it was going to affect us.'",
    },
    {
      label: 'IMPACT',
      body: "'That prevented what would have been a 2-day delay in our production reporting. Our quarterly numbers would have looked significantly worse without it.'",
    },
    {
      label: 'APPRECIATE',
      body: "'That's the kind of cross-team ownership that makes this organization work. I'm genuinely grateful — and I want you to know that I noticed.'",
    },
    {
      label: 'ELEVATE',
      body: "'I'm going to mention this to your manager as well. This is the kind of contribution that should be recognized.'",
    },
  ],
  stepsTh: [
    {
      label: 'อธิบาย',
      body: "'คุณศักดิ์ดา อยากยอมรับสิ่งที่คุณทำเมื่อคืน คุณอยู่แก้ไขปัญหาข้อมูลที่ทางเทคนิคอยู่นอกขอบเขตของทีม เพราะมันจะกระทบพวกเรา'",
    },
    {
      label: 'ผลกระทบ',
      body: "'นั่นป้องกันความล่าช้า 2 วันในการรายงานการผลิตของเรา ตัวเลขรายไตรมาสของเราจะดูแย่กว่านี้มากถ้าไม่มีคุณ'",
    },
    {
      label: 'ขอบคุณ',
      body: "'นั่นคือการเป็นเจ้าของข้ามทีมที่ทำให้องค์กรนี้ทำงานได้ ฉันขอบคุณอย่างจริงใจ และอยากให้คุณรู้ว่าฉันสังเกตเห็น'",
    },
    {
      label: 'ยกระดับ',
      body: "'ฉันจะแจ้งเรื่องนี้ให้ผู้จัดการของคุณทราบด้วย สิ่งนี้คือการมีส่วนร่วมที่ควรได้รับการยอมรับ'",
    },
  ],
  avoidTitleEn: 'DO NOT',
  avoidTitleTh: 'สิ่งที่ต้องหลีกเลี่ยง',
  avoidEn: [
    "Treat it as 'just doing his job' — he went beyond scope",
    "Give generic thanks: 'Thanks for the help' — specificity is what makes Whale Done stick",
    'Delay the recognition — tell him the next day, not a week later',
  ],
  avoidTh: [
    "ปฏิบัติต่อมันว่า 'แค่ทำงานของเขา' เขาไปเกินขอบเขต",
    "ขอบคุณแบบกว้างๆ: 'ขอบคุณที่ช่วย' ความเจาะจงคือสิ่งที่ทำให้ Whale Done คงอยู่",
    'ชะลอการยอมรับ บอกเขาวันถัดไป ไม่ใช่หนึ่งสัปดาห์ต่อมา',
  ],
} as const;

export const EMPLOYEE_W3_V2 = {
  ...W3_V2_SITUATION,
  headline: 'W3  ·  CROSS-TEAM — ABOVE AND BEYOND  —  ข้ามทีม — เกินกว่าหน้าที่',
  subhead: 'WHALE DONE! — EMPLOYEE ROLE  ·  Whale Done! — บทบาทพนักงาน',
  cardTitleEn: 'W3  ·  EMPLOYEE ROLE CARD',
  cardTitleTh: 'W3  ·  บัตรบทบาทพนักงาน',
  whoYouAreEn:
    "You are Khun Sakda. You stayed late and helped because it was the right thing to do — you didn't expect anything in return. You're slightly surprised to be receiving this recognition.",
  whoYouAreTh:
    'คุณคือคุณศักดิ์ดา คุณอยู่ดึกและช่วยเพราะมันเป็นสิ่งที่ถูกต้อง คุณไม่ได้คาดหวังสิ่งใดตอบแทน คุณค่อนข้างประหลาดใจที่ได้รับการยอมรับนี้',
  feelingsTitleEn: 'HOW YOU FEEL',
  feelingsTitleTh: 'คุณรู้สึกอย่างไร',
  feelingsEn:
    "Pleasantly surprised and touched. You value this recognition more than you might show. If the manager is specific about what you did and why it mattered, you'll feel genuinely seen — and you'll be more likely to go above scope again in the future.",
  feelingsTh:
    'ประหลาดใจอย่างน่าพอใจและซาบซึ้ง คุณให้คุณค่ากับการยอมรับนี้มากกว่าที่คุณอาจแสดงออก ถ้าผู้จัดการเจาะจงเรื่องสิ่งที่คุณทำและว่าทำไมจึงสำคัญ คุณจะรู้สึกว่าถูกมองเห็นจริงๆ และคุณจะมีโอกาสมากขึ้นที่จะไปเกินขอบเขตอีกในอนาคต',
  howToPlayTitleEn: 'HOW TO PLAY THIS ROLE',
  howToPlayTitleTh: 'วิธีรับบทบาทนี้',
  howToPlayEn: [
    {
      lead: 'Receive gracefully',
      line: "'It was the right thing to do — I didn't want to leave the team stuck'",
    },
    {
      lead: 'If recognition is specific and sincere, respond warmly',
      line: "'Thank you — that actually means a lot to hear'",
    },
    {
      lead: "If recognition is generic, acknowledge politely but don't open up further",
      line: '',
    },
  ],
  howToPlayTh: [
    {
      lead: 'รับอย่างสง่างาม',
      line: "'มันเป็นสิ่งที่ถูกต้อง ไม่อยากปล่อยให้ทีมค้างอยู่'",
    },
    {
      lead: 'ถ้าการยอมรับเจาะจงและจริงใจ ตอบสนองอย่างอบอุ่น',
      line: "'ขอบคุณ นั่นมีความหมายมากจริงๆ ที่ได้ยิน'",
    },
    {
      lead: 'ถ้าการยอมรับกว้างๆ ยอมรับอย่างสุภาพแต่ไม่เปิดใจต่อ',
      line: '',
    },
  ],
} as const;

export const W4_V2_SITUATION = {
  situationEn:
    'Any department, CK Power. Khun Dao (the employee from the accountability role play) did something different today: she came to her manager 3 days before a deadline to flag that she was behind and explain why — instead of waiting until the deadline passed. This is an entirely new behavior for her.',
  situationTh:
    'ฝ่ายใดก็ได้, CK Power คุณดาว (พนักงานจากการแสดงบทบาทความรับผิดชอบ) ทำสิ่งที่แตกต่างวันนี้: เธอมาหาผู้จัดการ 3 วันก่อนกำหนด เพื่อแจ้งว่าเธอล่าช้าและอธิบายเหตุผล แทนที่จะรอจนกว่ากำหนดจะผ่านไป นี่คือพฤติกรรมใหม่ทั้งหมดสำหรับเธอ',
} as const;

export const MANAGER_W4_V2 = {
  ...W4_V2_SITUATION,
  headline: 'W4  ·  EARLY PROBLEM REPORTING  —  รายงานปัญหาล่วงหน้า',
  subhead: 'WHALE DONE! — MANAGER ROLE  ·  Whale Done! — บทบาทผู้จัดการ',
  cardTitleEn: 'W4  ·  MANAGER ROLE CARD — WHALE DONE!',
  cardTitleTh: 'W4  ·  บัตรบทบาทผู้จัดการ — Whale Done!',
  whoYouAreEn:
    "You are Khun Dao's manager. Three months ago, Dao missed a deadline without saying anything until the day it was due. You had a difficult accountability conversation afterward — direct but fair. At the end of it, you said clearly: 'What I need from you next time is to come to me early, before the deadline passes. I can help if I know ahead of time.' That conversation was uncomfortable for both of you. Today, three days before her next major deadline, Dao knocked on your door. She was visibly nervous. She told you she's behind on the data compilation and explained why. Three days early. You need to stop everything and give her a Whale Done before you even address the delay. The delay is manageable. The behavior she just demonstrated is rare and fragile. If you skip the Whale Done and go straight to problem-solving, you will accidentally signal that speaking up early has no payoff. She may never do it again.",
  whoYouAreTh:
    'คุณคือผู้จัดการของคุณดาว เธอเพิ่งบอกคุณ 3 วันล่วงหน้าว่าเธอล่าช้าในโครงการและเพราะอะไร พฤติกรรมนี้คือสิ่งที่คุณขอหลังบทสนทนาความรับผิดชอบ ตอนนี้คุณต้องให้ Whale Done ทันที ก่อนที่คุณจะพูดถึงโครงการที่ล่าช้า',
  stepsTitleEn: 'THE WHALE DONE STEPS',
  stepsTitleTh: 'ขั้นตอน Whale Done',
  stepsEn: [
    {
      label: 'DESCRIBE',
      body: "'Dao — before we talk about the project, I want to say something. You came to me 3 days before the deadline to tell me you're behind and why. Do you realize how significant that is?'",
    },
    {
      label: 'IMPACT',
      body: "'This gives me time to help. Three days means we have options. If I find out on the deadline day, we have no options. You just changed how this team manages problems.'",
    },
    {
      label: 'APPRECIATE',
      body: "'This is exactly what I asked for, and I want to acknowledge it directly. Thank you for doing this.'",
    },
    {
      label: 'NOW SOLVE',
      body: "'Now — let's figure out together what we need to do to make this work.'",
    },
  ],
  stepsTh: [
    {
      label: 'อธิบาย',
      body: "'คุณดาว ก่อนจะคุยเรื่องโครงการ อยากพูดบางอย่าง คุณมาหาฉัน 3 วันก่อนกำหนดเพื่อบอกว่าคุณล่าช้าและเพราะอะไร คุณรู้ไหมว่านั่นสำคัญแค่ไหน?'",
    },
    {
      label: 'ผลกระทบ',
      body: "'นี่ให้เวลาฉันช่วยได้ สามวันหมายความว่าเรามีทางเลือก ถ้าฉันรู้ในวันกำหนด เราไม่มีทางเลือก คุณเพิ่งเปลี่ยนวิธีที่ทีมนี้จัดการปัญหา'",
    },
    {
      label: 'ขอบคุณ',
      body: "'นี่คือสิ่งที่ฉันขอ และอยากยอมรับตรงๆ ขอบคุณที่ทำแบบนี้'",
    },
    {
      label: 'แก้ไขตอนนี้',
      body: "'ตอนนี้ มาช่วยกันหาว่าต้องทำอะไรเพื่อให้มันสำเร็จ'",
    },
  ],
  avoidTitleEn: 'DO NOT',
  avoidTitleTh: 'สิ่งที่ต้องหลีกเลี่ยง',
  avoidEn: [
    'Skip straight to fixing the problem — acknowledge the communication behavior FIRST',
    'Make her feel bad about being behind — that\'s separate from the Whale Done',
    "Minimize it: 'Thanks for telling me' — treat it as the significant moment it is",
  ],
  avoidTh: [
    'ข้ามไปแก้ไขปัญหาทันที ยอมรับพฤติกรรมการสื่อสารก่อน',
    'ทำให้เธอรู้สึกแย่เรื่องการล่าช้า นั่นแยกจาก Whale Done',
    "ลดความสำคัญ: 'ขอบคุณที่บอก' ปฏิบัติต่อมันเหมือนเป็นช่วงเวลาสำคัญที่มันเป็น",
  ],
} as const;

export const EMPLOYEE_W4_V2 = {
  ...W4_V2_SITUATION,
  headline: 'W4  ·  EARLY PROBLEM REPORTING  —  รายงานปัญหาล่วงหน้า',
  subhead: 'WHALE DONE! — EMPLOYEE ROLE  ·  Whale Done! — บทบาทพนักงาน',
  cardTitleEn: 'W4  ·  EMPLOYEE ROLE CARD',
  cardTitleTh: 'W4  ·  บัตรบทบาทพนักงาน',
  whoYouAreEn:
    "You are Khun Dao — the same person from the accountability role play. Three months ago, your manager had a serious conversation with you about missing a deadline without communicating. That conversation shook you. Not because of the consequences — but because your manager said something that stuck: 'Your silence doesn't protect you. It removes my ability to help you.' You thought about that for weeks. Today, three days before this deadline, you realized you are behind. The data from another team came in late and incomplete. You have a choice: wait and hope, or go to your manager now. You chose now. Walking to your manager's office, your heart was beating faster than normal. You knocked, came in, and said what you came to say. Now you're sitting here and you don't know how it will go. You did the thing you were afraid to do. If your manager acknowledges that before anything else, you will feel enormously relieved — like the risk paid off. If your manager goes straight to 'how did this happen,' you will answer the question but feel deflated. You will be less likely to do this again.",
  whoYouAreTh:
    'คุณคือคุณดาว คุณมาเร็วเพราะบทสนทนาความรับผิดชอบก่อนหน้าทำให้คุณตระหนักว่าความเงียบของคุณทำร้ายทุกคนแค่ไหน คุณประหม่า ไม่แน่ใจว่าการมาบอกว่าล่าช้าจะทำให้สถานการณ์แย่ลงหรือไม่',
  feelingsTitleEn: 'HOW YOU FEEL',
  feelingsTitleTh: 'คุณรู้สึกอย่างไร',
  feelingsEn:
    "Nervous but doing the right thing. If manager Whale Dones the communication behavior before anything else, you'll feel enormously relieved and rewarded. If manager goes straight to 'how did this happen' — you'll be deflated and less likely to report early in the future.",
  feelingsTh:
    "ประหม่าแต่ทำสิ่งที่ถูกต้อง ถ้าผู้จัดการให้ Whale Done กับพฤติกรรมการสื่อสารก่อนอะไรทั้งนั้น คุณจะรู้สึกโล่งอกและได้รับรางวัลอย่างมาก ถ้าผู้จัดการไปตรงที่ 'เกิดอะไรขึ้น' คุณจะท้อแท้และมีโอกาสน้อยลงที่จะรายงานล่วงหน้าในอนาคต",
  howToPlayTitleEn: 'HOW TO PLAY THIS ROLE',
  howToPlayTitleTh: 'วิธีรับบทบาทนี้',
  howToPlayEn: [
    {
      lead: 'Enter hesitantly',
      line: "'I wanted to talk to you about the project... I'm behind on the data compilation and I wanted you to know before the deadline'",
    },
    {
      lead: 'If manager Whale Dones the early communication first',
      line: 'visibly relax, feel genuinely relieved, engage fully in the problem-solving',
    },
    {
      lead: 'If manager skips the Whale Done and goes straight to the problem',
      line: "feel slightly deflated, answer questions but don't volunteer extra information",
    },
  ],
  howToPlayTh: [
    {
      lead: 'เข้ามาด้วยความลังเล',
      line: "'อยากคุยเรื่องโครงการ ฉันล่าช้าในการรวบรวมข้อมูลและอยากให้คุณรู้ก่อนกำหนด'",
    },
    {
      lead: 'ถ้าผู้จัดการให้ Whale Done กับการสื่อสารล่วงหน้าก่อน',
      line: 'ผ่อนคลายอย่างเห็นได้ชัด รู้สึกโล่งอกอย่างจริงจัง มีส่วนร่วมอย่างเต็มที่ในการแก้ปัญหา',
    },
    {
      lead: 'ถ้าผู้จัดการข้าม Whale Done ไปที่ปัญหาทันที',
      line: 'รู้สึกท้อแท้เล็กน้อย ตอบคำถามแต่ไม่เสนอข้อมูลเพิ่มเติม',
    },
  ],
} as const;
