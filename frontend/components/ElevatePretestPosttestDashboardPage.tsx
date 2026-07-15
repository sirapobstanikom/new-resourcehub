import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  computeElevateDashboard,
  findElevateBankById,
  formatElevatePercent,
  loadElevateResponsesLocal,
  loadStoredElevateBanks,
  saveElevateBanksToStorage,
  scorePercent,
  type ElevateTestBank,
  type ElevateTestResponse,
} from '../lib/elevatePretestPosttest';
import {
  fetchElevateBanksFromSupabase,
  fetchElevateResponsesFromSupabase,
} from '../lib/elevatePretestPosttestSupabase';
import { isSupabaseConfigured } from '../lib/supabase';

const ElevatePretestPosttestDashboardPage: React.FC = () => {
  const { bankId } = useParams<{ bankId: string }>();
  const [bank, setBank] = useState<ElevateTestBank | null>(null);
  const [responses, setResponses] = useState<ElevateTestResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [syncNote, setSyncNote] = useState('');
  const dashboardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setSyncNote('');
      const local = loadStoredElevateBanks();
      let found = findElevateBankById(local, bankId);
      let nextResponses = loadElevateResponsesLocal();

      if (isSupabaseConfigured) {
        const remoteBanks = await fetchElevateBanksFromSupabase();
        if (!cancelled && remoteBanks.banks.length > 0) {
          saveElevateBanksToStorage(remoteBanks.banks);
          found = findElevateBankById(remoteBanks.banks, bankId) || found;
        }

        const remoteResponses = await fetchElevateResponsesFromSupabase(found?.id);
        if (!cancelled) {
          if (remoteResponses.tableMissing) {
            setSyncNote('ยังไม่มีตาราง responses บน Supabase — แสดงข้อมูลจากเครื่อง');
          } else if (remoteResponses.error) {
            setSyncNote(`โหลดคำตอบจาก Supabase ไม่สำเร็จ: ${remoteResponses.error}`);
          } else {
            nextResponses = remoteResponses.responses;
            setSyncNote(`โหลดคำตอบจาก Supabase ${remoteResponses.responses.length} รายการ`);
          }
        }
      } else {
        setSyncNote('แสดงข้อมูลจากเครื่อง (ยังไม่ได้ตั้งค่า Supabase)');
      }

      if (cancelled) return;
      setBank(found);
      setResponses(nextResponses);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [bankId, tick]);

  const stats = useMemo(() => {
    if (!bank) return null;
    return computeElevateDashboard(bank.id, responses);
  }, [bank, responses]);

  const downloadPdf = async () => {
    if (!dashboardRef.current || !bank) return;
    setExporting(true);
    setError('');
    try {
      await new Promise((resolve) => setTimeout(resolve, 80));
      const canvas = await html2canvas(dashboardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#070707',
      });
      const img = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const ratio = canvas.width / canvas.height;
      let drawWidth = pageWidth - 16;
      let drawHeight = drawWidth / ratio;
      if (drawHeight > pageHeight - 16) {
        drawHeight = pageHeight - 16;
        drawWidth = drawHeight * ratio;
      }
      const x = (pageWidth - drawWidth) / 2;
      pdf.addImage(img, 'PNG', x, 8, drawWidth, drawHeight);
      const safeName = bank.name.trim().replace(/[\\/:*?"<>|]+/g, '-') || 'elevate-dashboard';
      pdf.save(`${safeName}-pretest-posttest-dashboard.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ดาวน์โหลด PDF ไม่สำเร็จ');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070707] text-zinc-400">
        กำลังโหลด Dashboard...
      </div>
    );
  }

  if (!bank || !stats) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#070707] px-6 text-center text-white">
        <p className="text-sm text-zinc-400">ไม่พบชุดข้อสอบนี้</p>
        <Link to="/elevate-pretest-posttest-editor" className="text-sm font-semibold text-yellow-400 hover:underline">
          กลับไปหน้า editor
        </Link>
      </div>
    );
  }

  const gainLabel =
    stats.knowledgeGainPercent == null
      ? '—'
      : `${stats.knowledgeGainPercent >= 0 ? '+' : ''}${formatElevatePercent(stats.knowledgeGainPercent)}%`;

  const pointsLabel = `${stats.knowledgeGainPoints >= 0 ? '+' : ''}${formatElevatePercent(stats.knowledgeGainPoints)} pt`;

  return (
    <div className="min-h-screen bg-[#070707] text-white selection:bg-yellow-300 selection:text-black">
      <header className="border-b border-yellow-400/15 bg-[#0a0a0a]">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-400/80">ELEVATE</p>
            <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">Pretest-Posttest Dashboard</h1>
            <p className="mt-1 text-sm text-zinc-400">{bank.name}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTick((n) => n + 1)}
              className="rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-xs font-semibold text-zinc-200 hover:border-yellow-400/40"
            >
              รีเฟรช
            </button>
            <button
              type="button"
              onClick={downloadPdf}
              disabled={exporting}
              className="rounded-xl bg-yellow-400 px-4 py-2 text-sm font-bold text-black hover:bg-yellow-300 disabled:opacity-60"
            >
              {exporting ? 'กำลังสร้าง PDF...' : 'ดาวน์โหลด PDF'}
            </button>
            <Link
              to="/elevate-pretest-posttest-editor"
              className="rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-xs font-semibold text-zinc-200 hover:border-yellow-400/40"
            >
              กลับ Editor
            </Link>
          </div>
        </div>
        {syncNote && (
          <p className="mx-auto max-w-6xl px-4 pb-3 text-xs text-zinc-500 sm:px-6">{syncNote}</p>
        )}
      </header>

      <div className="mx-auto max-w-6xl space-y-4 px-4 py-6 sm:px-6">
        {error && (
          <p className="rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>
        )}

        <div ref={dashboardRef} className="space-y-4 rounded-3xl bg-[#070707] p-1">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs text-zinc-500">ผู้ทำ Pretest</p>
              <p className="mt-2 text-3xl font-black text-white">{stats.pretestCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs text-zinc-500">ผู้ทำ Posttest</p>
              <p className="mt-2 text-3xl font-black text-white">{stats.posttestCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs text-zinc-500">คะแนนเฉลี่ย Pretest</p>
              <p className="mt-2 text-3xl font-black text-amber-200">
                {formatElevatePercent(stats.avgPretestPercent)}%
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-4">
              <p className="text-xs text-emerald-200/80">คะแนนเฉลี่ย Posttest</p>
              <p className="mt-2 text-3xl font-black text-emerald-200">
                {formatElevatePercent(stats.avgPosttestPercent)}%
              </p>
            </div>
          </div>

          <section className="rounded-2xl border border-yellow-400/25 bg-yellow-400/5 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-yellow-300/90">ความรู้เพิ่มขึ้น</p>
            <div className="mt-3 flex flex-wrap items-end gap-6">
              <div>
                <p className="text-4xl font-black text-yellow-300">{gainLabel}</p>
                <p className="mt-1 text-xs text-zinc-400">จากคะแนนเฉลี่ยเดิม (Pre → Post)</p>
              </div>
              <div>
                <p className="text-2xl font-black text-white">{pointsLabel}</p>
                <p className="mt-1 text-xs text-zinc-400">เพิ่มขึ้นเป็นจุดเปอร์เซ็นต์</p>
              </div>
              <div className="text-sm text-zinc-300">
                <p>
                  จาก{' '}
                  <span className="font-bold text-amber-200">
                    {formatElevatePercent(stats.avgPretestPercent)}%
                  </span>
                  {' → '}
                  <span className="font-bold text-emerald-200">
                    {formatElevatePercent(stats.avgPosttestPercent)}%
                  </span>
                </p>
                <p className="mt-1 text-xs text-zinc-500">จับคู่ผู้ทำตามชื่อ (ครั้งล่าสุดของแต่ละคน)</p>
              </div>
            </div>
          </section>

          <section className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <h3 className="mb-3 text-sm font-bold text-yellow-300">ผลรายคน (จับคู่ Pretest + Posttest)</h3>
            {stats.paired.length === 0 ? (
              <p className="text-sm text-zinc-500">
                ยังไม่มีคนที่ทำครบทั้ง Pretest และ Posttest ด้วยชื่อเดียวกัน
              </p>
            ) : (
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="text-left text-xs text-zinc-500">
                    <th className="border-b border-white/10 px-2 py-2">ชื่อ</th>
                    <th className="border-b border-white/10 px-2 py-2 text-right">Pretest</th>
                    <th className="border-b border-white/10 px-2 py-2 text-right">Posttest</th>
                    <th className="border-b border-white/10 px-2 py-2 text-right">เพิ่มขึ้น (pt)</th>
                    <th className="border-b border-white/10 px-2 py-2 text-right">จากเดิม (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.paired.map((row) => (
                    <tr key={row.name} className="text-zinc-200">
                      <td className="border-b border-white/5 px-2 py-2 font-medium">{row.name}</td>
                      <td className="border-b border-white/5 px-2 py-2 text-right">
                        {formatElevatePercent(row.pretestPercent)}%
                        <span className="ml-1 text-[11px] text-zinc-500">
                          ({row.pretestScore}/{row.pretestTotal})
                        </span>
                      </td>
                      <td className="border-b border-white/5 px-2 py-2 text-right text-emerald-200">
                        {formatElevatePercent(row.posttestPercent)}%
                        <span className="ml-1 text-[11px] text-zinc-500">
                          ({row.posttestScore}/{row.posttestTotal})
                        </span>
                      </td>
                      <td
                        className={`border-b border-white/5 px-2 py-2 text-right font-semibold ${
                          row.gainPoints >= 0 ? 'text-emerald-300' : 'text-red-300'
                        }`}
                      >
                        {row.gainPoints >= 0 ? '+' : ''}
                        {formatElevatePercent(row.gainPoints)}
                      </td>
                      <td
                        className={`border-b border-white/5 px-2 py-2 text-right font-semibold ${
                          (row.gainFromBaselinePercent ?? 0) >= 0 ? 'text-yellow-300' : 'text-red-300'
                        }`}
                      >
                        {row.gainFromBaselinePercent == null
                          ? '—'
                          : `${row.gainFromBaselinePercent >= 0 ? '+' : ''}${formatElevatePercent(row.gainFromBaselinePercent)}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {(stats.unpairedPretest.length > 0 || stats.unpairedPosttest.length > 0) && (
            <section className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-500">ทำแค่ Pretest</h3>
                <ul className="mt-2 space-y-1 text-sm text-zinc-300">
                  {stats.unpairedPretest.length === 0 && <li className="text-zinc-600">—</li>}
                  {stats.unpairedPretest.map((row) => (
                    <li key={row.id}>
                      {row.respondentName}{' '}
                      <span className="text-zinc-500">
                        ({formatElevatePercent(scorePercent(row.score, row.total))}%)
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-500">ทำแค่ Posttest</h3>
                <ul className="mt-2 space-y-1 text-sm text-zinc-300">
                  {stats.unpairedPosttest.length === 0 && <li className="text-zinc-600">—</li>}
                  {stats.unpairedPosttest.map((row) => (
                    <li key={row.id}>
                      {row.respondentName}{' '}
                      <span className="text-zinc-500">
                        ({formatElevatePercent(scorePercent(row.score, row.total))}%)
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default ElevatePretestPosttestDashboardPage;
