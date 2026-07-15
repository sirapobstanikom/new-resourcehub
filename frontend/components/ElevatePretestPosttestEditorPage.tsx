import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, ChevronDown, ChevronUp, Copy, ExternalLink, Plus, Trash2 } from 'lucide-react';
import {
  countScored,
  createEmptyBank,
  createEmptyQuestion,
  elevateDashboardPath,
  elevateUniqueIdFromName,
  elevateUserFormPath,
  elevateUserFormUrl,
  loadStoredElevateBanks,
  newElevateId,
  questionTypeLabel,
  saveElevateBanksToStorage,
  validateQuestion,
  type ElevateQuestion,
  type ElevateQuestionType,
  type ElevateTestBank,
  type ElevateTestPhase,
} from '../lib/elevatePretestPosttest';
import {
  deleteElevateBankFromSupabase,
  fetchElevateBanksFromSupabase,
  upsertElevateBankToSupabase,
} from '../lib/elevatePretestPosttestSupabase';
import { isSupabaseConfigured } from '../lib/supabase';

type DraftQuestion = {
  title: string;
  type: ElevateQuestionType;
  options: string[];
  correctOption: string;
  correctAnswer: string;
};

const emptyDraft = (): DraftQuestion => ({
  title: '',
  type: 'choice',
  options: ['ตัวเลือก 1', 'ตัวเลือก 2', 'ตัวเลือก 3', 'ตัวเลือก 4'],
  correctOption: 'ตัวเลือก 1',
  correctAnswer: '',
});

function cloneQuestions(questions: ElevateQuestion[]): ElevateQuestion[] {
  return questions.map((q) => ({
    ...q,
    id: newElevateId('q'),
    options: q.options ? [...q.options] : undefined,
  }));
}

const ElevatePretestPosttestEditorPage: React.FC = () => {
  const [banks, setBanks] = useState<ElevateTestBank[]>(() => loadStoredElevateBanks());
  const [selectedId, setSelectedId] = useState(() => loadStoredElevateBanks()[0]?.id || '');
  const [phase, setPhase] = useState<ElevateTestPhase>('pretest');
  const [draft, setDraft] = useState<DraftQuestion>(emptyDraft);
  const [newBankName, setNewBankName] = useState('');
  const [message, setMessage] = useState('');
  const [syncHint, setSyncHint] = useState('');
  const [loadingRemote, setLoadingRemote] = useState(false);

  const selected = useMemo(
    () => banks.find((bank) => bank.id === selectedId) || null,
    [banks, selectedId]
  );

  const questions = selected ? selected[phase] : [];

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    (async () => {
      setLoadingRemote(true);
      const result = await fetchElevateBanksFromSupabase();
      if (cancelled) return;
      setLoadingRemote(false);
      if (result.tableMissing) {
        setSyncHint('บันทึกในเครื่องแล้ว — ยังไม่มีตารางบน Supabase (ใช้ได้ปกติ)');
        return;
      }
      if (result.error) {
        setSyncHint(`ซิงก์ระบบคลาวด์ไม่สำเร็จ: ${result.error}`);
        return;
      }
      if (result.banks.length > 0) {
        setBanks(result.banks);
        saveElevateBanksToStorage(result.banks);
        setSelectedId((prev) =>
          result.banks.some((b) => b.id === prev) ? prev : result.banks[0]?.id || ''
        );
        setSyncHint('โหลดจาก Supabase แล้ว');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = async (
    next: ElevateTestBank[],
    opts?: { upsertId?: string; deleteId?: string }
  ) => {
    setBanks(next);
    saveElevateBanksToStorage(next);

    if (!isSupabaseConfigured) return;

    if (opts?.deleteId) {
      const del = await deleteElevateBankFromSupabase(opts.deleteId);
      if (!del.ok && del.error) {
        setSyncHint(`ลบบนคลาวด์ไม่สำเร็จ: ${del.error}`);
      }
    }

    if (opts?.upsertId) {
      const bank = next.find((b) => b.id === opts.upsertId);
      if (!bank) return;
      const up = await upsertElevateBankToSupabase(bank);
      if (up.tableMissing) {
        setSyncHint('บันทึกในเครื่องแล้ว — ยังไม่มีตารางบน Supabase');
      } else if (!up.ok && up.error) {
        setSyncHint(`ซิงก์คลาวด์ไม่สำเร็จ: ${up.error}`);
      } else if (up.ok) {
        setSyncHint('บันทึกและซิงก์คลาวด์แล้ว');
      }
    }
  };

  const updateSelected = (updater: (current: ElevateTestBank) => ElevateTestBank) => {
    if (!selected) return;
    const nextBank = { ...updater(selected), updatedAt: new Date().toISOString() };
    const next = banks.map((bank) => (bank.id === selected.id ? nextBank : bank));
    void persist(next, { upsertId: selected.id });
  };

  const createBank = () => {
    const name = newBankName.trim() || `ชุดข้อสอบ ${banks.length + 1}`;
    const bank = createEmptyBank(name, new Set(banks.map((b) => b.id)));
    const next = [bank, ...banks];
    setSelectedId(bank.id);
    setNewBankName('');
    setPhase('pretest');
    setMessage(`สร้างชุด “${name}” แล้ว`);
    void persist(next, { upsertId: bank.id });
  };

  const renameSelectedBank = (name: string) => {
    updateSelected((bank) => ({ ...bank, name }));
  };

  const syncSelectedBankLinkFromName = () => {
    if (!selected) return;
    const trimmed = selected.name.trim();
    if (!trimmed) return;
    const existingIds = new Set(banks.filter((b) => b.id !== selected.id).map((b) => b.id));
    const nextId = elevateUniqueIdFromName(trimmed, existingIds);
    if (nextId === selected.id) return;

    const previousId = selected.id;
    const nextBank: ElevateTestBank = {
      ...selected,
      id: nextId,
      name: trimmed,
      updatedAt: new Date().toISOString(),
    };
    const next = banks.map((bank) => (bank.id === previousId ? nextBank : bank));
    setSelectedId(nextId);
    void persist(next, { upsertId: nextId, deleteId: previousId });
    setMessage('อัปเดตลิงก์ตามชื่อข้อสอบแล้ว');
  };

  const deleteBank = () => {
    if (!selected) return;
    if (!window.confirm(`ลบชุดข้อสอบ “${selected.name}” ?`)) return;
    const next = banks.filter((bank) => bank.id !== selected.id);
    setSelectedId(next[0]?.id || '');
    setMessage('ลบชุดข้อสอบแล้ว');
    void persist(next, { deleteId: selected.id });
  };

  const updateQuestion = (index: number, updater: (q: ElevateQuestion) => ElevateQuestion) => {
    updateSelected((bank) => {
      const list = [...bank[phase]];
      list[index] = updater(list[index]);
      return { ...bank, [phase]: list };
    });
  };

  const moveQuestion = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= questions.length) return;
    updateSelected((bank) => {
      const list = [...bank[phase]];
      const [item] = list.splice(index, 1);
      list.splice(target, 0, item);
      return { ...bank, [phase]: list };
    });
  };

  const removeQuestion = (index: number) => {
    updateSelected((bank) => ({
      ...bank,
      [phase]: bank[phase].filter((_, i) => i !== index),
    }));
    setMessage('ลบโจทย์แล้ว');
  };

  const changeQuestionType = (index: number, type: ElevateQuestionType) => {
    updateQuestion(index, (q) => {
      if (type === q.type) return q;
      if (type === 'text') {
        return {
          id: q.id,
          title: q.title,
          type: 'text',
          correctAnswer: q.correctAnswer || '',
        };
      }
      const base = createEmptyQuestion('choice');
      return {
        ...base,
        id: q.id,
        title: q.title,
      };
    });
  };

  const addOption = (index: number) => {
    updateQuestion(index, (q) => {
      const options = [...(q.options || []), `ตัวเลือก ${(q.options?.length || 0) + 1}`];
      return { ...q, options };
    });
  };

  const updateOption = (qIndex: number, optionIndex: number, value: string) => {
    updateQuestion(qIndex, (q) => {
      const options = [...(q.options || [])];
      const prev = options[optionIndex];
      options[optionIndex] = value;
      return {
        ...q,
        options,
        correctOption: q.correctOption === prev ? value : q.correctOption,
      };
    });
  };

  const removeOption = (qIndex: number, optionIndex: number) => {
    updateQuestion(qIndex, (q) => {
      const options = (q.options || []).filter((_, i) => i !== optionIndex);
      const correctOption =
        q.correctOption && options.includes(q.correctOption) ? q.correctOption : options[0] || '';
      return { ...q, options, correctOption };
    });
  };

  const addQuestionFromDraft = () => {
    if (!selected) return;
    const candidate: ElevateQuestion =
      draft.type === 'choice'
        ? {
            id: newElevateId('q'),
            title: draft.title.trim(),
            type: 'choice',
            options: draft.options.map((o) => o.trim()).filter(Boolean),
            correctOption: draft.correctOption.trim(),
          }
        : {
            id: newElevateId('q'),
            title: draft.title.trim(),
            type: 'text',
            correctAnswer: draft.correctAnswer.trim(),
          };

    if (candidate.type === 'choice' && candidate.correctOption) {
      const opts = candidate.options || [];
      if (!opts.includes(candidate.correctOption) && opts.length > 0) {
        candidate.correctOption = opts[0];
      }
    }

    const error = validateQuestion(candidate);
    if (error) {
      setMessage(error);
      return;
    }

    updateSelected((bank) => ({
      ...bank,
      [phase]: [...bank[phase], candidate],
    }));
    setDraft(emptyDraft());
    setMessage(`เพิ่มโจทย์ใน ${phase === 'pretest' ? 'Pretest' : 'Posttest'} แล้ว`);
  };

  const copyPretestToPosttest = () => {
    if (!selected) return;
    if (selected.pretest.length === 0) {
      setMessage('ยังไม่มีโจทย์ใน Pretest');
      return;
    }
    if (
      selected.posttest.length > 0 &&
      !window.confirm('Posttest มีโจทย์อยู่แล้ว — แทนที่ด้วยสำเนาจาก Pretest?')
    ) {
      return;
    }
    updateSelected((bank) => ({
      ...bank,
      posttest: cloneQuestions(bank.pretest),
    }));
    setPhase('posttest');
    setMessage('คัดลอกโจทย์จาก Pretest → Posttest แล้ว');
  };

  return (
    <div className="min-h-screen bg-[#070707] text-white selection:bg-yellow-300 selection:text-black">
      <header className="border-b border-yellow-400/15 bg-[#0a0a0a]">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-400/80">ELEVATE</p>
            <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">Pretest-Posttest editor</h1>
            <p className="mt-2 text-sm text-gray-400">
              สร้างชุดข้อสอบ Pretest / Posttest — ช้อยส์กำหนดข้อถูก หรือตอบคำถามแบบข้อความ
            </p>
          </div>
          <div className="text-xs text-gray-500 space-y-1 sm:text-right">
            {loadingRemote && <p>กำลังโหลดจากคลาวด์...</p>}
            {syncHint && <p className="text-yellow-400/80">{syncHint}</p>}
            {message && <p className="text-emerald-300">{message}</p>}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 h-fit">
          <h2 className="text-sm font-bold text-yellow-300">ชุดข้อสอบ</h2>
          <div className="flex gap-2">
            <input
              value={newBankName}
              onChange={(e) => setNewBankName(e.target.value)}
              placeholder="ชื่อชุดใหม่"
              className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') createBank();
              }}
            />
            <button
              type="button"
              onClick={createBank}
              className="inline-flex items-center gap-1 rounded-xl bg-yellow-400 px-3 py-2 text-sm font-bold text-black hover:bg-yellow-300"
            >
              <Plus className="h-4 w-4" />
              สร้าง
            </button>
          </div>
          <div className="space-y-1 max-h-[60vh] overflow-y-auto">
            {banks.length === 0 && (
              <p className="text-xs text-gray-500 py-4 text-center">ยังไม่มีชุดข้อสอบ — กดสร้างเพื่อเริ่ม</p>
            )}
            {banks.map((bank) => {
              const active = bank.id === selectedId;
              return (
                <button
                  key={bank.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(bank.id);
                    setMessage('');
                  }}
                  className={`w-full rounded-xl px-3 py-2.5 text-left transition-colors ${
                    active
                      ? 'bg-yellow-400/15 border border-yellow-400/40 text-yellow-100'
                      : 'border border-transparent hover:bg-white/5 text-gray-300'
                  }`}
                >
                  <p className="text-sm font-semibold truncate">{bank.name}</p>
                  <p className="mt-0.5 text-[11px] text-gray-500">
                    Pre {bank.pretest.length} · Post {bank.posttest.length}
                  </p>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="space-y-4">
          {!selected ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-6 py-16 text-center">
              <p className="text-sm text-gray-400">เลือกหรือสร้างชุดข้อสอบทางซ้ายเพื่อเริ่มแก้ไข</p>
            </div>
          ) : (
            <>
              <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1 space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                      ชื่อชุดข้อสอบ
                    </label>
                    <input
                      value={selected.name}
                      onChange={(e) => renameSelectedBank(e.target.value)}
                      onBlur={syncSelectedBankLinkFromName}
                      className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-base font-semibold"
                    />
                    <p className="text-[11px] text-zinc-500">
                      ลิงก์จะอัปเดตตามชื่อเมื่อออกจากช่องนี้
                    </p>
                    <textarea
                      value={selected.description}
                      onChange={(e) =>
                        updateSelected((bank) => ({
                          ...bank,
                          description: e.target.value,
                        }))
                      }
                      rows={2}
                      placeholder="คำอธิบาย (ไม่บังคับ)"
                      className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm resize-y"
                    />
                  </div>
                  <div className="flex flex-col gap-2 self-start">
                    <a
                      href={elevateDashboardPath(selected.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-yellow-400 px-3 py-2 text-sm font-bold text-black hover:bg-yellow-300"
                    >
                      <BarChart3 className="h-4 w-4" />
                      Dashboard
                    </a>
                    <button
                      type="button"
                      onClick={deleteBank}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-red-400/40 bg-red-500/15 px-3 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/25"
                    >
                      <Trash2 className="h-4 w-4" />
                      ลบชุด
                    </button>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {(['pretest', 'posttest'] as const).map((tab) => {
                        const count = selected[tab].length;
                        const scored = countScored(selected[tab]);
                        return (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => setPhase(tab)}
                            className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
                              phase === tab
                                ? 'bg-yellow-400 text-black'
                                : 'border border-white/15 bg-black/30 text-gray-300 hover:border-yellow-400/40'
                            }`}
                          >
                            {tab === 'pretest' ? 'Pretest' : 'Posttest'}
                            <span className="ml-2 font-medium opacity-80">
                              {count} ข้อ · ตรวจได้ {scored}
                            </span>
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={copyPretestToPosttest}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-xs font-semibold text-gray-200 hover:border-yellow-400/40"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        คัดลอก Pretest → Posttest
                      </button>
                    </div>

                    <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-3 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-yellow-300/90">ลิงก์ผู้ใช้งาน</p>
                      <p className="text-[11px] text-zinc-500">
                        ใช้โดเมนจริง + ชื่อชุดข้อสอบใน URL · แชร์ลิงก์นี้ให้ผู้เข้าอบรม
                      </p>
                      {(['pretest', 'posttest'] as const).map((linkPhase) => {
                        const path = elevateUserFormPath(selected.id, linkPhase);
                        const fullUrl = elevateUserFormUrl(selected.id, linkPhase);
                        const count = selected[linkPhase].length;
                        return (
                          <div
                            key={linkPhase}
                            className="flex flex-col gap-2 rounded-lg border border-white/10 bg-black/30 p-2.5 sm:flex-row sm:items-center"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-white">
                                {linkPhase === 'pretest' ? 'Pretest' : 'Posttest'}
                                <span className="ml-2 font-medium text-zinc-500">{count} ข้อ</span>
                              </p>
                              <p className="mt-0.5 break-all font-mono text-[11px] text-zinc-300">{fullUrl}</p>
                            </div>
                            <div className="flex shrink-0 gap-1.5">
                              <button
                                type="button"
                                disabled={count === 0}
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(fullUrl);
                                    setMessage(
                                      `คัดลอกลิงก์ ${linkPhase === 'pretest' ? 'Pretest' : 'Posttest'} แล้ว`
                                    );
                                  } catch {
                                    setMessage('คัดลอกลิงก์ไม่สำเร็จ');
                                  }
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2.5 py-1.5 text-xs font-semibold text-zinc-200 hover:border-yellow-400/40 disabled:opacity-40"
                              >
                                <Copy className="h-3.5 w-3.5" />
                                คัดลอก
                              </button>
                              <a
                                href={path}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`inline-flex items-center gap-1 rounded-lg border border-yellow-400/40 bg-yellow-400/15 px-2.5 py-1.5 text-xs font-semibold text-yellow-100 hover:bg-yellow-400/25 ${
                                  count === 0 ? 'pointer-events-none opacity-40' : ''
                                }`}
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                เปิด
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  <section className="space-y-3">
                    {questions.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-5 py-10 text-center text-sm text-gray-500">
                        ยังไม่มีโจทย์ใน {phase === 'pretest' ? 'Pretest' : 'Posttest'} — เพิ่มด้านล่าง
                      </div>
                    )}

                    {questions.map((question, index) => (
                      <article
                        key={question.id}
                        className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3"
                      >
                        <div className="flex flex-wrap items-center gap-2 justify-between">
                          <p className="text-xs font-bold uppercase tracking-wide text-yellow-400/80">
                            ข้อ {index + 1} · {questionTypeLabel(question.type)}
                          </p>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => moveQuestion(index, -1)}
                              disabled={index === 0}
                              className="rounded-lg border border-white/10 p-1.5 text-gray-400 hover:bg-white/5 disabled:opacity-30"
                              aria-label="เลื่อนขึ้น"
                            >
                              <ChevronUp className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveQuestion(index, 1)}
                              disabled={index === questions.length - 1}
                              className="rounded-lg border border-white/10 p-1.5 text-gray-400 hover:bg-white/5 disabled:opacity-30"
                              aria-label="เลื่อนลง"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeQuestion(index)}
                              className="rounded-lg border border-red-400/30 bg-red-500/10 px-2 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-500/20"
                            >
                              ลบ
                            </button>
                          </div>
                        </div>

                        <select
                          value={question.type}
                          onChange={(e) => changeQuestionType(index, e.target.value as ElevateQuestionType)}
                          className="rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm"
                        >
                          <option value="choice">ช้อยส์ (กำหนดข้อถูก)</option>
                          <option value="text">ตอบคำถาม (ข้อความ)</option>
                        </select>

                        <textarea
                          value={question.title}
                          onChange={(e) => updateQuestion(index, (q) => ({ ...q, title: e.target.value }))}
                          rows={3}
                          placeholder="พิมพ์โจทย์..."
                          className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm resize-y"
                        />

                        {question.type === 'choice' && (
                          <div className="space-y-2">
                            {(question.options || []).map((option, optionIndex) => (
                              <div key={`${question.id}-opt-${optionIndex}`} className="flex items-center gap-2">
                                <label className="inline-flex items-center gap-1.5 text-xs text-emerald-200 shrink-0">
                                  <input
                                    type="radio"
                                    name={`correct-${question.id}`}
                                    checked={(question.correctOption || '') === option}
                                    onChange={() =>
                                      updateQuestion(index, (q) => ({ ...q, correctOption: option }))
                                    }
                                    className="accent-emerald-400"
                                  />
                                  ถูก
                                </label>
                                <input
                                  value={option}
                                  onChange={(e) => updateOption(index, optionIndex, e.target.value)}
                                  className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeOption(index, optionIndex)}
                                  className="rounded-lg border border-red-400/30 bg-red-500/10 px-2.5 py-2 text-xs font-semibold text-red-200"
                                >
                                  ลบ
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => addOption(index)}
                              className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/20"
                            >
                              + เพิ่มตัวเลือก
                            </button>
                            <p className="text-xs text-emerald-300/80">
                              เลือก radio “ถูก” หน้าตัวเลือกที่เป็นคำตอบถูก
                            </p>
                          </div>
                        )}

                        {question.type === 'text' && (
                          <div className="space-y-1">
                            <label className="text-xs text-gray-500">คำตอบถูก / คำตอบตัวอย่าง (ไม่บังคับ)</label>
                            <input
                              value={question.correctAnswer || ''}
                              onChange={(e) =>
                                updateQuestion(index, (q) => ({ ...q, correctAnswer: e.target.value }))
                              }
                              placeholder="ใส่คำตอบที่คาดหวังถ้าต้องการตรวจอัตโนมัติ"
                              className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm"
                            />
                          </div>
                        )}
                      </article>
                    ))}
                  </section>

                  <section className="rounded-2xl border border-yellow-400/25 bg-yellow-400/5 p-4 space-y-3">
                    <h3 className="text-sm font-bold text-yellow-300">
                      เพิ่มโจทย์ใหม่ · {phase === 'pretest' ? 'Pretest' : 'Posttest'}
                    </h3>
                    <select
                      value={draft.type}
                      onChange={(e) => {
                        const type = e.target.value as ElevateQuestionType;
                        setDraft((prev) =>
                          type === 'choice'
                            ? {
                                ...emptyDraft(),
                                title: prev.title,
                                type: 'choice',
                              }
                            : {
                                title: prev.title,
                                type: 'text',
                                options: [],
                                correctOption: '',
                                correctAnswer: '',
                              }
                        );
                      }}
                      className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm sm:w-auto"
                    >
                      <option value="choice">ช้อยส์ (กำหนดข้อถูก)</option>
                      <option value="text">ตอบคำถาม (ข้อความ)</option>
                    </select>

                    <textarea
                      value={draft.title}
                      onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
                      rows={3}
                      placeholder="พิมพ์โจทย์ที่ต้องการเพิ่ม..."
                      className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm resize-y"
                    />

                    {draft.type === 'choice' && (
                      <div className="space-y-2">
                        {draft.options.map((option, idx) => (
                          <div key={`draft-opt-${idx}`} className="flex items-center gap-2">
                            <label className="inline-flex items-center gap-1.5 text-xs text-emerald-200 shrink-0">
                              <input
                                type="radio"
                                name="draft-correct"
                                checked={draft.correctOption === option}
                                onChange={() => setDraft((prev) => ({ ...prev, correctOption: option }))}
                                className="accent-emerald-400"
                              />
                              ถูก
                            </label>
                            <input
                              value={option}
                              onChange={(e) => {
                                const value = e.target.value;
                                setDraft((prev) => {
                                  const options = [...prev.options];
                                  const old = options[idx];
                                  options[idx] = value;
                                  return {
                                    ...prev,
                                    options,
                                    correctOption: prev.correctOption === old ? value : prev.correctOption,
                                  };
                                });
                              }}
                              className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setDraft((prev) => {
                                  const options = prev.options.filter((_, i) => i !== idx);
                                  return {
                                    ...prev,
                                    options,
                                    correctOption: options.includes(prev.correctOption)
                                      ? prev.correctOption
                                      : options[0] || '',
                                  };
                                })
                              }
                              className="rounded-lg border border-red-400/30 bg-red-500/10 px-2.5 py-2 text-xs font-semibold text-red-200"
                            >
                              ลบ
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() =>
                            setDraft((prev) => ({
                              ...prev,
                              options: [...prev.options, `ตัวเลือก ${prev.options.length + 1}`],
                            }))
                          }
                          className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-100"
                        >
                          + เพิ่มตัวเลือก
                        </button>
                      </div>
                    )}

                    {draft.type === 'text' && (
                      <input
                        value={draft.correctAnswer}
                        onChange={(e) => setDraft((prev) => ({ ...prev, correctAnswer: e.target.value }))}
                        placeholder="คำตอบถูก / คำตอบตัวอย่าง (ไม่บังคับ)"
                        className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm"
                      />
                    )}

                    <button
                      type="button"
                      onClick={addQuestionFromDraft}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-black text-black hover:bg-yellow-300"
                    >
                      <Plus className="h-4 w-4" />
                      เพิ่มโจทย์
                    </button>
                  </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default ElevatePretestPosttestEditorPage;
