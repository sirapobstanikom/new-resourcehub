import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  Boxes,
  Brain,
  Camera,
  CircuitBoard,
  ClipboardList,
  Compass,
  Cuboid,
  Gift,
  Handshake,
  LayoutGrid,
  Library,
  MapPinned,
  MessageCircle,
  MessagesSquare,
  Puzzle,
  ScanFace,
  Scale,
  Search,
  Sprout,
  Target,
  Timer,
  UsersRound,
  Zap,
} from 'lucide-react';
import BrandLogo from './BrandLogo';
import { useAuth } from '../contexts/AuthContext';
import { isAuthenticated } from '../lib/auth';

const HOME_BG_VIDEO =
  'https://axaasphuaaadzjoffznj.supabase.co/storage/v1/object/public/web%20site%20minddojobusiness/file.mp4';

const SCROLL_DURATION_MS = 1400;

function scrollToId(id: string, e?: React.MouseEvent<HTMLAnchorElement>) {
  e?.preventDefault();
  const el = document.getElementById(id);
  if (!el) return;

  const startY = window.scrollY;
  const headerOffset = 88;
  const targetY = Math.max(0, el.getBoundingClientRect().top + window.scrollY - headerOffset);
  const distance = targetY - startY;
  if (Math.abs(distance) < 2) {
    window.history.replaceState(null, '', `#${id}`);
    return;
  }

  const startTime = performance.now();
  const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

  const step = (now: number) => {
    const progress = Math.min(1, (now - startTime) / SCROLL_DURATION_MS);
    window.scrollTo(0, startY + distance * easeInOutCubic(progress));
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  window.history.replaceState(null, '', `#${id}`);
}

type HubCard = {
  id: string;
  title: string;
  description: string;
  href: string;
  category: string;
  icon: LucideIcon;
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
    icon: MessageCircle,
    tint: 'bg-[#FFCC00] text-black',
  },
  {
    id: 'leadership',
    title: 'แบบประเมินสมรรถนะภาวะผู้นำ',
    description: 'Dynamic Leadership Capability Wheel — Be AWARE, ADAPT, ACT',
    href: '/assessment/leadership',
    category: 'Leadership',
    icon: Compass,
    tint: 'bg-slate-900 text-[#FFCC00]',
  },
  {
    id: 'persuasion',
    title: 'Persuasion Test (Th)',
    description: 'Persuasion Psychology · Interest-Based Persuasion — สไตล์การโน้มน้าวของคุณ',
    href: '/assessment/persuasion',
    category: 'Communication',
    icon: MessagesSquare,
    tint: 'bg-amber-500 text-white',
  },
  {
    id: 'digital-leadership',
    title: 'Digital Leadership Competency',
    description: '20 ข้อ · 4 มิติ AI Mindset, Literacy, Application, Leadership & Governance',
    href: '/assessment/digital-leadership',
    category: 'Leadership',
    icon: CircuitBoard,
    tint: 'bg-sky-600 text-white',
  },
  {
    id: 'reactive-proactive',
    title: 'Reactive vs Proactive Mindset',
    description: 'สำรวจแนวโน้มวิธีคิดเมื่อเผชิญปัญหา การสื่อสาร และการรับผิดชอบผลลัพธ์',
    href: '/assessment/reactive-proactive-mindset',
    category: 'Mindset',
    icon: Target,
    tint: 'bg-emerald-600 text-white',
  },
  {
    id: 'growth-fixed',
    title: 'Growth vs Fixed Mindset',
    description: '10 ข้อ · สเกล 4 ระดับ · สะท้อนแนวโน้ม Growth และ Fixed Mindset',
    href: '/assessment/growth-fixed-mindset',
    category: 'Mindset',
    icon: Sprout,
    tint: 'bg-lime-500 text-lime-950',
  },
  {
    id: 'conflict-management-style',
    title: 'รูปแบบการจัดการความขัดแย้ง',
    description: '15 ข้อ · สรุป 5 รูปแบบ: หลีกหนี ยอมตาม เอาชนะ ร่วมมือ ประนีประนอม',
    href: '/assessment/conflict-management-style',
    category: 'Teamwork',
    icon: Scale,
    tint: 'bg-orange-500 text-white',
  },
  {
    id: 'key-principles',
    title: 'Key Principles Assessment',
    description: '25 ข้อ · สรุป 5 ส่วน: Self Esteem, Empathy, Involvement, Support, Share',
    href: '/assessment/key-principles',
    category: 'Principles',
    icon: Library,
    tint: 'bg-rose-500 text-white',
  },
  {
    id: 'DISC',
    title: 'DISC Assessment',
    description: 'แบบทดสอบประเมินบุคลิกภาพของคุณตามกรอบ DISC',
    href: '/assessment/disc',
    category: 'Personality',
    icon: LayoutGrid,
    tint: 'bg-indigo-600 text-white',
  },
  {
    id: 'MBTI',
    title: 'MBTI Assessment',
    description: 'วิเคราะห์บุคลิกภาพของคุณตามกรอบ MBTI',
    href: '/assessment/mbti',
    category: 'Personality',
    icon: UsersRound,
    tint: 'bg-fuchsia-600 text-white',
  },
  {
    id: 'culture',
    title: 'Culture & Engagement',
    description: 'ประเมินวัฒนธรรมองค์กรและความผูกพัน',
    href: '#',
    category: 'Culture',
    icon: Handshake,
    tint: 'bg-teal-600 text-white',
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
    icon: ClipboardList,
    tint: 'bg-[#FFCC00] text-black',
  },
  {
    id: '10-timeout',
    title: '10 Timeout',
    description: 'กดเริ่มจับเวลา แล้วกดหยุด — วัดความแม่นยำของเวลา',
    href: '/gamification/10-timeout',
    category: 'Reaction',
    icon: Timer,
    tint: 'bg-emerald-600 text-white',
  },
  {
    id: 'reaction',
    title: 'กดเมื่อสีเขียว',
    description: 'รอจอเปลี่ยนเป็นสีเขียวแล้วกดทันที วัดเวลาตอบสนอง (ms)',
    href: '/gamification/reaction',
    category: 'Reaction',
    icon: Zap,
    tint: 'bg-[#FFCC00] text-black',
  },
  {
    id: 'game-ar',
    title: 'Game AR',
    description: 'ถ่ายภาพค้นหาหมาป่า AR กันเถอะ!',
    href: 'https://toyota-ar-experience-827970893136.asia-southeast1.run.app/',
    category: 'AR',
    icon: Cuboid,
    tint: 'bg-red-600 text-white',
    external: true,
  },
  {
    id: 'hidden-fox',
    title: 'Hidden Fox',
    description: 'ล่าจิ้งจอกแอบบนแผนที่ — เล่นแนวนอน บันทึกคะแนน Hall of Fame',
    href: '/gamification/hidden-fox',
    category: 'Adventure',
    icon: MapPinned,
    tint: 'bg-orange-600 text-white',
  },
  {
    id: 'spot-difference',
    title: 'จับคู่การ์ด',
    description: 'ลงทะเบียนแล้วจับคู่การ์ด 16 ใบ — แข่งกันที่เวลา มีกระดานคะแนนสด',
    href: '/gamification/spot-difference',
    category: 'Memory',
    icon: Boxes,
    tint: 'bg-cyan-600 text-white',
  },
  {
    id: 'camera-block-jump',
    title: 'Camera Block Jump',
    description: 'กระโดดโหม่งกล่องด้วยกล้องเว็บแคม — สุ่มเลขกลุ่มแบบ Lucky Block',
    href: '/gamification/camera-block-jump',
    category: 'Camera',
    icon: Camera,
    tint: 'bg-slate-900 text-[#FFCC00]',
  },
  {
    id: 'prize-catch',
    title: 'เกมกระโดดรับของรางวัล',
    description: 'Minddojo WorkTech Expo — โหม่ง 3 ครั้ง แล้วกระโดดตามถึงเส้นชัย',
    href: '/gamification/prize-catch',
    category: 'Camera',
    icon: Gift,
    tint: 'bg-lime-500 text-lime-950',
  },
  {
    id: 'skill-connector',
    title: 'Skill Connector',
    description: 'กดช่องติดกัน จากเริ่มไปเส้นชัย — ง่าย เข้าใจทันที',
    href: '/gamification/skill-connector',
    category: 'Puzzle',
    icon: Puzzle,
    tint: 'bg-teal-600 text-white',
  },
  {
    id: 'ai-hr-challenge',
    title: 'AI HR Challenge',
    description: 'ตอบโจทย์ HR 3 ข้อ — อ่านเฉลยทีละข้อ แล้วรับคะแนน AI (~2 นาที)',
    href: '/gamification/ai-hr-challenge',
    category: 'AI',
    icon: Brain,
    tint: 'bg-slate-800 text-[#FFCC00]',
  },
  {
    id: 'face-scan',
    title: 'Face Mood Scan',
    description: 'สแกนหน้านิ่ง ๆ — AI บอกว่าหน้าคุณดูคล้ายอารมณ์ไหนใน 7 อารมณ์ของ Ekman',
    href: '/gamification/face-scan',
    category: 'Self-discovery',
    icon: ScanFace,
    tint: 'bg-rose-600 text-white',
  },
];

const CardLink: React.FC<{ item: HubCard; actionLabel: string }> = ({ item, actionLabel }) => {
  const Icon = item.icon;
  const className =
    'group flex flex-col rounded-2xl border-2 border-[#B8B4A8] bg-white p-5 shadow-[0_4px_14px_rgba(0,0,0,0.08)] transition duration-300 hover:-translate-y-1 hover:border-[#FFCC00] hover:shadow-[0_14px_32px_rgba(0,0,0,0.14)]';
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className={`flex h-12 w-12 items-center justify-center rounded-xl shadow-md ${item.tint}`}>
          <Icon className="h-5 w-5" strokeWidth={2.25} aria-hidden />
        </span>
        <span className="rounded-md border border-[#E0A800] bg-[#FFF4C2] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#6B5200]">
          {item.category}
        </span>
      </div>
      <h3 className="mt-4 text-base font-extrabold leading-snug text-gray-950">{item.title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-700">{item.description}</p>
      <div className="mt-5 flex items-center justify-between border-t border-[#E8E6DF] pt-4">
        {item.comingSoon ? (
          <span className="rounded-[10px] bg-[#FFCC00] px-2.5 py-0.5 text-[10px] font-extrabold text-black">เร็วๆ นี้</span>
        ) : (
          <span />
        )}
        <span className="inline-flex items-center gap-1.5 text-sm font-extrabold text-gray-950">
          {item.comingSoon ? 'เร็วๆ นี้' : actionLabel}
          <span
            aria-hidden
            className="inline-flex h-6 w-6 items-center justify-center rounded-[6px] bg-[#FFCC00] text-xs text-black transition group-hover:translate-x-0.5"
          >
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
  const [solidNav, setSolidNav] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolidNav(window.scrollY > Math.min(window.innerHeight * 0.55, 420));
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
    <div className="min-h-dvh overflow-x-hidden bg-[#F3F2ED] text-gray-900 selection:bg-yellow-400 selection:text-black">
      <header
        className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
          solidNav
            ? 'border-b border-[#C4C1B6] bg-[#F3F2ED]/95 shadow-sm backdrop-blur-md'
            : 'border-b border-transparent bg-transparent'
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <Link to="/" className="flex items-center drop-shadow-sm">
            <BrandLogo className="text-[26px]" tone={solidNav ? 'dark' : 'light'} />
          </Link>
          <nav
            className={`hidden items-center gap-8 text-sm font-bold md:flex ${
              solidNav ? 'text-gray-900' : 'text-white'
            }`}
          >
            <a href="#assessments" onClick={(e) => scrollToId('assessments', e)} className="transition hover:text-[#B88600]">
              แบบประเมินออนไลน์
            </a>
            <a href="#gamification" onClick={(e) => scrollToId('gamification', e)} className="transition hover:text-[#B88600]">
              Gamification
            </a>
          </nav>
          {loggedIn ? (
            <button
              type="button"
              onClick={() => navigate('/resourcehub')}
              className="md-btn-primary !rounded-[10px] !py-2.5 !text-sm"
            >
              เข้าสู่ Resource Hub
            </button>
          ) : (
            <Link to="/login" className="md-btn-primary !rounded-[10px] !py-2.5 !text-sm">
              เข้าสู่ Resource Hub
            </Link>
          )}
        </div>
      </header>

      <section className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-5 pb-16 pt-24 text-center">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <video
            className="h-full w-full scale-105 object-cover"
            src={HOME_BG_VIDEO}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-[#F3F2ED]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_65%_50%_at_50%_42%,transparent_10%,rgba(0,0,0,0.28)_100%)]" />
        </div>

        <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center home-hero-in">
          <BrandLogo className="mb-5 text-[40px] sm:text-[48px] md:text-[56px] home-hero-brand" tone="light" />
          <h1 className="text-3xl font-black tracking-tight text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.45)] sm:text-4xl md:text-[2.75rem] md:leading-[1.15]">
            แบบประเมินและเครื่องมือ
            <br className="hidden sm:block" />
            พัฒนาองค์กร
          </h1>
          <p className="mt-3 max-w-xl text-base font-semibold leading-relaxed text-white drop-shadow-md sm:text-lg">
            สำรวจศักยภาพทีมด้วยแบบประเมินและเกมเรียนรู้จาก MindDoJo
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#assessments"
              onClick={(e) => scrollToId('assessments', e)}
              className="md-btn-primary !rounded-[10px] shadow-lg shadow-black/25"
            >
              เริ่มทำแบบประเมิน
            </a>
            <a
              href="#gamification"
              onClick={(e) => scrollToId('gamification', e)}
              className="inline-flex items-center justify-center rounded-[10px] border-2 border-white bg-black/25 px-6 py-3 text-sm font-bold text-white backdrop-blur-sm transition hover:border-[#FFCC00] hover:bg-[#FFCC00] hover:text-black"
            >
              ดูเกมทั้งหมด
            </a>
          </div>
        </div>
      </section>

      <main className="relative z-10 -mt-8 rounded-t-[2rem] bg-[#F3F2ED] shadow-[0_-12px_40px_rgba(0,0,0,0.12)]">
        <div className="mx-auto w-full max-w-6xl px-5 pt-10">
          <section className="mb-14">
            <div className="flex flex-col items-stretch gap-5 rounded-2xl border border-[#C4C1B6] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] sm:flex-row sm:items-center sm:justify-between sm:p-7">
              <div className="flex items-center gap-4 text-left">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#FFCC00] text-black shadow-md shadow-yellow-500/30">
                  <BookOpen className="h-6 w-6" strokeWidth={2.25} aria-hidden />
                </span>
                <div>
                  <h2 className="text-lg font-extrabold text-gray-950 sm:text-xl">
                    MindDoJo <span className="text-[#8A6A00]">ResourceHub</span>
                  </h2>
                  <p className="mt-1 max-w-xl text-sm font-medium leading-relaxed text-gray-700">
                    คลังเครื่องมือเชิงกลยุทธ์ เช่น Business Model Canvas, Game Plan, Product Strategy และ Industry Updates
                  </p>
                </div>
              </div>
              {loggedIn ? (
                <button
                  type="button"
                  onClick={() => navigate('/resourcehub')}
                  className="md-btn-primary !rounded-[10px] shrink-0"
                >
                  เข้า ResourceHub
                </button>
              ) : (
                <Link to="/login" className="md-btn-primary !rounded-[10px] shrink-0 text-center">
                  เข้าสู่ระบบเพื่อเข้า ResourceHub
                </Link>
              )}
            </div>
          </section>

          <section id="assessments" className="scroll-mt-24 pb-16">
            <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#6B5200]">
                  <span className="h-2 w-2 rounded-full bg-[#FFCC00]" aria-hidden />
                  01 / Assessments
                </p>
                <h2 className="mt-1 text-2xl font-black text-gray-950 sm:text-3xl">แบบประเมินออนไลน์ของ MindDoJo</h2>
              </div>
              <label className="relative block w-full sm:max-w-xs">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" aria-hidden>
                  <Search className="h-4 w-4" strokeWidth={2.25} />
                </span>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ค้นหาแบบประเมิน"
                  className="md-input !rounded-[10px] !border-[#C4C1B6] !bg-white !py-2.5 pl-10 pr-4 text-sm font-medium"
                />
              </label>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredAssessments.map((item) => (
                <CardLink key={item.id} item={item} actionLabel="ดูรายละเอียด" />
              ))}
            </div>
            {filteredAssessments.length === 0 && (
              <p className="mt-8 text-center text-sm font-medium text-gray-600">ไม่พบแบบประเมินที่ตรงกับ “{query}”</p>
            )}
          </section>

          <section id="gamification" className="scroll-mt-24 pb-20">
            <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#6B5200]">
                  <span className="h-2 w-2 rounded-full bg-[#FFCC00]" aria-hidden />
                  02 / Learn through play
                </p>
                <h2 className="mt-1 text-2xl font-black text-gray-950 sm:text-3xl">Gamification ของ MindDoJo</h2>
              </div>
              <span className="rounded-[10px] border border-[#C4C1B6] bg-white px-3.5 py-1.5 text-xs font-extrabold text-gray-900 shadow-sm">
                {GAMES.length} เกม
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {GAMES.map((item) => (
                <CardLink key={item.id} item={item} actionLabel="เข้าเล่น" />
              ))}
            </div>
          </section>
        </div>
      </main>

      <Link
        to="/admin/login"
        className="fixed bottom-4 right-4 z-10 rounded-[10px] border border-[#C4C1B6] bg-white px-3 py-1.5 text-xs font-bold text-gray-700 shadow-md transition hover:border-gray-500 hover:text-gray-950"
        title="Login Admin MindDojo"
      >
        Admin
      </Link>

      <footer className="border-t border-[#C4C1B6] bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row">
          <BrandLogo className="text-[20px]" tone="dark" />
          <span className="text-sm font-semibold text-gray-700">
            © {new Date().getFullYear()} MindDoJo Co., Ltd. All rights reserved
          </span>
          <a
            href="#assessments"
            onClick={(e) => scrollToId('assessments', e)}
            className="text-sm font-bold text-gray-800 transition hover:text-black"
          >
            นโยบายความเป็นส่วนตัว
          </a>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
