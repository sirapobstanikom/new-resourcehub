import React from 'react';
import { Link } from 'react-router-dom';

const KP_ARTWORK_URL =
  'https://axaasphuaaadzjoffznj.supabase.co/storage/v1/object/public/images/artwork.png';

const PILLARS = [
  { short: 'SE', label: 'Self Esteem' },
  { short: 'EM', label: 'Empathy' },
  { short: 'IN', label: 'Involvement' },
  { short: 'SU', label: 'Support' },
  { short: 'SH', label: 'Share' },
] as const;

export interface KeyPrinciplesLoginViewProps {
  name: string;
  company: string;
  onNameChange: (value: string) => void;
  onCompanyChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const KeyPrinciplesLoginView: React.FC<KeyPrinciplesLoginViewProps> = ({
  name,
  company,
  onNameChange,
  onCompanyChange,
  onSubmit,
}) => {
  const canSubmit = name.trim().length > 0 && company.trim().length > 0;

  return (
    <div className="w-full kp-fade-up">
      {/* Mobile: artwork hero on top */}
      <div className="lg:hidden relative -mx-4 sm:-mx-6 mb-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_100%,rgba(250,204,21,0.22),transparent_65%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0a0a]/40 to-[#0a0a0a]" />
        <div className="relative pt-6 pb-2 px-4 text-center">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 border border-yellow-400/30 text-[10px] uppercase tracking-widest text-yellow-400 font-semibold backdrop-blur-sm">
            MindDoJo Assessment
          </span>
          <h1 className="mt-4 text-2xl font-black text-white tracking-tight">Key Principles</h1>
        </div>
        <img
          src={KP_ARTWORK_URL}
          alt=""
          className="relative w-full max-w-md mx-auto h-auto min-h-[200px] max-h-[42vh] object-contain object-bottom drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)] kp-fade-up kp-delay-1"
          loading="eager"
          decoding="async"
        />
      </div>

      <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-0 lg:gap-10 xl:gap-14 items-stretch">
        {/* Desktop artwork — dominant visual */}
        <div className="hidden lg:flex relative flex-col justify-end min-h-[min(720px,85vh)] rounded-3xl overflow-hidden border border-yellow-400/15 bg-gradient-to-br from-yellow-400/12 via-[#121210] to-black shadow-2xl shadow-yellow-400/5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_80%,rgba(250,204,21,0.25),transparent_55%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.04),transparent_40%)]" />
          <div className="absolute top-8 left-8 right-8 z-10 text-left">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 border border-yellow-400/35 text-[10px] uppercase tracking-[0.18em] text-yellow-400 font-semibold backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" aria-hidden />
              แบบประเมินออนไลน์
            </span>
            <h1 className="mt-5 text-4xl xl:text-[2.75rem] font-black text-white leading-[1.1] tracking-tight">
              Key
              <br />
              <span className="text-yellow-400">Principles</span>
            </h1>
            <p className="mt-3 text-gray-400 text-sm max-w-xs leading-relaxed">
              25 ข้อ · สรุป 5 ด้าน · Feedback จาก AI
            </p>
            <div className="flex flex-wrap gap-2 mt-5">
              {PILLARS.map((p) => (
                <span
                  key={p.label}
                  className="text-[10px] font-bold px-2 py-1 rounded-md bg-yellow-400/10 border border-yellow-400/20 text-yellow-400/90"
                  title={p.label}
                >
                  {p.short}
                </span>
              ))}
            </div>
          </div>
          <img
            src={KP_ARTWORK_URL}
            alt="ทีมงาน MindDoJo — ความร่วมมือ การวางแผน และการพัฒนาองค์กร"
            className="relative w-full h-auto max-h-[min(520px,58vh)] object-contain object-bottom px-4 pb-2 kp-fade-up kp-delay-2 drop-shadow-[0_24px_48px_rgba(0,0,0,0.45)]"
            loading="eager"
            decoding="async"
          />
        </div>

        {/* Form column */}
        <div className="flex flex-col justify-center lg:py-6">
          {/* Mobile form overlaps artwork */}
          <div className="relative z-10 -mt-10 lg:mt-0 mx-auto w-full max-w-md lg:max-w-none">
            <div className="rounded-3xl border border-yellow-400/25 bg-[#0c0c0c]/95 lg:bg-gradient-to-b lg:from-white/[0.08] lg:to-black/50 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent opacity-80" />

              <div className="p-6 sm:p-8">
                <div className="lg:hidden mb-6 pb-6 border-b border-white/10">
                  <p className="text-gray-400 text-sm leading-relaxed">
                    สำรวจแนวโน้มการปฏิบัติตามหลักการสำคัญ — ใช้เวลา 8–12 นาที
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {PILLARS.map((p) => (
                      <span
                        key={p.label}
                        className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-white/5 text-gray-500 border border-white/10"
                      >
                        {p.label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="hidden lg:flex items-center gap-3 mb-7">
                  <div className="w-12 h-12 rounded-2xl bg-yellow-400 flex items-center justify-center shadow-lg shadow-yellow-400/30">
                    <span className="text-black font-black text-xl">M</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">ลงทะเบียน</h2>
                    <p className="text-xs text-gray-500 mt-0.5">กรอกข้อมูลแล้วเริ่มทำแบบประเมินได้ทันที</p>
                  </div>
                </div>

                <p className="lg:hidden text-lg font-bold text-white mb-1">ลงทะเบียนก่อนเริ่ม</p>
                <p className="lg:hidden text-xs text-gray-500 mb-5">ไม่ต้องใช้อีเมล · ใช้เวลา 8–12 นาที</p>

                <form onSubmit={onSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="kp-name" className="block text-sm font-medium text-gray-300 mb-2">
                      ชื่อ–นามสกุล
                    </label>
                    <input
                      id="kp-name"
                      type="text"
                      value={name}
                      onChange={(e) => onNameChange(e.target.value)}
                      placeholder="เช่น สมชาย ใจดี"
                      required
                      autoComplete="name"
                      className="w-full px-4 py-3.5 rounded-xl bg-black/70 border border-white/10 text-white text-base placeholder-gray-600 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/25 transition-all"
                    />
                  </div>
                  <div>
                    <label htmlFor="kp-company" className="block text-sm font-medium text-gray-300 mb-2">
                      บริษัท / องค์กร
                    </label>
                    <input
                      id="kp-company"
                      type="text"
                      value={company}
                      onChange={(e) => onCompanyChange(e.target.value)}
                      placeholder="ชื่อบริษัทหรือหน่วยงาน"
                      required
                      autoComplete="organization"
                      className="w-full px-4 py-3.5 rounded-xl bg-black/70 border border-white/10 text-white text-base placeholder-gray-600 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/25 transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="w-full py-4 rounded-xl font-bold text-base bg-yellow-400 text-black hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed shadow-xl shadow-yellow-400/30 hover:shadow-yellow-400/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                  >
                    เริ่มทำแบบประเมิน
                  </button>
                </form>

                <ul className="mt-6 space-y-2 text-[11px] text-gray-500">
                  <li className="flex items-center gap-2">
                    <span className="text-yellow-400/80">✓</span>
                    บันทึกผลอัตโนมัติหลังทำครบ
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-yellow-400/80">✓</span>
                    ดาวน์โหลด PNG / PDF และสรุปจาก AI
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-between mt-6 px-1">
              <Link
                to="/"
                className="text-sm text-gray-500 hover:text-yellow-400 transition-colors inline-flex items-center gap-1.5"
              >
                <span aria-hidden>←</span> กลับหน้าหลัก
              </Link>
              <span className="text-[10px] text-gray-600 uppercase tracking-wider">MindDoJo</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeyPrinciplesLoginView;
