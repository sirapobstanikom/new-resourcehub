import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { isAdminAuthenticated } from '../lib/auth';

type BaseId = 'base1' | 'base2' | 'base3' | 'base4';

type AnswerPayload = {
  id: string;
  created_at: string;
  base_name: BaseId;
  group_name: string;
  respondent_name: string | null;
  answers_json: Record<string, string>;
  summary_text: string | null;
  attachment_name: string | null;
};

const DEFAULT_BASE_OPTIONS: { id: BaseId; label: string; title: string }[] = [
  { id: 'base1', label: 'ฐานที่ 1', title: 'ฐานที่ 1 : The AI Owl Response Engine' },
  { id: 'base2', label: 'ฐานที่ 2', title: 'ฐานที่ 2 : The Secret of Data' },
  { id: 'base3', label: 'ฐานที่ 3', title: 'ฐานที่ 3 : Magic Strategic Plan' },
  { id: 'base4', label: 'ฐานที่ 4', title: 'ฐานที่ 4 : Magical House Crest' },
];
const DEFAULT_GROUP_OPTIONS = ['1', '2', '3', '4', '5', '6', '7', '8'];
const STORAGE_KEY = 'minddojo.hogwarts.innoclub.answers.v1';
const BASE_OPTIONS_KEY = 'minddojo.hogwarts.innoclub.base-options.v1';
const GROUP_OPTIONS_KEY = 'minddojo.hogwarts.innoclub.group-options.v1';

function uid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback UUID v4 style
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

const HogwartsInnoclubPage: React.FC = () => {
  const location = useLocation();
  const isGuestPage = location.pathname.endsWith('/innoclub-hogwarts-guest');
  const [view, setView] = useState<'form' | 'dashboard'>('form');
  const [isAdmin, setIsAdmin] = useState(false);
  const [baseOptions, setBaseOptions] = useState(DEFAULT_BASE_OPTIONS);
  const [groupOptions, setGroupOptions] = useState(DEFAULT_GROUP_OPTIONS);
  const [newBaseLabel, setNewBaseLabel] = useState('');
  const [newBaseTitle, setNewBaseTitle] = useState('');
  const [newGroupLabel, setNewGroupLabel] = useState('');
  const [selectedDashboardGroup, setSelectedDashboardGroup] = useState('');
  const [answers, setAnswers] = useState<AnswerPayload[]>([]);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    base_name: '' as BaseId | '',
    group_name: '',
    respondent_name: '',
    base1_chatbot_link: '',
    base2_q1: '',
    base2_q2: '',
    base2_q3: '',
    base3_swot: '',
    base3_profit_target: '',
    base3_strategies: '',
    base4_logo_link: '',
    base4_logo_file_name: '',
  });

  const canSubmit = useMemo(() => {
    if (!form.base_name || !form.group_name) return false;
    if (form.base_name === 'base1') return Boolean(form.base1_chatbot_link.trim());
    if (form.base_name === 'base2') return Boolean(form.base2_q1.trim() && form.base2_q2.trim() && form.base2_q3.trim());
    if (form.base_name === 'base3') return Boolean(form.base3_swot.trim() && form.base3_profit_target.trim() && form.base3_strategies.trim());
    if (form.base_name === 'base4') return Boolean(form.base4_logo_file_name.trim() || form.base4_logo_link.trim());
    return false;
  }, [form]);

  useEffect(() => {
    setIsAdmin(!isGuestPage && isAdminAuthenticated());
    try {
      const rawBase = localStorage.getItem(BASE_OPTIONS_KEY);
      const rawGroup = localStorage.getItem(GROUP_OPTIONS_KEY);
      if (rawBase) {
        const parsedBase = JSON.parse(rawBase) as { id: BaseId; label: string; title: string }[];
        if (Array.isArray(parsedBase) && parsedBase.length > 0) setBaseOptions(parsedBase);
      }
      if (rawGroup) {
        const parsedGroup = JSON.parse(rawGroup) as string[];
        if (Array.isArray(parsedGroup) && parsedGroup.length > 0) setGroupOptions(parsedGroup);
      }
    } catch {
      setBaseOptions(DEFAULT_BASE_OPTIONS);
      setGroupOptions(DEFAULT_GROUP_OPTIONS);
    }
  }, [isGuestPage]);

  const saveBaseOptions = (next: { id: BaseId; label: string; title: string }[]) => {
    setBaseOptions(next);
    localStorage.setItem(BASE_OPTIONS_KEY, JSON.stringify(next));
  };

  const saveGroupOptions = (next: string[]) => {
    setGroupOptions(next);
    localStorage.setItem(GROUP_OPTIONS_KEY, JSON.stringify(next));
  };

  const readLocalAnswers = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [] as AnswerPayload[];
      const parsed = JSON.parse(raw) as AnswerPayload[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [] as AnswerPayload[];
    }
  };

  const writeLocalAnswers = (next: AnswerPayload[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const loadAnswers = async () => {
    setLoadingDashboard(true);
    setError(null);
    const localData = readLocalAnswers();

    if (!isSupabaseConfigured) {
      setAnswers(localData);
      setLoadingDashboard(false);
      return;
    }

    const { data, error: loadError } = await supabase
      .from('hogwarts_innoclub_answers')
      .select('id, created_at, base_name, group_name, respondent_name, answers_json, summary_text, attachment_name')
      .order('created_at', { ascending: false });

    if (loadError) {
      setAnswers(localData);
      const missingTable = /could not find the table|relation .* does not exist/i.test(loadError.message || '');
      setError(
        missingTable
          ? 'ยังไม่พบตาราง hogwarts_innoclub_answers ใน Supabase กรุณารันไฟล์ backend/supabase/create_hogwarts_innoclub_answers.sql ใน SQL Editor (ตอนนี้แสดงข้อมูลจากเครื่องนี้แทน)'
          : `โหลดจากฐานข้อมูลไม่ได้ จึงแสดงข้อมูลจากเครื่องนี้แทน (${loadError.message})`
      );
      setLoadingDashboard(false);
      return;
    }

    const merged = [...(data as AnswerPayload[]), ...localData]
      .filter((v, i, arr) => arr.findIndex((x) => x.id === v.id) === i)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setAnswers(merged);
    setLoadingDashboard(false);
  };

  useEffect(() => {
    if (view === 'dashboard') {
      loadAnswers();
    }
  }, [view]);

  const dashboardGroupOptions = useMemo(() => {
    const fromAnswers = Array.from(new Set(answers.map((row) => row.group_name))).filter(Boolean);
    const merged = Array.from(new Set([...groupOptions, ...fromAnswers]));
    return merged.sort((a, b) => Number(a) - Number(b));
  }, [answers, groupOptions]);

  useEffect(() => {
    if (!selectedDashboardGroup && dashboardGroupOptions.length > 0) {
      setSelectedDashboardGroup(dashboardGroupOptions[0]);
    }
  }, [dashboardGroupOptions, selectedDashboardGroup]);

  const dashboardAnswersByBase = useMemo(() => {
    const scoped = answers.filter((row) => (selectedDashboardGroup ? row.group_name === selectedDashboardGroup : true));
    return baseOptions.map((base) => ({
      base,
      rows: scoped.filter((row) => row.base_name === base.id),
    }));
  }, [answers, selectedDashboardGroup, baseOptions]);

  const buildPayloadByBase = (): { answers_json: Record<string, string>; summary_text: string | null; attachment_name: string | null } => {
    if (form.base_name === 'base1') {
      return {
        answers_json: {
          chatbot_link: form.base1_chatbot_link.trim(),
        },
        summary_text: `Chatbot: ${form.base1_chatbot_link.trim()}`,
        attachment_name: null,
      };
    }
    if (form.base_name === 'base2') {
      return {
        answers_json: {
          compare_sales_growth: form.base2_q1.trim(),
          top3_profit_products: form.base2_q2.trim(),
          trend_direction: form.base2_q3.trim(),
        },
        summary_text: form.base2_q1.trim().slice(0, 180) || null,
        attachment_name: null,
      };
    }
    if (form.base_name === 'base3') {
      return {
        answers_json: {
          swot_analysis: form.base3_swot.trim(),
          profit_target_reason: form.base3_profit_target.trim(),
          strategy_plan: form.base3_strategies.trim(),
        },
        summary_text: form.base3_profit_target.trim().slice(0, 180) || null,
        attachment_name: null,
      };
    }
    return {
      answers_json: {
        logo_link: form.base4_logo_link.trim(),
        logo_file_name: form.base4_logo_file_name.trim(),
      },
      summary_text: `Logo: ${form.base4_logo_file_name.trim() || form.base4_logo_link.trim() || '-'}`,
      attachment_name: form.base4_logo_file_name.trim() || null,
    };
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!canSubmit) {
      setError('กรุณากรอกคำตอบที่จำเป็นของฐานที่เลือกให้ครบก่อนส่ง');
      return;
    }

    setLoadingSubmit(true);
    const basePayload = buildPayloadByBase();
    const payload: AnswerPayload = {
      id: uid(),
      created_at: new Date().toISOString(),
      base_name: form.base_name as BaseId,
      group_name: form.group_name,
      respondent_name: form.respondent_name.trim() || null,
      answers_json: basePayload.answers_json,
      summary_text: basePayload.summary_text,
      attachment_name: basePayload.attachment_name,
    };

    const localData = readLocalAnswers();
    writeLocalAnswers([payload, ...localData]);

    if (isSupabaseConfigured) {
      const { error: submitError } = await supabase.from('hogwarts_innoclub_answers').insert(payload as never);
      if (submitError) {
        setError(`บันทึกขึ้นฐานข้อมูลไม่สำเร็จ แต่บันทึกไว้บนเครื่องแล้ว (${submitError.message})`);
      } else {
        setSuccess('ส่งคำตอบเรียบร้อย!');
      }
    } else {
      setSuccess('ส่งคำตอบเรียบร้อย! (โหมด Local)');
    }

    setForm({
      base_name: form.base_name,
      group_name: form.group_name,
      respondent_name: '',
      base1_chatbot_link: '',
      base2_q1: '',
      base2_q2: '',
      base2_q3: '',
      base3_swot: '',
      base3_profit_target: '',
      base3_strategies: '',
      base4_logo_link: '',
      base4_logo_file_name: '',
    });
    setLoadingSubmit(false);
  };

  const selectedBase = baseOptions.find((b) => b.id === form.base_name);

  const inputClass = 'w-full rounded-lg bg-black/40 border border-amber-200/25 px-3 py-2 text-amber-50 placeholder:text-amber-100/40';
  const dashboardBackgroundStyle = {
    backgroundImage: "url('/images/hogwarts/3.png')",
    backgroundSize: '100%',
    backgroundPosition: 'center 22%',
    backgroundRepeat: 'no-repeat',
  } as const;
  return (
    <div className="relative min-h-screen text-white innoclub-hogwarts-font bg-[#07050f] overflow-hidden">
      {view === 'form' ? (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "url('/images/hogwarts/1.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
      ) : (
        <div className="absolute inset-0" style={dashboardBackgroundStyle} />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-[#07050f]/45 via-[#07050f]/68 to-[#07050f]/85" />
      <div className="relative z-10">
      <header className="border-b border-amber-200/15 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-300 text-black font-black flex items-center justify-center">H</div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-amber-200/90">Hogwarts Mode</p>
              <h1 className="font-bold text-amber-50 leading-tight">InnoClub Answer System</h1>
              <p className="text-xs text-amber-100/70 mt-0.5">Role: {isAdmin ? 'Admin' : 'Guest'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-200/25 bg-white/10 text-amber-100 hover:bg-white/20 transition-colors"
            >
              <span className="w-6 h-6 rounded-md bg-amber-300 text-black font-black flex items-center justify-center text-xs">M</span>
              <span className="text-sm font-semibold">MindDojo</span>
            </Link>
            <button
              type="button"
              onClick={() => setView('form')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold ${view === 'form' ? 'bg-amber-300 text-black' : 'bg-white/10 text-amber-100'}`}
            >
              กรอกคำตอบ
            </button>
            <button
              type="button"
              onClick={() => setView('dashboard')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold ${view === 'dashboard' ? 'bg-amber-300 text-black' : 'bg-white/10 text-amber-100'}`}
            >
              Dashboard
            </button>
            <a
              href="/evaluation/innoclub-hogwarts-guest"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 rounded-lg text-sm font-semibold bg-white/10 text-amber-100 hover:bg-white/20"
            >
              Guest
            </a>
            {!isGuestPage && (
              <Link to="/admin/login" className="px-3 py-2 rounded-lg text-sm font-semibold bg-white/10 text-amber-100 hover:bg-white/20">
                Login Admin
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {view === 'form' ? (
          <form onSubmit={submit} className="max-w-3xl mx-auto space-y-6 lg:space-y-7">
            <div className="rounded-2xl border border-amber-200/20 bg-black/35 p-5">
              <h2 className="text-xl font-bold text-amber-100 mb-1">เลือกฐานและกลุ่ม</h2>
              <p className="text-sm text-amber-100/75 mb-4">เริ่มจากเลือกฐานและกลุ่มก่อนเข้าสู่การตอบคำถาม</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <label className="space-y-2">
                  <span className="text-sm text-amber-100">ฐาน *</span>
                  <select
                    value={form.base_name}
                    onChange={(e) => setForm((prev) => ({ ...prev, base_name: e.target.value }))}
                    className="w-full rounded-lg bg-black/40 border border-amber-200/25 px-3 py-2 text-amber-50"
                  >
                    <option value="">เลือกฐาน</option>
                    {baseOptions.map((base) => (
                      <option key={base.id} value={base.id}>{base.label}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-amber-100">กลุ่ม *</span>
                  <select
                    value={form.group_name}
                    onChange={(e) => setForm((prev) => ({ ...prev, group_name: e.target.value }))}
                    className="w-full rounded-lg bg-black/40 border border-amber-200/25 px-3 py-2 text-amber-50"
                  >
                    <option value="">เลือกกลุ่ม</option>
                    {groupOptions.map((group) => (
                      <option key={group} value={group}>{group}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block space-y-2 mt-4">
                <span className="text-sm text-amber-100">ชื่อผู้ตอบ (ไม่บังคับ)</span>
                <input
                  value={form.respondent_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, respondent_name: e.target.value }))}
                  placeholder="เช่น Harry Potter"
                  className={inputClass}
                />
              </label>
            </div>

            {isAdmin && (
              <div className="rounded-2xl border border-emerald-200/25 bg-emerald-950/20 p-5 space-y-5">
                <h3 className="text-lg font-bold text-emerald-200">จัดการฐาน/กลุ่ม (Admin)</h3>
                <div>
                  <p className="text-sm text-emerald-100 mb-2">แก้ไขชื่อฐาน / ชื่อหัวข้อฐาน</p>
                  <div className="space-y-2">
                    {baseOptions.map((base) => (
                      <div key={base.id} className="grid sm:grid-cols-[1fr_2fr] gap-2">
                        <input
                          value={base.label}
                          onChange={(e) => {
                            const next = baseOptions.map((b) => (b.id === base.id ? { ...b, label: e.target.value } : b));
                            saveBaseOptions(next);
                          }}
                          className={inputClass}
                        />
                        <input
                          value={base.title}
                          onChange={(e) => {
                            const next = baseOptions.map((b) => (b.id === base.id ? { ...b, title: e.target.value } : b));
                            saveBaseOptions(next);
                          }}
                          className={inputClass}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid sm:grid-cols-[1fr_2fr_auto] gap-2 items-end">
                  <input value={newBaseLabel} onChange={(e) => setNewBaseLabel(e.target.value)} placeholder="ชื่อฐานใหม่" className={inputClass} />
                  <input value={newBaseTitle} onChange={(e) => setNewBaseTitle(e.target.value)} placeholder="หัวข้อฐานใหม่" className={inputClass} />
                  <button
                    type="button"
                    onClick={() => {
                      setError('ระบบรองรับการเพิ่มฐานเฉพาะ 1-4 เท่านั้นในเวอร์ชันนี้ (แก้ไขชื่อได้)');
                    }}
                    className="rounded-lg bg-white/10 text-emerald-100 px-3 py-2 text-sm font-semibold hover:bg-white/20"
                  >
                    เพิ่มฐาน
                  </button>
                </div>
                <div>
                  <p className="text-sm text-emerald-100 mb-2">แก้ไข/เพิ่มกลุ่ม</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {groupOptions.map((group, idx) => (
                      <input
                        key={`${group}-${idx}`}
                        value={group}
                        onChange={(e) => {
                          const next = [...groupOptions];
                          next[idx] = e.target.value;
                          saveGroupOptions(next);
                        }}
                        className="w-16 rounded-lg bg-black/40 border border-amber-200/25 px-2 py-2 text-amber-50 text-center"
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input value={newGroupLabel} onChange={(e) => setNewGroupLabel(e.target.value)} placeholder="เพิ่มกลุ่มใหม่" className={inputClass} />
                    <button
                      type="button"
                      onClick={() => {
                        const label = newGroupLabel.trim();
                        if (!label) return;
                        if (groupOptions.includes(label)) return;
                        saveGroupOptions([...groupOptions, label]);
                        setNewGroupLabel('');
                      }}
                      className="rounded-lg bg-white/10 text-emerald-100 px-3 py-2 text-sm font-semibold hover:bg-white/20"
                    >
                      เพิ่มกลุ่ม
                    </button>
                  </div>
                </div>
              </div>
            )}

            {selectedBase && (
              <div className="rounded-2xl border border-amber-200/20 bg-black/35 p-5 space-y-4 min-h-[340px] sm:min-h-[380px] lg:min-h-[430px] transition-all duration-300">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-bold text-amber-100">{selectedBase.title}</h3>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-300/20 border border-amber-200/30 text-amber-100">
                    {baseOptions.findIndex((b) => b.id === selectedBase.id) + 1}/4
                  </span>
                </div>

                {form.base_name === 'base1' && (
                  <>
                    <label className="block space-y-2">
                      <span className="text-sm text-amber-100">1. Link Chatbot ที่สร้าง *</span>
                      <input
                        value={form.base1_chatbot_link}
                        onChange={(e) => setForm((prev) => ({ ...prev, base1_chatbot_link: e.target.value }))}
                        placeholder="https://..."
                        className={inputClass}
                      />
                    </label>
                  </>
                )}

                {form.base_name === 'base2' && (
                  <>
                    <label className="block space-y-2">
                      <span className="text-sm text-amber-100">1. เปรียบเทียบยอดขายในช่วงเวลาต่าง ๆ เพื่อดูการเติบโต *</span>
                      <textarea rows={4} value={form.base2_q1} onChange={(e) => setForm((prev) => ({ ...prev, base2_q1: e.target.value }))} className={`${inputClass} min-h-[110px] resize-y`} />
                    </label>
                    <label className="block space-y-2">
                      <span className="text-sm text-amber-100">2. Top 3 ผลิตภัณฑ์ที่กำไรสูงสุด และแนวทางขยายยอดขาย *</span>
                      <textarea rows={4} value={form.base2_q2} onChange={(e) => setForm((prev) => ({ ...prev, base2_q2: e.target.value }))} className={`${inputClass} min-h-[110px] resize-y`} />
                    </label>
                    <label className="block space-y-2">
                      <span className="text-sm text-amber-100">3. แนวโน้มโดยรวมเมื่อเวลาผ่านไป (เติบโต/คงที่/ลดลง) *</span>
                      <textarea rows={4} value={form.base2_q3} onChange={(e) => setForm((prev) => ({ ...prev, base2_q3: e.target.value }))} className={`${inputClass} min-h-[110px] resize-y`} />
                    </label>
                  </>
                )}

                {form.base_name === 'base3' && (
                  <>
                    <label className="block space-y-2">
                      <span className="text-sm text-amber-100">1. วิเคราะห์ SWOT ทั้ง 4 ช่อง *</span>
                      <textarea rows={5} value={form.base3_swot} onChange={(e) => setForm((prev) => ({ ...prev, base3_swot: e.target.value }))} className={`${inputClass} min-h-[132px] resize-y`} />
                    </label>
                    <label className="block space-y-2">
                      <span className="text-sm text-amber-100">2. เป้าหมายกำไรเท่าไร และเพราะเหตุใด *</span>
                      <textarea rows={4} value={form.base3_profit_target} onChange={(e) => setForm((prev) => ({ ...prev, base3_profit_target: e.target.value }))} className={`${inputClass} min-h-[110px] resize-y`} />
                    </label>
                    <label className="block space-y-2">
                      <span className="text-sm text-amber-100">3. กลยุทธ์ที่จะใช้มีอะไรบ้าง *</span>
                      <textarea rows={4} value={form.base3_strategies} onChange={(e) => setForm((prev) => ({ ...prev, base3_strategies: e.target.value }))} className={`${inputClass} min-h-[110px] resize-y`} />
                    </label>
                  </>
                )}

                {form.base_name === 'base4' && (
                  <>
                    <label className="block space-y-2">
                      <span className="text-sm text-amber-100">Logo ที่สร้าง (Link ถ้ามี)</span>
                      <input
                        value={form.base4_logo_link}
                        onChange={(e) => setForm((prev) => ({ ...prev, base4_logo_link: e.target.value }))}
                        placeholder="https://..."
                        className={inputClass}
                      />
                    </label>
                    <label className="block space-y-2">
                      <span className="text-sm text-amber-100">อัปโหลดไฟล์รูปโลโก้ *</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const fileName = e.target.files?.[0]?.name || '';
                          setForm((prev) => ({ ...prev, base4_logo_file_name: fileName }));
                        }}
                        className="w-full rounded-lg bg-black/40 border border-amber-200/25 px-3 py-2 text-amber-50 file:mr-3 file:rounded-md file:border-0 file:bg-amber-300 file:px-3 file:py-1.5 file:text-black file:font-semibold"
                      />
                    </label>
                    {form.base4_logo_file_name && (
                      <p className="text-sm text-amber-100/80">ไฟล์ที่เลือก: {form.base4_logo_file_name}</p>
                    )}
                  </>
                )}
              </div>
            )}

            {error && <div className="rounded-lg border border-red-400/35 bg-red-500/10 px-4 py-3 text-red-200 text-sm">{error}</div>}
            {success && <div className="rounded-lg border border-emerald-400/35 bg-emerald-500/10 px-4 py-3 text-emerald-200 text-sm">{success}</div>}

            <button
              type="submit"
              disabled={!canSubmit || loadingSubmit}
              className="w-full rounded-xl bg-amber-300 text-black font-bold py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingSubmit ? 'กำลังร่ายคาถาบันทึก...' : 'ส่งคำตอบ'}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-amber-200/20 bg-black/35 p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-amber-100">Dashboard รายกลุ่ม</h2>
                  <p className="text-sm text-amber-100/70 mt-1">เลือกกลุ่ม แล้วดูคำตอบแยกตามฐาน 1-4</p>
                </div>
                <button
                  type="button"
                  onClick={loadAnswers}
                  className="rounded-lg bg-white/10 text-amber-100 px-3 py-2 text-sm font-semibold hover:bg-white/20"
                >
                  รีเฟรชข้อมูล
                </button>
              </div>
              <div className="mt-4 max-w-xs">
                <label className="space-y-2 block">
                  <span className="text-sm text-amber-100">เลือกกลุ่ม</span>
                  <select
                    value={selectedDashboardGroup}
                    onChange={(e) => setSelectedDashboardGroup(e.target.value)}
                    className="w-full rounded-lg bg-black/40 border border-amber-200/25 px-3 py-2 text-amber-50"
                  >
                    {dashboardGroupOptions.map((group) => (
                      <option key={group} value={group}>
                        กลุ่ม {group}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            {loadingDashboard && <p className="text-amber-100/80">กำลังเรียกข้อมูล...</p>}
            {error && <div className="rounded-lg border border-red-400/35 bg-red-500/10 px-4 py-3 text-red-200 text-sm">{error}</div>}
            {!loadingDashboard && dashboardAnswersByBase.every((section) => section.rows.length === 0) && (
              <div className="rounded-xl border border-amber-200/20 bg-black/30 p-6 text-amber-100/80">
                ยังไม่มีคำตอบสำหรับกลุ่มนี้
              </div>
            )}

            {dashboardAnswersByBase.map(({ base, rows }) => (
              <section key={base.id} className="rounded-2xl border border-amber-200/20 bg-black/35 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <h3 className="text-lg font-bold text-amber-100">{base.title || base.label}</h3>
                  <div className="text-sm text-amber-100/85">จำนวนคำตอบ {rows.length}</div>
                </div>
                {rows.length === 0 ? (
                  <p className="text-amber-100/70 text-sm">ยังไม่มีคำตอบในฐานนี้</p>
                ) : (
                  <div className="space-y-3">
                    {rows.map((row) => (
                      <div key={row.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <div className="text-xs text-amber-100/70 mb-2">
                          {new Date(row.created_at).toLocaleString('th-TH')} · ผู้ตอบ: {row.respondent_name || '-'}
                        </div>
                        <div className="text-sm text-amber-50 whitespace-pre-wrap">{row.summary_text || '-'}</div>
                        {row.attachment_name && (
                          <div className="text-xs text-amber-100/70 mt-2">ไฟล์แนบ: {row.attachment_name}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </main>
      </div>
    </div>
  );
};

export default HogwartsInnoclubPage;
