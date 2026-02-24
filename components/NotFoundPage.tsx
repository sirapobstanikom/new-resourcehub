import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
      <div className="w-24 h-24 rounded-full bg-yellow-400/10 flex items-center justify-center mb-8">
        <span className="text-6xl font-black text-yellow-400">404</span>
      </div>
      <h1 className="text-3xl md:text-4xl font-bold mb-4">ไม่พบหน้าที่คุณต้องการ</h1>
      <p className="text-gray-400 mb-10 max-w-md">
        หน้านี้อาจถูกลบหรือย้ายไปแล้ว กรุณาตรวจสอบ URL หรือกลับไปหน้าหลัก
      </p>
      <Link
        to="/"
        className="px-8 py-3 rounded-xl font-bold bg-yellow-400 text-black hover:bg-yellow-300 transition-colors shadow-lg shadow-yellow-400/20"
      >
        กลับหน้าหลัก
      </Link>
    </div>
  );
};

export default NotFoundPage;
