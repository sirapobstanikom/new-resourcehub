import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowRight,
  CheckCircle2,
  Download,
  FileImage,
  FileText,
  Handshake,
  Home,
  RefreshCw,
} from 'lucide-react';
import BrandLogo from '../BrandLogo';
import {
  PERSUASION_CHANNEL_DASHBOARD_LABELS,
  PERSUASION_CHANNEL_DESCRIPTIONS,
  PERSUASION_CHANNEL_LABELS,
  type PersuasionChannelId,
} from '../../data/persuasionData';

const CHANNEL_ORDER: PersuasionChannelId[] = [
  'authority',
  'logic',
  'vision',
  'relationship',
  'influence',
  'negotiation',
];

function scrollToDesc(e: React.MouseEvent) {
  e.preventDefault();
  const el = document.getElementById('persuasion-desc');
  if (!el) return;
  const startY = window.scrollY;
  const targetY = Math.max(0, el.getBoundingClientRect().top + window.scrollY - 96);
  const distance = targetY - startY;
  const duration = 1200;
  const start = performance.now();
  const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
  const step = (now: number) => {
    const p = Math.min(1, (now - start) / duration);
    window.scrollTo(0, startY + distance * ease(p));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export type PersuasionResultViewProps = {
  userName: string;
  scores: Record<PersuasionChannelId, number>;
  dominantChannels: PersuasionChannelId[];
  exportRef: React.RefObject<HTMLDivElement | null>;
  pdfLoading: boolean;
  pngLoading: boolean;
  onDownloadPdf: () => void;
  onDownloadPng: () => void;
  onRestart: () => void;
};

const PersuasionResultView: React.FC<PersuasionResultViewProps> = ({
  userName,
  scores,
  dominantChannels,
  exportRef,
  pdfLoading,
  pngLoading,
  onDownloadPdf,
  onDownloadPng,
  onRestart,
}) => {
  const totalScore = Math.max(
    1,
    CHANNEL_ORDER.reduce((sum, id) => sum + Math.max(Number(scores[id]) || 0, 0), 0),
  );
  const sorted = [...CHANNEL_ORDER]
    .map((id) => {
      const score = Math.max(Number(scores[id]) || 0, 0);
      const pct = Math.round((score / totalScore) * 100);
      return { id, score, pct };
    })
    .sort((a, b) => b.score - a.score || b.pct - a.pct);

  const top = sorted[0];
  const topId = dominantChannels[0] ?? top?.id ?? 'negotiation';
  const topScore = Math.max(Number(scores[topId]) || 0, 0);
  const topPct = Math.round((topScore / totalScore) * 100);
  const maxPct = Math.max(...sorted.map((s) => s.pct), 1);
  const initial = (userName.trim().charAt(0) || 'M').toUpperCase();

  return (
    <div className="min-h-dvh bg-[#F7F7F5] text-gray-900">
      <header className="border-b border-[#E5E4DE] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <Link to="/" className="flex items-center">
            <BrandLogo className="text-[24px]" tone="dark" />
          </Link>
          <p className="hidden items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-gray-600 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-[#FFCC00]" aria-hidden />
            Assessment &amp; Development
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-[10px] border border-[#C4C1B6] bg-white px-3.5 py-2 text-sm font-bold text-gray-800 transition hover:border-gray-500"
          >
            <Home className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            กลับหน้าแรก
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-5 pb-16 pt-8">
        <nav className="mb-4 text-sm font-medium text-gray-500">
          <Link to="/assessment/persuasion" className="hover:text-gray-800">
            แบบประเมิน
          </Link>
          <span className="mx-2 text-gray-400">›</span>
          <span className="font-semibold text-gray-800">ผลการประเมิน</span>
        </nav>

        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-gray-950 sm:text-3xl md:text-[2rem]">
              รู้จักสไตล์การโน้มน้าวใจของคุณ
            </h1>
            <p className="mt-1 text-sm font-semibold text-gray-600">6 Channel Persuasion Test</p>
          </div>
          <div className="flex items-center gap-3 rounded-[10px] border border-[#E5E4DE] bg-white px-3.5 py-2.5 shadow-sm">
            <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#FFCC00] text-sm font-black text-black">
              {initial}
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-gray-500">ผู้ทำแบบประเมิน</p>
              <p className="truncate text-sm font-extrabold text-gray-950">{userName || 'ผู้ประเมิน'}</p>
            </div>
          </div>
        </div>

        <div className="mb-6 border-b border-[#E5E4DE]">
          <div className="inline-flex border-b-2 border-[#FFCC00] pb-2.5 text-sm font-extrabold text-gray-950">
            ภาพรวมผลประเมิน
          </div>
        </div>

        <div ref={exportRef} className="space-y-6">
          <section className="rounded-[14px] border border-[#E5E4DE] bg-white p-4 shadow-sm sm:p-6">
            <div className="grid gap-5 lg:grid-cols-[0.95fr_1.35fr]">
              <aside className="relative flex flex-col rounded-[12px] bg-[#FFF6CC] p-5 sm:p-6">
                <div className="mb-5 flex items-start justify-between gap-3">
                  <p className="text-sm font-bold text-gray-800">ช่องทางที่คุณถนัดที่สุด</p>
                  <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#FFCC00] text-black shadow-sm">
                    <Handshake className="h-[18px] w-[18px]" strokeWidth={2.25} aria-hidden />
                  </span>
                </div>
                <h2 className="text-2xl font-black leading-tight text-gray-950 sm:text-3xl">
                  {PERSUASION_CHANNEL_DASHBOARD_LABELS[topId]}
                  <span className="mt-1 block text-lg font-extrabold text-gray-800 sm:text-xl">
                    {PERSUASION_CHANNEL_LABELS[topId]}
                  </span>
                </h2>
                <p className="mt-6 text-5xl font-black tabular-nums tracking-tight text-gray-950 sm:text-6xl">
                  {topPct}%
                </p>
                <p className="mt-2 text-sm font-medium text-gray-700">
                  สัดส่วนจากทั้งหมด 6 ช่องทาง · คะแนน {topScore}
                </p>
                <p className="mt-4 text-xs leading-relaxed text-gray-600">
                  Skill = สัดส่วนเปรียบเทียบกับช่องทางอื่น ไม่ใช่คะแนนเต็ม 100
                </p>
                <a
                  href="#persuasion-desc"
                  onClick={scrollToDesc}
                  className="mt-auto inline-flex items-center gap-1.5 pt-8 text-sm font-extrabold text-gray-900 transition hover:text-black"
                >
                  อ่านคำอธิบายผลด้านล่าง
                  <ArrowDown className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                </a>
              </aside>

              <div className="rounded-[12px] border border-[#E5E4DE] bg-white p-4 sm:p-5">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-extrabold text-gray-950">เปรียบเทียบทั้ง 6 ช่องทาง</h3>
                    <p className="mt-0.5 text-xs font-medium text-gray-500">
                      เรียงจากคะแนนสูงสุดไปต่ำสุด
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-[10px] border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                    <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                    ทำแบบประเมินเรียบร้อยแล้ว
                  </span>
                </div>

                <div className="space-y-2.5">
                  {sorted.map((row) => {
                    const isTop = row.id === topId || dominantChannels.includes(row.id);
                    const barPct = Math.max(8, Math.round((row.pct / maxPct) * 100));
                    return (
                      <div
                        key={row.id}
                        className={`rounded-[10px] px-3 py-2.5 ${
                          isTop ? 'bg-[#FFF6CC]' : 'bg-[#F7F7F5]'
                        }`}
                      >
                        <div className="mb-1.5 flex items-center justify-between gap-3">
                          <span className={`text-sm font-bold ${isTop ? 'text-gray-950' : 'text-gray-700'}`}>
                            {PERSUASION_CHANNEL_DASHBOARD_LABELS[row.id]}
                          </span>
                          <span className="shrink-0 text-xs font-bold tabular-nums text-gray-700">
                            <span className={isTop ? 'text-gray-950' : ''}>{row.pct}%</span>
                            <span className="mx-1.5 text-gray-400">·</span>
                            <span>คะแนน {row.score}</span>
                          </span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-[6px] bg-white/80 ring-1 ring-black/5">
                          <div
                            className="h-full rounded-[6px] transition-all duration-500"
                            style={{
                              width: `${barPct}%`,
                              backgroundColor: isTop ? '#FFCC00' : '#C8C5BA',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-[#EFEDE6] pt-3 text-[11px] font-semibold text-gray-500">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-[3px] bg-[#FFCC00]" aria-hidden />
                    ช่องทางที่มีคะแนนสูงสุด
                  </span>
                  <span className="tabular-nums">สเกลสัดส่วน 0–{Math.max(25, maxPct)}%</span>
                </div>
              </div>
            </div>
          </section>

          <section id="persuasion-desc" className="scroll-mt-24">
            <h2 className="mb-4 text-lg font-extrabold text-gray-950">ทำความเข้าใจผลของคุณ</h2>
            <div className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
              <article className="rounded-[12px] border border-[#E5E4DE] border-l-4 border-l-[#FFCC00] bg-white p-5 shadow-sm sm:p-6">
                <h3 className="text-base font-extrabold text-gray-950 sm:text-lg">
                  {PERSUASION_CHANNEL_LABELS[topId]} ({PERSUASION_CHANNEL_DASHBOARD_LABELS[topId]}{' '}
                  Persuasion)
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-700">
                  {PERSUASION_CHANNEL_DESCRIPTIONS[topId]}
                </p>
                {dominantChannels.length > 1 && (
                  <p className="mt-3 text-xs font-medium text-gray-500">
                    คุณอาจถนัดหลายรูปแบบ:{' '}
                    {dominantChannels.map((id) => PERSUASION_CHANNEL_LABELS[id]).join(' · ')}
                  </p>
                )}
              </article>

              <aside className="rounded-[12px] bg-[#FFF6CC] p-5 sm:p-6">
                <h3 className="text-sm font-extrabold text-gray-950">อ่านผลอย่างไร?</h3>
                <ul className="mt-3 space-y-3 text-sm leading-relaxed text-gray-700">
                  <li>
                    <span className="font-bold text-gray-900">เปอร์เซ็นต์</span> คือสัดส่วนเทียบกับอีก 5
                    ช่องทาง ไม่ใช่คะแนนเต็ม 100
                  </li>
                  <li>
                    <span className="font-bold text-gray-900">คะแนน</span> คือจำนวนข้อที่คุณเลือกเข้ากับช่องทางนั้น
                  </li>
                  <li>ช่องทางที่สูงสุดสะท้อนแนวโน้มธรรมชาติในการโน้มน้าวใจ ไม่ได้ตัดสินถูก–ผิด</li>
                </ul>
              </aside>
            </div>
          </section>
        </div>

        <section
          className="mt-6 flex flex-col gap-4 rounded-[12px] border border-[#E5E4DE] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5"
          data-no-capture="true"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-[#F3F2ED] text-gray-800">
              <FileText className="h-5 w-5" strokeWidth={2.25} aria-hidden />
            </span>
            <div>
              <p className="text-sm font-extrabold text-gray-950">เก็บผลลัพธ์ของคุณไว้</p>
              <p className="text-xs font-medium text-gray-600">
                ดาวน์โหลดผลประเมินเพื่อกลับมาทบทวนได้ภายหลัง
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={onDownloadPdf}
              disabled={pdfLoading}
              className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-[#FFCC00] px-5 py-2.5 text-sm font-bold text-black transition hover:bg-[#f0b800] disabled:opacity-50"
            >
              <Download className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              {pdfLoading ? 'กำลังสร้าง...' : 'โหลดเป็น PDF'}
            </button>
            <button
              type="button"
              onClick={onDownloadPng}
              disabled={pngLoading}
              className="inline-flex items-center justify-center gap-2 rounded-[10px] border border-[#C4C1B6] bg-white px-5 py-2.5 text-sm font-bold text-gray-900 transition hover:border-gray-500 disabled:opacity-50"
            >
              <FileImage className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              {pngLoading ? 'กำลังสร้าง...' : 'โหลดเป็น PNG'}
            </button>
          </div>
        </section>

        <section
          className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
          data-no-capture="true"
        >
          <div>
            <p className="text-base font-extrabold text-gray-950">อยากสำรวจตัวเองต่อ?</p>
            <p className="text-sm font-medium text-gray-600">ทำแบบประเมินอีกครั้ง หรือกลับไปเลือกเครื่องมืออื่น</p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={onRestart}
              className="inline-flex items-center justify-center gap-2 rounded-[10px] border border-[#C4C1B6] bg-white px-5 py-2.5 text-sm font-bold text-gray-900 transition hover:border-gray-500"
            >
              <RefreshCw className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              ทำแบบประเมินใหม่
            </button>
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 rounded-[10px] border border-[#C4C1B6] bg-white px-5 py-2.5 text-sm font-bold text-gray-900 transition hover:border-gray-500"
            >
              กลับหน้าแรก
              <ArrowRight className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#E5E4DE] bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-5 py-5 text-xs font-semibold text-gray-500 sm:flex-row">
          <span>© {new Date().getFullYear()} MindDoJo CO., LTD.</span>
          <span>6 Channel Persuasion Test</span>
        </div>
      </footer>
    </div>
  );
};

export default PersuasionResultView;
