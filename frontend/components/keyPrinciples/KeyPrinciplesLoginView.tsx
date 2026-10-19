import React from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from '../BrandLogo';

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
      <div className="lg:hidden relative -mx-4 sm:-mx-6 mb-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_100%,rgba(250,204,21,0.18),transparent_65%)]" />
        <div className="relative pt-6 pb-2 px-4 text-center">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-50 border border-yellow-200 text-[10px] uppercase tracking-widest text-yellow-800 font-semibold">
            MindDoJo Assessment
          </span>
          <h1 className="mt-4 text-2xl font-black text-gray-900 tracking-tight">Key Principles</h1>
        </div>
        <img
          src={KP_ARTWORK_URL}
          alt=""
          className="relative w-full max-w-md mx-auto h-auto min-h-[200px] max-h-[42vh] object-contain object-bottom kp-fade-up kp-delay-1"
          loading="eager"
          decoding="async"
        />
      </div>

      <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-0 lg:gap-10 xl:gap-14 items-stretch">
        <div className="hidden lg:flex relative flex-col justify-end min-h-[min(720px,85vh)] rounded-3xl overflow-hidden border border-yellow-200 bg-gradient-to-br from-yellow-50 via-white to-[#F3F2ED] shadow-md">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_80%,rgba(250,204,21,0.2),transparent_55%)]" />
          <div className="absolute top-8 left-8 right-8 z-10 text-left">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-50 border border-yellow-200 text-[10px] uppercase tracking-[0.18em] text-yellow-800 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FFCC00] animate-pulse" aria-hidden />
              แบบประเมินออนไลน์
            </span>
            <h1 className="mt-5 text-4xl xl:text-[2.75rem] font-black text-gray-900 leading-[1.1] tracking-tight">
              Key
              <br />
              <span className="text-[#FFCC00]">Principles</span>
            </h1>
            <p className="mt-3 text-gray-600 text-sm max-w-xs leading-relaxed">
              25 ข้อ · สรุป 5 ด้าน · Feedback จาก AI
            </p>
            <div className="flex flex-wrap gap-2 mt-5">
              {PILLARS.map((p) => (
                <span
                  key={p.label}
                  className="text-[10px] font-bold px-2 py-1 rounded-md bg-yellow-50 border border-yellow-200 text-yellow-800"
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
            className="relative w-full h-auto max-h-[min(520px,58vh)] object-contain object-bottom px-4 pb-2 kp-fade-up kp-delay-2"
            loading="eager"
            decoding="async"
          />
        </div>

        <div className="flex flex-col justify-center lg:py-6">
          <div className="relative z-10 -mt-10 lg:mt-0 mx-auto w-full max-w-md lg:max-w-none">
            <div className="md-card rounded-3xl overflow-hidden shadow-md">
              <div className="h-1 bg-gradient-to-r from-transparent via-[#FFCC00] to-transparent opacity-80" />

              <div className="p-6 sm:p-8">
                <div className="lg:hidden mb-6 pb-6 border-b border-gray-200">
                  <p className="text-gray-600 text-sm leading-relaxed">
                    สำรวจแนวโน้มการปฏิบัติตามหลักการสำคัญ — ใช้เวลา 8–12 นาที
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {PILLARS.map((p) => (
                      <span
                        key={p.label}
                        className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-gray-50 text-gray-600 border border-gray-200"
                      >
                        {p.label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="hidden lg:flex items-center gap-4 mb-7">
                  <BrandLogo className="text-[26px]" tone="dark" />
                  <span className="h-9 w-px bg-gray-200" aria-hidden />
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">ลงทะเบียน</h2>
                    <p className="text-xs text-gray-500 mt-0.5">กรอกข้อมูลแล้วเริ่มทำแบบประเมินได้ทันที</p>
                  </div>
                </div>

                <p className="lg:hidden text-lg font-bold text-gray-900 mb-1">ลงทะเบียนก่อนเริ่ม</p>
                <p className="lg:hidden text-xs text-gray-500 mb-5">ไม่ต้องใช้อีเมล · ใช้เวลา 8–12 นาที</p>

                <form onSubmit={onSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="kp-name" className="block text-sm font-medium text-gray-700 mb-2">
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
                      className="md-input py-3.5 text-base"
                    />
                  </div>
                  <div>
                    <label htmlFor="kp-company" className="block text-sm font-medium text-gray-700 mb-2">
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
                      className="md-input py-3.5 text-base"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="w-full py-4 rounded-xl font-bold text-base md-btn-primary disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                  >
                    เริ่มทำแบบประเมิน
                  </button>
                </form>

                <ul className="mt-6 space-y-2 text-[11px] text-gray-500">
                  <li className="flex items-center gap-2">
                    <span className="text-yellow-700">✓</span>
                    บันทึกผลอัตโนมัติหลังทำครบ
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-yellow-700">✓</span>
                    ดาวน์โหลด PNG / PDF และสรุปจาก AI
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-between mt-6 px-1">
              <Link
                to="/"
                className="text-sm text-gray-500 hover:text-yellow-700 transition-colors inline-flex items-center gap-1.5"
              >
                <span aria-hidden>←</span> กลับหน้าหลัก
              </Link>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">MindDoJo</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeyPrinciplesLoginView;
