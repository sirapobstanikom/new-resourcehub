export const PRIZE_CATCH_BG_URL = '/images/prize-catch/bg-web.png';
export const PRIZE_CATCH_BGM_URL = '/audio/prize-catch/bgm.m4a';

/** Shared Tailwind class groups for the golden night-city theme */
export const PRIZE_CATCH_THEME = {
  pageOverlay: 'bg-black/40',
  glassPanel: 'rounded-2xl border border-amber-400/25 bg-black/55 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.45)]',
  glassPanelStrong: 'rounded-2xl border-2 border-amber-400/35 bg-black/65 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.55)]',
  labelGold: 'text-xs font-bold uppercase tracking-wide text-amber-300',
  textMuted: 'text-amber-100/65',
  textBody: 'text-amber-50/90',
  btnGhost: 'rounded-xl border border-amber-400/30 bg-black/45 px-3 py-2 text-xs font-bold text-amber-100 hover:bg-amber-400/10 disabled:opacity-50',
  btnPrimary:
    'rounded-xl border border-amber-200/40 bg-gradient-to-r from-amber-400 to-yellow-500 px-5 py-2 text-xs font-black text-black shadow-[0_0_18px_rgba(251,191,36,0.3)] hover:from-amber-300 hover:to-yellow-400',
  badgeGold: 'rounded-xl border border-amber-400/40 bg-amber-400/15 px-3 py-1.5 text-xs font-black text-amber-200',
  cardActive: 'border-amber-400 bg-amber-400/20 text-amber-100 shadow-[0_0_16px_rgba(251,191,36,0.2)]',
  cardNext: 'border-amber-300/50 bg-amber-500/10 text-amber-100',
  cardIdle: 'border-amber-900/60 bg-black/40 text-amber-100/50',
  stageFrame:
    'rounded-3xl border-4 border-amber-500/50 ring-4 ring-amber-400/20 shadow-[0_20px_60px_rgba(0,0,0,0.75),0_0_40px_rgba(251,191,36,0.12)]',
  stageFullscreen: 'fixed inset-0 z-50 rounded-none w-screen h-screen bg-black p-0 border-0 ring-0',
} as const;
