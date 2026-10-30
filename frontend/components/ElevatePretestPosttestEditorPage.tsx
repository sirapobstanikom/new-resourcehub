import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, ChevronDown, ChevronUp, Copy, Download, ExternalLink, Plus, Trash2 } from 'lucide-react';
import BrandLogo from './BrandLogo';
import {
  countScored,
  createEmptyBank,
  createEmptyQuestion,
  elevateDashboardPath,
  elevateUniqueIdFromName,
  elevateUserFormPath,
  elevateUserFormUrl,
  loadElevateResponsesLocal,
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
import { downloadElevateResponsesStyledExcel } from '../lib/elevatePretestPosttestExcel';
import {
  deleteElevateBankFromSupabase,
  ELEVATE_PPT_TABLE_SQL,
  fetchElevateBanksFromSupabase,
  fetchElevateResponsesFromSupabase,
  upsertAllElevateBanksToSupabase,
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

const CLOUD_SYNC_DEBOUNCE_MS = 450;

const ElevatePretestPosttestEditorPage: React.FC = () => {
  const [banks, setBanks] = useState<ElevateTestBank[]>(() => loadStoredElevateBanks());
  const [selectedId, setSelectedId] = useState(() => loadStoredElevateBanks()[0]?.id || '');
  const [phase, setPhase] = useState<ElevateTestPhase>('pretest');
  const [draft, setDraft] = useState<DraftQuestion>(emptyDraft);
  const [newBankName, setNewBankName] = useState('');
  const [message, setMessage] = useState('');
  const [syncHint, setSyncHint] = useState('');
  const [loadingRemote, setLoadingRemote] = useState(false);
  const [tableMissing, setTableMissing] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  const banksRef = useRef(banks);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncGenRef = useRef(0);

  useEffect(() => {
    banksRef.current = banks;
  }, [banks]);

  useEffect(() => {
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, []);

  const selected = useMemo(
    () => banks.find((bank) => bank.id === selectedId) || null,
    [banks, selectedId]
  );

  const questions = selected ? selected[phase] : [];

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setSyncHint('ยังไม่ได้ตั้งค่า Supabase — บันทึกในเครื่องเท่านั้น');
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingRemote(true);
      const local = loadStoredElevateBanks();
      const result = await fetchElevateBanksFromSupabase();
      if (cancelled) return;
      setLoadingRemote(false);

      if (result.tableMissing) {
        setTableMissing(true);
        setSyncHint('ยังไม่มีตารางบน Supabase — รัน SQL ด้านล่างก่อน จึงจะเก็บข้อมูลขึ้นคลาวด์ได้');
        return;
      }
      if (result.error) {
        setSyncHint(`ซิงก์ระบบคลาวด์ไม่สำเร็จ: ${result.error}`);
        return;
      }

      setTableMissing(false);

      if (result.banks.length > 0) {
        setBanks(result.banks);
        saveElevateBanksToStorage(result.banks);
        setSelectedId((prev) =>
          result.banks.some((b) => b.id === prev) ? prev : result.banks[0]?.id || ''
        );
        setSyncHint(`โหลดจาก Supabase แล้ว (${result.banks.length} ชุด)`);
        return;
      }

      // ตารางมีแล้วแต่ยังว่าง — อัปโหลดชุดที่มีในเครื่องขึ้นไป
      if (local.length > 0) {
        const pushed = await upsertAllElevateBanksToSupabase(local);
        if (cancelled) return;
        if (pushed.ok) {
          setBanks(local);
          setSyncHint(`อัปโหลดชุดจากเครื่องขึ้น Supabase แล้ว (${pushed.synced} ชุด)`);
        } else if (pushed.tableMissing) {
          setTableMissing(true);
          setSyncHint('ยังไม่มีตารางบน Supabase — รัน SQL ด้านล่างก่อน');
        } else {
          setSyncHint(`อัปโหลดขึ้น Supabase ไม่สำเร็จ: ${pushed.error}`);
        }
      } else {
        setSyncHint('เชื่อม Supabase แล้ว — พร้อมบันทึกขึ้นคลาวด์');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const copySetupSql = async () => {
    try {
      await navigator.clipboard.writeText(ELEVATE_PPT_TABLE_SQL);
      setSqlCopied(true);
      setTimeout(() => setSqlCopied(false), 2000);
    } catch {
      setMessage('คัดลอก SQL ไม่สำเร็จ — เปิดไฟล์ backend/supabase/elevate_pretest_posttest.sql');
    }
  };

  const syncAllLocalToCloud = async () => {
    if (!isSupabaseConfigured) return;
    const result = await upsertAllElevateBanksToSupabase(banks);
    if (result.tableMissing) {
      setTableMissing(true);
      setSyncHint('ยังไม่มีตารางบน Supabase — รัน SQL ด้านล่างก่อน');
      return;
    }
    if (!result.ok) {
      setSyncHint(`ซิงก์คลาวด์ไม่สำเร็จ: ${result.error}`);
      return;
    }
    setTableMissing(false);
    setSyncHint(`ซิงก์ขึ้น Supabase แล้ว ${result.synced} ชุด`);
  };

  const flushCloudUpsert = async (bankId: string) => {
    if (!isSupabaseConfigured) return;
    const gen = ++syncGenRef.current;
    const bank = banksRef.current.find((b) => b.id === bankId);
    if (!bank) return;
    setSyncHint('กำลังซิงก์คลาวด์...');
    const up = await upsertElevateBankToSupabase(bank);
    if (gen !== syncGenRef.current) return;
    if (up.tableMissing) {
      setTableMissing(true);
      setSyncHint('บันทึกในเครื่องแล้ว — ยังไม่มีตารางบน Supabase');
    } else if (!up.ok && up.error) {
      setSyncHint(`ซิงก์คลาวด์ไม่สำเร็จ: ${up.error}`);
    } else if (up.ok) {
      setTableMissing(false);
      setSyncHint('อัปเดตคลาวด์อัตโนมัติแล้ว');
    }
  };

  const scheduleCloudUpsert = (bankId: string, immediate = false) => {
    if (!isSupabaseConfigured) return;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    if (immediate) {
      void flushCloudUpsert(bankId);
      return;
    }
    setSyncHint('กำลังอัปเดตคลาวด์...');
    syncTimerRef.current = setTimeout(() => {
      syncTimerRef.current = null;
      void flushCloudUpsert(bankId);
    }, CLOUD_SYNC_DEBOUNCE_MS);
  };

  const persist = async (
    next: ElevateTestBank[],
    opts?: { upsertId?: string; deleteId?: string; immediate?: boolean }
  ) => {
    banksRef.current = next;
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
      scheduleCloudUpsert(opts.upsertId, Boolean(opts.immediate));
    }
  };

  const updateSelected = (
    updater: (current: ElevateTestBank) => ElevateTestBank,
    opts?: { immediate?: boolean }
  ) => {
    if (!selected) return;
    const nextBank = { ...updater(selected), updatedAt: new Date().toISOString() };
    const next = banks.map((bank) => (bank.id === selected.id ? nextBank : bank));
    void persist(next, { upsertId: selected.id, immediate: opts?.immediate });
  };

  const createBank = () => {
    const name = newBankName.trim() || `ชุดข้อสอบ ${banks.length + 1}`;
    const bank = createEmptyBank(name, new Set(banks.map((b) => b.id)));
    const next = [bank, ...banks];
    setSelectedId(bank.id);
    setNewBankName('');
    setPhase('pretest');
    setMessage(`สร้างชุด “${name}” แล้ว`);
    void persist(next, { upsertId: bank.id, immediate: true });
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
    void persist(next, { upsertId: nextId, deleteId: previousId, immediate: true });
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
    updateSelected(
      (bank) => {
        const list = [...bank[phase]];
        const [item] = list.splice(index, 1);
        list.splice(target, 0, item);
        return { ...bank, [phase]: list };
      },
      { immediate: true }
    );
  };

  const removeQuestion = (index: number) => {
    updateSelected(
      (bank) => ({
        ...bank,
        [phase]: bank[phase].filter((_, i) => i !== index),
      }),
      { immediate: true }
    );
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
      const base = createEmptyQuestion(type);
      return {
        ...base,
        id: q.id,
        title: q.title || base.title,
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
        : draft.type === 'rating_1_5'
          ? {
              id: newElevateId('q'),
              title: draft.title.trim() || 'ระดับความรู้ของคุณตอนนี้ (1 = น้อย, 5 = มาก)',
              type: 'rating_1_5',
              options: ['1', '2', '3', '4', '5'],
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

    updateSelected(
      (bank) => ({
        ...bank,
        [phase]: [...bank[phase], candidate],
      }),
      { immediate: true }
    );
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
    updateSelected(
      (bank) => ({
        ...bank,
        posttest: cloneQuestions(bank.pretest),
      }),
      { immediate: true }
    );
    setPhase('posttest');
    setMessage('คัดลอกโจทย์จาก Pretest → Posttest แล้ว');
  };

  const downloadBankExcel = async () => {
    if (!selected) return;
    setExportingExcel(true);
    setMessage('');
    try {
      let responses = loadElevateResponsesLocal().filter((row) => row.bankId === selected.id);
      if (isSupabaseConfigured) {
        const remote = await fetchElevateResponsesFromSupabase(selected.id);
        if (!remote.tableMissing && !remote.error && remote.responses.length > 0) {
          responses = remote.responses;
        }
      }

      if (responses.length === 0) {
        setMessage('ยังไม่มีคำตอบสำหรับชุดนี้');
        return;
      }

      const result = await downloadElevateResponsesStyledExcel(selected, responses);
      setMessage(
        `ดาวน์โหลด Excel แล้ว — เปรียบเทียบ ${result.comparisonCount} คน (จับคู่ครบ ${result.pairedCount} คน)`
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'ดาวน์โหลด Excel ไม่สำเร็จ');
    } finally {
      setExportingExcel(false);
    }
  };

  return (
    <div className="md-page selection:bg-yellow-300 selection:text-black">
      <header className="border-b border-[#D6D4CC] bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <Link to="/" className="shrink-0 pt-0.5">
              <BrandLogo className="text-[22px] sm:text-[26px]" tone="dark" />
            </Link>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#9A7200]">Elevate</p>
              <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">Pretest · Posttest Editor</h1>
              <p className="mt-1 text-sm text-gray-600">สร้างชุดข้อสอบ ช้อยส์ · คะแนน 1–5 · ตอบข้อความ</p>
            </div>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            {(loadingRemote || syncHint || message) && (
              <div className="text-right text-xs">
                {loadingRemote && <p className="text-gray-600">กำลังโหลดจากคลาวด์...</p>}
                {syncHint && <p className="font-medium text-gray-800">{syncHint}</p>}
                {message && <p className="font-medium text-emerald-800">{message}</p>}
              </div>
            )}
            {isSupabaseConfigured && banks.length > 0 && (
              <button
                type="button"
                onClick={() => void syncAllLocalToCloud()}
                className="rounded-xl bg-yellow-400 px-3 py-2 text-xs font-bold text-black hover:bg-yellow-300"
              >
                ซิงก์ขึ้น Supabase
              </button>
            )}
          </div>
        </div>
      </header>

      {tableMissing && (
        <div className="border-b border-amber-300 bg-amber-50">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:px-6">
            <p className="text-sm font-semibold text-amber-900">
              ยังไม่มีตารางบน Supabase — คัดลอก SQL ไปรันที่ Supabase → SQL Editor ครั้งเดียว
            </p>
            <p className="text-xs text-amber-800">
              ไฟล์: <code className="rounded bg-white px-1.5 py-0.5 text-amber-900">backend/supabase/elevate_pretest_posttest.sql</code>
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void copySetupSql()}
                className="rounded-xl bg-yellow-400 px-3 py-2 text-xs font-bold text-black hover:bg-yellow-300"
              >
                {sqlCopied ? 'คัดลอกแล้ว' : 'คัดลอก SQL'}
              </button>
              <button
                type="button"
                onClick={() => void syncAllLocalToCloud()}
                className="rounded-xl border border-[#D6D4CC] bg-white px-3 py-2 text-xs font-semibold text-gray-900 hover:bg-gray-50"
              >
                ลองซิงก์อีกครั้ง
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="h-fit space-y-3 rounded-2xl border border-[#D6D4CC] bg-white p-4 shadow-sm lg:sticky lg:top-4">
          <h2 className="text-sm font-bold text-gray-900">ชุดข้อสอบ</h2>
          <div className="flex gap-2">
            <input
              value={newBankName}
              onChange={(e) => setNewBankName(e.target.value)}
              placeholder="ชื่อชุดใหม่"
              className="min-w-0 flex-1 rounded-xl border border-[#D6D4CC] bg-[#F3F2ED] px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-500 focus:border-yellow-500 focus:bg-white focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter') createBank();
              }}
            />
            <button
              type="button"
              onClick={createBank}
              className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-yellow-400 px-3 py-2.5 text-sm font-bold text-black hover:bg-yellow-300"
            >
              <Plus className="h-4 w-4" />
              สร้าง
            </button>
          </div>
          <div className="max-h-[55vh] space-y-1.5 overflow-y-auto overscroll-contain pr-0.5">
            {banks.length === 0 && (
              <p className="py-6 text-center text-xs text-gray-600">ยังไม่มีชุด — กดสร้างเพื่อเริ่ม</p>
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
                  className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${
                    active
                      ? 'border-yellow-500 bg-yellow-50 text-gray-900 shadow-sm'
                      : 'border-transparent text-gray-800 hover:border-[#D6D4CC] hover:bg-[#F3F2ED]'
                  }`}
                >
                  <p className="truncate text-sm font-semibold">{bank.name}</p>
                  <p className="mt-0.5 text-xs text-gray-700">
                    Pre {bank.pretest.length} · Post {bank.posttest.length}
                  </p>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="min-w-0 space-y-4">
          {!selected ? (
            <div className="rounded-2xl border border-dashed border-[#D6D4CC] bg-white px-6 py-20 text-center shadow-sm">
              <p className="text-base font-semibold text-gray-900">เลือกชุดข้อสอบทางซ้าย</p>
              <p className="mt-1 text-sm text-gray-600">หรือสร้างชุดใหม่เพื่อเริ่มแก้ไข</p>
            </div>
          ) : (
            <>
              <section className="space-y-4 rounded-2xl border border-[#D6D4CC] bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-gray-600">ชื่อชุดข้อสอบ</label>
                      <input
                        value={selected.name}
                        onChange={(e) => renameSelectedBank(e.target.value)}
                        onBlur={syncSelectedBankLinkFromName}
                        className="w-full rounded-xl border border-[#D6D4CC] bg-white px-3 py-2.5 text-base font-semibold text-gray-900 focus:border-yellow-500 focus:outline-none"
                      />
                      <p className="mt-1 text-[11px] text-gray-500">ลิงก์อัปเดตตามชื่อเมื่อออกจากช่องนี้</p>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-gray-600">คำอธิบาย</label>
                      <textarea
                        value={selected.description}
                        onChange={(e) =>
                          updateSelected((bank) => ({
                            ...bank,
                            description: e.target.value,
                          }))
                        }
                        rows={2}
                        placeholder="ไม่บังคับ"
                        className="w-full resize-y rounded-xl border border-[#D6D4CC] bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-yellow-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex flex-row flex-wrap gap-2 sm:w-40 sm:flex-col sm:flex-nowrap">
                    <a
                      href={elevateDashboardPath(selected.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-yellow-400 px-3 py-2.5 text-sm font-bold text-black hover:bg-yellow-300 sm:flex-none"
                    >
                      <BarChart3 className="h-4 w-4" />
                      Dashboard
                    </a>
                    <button
                      type="button"
                      onClick={() => void downloadBankExcel()}
                      disabled={exportingExcel}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-600/30 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-60 sm:flex-none"
                    >
                      <Download className="h-4 w-4" />
                      {exportingExcel ? 'กำลังโหลด...' : 'Excel'}
                    </button>
                    <button
                      type="button"
                      onClick={deleteBank}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-300 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 sm:flex-none"
                    >
                      <Trash2 className="h-4 w-4" />
                      ลบชุด
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-[#D6D4CC] pt-4">
                  {(['pretest', 'posttest'] as const).map((tab) => {
                    const count = selected[tab].length;
                    const scored = countScored(selected[tab]);
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setPhase(tab)}
                        className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                          phase === tab
                            ? 'bg-gray-900 text-white'
                            : 'border border-[#D6D4CC] bg-white text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        {tab === 'pretest' ? 'Pretest' : 'Posttest'}
                        <span className={`ml-2 text-xs font-medium ${phase === tab ? 'text-white/80' : 'text-gray-500'}`}>
                          {count} ข้อ · ตรวจได้ {scored}
                        </span>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={copyPretestToPosttest}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#D6D4CC] bg-white px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-[#F3F2ED]"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    คัดลอก Pre → Post
                  </button>
                </div>

                <div className="space-y-2 rounded-xl border border-[#D6D4CC] bg-[#F3F2ED] p-3">
                  <div>
                    <p className="text-xs font-bold text-gray-900">ลิงก์ผู้เข้าอบรม</p>
                    <p className="mt-0.5 text-[11px] text-gray-600">แชร์ลิงก์ให้ผู้ทำแบบทดสอบ</p>
                  </div>
                      {(['pretest', 'posttest'] as const).map((linkPhase) => {
                        const version = encodeURIComponent(selected.updatedAt || Date.now().toString());
                        const path = `${elevateUserFormPath(selected.id, linkPhase)}?v=${version}`;
                        const fullUrl = `${elevateUserFormUrl(selected.id, linkPhase)}?v=${version}`;
                        const count = selected[linkPhase].length;
                        return (
                          <div
                            key={linkPhase}
                            className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-2.5 sm:flex-row sm:items-center"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-gray-900">
                                {linkPhase === 'pretest' ? 'Pretest' : 'Posttest'}
                                <span className="ml-2 font-medium text-gray-600">{count} ข้อ</span>
                              </p>
                              <p className="mt-0.5 break-all font-mono text-[11px] text-gray-600">{fullUrl}</p>
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
                                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:border-yellow-400 disabled:opacity-40"
                              >
                                <Copy className="h-3.5 w-3.5" />
                                คัดลอก
                              </button>
                              <button
                                type="button"
                                disabled={count === 0}
                                onClick={async () => {
                                  try {
                                    if (syncTimerRef.current) {
                                      clearTimeout(syncTimerRef.current);
                                      syncTimerRef.current = null;
                                    }
                                    await flushCloudUpsert(selected.id);
                                    window.open(path, '_blank', 'noopener,noreferrer');
                                  } catch {
                                    setMessage('เปิดลิงก์ไม่สำเร็จ');
                                  }
                                }}
                                className={`inline-flex items-center gap-1 rounded-lg border border-yellow-400 bg-yellow-50 px-2.5 py-1.5 text-xs font-semibold text-yellow-900 hover:bg-yellow-100 ${
                                  count === 0 ? 'pointer-events-none opacity-40' : ''
                                }`}
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                เปิด
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-sm font-bold text-gray-900">
                      โจทย์{phase === 'pretest' ? ' Pretest' : ' Posttest'}
                      <span className="ml-2 font-medium text-gray-500">({questions.length})</span>
                    </h3>
                    {questions.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-[#D6D4CC] bg-white px-5 py-12 text-center shadow-sm">
                        <p className="text-sm font-medium text-gray-800">ยังไม่มีโจทย์ในชุดนี้</p>
                        <p className="mt-1 text-xs text-gray-500">เพิ่มโจทย์จากฟอร์มด้านล่าง</p>
                      </div>
                    )}

                    {questions.map((question, index) => (
                      <article
                        key={question.id}
                        className="space-y-3 rounded-2xl border border-[#D6D4CC] bg-white p-4 shadow-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-bold text-gray-900">
                            ข้อ {index + 1}
                            <span className="ml-2 font-medium text-gray-500">· {questionTypeLabel(question.type)}</span>
                          </p>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => moveQuestion(index, -1)}
                              disabled={index === 0}
                              className="rounded-lg border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                              aria-label="เลื่อนขึ้น"
                            >
                              <ChevronUp className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveQuestion(index, 1)}
                              disabled={index === questions.length - 1}
                              className="rounded-lg border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                              aria-label="เลื่อนลง"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeQuestion(index)}
                              className="rounded-lg border border-red-300 bg-red-50 px-2 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                            >
                              ลบ
                            </button>
                          </div>
                        </div>

                        <select
                          value={question.type}
                          onChange={(e) => changeQuestionType(index, e.target.value as ElevateQuestionType)}
                          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
                        >
                          <option value="choice">ช้อยส์ (กำหนดข้อถูก)</option>
                          <option value="rating_1_5">ประเมิน 1–5 (ระดับความรู้)</option>
                          <option value="text">ตอบคำถาม (ข้อความ)</option>
                        </select>

                        <textarea
                          value={question.title}
                          onChange={(e) => updateQuestion(index, (q) => ({ ...q, title: e.target.value }))}
                          onBlur={() => {
                            if (selected) scheduleCloudUpsert(selected.id, true);
                          }}
                          rows={3}
                          placeholder="พิมพ์โจทย์..."
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 resize-y"
                        />

                        {question.type === 'choice' && (
                          <div className="space-y-2">
                            {(question.options || []).map((option, optionIndex) => (
                              <div key={`${question.id}-opt-${optionIndex}`} className="flex items-center gap-2">
                                <label className="inline-flex items-center gap-1.5 text-xs text-emerald-800 shrink-0">
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
                                  className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeOption(index, optionIndex)}
                                  className="rounded-lg border border-red-300 bg-red-50 px-2.5 py-2 text-xs font-semibold text-red-700"
                                >
                                  ลบ
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => addOption(index)}
                              className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                            >
                              + เพิ่มตัวเลือก
                            </button>
                            <p className="text-xs text-emerald-700">
                              เลือก radio “ถูก” หน้าตัวเลือกที่เป็นคำตอบถูก
                            </p>
                          </div>
                        )}

                        {question.type === 'rating_1_5' && (
                          <div className="space-y-2">
                            <p className="text-xs text-gray-700">
                              ผู้ตอบเลือกคะแนน 1–5 · ใช้เปรียบเทียบ Pre / Post ได้เลย (ไม่ต้องตั้งข้อถูก)
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {['1', '2', '3', '4', '5'].map((n) => (
                                <span
                                  key={`${question.id}-scale-${n}`}
                                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-yellow-300 bg-yellow-50 text-sm font-bold text-yellow-800"
                                >
                                  {n}
                                </span>
                              ))}
                            </div>
                            <p className="text-[11px] text-gray-600">1 = น้อย · 5 = มาก</p>
                          </div>
                        )}

                        {question.type === 'text' && (
                          <div className="space-y-1">
                            <label className="text-xs text-gray-700">คำตอบถูก / คำตอบตัวอย่าง (ไม่บังคับ)</label>
                            <input
                              value={question.correctAnswer || ''}
                              onChange={(e) =>
                                updateQuestion(index, (q) => ({ ...q, correctAnswer: e.target.value }))
                              }
                              placeholder="ใส่คำตอบที่คาดหวังถ้าต้องการตรวจอัตโนมัติ"
                              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
                            />
                          </div>
                        )}
                      </article>
                    ))}
                  </section>

                  <section className="space-y-3 rounded-2xl border border-[#D6D4CC] bg-white p-4 shadow-sm sm:p-5">
                    <h3 className="text-sm font-bold text-gray-900">
                      เพิ่มโจทย์ใหม่
                      <span className="ml-2 font-medium text-gray-500">
                        · {phase === 'pretest' ? 'Pretest' : 'Posttest'}
                      </span>
                    </h3>
                    <select
                      value={draft.type}
                      onChange={(e) => {
                        const type = e.target.value as ElevateQuestionType;
                        setDraft((prev) => {
                          if (type === 'choice') {
                            return {
                              ...emptyDraft(),
                              title: prev.title,
                              type: 'choice',
                            };
                          }
                          if (type === 'rating_1_5') {
                            return {
                              title: prev.title || 'ระดับความรู้ของคุณตอนนี้ (1 = น้อย, 5 = มาก)',
                              type: 'rating_1_5',
                              options: ['1', '2', '3', '4', '5'],
                              correctOption: '',
                              correctAnswer: '',
                            };
                          }
                          return {
                            title: prev.title,
                            type: 'text',
                            options: [],
                            correctOption: '',
                            correctAnswer: '',
                          };
                        });
                      }}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 sm:w-auto"
                    >
                      <option value="choice">ช้อยส์ (กำหนดข้อถูก)</option>
                      <option value="rating_1_5">ประเมิน 1–5 (ระดับความรู้)</option>
                      <option value="text">ตอบคำถาม (ข้อความ)</option>
                    </select>

                    <textarea
                      value={draft.title}
                      onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
                      rows={3}
                      placeholder="พิมพ์โจทย์ที่ต้องการเพิ่ม..."
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 resize-y"
                    />

                    {draft.type === 'choice' && (
                      <div className="space-y-2">
                        {draft.options.map((option, idx) => (
                          <div key={`draft-opt-${idx}`} className="flex items-center gap-2">
                            <label className="inline-flex items-center gap-1.5 text-xs text-emerald-800 shrink-0">
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
                              className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
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
                              className="rounded-lg border border-red-300 bg-red-50 px-2.5 py-2 text-xs font-semibold text-red-700"
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
                          className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800"
                        >
                          + เพิ่มตัวเลือก
                        </button>
                      </div>
                    )}

                    {draft.type === 'rating_1_5' && (
                      <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
                        <p className="text-xs text-gray-700">ผู้ตอบจะเห็นปุ่มเลือก 1–5</p>
                        <div className="flex flex-wrap gap-2">
                          {['1', '2', '3', '4', '5'].map((n) => (
                            <span
                              key={`draft-rating-${n}`}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-yellow-300 bg-yellow-50 text-sm font-bold text-yellow-800"
                            >
                              {n}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {draft.type === 'text' && (
                      <input
                        value={draft.correctAnswer}
                        onChange={(e) => setDraft((prev) => ({ ...prev, correctAnswer: e.target.value }))}
                        placeholder="คำตอบถูก / คำตอบตัวอย่าง (ไม่บังคับ)"
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
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
