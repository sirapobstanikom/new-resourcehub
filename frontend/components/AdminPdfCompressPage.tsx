import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { jsPDF } from 'jspdf';

GlobalWorkerOptions.workerSrc = pdfWorker;

type QualityPreset = 'high' | 'medium' | 'low';

/** รองรับไฟล์ใหญ่ในเบราว์เซอร์ — เกินนี้มักติด RAM ของเครื่อง */
const MAX_FILE_BYTES = 500 * 1024 * 1024; // 500 MB
/** จำกัดความยาวด้านยาวสุดของ canvas เพื่อไม่ให้ memory ระเบิด */
const MAX_CANVAS_SIDE = 1800;

const PRESETS: Record<
  QualityPreset,
  { label: string; hint: string; scale: number; jpegQuality: number }
> = {
  high: {
    label: 'คุณภาพสูง',
    hint: 'เล็กลงเล็กน้อย ภาพยังคม',
    scale: 1.5,
    jpegQuality: 0.82,
  },
  medium: {
    label: 'สมดุล',
    hint: 'แนะนำ — เล็กลงชัด อ่านได้ดี',
    scale: 1.15,
    jpegQuality: 0.68,
  },
  low: {
    label: 'ขนาดเล็กสุด',
    hint: 'เล็กลงมาก ภาพอาจเบลอเล็กน้อย',
    scale: 0.9,
    jpegQuality: 0.52,
  },
};

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function resolveScale(baseScale: number, fileSize: number, pageCount: number): number {
  let scale = baseScale;
  // ไฟล์ใหญ่ / หน้าเยอะ → ลด scale อัตโนมัติเพื่อประหยัด RAM
  if (fileSize > 150 * 1024 * 1024) scale *= 0.75;
  else if (fileSize > 80 * 1024 * 1024) scale *= 0.85;
  if (pageCount > 300) scale *= 0.7;
  else if (pageCount > 150) scale *= 0.8;
  else if (pageCount > 80) scale *= 0.9;
  return Math.max(0.45, scale);
}

function clampViewportScale(
  pageWidth: number,
  pageHeight: number,
  desiredScale: number
): number {
  const w = pageWidth * desiredScale;
  const h = pageHeight * desiredScale;
  const longest = Math.max(w, h);
  if (longest <= MAX_CANVAS_SIDE) return desiredScale;
  return desiredScale * (MAX_CANVAS_SIDE / longest);
}

function canvasToJpegDataUrl(canvas: HTMLCanvasElement, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('แปลงหน้าเป็นภาพไม่สำเร็จ'));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('อ่านภาพไม่สำเร็จ'));
        reader.readAsDataURL(blob);
      },
      'image/jpeg',
      quality
    );
  });
}

export default function AdminPdfCompressPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preset, setPreset] = useState<QualityPreset>('medium');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [result, setResult] = useState<{
    blob: Blob;
    originalSize: number;
    compressedSize: number;
    pageCount: number;
    name: string;
  } | null>(null);

  const savedPercent = useMemo(() => {
    if (!result || result.originalSize <= 0) return 0;
    return Math.max(0, Math.round((1 - result.compressedSize / result.originalSize) * 100));
  }, [result]);

  const resetResult = () => setResult(null);

  const onPickFile = (next: File | null) => {
    setError(null);
    setHint(null);
    resetResult();
    if (!next) {
      setFile(null);
      return;
    }
    if (next.type !== 'application/pdf' && !next.name.toLowerCase().endsWith('.pdf')) {
      setError('กรุณาเลือกไฟล์ PDF เท่านั้น');
      setFile(null);
      return;
    }
    if (next.size > MAX_FILE_BYTES) {
      setError(`ไฟล์ใหญ่เกิน ${formatBytes(MAX_FILE_BYTES)} — กรุณาใช้ไฟล์ที่เล็กกว่า หรือแยกเล่ม`);
      setFile(null);
      return;
    }
    if (next.size > 100 * 1024 * 1024) {
      setHint('ไฟล์ค่อนข้างใหญ่ — แนะนำเลือกระดับ 「ขนาดเล็กสุด」 และอย่าปิดแท็บระหว่างประมวลผล');
    }
    setFile(next);
  };

  const compressPdf = useCallback(async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    resetResult();
    setProgress({ current: 0, total: 0 });

    const objectUrl = URL.createObjectURL(file);
    let pdf: Awaited<ReturnType<typeof getDocument>['promise']> | null = null;

    try {
      const settings = PRESETS[preset];
      pdf = await getDocument({
        url: objectUrl,
        disableAutoFetch: false,
        disableStream: false,
        // ช่วยกับไฟล์ใหญ่
        verbosity: 0,
      }).promise;

      const pageCount = pdf.numPages;
      if (pageCount > 800) {
        throw new Error('จำนวนหน้าเกิน 800 หน้า — กรุณาแยกไฟล์แล้วลดขนาดทีละส่วน');
      }

      const effectiveScale = resolveScale(settings.scale, file.size, pageCount);
      setProgress({ current: 0, total: pageCount });

      let doc: jsPDF | null = null;

      for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = clampViewportScale(baseViewport.width, baseViewport.height, effectiveScale);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.floor(viewport.width));
        canvas.height = Math.max(1, Math.floor(viewport.height));
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) throw new Error('ไม่สามารถสร้าง canvas ได้');

        await page.render({
          canvasContext: ctx,
          viewport,
          canvas,
        } as Parameters<typeof page.render>[0]).promise;

        const imgData = await canvasToJpegDataUrl(canvas, settings.jpegQuality);
        const widthPt = (canvas.width * 72) / 96;
        const heightPt = (canvas.height * 72) / 96;
        const orientation = widthPt >= heightPt ? 'landscape' : 'portrait';

        if (!doc) {
          doc = new jsPDF({
            orientation,
            unit: 'pt',
            format: [widthPt, heightPt],
            compress: true,
          });
        } else {
          doc.addPage([widthPt, heightPt], orientation);
        }

        doc.addImage(imgData, 'JPEG', 0, 0, widthPt, heightPt, undefined, 'FAST');

        // คืน memory ต่อหน้า
        canvas.width = 0;
        canvas.height = 0;
        try {
          page.cleanup?.();
        } catch {
          /* ignore */
        }
        setProgress({ current: pageNum, total: pageCount });

        // ให้ UI อัปเดต + GC มีโอกาสทำงานกับไฟล์ใหญ่
        await new Promise((r) => setTimeout(r, pageCount > 100 || file.size > 80 * 1024 * 1024 ? 16 : 0));
      }

      if (!doc) throw new Error('ไม่พบหน้าในไฟล์ PDF');

      const out = doc.output('blob');
      const baseName = file.name.replace(/\.pdf$/i, '') || 'document';
      setResult({
        blob: out,
        originalSize: file.size,
        compressedSize: out.size,
        pageCount,
        name: `${baseName}-compressed.pdf`,
      });
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : 'ลดขนาด PDF ไม่สำเร็จ';
      if (/memory|allocation|out of memory| QuotaExceeded/i.test(msg)) {
        setError('หน่วยความจำไม่พอสำหรับไฟล์นี้ — ลองระดับ 「ขนาดเล็กสุด」 หรือแยกไฟล์เป็นหลายเล่ม');
      } else {
        setError(msg);
      }
    } finally {
      try {
        await pdf?.destroy();
      } catch {
        /* ignore */
      }
      URL.revokeObjectURL(objectUrl);
      setBusy(false);
    }
  }, [file, preset]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 text-white">
      <div className="mb-6">
        <Link to="/admin" className="text-sm text-yellow-300 hover:text-yellow-200">
          ← กลับ Admin
        </Link>
        <h1 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight">ลดขนาดไฟล์ PDF</h1>
        <p className="mt-2 text-sm text-zinc-400">
          อัปโหลด PDF แล้วระบบจะเรนเดอร์หน้าใหม่เป็นภาพคุณภาพที่เลือก เพื่อลดขนาดไฟล์ จากนั้นดาวน์โหลดได้ทันที
          (ทำในเบราว์เซอร์ ไม่ส่งไฟล์ขึ้นเซิร์ฟเวอร์) รองรับสูงสุด {formatBytes(MAX_FILE_BYTES)} / ไม่เกิน 800 หน้า
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6 space-y-5">
        <div>
          <p className="text-sm font-semibold text-zinc-200 mb-2">1) เลือกไฟล์ PDF</p>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const dropped = e.dataTransfer.files?.[0] ?? null;
              onPickFile(dropped);
            }}
            disabled={busy}
            className="w-full rounded-xl border-2 border-dashed border-yellow-400/40 bg-black/30 px-4 py-8 text-center hover:bg-yellow-400/5 transition-colors disabled:opacity-50"
          >
            {file ? (
              <div className="space-y-1">
                <p className="font-semibold text-yellow-200 break-all">{file.name}</p>
                <p className="text-xs text-zinc-400">{formatBytes(file.size)}</p>
                <p className="text-xs text-zinc-500">คลิกเพื่อเปลี่ยนไฟล์</p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="font-semibold text-zinc-100">ลากหรือคลิกเพื่ออัปโหลด PDF</p>
                <p className="text-xs text-zinc-500">รองรับสูงสุด {formatBytes(MAX_FILE_BYTES)} · ไม่เกิน 800 หน้า</p>
              </div>
            )}
          </button>
          {hint ? (
            <p className="mt-2 text-xs text-amber-200/90 bg-amber-500/10 border border-amber-400/25 rounded-lg px-3 py-2">
              {hint}
            </p>
          ) : null}
        </div>

        <div>
          <p className="text-sm font-semibold text-zinc-200 mb-2">2) เลือกระดับการบีบอัด</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {(Object.keys(PRESETS) as QualityPreset[]).map((key) => {
              const p = PRESETS[key];
              const active = preset === key;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setPreset(key);
                    resetResult();
                  }}
                  className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                    active
                      ? 'border-yellow-400 bg-yellow-400/15 text-yellow-100'
                      : 'border-white/10 bg-black/20 text-zinc-300 hover:bg-white/5'
                  }`}
                >
                  <p className="text-sm font-bold">{p.label}</p>
                  <p className="text-[11px] mt-1 opacity-80">{p.hint}</p>
                </button>
              );
            })}
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <button
          type="button"
          disabled={!file || busy}
          onClick={() => void compressPdf()}
          className="w-full rounded-xl bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed text-black font-extrabold py-3.5 transition-colors"
        >
          {busy
            ? `กำลังลดขนาด... ${progress.current}/${progress.total || '?'}`
            : 'ลดขนาด PDF'}
        </button>

        {busy && progress.total > 0 ? (
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-yellow-400 transition-all"
              style={{ width: `${Math.round((progress.current / progress.total) * 100)}%` }}
            />
          </div>
        ) : null}

        {result ? (
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 space-y-3">
            <p className="font-bold text-emerald-200">ลดขนาดเสร็จแล้ว</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-black/30 border border-white/10 p-3">
                <p className="text-xs text-zinc-400">ขนาดเดิม</p>
                <p className="font-semibold text-white">{formatBytes(result.originalSize)}</p>
              </div>
              <div className="rounded-xl bg-black/30 border border-white/10 p-3">
                <p className="text-xs text-zinc-400">ขนาดใหม่</p>
                <p className="font-semibold text-emerald-200">{formatBytes(result.compressedSize)}</p>
              </div>
              <div className="rounded-xl bg-black/30 border border-white/10 p-3">
                <p className="text-xs text-zinc-400">จำนวนหน้า</p>
                <p className="font-semibold text-white">{result.pageCount}</p>
              </div>
              <div className="rounded-xl bg-black/30 border border-white/10 p-3">
                <p className="text-xs text-zinc-400">ลดลงประมาณ</p>
                <p className="font-semibold text-yellow-200">{savedPercent}%</p>
              </div>
            </div>
            {result.compressedSize >= result.originalSize ? (
              <p className="text-xs text-amber-200/90">
                ไฟล์ใหม่อาจไม่เล็กกว่าเดิม (PDF บางไฟล์บีบแล้วอยู่แล้ว) — ลองระดับ 「ขนาดเล็กสุด」
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => downloadBlob(result.blob, result.name)}
              className="w-full rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-extrabold py-3 transition-colors"
            >
              ดาวน์โหลด PDF ที่ลดขนาดแล้ว
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
