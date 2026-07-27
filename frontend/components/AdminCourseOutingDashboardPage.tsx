import React from 'react';
import { Link, useParams } from 'react-router-dom';

const META = {
  trainer: {
    title: 'Dashboard รายการออกหลักสูตร · วิทยากร',
    blurb: 'ติดตามรายการออกหลักสูตรของทีมวิทยากร',
  },
  support: {
    title: 'Dashboard รายการออกหลักสูตร · ทีมซับพอท',
    blurb: 'ติดตามรายการออกหลักสูตรของทีมซับพอท',
  },
} as const;

type OutingRole = keyof typeof META;

const AdminCourseOutingDashboardPage: React.FC = () => {
  const { role } = useParams<{ role: string }>();
  const meta = role === 'trainer' || role === 'support' ? META[role as OutingRole] : null;

  if (!meta) {
    return (
      <div className="p-6 sm:p-8">
        <p className="text-zinc-400 text-sm">ไม่พบหน้าที่ต้องการ</p>
        <Link to="/admin" className="mt-3 inline-block text-yellow-400 text-sm hover:underline">
          กลับ Admin
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Course outing</p>
        <h1 className="text-xl sm:text-2xl font-bold text-yellow-300">{meta.title}</h1>
        <p className="mt-2 text-sm text-zinc-400">{meta.blurb}</p>
      </header>

      <div className="rounded-2xl border border-dashed border-white/20 bg-white/[0.03] px-6 py-16 text-center">
        <p className="text-lg font-semibold text-white/90">เร็วๆ นี้</p>
        <p className="mt-2 text-sm text-zinc-500">กำลังเตรียม dashboard — จะอัปเดตเมื่อมีข้อมูลพร้อมใช้งาน</p>
      </div>
    </div>
  );
};

export default AdminCourseOutingDashboardPage;
