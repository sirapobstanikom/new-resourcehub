import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isAuthenticated, setAuthenticated, validateResourceHubCredentials } from '../lib/auth';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  clearMindDojoAssessmentSession,
  isMindDojoAssessmentLoggedIn,
  minddojoAssessmentLogin,
  minddojoAssessmentRegister,
} from '../lib/minddojoAssessmentAuth';
import {
  openaiChat,
  openaiChatStream,
  getMindDojoStructuredReport,
  type MindDojoProfile,
  type MindDojoScenario,
} from '../services/openai';
import { MINDDOJO_REPORT_STORAGE_KEY } from '../data/mindDojoDimensions';
import {
  PROFILING_SYSTEM,
  CUSTOM_SCENARIO_SYSTEM,
  RANDOM_SCENARIOS_USER,
  simulationSystem,
} from '../data/mindDojoPrompts';

type Phase =
  | 'profiling'
  | 'scenario_choice'
  | 'pick_random'
  | 'custom_profiling'
  | 'confirm'
  | 'simulation'
  | 'awaiting_result';

type ChatMsg = { id: string; role: 'user' | 'assistant' | 'event'; content: string };

type ScenarioOption = MindDojoScenario & { shortTitle: string };

type SimulationPersona = {
  name: string;
  position: string;
  mbti: string;
  title: string;
  style: string;
  emotionStyle: string;
  avatarUrl: string;
};

const MINDDOJO_CHATBOT_AVATAR_URL =
  'https://static.wixstatic.com/media/8f9517_2b5ddf78e35a4604a6eb0b28dde240af~mv2.jpg';

/** จำนวนสถานการณ์ที่สุ่มจาก AI ให้ผู้ใช้เลือก */
const RANDOM_SCENARIO_COUNT = 10;
/** จำนวนคำตอบขั้นต่ำใน simulation ก่อนอนุญาตให้ AI จบบทสนทนา */
const MIN_SIMULATION_USER_TURNS = 4;

const WELCOME_ASSISTANT =
  'สวัสดีค่ะ/ครับ ยินดีต้อนรับสู่ **MindDoJo AI Assessment** — เราจะคุยกันแบบสบาย ๆ เพื่อรู้จักคุณ แล้วเข้าสู่การจำลองสถานการณ์การทำงาน\n\nเมื่อจบการจำลอง คุณจะได้ **Dashboard คะแนน 6 ด้านการสื่อสาร** (ชัดเจน โครงสร้างการพูด การเห็นใจ การฟังอย่างตั้งใจ การโน้มน้าว และน้ำเสียงมืออาชีพ)\n\nขอทราบ**ชื่อ**ที่อยากให้เรียกก่อนได้ไหมคะ/ครับ?';

const MBTI_PERSONAS: Omit<SimulationPersona, 'name' | 'position' | 'avatarUrl'>[] = [
  { mbti: 'ISTJ', title: 'นักตรวจสอบรายละเอียด', style: 'สุขุม จริงจัง เน้นข้อเท็จจริงและขั้นตอน', emotionStyle: 'กังวลแบบเก็บอาการ พูดตรงเมื่อเห็นความเสี่ยง' },
  { mbti: 'ISFJ', title: 'ผู้ดูแลทีม', style: 'อบอุ่น ระมัดระวัง ห่วงผลกระทบต่อคนรอบข้าง', emotionStyle: 'แสดงความเป็นห่วงและลังเลเมื่อต้องกดดันผู้อื่น' },
  { mbti: 'INFJ', title: 'ที่ปรึกษาเชิงลึก', style: 'มองภาพรวม เข้าใจความรู้สึก และถามด้วยน้ำเสียงจริงจัง', emotionStyle: 'นิ่งแต่มีความรู้สึกชัดเมื่อเรื่องกระทบคุณค่าหรือความไว้ใจ' },
  { mbti: 'INTJ', title: 'นักวางกลยุทธ์', style: 'คม ชัด ต้องการเหตุผลและแผนที่เป็นระบบ', emotionStyle: 'ไม่ค่อยแสดงอารมณ์ แต่กดดันเมื่อแผนไม่ชัด' },
  { mbti: 'ISTP', title: 'นักแก้ปัญหาเฉพาะหน้า', style: 'สั้น ตรง ชอบข้อมูลจริงและทางออกที่ลงมือได้', emotionStyle: 'ใจเย็นแต่หงุดหงิดกับคำตอบที่ยืดเยื้อหรือไม่มี action' },
  { mbti: 'ISFP', title: 'ผู้รักษาบรรยากาศ', style: 'นุ่มนวล ให้พื้นที่ แต่รับรู้อารมณ์ไว', emotionStyle: 'ผิดหวังหรือไม่สบายใจเมื่อรู้สึกว่าถูกมองข้าม' },
  { mbti: 'INFP', title: 'ผู้ยึดคุณค่า', style: 'จริงใจ คิดถึงความหมายและผลกระทบต่อคน', emotionStyle: 'อ่อนไหวต่อความไม่เป็นธรรมและต้องการการรับฟัง' },
  { mbti: 'INTP', title: 'นักวิเคราะห์ระบบ', style: 'ตั้งคำถามเชิงเหตุผล ชอบความชัดของสมมติฐาน', emotionStyle: 'สงสัยและท้าทายเมื่อข้อมูลไม่ครบหรือเหตุผลยังหลวม' },
  { mbti: 'ESTP', title: 'ผู้ลงมือเร็ว', style: 'มั่นใจ ตรงไปตรงมา เน้นผลลัพธ์ทันที', emotionStyle: 'เร่งและกดดันเมื่อสถานการณ์ช้าเกินไป' },
  { mbti: 'ESFP', title: 'ผู้ขับเคลื่อนบรรยากาศ', style: 'พูดเป็นธรรมชาติ มีพลัง สนใจความรู้สึกของคนในห้อง', emotionStyle: 'แสดงความกังวลหรือผิดหวังอย่างเห็นได้ชัด' },
  { mbti: 'ENFP', title: 'นักเชื่อมโยงโอกาส', style: 'เปิดกว้าง มีไอเดียเยอะ ชอบชวนหาทางออกใหม่', emotionStyle: 'ตื่นตัวและกังวลเมื่อทีมเสียแรงจูงใจ' },
  { mbti: 'ENTP', title: 'นักท้าทายไอเดีย', style: 'ถามคม ท้าทายสมมติฐาน ชอบถกทางเลือก', emotionStyle: 'สนุกกับการกดดันเชิงความคิด แต่ไม่โจมตีส่วนตัว' },
  { mbti: 'ESTJ', title: 'ผู้จัดการผลลัพธ์', style: 'ชัดเจน เด็ดขาด เน้นความรับผิดชอบและ timeline', emotionStyle: 'กดดันตรง ๆ เมื่อเห็นว่างานเสี่ยงหลุดเป้า' },
  { mbti: 'ESFJ', title: 'ผู้ประสานความร่วมมือ', style: 'ใส่ใจความสัมพันธ์ ต้องการให้ทุกฝ่ายเข้าใจตรงกัน', emotionStyle: 'กังวลเมื่อคนในทีมสับสนหรือเสียความเชื่อมั่น' },
  { mbti: 'ENFJ', title: 'ผู้นำที่ใส่ใจคน', style: 'อบอุ่นแต่คาดหวังสูง ชวนรับผิดชอบต่อคนอื่น', emotionStyle: 'จริงจังเมื่อผลกระทบกระทบความไว้วางใจของทีม' },
  { mbti: 'ENTJ', title: 'ผู้นำเชิงกลยุทธ์', style: 'เด็ดขาด มองผลลัพธ์ ต้องการการตัดสินใจที่ชัด', emotionStyle: 'กดดันสูงเมื่อคำตอบไม่เป็นแผนหรือไม่มี owner' },
];

const SIMULATION_PERSONA_NAMES = [
  'คุณอร',
  'คุณนนท์',
  'คุณมิน',
  'คุณธาม',
  'คุณแพรว',
  'คุณกานต์',
  'คุณบีม',
  'คุณพิม',
  'คุณวิน',
  'คุณเมย์',
  'คุณเรย์',
  'คุณฟ้า',
];

const SIMULATION_PERSONA_POSITIONS = [
  'หัวหน้าทีม',
  'ผู้จัดการฝ่าย',
  'Project Lead',
  'Product Owner',
  'ลูกค้าหลัก',
  'Stakeholder',
  'ผู้บริหาร',
  'เพื่อนร่วมงานต่างทีม',
];

const SIMULATION_EVENT_CUES = {
  urgent: [
    'หยิบโทรศัพท์ขึ้นมาดูข้อความจากทีม/ผู้บริหาร แล้วถอนหายใจเบาๆ',
    'เคาะนิ้วบนโต๊ะถี่ขึ้น เหมือนเริ่มหมดความอดทนกับสถานการณ์',
    'มีข้อความแจ้งเตือนเข้ามาเพิ่ม ทำให้แรงกดดันของสถานการณ์สูงขึ้น',
  ],
  dissatisfied: [
    'สีหน้าดูไม่พอใจมากขึ้น และเริ่มกอดอกระหว่างรอฟังคำตอบ',
    'ลุกขึ้นยืนเหมือนกำลังจะเดินออกจากห้อง ถ้ายังไม่ได้คำตอบที่ชัดเจน',
    'ส่ายหน้าเบาๆ เหมือนคำตอบก่อนหน้ายังไม่ลดความกังวล',
  ],
  skeptical: [
    'เอนหลังและเงียบไปครู่หนึ่ง เหมือนกำลังประเมินว่าคำตอบน่าเชื่อถือพอหรือไม่',
    'สีหน้าเปลี่ยนจากกังวลเป็นจริงจัง และเริ่มจดประเด็นที่ยังไม่ชัด',
    'ถามทีมข้างๆ ด้วยน้ำเสียงเบาๆ ว่า "เรายังไว้ใจแผนนี้ได้ไหม"',
  ],
  withdrawn: [
    'ทำเป็นไม่สนใจ มองไปทางอื่น และตอบสั้นลงอย่างเห็นได้ชัด',
    'เริ่มพูดน้อยลง แต่จ้องรอคำตอบที่เป็นแผนชัดเจนมากกว่าเดิม',
    'ก้มดูเอกสารตรงหน้าแทนการสบตา เหมือนยังไม่มั่นใจกับคำอธิบาย',
  ],
  supportive: [
    'พยักหน้าเล็กน้อย แต่ยังรอฟังแผนที่เป็นรูปธรรมกว่านี้',
    'สีหน้าผ่อนลงเล็กน้อย แต่ยังจดประเด็นที่ต้องตามต่อ',
    'ขยับตัวเข้ามาฟังใกล้ขึ้น เหมือนเปิดรับทางออกถัดไป',
  ],
  seniorRespectful: [
    'จดประเด็นเงียบๆ ด้วยสีหน้าจริงจัง และรอคำตอบที่ชัดเจนกว่าเดิม',
    'ปรับน้ำเสียงให้สุภาพขึ้น แต่ยังแสดงความกังวลผ่านสีหน้าอย่างเห็นได้ชัด',
    'เว้นจังหวะเงียบสั้นๆ เหมือนกำลังประเมินความเสี่ยง ก่อนรอฟังแนวทางต่อ',
    'มองเอกสารประกอบแล้วพยักหน้าเล็กน้อย แต่ยังไม่คลายความกังวล',
    'ประสานมือบนโต๊ะอย่างสุภาพ และรอฟังแผนที่มีข้อเท็จจริงกับผลกระทบชัดเจน',
  ],
};

const MBTI_EVENT_CUES: Record<string, string[]> = {
  ISTJ: [
    'ก้มดูรายการข้อเท็จจริงที่จดไว้ และชี้ไปที่จุดที่ยังไม่ตรงกับแผนเดิม',
    'เปิดเอกสาร timeline ขึ้นมาเทียบทีละข้อด้วยสีหน้าจริงจัง',
  ],
  ISFJ: [
    'สีหน้ากังวลชัดขึ้น เหมือนห่วงว่าทีมและลูกค้าจะได้รับผลกระทบ',
    'พยักหน้าเบาๆ แต่ยังมองหาคำตอบที่ช่วยลดความกังวลของทุกฝ่าย',
  ],
  INFJ: [
    'นิ่งไปครู่หนึ่ง เหมือนกำลังชั่งน้ำหนักผลกระทบต่อความไว้วางใจของทุกคน',
    'สบตาอย่างจริงจัง รอฟังว่าคุณจะรับรู้ความกังวลของอีกฝ่ายอย่างไร',
  ],
  INTJ: [
    'มองแผนรวมด้วยสีหน้านิ่ง และรอฟังลำดับเหตุผลที่เป็นระบบกว่าเดิม',
    'จดช่องว่างของแผนอย่างเงียบๆ เหมือนกำลังประเมินความเสี่ยงเชิงกลยุทธ์',
  ],
  ISTP: [
    'เหลือบดูขั้นตอนปฏิบัติจริง แล้วรอฟัง action ที่ทำได้ทันที',
    'นิ่งฟังแบบสั้นๆ แต่สายตาบอกว่าต้องการทางออกที่ลงมือได้จริง',
  ],
  ISFP: [
    'สีหน้าอึดอัดเล็กน้อย เหมือนรู้สึกว่าบรรยากาศในทีมเริ่มตึงเกินไป',
    'หลบสายตาชั่วครู่ แล้วกลับมารอฟังคำตอบที่นุ่มนวลขึ้น',
  ],
  INFP: [
    'สีหน้าสะท้อนความไม่สบายใจ เหมือนเรื่องนี้กระทบความยุติธรรมบางอย่าง',
    'เงียบลงเล็กน้อย รอดูว่าคุณจะให้ความสำคัญกับความรู้สึกของคนเกี่ยวข้องไหม',
  ],
  INTP: [
    'ขมวดคิ้วเล็กน้อย เหมือนยังเห็นช่องว่างในเหตุผลหรือสมมติฐาน',
    'หยุดคิดครู่หนึ่ง แล้วจดคำถามเพิ่มเกี่ยวกับข้อมูลที่ยังไม่ครบ',
  ],
  ESTP: [
    'ขยับตัวไปข้างหน้าอย่างพร้อมลงมือ และรอฟังคำตอบที่เร็วและชัด',
    'แตะโทรศัพท์บนโต๊ะเหมือนพร้อมโทรตามคนที่เกี่ยวข้องทันที',
  ],
  ESFP: [
    'สีหน้าแสดงความกังวลชัดเจน และมองไปรอบๆ เหมือนจับบรรยากาศทีม',
    'ถอนหายใจเบาๆ แต่ยังพยายามเปิดพื้นที่ให้คุยต่ออย่างเป็นกันเอง',
  ],
  ENFP: [
    'ดวงตาดูตื่นตัวขึ้น เหมือนกำลังมองหาทางเลือกใหม่ที่ยังไม่ถูกพูดถึง',
    'เอนตัวเข้ามาฟังด้วยความสนใจ แต่สีหน้ายังบอกว่าทีมกำลังเสียแรงจูงใจ',
  ],
  ENTP: [
    'ยิ้มมุมปากเล็กน้อย เหมือนกำลังเตรียมท้าทายสมมติฐานของแผนนี้',
    'ยกคิ้วขึ้นและรอฟังเหตุผลที่แข็งแรงกว่านี้',
  ],
  ESTJ: [
    'มอง timeline ด้วยสีหน้าจริงจัง และรอฟังว่าใครรับผิดชอบอะไรภายในเมื่อไร',
    'จัดเอกสารตรงหน้าให้เป็นระเบียบ เหมือนต้องการแผนที่ชัดและวัดผลได้',
  ],
  ESFJ: [
    'มองรายชื่อคนที่เกี่ยวข้องด้วยความกังวล เหมือนห่วงว่าทุกฝ่ายจะเข้าใจไม่ตรงกัน',
    'พยักหน้าเล็กน้อย แต่ยังรอฟังว่าคุณจะประสานทีมอย่างไรให้ไม่เสียความเชื่อมั่น',
  ],
  ENFJ: [
    'สบตาอย่างตั้งใจ เหมือนคาดหวังให้คุณรับผิดชอบต่อผลกระทบกับทีม',
    'น้ำเสียงและสีหน้าจริงจังขึ้น เหมือนอยากเห็นการนำทีมที่ชัดเจนกว่าเดิม',
  ],
  ENTJ: [
    'วางปากกาลงอย่างชัดเจน และรอฟังการตัดสินใจที่มีเจ้าของงานชัดเจน',
    'สีหน้านิ่งและกดดันขึ้น เหมือนต้องการแผนที่ตัดสินใจได้ทันที',
  ],
};

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function stripBlock(text: string, open: string, close: string): string {
  return text.replace(new RegExp(`${open}[\\s\\S]*?${close}`, 'g'), '').trim();
}

function extractBlock(text: string, open: string, close: string): string | null {
  const start = text.indexOf(open);
  if (start === -1) return null;
  const end = text.indexOf(close, start + open.length);
  if (end === -1) return null;
  return text.slice(start + open.length, end).trim();
}

function parseJsonSafe<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function buildScenarioTitle(shortTitle: string | undefined, summary: string | undefined, index: number): string {
  const title = (shortTitle || '').trim();
  const genericCategories = /^(conflict|negotiation|crisis|feedback|stakeholder|timeline|communication|leadership)$/i;
  if (title && !genericCategories.test(title)) return title;

  const cleanSummary = (summary || '')
    .replace(/^[\wก-ฮ]+ ต้อง/, 'ต้อง')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleanSummary) return cleanSummary.slice(0, 52);
  return `สถานการณ์ที่ ${index + 1}`;
}

function countUserTurns(messages: ChatMsg[]): number {
  return messages.filter((m) => m.role === 'user' && m.content.trim().length > 0).length;
}

function hasUserClosingIntent(messages: ChatMsg[]): boolean {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content.toLowerCase() || '';
  return /ขอบคุณ|ขอบคุน|โอเค|ok|พอ|จบ|ไม่มีแล้ว|ไม่มีอะไร|เรียบร้อย/.test(lastUser);
}

function chatMsgToTranscriptLine(m: ChatMsg): string {
  if (m.role === 'user') return `ผู้ใช้: ${m.content}`;
  if (m.role === 'event') return `เหตุการณ์แทรกระหว่างจำลอง: ${m.content}`;
  return `คู่สนทนา (AI): ${m.content}`;
}

function toSimulationApiMessages(messages: ChatMsg[]) {
  return messages.map((m) =>
    m.role === 'event'
      ? { role: 'system', content: `เหตุการณ์แทรกระหว่างจำลองที่ต้องคำนึงถึง: ${m.content}` }
      : { role: m.role, content: m.content },
  );
}

function inferCueToneFromAssistantText(text: string): keyof typeof SIMULATION_EVENT_CUES {
  const t = text.toLowerCase();
  if (/ด่วน|เร่ง|ทันที|deadline|กำหนด|เวลา|สายแล้ว|ภายใน|วันนี้|พรุ่งนี้/.test(t)) return 'urgent';
  if (/ไม่พอใจ|ผิดหวัง|รับไม่ได้|เสียหาย|ไม่โอเค|ยกเลิก|complain|ร้องเรียน/.test(t)) return 'dissatisfied';
  if (/แน่ใจ|หลักฐาน|ข้อมูล|ชัดเจน|เชื่อถือ|แผน|รับประกัน|ทำไม/.test(t)) return 'skeptical';
  if (/ไม่อยาก|ไม่มั่นใจ|ขอคิด|ยังไม่พร้อม|เงียบ|ไม่ตอบ|ไม่สนใจ/.test(t)) return 'withdrawn';
  if (/เข้าใจ|โอเค|เห็นด้วย|ขอบคุณ|ดีขึ้น|พอได้|รับฟัง/.test(t)) return 'supportive';
  return 'skeptical';
}

function isSeniorUserRole(roleText: string): boolean {
  return /ceo|chief|founder|owner|กรรมการ|ผู้บริหาร|ประธาน|เจ้าของ|ผู้อำนวยการ|director|vp|c-level/i.test(roleText);
}

async function createSimulationEventCue(
  persona: SimulationPersona,
  assistantText: string,
  userRole: string,
): Promise<ChatMsg | null> {
  const seniorUser = isSeniorUserRole(userRole);
  try {
    const cue = await openaiChat(
      [
        {
          role: 'system',
          content:
            'คุณเป็นผู้กำกับฉาก roleplay ในแชทองค์กร สร้างเฉพาะข้อความท่าทาง/สีหน้า/ภาษากาย 1 ประโยค ภาษาไทย ไม่เกิน 120 ตัวอักษร ห้ามใส่ markdown ห้ามใส่เครื่องหมายคำพูด ห้ามเล่าบทสนทนาใหม่',
        },
        {
          role: 'user',
          content: `ตัวละคร: ${persona.name} (${persona.position})
MBTI: ${persona.mbti} — ${persona.title}
บุคลิกการพูด: ${persona.style}
อารมณ์ที่แสดงได้: ${persona.emotionStyle}
ตำแหน่ง/บทบาทผู้ใช้: ${userRole}
ข้อจำกัด: ${seniorUser ? 'ผู้ใช้เป็นผู้บริหารหรือบทบาทอาวุโส จึงต้องเป็นท่าทางสุภาพ ให้เกียรติ ไม่เคาะโต๊ะ ไม่ลุกเดินออก ไม่ทำเป็นไม่สนใจ' : 'ท่าทางต้องเหมาะกับบริบทองค์กร ไม่เกินจริง'}

คำตอบล่าสุดของตัวละคร:
${assistantText}

สร้างท่าทางใหม่ที่สอดคล้องกับคำตอบล่าสุดและ MBTI นี้โดยตรง:`,
        },
      ],
      0.55,
    );
    const cleanCue = cue.replace(/\s+/g, ' ').trim();
    if (!cleanCue) return null;
    return {
      id: uid(),
      role: 'event',
      content: `${persona.name} (${persona.position}) ${cleanCue}`,
    };
  } catch {
    return null;
  }
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)] || items[0];
}

function createSimulationPersona(seedText = '', counterpart = ''): SimulationPersona {
  const index = Math.floor(Math.random() * MBTI_PERSONAS.length);
  const base = MBTI_PERSONAS[index] || MBTI_PERSONAS[0];
  const name = pickRandom(SIMULATION_PERSONA_NAMES);
  const position = counterpart.trim() || pickRandom(SIMULATION_PERSONA_POSITIONS);
  const seed = encodeURIComponent(`${name}-${position}-${base.mbti}-${base.title}-${seedText || uid()}`);
  return {
    ...base,
    name,
    position,
    avatarUrl: `https://api.dicebear.com/9.x/adventurer/svg?seed=${seed}&backgroundColor=ffd43b,ffdf80,ffec99`,
  };
}

/** แบ่งเป็นตัวอักษรที่มองเห็นได้ (รองรับไทย / emoji) */
function toGraphemes(text: string): string[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const seg = new Intl.Segmenter('th', { granularity: 'grapheme' });
    return [...seg.segment(text)].map((s) => s.segment);
  }
  return [...text];
}

const TYPEWRITER_MS = 9;

/** แสดงข้อความทีละตัวอักษร — ใช้กับข้อความจาก AI */
const TypewriterText = React.memo(function TypewriterText({
  text,
  resetOnTextChange = true,
}: {
  text: string;
  resetOnTextChange?: boolean;
}) {
  const glyphs = useMemo(() => toGraphemes(text), [text]);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (resetOnTextChange) setCount(0);
  }, [text, resetOnTextChange]);

  useEffect(() => {
    if (count >= glyphs.length) return;
    const t = window.setTimeout(() => setCount((c) => c + 1), TYPEWRITER_MS);
    return () => clearTimeout(t);
  }, [count, glyphs.length]);

  const shown = glyphs.slice(0, count).join('');
  const active = count < glyphs.length;

  return (
    <div className="whitespace-pre-wrap inline-block max-w-full">
      <span>{shown}</span>
      {active && (
        <span
          className="inline-block w-px h-3.5 ml-px bg-yellow-400/90 align-[-2px] animate-pulse"
          aria-hidden
        />
      )}
    </div>
  );
});

const MindDojoAssessment: React.FC = () => {
  const navigate = useNavigate();
  const { loading: authLoading } = useAuth();
  const resourceHub = isAuthenticated();
  const minddojoSession = isMindDojoAssessmentLoggedIn();
  const loggedIn =
    minddojoSession || (!isSupabaseConfigured && resourceHub);

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [regPass2, setRegPass2] = useState('');
  const [loginMsg, setLoginMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);

  const [phase, setPhase] = useState<Phase>('profiling');
  const [mainMessages, setMainMessages] = useState<ChatMsg[]>([]);
  const [simMessages, setSimMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [mainStreamingId, setMainStreamingId] = useState<string | null>(null);
  const [simStreamingId, setSimStreamingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState<MindDojoProfile | null>(null);
  const [scenario, setScenario] = useState<MindDojoScenario | null>(null);
  const [randomOptions, setRandomOptions] = useState<ScenarioOption[]>([]);
  const [simPersona, setSimPersona] = useState<SimulationPersona | null>(null);
  const [showScenarioBriefing, setShowScenarioBriefing] = useState(false);

  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [mainMessages, simMessages, phase]);

  useEffect(() => {
    if (!loggedIn) return;
    if (mainMessages.length > 0) return;
    setMainMessages([{ id: uid(), role: 'assistant', content: WELCOME_ASSISTANT }]);
    setPhase('profiling');
    setProfile(null);
    setScenario(null);
    setRandomOptions([]);
    setSimPersona(null);
    setShowScenarioBriefing(false);
    setSimMessages([]);
    setError(null);
  }, [loggedIn, mainMessages.length]);

  const profileSummary = profile
    ? `ชื่อ: ${profile.name}, ตำแหน่ง/เป้าหมาย: ${profile.position}, อุตสาหกรรม: ${profile.industry}, ประสบการณ์: ${profile.experienceLevel}`
    : '';

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginMsg(null);
    const u = loginUser.trim().toLowerCase();
    if (authMode === 'register') {
      if (!isSupabaseConfigured) {
        setLoginMsg({ type: 'err', text: 'ยังไม่ได้ตั้งค่า Supabase — ใช้โหมดทดสอบ ResourceHub ไม่ได้สำหรับสมัคร' });
        return;
      }
      if (loginPass.length < 6) {
        setLoginMsg({ type: 'err', text: 'รหัสผ่านอย่างน้อย 6 ตัวอักษร' });
        return;
      }
      if (loginPass !== regPass2) {
        setLoginMsg({ type: 'err', text: 'รหัสผ่านกับยืนยันไม่ตรงกัน' });
        return;
      }
      setLoginBusy(true);
      const res = await minddojoAssessmentRegister(u, loginPass);
      setLoginBusy(false);
      if (res.ok === true) {
        setLoginMsg({ type: 'ok', text: res.message || 'สมัครสำเร็จ — รอแอดมินอนุมัติที่ /admin แล้วค่อยเข้าสู่ระบบ' });
        setAuthMode('login');
        setRegPass2('');
        setLoginPass('');
      } else {
        setLoginMsg({ type: 'err', text: res.error });
      }
      return;
    }

    if (isSupabaseConfigured) {
      setLoginBusy(true);
      const res = await minddojoAssessmentLogin(u, loginPass);
      setLoginBusy(false);
      if (res.ok === true) {
        setLoginMsg({ type: 'ok', text: 'เข้าสู่ระบบสำเร็จ' });
      } else {
        setLoginMsg({ type: 'err', text: res.error });
      }
      return;
    }

    setLoginBusy(true);
    if (validateResourceHubCredentials(loginUser.trim(), loginPass)) {
      setAuthenticated(loginUser.trim());
      setLoginMsg({ type: 'ok', text: 'เข้าสู่ระบบสำเร็จ (โหมดทดสอบ ResourceHub)' });
    } else {
      setLoginMsg({ type: 'err', text: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง (ทดสอบ: innoclub / 12345678)' });
    }
    setLoginBusy(false);
  };

  const runProfilingReply = useCallback(async (history: ChatMsg[]) => {
    const assistantId = uid();
    setMainStreamingId(assistantId);
    setMainMessages([...history, { id: assistantId, role: 'assistant', content: '' }]);

    const historyForApi = history.map((m) => ({ role: m.role, content: m.content }));

    try {
      const raw = await openaiChatStream(
        [{ role: 'system', content: PROFILING_SYSTEM }, ...historyForApi],
        0.65,
        (delta) => {
          setMainMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + delta } : m)),
          );
        },
      );

      const jsonRaw = extractBlock(raw, '[[PROFILE_READY]]', '[[/PROFILE_READY]]');
      const visible = stripBlock(raw, '\\[\\[PROFILE_READY\\]\\]', '\\[\\[/PROFILE_READY\\]\\]');

      if (jsonRaw) {
        const p = parseJsonSafe<MindDojoProfile>(jsonRaw);
        if (p?.name && p?.position && p?.industry && p?.experienceLevel) {
          setProfile(p);
          setPhase('scenario_choice');
        }
      }

      setMainMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: visible || raw } : m)),
      );
    } catch (e) {
      // Revert to user history if streaming fails.
      setMainMessages(history);
      throw e;
    } finally {
      setMainStreamingId(null);
    }
  }, []);

  const runCustomScenarioReply = useCallback(async (history: ChatMsg[], summary: string) => {
    const assistantId = uid();
    setMainStreamingId(assistantId);
    setMainMessages([...history, { id: assistantId, role: 'assistant', content: '' }]);

    const sys = `${CUSTOM_SCENARIO_SYSTEM}\n\nข้อมูลโปรไฟล์: ${summary}`;
    const historyForApi = history.map((m) => ({ role: m.role, content: m.content }));

    try {
      const raw = await openaiChatStream(
        [{ role: 'system', content: sys }, ...historyForApi],
        0.65,
        (delta) => {
          setMainMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + delta } : m)),
          );
        },
      );

      const jsonRaw = extractBlock(raw, '[[CUSTOM_SCENARIO_READY]]', '[[/CUSTOM_SCENARIO_READY]]');
      const visible = stripBlock(raw, '\\[\\[CUSTOM_SCENARIO_READY\\]\\]', '\\[\\[/CUSTOM_SCENARIO_READY\\]\\]');

      if (jsonRaw) {
        const s = parseJsonSafe<MindDojoScenario>(jsonRaw);
        if (s?.userRole && s?.counterpart && s?.context && s?.situationSummary) {
          const persona = createSimulationPersona(s.situationSummary, s.counterpart);
          setScenario(s);
          setSimPersona(persona);
          setPhase('confirm');
        }
      }

      setMainMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: visible || raw } : m)),
      );
    } catch (e) {
      setMainMessages(history);
      throw e;
    } finally {
      setMainStreamingId(null);
    }
  }, []);

  const fetchRandomScenarios = useCallback(async () => {
    if (!profile) return;
    setBusy(true);
    setError(null);
    try {
      const ctx = `ผู้ใช้: ${profile.name}, ตำแหน่ง: ${profile.position}, อุตสาหกรรม: ${profile.industry}, ประสบการณ์: ${profile.experienceLevel}`;
      const raw = await openaiChat(
        [
          {
            role: 'system',
            content:
              'คุณสร้างเฉพาะ JSON ตามรูปแบบที่ผู้ใช้กำหนด ภาษาไทย ไม่มี markdown อื่น',
          },
          { role: 'user', content: `${RANDOM_SCENARIOS_USER}\n\nบริบทผู้ใช้:\n${ctx}` },
        ],
        0.75,
      );
      const jsonRaw = extractBlock(raw, '[[SCENARIOS_JSON]]', '[[/SCENARIOS_JSON]]');
      const arr = jsonRaw ? parseJsonSafe<ScenarioOption[]>(jsonRaw) : null;
      if (Array.isArray(arr) && arr.length >= 1) {
        const normalized = arr.slice(0, RANDOM_SCENARIO_COUNT).map((o, index) => ({
          shortTitle: buildScenarioTitle(o.shortTitle, o.situationSummary, index),
          userRole: o.userRole,
          counterpart: o.counterpart,
          context: o.context,
          situationSummary: o.situationSummary,
        }));
        setRandomOptions(normalized);
        setPhase('pick_random');
        const n = normalized.length;
        setMainMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: 'assistant',
            content: `นี่คือ ${n} สถานการณ์ที่สุ่มให้ — เลือกหนึ่งข้อด้านล่าง หรือพิมพ์หมายเลข 1–${n} ในช่องแชทก็ได้ค่ะ/ครับ`,
          },
        ]);
      } else {
        setError('สร้างสถานการณ์ไม่สำเร็จ ลองอีกครั้ง');
      }
    } catch {
      setError('เชื่อมต่อ AI ไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setBusy(false);
    }
  }, [profile]);

  const loadFinalReport = useCallback(
    async (messagesForReport = simMessages) => {
      if (!profile || !scenario) return false;
      setBusy(true);
      setError(null);
      try {
        const lines = messagesForReport.map(chatMsgToTranscriptLine);
        const transcript = lines.join('\n\n');
        const report = await getMindDojoStructuredReport({ profile, scenario, simulationTranscript: transcript });
        if (!report) {
          setError('สร้างรายงานไม่สำเร็จ — ลองอีกครั้งหรือตรวจสอบการเชื่อมต่อ AI');
          return false;
        }
        const payload = {
          savedAt: Date.now(),
          profile,
          scenario,
          report,
        };
        sessionStorage.setItem(MINDDOJO_REPORT_STORAGE_KEY, JSON.stringify(payload));
        navigate('/assessment/minddojo/result', { replace: true });
        return true;
      } catch {
        setError('โหลดผลการประเมินไม่สำเร็จ');
        return false;
      } finally {
        setBusy(false);
      }
    },
    [profile, scenario, simMessages, navigate],
  );

  const startSimulation = useCallback(async () => {
    if (!profile || !scenario) return;
    const persona = simPersona || createSimulationPersona(scenario.situationSummary, scenario.counterpart);
    if (!simPersona) setSimPersona(persona);
    setPhase('simulation');
    setShowScenarioBriefing(true);
    setSimMessages([]);
    setBusy(true);
    setError(null);
    try {
      const assistantId = uid();
      const sys = simulationSystem({
        userRole: scenario.userRole,
        counterpart: scenario.counterpart,
        context: scenario.context,
        situationSummary: scenario.situationSummary,
        profileSummary,
        personaName: persona.name,
        personaPosition: persona.position,
        personaMbti: persona.mbti,
        personaTitle: persona.title,
        personaStyle: persona.style,
        personaEmotionStyle: persona.emotionStyle,
      });

      setSimStreamingId(assistantId);
      setSimMessages([{ id: assistantId, role: 'assistant', content: '' }]);

      const raw = await openaiChatStream(
        [
          { role: 'system', content: sys },
          {
            role: 'user',
            content:
              `เริ่มจำลองสถานการณ์ทันที

คุณต้องเป็นฝ่ายเปิดฉากเองทั้งหมดในบทบาทคู่สนทนา ห้ามให้ผู้ใช้อธิบายสถานการณ์แทน

ข้อความแรกต้องเป็นแชทที่คนจริงพิมพ์หาผู้ใช้โดยตรง ไม่ใช่บทบรรยายฉาก เพราะ UI แสดงกล่องบริบทสถานการณ์ให้ผู้ใช้เห็นแล้ว

ข้อความแรกควร:
- พูดจากมุมของตัวละครด้วยชื่อ/ตำแหน่งที่กำหนด
- อ้างถึงปัญหาและผลกระทบแบบสั้น ๆ
- แสดงอารมณ์ตามบุคลิก เช่น กังวล เร่ง ดุดัน ลังเล หรือผิดหวังพอประมาณ
- ปิดท้ายด้วยคำถามให้ผู้ใช้ตัดสินใจ/ตอบสนอง

หลังจากผู้ใช้ตอบแล้ว ต้องคุยต่อให้มีหลักฐานครบทั้ง 6 ด้านและอย่างน้อย ${MIN_SIMULATION_USER_TURNS} คำตอบจากผู้ใช้ก่อนจบ ห้ามส่ง [[SIM_END]] ในข้อความแรก
ห้ามบรรยายท่าทางหรือฉาก เช่น "เดินเข้ามา", "หยุดนิดหนึ่ง", "สีหน้ากังวล" และห้ามเขียนแบบนิยาย
ห้ามใช้ประโยคแนว "ช่วยอธิบายสถานการณ์ให้ฟังหน่อย", "ตอนนี้เกิดอะไรขึ้น", "คุณอยากเริ่มอย่างไร" หรือ "ช่วยบอกบริบทเพิ่มเติม"
พูดเป็นตัวละครจริงเท่านั้น ไม่ต้องอธิบายกติกา`,
          },
        ],
        0.7,
        (delta) => {
          setSimMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + delta } : m)),
          );
        },
      );

      const ended = false;
      const visible = raw.replace(/\[\[SIM_END\]\]/g, '').trim();
      const first: ChatMsg = { id: assistantId, role: 'assistant', content: visible };
      const doneMsg: ChatMsg = {
        id: uid(),
        role: 'assistant',
        content:
          'การประเมินเสร็จสิ้นแล้ว พิมพ์คำว่า **result** เพื่อเปิดหน้า Dashboard ผลการประเมิน (คะแนน 6 ด้านการสื่อสาร)',
      };

      setSimMessages(ended ? [first, doneMsg] : [first]);
      if (ended) setPhase('awaiting_result');
    } catch {
      setError('เริ่มจำลองไม่สำเร็จ');
      setPhase('confirm');
      setSimMessages([]);
    } finally {
      setSimStreamingId(null);
      setBusy(false);
    }
  }, [profile, scenario, profileSummary, simPersona]);

  const runSimulationReply = useCallback(
    async (history: ChatMsg[]) => {
      if (!profile || !scenario) return;
      const persona = simPersona || createSimulationPersona(scenario.situationSummary, scenario.counterpart);
      if (!simPersona) setSimPersona(persona);

      const assistantId = uid();
      setSimStreamingId(assistantId);
      setSimMessages([...history, { id: assistantId, role: 'assistant', content: '' }]);

      const sys = simulationSystem({
        userRole: scenario.userRole,
        counterpart: scenario.counterpart,
        context: scenario.context,
        situationSummary: scenario.situationSummary,
        profileSummary,
        personaName: persona.name,
        personaPosition: persona.position,
        personaMbti: persona.mbti,
        personaTitle: persona.title,
        personaStyle: persona.style,
        personaEmotionStyle: persona.emotionStyle,
      });
      const userTurnCount = countUserTurns(history);
      const canEndSimulation =
        userTurnCount >= MIN_SIMULATION_USER_TURNS || (userTurnCount >= 2 && hasUserClosingIntent(history));
      const completionGuard =
        !canEndSimulation
          ? `ตอนนี้ผู้ใช้ตอบใน simulation แล้ว ${userTurnCount}/${MIN_SIMULATION_USER_TURNS} รอบ ยังห้ามจบและห้ามส่ง [[SIM_END]] ให้ถามต่อเพื่อเก็บหลักฐานครบทั้ง 6 ด้านอย่างเป็นธรรมชาติ`
          : `ตอนนี้ผู้ใช้ตอบใน simulation แล้ว ${userTurnCount} รอบ ถ้าบทสนทนาลงเอยแล้วหรือผู้ใช้ส่งสัญญาณปิดบทสนทนา ให้ปิดฉากอย่างเป็นธรรมชาติแล้วส่ง [[SIM_END]] เพื่อแสดงปุ่มดูผลลัพธ์`;
      const historyForApi = toSimulationApiMessages(history);

      try {
        const raw = await openaiChatStream(
          [{ role: 'system', content: sys }, { role: 'system', content: completionGuard }, ...historyForApi],
          0.7,
          (delta) => {
            setSimMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + delta } : m)),
            );
          },
        );

        const ended = raw.includes('[[SIM_END]]') && canEndSimulation;
        const visible = raw.replace(/\[\[SIM_END\]\]/g, '').trim();
        const assistantMsg: ChatMsg = { id: assistantId, role: 'assistant', content: visible || raw };
        const eventMsg =
          !ended && userTurnCount >= 1
            ? await createSimulationEventCue(persona, assistantMsg.content, `${profile.position} ${scenario.userRole}`)
            : null;
        const finalMessages = eventMsg ? [...history, assistantMsg, eventMsg] : [...history, assistantMsg];
        setSimMessages(finalMessages);
        if (ended) {
          setPhase('awaiting_result');
        }
      } catch (e) {
        // revert to user history (remove empty assistant placeholder)
        setSimMessages(history);
        throw e;
      } finally {
        setSimStreamingId(null);
      }
    },
    [profile, scenario, profileSummary, simPersona, loadFinalReport],
  );

  const onSend = async () => {
    const text = input.trim();
    if (!text || busy) return;

    if (phase === 'pick_random') {
      const choice = parseInt(text.trim(), 10);
      if (
        Number.isInteger(choice) &&
        choice >= 1 &&
        choice <= randomOptions.length
      ) {
        const idx = choice - 1;
        const opt = randomOptions[idx];
        if (opt) {
          const persona = createSimulationPersona(`${opt.shortTitle}-${opt.situationSummary}`, opt.counterpart);
          setInput('');
          setScenario({
            userRole: opt.userRole,
            counterpart: opt.counterpart,
            context: opt.context,
            situationSummary: opt.situationSummary,
          });
          setSimPersona(persona);
          setPhase('confirm');
          setMainMessages((prev) => [
            ...prev,
            { id: uid(), role: 'user', content: text.trim() },
            {
              id: uid(),
              role: 'assistant',
              content: `เลือกสถานการณ์: **${opt.shortTitle}**\n\nคู่สนทนาที่สุ่มให้: **${persona.name} • ${persona.position} • ${persona.mbti}**\nบุคลิก: ${persona.title} — ${persona.style}\n\nกดยืนยันด้านล่างเมื่อพร้อมเริ่มจำลองค่ะ/ครับ`,
            },
          ]);
        }
        return;
      }
    }

    setInput('');
    setError(null);

    try {
      if (phase === 'profiling') {
        const userMsg = { id: uid(), role: 'user' as const, content: text };
        const historyAfterUser = [...mainMessages, userMsg];
        flushSync(() => {
          setMainMessages(historyAfterUser);
          setBusy(true);
        });
        await runProfilingReply(historyAfterUser);
      } else if (phase === 'custom_profiling') {
        const userMsg = { id: uid(), role: 'user' as const, content: text };
        const historyAfterUser = [...mainMessages, userMsg];
        const summary =
          profile != null
            ? `ชื่อ: ${profile.name}, ตำแหน่ง/เป้าหมาย: ${profile.position}, อุตสาหกรรม: ${profile.industry}, ประสบการณ์: ${profile.experienceLevel}`
            : profileSummary;
        flushSync(() => {
          setMainMessages(historyAfterUser);
          setBusy(true);
        });
        await runCustomScenarioReply(historyAfterUser, summary);
      } else if (phase === 'simulation') {
        const userMsg = { id: uid(), role: 'user' as const, content: text };
        const historyAfterUser = [...simMessages, userMsg];
        flushSync(() => {
          setSimMessages(historyAfterUser);
          setBusy(true);
        });
        await runSimulationReply(historyAfterUser);
      }
    } catch {
      setError('ส่งข้อความไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void onSend();
    }
  };

  if (authLoading && !resourceHub && !isMindDojoAssessmentLoggedIn()) {
    return (
      <div className="min-h-[100dvh] bg-transparent text-white flex items-center justify-center bg-grid">
        <p className="text-zinc-400 text-sm">กำลังตรวจสอบการเข้าสู่ระบบ...</p>
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <div className="min-h-[100dvh] bg-transparent text-white bg-grid flex flex-col">
        <header className="px-4 py-3 border-b border-white/10 flex items-center justify-between max-w-md mx-auto w-full">
          <Link to="/" className="text-gray-400 hover:text-white text-sm">
            ← กลับหน้าหลัก
          </Link>
          <span className="text-yellow-400 text-sm font-semibold">MindDoJo AI Assessment</span>
        </header>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-neutral-900/80 border border-white/10 rounded-[28px] p-8 shadow-2xl backdrop-blur-sm">
            <div className="flex flex-col items-center mb-6">
              <div className="w-12 h-12 bg-yellow-400 rounded-xl flex items-center justify-center mb-3">
                <span className="text-black font-bold text-xl">M</span>
              </div>
              <h1 className="text-xl font-semibold text-center">MindDoJo AI Assessment</h1>
              <p className="text-gray-500 text-sm mt-2 text-center">
                สมัครสมาชิกด้วย username / รหัสผ่าน

              </p>
            </div>
            <div className="flex rounded-xl bg-white/5 p-1 mb-4">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setLoginMsg(null);
                }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  authMode === 'login' ? 'bg-yellow-400 text-black' : 'text-gray-400 hover:text-white'
                }`}
              >
                เข้าสู่ระบบ
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setLoginMsg(null);
                }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  authMode === 'register' ? 'bg-yellow-400 text-black' : 'text-gray-400 hover:text-white'
                }`}
              >
                สมัครสมาชิก
              </button>
            </div>
            <form onSubmit={(e) => void handleAuthSubmit(e)} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Username</label>
                <input
                  value={loginUser}
                  onChange={(e) => setLoginUser(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-yellow-400 focus:outline-none font-mono text-sm"
                  autoComplete="username"
                  placeholder="เฉพาะ a-z ตัวเลข _ (3–32 ตัว)"
                  minLength={3}
                  maxLength={32}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">รหัสผ่าน</label>
                <input
                  type="password"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-yellow-400 focus:outline-none"
                  autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
                  required
                  minLength={authMode === 'register' ? 6 : undefined}
                />
              </div>
              {authMode === 'register' && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1">ยืนยันรหัสผ่าน</label>
                  <input
                    type="password"
                    value={regPass2}
                    onChange={(e) => setRegPass2(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-yellow-400 focus:outline-none"
                    autoComplete="new-password"
                    required
                    minLength={6}
                  />
                </div>
              )}
              {loginMsg && (
                <div
                  className={`text-sm p-3 rounded-xl ${
                    loginMsg.type === 'ok' ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
                  }`}
                >
                  {loginMsg.text}
                </div>
              )}
              {!isSupabaseConfigured && (
                <p className="text-xs text-amber-400/90 bg-amber-500/10 rounded-xl p-3">
                  ยังไม่ได้ตั้ง VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — สมัครและล็อกอิน Assessment ใช้ไม่ได้จนกว่าจะตั้งค่า รัน SQL และ deploy Edge Function{' '}
                  <code className="text-amber-200/90">minddojo-assessment-auth</code> (แนะนำปิด JWT verify สำหรับฟังก์ชันนี้หรือใช้{' '}
                  <code className="text-amber-200/90">--no-verify-jwt</code> ตอน deploy)
                </p>
              )}
              <button
                type="submit"
                disabled={loginBusy || (authMode === 'register' && !isSupabaseConfigured)}
                className="w-full py-3 rounded-xl font-bold bg-yellow-400 text-black hover:bg-yellow-300 disabled:opacity-60"
              >
                {loginBusy
                  ? 'กำลังดำเนินการ...'
                  : authMode === 'register'
                    ? 'ส่งคำขอสมัคร'
                    : 'เข้าสู่ระบบ'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const showMainChat =
    phase === 'profiling' ||
    phase === 'scenario_choice' ||
    phase === 'pick_random' ||
    phase === 'custom_profiling' ||
    phase === 'confirm';
  const showSimChat = phase === 'simulation' || phase === 'awaiting_result';

  const lastMainMessageId = mainMessages[mainMessages.length - 1]?.id;
  const lastSimMessageId = simMessages[simMessages.length - 1]?.id;

  return (
    <div className="h-[100dvh] max-h-[100dvh] flex flex-col overflow-hidden bg-transparent text-white bg-grid">
      <header className="shrink-0 px-3 sm:px-4 lg:px-8 xl:px-10 py-2 sm:py-2.5 border-b border-white/10 flex items-center gap-2 w-full max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[min(90rem,calc(100vw-3rem))] mx-auto">
        <Link
          to="/"
          className="text-gray-400 hover:text-white text-xs sm:text-sm shrink-0 touch-manipulation py-1"
        >
          ← กลับ
        </Link>
        <div className="flex-1 min-w-0 text-center px-1">
          <h1 className="text-sm sm:text-base lg:text-lg font-bold text-yellow-400 truncate leading-tight">
            MindDoJo AI Assessment
          </h1>
          <p className="text-[10px] sm:text-xs lg:text-sm text-gray-500 truncate leading-tight mt-0.5 hidden sm:block">
            สื่อสาร · ตัดสินใจ · รับมือสถานการณ์
          </p>
        </div>
        <div className="shrink-0 flex items-center justify-end min-w-[4.5rem]">
          {isMindDojoAssessmentLoggedIn() && (
            <button
              type="button"
              onClick={() => {
                clearMindDojoAssessmentSession();
                window.location.reload();
              }}
              className="text-[10px] sm:text-xs text-gray-500 hover:text-white underline touch-manipulation"
            >
              ออกจากระบบ
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col min-h-0 w-full max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[min(90rem,calc(100vw-3rem))] mx-auto px-2.5 sm:px-4 lg:px-8 xl:px-10 pt-2 lg:pt-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="flex-1 flex flex-col min-h-0 gap-2 overflow-hidden">
            <div className="flex-1 min-h-0 flex flex-col rounded-2xl border border-white/10 bg-zinc-950/45 backdrop-blur-md overflow-hidden ring-1 ring-white/5 shadow-lg shadow-black/30">
              <div
                ref={chatScrollRef}
                className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain p-3 sm:p-4 lg:p-5 xl:p-6 space-y-2.5 sm:space-y-3 lg:space-y-4 touch-pan-y [scrollbar-gutter:stable]"
              >
                {showMainChat && (
                  <>
                    <p className="text-[10px] sm:text-xs lg:text-sm text-gray-500 uppercase tracking-wider">
                      บทสนทนา
                    </p>
                    {mainMessages.map((m) =>
                      m.role === 'assistant' ? (
                        <div
                          key={m.id}
                          className="flex w-full justify-start gap-2 sm:gap-3 items-start"
                        >
                          <img
                            src={MINDDOJO_CHATBOT_AVATAR_URL}
                            alt="MindDoJo"
                            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover shrink-0 ring-2 ring-white/15 shadow-md shadow-black/20 mt-0.5"
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0 max-w-[min(100%,42rem)] rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3 lg:px-5 lg:py-3.5 text-sm lg:text-base leading-relaxed bg-white/5">
                            <span className="text-[10px] lg:text-xs font-semibold text-gray-500 block mb-1">
                              MindDoJo
                            </span>
                            {m.id === lastMainMessageId ? (
                              <TypewriterText text={m.content} resetOnTextChange={false} />
                            ) : (
                              <div className="whitespace-pre-wrap break-words">{m.content}</div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div key={m.id} className="flex w-full justify-end">
                          <div className="max-w-[min(92%,36rem)] rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3 lg:px-5 lg:py-3.5 text-sm lg:text-base leading-relaxed bg-yellow-400/15 text-left">
                            <span className="text-[10px] lg:text-xs font-semibold text-gray-500 block mb-1">คุณ</span>
                            <div className="whitespace-pre-wrap break-words">{m.content}</div>
                          </div>
                        </div>
                      ),
                    )}
                  </>
                )}

                {phase === 'scenario_choice' && (
                  <div className="space-y-2 pt-1">
                    <p className="text-xs sm:text-sm text-gray-300">เลือกวิธีเริ่มสถานการณ์</p>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setMainMessages((prev) => [
                            ...prev,
                            {
                              id: uid(),
                              role: 'assistant',
                              content: `รับทราบค่ะ/ครับ — กำลังสุ่มสถานการณ์ให้ ${RANDOM_SCENARIO_COUNT} แบบจากบริบทของคุณ รอสักครู่นะคะ/ครับ`,
                            },
                          ]);
                          void fetchRandomScenarios();
                        }}
                        className="flex-1 py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl font-bold bg-yellow-400 text-black hover:bg-yellow-300 disabled:opacity-50 text-sm touch-manipulation"
                      >
                        {busy ? 'กำลังสุ่มสถานการณ์...' : 'สุ่มสถานการณ์ (10 ตัวเลือก)'}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setPhase('custom_profiling');
                          setMainMessages((prev) => [
                            ...prev,
                            {
                              id: uid(),
                              role: 'assistant',
                              content:
                                'เยี่ยมเลย — เรามาออกแบบสถานการณ์ของคุณเองกันค่ะ/ครับ อยากคุยกับใครในที่ทำงาน (เช่น หัวหน้า ลูกค้า เพื่อนร่วมงาน)?',
                            },
                          ]);
                        }}
                        className="flex-1 py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl font-bold bg-white/10 border border-white/15 hover:bg-white/15 disabled:opacity-50 text-sm touch-manipulation"
                      >
                        สร้างสถานการณ์เอง
                      </button>
                    </div>
                    {busy && (
                      <div
                        role="status"
                        aria-live="polite"
                        className="mt-3 flex items-center gap-3 rounded-xl border border-yellow-400/20 bg-yellow-400/10 px-4 py-3 text-xs sm:text-sm text-yellow-100"
                      >
                        <span className="relative flex h-3 w-3 shrink-0">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400 opacity-60" />
                          <span className="relative inline-flex h-3 w-3 rounded-full bg-yellow-300" />
                        </span>
                        <span>กำลังสร้างสถานการณ์ 10 แบบจากบริบทของคุณ กรุณารอสักครู่...</span>
                      </div>
                    )}
                  </div>
                )}

                {phase === 'pick_random' && randomOptions.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 pt-1">
                    {randomOptions.map((opt, i) => (
                      <button
                        key={i}
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          const { shortTitle, ...sc } = opt;
                          const persona = createSimulationPersona(`${shortTitle}-${sc.situationSummary}`, sc.counterpart);
                          setScenario(sc);
                          setSimPersona(persona);
                          setPhase('confirm');
                          setMainMessages((prev) => [
                            ...prev,
                            {
                              id: uid(),
                              role: 'user',
                              content: `เลือกข้อ ${i + 1}: ${shortTitle}`,
                            },
                            {
                              id: uid(),
                              role: 'assistant',
                              content: `สรุปสถานการณ์ที่เลือก:\n\n• **${shortTitle}**\n• บทบาทคุณ: ${sc.userRole}\n• คู่สนทนา: ${sc.counterpart}\n• บริบท: ${sc.context}\n• ${sc.situationSummary}\n\nคู่สนทนาที่สุ่มให้: **${persona.name} • ${persona.position} • ${persona.mbti}**\nบุคลิก: ${persona.title} — ${persona.style}\n\nกด «ยืนยันและเริ่มจำลอง» เมื่อพร้อม`,
                            },
                          ]);
                        }}
                        className="text-left rounded-xl border border-white/15 bg-white/5 hover:border-yellow-400/40 hover:bg-white/[0.08] p-3 sm:p-4 transition-colors disabled:opacity-50 touch-manipulation"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-yellow-400 font-bold text-xs sm:text-sm">
                            {i + 1}. {opt.shortTitle}
                          </span>
                          <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gray-400">
                            {opt.context}
                          </span>
                        </div>
                        <p className="text-gray-400 text-[11px] sm:text-xs mt-1.5 line-clamp-4">
                          {opt.situationSummary}
                        </p>
                      </button>
                    ))}
                  </div>
                )}

                {phase === 'confirm' && scenario && (
                  <div className="rounded-xl sm:rounded-2xl border border-white/15 bg-white/[0.06] p-4 sm:p-5">
                    <h3 className="font-bold text-white text-sm sm:text-base mb-2 sm:mb-3">ยืนยันก่อนเริ่ม</h3>
                    <ul className="text-xs sm:text-sm text-gray-300 space-y-1.5 list-disc list-inside mb-3 sm:mb-4">
                      <li>บทบาทคุณ: {scenario.userRole}</li>
                      <li>คู่สนทนา: {scenario.counterpart}</li>
                      <li>บริบท: {scenario.context}</li>
                      <li>{scenario.situationSummary}</li>
                    </ul>
                    {simPersona && (
                      <div className="mb-3 sm:mb-4 flex items-center gap-3 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3">
                        <img
                          src={simPersona.avatarUrl}
                          alt={`${simPersona.mbti} avatar`}
                          className="h-12 w-12 rounded-full bg-white/90 object-cover ring-2 ring-amber-300/50"
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-bold text-amber-100">
                            {simPersona.name} • {simPersona.position} • {simPersona.mbti}
                          </p>
                          <p className="text-[11px] sm:text-xs text-amber-100/75">
                            {simPersona.title} — {simPersona.style}
                          </p>
                        </div>
                      </div>
                    )}
                    <p className="text-gray-500 text-xs sm:text-sm mb-3 sm:mb-4">ต้องการเริ่มสถานการณ์นี้เลยไหม?</p>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void startSimulation()}
                      className="w-full sm:w-auto py-2.5 sm:py-3 px-5 sm:px-6 rounded-xl font-bold bg-yellow-400 text-black hover:bg-yellow-300 disabled:opacity-50 text-sm touch-manipulation"
                    >
                      ยืนยันและเริ่มจำลอง
                    </button>
                  </div>
                )}

                {showSimChat && (
                  <>
                    <p className="text-[10px] sm:text-xs lg:text-sm text-amber-400/90 uppercase tracking-wider pt-1 border-t border-white/10 mt-1">
                      จำลองสถานการณ์
                    </p>
                    {scenario && !showScenarioBriefing && (
                      <button
                        type="button"
                        onClick={() => setShowScenarioBriefing(true)}
                        className="self-start rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs sm:text-sm font-semibold text-amber-100 hover:bg-amber-400/15 touch-manipulation"
                      >
                        แสดงบริบทสถานการณ์
                      </button>
                    )}
                    {scenario && showScenarioBriefing && (
                      <div className="rounded-xl sm:rounded-2xl border border-amber-400/25 bg-zinc-950/90 p-4 sm:p-5 shadow-xl shadow-black/25 ring-1 ring-amber-400/10">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <p className="text-[10px] sm:text-xs uppercase tracking-wider text-amber-300 font-bold">
                              บริบทสถานการณ์
                            </p>
                            <h3 className="text-sm sm:text-base font-bold text-white mt-1">
                              อ่านภาพรวมก่อนตอบในแชท
                            </h3>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowScenarioBriefing(false)}
                            className="shrink-0 rounded-lg border border-white/10 px-2 py-1 text-[11px] text-gray-400 hover:text-white hover:bg-white/10"
                          >
                            ซ่อน
                          </button>
                        </div>
                        {simPersona && (
                          <div className="mb-3 flex items-center gap-3 rounded-xl bg-amber-400/10 p-3">
                            <img
                              src={simPersona.avatarUrl}
                              alt={`${simPersona.mbti} avatar`}
                              className="h-11 w-11 rounded-full bg-white object-cover ring-2 ring-amber-300/50"
                              loading="lazy"
                              decoding="async"
                              referrerPolicy="no-referrer"
                            />
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-bold text-amber-100">
                                {simPersona.name} • {simPersona.position} • {simPersona.mbti}
                              </p>
                              <p className="text-[11px] sm:text-xs text-amber-100/75">
                                {simPersona.title} — {simPersona.style}
                              </p>
                            </div>
                          </div>
                        )}
                        <div className="grid gap-2 text-xs sm:text-sm text-gray-300">
                          <p>
                            <span className="text-gray-500">บทบาทคุณ:</span> {scenario.userRole}
                          </p>
                          <p>
                            <span className="text-gray-500">คู่สนทนา:</span> {scenario.counterpart}
                          </p>
                          <p>
                            <span className="text-gray-500">บริบท:</span> {scenario.context}
                          </p>
                          <p className="leading-relaxed">
                            <span className="text-gray-500">เหตุการณ์:</span> {scenario.situationSummary}
                          </p>
                        </div>
                      </div>
                    )}
                    {simMessages.map((m) =>
                      m.role === 'event' ? (
                        <div
                          key={m.id}
                          className="mx-auto max-w-[min(100%,40rem)] rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-xs sm:text-sm text-amber-50 shadow-lg shadow-black/20"
                        >
                          <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-300 mb-1">
                            {simPersona ? `ท่าทางของ ${simPersona.name}` : 'ท่าทางของคู่สนทนา'}
                          </div>
                          <div className="leading-relaxed">{m.content}</div>
                        </div>
                      ) : m.role === 'assistant' ? (
                        <div
                          key={m.id}
                          className="flex w-full justify-start gap-2 sm:gap-3 items-start"
                        >
                          <img
                            src={simPersona?.avatarUrl || MINDDOJO_CHATBOT_AVATAR_URL}
                            alt={simPersona ? `${simPersona.mbti} avatar` : 'MindDoJo'}
                            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white object-cover shrink-0 ring-2 ring-amber-400/25 shadow-md shadow-black/20 mt-0.5"
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0 max-w-[min(100%,42rem)] rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3 lg:px-5 lg:py-3.5 text-sm lg:text-base leading-relaxed bg-white/5">
                            <span className="text-[10px] lg:text-xs font-semibold text-gray-500 block mb-1">
                              {simPersona ? `${simPersona.name} • ${simPersona.position} • ${simPersona.mbti}` : 'สถานการณ์'}
                            </span>
                            {m.id === lastSimMessageId ? (
                              <TypewriterText text={m.content} resetOnTextChange={false} />
                            ) : (
                              <div className="whitespace-pre-wrap break-words">{m.content}</div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div key={m.id} className="flex w-full justify-end">
                          <div className="max-w-[min(92%,36rem)] rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3 lg:px-5 lg:py-3.5 text-sm lg:text-base leading-relaxed bg-amber-400/10 text-left">
                            <span className="text-[10px] lg:text-xs font-semibold text-gray-500 block mb-1">คุณ</span>
                            <div className="whitespace-pre-wrap break-words">{m.content}</div>
                          </div>
                        </div>
                      ),
                    )}
                    {phase === 'awaiting_result' && (
                      <div className="rounded-xl sm:rounded-2xl border border-yellow-400/25 bg-yellow-400/10 p-4 sm:p-5">
                        <p className="text-sm sm:text-base font-semibold text-yellow-100 mb-2">
                          การจำลองเสร็จแล้ว
                        </p>
                        <p className="text-xs sm:text-sm text-yellow-100/80 mb-3 sm:mb-4">
                          กดปุ่มด้านล่างเพื่อสร้าง Dashboard ผลการประเมิน 6 ด้านการสื่อสาร
                        </p>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void loadFinalReport()}
                          className="w-full sm:w-auto py-2.5 sm:py-3 px-5 sm:px-6 rounded-xl font-bold bg-yellow-400 text-black hover:bg-yellow-300 disabled:opacity-50 text-sm touch-manipulation"
                        >
                          {busy ? 'กำลังสร้างผลลัพธ์...' : 'ดูผลลัพธ์'}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {error && (
              <div className="shrink-0 text-xs sm:text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                {error}
              </div>
            )}

            <div className="shrink-0 pt-1 border-t border-white/10">
              {phase === 'awaiting_result' && (
                <p className="text-[10px] sm:text-xs text-gray-500 mb-1.5 px-0.5">
                  การจำลองเสร็จแล้ว กดปุ่มเพื่อสร้าง Dashboard ผลการประเมิน
                </p>
              )}
              <div className="flex gap-2 items-end">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  disabled={busy || phase === 'scenario_choice' || phase === 'confirm' || phase === 'awaiting_result'}
                  placeholder={
                    phase === 'awaiting_result'
                      ? 'พร้อมดูผลลัพธ์'
                      : phase === 'simulation'
                        ? 'ตอบในสถานการณ์...'
                        : 'พิมพ์ข้อความ...'
                  }
                  rows={2}
                  className="flex-1 min-h-[44px] lg:min-h-[52px] max-h-28 lg:max-h-40 rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 lg:px-4 lg:py-3 text-base sm:text-sm lg:text-base text-white placeholder-gray-500 focus:border-yellow-400 focus:outline-none resize-y disabled:opacity-50 leading-snug"
                />
                <button
                  type="button"
                  disabled={
                    busy || !input.trim() || phase === 'scenario_choice' || phase === 'confirm' || phase === 'awaiting_result'
                  }
                  onClick={() => void onSend()}
                  className="shrink-0 min-h-[44px] min-w-[4.5rem] px-4 rounded-xl font-bold bg-yellow-400 text-black hover:bg-yellow-300 disabled:opacity-50 text-sm sm:text-base touch-manipulation"
                >
                  ส่ง
                </button>
              </div>
            </div>
        </div>
      </main>
    </div>
  );
};

export default MindDojoAssessment;
