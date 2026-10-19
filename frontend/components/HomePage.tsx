import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import { useAuth } from '../contexts/AuthContext';
import { isAuthenticated } from '../lib/auth';

type HubCard = {
  id: string;
  title: string;
  description: string;
  href: string;
  category: string;
  icon: string;
  tint: string;
  comingSoon?: boolean;
  external?: boolean;
};

const ASSESSMENTS: HubCard[] = [
  {
    id: 'minddojo-ai',
    title: 'MindDoJo AI Assessment',
    description: 'ประเมินทักษะการสื่อสาร การตัดสินใจ และการรับมือกับสถานการณ์ผ่านการสนทนา',
    href: '/assessment/minddojo',
    category: 'AI & Innovation',
    icon: '✦',
    tint: 'bg-pink-300 text-pink-800',
  },
  {
    id: 'leadership',
    title: 'แบบประเมินสมรรถนะภาวะผู้นำ',
    description: 'Dynamic Leadership Capability Wheel — Be AWARE, ADAPT, ACT',
    href: '/assessment/leadership',
    category: 'Leadership',
    icon: '◎',
    tint: 'bg-violet-300 text-violet-800',
  },
  {
    id: 'persuasion',
    title: 'Persuasion Test (Th)',
    description: 'Persuasion Psychology · Interest-Based Persuasion — สไตล์การโน้มน้าวของคุณ',
    href: '/assessment/persuasion',
    category: 'Communication',
    icon: '◈',
    tint: 'bg-amber-300 text-amber-900',
  },
  {
    id: 'digital-leadership',
    title: 'Digital Leadership Competency',
    description: '20 ข้อ · 4 มิติ AI Mindset, Literacy, Application, Leadership & Governance',
    href: '/assessment/digital-leadership',
    category: 'Leadership',
    icon: '⌘',
    tint: 'bg-sky-300 text-sky-800',
  },
  {
    id: 'reactive-proactive',
    title: 'Reactive vs Proactive Mindset',
    description: 'สำรวจแนวโน้มวิธีคิดเมื่อเผชิญปัญหา การสื่อสาร และการรับผิดชอบผลลัพธ์',
    href: '/assessment/reactive-proactive-mindset',
    category: 'Mindset',
    icon: '↺',
    tint: 'bg-emerald-300 text-emerald-900',
  },
  {
    id: 'growth-fixed',
    title: 'Growth vs Fixed Mindset',
    description: '10 ข้อ · สเกล 4 ระดับ · สะท้อนแนวโน้ม Growth และ Fixed Mindset',
    href: '/assessment/growth-fixed-mindset',
    category: 'Mindset',
    icon: '🌱',
    tint: 'bg-lime-300 text-lime-900',
  },
  {
    id: 'conflict-management-style',
    title: 'รูปแบบการจัดการความขัดแย้ง',
    description: '15 ข้อ · สรุป 5 รูปแบบ: หลีกหนี ยอมตาม เอาชนะ ร่วมมือ ประนีประนอม',
    href: '/assessment/conflict-management-style',
    category: 'Teamwork',
    icon: '⇄',
    tint: 'bg-orange-300 text-orange-800',
  },
  {
    id: 'key-principles',
    title: 'Key Principles Assessment',
    description: '25 ข้อ · สรุป 5 ส่วน: Self Esteem, Empathy, Involvement, Support, Share',
    href: '/assessment/key-principles',
    category: 'Principles',
    icon: '◇',
    tint: 'bg-rose-300 text-rose-800',
  },
  {
    id: 'DISC',
    title: 'DISC Assessment',
    description: 'แบบทดสอบประเมินบุคลิกภาพของคุณตามกรอบ DISC',
    href: '/assessment/disc',
    category: 'Personality',
    icon: '▣',
    tint: 'bg-indigo-300 text-indigo-800',
  },
  {
    id: 'MBTI',
    title: 'MBTI Assessment',
    description: 'วิเคราะห์บุคลิกภาพของคุณตามกรอบ MBTI',
    href: '/assessment/mbti',
    category: 'Personality',
    icon: '◉',
    tint: 'bg-fuchsia-300 text-fuchsia-800',
  },
  {
    id: 'culture',
    title: 'Culture & Engagement',
    description: 'ประเมินวัฒนธรรมองค์กรและความผูกพัน',
    href: '#',
    category: 'Culture',
    icon: '◎',
    tint: 'bg-teal-300 text-teal-900',
    comingSoon: true,
  },
];

const GAMES: HubCard[] = [
  {
    id: 'workshop-board',
    title: 'Workshop Board MindDoJo',
    description: 'เข้าห้อง workshop ใส่รหัส แปะโพสต์อิทร่วมกัน เลือก template บอร์ด',
    href: '/room',
    category: 'Collaboration',
    icon: 'WB',
    tint: 'bg-amber-300 text-amber-900',
  },
  {
    id: '10-timeout',
    title: '10 Timeout',
    description: 'กดเริ่มจับเวลา แล้วกดหยุด — วัดความแม่นยำของเวลา',
    href: '/gamification/10-timeout',
    category: 'Reaction',
    icon: '⏱',
    tint: 'bg-emerald-300 text-emerald-900',
  },
  {
    id: 'reaction',
    title: 'กดเมื่อสีเขียว',
    description: 'รอจอเปลี่ยนเป็นสีเขียวแล้วกดทันที วัดเวลาตอบสนอง (ms)',
    href: '/gamification/reaction',
    category: 'Reaction',
    icon: '⚡',
    tint: 'bg-yellow-300 text-yellow-900',
  },
  {
    id: 'game-ar',
    title: 'Game AR',
    description: 'ถ่ายภาพค้นหาหมาป่า AR กันเถอะ!',
    href: 'https://toyota-ar-experience-827970893136.asia-southeast1.run.app/',
    category: 'AR',
    icon: '📷',
    tint: 'bg-red-300 text-red-800',
    external: true,
  },
  {
    id: 'hidden-fox',
    title: 'Hidden Fox',
    description: 'ล่าจิ้งจอกแอบบนแผนที่ — เล่นแนวนอน บันทึกคะแนน Hall of Fame',
    href: '/gamification/hidden-fox',
    category: 'Adventure',
    icon: '🦊',
    tint: 'bg-orange-300 text-orange-800',
  },
  {
    id: 'spot-difference',
    title: 'จับคู่การ์ด',
    description: 'ลงทะเบียนแล้วจับคู่การ์ด 16 ใบ — แข่งกันที่เวลา มีกระดานคะแนนสด',
    href: '/gamification/spot-difference',
    category: 'Memory',
    icon: '🃏',
    tint: 'bg-cyan-300 text-cyan-900',
  },
  {
    id: 'camera-block-jump',
    title: 'Camera Block Jump',
    description: 'กระโดดโหม่งกล่องด้วยกล้องเว็บแคม — สุ่มเลขกลุ่มแบบ Lucky Block',
    href: '/gamification/camera-block-jump',
    category: 'Camera',
    icon: '⬆',
    tint: 'bg-yellow-300 text-yellow-900',
  },
  {
    id: 'prize-catch',
    title: 'เกมกระโดดรับของรางวัล',
    description: 'Minddojo WorkTech Expo — โหม่ง 3 ครั้ง แล้วกระโดดตามถึงเส้นชัย',
    href: '/gamification/prize-catch',
    category: 'Camera',
    icon: '🎁',
    tint: 'bg-lime-300 text-lime-900',
  },
  {
    id: 'skill-connector',
    title: 'Skill Connector',
    description: 'กดช่องติดกัน จากเริ่มไปเส้นชัย — ง่าย เข้าใจทันที',
    href: '/gamification/skill-connector',
    category: 'Puzzle',
    icon: '◎',
    tint: 'bg-teal-300 text-teal-900',
  },
  {
    id: 'ai-hr-challenge',
    title: 'AI HR Challenge',
    description: 'ตอบโจทย์ HR 3 ข้อ — อ่านเฉลยทีละข้อ แล้วรับคะแนน AI (~2 นาที)',
    href: '/gamification/ai-hr-challenge',
    category: 'AI',
    icon: '🧠',
    tint: 'bg-violet-300 text-violet-800',
  },
  {
    id: 'face-scan',
    title: 'Face Mood Scan',
    description: 'สแกนหน้านิ่ง ๆ — AI บอกว่าหน้าคุณดูคล้ายอารมณ์ไหนใน 7 อารมณ์ของ Ekman',
    href: '/gamification/face-scan',
    category: 'Self-discovery',
    icon: '🙂',
    tint: 'bg-rose-300 text-rose-800',
  },
];

const CardLink: React.FC<{ item: HubCard; actionLabel: string }> = ({ item, actionLabel }) => {
  const className =
    'group md-card flex flex-col p-5 transition hover:-translate-y-0.5 hover:border-[#FFCC00] hover:shadow-lg';
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl text-lg font-bold ring-1 ring-black/5 ${item.tint}`}>
          {item.icon}
        </span>
        <span className="rounded-md bg-gray-100 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-800">
          {item.category}
        </span>
      </div>
      <h3 className="mt-4 text-base font-bold leading-snug text-gray-950">{item.title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-600">{item.description}</p>
      <div className="mt-4 flex items-center justify-between">
        {item.comingSoon ? (
          <span className="rounded-full bg-yellow-200 px-2.5 py-0.5 text-[10px] font-bold text-yellow-900">เร็วๆ นี้</span>
        ) : (
          <span />
        )}
        <span className="inline-flex items-center gap-1 text-sm font-bold text-gray-900 group-hover:text-black">
          {item.comingSoon ? 'เร็วๆ นี้' : actionLabel}
          <span aria-hidden className="text-[#B88600] transition group-hover:translate-x-0.5">
            →
          </span>
        </span>
      </div>
    </>
  );

  if (item.comingSoon) {
    return (
      <div key={item.id} className={`${className} cursor-default opacity-80`}>
        {body}
      </div>
    );
  }
  if (item.external) {
    return (
      <a key={item.id} href={item.href} target="_blank" rel="noopener noreferrer" className={className}>
        {body}
      </a>
    );
  }
  return (
    <Link key={item.id} to={item.href} className={className}>
      {body}
    </Link>
  );
};

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const loggedIn = isAuthenticated() || !!user;
  const [query, setQuery] = useState('');

  const filteredAssessments = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ASSESSMENTS;
    return ASSESSMENTS.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className="md-page overflow-x-hidden">
      <header className="sticky top-0 z-40 border-b border-[#D6D4CC] bg-[#F3F2ED]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <Link to="/" className="flex items-center">
            <BrandLogo className="text-[26px]" tone="dark" />
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-bold text-gray-800 md:flex">
            <a href="#assessments" className="transition hover:text-black">
              แบบประเมินออนไลน์
            </a>
            <a href="#gamification" className="transition hover:text-black">
              Gamification
            </a>
          </nav>
          {loggedIn ? (
            <button type="button" onClick={() => navigate('/resourcehub')} className="md-btn-primary !py-2.5 !text-sm">
              เข้าสู่ Resource Hub
            </button>
          ) : (
            <Link to="/login" className="md-btn-primary !py-2.5 !text-sm">
              เข้าสู่ Resource Hub
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-5">
        <section className="pb-10 pt-12 text-center md:pb-14 md:pt-16">
          <h1 className="mx-auto max-w-3xl text-3xl font-black tracking-tight text-gray-900 sm:text-4xl md:text-5xl md:leading-[1.15]">
            แบบประเมินและเครื่องมือพัฒนาองค์กรจาก{' '}
            <span className="relative inline-block">
              MindDoJo
              <span
                className="absolute inset-x-0 bottom-1 -z-10 h-3 rounded-sm bg-[#FFCC00] sm:bottom-1.5 sm:h-3.5"
                aria-hidden
              />
            </span>
          </h1>
        </section>

        <section className="mb-16">
          <div className="md-card flex flex-col items-stretch gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-center gap-4 text-left">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#FFCC00] text-2xl shadow-sm">
                📖
              </span>
              <div>
                <h2 className="text-lg font-bold text-gray-950 sm:text-xl">
                  MindDoJo <span className="text-[#B88600]">ResourceHub</span>
                </h2>
                <p className="mt-1 max-w-xl text-sm leading-relaxed text-gray-600">
                  คลังเครื่องมือเชิงกลยุทธ์ เช่น Business Model Canvas, Game Plan, Product Strategy และ Industry Updates
                </p>
              </div>
            </div>
            {loggedIn ? (
              <button type="button" onClick={() => navigate('/resourcehub')} className="md-btn-primary shrink-0">
                เข้า ResourceHub
              </button>
            ) : (
              <Link to="/login" className="md-btn-primary shrink-0 text-center">
                เข้าสู่ระบบเพื่อเข้า ResourceHub
              </Link>
            )}
          </div>
        </section>

        <section id="assessments" className="scroll-mt-24 pb-20">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#9A7200]">01 / Assessments</p>
              <h2 className="mt-1 text-2xl font-black text-gray-950">แบบประเมินออนไลน์ของ MindDoJo</h2>
            </div>
            <label className="relative block w-full sm:max-w-xs">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden>
                ⌕
              </span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหาแบบประเมิน"
                className="md-input !rounded-full !py-2.5 pl-10 pr-4 text-sm"
              />
            </label>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAssessments.map((item) => (
              <CardLink key={item.id} item={item} actionLabel="ดูรายละเอียด" />
            ))}
          </div>
          {filteredAssessments.length === 0 && (
            <p className="mt-8 text-center text-sm text-gray-500">ไม่พบแบบประเมินที่ตรงกับ “{query}”</p>
          )}
        </section>

        <section id="gamification" className="scroll-mt-24 pb-20">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#9A7200]">02 / Learn through play</p>
              <h2 className="mt-1 text-2xl font-black text-gray-950">Gamification ของ MindDoJo</h2>
            </div>
            <span className="rounded-full border border-[#D6D4CC] bg-white px-3 py-1 text-xs font-bold text-gray-800">
              {GAMES.length} เกม
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {GAMES.map((item) => (
              <CardLink key={item.id} item={item} actionLabel="เข้าเล่น" />
            ))}
          </div>
        </section>
      </main>

      <Link
        to="/admin/login"
        className="fixed bottom-4 right-4 z-10 rounded-lg border border-[#D6D4CC] bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-sm transition hover:border-gray-400 hover:text-gray-900"
        title="Login Admin MindDojo"
      >
        Admin
      </Link>

      <footer className="border-t border-[#D6D4CC] bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row">
          <BrandLogo className="text-[20px]" tone="dark" />
          <span className="text-sm font-medium text-gray-600">
            © {new Date().getFullYear()} MindDoJo Co., Ltd. All rights reserved
          </span>
          <a href="#assessments" className="text-sm font-semibold text-gray-700 transition hover:text-black">
            นโยบายความเป็นส่วนตัว
          </a>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
