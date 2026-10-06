import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2, X } from 'lucide-react';
import {
  INNOVATION_CONFIG_SQL,
  newInnovationId,
  saveInnovationConfig,
  sumWeights,
  validateInnovationConfig,
  type InnovationConfig,
  type InnovationCriterion,
  type InnovationEvaluator,
} from '../lib/innovationEvaluation';

type Props = {
  config: InnovationConfig;
  tableMissing: boolean;
  onClose: () => void;
  onSaved: (config: InnovationConfig) => void;
};

function WeightBadge({ sum }: { sum: number }) {
  const ok = Math.abs(sum - 100) < 0.001;
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
        ok ? 'border border-emerald-400/30 bg-emerald-500/10 text-emerald-300' : 'border border-red-400/30 bg-red-500/10 text-red-300'
      }`}
    >
      รวม {sum}%{ok ? '' : ' (ต้องเท่ากับ 100%)'}
    </span>
  );
}

const InnovationConfigEditor: React.FC<Props> = ({ config, tableMissing, onClose, onSaved }) => {
  const [criteria, setCriteria] = useState<InnovationCriterion[]>(() => config.criteria.map((c) => ({ ...c })));
  const [evaluators, setEvaluators] = useState<InnovationEvaluator[]>(() => config.evaluators.map((e) => ({ ...e })));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [needsSql, setNeedsSql] = useState(tableMissing);
  const [sqlCopied, setSqlCopied] = useState(false);

  const updateCriterion = (id: string, patch: Partial<InnovationCriterion>) => {
    setCriteria((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const moveCriterion = (index: number, delta: number) => {
    setCriteria((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const removeCriterion = (criterion: InnovationCriterion) => {
    if (!window.confirm(`ลบโจทย์ "${criterion.label || 'ไม่มีชื่อ'}"?\nคะแนนข้อนี้ของคำตอบเดิมจะไม่ถูกนับในคะแนนรวม`)) return;
    setCriteria((prev) => prev.filter((c) => c.id !== criterion.id));
  };

  const updateEvaluator = (id: string, patch: Partial<InnovationEvaluator>) => {
    setEvaluators((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  const removeEvaluator = (evaluator: InnovationEvaluator) => {
    if (!window.confirm(`ลบผู้ประเมิน "${evaluator.name || 'ไม่มีชื่อ'}"?\nคะแนนเดิมของผู้ประเมินคนนี้จะไม่ถูกนับในคะแนนรวม`)) return;
    setEvaluators((prev) => prev.filter((e) => e.id !== evaluator.id));
  };

  const save = async () => {
    const next: InnovationConfig = {
      criteria: criteria.map((c) => ({ ...c, label: c.label.trim(), weight: Number(c.weight) || 0 })),
      evaluators: evaluators.map((e) => ({ ...e, name: e.name.trim(), weight: Number(e.weight) || 0 })),
    };
    const validationError = validateInnovationConfig(next);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError('');
    const result = await saveInnovationConfig(next);
    setSaving(false);
    if (!result.ok) {
      setNeedsSql(result.tableMissing);
      setError(
        result.tableMissing
          ? 'ยังไม่มีตารางตั้งค่าบน Supabase — รัน SQL ด้านล่างก่อน แล้วกดบันทึกอีกครั้ง'
          : `บันทึกไม่สำเร็จ: ${result.error}`,
      );
      return;
    }
    onSaved(next);
  };

  const copySql = async () => {
    try {
      await navigator.clipboard.writeText(INNOVATION_CONFIG_SQL);
      setSqlCopied(true);
      setTimeout(() => setSqlCopied(false), 2000);
    } catch {
      setError('คัดลอกไม่สำเร็จ — เปิดไฟล์ backend/supabase/innovation_evaluation_config.sql แทน');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/75 px-3 py-6">
      <div className="w-full max-w-3xl rounded-2xl border border-yellow-400/25 bg-[#101010] shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="text-lg font-black text-white">ตั้งค่าแบบประเมิน</h2>
            <p className="text-xs text-zinc-400">แก้โจทย์ ผู้ประเมิน และน้ำหนักการประเมิน</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/5 p-2 text-zinc-300 hover:bg-white/10"
            aria-label="ปิด"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-6 px-5 py-5">
          {needsSql && (
            <div className="space-y-2 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3">
              <p className="text-sm font-semibold text-amber-100">
                ยังไม่มีตารางตั้งค่าบน Supabase — คัดลอก SQL ไปรันที่ Supabase → SQL Editor ครั้งเดียว
              </p>
              <p className="text-xs text-amber-100/70">
                ไฟล์: <code>backend/supabase/innovation_evaluation_config.sql</code>
              </p>
              <button
                type="button"
                onClick={() => void copySql()}
                className="rounded-lg bg-yellow-400 px-3 py-1.5 text-xs font-bold text-black hover:bg-yellow-300"
              >
                {sqlCopied ? 'คัดลอกแล้ว' : 'คัดลอก SQL'}
              </button>
            </div>
          )}

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-black text-yellow-300">โจทย์ / เกณฑ์การประเมิน</h3>
              <WeightBadge sum={sumWeights(criteria)} />
            </div>
            {criteria.map((criterion, index) => (
              <div key={criterion.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                <div className="flex items-start gap-2">
                  <span className="mt-2 w-6 shrink-0 text-center text-xs font-bold text-zinc-500">{index + 1}</span>
                  <textarea
                    value={criterion.label}
                    onChange={(e) => updateCriterion(criterion.id, { label: e.target.value })}
                    rows={2}
                    placeholder="ข้อความโจทย์"
                    className="min-w-0 flex-1 resize-y rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-yellow-300"
                  />
                  <div className="flex shrink-0 flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => moveCriterion(index, -1)}
                      disabled={index === 0}
                      className="rounded-md border border-white/10 bg-black/30 p-1 text-zinc-300 hover:bg-white/10 disabled:opacity-30"
                      aria-label="เลื่อนขึ้น"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveCriterion(index, 1)}
                      disabled={index === criteria.length - 1}
                      className="rounded-md border border-white/10 bg-black/30 p-1 text-zinc-300 hover:bg-white/10 disabled:opacity-30"
                      aria-label="เลื่อนลง"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 pl-8">
                  <label className="flex items-center gap-2 text-xs text-zinc-400">
                    น้ำหนัก
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={criterion.weight}
                      onChange={(e) => updateCriterion(criterion.id, { weight: Number(e.target.value) })}
                      className="w-20 rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white outline-none focus:border-yellow-300"
                    />
                    %
                  </label>
                  <button
                    type="button"
                    onClick={() => removeCriterion(criterion)}
                    disabled={criteria.length <= 1}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-400/30 bg-red-500/10 px-2.5 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-500/20 disabled:opacity-40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    ลบ
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setCriteria((prev) => [...prev, { id: newInnovationId('c'), label: '', weight: 0 }])}
              className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-yellow-400/40 px-3 py-2 text-sm font-semibold text-yellow-200 hover:bg-yellow-400/10"
            >
              <Plus className="h-4 w-4" />
              เพิ่มโจทย์
            </button>
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-black text-yellow-300">ผู้ประเมิน</h3>
              <WeightBadge sum={sumWeights(evaluators)} />
            </div>
            {evaluators.map((evaluator) => (
              <div
                key={evaluator.id}
                className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-3 sm:flex-row sm:items-center"
              >
                <input
                  value={evaluator.name}
                  onChange={(e) => updateEvaluator(evaluator.id, { name: e.target.value })}
                  placeholder="ชื่อผู้ประเมิน"
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-yellow-300"
                />
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-xs text-zinc-400">
                    น้ำหนัก
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={evaluator.weight}
                      onChange={(e) => updateEvaluator(evaluator.id, { weight: Number(e.target.value) })}
                      className="w-20 rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white outline-none focus:border-yellow-300"
                    />
                    %
                  </label>
                  <button
                    type="button"
                    onClick={() => removeEvaluator(evaluator)}
                    disabled={evaluators.length <= 1}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-400/30 bg-red-500/10 px-2.5 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-500/20 disabled:opacity-40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    ลบ
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setEvaluators((prev) => [...prev, { id: newInnovationId('ev'), name: '', weight: 0 }])}
              className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-yellow-400/40 px-3 py-2 text-sm font-semibold text-yellow-200 hover:bg-yellow-400/10"
            >
              <Plus className="h-4 w-4" />
              เพิ่มผู้ประเมิน
            </button>
            <p className="text-xs text-zinc-500">
              คะแนนรวมสุดท้ายจะคำนวณเมื่อผู้ประเมินที่มีน้ำหนักมากกว่า 0% ประเมินครบทุกคน
            </p>
          </section>

          {error && (
            <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-white/10 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-300 hover:bg-white/10"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="rounded-xl bg-yellow-400 px-5 py-2 text-sm font-black text-black hover:bg-yellow-300 disabled:opacity-60"
          >
            {saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InnovationConfigEditor;
