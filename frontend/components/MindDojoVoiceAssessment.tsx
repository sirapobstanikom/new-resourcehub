import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { Bot, Keyboard, Mic, MicOff, PhoneOff, Volume2, VolumeX } from 'lucide-react';
import BrandLogo from './BrandLogo';
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
import {
  attachSpeechEndHandler,
  enqueueHumanThai,
  isHumanSpeechBusy,
  setHumanSpeechGender,
  setHumanSpeechRate,
  speakHumanThai,
  stopHumanSpeech,
  stripMarkdownForSpeech,
  subscribeSpeechLevel,
  type SpeechGender,
} from '../lib/humanSpeech';

type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};

function getSpeechRecognitionCtor(): (new () => BrowserSpeechRecognition) | null {
  const w = window as Window & {
    SpeechRecognition?: new () => BrowserSpeechRecognition;
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

function formatCallTimer(totalSec: number): string {
  const m = Math.floor(totalSec / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.floor(totalSec % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
}

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
  gender: SpeechGender;
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
  'สวัสดีค่ะ ยินดีต้อนรับสู่สายวิดีโอ AI Chat Bot Demo ค่ะ คุยกันแบบวิดีโอคอลได้เลย กดไมค์เพื่อพูด แล้วฉันจะตอบด้วยเสียง\n\nเรามาทำความรู้จักกันก่อนนะคะ แล้วค่อยเข้าสู่สถานการณ์จำลอง เมื่อจบจะได้ Dashboard คะแนน 6 ด้านการสื่อสาร\n\nขอทราบชื่อที่อยากให้เรียกก่อนได้ไหมคะ?';

const MBTI_PERSONAS: Omit<SimulationPersona, 'name' | 'gender' | 'position' | 'avatarUrl'>[] = [
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

const SIMULATION_PERSONA_NAMES: { name: string; gender: SpeechGender }[] = [
  { name: 'คุณอร', gender: 'female' },
  { name: 'คุณนนท์', gender: 'male' },
  { name: 'คุณมิน', gender: 'female' },
  { name: 'คุณธาม', gender: 'male' },
  { name: 'คุณแพรว', gender: 'female' },
  { name: 'คุณกานต์', gender: 'male' },
  { name: 'คุณบีม', gender: 'male' },
  { name: 'คุณพิม', gender: 'female' },
  { name: 'คุณวิน', gender: 'male' },
  { name: 'คุณเมย์', gender: 'female' },
  { name: 'คุณเรย์', gender: 'male' },
  { name: 'คุณฟ้า', gender: 'female' },
];

function inferGenderFromCounterpart(counterpart: string): SpeechGender | null {
  const t = counterpart.trim();
  if (!t) return null;
  if (/นางสาว|นาง\b|พี่สาว|น้องสาว|คุณหญิง|สาว\b|หญิง|แม่|Mrs\.|Ms\.|Miss\b/i.test(t)) return 'female';
  if (/นาย\b|พี่ชาย|น้องชาย|ชาย\b|พ่อ|คุณชาย|Mr\.|Sir\b/i.test(t)) return 'male';
  return null;
}

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
  const inferred = inferGenderFromCounterpart(counterpart);
  const namePool = inferred
    ? SIMULATION_PERSONA_NAMES.filter((n) => n.gender === inferred)
    : SIMULATION_PERSONA_NAMES;
  const picked = pickRandom(namePool.length ? namePool : SIMULATION_PERSONA_NAMES);
  const position = counterpart.trim() || pickRandom(SIMULATION_PERSONA_POSITIONS);
  const seed = encodeURIComponent(
    `${picked.name}-${picked.gender}-${position}-${base.mbti}-${base.title}-${seedText || uid()}`,
  );
  return {
    ...base,
    name: picked.name,
    gender: picked.gender,
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

const MindDojoVoiceAssessment: React.FC = () => {
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
  const [micOn, setMicOn] = useState(false); // เริ่มปิด — กดสลับเปิด/ปิด
  const [listening, setListening] = useState(false);
  const [voiceOutEnabled, setVoiceOutEnabled] = useState(true);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(0);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);
  const [awaitingSpeechEnd, setAwaitingSpeechEnd] = useState(false);
  const [autoDemo, setAutoDemo] = useState(false);
  const [autoKick, setAutoKick] = useState(0);
  const [autoSpeed, setAutoSpeed] = useState<1 | 2 | 3>(1);

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const spokenIdsRef = useRef<Set<string>>(new Set());
  const inputRef = useRef(input);
  const onSendRef = useRef<(text?: string) => void>(() => {});
  const micOnRef = useRef(false);
  const busyRef = useRef(false);
  const aiSpeakingRef = useRef(false);
  const pendingSpeechRef = useRef('');
  const interimSpeechRef = useRef('');
  const committingRef = useRef(false);
  const restartTimerRef = useRef<number | null>(null);
  const endSpeechTimerRef = useRef<number | null>(null);
  const autoDemoRef = useRef(false);
  const autoSpeedRef = useRef<1 | 2 | 3>(1);
  const voiceOutEnabledRef = useRef(true);
  const autoLockRef = useRef(false);
  const lastAutoHandledRef = useRef<string>('');
  /** หน่วงสั้นหลังได้ยินเสียงล่าสุด — กันตัดกลางประโยค แต่ยัง auto ส่งเมื่อพูดจบ */
  const END_OF_SPEECH_MS = 900;
  inputRef.current = input;
  micOnRef.current = micOn;
  busyRef.current = busy;
  aiSpeakingRef.current = aiSpeaking;
  autoDemoRef.current = autoDemo;
  autoSpeedRef.current = autoSpeed;
  voiceOutEnabledRef.current = voiceOutEnabled;

  const kickAutoDemo = useCallback(() => {
    setAutoKick((k) => k + 1);
  }, []);

  useEffect(() => {
    setSpeechSupported(Boolean(getSpeechRecognitionCtor()));
    // Chrome loads voices async
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      const onVoices = () => window.speechSynthesis.getVoices();
      window.speechSynthesis.addEventListener('voiceschanged', onVoices);
      return () => window.speechSynthesis.removeEventListener('voiceschanged', onVoices);
    }
  }, []);

  // ระดับเสียง TTS → ขยับปากคาตูน
  useEffect(() => {
    return subscribeSpeechLevel((level) => {
      setMouthOpen(level);
    });
  }, []);

  useEffect(() => {
    if (aiSpeaking) return;
    setMouthOpen(0);
  }, [aiSpeaking]);

  useEffect(() => {
    return () => {
      micOnRef.current = false;
      committingRef.current = false;
      if (restartTimerRef.current != null) window.clearTimeout(restartTimerRef.current);
      if (endSpeechTimerRef.current != null) window.clearTimeout(endSpeechTimerRef.current);
      try {
        recognitionRef.current?.abort();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
      stopHumanSpeech();
    };
  }, []);

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

  useEffect(() => {
    if (!loggedIn) return;
    setCallSeconds(0);
    const t = window.setInterval(() => setCallSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [loggedIn]);

  // เริ่มพูดระหว่าง stream ทันทีเมื่อมีประโยคจบ — ลดเวลารอ
  const streamSpokenRef = useRef<{ id: string; spokenChars: number } | null>(null);

  useEffect(() => {
    if (!voiceOutEnabled) return;
    const streamingId = mainStreamingId || simStreamingId;
    if (!streamingId) return;
    const pool = mainStreamingId ? mainMessages : simMessages;
    const msg = pool.find((m) => m.id === streamingId);
    if (!msg?.content) return;

    if (!streamSpokenRef.current || streamSpokenRef.current.id !== streamingId) {
      streamSpokenRef.current = { id: streamingId, spokenChars: 0 };
    }

    const visible = stripMarkdownForSpeech(msg.content);
    if (visible.length <= streamSpokenRef.current.spokenChars) return;

    // หาจุดจบประโยคล่าสุดหลังช่วงที่พูดไปแล้ว
    const pending = visible.slice(streamSpokenRef.current.spokenChars);
    const match = pending.match(/^([\s\S]*?[。.!?\u0E2F…])(?:\s+|$)/);
    if (!match) return;
    const sentence = match[1].trim();
    if (sentence.length < 8) return;

    streamSpokenRef.current.spokenChars += match[0].length;
    enqueueHumanThai(sentence, {
      onStart: () => setAiSpeaking(true),
    });
  }, [mainMessages, simMessages, mainStreamingId, simStreamingId, voiceOutEnabled]);

  // หลัง stream จบ: พูดส่วนที่เหลือ / หรือทั้งก้อนถ้ายังไม่ทันเริ่มพูด
  useEffect(() => {
    if (!voiceOutEnabled || busy || mainStreamingId || simStreamingId) {
      if (!voiceOutEnabled) {
        stopHumanSpeech();
        setAiSpeaking(false);
      }
      return;
    }
    const inSim = phase === 'simulation' || phase === 'awaiting_result';
    const pool = inSim ? simMessages : mainMessages;
    const last = [...pool].reverse().find((m) => m.role === 'assistant');
    if (!last || !last.content.trim() || spokenIdsRef.current.has(last.id)) return;
    spokenIdsRef.current.add(last.id);

    const visible = stripMarkdownForSpeech(last.content);
    const already =
      streamSpokenRef.current?.id === last.id ? streamSpokenRef.current.spokenChars : 0;
    const rest = visible.slice(already).trim();
    streamSpokenRef.current = null;

    if (already > 0) {
      if (rest) {
        enqueueHumanThai(rest, { onEnd: () => setAiSpeaking(false) });
      } else {
        // อย่าปิด aiSpeaking ทันที — อาจยังมีประโยคจากสตรีมค้างในคิว
        attachSpeechEndHandler(() => setAiSpeaking(false));
      }
      return;
    }

    void speakHumanThai(visible, {
      onStart: () => setAiSpeaking(true),
      onEnd: () => setAiSpeaking(false),
    });
  }, [mainMessages, simMessages, busy, mainStreamingId, simStreamingId, voiceOutEnabled, phase]);

  useEffect(() => {
    setHumanSpeechRate(autoSpeed);
  }, [autoSpeed]);

  // ตอนจำลอง: ใช้เสียงตามเพศตัวละคร — นอกนั้นใช้เสียงโฮสต์หญิง
  useEffect(() => {
    if ((phase === 'simulation' || phase === 'awaiting_result') && simPersona?.gender) {
      setHumanSpeechGender(simPersona.gender);
    } else {
      setHumanSpeechGender('female');
    }
  }, [phase, simPersona]);

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
        navigate('/assessment/minddojo-voice/result', { replace: true });
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
    setHumanSpeechGender(persona.gender);
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
        personaGender: persona.gender,
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
        personaGender: persona.gender,
        personaPosition: persona.position,
        personaMbti: persona.mbti,
        personaTitle: persona.title,
        personaStyle: persona.style,
        personaEmotionStyle: persona.emotionStyle,
      });
      setHumanSpeechGender(persona.gender);
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

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current != null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  const clearEndSpeechTimer = useCallback(() => {
    if (endSpeechTimerRef.current != null) {
      window.clearTimeout(endSpeechTimerRef.current);
      endSpeechTimerRef.current = null;
    }
    setAwaitingSpeechEnd(false);
  }, []);

  const stopRecognition = useCallback(() => {
    clearRestartTimer();
    try {
      recognitionRef.current?.abort();
    } catch {
      /* ignore */
    }
    recognitionRef.current = null;
    setListening(false);
  }, [clearRestartTimer]);

  const flushInterimIntoPending = useCallback(() => {
    const interim = interimSpeechRef.current.trim();
    if (!interim) return;
    pendingSpeechRef.current = `${pendingSpeechRef.current} ${interim}`.replace(/\s+/g, ' ').trim();
    interimSpeechRef.current = '';
  }, []);

  const commitSpeechAndAskAi = useCallback(() => {
    if (committingRef.current || busyRef.current) return;
    flushInterimIntoPending();
    const spoken = (pendingSpeechRef.current || inputRef.current).trim();
    pendingSpeechRef.current = '';
    interimSpeechRef.current = '';
    clearEndSpeechTimer();
    clearRestartTimer();
    stopRecognition();
    micOnRef.current = false;
    setMicOn(false);
    if (!spoken) {
      committingRef.current = false;
      return;
    }
    committingRef.current = true;
    setInput(spoken);
    window.setTimeout(() => {
      onSendRef.current(spoken);
      committingRef.current = false;
    }, 40);
  }, [clearEndSpeechTimer, clearRestartTimer, flushInterimIntoPending, stopRecognition]);

  /** พูดต่อได้ — รีเซ็ตนาฬิกาทุกครั้งที่มีเสียง จนเงียบครบ END_OF_SPEECH_MS ค่อยส่ง */
  const scheduleCommitAfterPause = useCallback(() => {
    if (committingRef.current || busyRef.current || !micOnRef.current) return;
    if (endSpeechTimerRef.current != null) window.clearTimeout(endSpeechTimerRef.current);
    setAwaitingSpeechEnd(true);
    endSpeechTimerRef.current = window.setTimeout(() => {
      endSpeechTimerRef.current = null;
      setAwaitingSpeechEnd(false);
      commitSpeechAndAskAi();
    }, END_OF_SPEECH_MS);
  }, [END_OF_SPEECH_MS, commitSpeechAndAskAi]);

  const startRecognition = useCallback(() => {
    if (recognitionRef.current || committingRef.current) return;
    if (!micOnRef.current || busyRef.current) return;
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setError('เบราว์เซอร์นี้ไม่รองรับ Speech Recognition — ลอง Chrome / Edge');
      setMicOn(false);
      micOnRef.current = false;
      return;
    }
    stopHumanSpeech();
    setAiSpeaking(false);
    aiSpeakingRef.current = false;
    const recognition = new Ctor();
    recognition.lang = 'th-TH';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let finalChunk = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const piece = event.results[i][0]?.transcript || '';
        if (event.results[i].isFinal) finalChunk += piece;
        else interim += piece;
      }
      if (finalChunk.trim()) {
        pendingSpeechRef.current = `${pendingSpeechRef.current} ${finalChunk}`
          .replace(/\s+/g, ' ')
          .trim();
        interimSpeechRef.current = '';
      }
      if (interim.trim()) interimSpeechRef.current = interim.trim();
      else if (finalChunk.trim()) interimSpeechRef.current = '';

      const display = [pendingSpeechRef.current, interimSpeechRef.current]
        .filter(Boolean)
        .join(' ')
        .trim();
      if (display) setInput(display);

      // ยังพูดอยู่ / พูดต่อ — เลื่อนเวลาส่งออกไป ไม่ตัดกลางประโยค
      if (finalChunk.trim() || interim.trim()) scheduleCommitAfterPause();
    };
    recognition.onerror = (event) => {
      if (event.error === 'aborted' || event.error === 'no-speech') return;
      setListening(false);
      if (event.error === 'not-allowed') {
        setError('ไมค์ถูกบล็อก — อนุญาตไมโครโฟนในเบราว์เซอร์');
        clearEndSpeechTimer();
        clearRestartTimer();
        pendingSpeechRef.current = '';
        interimSpeechRef.current = '';
        setMicOn(false);
        micOnRef.current = false;
        return;
      }
      if (event.error !== 'network') setError(`ไมค์: ${event.error}`);
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
      if (!micOnRef.current || busyRef.current || committingRef.current) return;
      // ไม่ส่งทันทีตอน session จบ — ให้ตัวหน่วงสั้นทำงาน / ฟังต่อถ้ายังพูดไม่จบ
      if (pendingSpeechRef.current.trim() || interimSpeechRef.current.trim() || inputRef.current.trim()) {
        scheduleCommitAfterPause();
      }
      clearRestartTimer();
      restartTimerRef.current = window.setTimeout(() => {
        if (micOnRef.current && !busyRef.current && !committingRef.current && !recognitionRef.current) {
          startRecognition();
        }
      }, 200);
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
      setError(null);
    } catch {
      recognitionRef.current = null;
      setListening(false);
      if (micOnRef.current) {
        clearRestartTimer();
        restartTimerRef.current = window.setTimeout(() => {
          if (micOnRef.current && !recognitionRef.current) startRecognition();
        }, 320);
      }
    }
  }, [clearEndSpeechTimer, clearRestartTimer, scheduleCommitAfterPause]);

  const toggleMic = useCallback(() => {
    if (micOn) {
      if (pendingSpeechRef.current.trim() || interimSpeechRef.current.trim() || inputRef.current.trim()) {
        commitSpeechAndAskAi();
      } else {
        clearEndSpeechTimer();
        clearRestartTimer();
        micOnRef.current = false;
        setMicOn(false);
        stopRecognition();
      }
      return;
    }
    if (
      busy ||
      committingRef.current ||
      phase === 'scenario_choice' ||
      phase === 'confirm' ||
      phase === 'awaiting_result' ||
      phase === 'pick_random'
    ) {
      return;
    }
    pendingSpeechRef.current = '';
    interimSpeechRef.current = '';
    committingRef.current = false;
    clearEndSpeechTimer();
    clearRestartTimer();
    setInput('');
    micOnRef.current = true;
    setMicOn(true);
  }, [
    busy,
    clearEndSpeechTimer,
    clearRestartTimer,
    commitSpeechAndAskAi,
    micOn,
    phase,
    stopRecognition,
  ]);

  useEffect(() => {
    if (!micOn) {
      stopRecognition();
      return;
    }
    if (busy || committingRef.current) {
      stopRecognition();
      return;
    }
    if (
      phase === 'scenario_choice' ||
      phase === 'confirm' ||
      phase === 'awaiting_result' ||
      phase === 'pick_random'
    ) {
      clearEndSpeechTimer();
      stopRecognition();
      return;
    }
    startRecognition();
  }, [micOn, busy, phase, clearEndSpeechTimer, startRecognition, stopRecognition]);

  const onSend = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || busy) return;
    clearEndSpeechTimer();
    clearRestartTimer();
    micOnRef.current = false;
    setMicOn(false);
    stopRecognition();

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
  onSendRef.current = (text?: string) => {
    void onSend(text);
  };

  // โหมดคุยอัตโนมัติ — รันทั้ง flow โดย AI ตอบแทนผู้ใช้
  useEffect(() => {
    if (!autoDemo || !loggedIn) return;
    if (busy || aiSpeaking || mainStreamingId || simStreamingId || autoLockRef.current) return;
    if (isHumanSpeechBusy()) return;

    const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));
    const delay = (ms: number) =>
      sleep(Math.max(60, Math.round(ms / Math.max(1, autoSpeedRef.current))));

    /** รอให้ AI พูดจบก่อนไปขั้นถัดไป — กันกระโดดเฟสกลางประโยค */
    const waitUntilSpeechDone = async (expectSpeech = true) => {
      if (!voiceOutEnabledRef.current || !autoDemoRef.current) return;
      if (expectSpeech) {
        // ให้ React effect เริ่มพูดข้อความที่เพิ่งใส่
        await sleep(Math.max(120, Math.round(350 / autoSpeedRef.current)));
        const startDeadline = Date.now() + 2800;
        while (autoDemoRef.current && Date.now() < startDeadline) {
          if (aiSpeakingRef.current || isHumanSpeechBusy()) break;
          await sleep(70);
        }
      }
      while (autoDemoRef.current && (aiSpeakingRef.current || isHumanSpeechBusy())) {
        await sleep(100);
      }
      await delay(180);
    };

    const generateUserReply = async (): Promise<string> => {
      const inSim = phase === 'simulation';
      const pool = inSim ? simMessages : mainMessages;
      const recent = pool
        .filter((m) => m.role !== 'event')
        .slice(-8)
        .map((m) => `${m.role === 'assistant' ? 'AI' : 'User'}: ${m.content}`)
        .join('\n');
      const system = inSim
        ? `คุณคือผู้ถูกประเมินในการจำลองสถานการณ์การทำงาน
ตอบสั้นเป็นภาษาพูดธรรมชาติ 1-3 ประโยค ภาษาไทย
เล่นตามสถานการณ์อย่างสุภาพและมืออาชีพ
ตอบต่อจากคู่สนทนาล่าสุดให้คุยต่อได้
ห้ามใส่ markdown หรือคำว่า User/AI`
        : `คุณคือผู้ใช้ที่กำลังทำแบบประเมิน MindDoJo AI Assessment ผ่านวิดีโอคอล
ตอบสั้นเป็นธรรมชาติ 1-2 ประโยค ภาษาไทย
ถ้าถูกถามชื่อ ให้ตอบว่า "คุณเดโม่"
ถ้าถูกถามงาน/ตำแหน่ง ตอบเป็นพนักงานบริษัททั่วไป
ห้ามใส่ markdown`;
      const raw = await openaiChat(
        [
          { role: 'system', content: system },
          {
            role: 'user',
            content: `บทสนทนาล่าสุด:\n${recent || '(เริ่มต้น)'}\n\nเขียนเฉพาะข้อความตอบของผู้ใช้เท่านั้น`,
          },
        ],
        0.75
      );
      return raw
        .trim()
        .replace(/^["'«]|["'»]$/g, '')
        .replace(/^\s*(User|ผู้ใช้)\s*[:：]\s*/i, '')
        .trim();
    };

    const run = async () => {
      autoLockRef.current = true;
      let retryMs = 0;
      try {
        // กันเคส aiSpeaking เพิ่ง false แต่คิวยังมีเสียงค้าง
        if (isHumanSpeechBusy()) {
          await waitUntilSpeechDone(false);
          if (!autoDemoRef.current) return;
        }

        if (phase === 'scenario_choice') {
          const key = 'scenario_choice';
          if (lastAutoHandledRef.current === key) return;
          lastAutoHandledRef.current = key;
          await delay(700);
          if (!autoDemoRef.current) return;
          setMainMessages((prev) => [
            ...prev,
            {
              id: uid(),
              role: 'assistant',
              content: `รับทราบค่ะ — โหมดอัตโนมัติจะสุ่มสถานการณ์ให้ ${RANDOM_SCENARIO_COUNT} แบบ รอสักครู่นะคะ`,
            },
          ]);
          await waitUntilSpeechDone(true);
          if (!autoDemoRef.current) return;
          await fetchRandomScenarios();
          retryMs = Math.max(200, Math.round(500 / autoSpeedRef.current));
          return;
        }

        if (phase === 'pick_random' && randomOptions.length > 0) {
          const key = `pick:${randomOptions.map((o) => o.shortTitle).join('|')}`;
          if (lastAutoHandledRef.current === key) return;
          lastAutoHandledRef.current = key;
          await delay(900);
          if (!autoDemoRef.current) return;
          const idx = Math.floor(Math.random() * Math.min(3, randomOptions.length));
          const opt = randomOptions[idx];
          if (!opt) return;
          const { shortTitle, ...sc } = opt;
          const persona = createSimulationPersona(`${shortTitle}-${sc.situationSummary}`, sc.counterpart);
          setScenario(sc);
          setSimPersona(persona);
          setMainMessages((prev) => [
            ...prev,
            { id: uid(), role: 'user', content: `เลือกข้อ ${idx + 1}: ${shortTitle}` },
            {
              id: uid(),
              role: 'assistant',
              content: `สรุปสถานการณ์ที่เลือก:\n\n• ${shortTitle}\n• บทบาทคุณ: ${sc.userRole}\n• คู่สนทนา: ${sc.counterpart}\n• บริบท: ${sc.context}\n• ${sc.situationSummary}\n\nคู่สนทนา: ${persona.name} • ${persona.position} • ${persona.mbti}\n\nโหมดอัตโนมัติจะเริ่มสายจำลองให้นะคะ`,
            },
          ]);
          // พูดสรุปให้จบก่อนค่อยเข้า confirm / เริ่มจำลอง
          await waitUntilSpeechDone(true);
          if (!autoDemoRef.current) return;
          setPhase('confirm');
          retryMs = Math.max(200, Math.round(500 / autoSpeedRef.current));
          return;
        }

        if (phase === 'confirm' && scenario) {
          const key = `confirm:${scenario.situationSummary}`;
          if (lastAutoHandledRef.current === key) return;
          lastAutoHandledRef.current = key;
          await delay(700);
          if (!autoDemoRef.current) return;
          await waitUntilSpeechDone(false);
          if (!autoDemoRef.current) return;
          await startSimulation();
          // สำคัญ: หลังเข้าจำลองต้อง kick ใหม่ ไม่เช่นนั้นออโต้จะค้าง
          retryMs = Math.max(300, Math.round(900 / autoSpeedRef.current));
          return;
        }

        if (phase === 'awaiting_result') {
          const key = 'awaiting_result';
          if (lastAutoHandledRef.current === key) return;
          lastAutoHandledRef.current = key;
          await delay(800);
          if (!autoDemoRef.current) return;
          await waitUntilSpeechDone(false);
          if (!autoDemoRef.current) return;
          await loadFinalReport();
          setAutoDemo(false);
          return;
        }

        if (phase === 'profiling' || phase === 'custom_profiling' || phase === 'simulation') {
          const pool = phase === 'simulation' ? simMessages : mainMessages;
          // ข้าม event cue — หา assistant ล่าสุดที่มีข้อความจริง
          const lastAi = [...pool]
            .reverse()
            .find((m) => m.role === 'assistant' && m.content.trim().length > 0);
          if (!lastAi) {
            // เพิ่งเข้า simulation ข้อความอาจยังไม่พร้อม
            retryMs = Math.max(250, Math.round(700 / autoSpeedRef.current));
            return;
          }
          const key = `reply:${phase}:${lastAi.id}`;
          if (lastAutoHandledRef.current === key) return;
          lastAutoHandledRef.current = key;
          // รอพูดจบชัด ๆ ก่อนให้บอทตอบแทนผู้ใช้
          await waitUntilSpeechDone(false);
          if (!autoDemoRef.current) return;
          await delay(phase === 'simulation' ? 700 : 500);
          if (!autoDemoRef.current) return;
          const reply = await generateUserReply();
          if (!autoDemoRef.current) return;
          if (reply) {
            onSendRef.current(reply);
          } else {
            // สร้างคำตอบไม่สำเร็จ — ลองใหม่
            lastAutoHandledRef.current = '';
            retryMs = Math.max(300, Math.round(1000 / autoSpeedRef.current));
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'โหมดอัตโนมัติขัดข้อง');
        // ปลด key ล่าสุดเพื่อให้ลองต่อได้
        lastAutoHandledRef.current = '';
        retryMs = Math.max(400, Math.round(1200 / autoSpeedRef.current));
      } finally {
        autoLockRef.current = false;
        if (retryMs > 0 && autoDemoRef.current) {
          window.setTimeout(() => {
            if (autoDemoRef.current) kickAutoDemo();
          }, retryMs);
        }
      }
    };

    void run();
  }, [
    autoDemo,
    autoKick,
    autoSpeed,
    loggedIn,
    busy,
    aiSpeaking,
    mainStreamingId,
    simStreamingId,
    phase,
    mainMessages,
    simMessages,
    randomOptions,
    scenario,
    fetchRandomScenarios,
    startSimulation,
    loadFinalReport,
    kickAutoDemo,
  ]);

  // หลัง AI พูดจบในโหมดออโต้ — กระตุ้นให้ตอบต่อ (กันค้างตอน simulation)
  useEffect(() => {
    if (!autoDemo || aiSpeaking || busy || mainStreamingId || simStreamingId) return;
    if (isHumanSpeechBusy()) return;
    if (phase !== 'simulation' && phase !== 'profiling' && phase !== 'custom_profiling') return;
    const t = window.setTimeout(() => {
      if (autoDemoRef.current && !autoLockRef.current && !isHumanSpeechBusy()) kickAutoDemo();
    }, Math.max(200, Math.round(450 / autoSpeedRef.current)));
    return () => window.clearTimeout(t);
  }, [autoDemo, autoSpeed, aiSpeaking, busy, mainStreamingId, simStreamingId, phase, simMessages, mainMessages, kickAutoDemo]);

  if (authLoading && !resourceHub && !isMindDojoAssessmentLoggedIn()) {
    return (
      <div className="md-page items-center justify-center">
        <p className="text-zinc-400 text-sm">กำลังตรวจสอบการเข้าสู่ระบบ...</p>
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <div className="md-page flex flex-col">
        <header className="px-4 py-3 border-b border-gray-200 bg-white/90 backdrop-blur-xl flex items-center justify-between max-w-md mx-auto w-full">
          <Link to="/" className="text-gray-600 hover:text-gray-900 text-sm">
            ← กลับหน้าหลัก
          </Link>
          <span className="text-yellow-800 text-sm font-semibold">AI Chat Bot (Voice) Demo</span>
        </header>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md md-card rounded-[28px] p-8 shadow-md">
            <div className="flex flex-col items-center mb-6">
              <BrandLogo className="mb-4 text-[30px]" tone="dark" />
              <h1 className="text-xl font-semibold text-center">AI Chat Bot (Voice) Demo</h1>
              <p className="text-gray-700 text-sm mt-2 text-center">
                สมัครสมาชิกด้วย username / รหัสผ่าน
              </p>
            </div>
            <div className="flex rounded-xl bg-gray-100 p-1 mb-4">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setLoginMsg(null);
                }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  authMode === 'login' ? 'bg-yellow-400 text-black' : 'text-gray-600 hover:text-gray-900'
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
                  authMode === 'register' ? 'bg-yellow-400 text-black' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                สมัครสมาชิก
              </button>
            </div>
            <form onSubmit={(e) => void handleAuthSubmit(e)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">Username</label>
                <input
                  value={loginUser}
                  onChange={(e) => setLoginUser(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
                  className="md-input font-mono text-sm"
                  autoComplete="username"
                  placeholder="เฉพาะ a-z ตัวเลข _ (3–32 ตัว)"
                  minLength={3}
                  maxLength={32}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">รหัสผ่าน</label>
                <input
                  type="password"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  className="md-input"
                  autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
                  required
                  minLength={authMode === 'register' ? 6 : undefined}
                />
              </div>
              {authMode === 'register' && (
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">ยืนยันรหัสผ่าน</label>
                  <input
                    type="password"
                    value={regPass2}
                    onChange={(e) => setRegPass2(e.target.value)}
                    className="md-input"
                    autoComplete="new-password"
                    required
                    minLength={6}
                  />
                </div>
              )}
              {loginMsg && (
                <div
                  className={`text-sm p-3 rounded-xl ${
                    loginMsg.type === 'ok' ? 'bg-green-500/15 text-green-700' : 'bg-red-500/15 text-red-400'
                  }`}
                >
                  {loginMsg.text}
                </div>
              )}
              {!isSupabaseConfigured && (
                <p className="text-xs text-amber-900 bg-amber-50 rounded-xl p-3 border border-amber-200">
                  ยังไม่ได้ตั้ง VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — สมัครและล็อกอิน Assessment ใช้ไม่ได้จนกว่าจะตั้งค่า รัน SQL และ deploy Edge Function{' '}
                  <code className="text-amber-800">minddojo-assessment-auth</code> (แนะนำปิด JWT verify สำหรับฟังก์ชันนี้หรือใช้{' '}
                  <code className="text-amber-800">--no-verify-jwt</code> ตอน deploy)
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


  const inSim = phase === 'simulation' || phase === 'awaiting_result';
  const activeMessages = inSim ? simMessages : mainMessages;
  const lastAssistant = [...activeMessages].reverse().find((m) => m.role === 'assistant');
  const lastUser = [...activeMessages].reverse().find((m) => m.role === 'user');
  const lastEvent = [...activeMessages].reverse().find((m) => m.role === 'event');
  const captionText = stripMarkdownForSpeech(
    (busy || mainStreamingId || simStreamingId
      ? lastAssistant?.content || 'กำลังคิดคำตอบ...'
      : lastAssistant?.content) || '...'
  );
  const calleeName =
    inSim && simPersona
      ? `${simPersona.name} · ${simPersona.position}`
      : 'MindDoJo AI';
  const calleeSub =
    inSim && simPersona
      ? `${simPersona.mbti} · ${simPersona.title}`
      : phase === 'awaiting_result'
        ? 'การจำลองเสร็จแล้ว'
        : phase === 'scenario_choice' || phase === 'pick_random' || phase === 'confirm'
          ? 'กำลังเลือกสถานการณ์'
          : 'วิดีโอคอลประเมินการสื่อสาร';
  const canTalk =
    !busy &&
    phase !== 'scenario_choice' &&
    phase !== 'confirm' &&
    phase !== 'awaiting_result' &&
    phase !== 'pick_random';
  const statusLabel = micOn
    ? awaitingSpeechEnd
      ? 'กำลังรอให้พูดจบ...'
      : listening
        ? 'ไมค์เปิด · กำลังฟัง...'
        : busy || aiSpeaking
          ? 'ไมค์เปิด · พักฟังชั่วคราว'
          : 'ไมค์เปิด'
    : aiSpeaking
      ? 'คู่สายกำลังพูด...'
      : busy
        ? 'กำลังประมวลผล...'
        : 'ไมค์ปิด';
  const useSimAvatar =
    Boolean(simPersona?.avatarUrl) &&
    (phase === 'confirm' || phase === 'simulation' || phase === 'awaiting_result');
  const stageAvatarUrl = useSimAvatar ? simPersona!.avatarUrl : MINDDOJO_CHATBOT_AVATAR_URL;
  const stageAvatarAlt = useSimAvatar
    ? `${simPersona!.name} ${simPersona!.mbti}`
    : 'MindDoJo cartoon';

  const showActionSheet =
    phase === 'scenario_choice' ||
    phase === 'pick_random' ||
    phase === 'confirm' ||
    phase === 'awaiting_result';

  return (
    <div className="relative flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-[#0b141a] text-white touch-manipulation">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 12%, rgba(6,199,85,0.2), transparent 42%), linear-gradient(180deg, #14241c 0%, #0b141a 48%, #060d12 100%)',
        }}
      />

      <header className="relative z-20 flex shrink-0 items-center gap-2 px-3 pt-[max(0.55rem,env(safe-area-inset-top))] pb-1.5 sm:px-4">
        <Link
          to="/"
          onClick={() => stopHumanSpeech()}
          className="shrink-0 rounded-full bg-black/40 px-2.5 py-1.5 text-[11px] text-white/90 backdrop-blur-md active:scale-95"
        >
          ย่อ
        </Link>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-[13px] font-semibold leading-tight tracking-wide sm:text-sm">
            {calleeName}
          </p>
          <p className="mt-0.5 text-[11px] font-medium tabular-nums text-[#06c755]">
            {formatCallTimer(callSeconds)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            clearMindDojoAssessmentSession();
            window.location.reload();
          }}
          className="shrink-0 rounded-full bg-black/40 px-2.5 py-1.5 text-[11px] text-white/80 backdrop-blur-md active:scale-95"
        >
          ออก
        </button>
      </header>

      <main className="relative z-10 flex min-h-0 flex-1 flex-col px-3 sm:px-4">
        {/* โซนวิดีโอคอลหลัก — ยืดตามจอ */}
        <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center">
          <p className="mb-2 max-w-[90%] truncate text-center text-[11px] text-white/50 sm:mb-3 sm:text-xs">
            {calleeSub}
          </p>

          <div className="relative">
            {(aiSpeaking || busy) && (
              <>
                <span className="absolute inset-[-8px] animate-ping rounded-full bg-[#06c755]/20 sm:inset-[-10px]" />
                <span className="absolute inset-[-14px] rounded-full border border-[#06c755]/30 sm:inset-[-18px]" />
              </>
            )}
            <div
              className={`relative overflow-hidden rounded-full border-[3px] shadow-[0_16px_48px_rgba(0,0,0,0.5)] ${
                aiSpeaking ? 'border-[#06c755]' : 'border-white/20'
              }`}
              style={{
                width: 'min(42vw, 13.5rem, 38dvh)',
                height: 'min(42vw, 13.5rem, 38dvh)',
                transform: aiSpeaking
                  ? `translateY(${-2 - mouthOpen * 5}px) rotate(${(mouthOpen - 0.35) * 3.2}deg) scale(${1.02 + mouthOpen * 0.03})`
                  : busy
                    ? 'translateY(-1px) scale(1.01)'
                    : 'translateY(0) rotate(0deg) scale(1)',
                transition: aiSpeaking ? 'transform 70ms linear' : 'transform 280ms ease',
                transformOrigin: '50% 70%',
              }}
            >
              <img
                src={stageAvatarUrl}
                alt={stageAvatarAlt}
                className="h-full w-full object-cover bg-[#ffdf80]"
                style={{
                  transform: aiSpeaking
                    ? `translateY(${mouthOpen * -3}px) scale(${1 + mouthOpen * 0.02})`
                    : 'none',
                  transition: 'transform 70ms linear',
                }}
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
              <div
                className="pointer-events-none absolute z-10"
                style={{
                  left: '50%',
                  top: '62%',
                  width: '18%',
                  height: '7.5%',
                  marginLeft: '-9%',
                  marginTop: '-3.75%',
                  borderRadius: '50%',
                  background:
                    mouthOpen > 0.08
                      ? 'radial-gradient(circle at 50% 30%, #5a1a28 0%, #1a0508 72%)'
                      : 'rgba(40, 20, 20, 0.4)',
                  boxShadow:
                    mouthOpen > 0.15
                      ? 'inset 0 2px 4px rgba(255,180,180,0.22), 0 1px 2px rgba(0,0,0,0.35)'
                      : 'none',
                  transform: `scaleX(${0.9 + mouthOpen * 0.45}) scaleY(${0.28 + mouthOpen * 1.55})`,
                  transformOrigin: '50% 50%',
                  transition: 'transform 55ms linear, background 80ms ease, opacity 100ms ease',
                  opacity: aiSpeaking || mouthOpen > 0.05 ? 1 : 0,
                }}
                aria-hidden
              >
                <div
                  className="absolute left-1/2 top-[16%] h-[22%] w-[58%] -translate-x-1/2 rounded-sm bg-white/90"
                  style={{ opacity: mouthOpen > 0.35 ? 0.95 : 0 }}
                />
              </div>
            </div>
          </div>

          <div className="mt-3 inline-flex max-w-[95%] items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-[10px] text-white/85 backdrop-blur-md sm:mt-4 sm:text-[11px]">
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full sm:h-2 sm:w-2 ${
                micOn ? 'animate-pulse bg-red-400' : aiSpeaking ? 'animate-pulse bg-[#06c755]' : 'bg-white/40'
              }`}
            />
            <span className="truncate">{statusLabel}</span>
          </div>

          {/* PiP ผู้ใช้ — มุมขวาล่างของโซนวิดีโอ */}
          <div className="absolute bottom-1 right-0 h-[4.75rem] w-[3.4rem] overflow-hidden rounded-xl border border-white/25 bg-[#1a2a24] shadow-xl sm:bottom-2 sm:right-1 sm:h-28 sm:w-20">
            <div className="flex h-full flex-col items-center justify-center gap-0.5 bg-gradient-to-b from-[#24352e] to-[#15201b]">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[11px] font-bold text-white/80 sm:h-10 sm:w-10 sm:text-sm">
                {(profile?.name || 'คุณ').slice(0, 1)}
              </div>
              <span className="line-clamp-1 px-1 text-center text-[8px] text-white/70 sm:line-clamp-2 sm:text-[10px]">
                {profile?.name || 'คุณ'}
              </span>
              {micOn && <span className="text-[8px] font-semibold text-red-300 sm:text-[9px]">MIC</span>}
            </div>
          </div>
        </div>

        {/* คำบรรยาย — กะทัดรัด ไม่กินจอ */}
        {!showActionSheet && (
          <div className="mx-auto mb-2 w-full max-w-md shrink-0 rounded-2xl bg-black/50 px-3 py-2.5 text-center backdrop-blur-md ring-1 ring-white/10 sm:mb-3 sm:px-4 sm:py-3">
            <p className="mb-0.5 text-[9px] uppercase tracking-[0.14em] text-white/40">คำบรรยาย</p>
            <p className="max-h-[4.5rem] overflow-y-auto whitespace-pre-wrap text-[13px] leading-snug text-white/95 sm:max-h-24 sm:text-sm sm:leading-relaxed">
              {captionText}
            </p>
            {lastUser && (
              <p className="mt-1.5 line-clamp-2 border-t border-white/10 pt-1.5 text-left text-[11px] text-[#9ae6b4] sm:text-xs">
                คุณ: {stripMarkdownForSpeech(lastUser.content)}
              </p>
            )}
            {lastEvent && inSim && (
              <p className="mt-1 line-clamp-1 text-left text-[10px] text-amber-200/85 sm:text-[11px]">
                ท่าทาง: {lastEvent.content}
              </p>
            )}
          </div>
        )}

        {/* แผงเลือกสถานการณ์ — อยู่ใน flow ไม่ทับปุ่ม */}
        {showActionSheet && (
          <div className="mx-auto mb-2 w-full max-w-lg shrink-0 overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#0f1c18]/95 shadow-2xl backdrop-blur-xl sm:mb-3">
            <div className="max-h-[min(38dvh,20rem)] overflow-y-auto overscroll-contain p-3 sm:max-h-[min(42dvh,24rem)] sm:p-4">
              {phase === 'scenario_choice' && (
                <div className="space-y-2.5">
                  <p className="text-sm font-semibold text-white">เลือกวิธีเริ่มสถานการณ์</p>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setMainMessages((prev) => [
                        ...prev,
                        {
                          id: uid(),
                          role: 'assistant',
                          content: `รับทราบค่ะ — กำลังสุ่มสถานการณ์ให้ ${RANDOM_SCENARIO_COUNT} แบบจากบริบทของคุณ รอสักครู่นะคะ`,
                        },
                      ]);
                      void fetchRandomScenarios();
                    }}
                    className="w-full rounded-2xl bg-[#06c755] py-3 text-sm font-bold text-black active:scale-[0.99] disabled:opacity-50"
                  >
                    {busy ? 'กำลังสุ่ม...' : 'สุ่มสถานการณ์ (10 ตัวเลือก)'}
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
                            'เยี่ยมเลย — เรามาออกแบบสถานการณ์ของคุณเองกันค่ะ อยากคุยกับใครในที่ทำงาน (เช่น หัวหน้า ลูกค้า เพื่อนร่วมงาน)?',
                        },
                      ]);
                    }}
                    className="w-full rounded-2xl border border-white/20 bg-white/5 py-3 text-sm font-semibold text-white active:scale-[0.99] disabled:opacity-50"
                  >
                    สร้างสถานการณ์เอง
                  </button>
                </div>
              )}

              {phase === 'pick_random' && randomOptions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-white">เลือกสถานการณ์</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {randomOptions.map((opt, i) => (
                      <button
                        key={i}
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          const { shortTitle, ...sc } = opt;
                          const persona = createSimulationPersona(
                            `${shortTitle}-${sc.situationSummary}`,
                            sc.counterpart,
                          );
                          setScenario(sc);
                          setSimPersona(persona);
                          setPhase('confirm');
                          setMainMessages((prev) => [
                            ...prev,
                            { id: uid(), role: 'user', content: `เลือกข้อ ${i + 1}: ${shortTitle}` },
                            {
                              id: uid(),
                              role: 'assistant',
                              content: `สรุปสถานการณ์ที่เลือก:\n\n• ${shortTitle}\n• บทบาทคุณ: ${sc.userRole}\n• คู่สนทนา: ${sc.counterpart}\n• บริบท: ${sc.context}\n• ${sc.situationSummary}\n\nคู่สนทนา: ${persona.name} • ${persona.position} • ${persona.mbti}\n\nกดยืนยันเมื่อพร้อมเริ่มสายจำลอง`,
                            },
                          ]);
                        }}
                        className="rounded-2xl border border-white/10 bg-white/5 p-3 text-left active:border-[#06c755]/50 active:bg-[#06c755]/10 disabled:opacity-50"
                      >
                        <p className="text-xs font-bold text-[#9ae6b4]">
                          {i + 1}. {opt.shortTitle}
                        </p>
                        <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-white/70 sm:line-clamp-3">
                          {opt.situationSummary}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {phase === 'confirm' && scenario && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-white">ยืนยันก่อนเริ่มจำลอง</p>
                  <ul className="space-y-1 text-xs leading-snug text-white/75">
                    <li>บทบาทคุณ: {scenario.userRole}</li>
                    <li>คู่สนทนา: {scenario.counterpart}</li>
                    <li>บริบท: {scenario.context}</li>
                    <li className="line-clamp-3">{scenario.situationSummary}</li>
                  </ul>
                  {simPersona && (
                    <p className="text-xs text-[#9ae6b4]">
                      คู่สาย: {simPersona.name} · {simPersona.position} · {simPersona.mbti}
                      {simPersona.gender === 'male' ? ' · ชาย' : ' · หญิง'}
                    </p>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void startSimulation()}
                    className="w-full rounded-2xl bg-[#06c755] py-3 text-sm font-bold text-black active:scale-[0.99] disabled:opacity-50"
                  >
                    ยืนยันและเริ่มสายจำลอง
                  </button>
                </div>
              )}

              {phase === 'awaiting_result' && (
                <div className="space-y-3 text-center">
                  <p className="text-sm font-semibold text-white">การจำลองเสร็จแล้ว</p>
                  <p className="text-xs text-white/70">กดเพื่อสร้าง Dashboard ผลการประเมิน 6 ด้าน</p>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void loadFinalReport()}
                    className="w-full rounded-2xl bg-[#06c755] py-3 text-sm font-bold text-black active:scale-[0.99] disabled:opacity-50"
                  >
                    {busy ? 'กำลังสร้างผลลัพธ์...' : 'ดูผลลัพธ์'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="mb-2 shrink-0 rounded-xl border border-red-400/30 bg-red-950/85 px-3 py-2 text-xs text-red-100">
            {error}
          </div>
        )}

        {showKeyboard && canTalk && (
          <div className="mb-2 shrink-0">
            <div className="mx-auto flex w-full max-w-lg gap-2 rounded-2xl border border-white/10 bg-[#12201b]/95 p-2 backdrop-blur-xl">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                rows={2}
                placeholder="พิมพ์ข้อความแทนการพูด..."
                className="min-h-[44px] flex-1 resize-none rounded-xl border-0 bg-transparent px-2 py-2 text-[16px] text-white outline-none placeholder:text-white/35 sm:text-sm"
              />
              <button
                type="button"
                disabled={!input.trim() || busy}
                onClick={() => void onSend()}
                className="shrink-0 self-end rounded-xl bg-[#06c755] px-4 py-2 text-sm font-bold text-black disabled:opacity-40"
              >
                ส่ง
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="relative z-30 shrink-0 bg-gradient-to-t from-black via-black/85 to-transparent px-3 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-3 sm:px-4 sm:pt-4">
        {autoDemo && (
          <div className="mb-2.5 flex flex-col items-center gap-1.5">
            <p className="text-center text-[10px] font-medium text-[#9ae6b4] sm:text-[11px]">
              โหมดคุยอัตโนมัติ · รอพูดจบก่อนไปขั้นถัดไป
            </p>
            <div className="flex items-center gap-0.5 rounded-full bg-black/50 p-0.5 ring-1 ring-white/15">
              {([1, 2, 3] as const).map((speed) => (
                <button
                  key={speed}
                  type="button"
                  title={`ความเร็ว x${speed}`}
                  onClick={() => {
                    setAutoSpeed(speed);
                    setHumanSpeechRate(speed);
                  }}
                  className={`min-h-8 min-w-[2.35rem] rounded-full px-2.5 text-[11px] font-bold transition active:scale-95 ${
                    autoSpeed === speed ? 'bg-[#06c755] text-black' : 'text-white/80'
                  }`}
                >
                  x{speed}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mx-auto flex w-full max-w-md items-end justify-between gap-2 px-1 sm:max-w-lg sm:justify-center sm:gap-5">
          <button
            type="button"
            title={voiceOutEnabled ? 'ปิดลำโพง' : 'เปิดลำโพง'}
            onClick={() => {
              setVoiceOutEnabled((v) => {
                if (v) {
                  stopHumanSpeech();
                  setAiSpeaking(false);
                }
                return !v;
              });
            }}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full active:scale-95 sm:h-14 sm:w-14 ${
              voiceOutEnabled ? 'bg-white/15 text-white' : 'bg-white text-[#0b141a]'
            }`}
          >
            {voiceOutEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </button>

          <button
            type="button"
            title={autoDemo ? 'หยุดคุยอัตโนมัติ' : 'คุยอัตโนมัติทั้ง flow'}
            onClick={() => {
              setAutoDemo((v) => {
                const next = !v;
                if (next) {
                  micOnRef.current = false;
                  setMicOn(false);
                  stopRecognition();
                  lastAutoHandledRef.current = '';
                  autoLockRef.current = false;
                  setHumanSpeechRate(autoSpeedRef.current);
                } else {
                  setHumanSpeechRate(1);
                }
                return next;
              });
            }}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full active:scale-95 sm:h-14 sm:w-14 ${
              autoDemo ? 'animate-pulse bg-[#06c755] text-black' : 'bg-white/15 text-white'
            }`}
          >
            <Bot className="h-5 w-5" />
          </button>

          <button
            type="button"
            title={
              !speechSupported ? 'ไม่รองรับไมค์' : micOn ? 'ปิดไมค์' : 'เปิดไมค์'
            }
            disabled={!speechSupported || !canTalk || autoDemo}
            onClick={toggleMic}
            className={`flex h-[3.6rem] w-[3.6rem] shrink-0 items-center justify-center rounded-full disabled:opacity-40 active:scale-95 sm:h-16 sm:w-16 ${
              micOn ? 'bg-[#06c755] text-black' : 'bg-white text-[#0b141a]'
            }`}
          >
            {micOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
          </button>

          <button
            type="button"
            title="พิมพ์ข้อความ"
            disabled={!canTalk || autoDemo}
            onClick={() => setShowKeyboard((v) => !v)}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full disabled:opacity-40 active:scale-95 sm:h-14 sm:w-14 ${
              showKeyboard ? 'bg-[#06c755] text-black' : 'bg-white/15 text-white'
            }`}
          >
            <Keyboard className="h-5 w-5" />
          </button>

          <Link
            to="/"
            onClick={() => {
              setAutoDemo(false);
              stopHumanSpeech();
            }}
            title="วางสาย"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#ff3b30] text-white shadow-lg shadow-red-900/40 active:scale-95 sm:h-14 sm:w-14"
          >
            <PhoneOff className="h-5 w-5" />
          </Link>
        </div>
      </footer>

      <div ref={chatScrollRef} className="hidden" />
    </div>
  );
};

export default MindDojoVoiceAssessment;
