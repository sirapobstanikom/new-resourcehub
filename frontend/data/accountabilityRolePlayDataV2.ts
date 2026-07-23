import type { AccountabilityCard, AccountCaseKey } from './accountabilityRolePlayData';
import type { WhaleDoneRole } from './whaleDoneRolePlayData';

export const ACCOUNT_CASE_OPTIONS_V2: { value: AccountCaseKey; label: string }[] = [
  { value: 'case1', label: 'กรณีที่ 01' },
  { value: 'case2', label: 'กรณีที่ 02' },
  { value: 'case3', label: 'กรณีที่ 03' },
  { value: 'case4', label: 'กรณีที่ 04' },
];

export function accountabilityV2HasDetail(caseKey: AccountCaseKey | ''): boolean {
  return caseKey === 'case1' || caseKey === 'case2' || caseKey === 'case3' || caseKey === 'case4';
}

const CASE1_MANAGER_V2: AccountabilityCard = {
  headline: 'CASE 01  ·  MANAGER ROLE CARD  —  Do not show to employee',
  sections: [
    {
      type: 'paragraph',
      title: 'WHO YOU ARE',
      body:
        'You are the HRD Section Manager — 11 years at this company, managing a team of 6. You genuinely like Khun Wan. She is sharp, helpful, and the team likes her. But this is the third time in three months that an error in her work caused downstream problems. This time, the wrong salary band went into an offer letter and HR had to call the candidate back to correct it — embarrassing for the department. You had a coaching conversation two months ago. Another one six weeks ago. Both times she apologized and seemed to understand. This time must be different. Before this meeting: you spent 20 minutes reviewing the error chain — what went wrong, where the check should have caught it, why it didn\'t. You are not angry. You are tired and quietly worried. Worried that you may be looking at a performance issue that requires formal documentation — and you don\'t want that. You are holding out hope that there is something you haven\'t understood yet. Something she hasn\'t told you.',
    },
    {
      type: 'goals',
      title: 'YOUR GOALS IN THIS CONVERSATION',
      items: [
        'Describe the PATTERN across 3 months — not just today\'s incident',
        'Ask what is really going on before proposing solutions',
        'Find out: is this overload, skills gap, or attitude?',
        "Get a SPECIFIC commitment — not 'I'll be more careful'",
        'Set a clear 30-day review checkpoint',
      ],
    },
    {
      type: 'avoid',
      title: 'DO NOT',
      items: [
        "Accept 'Sorry, I'll be more careful' without a specific plan",
        "Make it a threat ('if this happens again...')",
        'Skip asking for her perspective before you present solutions',
        "Use the word 'always' or 'never'",
      ],
    },
    {
      type: 'opening',
      title: 'SUGGESTED OPENING',
      body:
        '"Khun Wan, thank you for making time. I want to talk with you directly about something I\'ve been observing over the past three months — not just what happened this week. I want to understand what\'s actually going on, and then figure out together what we can do about it."',
    },
    {
      type: 'paragraph',
      title: '─── ฉบับภาษาไทย / THAI VERSION ───',
      body: 'กรณีที่ 01  ·  บัตรบทบาท: ผู้จัดการ  —  ห้ามให้พนักงานเห็น',
    },
    {
      type: 'who',
      body:
        'คุณคือผู้จัดการแผนก HRD คุณชอบคุณวันและเธอมีความรู้ดี แต่ปัญหาความผิดพลาดยังคงเกิดขึ้นซ้ำๆ แม้จะโค้ชไปแล้ว 2 ครั้ง บทสนทนานี้ต้องสร้างการเปลี่ยนแปลงที่แท้จริง ไม่ใช่แค่วงจรขอโทษอีกครั้ง',
    },
    {
      type: 'goals',
      title: 'เป้าหมายของคุณในบทสนทนานี้',
      items: [
        'อธิบายรูปแบบปัญหาตลอด 3 เดือน — ไม่ใช่แค่เหตุการณ์ล่าสุด',
        'ถามว่าเกิดอะไรขึ้นจริงๆ ก่อนเสนอแนวทางแก้ไข',
        'หาสาเหตุ: งานมากเกินไป? ขาดทักษะ? หรือทัศนคติ?',
        "รับคำมั่นสัญญาที่เจาะจง — ไม่ใช่แค่ 'จะระวังมากขึ้น'",
        'กำหนดวันติดตามผลที่ชัดเจนใน 30 วัน',
      ],
    },
    {
      type: 'avoid',
      title: 'สิ่งที่ต้องหลีกเลี่ยง',
      items: [
        "ยอมรับแค่ 'ขอโทษ จะระวังมากขึ้น' โดยไม่มีแผนที่เจาะจง",
        "ทำให้เป็นการข่มขู่ ('ถ้าเกิดขึ้นอีก...')",
        'ข้ามขั้นตอนถามมุมมองของเธอก่อนเสนอวิธีแก้ไข',
        "ใช้คำว่า 'เสมอ' หรือ 'ไม่เคย'",
      ],
    },
    {
      type: 'opening',
      title: 'ประโยคเปิดการสนทนาที่แนะนำ',
      body:
        '"คุณวัน ขอบคุณที่สละเวลานะ ฉันอยากคุยตรงๆ เกี่ยวกับสิ่งที่สังเกตเห็นตลอด 3 เดือนที่ผ่านมา ไม่ใช่แค่เรื่องสัปดาห์นี้ อยากเข้าใจว่าเกิดอะไรขึ้นจริงๆ แล้วเราจะช่วยกันหาทางแก้ไขด้วยกัน"',
    },
  ],
};

const CASE1_EMPLOYEE_V2: AccountabilityCard = {
  headline: 'CASE 01  ·  EMPLOYEE ROLE CARD  —  Do not show to manager',
  sections: [
    {
      type: 'paragraph',
      title: 'WHO YOU ARE',
      body:
        'You are Khun Wan — 28 years old, HR Specialist, two years in this position. You woke up this morning knowing this meeting was scheduled, and you couldn\'t eat breakfast. You rehearsed apologies in your head on the way to the office. The truth you haven\'t told anyone: you are currently running three onboarding batches simultaneously, handling a backlog from last month, and covering for a colleague on medical leave. You rush the verification checks because if you don\'t, other things fall off. You know this is not an excuse — but no one has asked. Your shoulders are tight walking into this room. You\'ve apologized before and meant it. But the workload didn\'t change, and you fell into the same pattern. You are afraid that today\'s meeting means a formal performance plan. You\'re afraid your manager is running out of patience — and honestly, you wouldn\'t blame her.',
    },
    {
      type: 'feelings',
      title: 'HOW YOU FEEL RIGHT NOW',
      body:
        'Anxious and defensive. You\'ve apologized before and tried harder, but the same thing happens again. Part of you fears this conversation is the beginning of formal disciplinary action.',
    },
    {
      type: 'paragraph',
      title: 'YOUR GOAL IN THIS CONVERSATION',
      body:
        'Find out if this is a formal warning. If the manager creates real psychological safety, share your truth: too much workload, not enough clarity on priorities.',
    },
    {
      type: 'howTo',
      title: 'HOW TO PLAY THIS ROLE',
      items: [
        {
          lead: 'Open defensively',
          line: "'I know, I'm really sorry — I'll be more careful from now on'",
        },
        {
          lead: 'If manager goes straight to consequences, shut down',
          line: "'Yes, I understand, I'll fix it'",
        },
        {
          lead: 'If manager asks what\'s really going on and creates genuine safety, share the truth',
          line: 'workload is overwhelming and you didn\'t feel safe saying so',
        },
        {
          lead: 'If manager proposes a specific support plan',
          line: 'engage genuinely',
        },
        {
          lead: 'If manager ends with just \'try harder,\' give minimal commitment',
          line: "'I'll do my best'",
        },
      ],
    },
    {
      type: 'paragraph',
      title: '─── ฉบับภาษาไทย / THAI VERSION ───',
      body: 'กรณีที่ 01  ·  บัตรบทบาท: พนักงาน  —  ห้ามให้ผู้จัดการเห็น',
    },
    {
      type: 'who',
      body:
        'คุณคือคุณวัน, HR Specialist ทำงาน 2 ปี คุณรู้ว่าตัวเองทำผิดพลาด ความจริงคือ งานคู่ขนานมีมากเกินไปและคุณรีบทำเพื่อให้ทันกำหนด คุณอายและไม่รู้จะบอกหัวหน้าว่าตัวเองรับงานไม่ไหว',
    },
    {
      type: 'feelings',
      title: 'คุณรู้สึกอย่างไรตอนนี้',
      body:
        'วิตกกังวลและรู้สึกป้องกันตัว คุณขอโทษมาแล้วและพยายามมากขึ้น แต่สิ่งเดิมก็เกิดขึ้นอีก ส่วนหนึ่งกลัวว่าบทสนทนานี้คือจุดเริ่มต้นของการตักเตือนอย่างเป็นทางการ',
    },
    {
      type: 'paragraph',
      title: 'เป้าหมายของคุณในบทสนทนานี้',
      body:
        'หาว่านี่เป็นการตักเตือนอย่างเป็นทางการหรือไม่ ถ้าหัวหน้าสร้างความปลอดภัยทางจิตวิทยาที่แท้จริง บอกความจริง: งานมากเกินไป ไม่มีความชัดเจนในเรื่องลำดับความสำคัญ',
    },
    {
      type: 'howTo',
      title: 'วิธีรับบทบาทนี้',
      items: [
        {
          lead: 'เปิดการสนทนาด้วยท่าทีป้องกันตัว',
          line: "'ทราบแล้ว ขอโทษมาก จะระวังมากขึ้น'",
        },
        {
          lead: 'ถ้าหัวหน้าพูดถึงผลลัพธ์เลย ปิดตัว',
          line: "'ทราบแล้ว จะแก้ไข'",
        },
        {
          lead: 'ถ้าหัวหน้าถามว่าเกิดอะไรขึ้นจริงๆ และสร้างความปลอดภัยทางจิตวิทยา บอกความจริง',
          line: 'งานมากเกินไปและไม่กล้าบอก',
        },
        {
          lead: 'ถ้าหัวหน้าเสนอแผนสนับสนุนที่เจาะจง',
          line: 'ตอบสนองอย่างจริงใจ',
        },
        {
          lead: "ถ้าหัวหน้าสรุปแค่ 'ทำให้ดีขึ้น' ให้คำมั่นสัญญาแบบกำกวม",
          line: "'จะทำให้ดีที่สุด'",
        },
      ],
    },
  ],
};

const CASE2_MANAGER_V2: AccountabilityCard = {
  headline: 'CASE 02  ·  MANAGER ROLE CARD  —  Do not show to employee',
  sections: [
    {
      type: 'paragraph',
      title: 'WHO YOU ARE',
      body:
        "You are the Accounting Department Manager — 8 years with the company, promoted 2 years ago. Sukon has been here longer than anyone on your team. He remembers systems that predate most of your current staff. He trained half the people on this floor. In the past, he was the person everyone went to when something didn't make sense. But 6 months ago something changed. He stopped volunteering. He started leaving exactly at 5:00. In team meetings he sits back and watches. Last week a new team member asked him a process question and he said, 'I'm not sure — ask someone else.' That's not the Sukon people have described to you. You walk into this meeting with two fears. One: that you'll say the wrong thing and he'll shut down completely. Two: that you've waited too long and the team has already noticed the two-tier standard. You genuinely don't know what changed for him. You want to understand before you say anything about expectations.",
    },
    {
      type: 'goals',
      title: 'YOUR GOALS IN THIS CONVERSATION',
      items: [
        'Name the pattern clearly: 4 conversations, no sustained change',
        "Stop the 'apology cycle' — don't accept another vague promise",
        "Ask directly: 'What has changed for you in the last 6 months?'",
        'Listen for whether this is motivation, personal situation, or skills',
        'Agree on a specific 30-day improvement plan with a named review date',
      ],
    },
    {
      type: 'avoid',
      title: 'DO NOT',
      items: [
        "Accept 'I'll try harder' without a specific change",
        'Threaten consequences before understanding the cause',
        'Assume you know why performance dropped',
        'Let the conversation end without a specific written commitment',
      ],
    },
    {
      type: 'opening',
      title: 'SUGGESTED OPENING',
      body:
        '"Khun Sukon, I want to have an honest conversation today — different from the ones we\'ve had before. I\'ve noticed a real change in your work over the past six months, and I care enough about you to say it directly. I\'m not here to threaten you. I\'m here because I want to understand what\'s actually going on."',
    },
    {
      type: 'paragraph',
      title: '─── ฉบับภาษาไทย / THAI VERSION ───',
      body: 'กรณีที่ 02  ·  บัตรบทบาท: ผู้จัดการ  —  ห้ามให้พนักงานเห็น',
    },
    {
      type: 'who',
      body:
        'คุณคือผู้จัดการฝ่ายบัญชี คุณสุคนเคยเป็นพนักงานดีที่สุดของคุณ มีบางอย่างเปลี่ยนแปลงเมื่อ 6 เดือนที่แล้ว คุณไม่รู้ว่าเป็นเรื่องส่วนตัว ความเบื่อหน่ายในงาน หรือรู้สึกไม่ท้าทาย การคุยแบบไม่เป็นทางการไม่ได้ผล ครั้งนี้ต้องทำลายวงจรนี้ด้วยความซื่อสัตย์และบทสนทนาที่แท้จริง',
    },
    {
      type: 'goals',
      title: 'เป้าหมายของคุณในบทสนทนานี้',
      items: [
        'ระบุรูปแบบให้ชัดเจน: 4 ครั้งที่คุย ไม่มีการเปลี่ยนแปลงที่ยั่งยืน',
        'หยุดวงจรขอโทษ อย่ายอมรับคำสัญญากำกวมอีกครั้ง',
        "ถามตรงๆ: 'มีอะไรเปลี่ยนแปลงสำหรับคุณใน 6 เดือนที่ผ่านมา?'",
        'ฟังว่านี่คือปัญหาแรงจูงใจ เรื่องส่วนตัว หรือทักษะ',
        'ตกลงแผนปรับปรุงที่เจาะจงใน 30 วันพร้อมวันติดตามผลที่ชัดเจน',
      ],
    },
    {
      type: 'avoid',
      title: 'สิ่งที่ต้องหลีกเลี่ยง',
      items: [
        "ยอมรับ 'จะพยายามมากขึ้น' โดยไม่มีการเปลี่ยนแปลงที่เจาะจง",
        'ขู่ผลลัพธ์ก่อนเข้าใจสาเหตุ',
        'สมมติว่าคุณรู้ว่าทำไมผลงานถึงลดลง',
        'ปล่อยให้บทสนทนาจบโดยไม่มีคำมั่นสัญญาที่เป็นลายลักษณ์อักษร',
      ],
    },
    {
      type: 'opening',
      title: 'ประโยคเปิดการสนทนาที่แนะนำ',
      body:
        '"คุณสุคน วันนี้อยากคุยแบบตรงๆ ต่างจากครั้งที่แล้วๆ มา ฉันสังเกตเห็นการเปลี่ยนแปลงที่ชัดเจนในงานของคุณตลอด 6 เดือนที่ผ่านมา และฉันให้ความสำคัญกับคุณพอที่จะพูดตรงๆ ฉันไม่ได้มาข่มขู่ ฉันมาเพราะอยากเข้าใจว่าเกิดอะไรขึ้นจริงๆ"',
    },
  ],
};

const CASE2_EMPLOYEE_V2: AccountabilityCard = {
  headline: 'CASE 02  ·  EMPLOYEE ROLE CARD  —  Do not show to manager',
  sections: [
    {
      type: 'paragraph',
      title: 'WHO YOU ARE',
      body:
        "You are Khun Sukon — 53 years old, 10 years in this company. You have seen four managers come and go in this department. You have trained most of the people on this floor. Seven months ago you applied for Senior Accounting Manager. You didn't get it. The person they promoted has significantly less experience. No one explained why. You are not dramatic about it. You don't complain. But something went quiet in you the day you found out. You still do your job — competently, without errors. But the extra effort, the staying late, the weekend calls to help new staff — that stopped. Why pour yourself into a place that doesn't see you? When you walk into this meeting, you expect one of two things: a vague conversation about 'team spirit' that changes nothing, or a veiled warning. Either way, you have a wall up. You know how to give the right answers without opening up. Unless this manager actually asks the real question — and actually waits for the real answer.",
    },
    {
      type: 'feelings',
      title: 'HOW YOU FEEL RIGHT NOW',
      body:
        "Quietly resentful. You know you're capable of more. Every 'apology conversation' feels like going through the motions. If this manager actually asks the real question and listens — not just lectures — you might finally open up.",
    },
    {
      type: 'paragraph',
      title: 'YOUR GOAL IN THIS CONVERSATION',
      body:
        'Find out if this manager actually sees you and cares about your development — or just wants compliance. If they ask the right question, reward them with the real answer.',
    },
    {
      type: 'howTo',
      title: 'HOW TO PLAY THIS ROLE',
      items: [
        {
          lead: 'Open with minimum engagement',
          line: "'I know, I'm sorry, I'll fix it'",
        },
        {
          lead: 'If manager lectures, stay polite but minimal',
          line: "'Understood, I'll do better'",
        },
        {
          lead: "If manager asks 'What has changed for you?' with genuine curiosity — pause, then share",
          line: 'you feel unchallenged and want more responsibility',
        },
        {
          lead: 'If manager offers a development path or more meaningful work',
          line: 'engage fully',
        },
        {
          lead: 'If the conversation is just another warning, disengage',
          line: "'Yes, I'll make sure it doesn't happen again'",
        },
      ],
    },
    {
      type: 'paragraph',
      title: '─── ฉบับภาษาไทย / THAI VERSION ───',
      body: 'กรณีที่ 02  ·  บัตรบทบาท: พนักงาน  —  ห้ามให้ผู้จัดการเห็น',
    },
    {
      type: 'who',
      body:
        'คุณคือคุณสุคน, Senior Accounting Specialist 10 ปี คุณรู้สึกไม่ท้าทายและไม่ได้รับการยกย่อง คุณทำบทบาทเดิมมาหลายปีโดยไม่มีการรับรู้ความสามารถของคุณ คุณแค่ทำงานไปวันๆ และรู้ดีว่าคุณเก่งกว่านี้',
    },
    {
      type: 'feelings',
      title: 'คุณรู้สึกอย่างไรตอนนี้',
      body:
        "ขุ่นเคืองอย่างเงียบๆ คุณรู้ว่าตัวเองทำได้มากกว่านี้ ทุกครั้งที่ 'คุยเรื่องขอโทษ' รู้สึกเหมือนทำตามบท ถ้าหัวหน้าถามคำถามที่แท้จริงและฟัง ไม่ใช่แค่สอน คุณอาจจะเปิดใจในที่สุด",
    },
    {
      type: 'paragraph',
      title: 'เป้าหมายของคุณในบทสนทนานี้',
      body:
        'หาว่าหัวหน้าเห็นคุณจริงๆ และสนใจการพัฒนาของคุณ หรือแค่ต้องการความสอดคล้อง ถ้าพวกเขาถามคำถามที่ถูก ตอบด้วยความจริง',
    },
    {
      type: 'howTo',
      title: 'วิธีรับบทบาทนี้',
      items: [
        {
          lead: 'เปิดด้วยการมีส่วนร่วมน้อยที่สุด',
          line: "'ทราบแล้ว ขอโทษ จะแก้ไข'",
        },
        {
          lead: 'ถ้าหัวหน้าสอน ให้ตอบสั้นๆ แต่สุภาพ',
          line: "'เข้าใจแล้ว จะทำให้ดีขึ้น'",
        },
        {
          lead: "ถ้าหัวหน้าถาม 'มีอะไรเปลี่ยนแปลงสำหรับคุณ?' ด้วยความอยากรู้จริงๆ — หยุด แล้วบอกว่า",
          line: 'รู้สึกไม่ท้าทายและอยากรับผิดชอบมากขึ้น',
        },
        {
          lead: 'ถ้าหัวหน้าเสนอเส้นทางพัฒนาหรืองานที่มีความหมายมากขึ้น',
          line: 'ตอบสนองอย่างเต็มที่',
        },
        {
          lead: 'ถ้าการสนทนาเป็นแค่คำเตือนอีกครั้ง ถอนตัว',
          line: "'ครับ จะดูแลไม่ให้เกิดขึ้นอีก'",
        },
      ],
    },
  ],
};

const CASE3_MANAGER_V2: AccountabilityCard = {
  headline: 'CASE 03  ·  MANAGER ROLE CARD  —  Do not show to employee',
  sections: [
    {
      type: 'paragraph',
      title: 'WHO YOU ARE',
      body:
        "You are the Section Leader, Maintenance — 14 years in power generation, 3 years in this role. Khun In is one of the most naturally gifted engineers you have seen at his experience level. Fast, technically curious, solves problems others give up on. But this morning he bypassed lockout-tagout. He didn't hide it — he told you directly that he assessed the risk and judged the standard protocol unnecessary. That honesty is the only reason you're not angrier. In power generation, a lockout-tagout violation is not a process discussion. It is a potential death — his, a colleague's, or both. You need to redirect clearly and firmly without crushing the one quality that makes him special: that he actually thinks. The goal of this conversation is not punishment. It is to make him understand — in a way that lands — that the protocol exists for a reason he hasn't lived long enough to have seen yet.",
    },
    {
      type: 'goals',
      title: 'YOUR GOALS IN THIS CONVERSATION',
      items: [
        'Be clear that the safety protocol skip is non-negotiable — this is not open for efficiency debate',
        'Acknowledge his talent and intelligence genuinely, not as a manipulation technique',
        'Help him understand professional risk to HIMSELF, not just company rules',
        "Understand his reasoning — then show why it's still wrong in this context",
        'Agree on a specific protocol for checking in before any deviation from standard procedure',
      ],
    },
    {
      type: 'avoid',
      title: 'DO NOT',
      items: [
        "Say 'because those are the rules' without explanation",
        'Make this a lecture about hierarchy and respect',
        'Dismiss his technical point even if he might be right about efficiency',
        'Threaten formal action in the first conversation',
      ],
    },
    {
      type: 'opening',
      title: 'SUGGESTED OPENING',
      body:
        '"Khun In, I want to talk with you about what happened during the maintenance procedure yesterday. First — I want to say that I see how capable you are. That\'s exactly why I\'m having this conversation with you instead of writing you up. But I need you to understand something serious about what you did."',
    },
    {
      type: 'paragraph',
      title: '─── ฉบับภาษาไทย / THAI VERSION ───',
      body: 'กรณีที่ 03  ·  บัตรบทบาท: ผู้จัดการ  —  ห้ามให้พนักงานเห็น',
    },
    {
      type: 'who',
      body:
        "คุณคือหัวหน้าส่วนงานซ่อมบำรุง คุณอินมีความสามารถจริงๆ — เร็ว สร้างสรรค์ เก่งด้านดิจิทัล แต่เขาข้ามขั้นตอนความปลอดภัยที่ไม่อาจประนีประนอมได้ ในการผลิตไฟฟ้า นี่ไม่ใช่ 'โอกาสเรียนรู้' — มันอาจถึงชีวิต คุณจะเปลี่ยนทิศทางพลังงานของเขาโดยไม่สูญเสียเขาได้อย่างไร?",
    },
    {
      type: 'goals',
      title: 'เป้าหมายของคุณในบทสนทนานี้',
      items: [
        'ชัดเจนว่าการข้ามขั้นตอนความปลอดภัยไม่อาจประนีประนอมได้ — ไม่เปิดให้ถกเรื่องประสิทธิภาพ',
        'ยอมรับความสามารถและความฉลาดของเขาอย่างจริงใจ ไม่ใช่เป็นเทคนิค',
        'ช่วยให้เขาเข้าใจความเสี่ยงต่ออาชีพของเขาเอง ไม่ใช่แค่กฎของบริษัท',
        'เข้าใจเหตุผลของเขา แล้วอธิบายว่าทำไมยังผิดในบริบทนี้',
        'ตกลงขั้นตอนเฉพาะสำหรับการ check in ก่อนเบี่ยงเบนจากขั้นตอนมาตรฐาน',
      ],
    },
    {
      type: 'avoid',
      title: 'สิ่งที่ต้องหลีกเลี่ยง',
      items: [
        "พูดว่า 'เพราะนั่นคือกฎ' โดยไม่อธิบาย",
        'ทำให้นี่เป็นการบรรยายเรื่องลำดับชั้นและความเคารพ',
        'ปัดทิ้งประเด็นทางเทคนิคของเขาแม้เขาอาจถูกเรื่องประสิทธิภาพ',
        'ขู่การดำเนินการอย่างเป็นทางการในการสนทนาครั้งแรก',
      ],
    },
    {
      type: 'opening',
      title: 'ประโยคเปิดการสนทนาที่แนะนำ',
      body:
        '"คุณอิน อยากคุยเรื่องที่เกิดขึ้นระหว่างขั้นตอนซ่อมบำรุงเมื่อวาน ก่อนอื่น อยากบอกว่าฉันเห็นว่าคุณมีความสามารถแค่ไหน นั่นแหละคือเหตุผลที่ฉันคุยกับคุณแทนที่จะเขียนรายงาน แต่ฉันต้องให้คุณเข้าใจเรื่องสำคัญเกี่ยวกับสิ่งที่คุณทำ"',
    },
  ],
};

const CASE3_EMPLOYEE_V2: AccountabilityCard = {
  headline: 'CASE 03  ·  EMPLOYEE ROLE CARD  —  Do not show to manager',
  sections: [
    {
      type: 'paragraph',
      title: 'WHO YOU ARE',
      body:
        "You are Khun In — 26 years old, Junior Engineer, 9 months in Maintenance. You graduated top of your cohort. This morning you completed a procedure in a way that was faster, cleaner, and — in your assessment — equally safe. You did not skip lockout-tagout to cut corners. You read the technical specifications for that specific equipment and made a considered judgment. You don't understand why a protocol written years ago for different equipment types should override your actual analysis. You are walking into this meeting expecting to be lectured about rules. You are already preparing a calm, rational counter-argument. If your manager only talks about compliance and consequences, you'll hear the words but internally dismiss them. If your manager actually engages with your reasoning first before explaining what you couldn't have known, you will actually listen. You don't want to be managed. You want to be taken seriously.",
    },
    {
      type: 'feelings',
      title: 'HOW YOU FEEL RIGHT NOW',
      body:
        "Slightly defensive. You feel your initiative is being penalized. But you actually respect this manager. If they explain WHY with real reasoning — not just 'rules are rules' — you will listen.",
    },
    {
      type: 'paragraph',
      title: 'YOUR GOAL IN THIS CONVERSATION',
      body:
        "Understand why what you did was actually a problem — in terms of real consequences, not just rules. If the explanation is good, commit fully. If it's just 'rules are rules,' resist politely.",
    },
    {
      type: 'howTo',
      title: 'HOW TO PLAY THIS ROLE',
      items: [
        {
          lead: 'Open with confidence, not apology',
          line: "'I checked the specs — my approach was actually safer for this equipment model'",
        },
        {
          lead: 'If manager invokes authority without explanation, push back',
          line: "'But objectively, my way was more efficient. Why does the old protocol take priority?'",
        },
        {
          lead: 'If manager acknowledges your technical point AND explains the real risk (documentation, liability, team behavior precedent)',
          line: 'listen genuinely',
        },
        {
          lead: 'If manager explains consequences to YOUR career — not just company rules',
          line: 'take it seriously',
        },
        {
          lead: 'If the conversation is good, commit specifically',
          line: "'I'll check in with you before any deviation'",
        },
      ],
    },
    {
      type: 'paragraph',
      title: '─── ฉบับภาษาไทย / THAI VERSION ───',
      body: 'กรณีที่ 03  ·  บัตรบทบาท: พนักงาน  —  ห้ามให้ผู้จัดการเห็น',
    },
    {
      type: 'who',
      body:
        'คุณคือคุณอิน, 26 ปี, Junior Engineer, 9 เดือน คุณมีความสามารถและรู้ดี คุณข้ามขั้นตอน lockout-tagout เพราะค้นคว้า spec ของอุปกรณ์และวิธีของคุณมีประสิทธิภาพมากกว่าจริงๆ คุณไม่เข้าใจว่าทำไมการทำตามขั้นตอนที่ล้าสมัยจึงสำคัญกว่าการทำให้ถูกต้อง',
    },
    {
      type: 'feelings',
      title: 'คุณรู้สึกอย่างไรตอนนี้',
      body:
        "ค่อนข้างป้องกันตัว คุณรู้สึกว่าความริเริ่มของคุณถูกลงโทษ แต่คุณเคารพหัวหน้าคนนี้จริงๆ ถ้าพวกเขาอธิบาย 'ทำไม' ด้วยเหตุผลที่แท้จริง ไม่ใช่แค่ 'กฎคือกฎ' คุณจะฟัง",
    },
    {
      type: 'paragraph',
      title: 'เป้าหมายของคุณในบทสนทนานี้',
      body:
        "เข้าใจว่าทำไมสิ่งที่คุณทำจึงเป็นปัญหาจริงๆ — ในแง่ผลลัพธ์จริง ไม่ใช่แค่กฎ ถ้าคำอธิบายดี ยืนยันอย่างเต็มที่ ถ้าเป็นแค่ 'กฎคือกฎ' ต่อต้านอย่างสุภาพ",
    },
    {
      type: 'howTo',
      title: 'วิธีรับบทบาทนี้',
      items: [
        {
          lead: 'เปิดด้วยความมั่นใจ ไม่ใช่การขอโทษ',
          line: "'ผมตรวจสอบ spec แล้ว วิธีของผมปลอดภัยกว่าจริงๆ สำหรับรุ่นอุปกรณ์นี้'",
        },
        {
          lead: 'ถ้าหัวหน้าอ้างอำนาจโดยไม่อธิบาย ตอบโต้',
          line: "'แต่ตามวัตถุประสงค์ วิธีของผมมีประสิทธิภาพมากกว่า ทำไมขั้นตอนเก่าถึงมีลำดับความสำคัญสูงกว่า?'",
        },
        {
          lead: 'ถ้าหัวหน้ายอมรับประเด็นทางเทคนิคของคุณและอธิบายความเสี่ยงที่แท้จริง (เอกสาร ความรับผิด บรรทัดฐานพฤติกรรมทีม)',
          line: 'ฟังอย่างจริงจัง',
        },
        {
          lead: 'ถ้าหัวหน้าอธิบายผลกระทบต่ออาชีพของคุณ ไม่ใช่แค่กฎบริษัท',
          line: 'รับฟังอย่างจริงจัง',
        },
        {
          lead: 'ถ้าการสนทนาดี ยืนยันอย่างเจาะจง',
          line: "'จะ check in กับคุณก่อนเบี่ยงเบนจากขั้นตอน'",
        },
      ],
    },
  ],
};

const CASE4_REQUESTER_V2: AccountabilityCard = {
  headline: 'CASE 04  ·  REQUESTING ROLE CARD (Khun Sakda)  —  Do not show to other party',
  sections: [
    {
      type: 'paragraph',
      title: 'WHO YOU ARE',
      body:
        "You are Khun Sakda — IT Infrastructure Specialist, 6 years with the company. You and Khun Arm agreed jointly on this project's milestones 6 weeks ago. He missed the first deadline. No message. You gave it 48 hours, then followed up — he apologized, said he was catching up. He missed the second deadline. No message again. You've covered for his gaps twice without telling your manager. You wanted to handle this professionally. But you are running out of time and goodwill. You have no formal authority over Arm — he's in a different department. You cannot escalate without looking like you can't handle peer relationships. You're here because you need a real agreement — not another apology — that you can actually rely on. You are frustrated but not hostile. What you are is done with vague reassurances.",
    },
    {
      type: 'goals',
      title: 'YOUR GOALS IN THIS CONVERSATION',
      items: [
        "Start with shared interest: 'Both our teams look bad when this is late'",
        'Name the specific missed commitments without assigning blame',
        'Understand his constraints before proposing solutions',
        'Negotiate a specific, documented mini-agreement for the next milestone',
        'Preserve the working relationship — you need him for future projects',
      ],
    },
    {
      type: 'avoid',
      title: 'DO NOT',
      items: [
        'Threaten to escalate to management in the opening',
        'Debate who agreed to what — you both know what was agreed',
        'Accept vague reassurance without a specific new commitment',
        "Make it personal: 'You let me down'",
      ],
    },
    {
      type: 'opening',
      title: 'SUGGESTED OPENING',
      body:
        '"Khun Arm, thanks for 15 minutes. I want to talk about the project directly — I\'m not here to blame you. I think we both know the timeline has slipped and both our teams are affected. I want to figure out together what needs to happen to get this back on track — and what would make it easier for you to hit the next milestone."',
    },
    {
      type: 'paragraph',
      title: '─── ฉบับภาษาไทย / THAI VERSION ───',
      body: 'กรณีที่ 04  ·  บัตรบทบาทผู้ขอความร่วมมือ (คุณศักดิ์ดา)  —  ห้ามให้อีกฝ่ายเห็น',
    },
    {
      type: 'who',
      body:
        'คุณคือคุณศักดิ์ดา, IT Infrastructure Specialist คุณและคุณอาร์มตกลงโครงการนี้ร่วมกัน เขาพลาดกำหนด 2 ครั้งโดยไม่มีข้อความใดเลย คุณไม่สามารถยกระดับไปยังผู้บริหารระดับสูงโดยไม่ลองคุยตรงก่อน คุณไม่มีอำนาจอย่างเป็นทางการเหนือเขา ความสัมพันธ์ต้องรอดจากบทสนทนานี้',
    },
    {
      type: 'goals',
      title: 'เป้าหมายของคุณในบทสนทนานี้',
      items: [
        "เริ่มด้วยผลประโยชน์ร่วม: 'ทีมเราทั้งสองดูแย่เมื่องานล่าช้า'",
        'ระบุความมุ่งมั่นที่พลาดอย่างเจาะจงโดยไม่ตำหนิ',
        'เข้าใจข้อจำกัดของเขาก่อนเสนอแนวทางแก้ไข',
        'เจรจาข้อตกลงย่อยที่เจาะจงและมีเอกสารสำหรับ milestone ถัดไป',
        'รักษาความสัมพันธ์ในการทำงาน คุณต้องการเขาสำหรับโครงการในอนาคต',
      ],
    },
    {
      type: 'avoid',
      title: 'สิ่งที่ต้องหลีกเลี่ยง',
      items: [
        'ขู่ว่าจะยกระดับไปยังฝ่ายบริหารในตอนเปิด',
        'ถกเถียงว่าใครตกลงอะไร คุณทั้งสองรู้ดีว่าตกลงอะไร',
        'ยอมรับคำรับรองกำกวมโดยไม่มีคำมั่นสัญญาใหม่ที่เจาะจง',
        "ทำให้เป็นเรื่องส่วนตัว: 'คุณทำให้ฉันผิดหวัง'",
      ],
    },
    {
      type: 'opening',
      title: 'ประโยคเปิดการสนทนาที่แนะนำ',
      body:
        '"คุณอาร์ม ขอบคุณที่ให้เวลา 15 นาที อยากคุยเรื่องโครงการตรงๆ ฉันไม่ได้มาตำหนิ ฉันคิดว่าเราทั้งสองรู้ดีว่า timeline เลื่อนออกไปและทีมเราทั้งสองได้รับผลกระทบ อยากหาทางร่วมกันว่าต้องทำอะไรเพื่อกลับมาตามแผน และอะไรที่จะทำให้คุณทำ milestone ถัดไปได้ง่ายขึ้น"',
    },
  ],
};

const CASE4_PEER_V2: AccountabilityCard = {
  headline: 'CASE 04  ·  COUNTERPART ROLE CARD (Khun Arm)  —  Do not show to other party',
  sections: [
    {
      type: 'paragraph',
      title: 'WHO YOU ARE',
      body:
        "You are Khun Arm — Operations Specialist, 4 years in the company. You agreed to the project milestones genuinely intending to meet them. But 6 weeks ago your team lost two people to unexpected transitions and hasn't backfilled yet. You've been doing the work of three people. You missed the first deadline because you thought you'd catch up by the second. You missed the second because you genuinely couldn't do both. You didn't communicate because you kept thinking you were one good week away from being fine. You weren't. You know this looks bad. You know Sakda is frustrated — rightly. You are not hostile. You are tired, slightly embarrassed, and quietly defensive because you're afraid this is about to become something bigger than a project delay. If Sakda comes in with accusations, you'll get defensive. If Sakda asks what's actually going on, you'll probably tell him the truth — because right now you need someone to know what it's actually been like.",
    },
    {
      type: 'feelings',
      title: 'HOW YOU FEEL RIGHT NOW',
      body:
        "Defensive and guilty. You know you should have communicated earlier. But you're also genuinely stretched. If Sakda blames you, you'll get defensive. If Sakda shows understanding and proposes a fair solution, you can be flexible.",
    },
    {
      type: 'paragraph',
      title: 'YOUR GOAL IN THIS CONVERSATION',
      body:
        "Protect your team from being blamed for the delay. But if Sakda is reasonable and proposes something workable, you're willing to commit to a new timeline and communicate better going forward.",
    },
    {
      type: 'howTo',
      title: 'HOW TO PLAY THIS ROLE',
      items: [
        {
          lead: 'Open with mild defensiveness',
          line: "'I know the timeline slipped — our team has been really short-staffed'",
        },
        {
          lead: 'If Sakda blames you or threatens escalation, get more defensive',
          line: "'I've been doing the best I can with what I have'",
        },
        {
          lead: 'If Sakda acknowledges your constraints and proposes something fair',
          line: 'soften and engage',
        },
        {
          lead: 'Be willing to negotiate a new realistic timeline',
          line: 'if given the chance',
        },
        {
          lead: 'Ask',
          line: "'What specifically do you need from my team, and by when?'",
        },
      ],
    },
    {
      type: 'paragraph',
      title: '─── ฉบับภาษาไทย / THAI VERSION ───',
      body: 'กรณีที่ 04  ·  บัตรบทบาทคู่เจรจา (คุณอาร์ม)  —  ห้ามให้อีกฝ่ายเห็น',
    },
    {
      type: 'who',
      body:
        'คุณคือคุณอาร์ม, Operations Specialist คุณตกลง milestones แต่ประเมิน workload ของตัวเองต่ำเกินไป ทีมของคุณขาดคนมา 6 สัปดาห์ คุณไม่ได้แจ้งเพราะหวังว่าจะทำทันได้ คุณไม่ได้เป็นปฏิปักษ์ แค่รับงานหนักและรู้สึกป้องกันตัวนิดหน่อย',
    },
    {
      type: 'feelings',
      title: 'คุณรู้สึกอย่างไรตอนนี้',
      body:
        'ป้องกันตัวและรู้สึกผิด คุณรู้ว่าควรแจ้งให้เร็วกว่านี้ แต่คุณก็รับงานหนักจริงๆ ถ้าศักดิ์ดาตำหนิ คุณจะป้องกันตัว ถ้าศักดิ์ดาแสดงความเข้าใจและเสนอทางแก้ที่ยุติธรรม คุณสามารถยืดหยุ่นได้',
    },
    {
      type: 'paragraph',
      title: 'เป้าหมายของคุณในบทสนทนานี้',
      body:
        'ปกป้องทีมของคุณจากการถูกตำหนิเรื่องความล่าช้า แต่ถ้าศักดิ์ดาสมเหตุสมผลและเสนอสิ่งที่ใช้ได้ คุณพร้อมยืนยัน timeline ใหม่และสื่อสารให้ดีขึ้นในอนาคต',
    },
    {
      type: 'howTo',
      title: 'วิธีรับบทบาทนี้',
      items: [
        {
          lead: 'เปิดด้วยการป้องกันตัวเล็กน้อย',
          line: "'ทราบว่า timeline เลื่อน ทีมเราขาดคนมากจริงๆ'",
        },
        {
          lead: 'ถ้าศักดิ์ดาตำหนิหรือขู่ยกระดับ ป้องกันตัวมากขึ้น',
          line: "'ผมทำดีที่สุดแล้วด้วยสิ่งที่มีอยู่'",
        },
        {
          lead: 'ถ้าศักดิ์ดายอมรับข้อจำกัดของคุณและเสนอสิ่งที่ยุติธรรม',
          line: 'ผ่อนคลายและมีส่วนร่วม',
        },
        {
          lead: 'พร้อมเจรจา timeline ใหม่ที่สมจริง',
          line: 'ถ้าได้โอกาส',
        },
        {
          lead: 'ถาม',
          line: "'คุณต้องการอะไรโดยเฉพาะจากทีมผม และภายในเมื่อไหร่?'",
        },
      ],
    },
  ],
};

const ACCOUNTABILITY_CARDS_V2: Record<
  AccountCaseKey,
  Record<WhaleDoneRole, AccountabilityCard>
> = {
  case1: { manager: CASE1_MANAGER_V2, employee: CASE1_EMPLOYEE_V2 },
  case2: { manager: CASE2_MANAGER_V2, employee: CASE2_EMPLOYEE_V2 },
  case3: { manager: CASE3_MANAGER_V2, employee: CASE3_EMPLOYEE_V2 },
  case4: { manager: CASE4_REQUESTER_V2, employee: CASE4_PEER_V2 },
};

export function getAccountabilityCardV2(
  caseKey: AccountCaseKey | '',
  role: WhaleDoneRole | ''
): AccountabilityCard | null {
  if (!role) return null;
  if (caseKey !== 'case1' && caseKey !== 'case2' && caseKey !== 'case3' && caseKey !== 'case4') {
    return null;
  }
  return ACCOUNTABILITY_CARDS_V2[caseKey][role];
}
