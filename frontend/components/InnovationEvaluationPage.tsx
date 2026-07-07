import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  CRITERIA,
  EVALUATORS,
  EMPTY_SCORES,
  buildEvaluateeSummaries,
  calcTotalScore,
  criterionPoints,
  formatInnovationScore,
  getEvaluatorName,
  type EvaluatorId,
  type InnovationEvaluatee,
  type InnovationResponseRow,
  type InnovationScores,
  type ScoreField,
} from '../lib/innovationEvaluation';

const SCORE_OPTIONS = [1, 2, 3, 4, 5] as const;

const INNOVATION_DASHBOARD_ARTWORK =
  'https://axaasphuaaadzjoffznj.supabase.co/storage/v1/object/public/images/artwork.png';

function PageHeader({ subtitle, action }: { subtitle: string; action?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 border-b border-yellow-400/15 bg-[#080808]/90 px-4 py-4 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400 text-lg font-black text-black shadow-[0_0_24px_rgba(250,204,21,0.24)]">
            M
          </div>
          <div>
            <p className="text-sm font-black text-white">แบบประเมิน Innovation</p>
            <p className="text-xs font-semibold text-yellow-300">{subtitle}</p>
          </div>
        </Link>
        {action}
      </div>
    </header>
  );
}

function ScorePicker({
  label,
  weight,
  maxPoints,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  weight: number;
  maxPoints: number;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  const points = criterionPoints(value, weight);
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-bold leading-snug text-white sm:text-base">{label}</h3>
          <p className="mt-1 text-xs text-zinc-400">
            คะแนน 1–5 · น้ำหนัก {weight}% · คะแนนเต็ม {maxPoints} คะแนน
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-yellow-400/25 bg-yellow-400/10 px-3 py-1 text-xs font-bold text-yellow-200">
          {value > 0 ? `${formatInnovationScore(points)} / ${maxPoints}` : '—'}
        </span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {SCORE_OPTIONS.map((score) => {
          const selected = value === score;
          return (
            <button
              key={score}
              type="button"
              onClick={() => onChange(score)}
              disabled={disabled}
              className={`min-h-[44px] rounded-xl border text-sm font-black transition-all ${
                selected
                  ? 'border-yellow-300 bg-yellow-400 text-black shadow-[0_0_18px_rgba(250,204,21,0.22)]'
                  : 'border-white/10 bg-black/35 text-zinc-200 hover:border-yellow-300/50'
              } disabled:cursor-not-allowed disabled:opacity-45`}
            >
              {score}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function InnovationEvaluationFormPage() {
  const [evaluatorId, setEvaluatorId] = useState<EvaluatorId | ''>('');
  const [evaluateeId, setEvaluateeId] = useState('');
  const [scores, setScores] = useState<InnovationScores>(EMPTY_SCORES);
  const [note, setNote] = useState('');
  const [evaluatees, setEvaluatees] = useState<InnovationEvaluatee[]>([]);
  const [existingResponseId, setExistingResponseId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successTeamLabel, setSuccessTeamLabel] = useState<string | null>(null);

  const loadEvaluatees = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const { data, error: loadError } = await supabase
      .from('innovation_evaluatees')
      .select('id, name, team_name, sort_order, is_active')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (loadError) {
      setError(loadError.message);
      return;
    }
    setEvaluatees((data as InnovationEvaluatee[]) || []);
  }, []);

  useEffect(() => {
    loadEvaluatees();
  }, [loadEvaluatees]);

  useEffect(() => {
    if (!evaluatorId || !evaluateeId || !isSupabaseConfigured) {
      setExistingResponseId(null);
      setScores(EMPTY_SCORES);
      setNote('');
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error: loadError } = await supabase
        .from('innovation_evaluation_responses')
        .select('*')
        .eq('evaluator_id', evaluatorId)
        .eq('evaluatee_id', evaluateeId)
        .maybeSingle();
      if (cancelled) return;
      if (loadError) {
        setError(loadError.message);
        return;
      }
      if (data) {
        const row = data as InnovationResponseRow;
        setExistingResponseId(row.id);
        setScores({
          score_business_clarity: row.score_business_clarity,
          score_open_innovation: row.score_open_innovation,
          score_idea_value: row.score_idea_value,
          score_feasibility: row.score_feasibility,
          score_pitching_quality: row.score_pitching_quality,
        });
        setNote(row.note || '');
      } else {
        setExistingResponseId(null);
        setScores(EMPTY_SCORES);
        setNote('');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [evaluatorId, evaluateeId]);

  const totalScore = useMemo(() => calcTotalScore(scores), [scores]);
  const allScoresFilled = CRITERIA.every((criterion) => scores[criterion.field] >= 1 && scores[criterion.field] <= 5);
  const canSubmit = Boolean(evaluatorId && evaluateeId && allScoresFilled);

  const setScore = (field: ScoreField, value: number) => {
    setScores((prev) => ({ ...prev, [field]: value }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessTeamLabel(null);
    if (!canSubmit || !evaluatorId) {
      setError('กรุณาเลือกผู้ประเมิน ผู้ถูกประเมิน และให้คะแนนครบทุกข้อ');
      return;
    }
    if (!isSupabaseConfigured) {
      setError('ยังไม่ได้ตั้งค่า Supabase');
      return;
    }
    setSaving(true);
    const payload = {
      evaluatee_id: evaluateeId,
      evaluator_id: evaluatorId,
      ...scores,
      total_score: Number(totalScore.toFixed(2)),
      note: note.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const { error: saveError } = existingResponseId
      ? await supabase.from('innovation_evaluation_responses').update(payload).eq('id', existingResponseId)
      : await supabase.from('innovation_evaluation_responses').insert(payload);
    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    const selected = evaluatees.find((item) => item.id === evaluateeId);
    const teamLabel = selected?.team_name?.trim() || selected?.name?.trim() || 'ผู้ถูกประเมิน';
    setSuccessTeamLabel(teamLabel);
    setEvaluateeId('');
    setScores(EMPTY_SCORES);
    setNote('');
    setExistingResponseId(null);
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <PageHeader
        subtitle="กรอกคะแนนตามเกณฑ์ 5 ข้อ"
        action={
          <Link
            to="/evaluation/innovation/dashboard"
            className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-zinc-300 hover:bg-white/10"
          >
            Dashboard
          </Link>
        }
      />
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6 pb-24">
        {error && <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}

        {successTeamLabel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div
              className="w-full max-w-sm rounded-2xl border border-yellow-400/30 bg-[#121212] p-6 text-center shadow-[0_24px_60px_rgba(0,0,0,0.45)]"
              role="dialog"
              aria-modal="true"
              aria-labelledby="innovation-success-title"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-400/15 text-2xl">
                ✓
              </div>
              <h2 id="innovation-success-title" className="text-lg font-black text-white">
                ประเมิน ({successTeamLabel}) เรียบร้อย
              </h2>
              <p className="mt-2 text-sm text-zinc-400">บันทึกคะแนนเรียบร้อยแล้ว</p>
              <button
                type="button"
                onClick={() => setSuccessTeamLabel(null)}
                className="mt-5 w-full rounded-xl bg-yellow-400 px-4 py-3 text-sm font-bold text-black hover:bg-yellow-300"
              >
                ตกลง
              </button>
            </div>
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <section className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
            <label className="mb-2 block text-sm font-bold text-white">ผู้ประเมิน *</label>
            <div className="grid gap-2 sm:grid-cols-2">
              {EVALUATORS.map((evaluator) => {
                const selected = evaluatorId === evaluator.id;
                return (
                  <button
                    key={evaluator.id}
                    type="button"
                    onClick={() => setEvaluatorId(evaluator.id)}
                    className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-all ${
                      selected
                        ? 'border-yellow-300 bg-yellow-400/15 text-yellow-100'
                        : 'border-white/10 bg-black/30 text-zinc-300 hover:border-yellow-300/40'
                    }`}
                  >
                    {evaluator.name}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
            <label htmlFor="evaluatee" className="mb-2 block text-sm font-bold text-white">
              ผู้ถูกประเมิน *
            </label>
            <select
              id="evaluatee"
              value={evaluateeId}
              onChange={(e) => setEvaluateeId(e.target.value)}
              disabled={!evaluatorId}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-yellow-300 disabled:opacity-45"
            >
              <option value="">— เลือกผู้ถูกประเมิน —</option>
              {evaluatees.map((evaluatee) => (
                <option key={evaluatee.id} value={evaluatee.id}>
                  {evaluatee.name}
                  {evaluatee.team_name ? ` (${evaluatee.team_name})` : ''}
                </option>
              ))}
            </select>
            {evaluatees.length === 0 && (
              <p className="mt-2 text-xs text-zinc-500">ยังไม่มีรายชื่อ — ให้ Admin เพิ่มที่ /admin/innovation-evaluatees</p>
            )}
            {existingResponseId && (
              <p className="mt-2 text-xs text-yellow-300">พบคะแนนเดิมของผู้ประเมินคนนี้ — บันทึกใหม่จะอัปเดตทับ</p>
            )}
          </section>

          {CRITERIA.map((criterion) => (
            <ScorePicker
              key={criterion.field}
              label={criterion.label}
              weight={criterion.weight}
              maxPoints={criterion.maxPoints}
              value={scores[criterion.field]}
              onChange={(value) => setScore(criterion.field, value)}
              disabled={!evaluateeId}
            />
          ))}

          <section className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-yellow-100">คะแนนรวม</p>
                <p className="text-xs text-yellow-200/70">รวมน้ำหนัก 100 คะแนน</p>
              </div>
              <p className="text-3xl font-black text-yellow-300">{formatInnovationScore(totalScore)}</p>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
            <label htmlFor="note" className="mb-2 block text-sm font-bold text-zinc-200">
              หมายเหตุ (ไม่บังคับ)
            </label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              disabled={!evaluateeId}
              className="w-full resize-none rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-yellow-300 disabled:opacity-45"
            />
          </section>

          <button
            type="submit"
            disabled={saving || !canSubmit}
            className="sticky bottom-3 z-10 w-full rounded-2xl bg-yellow-400 px-6 py-4 text-base font-black text-black shadow-[0_18px_45px_rgba(250,204,21,0.25)] hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'กำลังบันทึก...' : existingResponseId ? 'อัปเดตคะแนน' : 'บันทึกคะแนน'}
          </button>
        </form>
      </main>
    </div>
  );
}

function InnovationEvaluationDashboardPage() {
  const [evaluatees, setEvaluatees] = useState<InnovationEvaluatee[]>([]);
  const [responses, setResponses] = useState<InnovationResponseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [liveConnected, setLiveConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadData = useCallback(async (options?: { silent?: boolean }) => {
    if (!isSupabaseConfigured) return;
    if (!options?.silent) setLoading(true);
    setError('');
    const [evaluateeResult, responseResult] = await Promise.all([
      supabase
        .from('innovation_evaluatees')
        .select('id, name, team_name, sort_order, is_active')
        .order('sort_order', { ascending: true }),
      supabase
        .from('innovation_evaluation_responses')
        .select('*')
        .order('created_at', { ascending: false }),
    ]);
    if (!options?.silent) setLoading(false);
    if (evaluateeResult.error || responseResult.error) {
      setError(evaluateeResult.error?.message || responseResult.error?.message || 'โหลดข้อมูลไม่สำเร็จ');
      return;
    }
    setEvaluatees((evaluateeResult.data as InnovationEvaluatee[]) || []);
    setResponses((responseResult.data as InnovationResponseRow[]) || []);
    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    loadData();
    if (!isSupabaseConfigured) return;

    const refreshSilently = () => {
      loadData({ silent: true });
    };

    const channel = supabase
      .channel('innovation-evaluation-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'innovation_evaluation_responses' },
        refreshSilently,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'innovation_evaluatees' },
        refreshSilently,
      )
      .subscribe((status) => {
        setLiveConnected(status === 'SUBSCRIBED');
      });

    const pollId = window.setInterval(refreshSilently, 8000);

    return () => {
      window.clearInterval(pollId);
      setLiveConnected(false);
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  const summaries = useMemo(() => buildEvaluateeSummaries(evaluatees, responses), [evaluatees, responses]);

  const exportExcel = () => {
    const rows = summaries.map((summary, index) => ({
      อันดับ: index + 1,
      ผู้ถูกประเมิน: summary.name,
      ทีม: summary.teamName,
      'Dr. Keita Ono': summary.keitaScore != null ? formatInnovationScore(summary.keitaScore) : '—',
      'Jeerawat Yaowanich': summary.jeerawatScore != null ? formatInnovationScore(summary.jeerawatScore) : '—',
      'คะแนนรวม (เฉลี่ย 50/50)': summary.finalScore != null ? formatInnovationScore(summary.finalScore) : '—',
      'จำนวนผู้ประเมิน': summary.responseCount,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Innovation Summary');
    XLSX.writeFile(wb, `innovation_evaluation_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <PageHeader
        subtitle="สรุปคะแนนรวม"
        action={
          <div className="flex items-center gap-2">
            <span
              className={`hidden rounded-full px-2.5 py-1 text-[10px] font-bold sm:inline ${
                liveConnected
                  ? 'border border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
                  : 'border border-white/10 bg-white/5 text-zinc-500'
              }`}
            >
              {liveConnected ? '● LIVE' : 'กำลังเชื่อมต่อ...'}
            </span>
            <Link
              to="/evaluation/innovation"
              className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-zinc-300 hover:bg-white/10"
            >
              แบบประเมิน
            </Link>
            <button
              type="button"
              onClick={exportExcel}
              disabled={summaries.length === 0}
              className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300 disabled:opacity-45"
            >
              Excel
            </button>
          </div>
        }
      />
      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6">
        <section className="overflow-hidden rounded-2xl border border-yellow-400/15 bg-black shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <div className="relative flex items-center justify-center px-4 py-5 sm:px-8 sm:py-7">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(250,204,21,0.08),transparent_65%)]" />
            <img
              src={INNOVATION_DASHBOARD_ARTWORK}
              alt="Innovation Evaluation"
              className="relative z-10 max-h-44 w-full max-w-3xl object-contain sm:max-h-52"
            />
          </div>
        </section>

        {error && <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}
        {loading && <p className="text-sm text-zinc-500">กำลังโหลด...</p>}
        {lastUpdated && !loading && (
          <p className="text-xs text-zinc-500">
            อัปเดตล่าสุด{' '}
            {lastUpdated.toLocaleString('th-TH', {
              timeZone: 'Asia/Bangkok',
              dateStyle: 'short',
              timeStyle: 'medium',
            })}
          </p>
        )}

        <section className="grid gap-3 sm:grid-cols-3">
          <article className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
            <p className="text-xs text-zinc-500">ผู้ถูกประเมิน</p>
            <p className="mt-1 text-2xl font-black text-white">{summaries.length}</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
            <p className="text-xs text-zinc-500">คำตอบทั้งหมด</p>
            <p className="mt-1 text-2xl font-black text-white">{responses.length}</p>
          </article>
          <article className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4">
            <p className="text-xs text-yellow-200/70">สูตรคะแนนรวม</p>
            <p className="mt-1 text-sm font-bold text-yellow-100">Dr. Keita Ono 50% + Jeerawat Yaowanich 50%</p>
          </article>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 sm:p-5">
          <h2 className="mb-4 text-lg font-black text-white">อันดับคะแนนรวม</h2>
          {summaries.length === 0 ? (
            <p className="text-sm text-zinc-500">ยังไม่มีข้อมูล</p>
          ) : (
            <div className="space-y-3">
              {summaries.map((summary, index) => (
                <article key={summary.evaluateeId} className="rounded-xl border border-white/10 bg-black/25 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-bold text-yellow-300">#{index + 1}</p>
                      <h3 className="text-base font-black text-white">{summary.name}</h3>
                      <p className="text-xs text-zinc-500">{summary.teamName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-zinc-500">คะแนนรวม</p>
                      <p className="text-2xl font-black text-yellow-300">
                        {summary.finalScore != null ? formatInnovationScore(summary.finalScore) : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-yellow-500 via-yellow-300 to-yellow-100"
                      style={{ width: `${Math.min(100, summary.finalScore ?? 0)}%` }}
                    />
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <p className="rounded-lg bg-black/30 px-3 py-2 text-xs text-zinc-300">
                      Dr. Keita Ono:{' '}
                      <span className="font-bold text-white">
                        {summary.keitaScore != null ? formatInnovationScore(summary.keitaScore) : 'ยังไม่ประเมิน'}
                      </span>
                    </p>
                    <p className="rounded-lg bg-black/30 px-3 py-2 text-xs text-zinc-300">
                      Jeerawat Yaowanich:{' '}
                      <span className="font-bold text-white">
                        {summary.jeerawatScore != null ? formatInnovationScore(summary.jeerawatScore) : 'ยังไม่ประเมิน'}
                      </span>
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 sm:p-5">
          <h2 className="mb-4 text-lg font-black text-white">รายละเอียดตามเกณฑ์</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs text-zinc-500">
                  <th className="px-3 py-2">ผู้ถูกประเมิน</th>
                  <th className="px-3 py-2">ผู้ประเมิน</th>
                  {CRITERIA.map((criterion) => (
                    <th key={criterion.field} className="px-3 py-2">
                      {criterion.weight}%
                    </th>
                  ))}
                  <th className="px-3 py-2">รวม</th>
                </tr>
              </thead>
              <tbody>
                {responses.map((row) => {
                  const evaluatee = evaluatees.find((item) => item.id === row.evaluatee_id);
                  return (
                    <tr key={row.id} className="border-b border-white/5 text-zinc-300">
                      <td className="px-3 py-2 font-medium text-white">{evaluatee?.name || row.evaluatee_id}</td>
                      <td className="px-3 py-2">{getEvaluatorName(row.evaluator_id)}</td>
                      {CRITERIA.map((criterion) => (
                        <td key={criterion.field} className="px-3 py-2">
                          {row[criterion.field]}
                        </td>
                      ))}
                      <td className="px-3 py-2 font-bold text-yellow-300">{formatInnovationScore(Number(row.total_score))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

const InnovationEvaluationPage: React.FC = () => {
  const location = useLocation();
  return location.pathname.includes('/dashboard') ? (
    <InnovationEvaluationDashboardPage />
  ) : (
    <InnovationEvaluationFormPage />
  );
};

export default InnovationEvaluationPage;
