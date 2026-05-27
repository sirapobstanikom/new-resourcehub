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

type ChatMsg = { id: string; role: 'user' | 'assistant'; content: string };

type ScenarioOption = MindDojoScenario & { shortTitle: string };

const MINDDOJO_CHATBOT_AVATAR_URL =
  'https://static.wixstatic.com/media/8f9517_2b5ddf78e35a4604a6eb0b28dde240af~mv2.jpg';

/** จำนวนสถานการณ์ที่สุ่มจาก AI ให้ผู้ใช้เลือก */
const RANDOM_SCENARIO_COUNT = 10;

const WELCOME_ASSISTANT =
  'สวัสดีค่ะ/ครับ ยินดีต้อนรับสู่ **MindDoJo AI Assessment** — เราจะคุยกันแบบสบาย ๆ เพื่อรู้จักคุณ แล้วเข้าสู่การจำลองสถานการณ์การทำงาน\n\nเมื่อจบการจำลอง คุณจะได้ **Dashboard คะแนน 6 ด้านการสื่อสาร** (ชัดเจน โครงสร้างการพูด การเห็นใจ การฟังอย่างตั้งใจ การโน้มน้าว และน้ำเสียงมืออาชีพ)\n\nขอทราบ**ชื่อ**ที่อยากให้เรียกก่อนได้ไหมคะ/ครับ?';

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
          setScenario(s);
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
        const normalized = arr.slice(0, RANDOM_SCENARIO_COUNT).map((o) => ({
          shortTitle: o.shortTitle || 'สถานการณ์',
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

  const startSimulation = useCallback(async () => {
    if (!profile || !scenario) return;
    setPhase('simulation');
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
      });

      setSimStreamingId(assistantId);
      setSimMessages([{ id: assistantId, role: 'assistant', content: '' }]);

      const raw = await openaiChatStream(
        [
          { role: 'system', content: sys },
          {
            role: 'user',
            content:
              'เริ่มจำลองสถานการณ์ — เปิดฉากจากฝั่งคุณในฐานะคู่สนทนาตามบทบาท (พูดเป็นตัวละครจริง ไม่ต้องอธิบายกติกา)',
          },
        ],
        0.7,
        (delta) => {
          setSimMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + delta } : m)),
          );
        },
      );

      const ended = raw.includes('[[SIM_END]]');
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
  }, [profile, scenario, profileSummary]);

  const runSimulationReply = useCallback(
    async (history: ChatMsg[]) => {
      if (!profile || !scenario) return;

      const assistantId = uid();
      setSimStreamingId(assistantId);
      setSimMessages([...history, { id: assistantId, role: 'assistant', content: '' }]);

      const sys = simulationSystem({
        userRole: scenario.userRole,
        counterpart: scenario.counterpart,
        context: scenario.context,
        situationSummary: scenario.situationSummary,
        profileSummary,
      });
      const historyForApi = history.map((m) => ({ role: m.role, content: m.content }));

      try {
        const raw = await openaiChatStream(
          [{ role: 'system', content: sys }, ...historyForApi],
          0.7,
          (delta) => {
            setSimMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + delta } : m)),
            );
          },
        );

        const ended = raw.includes('[[SIM_END]]');
        const visible = raw.replace(/\[\[SIM_END\]\]/g, '').trim();
        const assistantMsg: ChatMsg = { id: assistantId, role: 'assistant', content: visible || raw };
        const doneMsg: ChatMsg = {
          id: uid(),
          role: 'assistant',
          content:
            'การประเมินเสร็จสิ้นแล้ว พิมพ์คำว่า **result** เพื่อเปิดหน้า Dashboard ผลการประเมิน (คะแนน 6 ด้านการสื่อสาร)',
        };

        setSimMessages(ended ? [...history, assistantMsg, doneMsg] : [...history, assistantMsg]);
        if (ended) setPhase('awaiting_result');
      } catch (e) {
        // revert to user history (remove empty assistant placeholder)
        setSimMessages(history);
        throw e;
      } finally {
        setSimStreamingId(null);
      }
    },
    [profile, scenario, profileSummary],
  );

  const loadFinalReport = useCallback(async () => {
    if (!profile || !scenario) return;
    setBusy(true);
    setError(null);
    try {
      const lines = simMessages.map((m) => `${m.role === 'user' ? 'ผู้ใช้' : 'คู่สนทนา (AI)'}: ${m.content}`);
      const transcript = lines.join('\n\n');
      const report = await getMindDojoStructuredReport({ profile, scenario, simulationTranscript: transcript });
      if (!report) {
        setError('สร้างรายงานไม่สำเร็จ — ลองอีกครั้งหรือตรวจสอบการเชื่อมต่อ AI');
        return;
      }
      const payload = {
        savedAt: Date.now(),
        profile,
        scenario,
        report,
      };
      sessionStorage.setItem(MINDDOJO_REPORT_STORAGE_KEY, JSON.stringify(payload));
      navigate('/assessment/minddojo/result', { replace: true });
    } catch {
      setError('โหลดผลการประเมินไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }, [profile, scenario, simMessages, navigate]);

  const onSend = async () => {
    const text = input.trim();
    if (!text || busy) return;

    if (phase === 'awaiting_result' && text.toLowerCase() === 'result') {
      setInput('');
      await loadFinalReport();
      return;
    }

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
          setInput('');
          setScenario({
            userRole: opt.userRole,
            counterpart: opt.counterpart,
            context: opt.context,
            situationSummary: opt.situationSummary,
          });
          setPhase('confirm');
          setMainMessages((prev) => [
            ...prev,
            { id: uid(), role: 'user', content: text.trim() },
            {
              id: uid(),
              role: 'assistant',
              content: `เลือกสถานการณ์: **${opt.shortTitle}** — กดยืนยันด้านล่างเมื่อพร้อมเริ่มจำลองค่ะ/ครับ`,
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
      } else if (phase === 'awaiting_result') {
        setSimMessages((prev) => [...prev, { id: uid(), role: 'user', content: text }]);
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
                              <TypewriterText text={m.content} resetOnTextChange={m.id !== mainStreamingId} />
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
                        สุ่มสถานการณ์ (10 ตัวเลือก)
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
                          setScenario(sc);
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
                              content: `สรุปสถานการณ์ที่เลือก:\n\n• **${shortTitle}**\n• บทบาทคุณ: ${sc.userRole}\n• คู่สนทนา: ${sc.counterpart}\n• บริบท: ${sc.context}\n• ${sc.situationSummary}\n\nกด «ยืนยันและเริ่มจำลอง» เมื่อพร้อม`,
                            },
                          ]);
                        }}
                        className="text-left rounded-xl border border-white/15 bg-white/5 hover:border-yellow-400/40 hover:bg-white/[0.08] p-3 sm:p-4 transition-colors disabled:opacity-50 touch-manipulation"
                      >
                        <span className="text-yellow-400 font-bold text-xs sm:text-sm">
                          {i + 1}. {opt.shortTitle}
                        </span>
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
                    {simMessages.map((m) =>
                      m.role === 'assistant' ? (
                        <div
                          key={m.id}
                          className="flex w-full justify-start gap-2 sm:gap-3 items-start"
                        >
                          <img
                            src={MINDDOJO_CHATBOT_AVATAR_URL}
                            alt="MindDoJo"
                            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover shrink-0 ring-2 ring-amber-400/25 shadow-md shadow-black/20 mt-0.5"
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0 max-w-[min(100%,42rem)] rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3 lg:px-5 lg:py-3.5 text-sm lg:text-base leading-relaxed bg-white/5">
                            <span className="text-[10px] lg:text-xs font-semibold text-gray-500 block mb-1">
                              สถานการณ์
                            </span>
                            {m.id === lastSimMessageId ? (
                              <TypewriterText text={m.content} resetOnTextChange={m.id !== simStreamingId} />
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
                  พิมพ์ <strong className="text-yellow-400">result</strong> เพื่อไปหน้า Dashboard ผลการประเมิน
                </p>
              )}
              <div className="flex gap-2 items-end">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  disabled={busy || phase === 'scenario_choice' || phase === 'confirm'}
                  placeholder={
                    phase === 'awaiting_result'
                      ? 'พิมพ์ result'
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
                    busy || !input.trim() || phase === 'scenario_choice' || phase === 'confirm'
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
