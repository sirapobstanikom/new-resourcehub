import React, { useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  computeEvaTrainingStats,
  extractRawImpressions,
  extractRawSuggestions,
  formatScore,
  mapEvaTrainingRows,
  parseEvaTrainingFile,
  type EvaTrainingParticipant,
} from '../lib/evaTrainingDashboard';

const EvaOnePageSummaryPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [courseName, setCourseName] = useState('');
  const [participants, setParticipants] = useState<EvaTrainingParticipant[]>([]);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);

  const stats = useMemo(() => computeEvaTrainingStats(participants), [participants]);
  const suggestions = useMemo(() => extractRawSuggestions(participants), [participants]);
  const impressions = useMemo(() => extractRawImpressions(participants), [participants]);

  const createDashboard = async () => {
    if (!file) {
      setError('กรุณาเลือกไฟล์ Excel/CSV ก่อน');
      return;
    }
    if (!courseName.trim()) {
      setError('กรุณาระบุชื่อหลักสูตรก่อนสร้าง Dashboard');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const rows = await parseEvaTrainingFile(file);
      const mapped = mapEvaTrainingRows(rows);
      if (mapped.length === 0) {
        throw new Error('ไม่พบข้อมูลในไฟล์');
      }
      setParticipants(mapped);
      setReady(true);
    } catch (err) {
      setReady(false);
      setParticipants([]);
      setError(err instanceof Error ? err.message : 'อ่านไฟล์ไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = async () => {
    if (!dashboardRef.current) return;
    setExporting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 80));
      const canvas = await html2canvas(dashboardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#0b0b0b',
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
      const y = 8;
      pdf.addImage(img, 'PNG', x, y, drawWidth, drawHeight);
      const safeName = courseName.trim().replace(/[\\/:*?"<>|]+/g, '-') || 'eva-summary';
      pdf.save(`${safeName}-สรุป1หน้า.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ดาวน์โหลด PDF ไม่สำเร็จ');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070707] text-amber-50 selection:bg-amber-300 selection:text-black">
      <header className="border-b border-amber-400/20 bg-[#0b0b0b]">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300/80">Minddojo Training Dashboard</p>
            <h1 className="mt-1 text-2xl font-black text-amber-50 sm:text-3xl">Eva-สรุป1หน้า</h1>
            <p className="mt-2 text-sm text-amber-100/70">
              อัปโหลดไฟล์ประเมินผล · ข้อเสนอแนะจากผู้เข้าอบรมดึงจากไฟล์จริง ไม่แต่ง ไม่สรุปด้วย AI
            </p>
          </div>
          {ready && (
            <button
              type="button"
              onClick={downloadPdf}
              disabled={exporting}
              className="rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-bold text-black hover:bg-amber-300 disabled:opacity-60"
            >
              {exporting ? 'กำลังสร้าง PDF...' : 'ดาวน์โหลด PDF'}
            </button>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        <section className="rounded-3xl border border-amber-300/30 bg-white/5 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.55)]">
          <h2 className="text-lg font-bold text-amber-50">อัพโหลดไฟล์ประเมินผลการอบรม</h2>
          <p className="mt-1 text-sm text-amber-100/70">รองรับไฟล์ Excel และ CSV จากระบบประเมินผล</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <input
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              placeholder="ชื่อหลักสูตร"
              className="rounded-xl border border-amber-300/30 bg-black/40 px-3 py-2.5 text-sm text-amber-50 placeholder:text-amber-100/40"
            />
            <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-amber-300/40 bg-amber-400/10 px-4 py-2.5 text-sm font-semibold text-amber-100 hover:bg-amber-400/20">
              เลือกไฟล์ Excel/CSV
              <input
                type="file"
                accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                className="hidden"
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  setError('');
                }}
              />
            </label>
            <button
              type="button"
              onClick={createDashboard}
              disabled={loading}
              className="rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-bold text-black hover:bg-amber-300 disabled:opacity-60"
            >
              {loading ? 'กำลังประมวลผล...' : 'สร้าง Dashboard'}
            </button>
          </div>

          {file && <p className="mt-2 text-xs text-amber-100/60">ไฟล์ที่เลือก: {file.name}</p>}
          {error && (
            <p className="mt-3 rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>
          )}
        </section>

        {ready && (
          <div ref={dashboardRef} className="space-y-6 rounded-3xl bg-[#070707] p-1">
            <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-wide text-amber-200/70">หลักสูตร</p>
              <h2 className="mt-1 text-xl font-black text-amber-50">{courseName.trim()}</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: 'ผู้เข้าร่วมทั้งหมด', value: `${stats.totalParticipants} คน` },
                  { label: 'พัฒนาการความรู้', value: `+${formatScore(stats.knowledgeGain)}%` },
                  { label: 'คะแนนวิทยากร', value: `${formatScore((stats.avgTrainerScore / 5) * 100)}%` },
                  { label: 'ความพึงพอใจภาพรวม', value: `${formatScore(stats.overallSatisfaction)}%` },
                ].map((card) => (
                  <div
                    key={card.label}
                    className="rounded-2xl border border-amber-300/30 bg-gradient-to-br from-amber-500/20 to-orange-500/10 p-4"
                  >
                    <p className="text-xs text-amber-100/70">{card.label}</p>
                    <p className="mt-2 text-2xl font-black text-amber-50">{card.value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <h3 className="text-sm font-semibold text-amber-100">ความรู้ก่อน–หลังอบรม</h3>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                    <p className="text-xs text-amber-100/60">Pre</p>
                    <p className="mt-1 text-3xl font-black text-amber-50">{formatScore(stats.avgPreScore)}</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4">
                    <p className="text-xs text-emerald-200/80">Post</p>
                    <p className="mt-1 text-3xl font-black text-emerald-100">{formatScore(stats.avgPostScore)}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <h3 className="text-sm font-semibold text-amber-100">คะแนนเฉลี่ยรายด้าน</h3>
                <div className="mt-4 space-y-2 text-sm">
                  {[
                    { label: 'วิทยากร', value: stats.avgTrainerScore },
                    { label: 'เนื้อหา', value: stats.avgContentScore },
                    { label: 'สถานที่ / สิ่งอำนวยความสะดวก', value: stats.avgFacilityScore },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/25 px-3 py-2">
                      <span className="text-amber-100/80">{row.label}</span>
                      <span className="font-bold text-amber-50">{formatScore(row.value)} / 5</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-amber-50">ข้อเสนอแนะจากผู้เข้าอบรม</h3>
                <p className="mt-1 text-xs text-amber-100/60">
                  จากคอลัมน์ในไฟล์จริง · แสดงข้อความตามที่ผู้เข้าอบรมกรอก · ไม่ผ่าน AI
                </p>
              </div>

              {suggestions.length === 0 ? (
                <div className="rounded-xl border border-amber-300/30 bg-white/5 p-5 text-sm text-amber-100/80">
                  ไม่พบข้อความข้อเสนอแนะในไฟล์ (คอลัมน์หัวข้อที่อยากให้เพิ่มเติม)
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {suggestions.map((text, index) => (
                    <div
                      key={`suggestion-${index}`}
                      className="rounded-2xl border border-amber-300/40 bg-gradient-to-b from-white/5 via-amber-500/10 to-amber-500/5 p-4"
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-xs font-bold text-black">
                          {index + 1}
                        </span>
                        <p className="text-xs font-semibold text-amber-100/70">จากไฟล์</p>
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-amber-50/95">{text}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-amber-50">ความประทับใจผู้เข้าอบรม</h3>
                <p className="mt-1 text-xs text-amber-100/60">ข้อความดิบจากไฟล์ · ไม่แต่ง</p>
              </div>
              {impressions.length === 0 ? (
                <div className="rounded-xl border border-amber-300/30 bg-white/5 p-5 text-sm text-amber-100/80">
                  ไม่พบข้อความความประทับใจในไฟล์
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {impressions.map((text, index) => (
                    <div key={`impression-${index}`} className="rounded-2xl border border-amber-300/40 bg-white/5 p-4">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-amber-50/95">“{text}”</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="overflow-x-auto rounded-3xl border border-white/10 bg-white/5 p-5">
              <h3 className="mb-3 text-sm font-semibold text-amber-100">ข้อมูลข้อเสนอแนะจากผู้เข้าอบรม (จากไฟล์)</h3>
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead>
                  <tr className="bg-white/5 text-left text-amber-100/80">
                    <th className="border border-white/10 px-3 py-2">ชื่อองค์กร</th>
                    <th className="border border-white/10 px-3 py-2">อยากเรียนหลักสูตรไหนเพิ่มเติม</th>
                    <th className="border border-white/10 px-3 py-2">รู้สึกอย่างไรกับการเรียนครั้งนี้</th>
                    <th className="border border-white/10 px-3 py-2">หัวข้อที่อยากให้เพิ่ม/ลดเวลา</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((row) => (
                    <tr key={row.id} className="align-top">
                      <td className="border border-white/10 px-3 py-2 whitespace-pre-wrap">{row.organization || 'ไม่ระบุ'}</td>
                      <td className="border border-white/10 px-3 py-2 whitespace-pre-wrap">{row.comments.future || '-'}</td>
                      <td className="border border-white/10 px-3 py-2 whitespace-pre-wrap">{row.comments.feelings || '-'}</td>
                      <td className="border border-white/10 px-3 py-2 whitespace-pre-wrap">{row.comments.topics || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        )}
      </div>

      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" />
          <p className="font-bold text-amber-50">กำลังประมวลผลข้อมูล...</p>
        </div>
      )}
    </div>
  );
};

export default EvaOnePageSummaryPage;
