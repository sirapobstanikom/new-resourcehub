import React, { useCallback, useEffect, useState } from 'react';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  minddojoAssessmentAdminApprove,
  minddojoAssessmentAdminDelete,
  minddojoAssessmentAdminList,
  minddojoAssessmentAdminReject,
  type MinddojoAccountRow,
} from '../lib/minddojoAssessmentAuth';

function formatThaiTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'short', timeStyle: 'short' });
}

const AdminMindDojoAssessmentUsersPage: React.FC = () => {
  const [rows, setRows] = useState<MinddojoAccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyUser, setBusyUser] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setError('ยังไม่ได้ตั้งค่า Supabase');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const res = await minddojoAssessmentAdminList();
    setLoading(false);
    if (res.ok === true) {
      setRows(res.rows);
    } else {
      setError(res.error);
      setRows([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onApprove = async (username: string) => {
    setBusyUser(username);
    const res = await minddojoAssessmentAdminApprove(username);
    setBusyUser(null);
    if (res.ok === true) {
      await load();
    } else {
      setError(res.error);
    }
  };

  const onReject = async (username: string) => {
    if (!window.confirm(`ปฏิเสธ @${username} ?`)) return;
    setBusyUser(username);
    const res = await minddojoAssessmentAdminReject(username);
    setBusyUser(null);
    if (res.ok === true) {
      await load();
    } else {
      setError(res.error);
    }
  };

  const onDelete = async (username: string) => {
    if (!window.confirm(`ลบบัญชี @${username} ถาวรจากระบบ? ไม่สามารถย้อนกลับได้`)) return;
    setBusyUser(username);
    const res = await minddojoAssessmentAdminDelete(username);
    setBusyUser(null);
    if (res.ok === true) {
      await load();
    } else {
      setError(res.error);
    }
  };

  const pending = rows.filter((r) => r.status === 'pending');

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto text-white">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-yellow-400 mb-2">อนุมัติผู้ใช้ MindDoJo AI Assessment</h1>
        <p className="text-gray-400 text-sm leading-relaxed">
          บัญชีเหล่านี้เก็บในตาราง <code className="text-yellow-400/90">minddojo_assessment_accounts</code> แยกจาก
          ข้อมูลแอดมินและ ResourceHub — ผู้ใช้สมัครที่ <code className="text-yellow-400/90">/assessment/minddojo</code>{' '}
          แล้วเข้าได้หลังคุณกดอนุมัติ
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-4 px-4 py-2 rounded-xl text-sm font-medium bg-white/10 border border-white/15 hover:bg-white/15"
        >
          โหลดรายการใหม่
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/15 border border-red-500/25 text-red-300 text-sm">{error}</div>
      )}

      {loading ? (
        <p className="text-gray-500">กำลังโหลด...</p>
      ) : (
        <>
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              รออนุมัติ
              <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                {pending.length}
              </span>
            </h2>
            {pending.length === 0 ? (
              <p className="text-gray-500 text-sm">ไม่มีคำขอค้าง</p>
            ) : (
              <ul className="space-y-3">
                {pending.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4"
                  >
                    <div>
                      <p className="font-mono font-semibold text-yellow-400">@{r.username}</p>
                      <p className="text-xs text-gray-500 mt-1">สมัคร {formatThaiTime(r.created_at)}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={busyUser === r.username}
                        onClick={() => void onApprove(r.username)}
                        className="px-4 py-2 rounded-xl text-sm font-bold bg-yellow-400 text-black hover:bg-yellow-300 disabled:opacity-50"
                      >
                        อนุมัติ
                      </button>
                      <button
                        type="button"
                        disabled={busyUser === r.username}
                        onClick={() => void onReject(r.username)}
                        className="px-4 py-2 rounded-xl text-sm font-medium bg-white/10 border border-white/15 hover:bg-red-500/20 hover:border-red-500/30 disabled:opacity-50"
                      >
                        ปฏิเสธ
                      </button>
                      <button
                        type="button"
                        disabled={busyUser === r.username}
                        onClick={() => void onDelete(r.username)}
                        className="px-4 py-2 rounded-xl text-sm font-medium bg-red-950/50 border border-red-500/40 text-red-300 hover:bg-red-900/40 disabled:opacity-50"
                      >
                        ลบ
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-300 mb-4">รายการล่าสุด (ทุกสถานะ)</h2>
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-white/10 text-gray-500">
                    <th className="p-3 font-medium">Username</th>
                    <th className="p-3 font-medium">สถานะ</th>
                    <th className="p-3 font-medium">สมัคร</th>
                    <th className="p-3 font-medium">อนุมัติ / ปฏิเสธ</th>
                    <th className="p-3 font-medium w-24">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-gray-500">
                        ยังไม่มีข้อมูล — รัน SQL{' '}
                        <code className="text-gray-400">minddojo_assessment_accounts.sql</code> และ deploy function{' '}
                        <code className="text-gray-400">minddojo-assessment-auth</code>
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => (
                      <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="p-3 font-mono text-white">@{r.username}</td>
                        <td className="p-3">
                          <span
                            className={
                              r.status === 'approved'
                                ? 'text-emerald-400'
                                : r.status === 'rejected'
                                  ? 'text-red-400'
                                  : 'text-amber-400'
                            }
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="p-3 text-gray-400">{formatThaiTime(r.created_at)}</td>
                        <td className="p-3 text-gray-400 text-xs">
                          {r.approved_at ? `อนุมัติ ${formatThaiTime(r.approved_at)}` : ''}
                          {r.rejected_at ? `ปฏิเสธ ${formatThaiTime(r.rejected_at)}` : ''}
                          {!r.approved_at && !r.rejected_at ? '—' : ''}
                        </td>
                        <td className="p-3">
                          <button
                            type="button"
                            disabled={busyUser === r.username}
                            onClick={() => void onDelete(r.username)}
                            className="text-xs font-medium px-2 py-1 rounded-lg bg-red-950/40 border border-red-500/35 text-red-300 hover:bg-red-900/35 disabled:opacity-50"
                          >
                            ลบ
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default AdminMindDojoAssessmentUsersPage;
