import React from 'react';
import { Link } from 'react-router-dom';
import { KP_SCORE_BANDS, type KpBandId, type KpSectionId } from '../../data/keyPrinciplesData';

export type KpSectionResultItem = {
  section: { id: KpSectionId; titleEn: string; titleTh: string };
  sum: number;
  band: { id: KpBandId; min: number; max: number; meaningTh: string };
};

const BAND_LABEL: Record<KpBandId, string> = {
  develop: 'พื้นที่พัฒนา',
  growth: 'พัฒนาต่อได้',
  strength: 'จุดแข็ง',
};

const BAND_STYLES: Record<
  KpBandId,
  { badge: string; ring: string; cardBorder: string; glow: string }
> = {
  develop: {
    badge: 'bg-rose-500/20 text-rose-200 border-rose-400/35',
    ring: '#fb7185',
    cardBorder: 'border-rose-500/25',
    glow: 'shadow-rose-500/10',
  },
  growth: {
    badge: 'bg-amber-500/20 text-amber-100 border-amber-400/35',
    ring: '#fbbf24',
    cardBorder: 'border-amber-500/25',
    glow: 'shadow-amber-500/10',
  },
  strength: {
    badge: 'bg-emerald-500/20 text-emerald-100 border-emerald-400/35',
    ring: '#34d399',
    cardBorder: 'border-emerald-500/25',
    glow: 'shadow-emerald-500/10',
  },
};

const SECTION_META: Record<KpSectionId, { tagline: string; icon: string }> = {
  self_esteem: { tagline: 'เกียรติ · การยอมรับตนเองและผู้อื่น', icon: 'SE' },
  empathy: { tagline: 'การฟัง · เข้าใจความรู้สึก', icon: 'EM' },
  involvement: { tagline: 'การมีส่วนร่วม · เปิดโอกาส', icon: 'IN' },
  support: { tagline: 'การสนับสนุน · ช่วยโดยไม่แย่งงาน', icon: 'SU' },
  share: { tagline: 'การแบ่งปัน · สื่อสารอย่างเปิดเผย', icon: 'SH' },
};

const STAGGER = ['', 'kp-delay-1', 'kp-delay-2', 'kp-delay-3', 'kp-delay-4', 'kp-delay-5'] as const;

function ScoreRing({ score, color, delayClass }: { score: number; color: string; delayClass?: string }) {
  const pct = Math.min(100, Math.max(0, (score / 25) * 100));
  const r = 34;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <div className={`relative w-[4.75rem] h-[4.75rem] shrink-0 kp-fade-up ${delayClass ?? ''}`}>
      <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80" aria-hidden>
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeDasharray={c}
          strokeDashoffset={c}
          strokeLinecap="round"
          className="kp-ring-progress"
          style={
            {
              '--kp-ring-c': c,
              '--kp-ring-offset': offset,
            } as React.CSSProperties
          }
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-black text-white tabular-nums leading-none">{score}</span>
        <span className="text-[9px] text-gray-500 font-medium mt-0.5">/25</span>
      </div>
    </div>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'M';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export interface KeyPrinciplesResultViewProps {
  exportRef: React.RefObject<HTMLDivElement | null>;
  userName: string;
  userCompany: string;
  sectionResults: KpSectionResultItem[];
  aiFeedback: string | null;
  aiLoading: boolean;
  aiError: string | null;
  onRequestAi: () => void;
  pngLoading: boolean;
  pdfLoading: boolean;
  onDownloadPng: () => void;
  onDownloadPdf: () => void;
  onRestart: () => void;
}

const KeyPrinciplesResultView: React.FC<KeyPrinciplesResultViewProps> = ({
  exportRef,
  userName,
  userCompany,
  sectionResults,
  aiFeedback,
  aiLoading,
  aiError,
  onRequestAi,
  pngLoading,
  pdfLoading,
  onDownloadPng,
  onDownloadPdf,
  onRestart,
}) => {
  const strengthCount = sectionResults.filter((s) => s.band.id === 'strength').length;
  const growthCount = sectionResults.filter((s) => s.band.id === 'growth').length;
  const developCount = sectionResults.filter((s) => s.band.id === 'develop').length;
  const topSections = [...sectionResults].sort((a, b) => b.sum - a.sum).slice(0, 2);

  return (
    <div className="pb-28 sm:pb-12 max-w-2xl mx-auto kp-fade-up">
      <div ref={exportRef} className="space-y-8">
        {/* Hero */}
        <div className="kp-shimmer-wrap relative overflow-hidden rounded-3xl border border-yellow-400/25 bg-gradient-to-br from-yellow-400/12 via-white/[0.05] to-black/50 p-6 md:p-8 kp-scale-in shadow-xl shadow-black/30">
          <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-yellow-400/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-12 w-48 h-48 rounded-full bg-white/5 blur-3xl pointer-events-none" />

          <div className="relative flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-start gap-5">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-300 to-yellow-500 flex items-center justify-center shrink-0 shadow-lg shadow-yellow-400/30 ring-2 ring-yellow-400/40">
                  <span className="text-xl font-black text-black tracking-tight">{getInitials(userName)}</span>
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-yellow-400 font-semibold mb-1.5">
                    Key Principles
                  </p>
                  <h1 className="text-2xl md:text-[1.65rem] font-black text-white leading-tight">{userName}</h1>
                  <p className="text-sm text-gray-400 mt-1">{userCompany}</p>
                </div>
              </div>

              {(strengthCount > 0 || growthCount > 0 || developCount > 0) && (
                <div className="flex flex-wrap gap-2 sm:justify-end sm:max-w-[220px]">
                  {strengthCount > 0 && (
                    <span className="kp-fade-up kp-delay-1 text-[11px] font-semibold px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-200 border border-emerald-400/30">
                      ✓ จุดแข็ง {strengthCount}
                    </span>
                  )}
                  {growthCount > 0 && (
                    <span className="kp-fade-up kp-delay-2 text-[11px] font-semibold px-3 py-1.5 rounded-full bg-amber-500/15 text-amber-100 border border-amber-400/30">
                      ↑ พัฒนาต่อ {growthCount}
                    </span>
                  )}
                  {developCount > 0 && (
                    <span className="kp-fade-up kp-delay-3 text-[11px] font-semibold px-3 py-1.5 rounded-full bg-rose-500/15 text-rose-200 border border-rose-400/30">
                      ◎ โฟกัสพัฒนา {developCount}
                    </span>
                  )}
                </div>
              )}
            </div>

            {topSections.length > 0 && (
              <p className="relative pt-4 border-t border-white/10 text-sm text-gray-400 text-left leading-relaxed kp-fade-up kp-delay-2">
                สะท้อนชัดในด้าน{' '}
                <span className="text-yellow-400/95 font-semibold">
                  {topSections.map((s) => s.section.titleEn).join(' · ')}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* 5 dimensions */}
        <section className="kp-fade-up kp-delay-2">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-yellow-400/40 to-transparent" />
            <div className="text-center shrink-0 px-2">
              <h2 className="text-sm font-bold text-white tracking-wide">ผลแต่ละส่วน</h2>
              <p className="text-[11px] text-gray-500 mt-0.5">คะแนน 5–25 ต่อหลักการ</p>
            </div>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent via-yellow-400/40 to-transparent" />
          </div>

          <div className="grid gap-4">
            {sectionResults.map(({ section, sum, band }, index) => {
              const meta = SECTION_META[section.id];
              const styles = BAND_STYLES[band.id];
              const stagger = STAGGER[Math.min(index + 1, STAGGER.length - 1)];
              return (
                <article
                  key={section.id}
                  className={`kp-fade-up ${stagger} group rounded-2xl border bg-gradient-to-br from-white/[0.05] to-transparent p-4 md:p-5 shadow-lg transition-all duration-300 hover:scale-[1.01] hover:border-white/20 ${styles.cardBorder} ${styles.glow}`}
                >
                  <div className="flex gap-4 md:gap-5 items-start">
                    <ScoreRing score={sum} color={styles.ring} delayClass={stagger} />
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 mb-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-[10px] font-black text-yellow-400 bg-yellow-400/15 border border-yellow-400/25 w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
                            {meta.icon}
                          </span>
                          <div className="min-w-0">
                            <h3 className="font-bold text-white text-base leading-tight">{section.titleEn}</h3>
                            <p className="text-[11px] text-gray-500 mt-0.5">{meta.tagline}</p>
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-3 py-1 rounded-full border shrink-0 ${styles.badge}`}
                        >
                          {BAND_LABEL[band.id]}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300/95 leading-relaxed">
                        {band.meaningTh}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* AI */}
        <section className="kp-fade-up kp-delay-5 relative rounded-2xl border border-yellow-400/35 bg-gradient-to-br from-yellow-400/10 via-black/20 to-transparent p-5 md:p-6 space-y-4 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-yellow-400/25 border border-yellow-400/40 flex items-center justify-center shrink-0 text-lg shadow-inner">
              ✨
            </div>
            <div>
              <h2 className="text-base font-bold text-white">สรุป Feedback จาก AI</h2>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed max-w-md">
                วิเคราะห์ว่าคำพูดของคุณสร้างหรือทำลาย 5 ด้านการสื่อสารในผู้อื่นมากน้อแค่ไหน
              </p>
            </div>
          </div>

          {aiLoading && (
            <div className="relative flex items-center gap-3 rounded-xl bg-black/40 border border-white/10 px-4 py-5 text-gray-400">
              <div
                className="w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin shrink-0"
                aria-hidden
              />
              <div className="space-y-1">
                <span className="text-sm text-white font-medium block">กำลังสร้างสรุปให้คุณ</span>
                <span className="text-xs text-gray-500">ใช้เวลาสักครู่...</span>
              </div>
            </div>
          )}

          {!aiLoading && aiFeedback && (
            <div className="kp-fade-up rounded-xl bg-black/40 border border-white/10 px-4 py-4 md:px-5 md:py-5">
              <div className="whitespace-pre-wrap text-gray-200 text-sm leading-relaxed">{aiFeedback}</div>
            </div>
          )}

          {!aiLoading && aiError && (
            <p className="text-sm text-rose-300/90 rounded-xl bg-rose-500/10 border border-rose-400/20 px-4 py-3 kp-fade-up">
              {aiError}
            </p>
          )}

          {!aiLoading && (
            <button
              type="button"
              onClick={onRequestAi}
              className="exclude-from-export relative w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold bg-yellow-400 text-black hover:bg-yellow-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-yellow-400/25 transition-all duration-200"
            >
              {aiFeedback ? '↻ สร้างสรุปใหม่' : 'รับสรุป Feedback จาก AI'}
            </button>
          )}
        </section>

        {/* Criteria */}
        <details className="kp-fade-up kp-delay-6 group rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden transition-colors hover:border-white/15">
          <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-center justify-between gap-3 px-5 py-4 text-sm font-semibold text-gray-400 hover:text-gray-200 transition-colors">
            <span>เกณฑ์การแปลผล</span>
            <span
              className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-gray-500 group-open:rotate-180 transition-transform duration-300"
              aria-hidden
            >
              ▼
            </span>
          </summary>
          <div className="px-5 pb-5 space-y-3 border-t border-white/10 pt-4">
            {KP_SCORE_BANDS.map((b) => (
              <div key={b.id} className="flex gap-3 text-xs text-gray-400">
                <span
                  className={`shrink-0 tabular-nums font-bold min-w-[3.25rem] px-2 py-1 rounded-lg text-center ${BAND_STYLES[b.id].badge}`}
                >
                  {b.min}–{b.max}
                </span>
                <span className="leading-relaxed pt-0.5">{b.meaningTh}</span>
              </div>
            ))}
          </div>
        </details>

        <p className="text-center text-[10px] text-gray-600 tracking-wide kp-fade-up kp-delay-7">
          MindDoJo · Key Principles Assessment
        </p>
      </div>

      {/* Desktop actions */}
      <div className="hidden sm:flex flex-wrap gap-3 justify-center mt-10 kp-fade-up kp-delay-7">
        <ActionButtons
          pngLoading={pngLoading}
          pdfLoading={pdfLoading}
          onDownloadPng={onDownloadPng}
          onDownloadPdf={onDownloadPdf}
          onRestart={onRestart}
        />
      </div>

      {/* Mobile sticky bar */}
      <div className="kp-mobile-bar sm:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-yellow-400/20 bg-[#080808]/95 backdrop-blur-xl px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="max-w-2xl mx-auto flex gap-2">
          <button
            type="button"
            onClick={onDownloadPng}
            disabled={pngLoading}
            className="flex-1 py-3 rounded-xl text-xs font-bold border border-yellow-400/40 text-yellow-200 disabled:opacity-50 active:scale-95 transition-transform"
          >
            {pngLoading ? '…' : 'PNG'}
          </button>
          <button
            type="button"
            onClick={onDownloadPdf}
            disabled={pdfLoading}
            className="flex-1 py-3 rounded-xl text-xs font-bold border border-yellow-400/40 text-yellow-200 disabled:opacity-50 active:scale-95 transition-transform"
          >
            {pdfLoading ? '…' : 'PDF'}
          </button>
          <Link
            to="/"
            className="flex-1 py-3 rounded-xl text-xs font-bold bg-yellow-400 text-black text-center active:scale-95 transition-transform"
          >
            หน้าหลัก
          </Link>
        </div>
      </div>
    </div>
  );
};

function ActionButtons({
  pngLoading,
  pdfLoading,
  onDownloadPng,
  onDownloadPdf,
  onRestart,
}: {
  pngLoading: boolean;
  pdfLoading: boolean;
  onDownloadPng: () => void;
  onDownloadPdf: () => void;
  onRestart: () => void;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onDownloadPng}
        disabled={pngLoading}
        className="px-5 py-3 rounded-xl font-bold border border-white/15 text-gray-200 hover:bg-white/8 hover:border-yellow-400/30 disabled:opacity-50 transition-all duration-200 inline-flex items-center gap-2 text-sm hover:scale-[1.02] active:scale-[0.98]"
      >
        {pngLoading ? <Spinner /> : <span aria-hidden>🖼</span>}
        ดาวน์โหลด PNG
      </button>
      <button
        type="button"
        onClick={onDownloadPdf}
        disabled={pdfLoading}
        className="px-5 py-3 rounded-xl font-bold border border-white/15 text-gray-200 hover:bg-white/8 hover:border-yellow-400/30 disabled:opacity-50 transition-all duration-200 inline-flex items-center gap-2 text-sm hover:scale-[1.02] active:scale-[0.98]"
      >
        {pdfLoading ? <Spinner /> : <span aria-hidden>📄</span>}
        ดาวน์โหลด PDF
      </button>
      <button
        type="button"
        onClick={onRestart}
        className="px-5 py-3 rounded-xl font-bold border border-white/15 text-gray-400 hover:bg-white/5 hover:text-gray-200 transition-all duration-200 text-sm"
      >
        ทำใหม่
      </button>
      <Link
        to="/"
        className="px-5 py-3 rounded-xl font-bold bg-yellow-400 text-black hover:bg-yellow-300 transition-all duration-200 text-sm hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-yellow-400/20"
      >
        กลับหน้าหลัก
      </Link>
    </>
  );
}

function Spinner() {
  return (
    <span
      className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin shrink-0"
      aria-hidden
    />
  );
}

export default KeyPrinciplesResultView;
