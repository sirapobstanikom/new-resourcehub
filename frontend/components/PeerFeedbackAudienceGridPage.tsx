import React, { useEffect, useCallback, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

const SCORE_OPTIONS = [1, 2, 3, 4, 5] as const;
const SCORE_FIELDS = ['answer_first_score', 'logic_score', 'story_score', 'delivery_score'] as const;

type ScoreField = (typeof SCORE_FIELDS)[number];

type FeedbackForm = {
  evaluator_name: string;
  presenter_team: string;
  answer_first_score: number;
  logic_score: number;
  story_score: number;
  delivery_score: number;
  note: string;
};

type FeedbackRow = FeedbackForm & {
  id: number;
  created_at: string;
};

type ParticipantRow = {
  id: number;
  name: string;
  created_at: string;
};

type TeamSummary = {
  team: string;
  count: number;
  answerAvg: number;
  logicAvg: number;
  storyAvg: number;
  deliveryAvg: number;
  overallAvg: number;
  comments: string[];
};

const emptyForm: FeedbackForm = {
  evaluator_name: '',
  presenter_team: '',
  answer_first_score: 0,
  logic_score: 0,
  story_score: 0,
  delivery_score: 0,
  note: '',
};

const formatScore = (value: number) => (Number.isFinite(value) ? value.toFixed(2) : '0.00');

const scoreLabel: Record<ScoreField, string> = {
  answer_first_score: 'Answer-first',
  logic_score: 'Logic',
  story_score: 'Story',
  delivery_score: 'Delivery',
};

function LogoHeader({ subtitle }: { subtitle: string }) {
  return (
    <header className="sticky top-0 z-20 border-b border-yellow-400/15 bg-[#080808]/90 px-4 py-4 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400 text-lg font-black text-black shadow-[0_0_24px_rgba(250,204,21,0.24)]">
            M
          </div>
          <div>
            <p className="text-sm font-black text-white">Storylining Workshop</p>
            <p className="text-xs font-semibold text-yellow-300">{subtitle}</p>
          </div>
        </Link>
        <Link
          to="/course-wheel"
          className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-zinc-300 hover:bg-white/10"
        >
          วงล้อหลักสูตร
        </Link>
      </div>
    </header>
  );
}

function ScorePicker({
  field,
  value,
  onChange,
  description,
  disabled = false,
}: {
  field: ScoreField;
  value: number;
  onChange: (value: number) => void;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.25)]">
      <div className="mb-3">
        <h3 className="text-base font-black text-white">{scoreLabel[field]}</h3>
        {description && <p className="mt-1 text-xs leading-relaxed text-zinc-400">{description}</p>}
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
              className={`min-h-[48px] rounded-2xl border text-base font-black transition-all ${
                selected
                  ? 'border-yellow-300 bg-yellow-400 text-black shadow-[0_0_22px_rgba(250,204,21,0.26)]'
                  : 'border-white/10 bg-black/35 text-zinc-200 hover:border-yellow-300/50'
              } disabled:cursor-not-allowed disabled:opacity-45`}
              aria-pressed={selected}
            >
              {score}
            </button>
          );
        })}
      </div>
      {field === 'answer_first_score' && (
        <div className="mt-2 grid grid-cols-5 text-center text-[10px] font-semibold text-zinc-500">
          <span>Needs Work</span>
          <span>2</span>
          <span>Solid</span>
          <span>4</span>
          <span>Outstanding</span>
        </div>
      )}
    </section>
  );
}

function PeerFeedbackFormPage() {
  const [form, setForm] = useState<FeedbackForm>(emptyForm);
  const [participantNames, setParticipantNames] = useState<string[]>([]);
  const [savedEvaluatorName, setSavedEvaluatorName] = useState('');
  const [editingOriginalName, setEditingOriginalName] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [nameDropdownOpen, setNameDropdownOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadParticipantNames = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const { data, error: loadError } = await supabase
      .from('peer_feedback_participants')
      .select('id, name, created_at')
      .order('name', { ascending: true });

    if (loadError) {
      setError(loadError.message);
      setParticipantNames([]);
      return;
    }

    setParticipantNames(((data as ParticipantRow[]) || []).map((row) => row.name));
  }, []);

  useEffect(() => {
    loadParticipantNames();
    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel('peer-feedback-participants')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'peer_feedback_participants' }, () => {
        loadParticipantNames();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadParticipantNames]);

  const isValid =
    Boolean(savedEvaluatorName) &&
    Boolean(form.presenter_team) &&
    SCORE_FIELDS.every((field) => form[field] >= 1 && form[field] <= 5);
  const isEvaluatorNameLocked = Boolean(savedEvaluatorName) && form.evaluator_name === savedEvaluatorName;
  const matchingParticipantNames = useMemo(() => {
    const keyword = form.evaluator_name.trim().toLowerCase();
    if (!nameDropdownOpen || isEvaluatorNameLocked) return [];
    const matches = keyword
      ? participantNames.filter((name) => name.toLowerCase().includes(keyword))
      : participantNames;
    return matches.slice(0, 8);
  }, [form.evaluator_name, isEvaluatorNameLocked, nameDropdownOpen, participantNames]);

  const setScore = (field: ScoreField, value: number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const deleteEditedOriginalName = async (nextName: string) => {
    const originalName = editingOriginalName.trim();
    if (!originalName || originalName.toLowerCase() === nextName.trim().toLowerCase()) return null;

    const { error: deleteError } = await supabase
      .from('peer_feedback_participants')
      .delete()
      .eq('name', originalName);

    if (deleteError) return deleteError.message;

    setParticipantNames((prev) =>
      prev.filter((name) => name.trim().toLowerCase() !== originalName.toLowerCase())
    );
    setForm((prev) => ({
      ...prev,
      presenter_team: prev.presenter_team.trim().toLowerCase() === originalName.toLowerCase() ? '' : prev.presenter_team,
    }));
    setEditingOriginalName('');
    return null;
  };

  const saveEvaluatorName = async () => {
    const trimmedName = form.evaluator_name.trim();
    setError('');
    setMessage('');

    if (!trimmedName) {
      setError('กรุณากรอกชื่อก่อนบันทึก');
      return;
    }
    if (!isSupabaseConfigured) {
      setError('ยังไม่ได้ตั้งค่า Supabase กรุณาติดต่อผู้ดูแล');
      return;
    }
    const existingName = participantNames.find((name) => name.trim().toLowerCase() === trimmedName.toLowerCase());
    if (existingName) {
      setSavingName(true);
      const deleteError = await deleteEditedOriginalName(existingName);
      setSavingName(false);
      if (deleteError) {
        setError(deleteError);
        return;
      }
      setForm((prev) => ({ ...prev, evaluator_name: existingName }));
      setSavedEvaluatorName(existingName);
      setMessage(`ใช้ชื่อ "${existingName}" แล้ว สามารถเริ่มประเมินได้`);
      return;
    }

    setSavingName(true);
    const { error: saveError } = await supabase
      .from('peer_feedback_participants')
      .upsert({ name: trimmedName }, { onConflict: 'name', ignoreDuplicates: true });

    if (saveError) {
      setSavingName(false);
      setError(saveError.message);
      return;
    }
    const deleteError = await deleteEditedOriginalName(trimmedName);
    setSavingName(false);
    if (deleteError) {
      setError(deleteError);
      return;
    }

    setForm((prev) => ({ ...prev, evaluator_name: trimmedName }));
    setSavedEvaluatorName(trimmedName);
    setParticipantNames((prev) => Array.from(new Set([...prev, trimmedName])).sort());
    setMessage(`บันทึกชื่อ "${trimmedName}" แล้ว สามารถเลือกชื่อนี้ในข้อ Q1 ได้`);
  };

  const editEvaluatorName = () => {
    setEditingOriginalName(savedEvaluatorName);
    setSavedEvaluatorName('');
    setMessage('');
    setError('');
  };

  const startNewEvaluatorName = () => {
    setEditingOriginalName('');
    setSavedEvaluatorName('');
    setForm((prev) => ({ ...prev, evaluator_name: '', presenter_team: '' }));
    setMessage('');
    setError('');
  };

  const deleteSavedEvaluatorName = async () => {
    const nameToDelete = savedEvaluatorName.trim();
    if (!nameToDelete) return;
    if (!window.confirm(`ลบชื่อ "${nameToDelete}" และข้อมูลประเมินที่เกี่ยวข้องออกจาก Dashboard?`)) return;

    setError('');
    setMessage('');
    setSavingName(true);
    const { error: deleteParticipantError } = await supabase
      .from('peer_feedback_participants')
      .delete()
      .eq('name', nameToDelete);

    if (deleteParticipantError) {
      setSavingName(false);
      setError(deleteParticipantError.message);
      return;
    }

    const { error: deletePresenterFeedbackError } = await supabase
      .from('peer_feedback_audience_grid')
      .delete()
      .eq('presenter_team', nameToDelete);

    if (deletePresenterFeedbackError) {
      setSavingName(false);
      setError(deletePresenterFeedbackError.message);
      return;
    }

    const { error: deleteEvaluatorFeedbackError } = await supabase
      .from('peer_feedback_audience_grid')
      .delete()
      .eq('evaluator_name', nameToDelete);
    setSavingName(false);

    if (deleteEvaluatorFeedbackError) {
      setError(deleteEvaluatorFeedbackError.message);
      return;
    }

    setParticipantNames((prev) =>
      prev.filter((name) => name.trim().toLowerCase() !== nameToDelete.toLowerCase())
    );
    setSavedEvaluatorName('');
    setEditingOriginalName('');
    setForm(emptyForm);
    setMessage(`ลบชื่อ "${nameToDelete}" และข้อมูลบน Dashboard แล้ว`);
  };

  const selectExistingEvaluatorName = (name: string) => {
    setForm((prev) => ({ ...prev, evaluator_name: name }));
    setNameDropdownOpen(false);
    setError('');
    setMessage('');
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!isValid) {
      setError('กรุณากดบันทึกชื่อก่อน แล้วเลือกชื่อที่กำลังประเมิน และให้คะแนนครบทั้ง 4 ข้อ');
      return;
    }
    if (!isSupabaseConfigured) {
      setError('ยังไม่ได้ตั้งค่า Supabase กรุณาติดต่อผู้ดูแล');
      return;
    }

    setSaving(true);
    const { error: submitError } = await supabase.from('peer_feedback_audience_grid').insert({
      evaluator_name: form.evaluator_name.trim() || null,
      presenter_team: form.presenter_team,
      answer_first_score: form.answer_first_score,
      logic_score: form.logic_score,
      story_score: form.story_score,
      delivery_score: form.delivery_score,
      note: form.note.trim() || null,
    });
    setSaving(false);

    if (submitError) {
      setError(submitError.message);
      return;
    }

    setForm({ ...emptyForm, evaluator_name: savedEvaluatorName || form.evaluator_name });
    setMessage('ขอบคุณสำหรับการประเมิน กรุณาส่งแบบประเมินอีกครั้งสำหรับคนถัดไป');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#070707] text-white selection:bg-yellow-300 selection:text-black">
      <LogoHeader subtitle="Audience Grid Feedback" />
      <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-10">
        <section className="mb-5 rounded-[2rem] border border-yellow-400/20 bg-[radial-gradient(circle_at_20%_0%,rgba(250,204,21,0.22),transparent_35%),linear-gradient(135deg,rgba(24,24,27,0.94),rgba(8,8,8,0.96))] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.42)]">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-yellow-300">Peer Feedback</p>
          <h1 className="mt-2 text-3xl font-black leading-tight sm:text-5xl">Audience Grid</h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-300">
            แบบประเมินเร็วสำหรับผู้เข้าร่วม Workshop ประเมินผู้ที่ขึ้นนำเสนอ ใช้เวลาประมาณ 45 วินาทีต่อคน
          </p>
          <Link
            to="/peer-feedback/dashboard"
            className="mt-4 inline-flex rounded-full border border-yellow-300/30 bg-yellow-300/10 px-4 py-2 text-xs font-black text-yellow-200 hover:bg-yellow-300/20"
          >
            เปิด Dashboard Real-time
          </Link>
        </section>

        {message && (
          <div className="mb-4 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-200">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
            <label htmlFor="evaluator_name" className="mb-2 block text-sm font-black text-zinc-200">
              Q0 ชื่อและนามสกุลของคุณ <span className="text-zinc-500"></span>
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <input
                  id="evaluator_name"
                  value={form.evaluator_name}
                  onChange={(event) => setForm((prev) => ({ ...prev, evaluator_name: event.target.value }))}
                  onFocus={() => setNameDropdownOpen(true)}
                  onMouseDown={() => setNameDropdownOpen(true)}
                  onBlur={() => window.setTimeout(() => setNameDropdownOpen(false), 120)}
                  placeholder="กรอกชื่อของคุณ"
                  disabled={isEvaluatorNameLocked}
                  autoComplete="off"
                  className="w-full rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-base text-white placeholder-zinc-500 outline-none focus:border-yellow-300 disabled:cursor-not-allowed disabled:border-yellow-300/25 disabled:bg-yellow-400/10 disabled:text-yellow-100"
                />
                {matchingParticipantNames.length > 0 && (
                  <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-30 overflow-hidden rounded-2xl border border-yellow-300/20 bg-[#111] shadow-[0_18px_44px_rgba(0,0,0,0.45)]">
                    {matchingParticipantNames.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => selectExistingEvaluatorName(name)}
                        className="block w-full px-4 py-3 text-left text-sm font-bold text-zinc-200 transition-colors hover:bg-yellow-300/10 hover:text-yellow-100"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {isEvaluatorNameLocked ? (
                <div className="grid grid-cols-3 gap-2 sm:flex">
                  <button
                    type="button"
                    onClick={editEvaluatorName}
                    className="rounded-2xl border border-yellow-300/30 bg-yellow-300/10 px-4 py-3 text-sm font-black text-yellow-100 transition-all hover:bg-yellow-300/20"
                  >
                    แก้ไขชื่อ
                  </button>
                  <button
                    type="button"
                    onClick={startNewEvaluatorName}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-zinc-200 transition-all hover:bg-white/10"
                  >
                    ชื่อใหม่
                  </button>
                  <button
                    type="button"
                    onClick={deleteSavedEvaluatorName}
                    disabled={savingName}
                    className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-black text-red-200 transition-all hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    ลบชื่อ
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={saveEvaluatorName}
                  disabled={savingName || !form.evaluator_name.trim()}
                  className="rounded-2xl bg-yellow-400 px-4 py-3 text-sm font-black text-black transition-all hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingName ? 'กำลังบันทึก...' : 'บันทึกชื่อ'}
                </button>
              )}
            </div>
            {isEvaluatorNameLocked && (
              <p className="mt-2 text-xs font-semibold text-yellow-100/70">
                บันทึกชื่อแล้ว ระบบจะใช้ชื่อนี้สำหรับการส่งแบบประเมินครั้งถัดไป
              </p>
            )}
            {!isEvaluatorNameLocked && (
              <p className="mt-2 text-xs font-semibold text-zinc-500">
                ต้องกดบันทึกชื่อก่อนจึงจะเริ่มประเมินได้
              </p>
            )}
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
            <label htmlFor="presenter_team" className="mb-2 block text-sm font-black text-zinc-200">
              Q1 คุณกำลังประเมินใคร? *
            </label>
            <select
              id="presenter_team"
              value={form.presenter_team}
              onChange={(event) => setForm((prev) => ({ ...prev, presenter_team: event.target.value }))}
              disabled={!savedEvaluatorName}
              className="w-full rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-base text-white outline-none focus:border-yellow-300 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <option value="">
                {!savedEvaluatorName
                  ? 'กรุณาบันทึกชื่อก่อน'
                  : participantNames.length > 0
                    ? 'เลือกชื่อที่บันทึกไว้'
                    : 'ยังไม่มีชื่อที่บันทึก'}
              </option>
              {participantNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-zinc-500">
              หากยังไม่มีชื่อในรายการ ให้กรอกชื่อที่ Q0 แล้วกด “บันทึกชื่อ” ก่อน
            </p>
          </section>

          <ScorePicker
            field="answer_first_score"
            value={form.answer_first_score}
            onChange={(value) => setScore('answer_first_score', value)}
            description="Q2 Answer-first — did they lead with the answer, not bury it?"
            disabled={!savedEvaluatorName}
          />
          <ScorePicker
            field="logic_score"
            value={form.logic_score}
            onChange={(value) => setScore('logic_score', value)}
            description="Q3 Logic (MECE) — was the structure clear and easy to follow?"
            disabled={!savedEvaluatorName}
          />
          <ScorePicker
            field="story_score"
            value={form.story_score}
            onChange={(value) => setScore('story_score', value)}
            description="Q4 Story (SEE) — did the points build a compelling story?"
            disabled={!savedEvaluatorName}
          />
          <ScorePicker
            field="delivery_score"
            value={form.delivery_score}
            onChange={(value) => setScore('delivery_score', value)}
            description="Q5 Delivery — simple, short, and did it land?"
            disabled={!savedEvaluatorName}
          />

          <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
            <label htmlFor="note" className="mb-2 block text-sm font-black text-zinc-200">
              Q6 One note — best bit + one thing to improve
            </label>
            <textarea
              id="note"
              value={form.note}
              onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
              rows={4}
              placeholder="เช่น Opening ดีมาก แต่สรุปท้ายยังไม่ชัด"
              disabled={!savedEvaluatorName}
              className="w-full resize-none rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-base text-white placeholder-zinc-500 outline-none focus:border-yellow-300 disabled:cursor-not-allowed disabled:opacity-45"
            />
          </section>

          <button
            type="submit"
            disabled={saving || !isValid}
            className="sticky bottom-3 z-10 w-full rounded-2xl bg-yellow-400 px-6 py-4 text-base font-black text-black shadow-[0_18px_45px_rgba(250,204,21,0.25)] transition-all hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'กำลังส่ง...' : 'Submit'}
          </button>
        </form>
      </main>
    </div>
  );
}

function computeSummaries(rows: FeedbackRow[]): TeamSummary[] {
  const grouped = rows.reduce<Record<string, FeedbackRow[]>>((acc, row) => {
    acc[row.presenter_team] = acc[row.presenter_team] || [];
    acc[row.presenter_team].push(row);
    return acc;
  }, {});

  return Object.entries(grouped)
    .map(([team, teamRows]) => {
      const avg = (field: ScoreField) =>
        teamRows.reduce((sum, row) => sum + Number(row[field] || 0), 0) / Math.max(teamRows.length, 1);
      const answerAvg = avg('answer_first_score');
      const logicAvg = avg('logic_score');
      const storyAvg = avg('story_score');
      const deliveryAvg = avg('delivery_score');
      return {
        team,
        count: teamRows.length,
        answerAvg,
        logicAvg,
        storyAvg,
        deliveryAvg,
        overallAvg: (answerAvg + logicAvg + storyAvg + deliveryAvg) / 4,
        comments: teamRows.map((row) => row.note?.trim()).filter(Boolean) as string[],
      };
    })
    .sort((a, b) => b.overallAvg - a.overallAvg);
}

function BarChart({ summaries }: { summaries: TeamSummary[] }) {
  const max = 5;
  return (
    <div className="space-y-3">
      {summaries.map((summary) => (
        <div key={summary.team}>
          <div className="mb-1 flex items-center justify-between text-xs font-bold">
            <span className="text-zinc-200">{summary.team}</span>
            <span className="text-yellow-300">{formatScore(summary.overallAvg)}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-yellow-500 via-yellow-300 to-yellow-100"
              style={{ width: `${Math.min(100, (summary.overallAvg / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function RadarChart({ summaries }: { summaries: TeamSummary[] }) {
  const axes = ['Answer', 'Logic', 'Story', 'Delivery'];
  const colors = ['#facc15', '#38bdf8', '#fb7185', '#34d399', '#c084fc', '#f97316'];
  const center = 110;
  const radius = 78;
  const point = (axisIndex: number, value: number) => {
    const angle = -Math.PI / 2 + (axisIndex * 2 * Math.PI) / axes.length;
    const scaled = (value / 5) * radius;
    return `${center + Math.cos(angle) * scaled},${center + Math.sin(angle) * scaled}`;
  };

  return (
    <div>
      <svg viewBox="0 0 220 220" className="mx-auto h-64 w-full max-w-md">
        {[1, 2, 3, 4, 5].map((level) => {
          const value = (level / 5) * radius;
          const points = axes
            .map((_, index) => {
              const angle = -Math.PI / 2 + (index * 2 * Math.PI) / axes.length;
              return `${center + Math.cos(angle) * value},${center + Math.sin(angle) * value}`;
            })
            .join(' ');
          return <polygon key={level} points={points} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />;
        })}
        {axes.map((axis, index) => {
          const outer = point(index, 5);
          const [x, y] = outer.split(',').map(Number);
          return (
            <g key={axis}>
              <line x1={center} y1={center} x2={x} y2={y} stroke="rgba(255,255,255,0.16)" />
              <text x={x} y={y} fill="#d4d4d8" fontSize="9" textAnchor="middle" dominantBaseline="middle">
                {axis}
              </text>
            </g>
          );
        })}
        {summaries.slice(0, 6).map((summary, index) => {
          const points = [
            point(0, summary.answerAvg),
            point(1, summary.logicAvg),
            point(2, summary.storyAvg),
            point(3, summary.deliveryAvg),
          ].join(' ');
          return (
            <polygon
              key={summary.team}
              points={points}
              fill={colors[index % colors.length]}
              fillOpacity="0.12"
              stroke={colors[index % colors.length]}
              strokeWidth="2"
            />
          );
        })}
      </svg>
      <div className="flex flex-wrap gap-2">
        {summaries.slice(0, 6).map((summary, index) => (
          <span key={summary.team} className="rounded-full bg-white/5 px-3 py-1 text-xs text-zinc-300">
            <span style={{ color: colors[index % colors.length] }}>●</span> {summary.team}
          </span>
        ))}
      </div>
    </div>
  );
}

function PeerFeedbackDashboardPage() {
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadRows = React.useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    setError('');
    const { data, error: loadError } = await supabase
      .from('peer_feedback_audience_grid')
      .select('id, created_at, evaluator_name, presenter_team, answer_first_score, logic_score, story_score, delivery_score, note')
      .order('created_at', { ascending: false });
    setLoading(false);
    if (loadError) {
      setError(loadError.message);
      setRows([]);
      return;
    }
    setRows((data as FeedbackRow[]) || []);
  }, []);

  useEffect(() => {
    loadRows();
    if (!isSupabaseConfigured) return;
    const channel = supabase
      .channel('peer-feedback-audience-grid')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'peer_feedback_audience_grid' }, () => {
        loadRows();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadRows]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const rowTime = new Date(row.created_at).getTime();
      const fromOk = dateFrom ? rowTime >= new Date(`${dateFrom}T00:00:00`).getTime() : true;
      const toOk = dateTo ? rowTime <= new Date(`${dateTo}T23:59:59`).getTime() : true;
      const teamOk = teamFilter ? row.presenter_team === teamFilter : true;
      const searchOk = search
        ? `${row.presenter_team} ${row.evaluator_name || ''} ${row.note || ''}`.toLowerCase().includes(search.toLowerCase())
        : true;
      return fromOk && toOk && teamOk && searchOk;
    });
  }, [rows, teamFilter, search, dateFrom, dateTo]);

  const summaries = useMemo(() => computeSummaries(filteredRows), [filteredRows]);
  const uniqueTeams = useMemo(() => Array.from(new Set(rows.map((row) => row.presenter_team))).sort(), [rows]);
  const overallAverage = useMemo(() => {
    if (filteredRows.length === 0) return 0;
    return (
      filteredRows.reduce(
        (sum, row) =>
          sum +
          (row.answer_first_score + row.logic_score + row.story_score + row.delivery_score) / 4,
        0
      ) / filteredRows.length
    );
  }, [filteredRows]);
  const latestTime = filteredRows[0]?.created_at
    ? new Date(filteredRows[0].created_at).toLocaleString('th-TH')
    : '-';

  const exportExcel = () => {
    const exportRows = filteredRows.map((row) => ({
      created_at: row.created_at,
      evaluator_name: row.evaluator_name || '',
      presenter_team: row.presenter_team,
      answer_first_score: row.answer_first_score,
      logic_score: row.logic_score,
      story_score: row.story_score,
      delivery_score: row.delivery_score,
      overall_score: (row.answer_first_score + row.logic_score + row.story_score + row.delivery_score) / 4,
      note: row.note || '',
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(exportRows), 'Raw Feedback');
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        summaries.map((summary) => ({
          team: summary.team,
          count: summary.count,
          answer_first_avg: summary.answerAvg,
          logic_avg: summary.logicAvg,
          story_avg: summary.storyAvg,
          delivery_avg: summary.deliveryAvg,
          overall_avg: summary.overallAvg,
        }))
      ),
      'Presenter Summary'
    );
    XLSX.writeFile(workbook, `peer-feedback-audience-grid-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-[#070707] text-white selection:bg-yellow-300 selection:text-black">
      <LogoHeader subtitle="Audience Grid Feedback Dashboard" />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:py-10">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-yellow-300">Realtime Dashboard</p>
            <h1 className="mt-2 text-3xl font-black sm:text-5xl">Peer Feedback — Audience Grid</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/peer-feedback" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-zinc-200">
              เปิดหน้า Form
            </Link>
            <button
              type="button"
              onClick={exportExcel}
              className="rounded-full bg-yellow-400 px-4 py-2 text-sm font-black text-black hover:bg-yellow-300"
            >
              Export to Excel
            </button>
          </div>
        </div>

        {error && <div className="mb-4 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-red-200">{error}</div>}
        {!isSupabaseConfigured && (
          <div className="mb-4 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-amber-200">
            ยังไม่ได้ตั้งค่า Supabase
          </div>
        )}

        <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ['จำนวนการประเมินทั้งหมด', filteredRows.length],
            ['จำนวนชื่อที่ถูกประเมิน', summaries.length],
            ['คะแนนเฉลี่ยรวมทั้งหมด', formatScore(overallAverage)],
            ['ส่งล่าสุด', latestTime],
          ].map(([label, value]) => (
            <div key={label} className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
              <p className="text-xs font-bold text-zinc-500">{label}</p>
              <p className="mt-2 text-2xl font-black text-yellow-300">{value}</p>
            </div>
          ))}
        </section>

        <section className="mb-6 grid gap-3 rounded-3xl border border-white/10 bg-white/[0.06] p-4 md:grid-cols-4">
          <select
            value={teamFilter}
            onChange={(event) => setTeamFilter(event.target.value)}
            className="rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-white outline-none focus:border-yellow-300"
          >
            <option value="">ทุกชื่อ</option>
            {uniqueTeams.map((team) => (
              <option key={team} value={team}>
                {team}
              </option>
            ))}
          </select>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ค้นหาชื่อ / comment"
            className="rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-white placeholder-zinc-500 outline-none focus:border-yellow-300"
          />
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            className="rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-white outline-none focus:border-yellow-300"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            className="rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-white outline-none focus:border-yellow-300"
          />
        </section>

        <section className="mb-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
            <h2 className="mb-4 text-xl font-black text-white">Bar Chart — Overall Score</h2>
            <BarChart summaries={summaries} />
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
            <h2 className="mb-4 text-xl font-black text-white">Radar Chart — Criteria Comparison</h2>
            <RadarChart summaries={summaries} />
          </div>
        </section>

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {loading && <p className="text-zinc-400">กำลังโหลดข้อมูล...</p>}
          {summaries.map((summary) => (
            <article key={summary.team} className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-2xl font-black text-white">{summary.team}</h3>
                  <p className="text-sm text-zinc-500">{summary.count} ผู้ประเมิน</p>
                </div>
                <span className="rounded-2xl bg-yellow-400 px-3 py-2 text-lg font-black text-black">
                  {formatScore(summary.overallAvg)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p className="rounded-2xl bg-black/30 p-3">Answer-first: <b>{formatScore(summary.answerAvg)}</b></p>
                <p className="rounded-2xl bg-black/30 p-3">Logic: <b>{formatScore(summary.logicAvg)}</b></p>
                <p className="rounded-2xl bg-black/30 p-3">Story: <b>{formatScore(summary.storyAvg)}</b></p>
                <p className="rounded-2xl bg-black/30 p-3">Delivery: <b>{formatScore(summary.deliveryAvg)}</b></p>
              </div>
            </article>
          ))}
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
          <h2 className="mb-4 text-xl font-black text-white">Feedback Comments</h2>
          <div className="space-y-5">
            {summaries.map((summary) => (
              <div key={summary.team}>
                <h3 className="mb-2 font-black text-yellow-300">{summary.team}</h3>
                {summary.comments.length > 0 ? (
                  <div className="space-y-2">
                    {summary.comments.map((comment, index) => (
                      <blockquote key={`${summary.team}-${index}`} className="rounded-2xl bg-black/30 p-3 text-sm text-zinc-300">
                        "{comment}"
                      </blockquote>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500">ยังไม่มี comment</p>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

const PeerFeedbackAudienceGridPage: React.FC = () => {
  const location = useLocation();
  return location.pathname.includes('/dashboard') ? <PeerFeedbackDashboardPage /> : <PeerFeedbackFormPage />;
};

export default PeerFeedbackAudienceGridPage;
