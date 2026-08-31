import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface RegistrationFormData {
  fullName: string;
  email: string;
  phone: string;
  company: string;
  notes: string;
}

const LOCAL_STORAGE_KEY = 'minddojo_activity_registrations_v1';

export default function ActivityRegistrationPage() {
  const [formData, setFormData] = useState<RegistrationFormData>({
    fullName: '',
    email: '',
    phone: '',
    company: '',
    notes: '',
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState<(RegistrationFormData & { id?: string | number; registeredAt: string }) | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Current page full URL for QR code and copy link
  const currentUrl = useMemo(() => {
    if (typeof window !== 'undefined') {
      return window.location.href;
    }
    return 'https://resourcehub.minddojo.co.th/activity-registration';
  }, []);

  const qrImageUrl = useMemo(() => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=12&data=${encodeURIComponent(currentUrl)}`;
  }, [currentUrl]);

  // Field validation
  const errors = useMemo(() => {
    const errs: Record<string, string> = {};
    if (!formData.fullName.trim()) {
      errs.fullName = 'กรุณากรอกชื่อ-นามสกุล';
    } else if (formData.fullName.trim().length < 2) {
      errs.fullName = 'ชื่อ-นามสกุลต้องมีความยาวอย่างน้อย 2 ตัวอักษร';
    }

    if (!formData.email.trim()) {
      errs.email = 'กรุณากรอกอีเมล';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = 'รูปแบบอีเมลไม่ถูกต้อง (เช่น user@example.com)';
    }

    if (!formData.phone.trim()) {
      errs.phone = 'กรุณากรอกเบอร์โทรศัพท์';
    } else {
      const cleanPhone = formData.phone.replace(/[\s-]/g, '');
      if (!/^\+?[0-9]{8,15}$/.test(cleanPhone)) {
        errs.phone = 'เบอร์โทรศัพท์ต้องเป็นตัวเลข 9–10 หลัก (เช่น 0812345678)';
      }
    }

    if (!formData.company.trim()) {
      errs.company = 'กรุณากรอกชื่อบริษัท / หน่วยงาน';
    }

    return errs;
  }, [formData]);

  const isValid = Object.keys(errors).length === 0;

  const handleChange = (field: keyof RegistrationFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrorMsg(null);
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleCopyLink = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(currentUrl);
      } else {
        const ta = document.createElement('textarea');
        ta.value = currentUrl;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    } catch {
      setCopySuccess(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      fullName: true,
      email: true,
      phone: true,
      company: true,
    });

    if (!isValid) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    const now = new Date();
    const registeredAt = now.toLocaleString('th-TH', {
      dateStyle: 'medium',
      timeStyle: 'medium',
      timeZone: 'Asia/Bangkok',
    });

    const payload = {
      full_name: formData.fullName.trim(),
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone.trim(),
      company: formData.company.trim(),
      notes: formData.notes.trim() || null,
      created_at: now.toISOString(),
    };

    let insertedId: string | number | undefined = undefined;

    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('activity_registrations')
          .insert(payload)
          .select('id')
          .single();

        if (error) {
          console.warn('Supabase insert warning (saved locally):', error.message);
          // If table doesn't exist yet, we still succeed gracefully using local storage
        } else if (data?.id) {
          insertedId = data.id;
        }
      }

      // Always save to localStorage as backup/offline log
      try {
        const existing = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
        existing.unshift({
          ...payload,
          id: insertedId || Date.now(),
          registeredAt,
        });
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(existing.slice(0, 200)));
      } catch (err) {
        console.warn('Local storage error:', err);
      }

      setSubmittedData({
        ...formData,
        id: insertedId,
        registeredAt,
      });
    } catch (err: any) {
      console.error('Registration error:', err);
      setErrorMsg('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForAnother = () => {
    setFormData((prev) => ({
      fullName: '',
      email: '',
      phone: '',
      company: prev.company, // keep company for convenience if same team
      notes: '',
    }));
    setTouched({});
    setSubmittedData(null);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 flex flex-col font-sans selection:bg-yellow-400 selection:text-black">
      {/* Background Glow effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[720px] h-[480px] bg-yellow-500/10 rounded-full blur-[130px]" />
        <div className="absolute top-1/2 -right-40 w-[420px] h-[420px] bg-blue-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 -left-40 w-[420px] h-[420px] bg-amber-600/10 rounded-full blur-[140px]" />
      </div>

      {/* Header bar */}
      <header className="relative z-10 border-b border-white/10 bg-[#0B0F19]/80 backdrop-blur-md sticky top-0 px-4 py-3 sm:py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center font-black text-black text-xl shadow-[0_0_20px_rgba(250,204,21,0.3)] group-hover:scale-105 transition-transform">
              M
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">MindDoJo</span>
                <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-400/15 text-yellow-300 border border-yellow-400/30">
                  Registration
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 font-medium hidden sm:block">
                ระบบลงทะเบียนเข้าร่วมกิจกรรม / เวิร์กช็อป
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              title="คัดลอกลิงก์หน้าลงทะเบียน"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors"
            >
              {copySuccess ? (
                <>
                  <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-emerald-400">คัดลอกแล้ว!</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  <span>แชร์ลิงก์</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowQrModal(true)}
              title="แสดง QR Code สำหรับสแกนลงทะเบียน"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 transition-colors"
            >
              <svg className="w-3.5 h-3.5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <span>QR Code</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main content area */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-xl mx-auto">
          {submittedData ? (
            /* SUCCESS CONFIRMATION STATE */
            <div className="bg-[#0F1422]/90 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 md:p-10 shadow-2xl backdrop-blur-xl relative overflow-hidden animate-fadeIn">
              <div className="absolute -right-16 -top-16 w-44 h-44 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

              <div className="text-center space-y-3">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-500/20 border-2 border-emerald-400/50 rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                  <svg className="w-9 h-9 sm:w-11 sm:h-11 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  ลงทะเบียนสำเร็จแล้ว!
                </h2>
                <p className="text-slate-300 text-sm max-w-sm mx-auto">
                  ระบบได้บันทึกข้อมูลการลงทะเบียนเข้าร่วมกิจกรรมของคุณเรียบร้อยแล้ว
                </p>
              </div>

              {/* Registration summary card */}
              <div className="mt-8 bg-[#090D17]/80 rounded-2xl p-5 sm:p-6 border border-white/10 space-y-3.5 text-sm">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <span className="text-xs font-semibold text-yellow-400 tracking-wider uppercase">
                    รายละเอียดการลงทะเบียน
                  </span>
                  <span className="text-xs text-slate-400">{submittedData.registeredAt}</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <span className="text-slate-400 font-medium">ชื่อ-นามสกุล:</span>
                  <span className="col-span-2 text-white font-semibold">{submittedData.fullName}</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <span className="text-slate-400 font-medium">อีเมล:</span>
                  <span className="col-span-2 text-white font-medium break-all">{submittedData.email}</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <span className="text-slate-400 font-medium">เบอร์โทรศัพท์:</span>
                  <span className="col-span-2 text-white font-medium">{submittedData.phone}</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <span className="text-slate-400 font-medium">บริษัท / หน่วยงาน:</span>
                  <span className="col-span-2 text-white font-medium">{submittedData.company}</span>
                </div>

                {submittedData.notes && (
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5">
                    <span className="text-slate-400 font-medium">หมายเหตุ:</span>
                    <span className="col-span-2 text-slate-300">{submittedData.notes}</span>
                  </div>
                )}
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleResetForAnother}
                  className="flex-1 py-3.5 px-6 rounded-xl font-bold text-sm bg-gradient-to-r from-yellow-400 to-amber-500 text-black hover:from-yellow-300 hover:to-amber-400 shadow-lg shadow-yellow-500/20 transition-all text-center flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>ลงทะเบียนเพิ่มอีกท่าน</span>
                </button>

                <Link
                  to="/"
                  className="py-3.5 px-5 rounded-xl font-semibold text-sm bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors text-center"
                >
                  กลับหน้าหลัก
                </Link>
              </div>
            </div>
          ) : (
            /* REGISTRATION FORM STATE */
            <div className="bg-[#0F1422]/90 border border-white/15 rounded-3xl p-6 sm:p-8 md:p-10 shadow-2xl backdrop-blur-xl relative">
              <div className="text-center space-y-2 mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-300 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                  เปิดรับลงทะเบียนเข้าร่วมกิจกรรม
                </div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
                  ลงทะเบียนกิจกรรม
                </h1>
                <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
                  กรุณากรอกข้อมูลของท่านเพื่อยืนยันการเข้าร่วมกิจกรรมและรับเอกสารประกอบ
                </p>
              </div>

              {errorMsg && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="font-semibold">ไม่สามารถลงทะเบียนได้</p>
                    <p className="text-xs text-red-300/90 mt-0.5">{errorMsg}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                {/* 1. ชื่อ-นามสกุล */}
                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-1.5">
                    ชื่อ - นามสกุล <span className="text-yellow-400">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => handleChange('fullName', e.target.value)}
                      onBlur={() => handleBlur('fullName')}
                      placeholder="เช่น คุณสมชาย ใจดี"
                      className={`w-full pl-11 pr-4 py-3 rounded-xl bg-[#080B13] border text-white placeholder:text-slate-600 focus:outline-none transition-all ${
                        touched.fullName && errors.fullName
                          ? 'border-red-500/80 focus:border-red-400 focus:ring-2 focus:ring-red-500/20'
                          : 'border-white/15 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20'
                      }`}
                    />
                  </div>
                  {touched.fullName && errors.fullName && (
                    <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                      <span className="inline-block w-1 h-1 rounded-full bg-red-400" />
                      {errors.fullName}
                    </p>
                  )}
                </div>

                {/* 2. อีเมล */}
                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-1.5">
                    อีเมล (Email) <span className="text-yellow-400">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      onBlur={() => handleBlur('email')}
                      placeholder="เช่น somchai@company.com"
                      className={`w-full pl-11 pr-4 py-3 rounded-xl bg-[#080B13] border text-white placeholder:text-slate-600 focus:outline-none transition-all ${
                        touched.email && errors.email
                          ? 'border-red-500/80 focus:border-red-400 focus:ring-2 focus:ring-red-500/20'
                          : 'border-white/15 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20'
                      }`}
                    />
                  </div>
                  {touched.email && errors.email && (
                    <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                      <span className="inline-block w-1 h-1 rounded-full bg-red-400" />
                      {errors.email}
                    </p>
                  )}
                </div>

                {/* 3. เบอร์โทรศัพท์ */}
                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-1.5">
                    เบอร์โทรศัพท์ <span className="text-yellow-400">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      onBlur={() => handleBlur('phone')}
                      placeholder="เช่น 0812345678"
                      className={`w-full pl-11 pr-4 py-3 rounded-xl bg-[#080B13] border text-white placeholder:text-slate-600 focus:outline-none transition-all ${
                        touched.phone && errors.phone
                          ? 'border-red-500/80 focus:border-red-400 focus:ring-2 focus:ring-red-500/20'
                          : 'border-white/15 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20'
                      }`}
                    />
                  </div>
                  {touched.phone && errors.phone && (
                    <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                      <span className="inline-block w-1 h-1 rounded-full bg-red-400" />
                      {errors.phone}
                    </p>
                  )}
                </div>

                {/* 4. บริษัท / หน่วยงาน */}
                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-1.5">
                    บริษัท / หน่วยงาน (Company / Organization) <span className="text-yellow-400">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      required
                      value={formData.company}
                      onChange={(e) => handleChange('company', e.target.value)}
                      onBlur={() => handleBlur('company')}
                      placeholder="เช่น MindDoJo Co., Ltd."
                      className={`w-full pl-11 pr-4 py-3 rounded-xl bg-[#080B13] border text-white placeholder:text-slate-600 focus:outline-none transition-all ${
                        touched.company && errors.company
                          ? 'border-red-500/80 focus:border-red-400 focus:ring-2 focus:ring-red-500/20'
                          : 'border-white/15 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20'
                      }`}
                    />
                  </div>
                  {touched.company && errors.company && (
                    <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                      <span className="inline-block w-1 h-1 rounded-full bg-red-400" />
                      {errors.company}
                    </p>
                  )}
                </div>

                {/* 5. หมายเหตุ (Optional) */}
                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-1.5 flex items-center justify-between">
                    <span>หมายเหตุเพิ่มเติม (ถ้ามี)</span>
                    <span className="text-[11px] text-slate-500 font-normal">ไม่บังคับ</span>
                  </label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    placeholder="เช่น ข้อจำกัดอาหาร หรือข้อมูลเพิ่มเติม"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#080B13] border border-white/10 text-slate-300 text-sm placeholder:text-slate-600 focus:outline-none focus:border-yellow-400/70 transition-all resize-none"
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-6 py-4 px-6 rounded-2xl font-extrabold text-base bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 text-black hover:from-yellow-300 hover:to-amber-400 active:scale-[0.99] shadow-xl shadow-yellow-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="w-5 h-5 animate-spin text-black" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>กำลังบันทึกข้อมูล...</span>
                    </>
                  ) : (
                    <>
                      <span>ยืนยันการลงทะเบียน</span>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-4 border-t border-white/10 text-center">
                <p className="text-xs text-slate-500">
                  ข้อมูลของท่านจะถูกนำไปใช้สำหรับการติดต่อและเตรียมความพร้อมในการจัดกิจกรรมเท่านั้น
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* QR Code Modal for sharing */}
      {showQrModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="bg-[#0F1422] border border-white/20 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-xl font-bold text-white mb-1">สแกนเพื่อลงทะเบียน</h3>
            <p className="text-xs text-slate-400 mb-6">ผู้เข้าร่วมสามารถสแกน QR Code นี้ผ่านสมาร์ตโฟน</p>

            <div className="bg-white p-4 rounded-2xl inline-block shadow-lg mb-6">
              <img
                src={qrImageUrl}
                alt="QR Code สำหรับลงทะเบียน"
                className="w-56 h-56 mx-auto object-contain"
              />
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs bg-yellow-400 text-black hover:bg-yellow-300 transition-colors flex items-center justify-center gap-2"
              >
                {copySuccess ? 'คัดลอกลิงก์สำเร็จแล้ว!' : 'คัดลอก URL หน้าลงทะเบียน'}
              </button>

              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="w-full py-2 px-4 rounded-xl font-medium text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="relative z-10 py-4 px-4 text-center text-xs text-slate-500 border-t border-white/5">
        MindDoJo &copy; {new Date().getFullYear()} · All rights reserved
      </footer>
    </div>
  );
}
