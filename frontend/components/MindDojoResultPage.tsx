import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isAuthenticated } from '../lib/auth';
import { isSupabaseConfigured } from '../lib/supabase';
import { isMindDojoAssessmentLoggedIn } from '../lib/minddojoAssessmentAuth';
import { MINDDOJO_DIMENSIONS, MINDDOJO_REPORT_STORAGE_KEY } from '../data/mindDojoDimensions';
import type { MindDojoStoredReportPayload } from '../services/gemini';

function loadStoredReport(): MindDojoStoredReportPayload | null {
  try {
    const raw = sessionStorage.getItem(MINDDOJO_REPORT_STORAGE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as MindDojoStoredReportPayload;
    if (!o?.report?.dimensions || typeof o.report.overall !== 'number') return null;
    return o;
  } catch {
    return null;
  }
}

const MindDojoResultPage: React.FC = () => {
  const navigate = useNavigate();
  const { loading: authLoading } = useAuth();
  const resourceHub = isAuthenticated();
  const loggedIn =
    isMindDojoAssessmentLoggedIn() || (!isSupabaseConfigured && resourceHub);
  const [payload, setPayload] = useState<MindDojoStoredReportPayload | null>(() =>
    typeof window !== 'undefined' ? loadStoredReport() : null,
  );

  useEffect(() => {
    setPayload(loadStoredReport());
  }, []);

  const clearAndRestart = () => {
    sessionStorage.removeItem(MINDDOJO_REPORT_STORAGE_KEY);
    navigate('/assessment/minddojo', { replace: true });
  };

  if (authLoading && !resourceHub && !isMindDojoAssessmentLoggedIn()) {
    return (
      <div className="min-h-[100dvh] bg-transparent text-white flex items-center justify-center bg-grid">
        <p className="text-zinc-400 text-sm">กำลังโหลด...</p>
      </div>
    );
  }

  if (!loggedIn) {
    return <Navigate to="/assessment/minddojo" replace />;
  }

  if (!payload) {
    return (
      <div className="min-h-[100dvh] bg-transparent text-white bg-grid flex flex-col items-center justify-center px-6">
        <p className="text-gray-300 text-center mb-6 max-w-md">
          ยังไม่มีผลการประเมิน หรือหมดอายุการแสดงในหน้านี้ — กรุณาทำแบบประเมินให้จบแล้วพิมพ์ <strong className="text-yellow-400">result</strong> ในห้องแชท
        </p>
        <Link
          to="/assessment/minddojo"
          className="px-6 py-3 rounded-xl font-bold bg-yellow-400 text-black hover:bg-yellow-300"
        >
          ไป MindDoJo AI Assessment
        </Link>
      </div>
    );
  }

  const { report, profile, scenario } = payload;

  return (
    <div className="min-h-[100dvh] bg-transparent text-white bg-grid flex flex-col">
      <header className="shrink-0 border-b border-white/10 px-4 lg:px-10 py-3 flex flex-wrap items-center justify-between gap-3 max-w-7xl mx-auto w-full">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gray-500">MindDoJo</p>
          <h1 className="text-lg lg:text-xl font-bold text-yellow-400">ผลการประเมินการสื่อสาร</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {profile.name} · {scenario.context}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={clearAndRestart}
            className="px-4 py-2 rounded-xl text-sm font-bold bg-yellow-400 text-black hover:bg-yellow-300 touch-manipulation"
          >
            ประเมินใหม่
          </button>
          <Link
            to="/assessment/minddojo"
            className="px-4 py-2 rounded-xl text-sm font-medium bg-white/10 border border-white/15 hover:bg-white/15 touch-manipulation inline-flex items-center"
          >
            กลับแชท
          </Link>
          <Link
            to="/"
            className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white touch-manipulation inline-flex items-center"
          >
            หน้าหลัก
          </Link>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 lg:px-10 py-6 max-w-7xl mx-auto w-full space-y-8 pb-12">
        <section className="rounded-2xl border border-yellow-400/25 bg-black/35 p-6 lg:p-8 flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex flex-col items-center sm:items-start">
            <div
              className="relative w-28 h-28 lg:w-32 lg:h-32 rounded-full border-4 border-yellow-400/40 flex items-center justify-center bg-yellow-400/10"
              aria-hidden
            >
              <span className="text-3xl lg:text-4xl font-black text-yellow-400">{report.overall}</span>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center sm:text-left">คะแนนรวม 0–100</p>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base lg:text-lg font-semibold text-white mb-2">สรุปภาพรวม</h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              คะแนนแยกด้านด้านล่างสะท้อน 6 มิติการสื่อสารในองค์กรจากบทสนทนาที่จำลอง ใช้เพื่อพัฒนา
              ไม่ใช่การตัดสินบุคคล และไม่ครอบคลุมทุกทักษะ
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">คะแนนแยกตามด้าน</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
            {MINDDOJO_DIMENSIONS.map((dim) => {
              const d = report.dimensions[dim.key];
              const score = d?.score ?? 0;
              const brief = d?.brief ?? '—';
              return (
                <div
                  key={dim.key}
                  className="rounded-xl border border-white/10 bg-white/[0.04] p-4 lg:p-5"
                >
                  <div className="flex justify-between items-start gap-3 mb-2">
                    <div className="min-w-0">
                      <p className="font-bold text-white text-sm lg:text-base">{dim.labelTh}</p>
                      <p className="text-xs text-yellow-400/90 font-medium">{dim.labelEn}</p>
                      <p className="text-[11px] lg:text-xs text-gray-500 mt-1 leading-snug">{dim.descriptionTh}</p>
                    </div>
                    <span className="shrink-0 text-xl font-black text-yellow-400 tabular-nums">{score}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-3">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-600 to-yellow-400 transition-[width] duration-500"
                      style={{ width: `${score}%` }}
                    />
                  </div>
                  <p className="text-xs lg:text-sm text-gray-300 leading-relaxed">{brief}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 lg:p-5">
            <h3 className="text-sm font-bold text-green-400 mb-3">จุดแข็ง</h3>
            <ul className="text-sm text-gray-300 space-y-2 list-disc list-inside">
              {(report.strengths?.length ? report.strengths : ['—']).map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 lg:p-5">
            <h3 className="text-sm font-bold text-amber-400 mb-3">จุดที่ควรพัฒนา</h3>
            <ul className="text-sm text-gray-300 space-y-2 list-disc list-inside">
              {(report.improvements?.length ? report.improvements : ['—']).map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-zinc-950/50 p-5 lg:p-8">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Feedback เชิงลึก</h2>
          <div className="text-sm lg:text-base text-gray-200 leading-relaxed whitespace-pre-wrap">
            {report.narrative || '—'}
          </div>
        </section>
      </main>
    </div>
  );
};

export default MindDojoResultPage;
