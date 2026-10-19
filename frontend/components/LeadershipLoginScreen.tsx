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
    <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-gray-700 sm:text-sm">
      {label}
    </label>
    <div className="group relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#828282] transition-colors group-focus-within:text-[#FFCC00]">
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
        className="md-input py-2.5 pl-10 pr-3 text-sm sm:py-3"
      />
    </div>
  </div>
);

const LeadershipLoginScreen: React.FC<LeadershipLoginScreenProps> = ({ user, onChange, onSubmit }) => (
  <div className="md-page relative flex min-h-[100dvh] w-full flex-col overflow-hidden">
    <img
      src={RIBBON_BG}
      alt=""
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-[78%_center] lg:object-center"
    />
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#F3F2ED]/40 via-transparent to-[#F3F2ED]/90 lg:bg-gradient-to-r lg:from-[#F3F2ED]/80 lg:via-[#F3F2ED]/30 lg:to-[#F3F2ED]/70" />

    <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center gap-3 px-5 pt-5 sm:px-8 sm:pt-7 lg:px-12">
      <Link to="/" className="flex items-center">
        <BrandLogo className="text-[24px] sm:text-[26px]" tone="dark" />
      </Link>
      <span className="hidden h-5 w-px bg-gray-300 sm:block" />
      <span className="hidden text-[10px] font-medium uppercase tracking-[0.2em] text-gray-600 sm:block">
        World-Class Knowledge for Future Leaders
      </span>
    </header>

    <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-between gap-8 px-5 pb-6 pt-8 sm:px-8 sm:pt-12 lg:flex-row lg:items-center lg:gap-12 lg:px-12 lg:py-10">
      <section className="lg:flex-1">
        <h1
          className="text-[clamp(3rem,13vw,4.5rem)] font-extrabold uppercase leading-[0.95] tracking-tight sm:text-[clamp(4.5rem,13vw,7rem)] lg:text-[clamp(5rem,8vw,8.5rem)]"
          style={HEADLINE_FONT}
        >
          <span className="block text-gray-900">Lead</span>
          <span className="block text-gray-500">The</span>
          <span className="block" style={{ color: BRAND_YELLOW }}>
            Change
          </span>
        </h1>
        <div className="mt-5 h-0.5 w-12 sm:mt-7" style={{ backgroundColor: BRAND_YELLOW }} />
        <p
          className="mt-4 text-[10px] font-medium uppercase leading-relaxed tracking-[0.35em] text-gray-600 sm:text-xs"
          style={HEADLINE_FONT}
        >
          <span className="lg:hidden">
            Better · Leaders
            <br />
            Build · Brighter · Teams
          </span>
          <span className="hidden lg:inline">
            Better
            <br />
            Leaders
            <br />
            Build
            <br />
            Brighter
            <br />
            Teams
          </span>
        </p>
      </section>

      <section className="w-full lg:w-[400px] lg:shrink-0 xl:w-[420px]">
        <form
          onSubmit={onSubmit}
          className="md-card p-5 shadow-md sm:p-8"
        >
          <div className="mb-5 text-center sm:mb-6">
            <h2 className="text-2xl font-bold leading-tight text-gray-900 sm:text-3xl">
              แบบประเมิน
              <span className="block" style={{ color: BRAND_YELLOW }}>
                สมรรถนะภาวะผู้นำ
              </span>
            </h2>
            <p className="mt-2 text-xs text-gray-500 sm:text-sm">Dynamic Leadership Capability Wheel Self Assessment</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <Field
              id="lead-name"
              label="ชื่อ - นามสกุล"
              value={user.name}
              placeholder="กรอกชื่อ - นามสกุล"
              icon={<UserIcon />}
              autoComplete="name"
              onChange={(v) => onChange('name', v)}
            />
            <Field
              id="lead-email"
              label="Email"
              type="email"
              value={user.email}
              placeholder="name@company.com"
              icon={<MailIcon />}
              autoComplete="email"
              onChange={(v) => onChange('email', v)}
            />
            <div className="sm:col-span-2 lg:col-span-1">
              <Field
                id="lead-company"
                label="บริษัท"
                value={user.company}
                placeholder="กรอกชื่อบริษัท"
                icon={<BuildingIcon />}
                autoComplete="organization"
                onChange={(v) => onChange('company', v)}
              />
            </div>
          </div>

          <button
            type="submit"
            className="mt-6 w-full rounded-lg py-3 text-sm font-bold text-black shadow-lg shadow-[#FFCC00]/20 transition-all hover:brightness-105 active:scale-[0.99] sm:text-base"
            style={{ backgroundColor: BRAND_YELLOW }}
          >
            เข้าสู่แบบทดสอบ
          </button>
        </form>
        <p className="mt-4 text-center text-[11px] text-gray-500">© {new Date().getFullYear()} MindDojo Co., Ltd.</p>
      </section>
    </main>
  </div>
);

export default LeadershipLoginScreen;
