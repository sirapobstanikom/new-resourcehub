import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isAuthenticated } from '../lib/auth';

const ASSESSMENTS = [
  {
    id: 'minddojo-ai',
    title: 'MindDoJo AI Assessment',
    description:
      'ผู้ช่วยอัจฉริยะ — ประเมินทักษะการสื่อสาร การตัดสินใจ และการรับมือกับสถานการณ์ผ่านการสนทนาและจำลองบทบาท (login ก่อนเริ่ม)',
    href: '/assessment/minddojo',
    comingSoon: false,
  },
  {
    id: 'leadership',
    title: 'แบบประเมินสมรรถนะภาวะผู้นำ',
    description: 'Dynamic Leadership Capability Wheel — ประเมินสมรรถนะด้าน Be AWARE, ADAPT, ACT',
    href: '/assessment/leadership',
    comingSoon: false,
  },
  {
    id: 'persuasion',
    title: 'Persuasion Test (Th)',
    description: 'Persuasion Psychology · Interest-Based Persuasion — ประเมินสไตล์การโน้มน้าวของคุณ',
    href: '/assessment/persuasion',
    comingSoon: false,
  },
  {
    id: 'digital-leadership',
    title: 'Digital Leadership Competency Assessment',
    description:
      '20 ข้อ · 4 มิติ (AI Mindset, Literacy, Application, Leadership & Governance) · Scale 1–5 · ประมาณ 5–8 นาที',
    href: '/assessment/digital-leadership',
    comingSoon: false,
  },
  {
    id: 'reactive-proactive',
    title: 'Reactive vs Proactive Mindset Assessment',
    description:
      'Mindset Assessment — สำรวจแนวโน้มวิธีคิดและพฤติกรรมของตนเองเมื่อเผชิญสถานการณ์ในการทำงาน ทั้งการรับมือกับปัญหา การสื่อสาร การตัดสินใจ และการรับผิดชอบต่อผลลัพธ์',
    href: '/assessment/reactive-proactive-mindset',
    comingSoon: false,
  },
  {
    id: 'DISC',
    title: 'DISC Assessment',
    description: 'แบบทดสอบประเมินบุคลิกภาพของคุณ',
    href: '/assessment/disc',
    comingSoon: false,
  },
  {
    id: 'MBTI',
    title: 'MBTI Assessment',
    description: 'วิเคราะห์บุคลิกภาพของคุณ',
    href: 'https://www.minddojo.co.th/mbti-register',
    comingSoon: false,
  },
  {
    id: 'culture',
    title: 'Culture & Engagement',
    description: 'ประเมินวัฒนธรรมองค์กรและความผูกพัน',
    href: '#',
    comingSoon: true,
  },
];

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const loggedIn = isAuthenticated() || !!user;

  return (
    <div className="min-h-screen bg-transparent text-white bg-grid flex flex-col selection:bg-yellow-400 selection:text-black">
      {/* Header */}
      <header className="flex justify-between items-center px-6 py-6 max-w-6xl mx-auto w-full">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center glow-yellow">
            <span className="text-black font-semibold text-xl">M</span>
          </div>
          <span className="text-xl font-semibold tracking-tighter">MindDoJo</span>
        </Link>
        <div className="flex items-center gap-3">
          {loggedIn ? (
            <Link
              to="/resourcehub"
              className="px-5 py-2.5 rounded-xl font-bold bg-yellow-400 text-black hover:bg-yellow-300 transition-colors"
            >
              ResourceHub
            </Link>
          ) : (
            <Link
              to="/login"
              className="px-5 py-2.5 rounded-xl font-bold bg-white/10 text-white hover:bg-white/20 border border-white/10 transition-colors"
            >
              เข้าสู่ระบบ
            </Link>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="text-4xl md:text-7xl font-black tracking-tighter leading-tight mb-4">
          Welcome to <span className="text-yellow-400">MindDoJo</span>
        </h1>
        <p className="text-zinc-400 text-lg md:text-xl max-w-xl mb-14 leading-relaxed tracking-wide">
          แพลตฟอร์มสำหรับการประเมิน เครื่องมือ และความรู้เพื่อพัฒนาองค์กร
        </p>
      </section>

      {/* ResourceHub CTA */}
      <section className="px-6 pb-20 max-w-4xl mx-auto w-full">
        <div className="rounded-[32px] border border-white/10 bg-white/[0.06] backdrop-blur-xl shadow-2xl shadow-black/30 p-8 md:p-10 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">
            MindDoJo <span className="text-yellow-400">ResourceHub</span>
          </h2>
          <p className="text-gray-400 mb-6 max-w-lg mx-auto">
            คลังเครื่องมือเชิงกลยุทธ์ และ Industry Updates สำหรับการเติบโตขององค์กร
          </p>
          {loggedIn ? (
            <button
              onClick={() => navigate('/resourcehub')}
              className="px-8 py-3 rounded-xl font-bold bg-yellow-400 text-black hover:bg-yellow-300 shadow-lg shadow-yellow-400/20 transition-all"
            >
               ResourceHub
            </button>
          ) : (
            <Link
              to="/login"
              className="inline-block px-8 py-3 rounded-xl font-bold bg-yellow-400 text-black hover:bg-yellow-300 shadow-lg shadow-yellow-400/20 transition-all"
            >
              เข้าสู่ระบบเพื่อเข้า ResourceHub
            </Link>
          )}
        </div>
      </section>

      {/* Other Assessments */}
      <section className="px-6 pb-24 max-w-5xl mx-auto w-full">
        <h2 className="text-xl font-bold text-gray-300 mb-6 text-center">
          Assessment อื่นๆ ของ MindDoJo
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {ASSESSMENTS.map((item) => {
            const className = `block rounded-2xl border border-white/10 p-6 text-left transition-all ${
              item.comingSoon
                ? 'bg-white/5 cursor-default opacity-80'
                : 'bg-white/5 hover:bg-white/10 hover:border-yellow-400/30'
            }`;
            const content = (
              <>
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                  {item.title}
                  {item.comingSoon && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-400">
                      เร็วๆ นี้
                    </span>
                  )}
                </h3>
                <p className="text-gray-500 text-sm">{item.description}</p>
              </>
            );
            if (item.comingSoon) {
              return <div key={item.id} className={className}>{content}</div>;
            }
            if (item.href.startsWith('/')) {
              return (
                <Link key={item.id} to={item.href} className={className}>
                  {content}
                </Link>
              );
            }
            return (
              <a key={item.id} href={item.href} className={className} target="_blank" rel="noopener noreferrer">
                {content}
              </a>
            );
          })}
        </div>
      </section>

      {/* Gamification ของ MindDojo */}
      <section className="px-6 pb-24 max-w-5xl mx-auto w-full">
        <h2 className="text-xl font-bold text-gray-300 mb-6 text-center">
          Gamification ของ MindDojo
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            to="/room"
            className="block rounded-2xl border border-white/10 p-6 text-left transition-all bg-white/5 hover:bg-white/10 hover:border-amber-400/30 group"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-400/20 flex items-center justify-center mb-4 group-hover:bg-amber-400/30 transition-colors">
              <span className="text-xl font-black text-amber-400">WB</span>
            </div>
            <h3 className="font-bold text-lg mb-2 text-white">Workshop Board MindDoJo</h3>
            <p className="text-gray-500 text-sm">
              เข้าห้อง workshop ใส่รหัส แปะโพสต์อิทร่วมกัน เลือก template บอร์ด
            </p>
          </Link>
          <Link
            to="/gamification/10-timeout"
            className="block rounded-2xl border border-white/10 p-6 text-left transition-all bg-white/5 hover:bg-white/10 hover:border-emerald-500/30 group"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4 group-hover:bg-emerald-500/30 transition-colors">
              <span className="text-2xl" aria-hidden>⏱</span>
            </div>
            <h3 className="font-bold text-lg mb-2 text-white">10 Timeout</h3>
            <p className="text-gray-500 text-sm">
              กดเริ่มจับเวลา แล้วกดหยุด — (วินาที)
            </p>
          </Link>
          <Link
            to="/gamification/reaction"
            className="block rounded-2xl border border-white/10 p-6 text-left transition-all bg-white/5 hover:bg-white/10 hover:border-amber-400/30 group"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-400/20 flex items-center justify-center mb-4 group-hover:bg-amber-400/30 transition-colors">
              <span className="text-2xl" aria-hidden>⚡</span>
            </div>
            <h3 className="font-bold text-lg mb-2 text-white">กดเมื่อสีเขียว</h3>
            <p className="text-gray-500 text-sm">
              เกมวัดความเร็ว — รอจอเปลี่ยนเป็นสีเขียวแล้วกดทันที วัดเวลาตอบสนอง (ms)
            </p>
          </Link>
          <Link
            to="/gamification/game-ar"
            className="block rounded-2xl border border-white/10 p-6 text-left transition-all bg-white/5 hover:bg-white/10 hover:border-red-400/30 group"
          >
            <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center mb-4 group-hover:bg-red-500/30 transition-colors">
              <span className="text-2xl" aria-hidden>📷</span>
            </div>
            <h3 className="font-bold text-lg mb-2 text-white">Game AR (Hiro Marker)</h3>
            <p className="text-gray-500 text-sm">
              เปิดกล้องเว็บ ตรวจจับ marker แบบ hiro แล้วแสดงกล่อง 3D สีแดงเหนือ marker
            </p>
          </Link>
        </div>
      </section>

      {/* ปุ่ม Admin — ซ่อนมุมขวาล่าง เพื่อไม่ให้ user ทั่วไปสับสน */}
      <Link
        to="/admin/login"
        className="fixed bottom-4 right-4 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-400 hover:bg-white/5 border border-white/5 transition-colors z-10"
        title="Login Admin MindDojo"
      >
        Admin
      </Link>

      {/* Footer */}
      <footer className="py-8 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-yellow-400 rounded flex items-center justify-center">
              <span className="text-black font-bold text-sm">M</span>
            </div>
            <span className="font-bold tracking-tight text-sm">MindDoJo</span>
          </div>
          <span className="text-gray-500 text-sm">
            © {new Date().getFullYear()} MindDoJo CO., LTD.
          </span>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
