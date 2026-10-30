import React from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import {
  LEADERSHIP_HEADLINE_FONT as HEADLINE_FONT,
  LEADERSHIP_RIBBON_BG as RIBBON_BG,
  LEADERSHIP_YELLOW as BRAND_YELLOW,
} from '../lib/leadershipTheme';

type LoginUser = { name: string; email: string; company: string };

interface LeadershipLoginScreenProps {
  user: LoginUser;
  onChange: (field: keyof LoginUser, value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
    <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.42 0-8 2.24-8 5v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1c0-2.76-3.58-5-8-5Z" />
  </svg>
);

const MailIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
    <path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm1 2.4V17h16V7.4l-8 5.33L4 7.4ZM5.8 7 12 11.13 18.2 7H5.8Z" />
  </svg>
);

const BuildingIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
    <path d="M4 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v5h3a1 1 0 0 1 1 1v11h1v2H3v-2h1Zm2 0h3v-3h2v3h3V5H6v16Zm10 0h2v-9h-2v9ZM8 7h2v2H8V7Zm4 0h2v2h-2V7Zm-4 4h2v2H8v-2Zm4 0h2v2h-2v-2Z" />
  </svg>
);

interface FieldProps {
  id: string;
  label: string;
  type?: string;
  value: string;
  placeholder: string;
  icon: React.ReactNode;
  autoComplete?: string;
  onChange: (value: string) => void;
}

const Field: React.FC<FieldProps> = ({ id, label, type = 'text', value, placeholder, icon, autoComplete, onChange }) => (
  <div>
    <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-gray-800">
      {label}
    </label>
    <div className="group relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-[#C9A000]">
        {icon}
      </span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        className="w-full rounded-xl border border-[#E5E2DA] bg-[#F7F6F2] py-3 pl-10 pr-3 text-[15px] text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#FFCC00] focus:bg-white focus:ring-4 focus:ring-[#FFCC00]/20"
      />
    </div>
  </div>
);

const LeadershipLoginScreen: React.FC<LeadershipLoginScreenProps> = ({ user, onChange, onSubmit }) => (
  <div className="relative flex min-h-[100dvh] w-full flex-col overflow-x-hidden bg-transparent text-gray-900">
    <img
      src={RIBBON_BG}
      alt=""
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-[70%_center] lg:object-[60%_center]"
    />

    <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center gap-3 px-4 pt-4 sm:px-6 sm:pt-5 lg:px-8">
      <Link to="/" className="flex items-center">
        <BrandLogo className="text-[24px] sm:text-[26px]" tone="dark" />
      </Link>
      <span className="hidden h-5 w-px bg-black/15 sm:block" />
      <span
        className="hidden text-[10px] font-medium uppercase tracking-[0.18em] text-gray-600 sm:block"
        style={HEADLINE_FONT}
      >
        World Class Knowledge in Fun Workshop
      </span>
    </header>

    <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 pb-8 pt-10 sm:px-6 sm:pt-12 lg:flex-row lg:items-start lg:justify-between lg:gap-12 lg:px-8 lg:pb-12 lg:pt-16">
      <section className="max-w-xl lg:flex-1">
        <p
          className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500 sm:mb-4 sm:text-xs"
          style={HEADLINE_FONT}
        >
          Leadership Self-Assessment
        </p>
        <h1
          className="text-[clamp(3.4rem,12vw,6.5rem)] font-extrabold uppercase leading-[0.9] tracking-tight sm:text-[clamp(4.8rem,9vw,7.5rem)]"
          style={HEADLINE_FONT}
        >
          <span
            className="block text-gray-950"
            style={{
              textShadow:
                '0 1px 0 #fff, 0 0 2px rgba(255,255,255,0.95), 0 2px 4px rgba(255,255,255,0.9), 0 6px 18px rgba(255,255,255,0.75), 0 10px 28px rgba(15,23,42,0.22)',
            }}
          >
            Lead The
          </span>
          <span
            className="block"
            style={{
              color: BRAND_YELLOW,
              WebkitTextStroke: '1px rgba(120,90,0,0.28)',
              textShadow:
                '0 1px 0 rgba(255,255,255,0.95), 0 0 3px rgba(255,255,255,0.85), 0 4px 14px rgba(255,255,255,0.7), 0 8px 22px rgba(15,23,42,0.25), 0 2px 0 rgba(180,130,0,0.35)',
            }}
          >
            Change
          </span>
        </h1>
        <div className="mt-6 max-w-lg space-y-1.5 rounded-2xl bg-white/55 px-3 py-2.5 backdrop-blur-[2px] sm:mt-8 sm:px-4 sm:py-3">
          <p className="text-xl font-bold leading-snug text-gray-950 sm:text-2xl md:text-[1.75rem]">
            รู้จักศักยภาพผู้นำของคุณ
          </p>
          <p className="text-[15px] leading-relaxed text-gray-800 sm:text-base">
            เพื่อพัฒนาตัวเองและสร้างทีมที่เติบโตด้วยกัน
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-md lg:mx-0 lg:w-[400px] lg:shrink-0 xl:w-[420px]">
        <form
          onSubmit={onSubmit}
          className="rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.12)] backdrop-blur-sm sm:p-8"
        >
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold leading-tight text-gray-950 sm:text-[1.75rem]">
              แบบประเมิน
              <span className="block" style={{ color: BRAND_YELLOW }}>
                สมรรถนะภาวะผู้นำ
              </span>
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-gray-500 sm:text-sm">
              Dynamic Leadership Capability Wheel Self Assessment
            </p>
          </div>

          <div className="grid gap-4">
            <Field
              id="lead-name"
              label="ชื่อ - นามสกุล"
              value={user.name}
              placeholder="กรอกชื่อ-นามสกุล"
              icon={<UserIcon />}
              autoComplete="name"
              onChange={(v) => onChange('name', v)}
            />
            <Field
              id="lead-email"
              label="อีเมล"
              type="email"
              value={user.email}
              placeholder="กรอกอีเมล"
              icon={<MailIcon />}
              autoComplete="email"
              onChange={(v) => onChange('email', v)}
            />
            <Field
              id="lead-company"
              label="บริษัท / องค์กร"
              value={user.company}
              placeholder="กรอกชื่อบริษัทหรือองค์กร"
              icon={<BuildingIcon />}
              autoComplete="organization"
              onChange={(v) => onChange('company', v)}
            />
          </div>

          <button
            type="submit"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-base font-bold text-black shadow-[0_4px_0_#E0A800] transition hover:brightness-105 active:translate-y-0.5 active:shadow-[0_2px_0_#E0A800]"
            style={{ backgroundColor: BRAND_YELLOW }}
          >
            เริ่มทำแบบประเมิน
            <span aria-hidden>→</span>
          </button>
          <p className="mt-3 text-center text-[11px] leading-relaxed text-gray-400">
            ข้อมูลใช้แสดงในหน้าผลลัพธ์เท่านั้น · ไม่แชร์ต่อโดยไม่ได้รับอนุญาต
          </p>
        </form>
      </section>
    </main>

    <p className="relative z-10 px-5 pb-5 text-center text-[11px] text-gray-500 sm:px-8 lg:absolute lg:bottom-5 lg:right-8 lg:px-0 lg:pb-0 lg:text-right">
      © {new Date().getFullYear()} MindDojo Co., Ltd.
    </p>
  </div>
);

export default LeadershipLoginScreen;
