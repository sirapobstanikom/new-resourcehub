import React, { useEffect, useMemo, useRef, useState } from 'react';
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
    'group flex flex-col rounded-[14px] border border-[#C4C1B6] bg-white p-4 active:scale-[0.99] sm:rounded-2xl sm:border-2 sm:border-[#B8B4A8] sm:p-5 shadow-[0_4px_14px_rgba(0,0,0,0.08)] transition duration-300 sm:hover:-translate-y-1 hover:border-[#FFCC00] sm:hover:shadow-[0_14px_32px_rgba(0,0,0,0.14)]';
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className={`flex h-11 w-11 items-center justify-center rounded-[10px] shadow-md sm:h-12 sm:w-12 sm:rounded-xl ${item.tint}`}>
          <Icon className="h-5 w-5" strokeWidth={2.25} aria-hidden />
        </span>
        <span className="max-w-[45%] truncate rounded-[8px] border border-[#E0A800] bg-[#FFF4C2] px-2 py-1 text-[9px] font-extrabold uppercase tracking-[0.1em] text-[#6B5200] sm:max-w-none sm:rounded-md sm:px-2.5 sm:text-[10px]">
          {item.category}
        </span>
      </div>
      <h3 className="mt-3 text-[15px] font-extrabold leading-snug text-gray-950 sm:mt-4 sm:text-base">{item.title}</h3>
      <p className="mt-1.5 line-clamp-2 flex-1 text-sm leading-relaxed text-gray-700 sm:mt-2 sm:line-clamp-none">
        {item.description}
      </p>
      <div className="mt-4 flex items-center justify-between border-t border-[#E8E6DF] pt-3 sm:mt-5 sm:pt-4">
        {item.comingSoon ? (
          <span className="rounded-[10px] bg-[#FFCC00] px-2.5 py-0.5 text-[10px] font-extrabold text-black">เร็วๆ นี้</span>
        ) : (
          <span />
        )}
        <span className="inline-flex min-h-10 items-center gap-1.5 text-sm font-extrabold text-gray-950">
          {item.comingSoon ? 'เร็วๆ นี้' : actionLabel}
          <span
            aria-hidden
            className="inline-flex h-7 w-7 items-center justify-center rounded-[8px] bg-[#FFCC00] text-xs text-black transition group-hover:translate-x-0.5 sm:h-6 sm:w-6 sm:rounded-[6px]"
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
  const bgVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = bgVideoRef.current;
    if (!video) return;

    const restart = () => {
      try {
        video.currentTime = 0;
      } catch {
        video.load();
      }
      const pending = video.play();
      if (pending) pending.catch(() => {});
    };

    const onEnded = () => restart();
    const onPause = () => {
      if (document.hidden) return;
      const duration = video.duration;
      const nearEnd = Number.isFinite(duration) && duration > 0 && video.currentTime >= duration - 0.4;
      if (video.ended || nearEnd) restart();
    };

    video.addEventListener('ended', onEnded);
    video.addEventListener('pause', onPause);
    if (video.paused) {
      const pending = video.play();
      if (pending) pending.catch(() => {});
    }
    return () => {
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('pause', onPause);
    };
  }, []);

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
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-5 sm:py-4">
          <Link to="/" className="flex min-w-0 items-center drop-shadow-sm">
            <BrandLogo className="text-[22px] sm:text-[26px]" tone={solidNav ? 'dark' : 'light'} />
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
              className="md-btn-primary !rounded-[10px] !px-3 !py-2 !text-xs sm:!px-6 sm:!py-2.5 sm:!text-sm"
            >
              <span className="sm:hidden">Resource Hub</span>
              <span className="hidden sm:inline">เข้าสู่ Resource Hub</span>
            </button>
          ) : (
            <Link
              to="/login"
              className="md-btn-primary !rounded-[10px] !px-3 !py-2 !text-xs sm:!px-6 sm:!py-2.5 sm:!text-sm"
            >
              <span className="sm:hidden">Resource Hub</span>
              <span className="hidden sm:inline">เข้าสู่ Resource Hub</span>
            </Link>
          )}
        </div>
      </header>

      <section className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-4 pb-20 pt-20 text-center sm:min-h-[100dvh] sm:px-5 sm:pb-16 sm:pt-24">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <video
            ref={bgVideoRef}
            className="h-full w-full scale-105 object-cover object-[center_30%] sm:object-center"
            src={HOME_BG_VIDEO}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-[#F3F2ED] sm:from-black/50 sm:via-black/30" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_40%,transparent_5%,rgba(0,0,0,0.35)_100%)] sm:bg-[radial-gradient(ellipse_65%_50%_at_50%_42%,transparent_10%,rgba(0,0,0,0.28)_100%)]" />
        </div>

        <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center home-hero-in">
          <BrandLogo className="mb-4 text-[36px] home-hero-brand sm:mb-5 sm:text-[48px] md:text-[56px]" tone="light" />
          <h1 className="max-w-[18ch] text-[1.65rem] font-black leading-tight tracking-tight text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.45)] sm:max-w-none sm:text-4xl sm:leading-snug md:text-[2.75rem] md:leading-[1.15]">
            แบบประเมินและเครื่องมือพัฒนาองค์กร
          </h1>
          <p className="mt-3 max-w-md text-sm font-semibold leading-relaxed text-white/95 drop-shadow-md sm:max-w-xl sm:text-lg">
            สำรวจศักยภาพทีมด้วยแบบประเมินและเกมเรียนรู้จาก MindDoJo
          </p>
          <div className="mt-6 flex w-full max-w-sm flex-col gap-2.5 sm:mt-7 sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-3">
            <a
              href="#assessments"
              onClick={(e) => scrollToId('assessments', e)}
              className="md-btn-primary !w-full !rounded-[10px] !py-3.5 shadow-lg shadow-black/25 sm:!w-auto sm:!py-3"
            >
              เริ่มทำแบบประเมิน
            </a>
            <a
              href="#gamification"
              onClick={(e) => scrollToId('gamification', e)}
              className="inline-flex w-full items-center justify-center rounded-[10px] border-2 border-white bg-black/30 px-6 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition hover:border-[#FFCC00] hover:bg-[#FFCC00] hover:text-black sm:w-auto sm:bg-black/25 sm:py-3"
            >
              ดูเกมทั้งหมด
            </a>
          </div>
        </div>
      </section>

      <nav
        className={`fixed inset-x-0 bottom-0 z-30 border-t border-[#C4C1B6] bg-white/95 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-6px_20px_rgba(0,0,0,0.08)] backdrop-blur-md transition md:hidden ${
          solidNav ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
        }`}
        aria-label="เมนูมือถือ"
      >
        <div className="mx-auto grid max-w-lg grid-cols-2 gap-2">
          <a
            href="#assessments"
            onClick={(e) => scrollToId('assessments', e)}
            className="inline-flex min-h-11 items-center justify-center rounded-[10px] bg-[#FFCC00] px-3 text-sm font-extrabold text-black"
          >
            แบบประเมิน
          </a>
          <a
            href="#gamification"
            onClick={(e) => scrollToId('gamification', e)}
            className="inline-flex min-h-11 items-center justify-center rounded-[10px] border border-[#C4C1B6] bg-white px-3 text-sm font-extrabold text-gray-900"
          >
            เกม
          </a>
        </div>
      </nav>

      <main className="relative z-10 -mt-6 rounded-t-[1.5rem] bg-[#F3F2ED] pb-20 shadow-[0_-12px_40px_rgba(0,0,0,0.12)] sm:-mt-8 sm:rounded-t-[2rem] sm:pb-0">
        <div className="mx-auto w-full max-w-6xl px-4 pt-7 sm:px-5 sm:pt-10">
          <section className="mb-10 sm:mb-14">
            <div className="flex flex-col items-stretch gap-4 rounded-[14px] border border-[#C4C1B6] bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.06)] sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:rounded-2xl sm:p-7">
              <div className="flex items-start gap-3 text-left sm:items-center sm:gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] bg-[#FFCC00] text-black shadow-md shadow-yellow-500/30 sm:h-14 sm:w-14 sm:rounded-2xl">
                  <BookOpen className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.25} aria-hidden />
                </span>
                <div className="min-w-0">
                  <h2 className="text-base font-extrabold text-gray-950 sm:text-xl">
                    MindDoJo <span className="text-[#8A6A00]">ResourceHub</span>
                  </h2>
                  <p className="mt-1 text-sm font-medium leading-relaxed text-gray-700 sm:max-w-xl">
                    คลังเครื่องมือเชิงกลยุทธ์ เช่น Business Model Canvas, Game Plan และ Product Strategy
                  </p>
                </div>
              </div>
              {loggedIn ? (
                <button
                  type="button"
                  onClick={() => navigate('/resourcehub')}
                  className="md-btn-primary !w-full !rounded-[10px] !py-3.5 shrink-0 sm:!w-auto sm:!py-3"
                >
                  เข้า ResourceHub
                </button>
              ) : (
                <Link
                  to="/login"
                  className="md-btn-primary !w-full !rounded-[10px] !py-3.5 shrink-0 text-center sm:!w-auto sm:!py-3"
                >
                  เข้าสู่ระบบเพื่อเข้า ResourceHub
                </Link>
              )}
            </div>
          </section>

          <section id="assessments" className="scroll-mt-20 pb-12 sm:scroll-mt-24 sm:pb-16">
            <div className="mb-5 flex flex-col gap-3 sm:mb-7 sm:gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#6B5200]">
                  <span className="h-2 w-2 rounded-full bg-[#FFCC00]" aria-hidden />
                  01 / Assessments
                </p>
                <h2 className="mt-1 text-xl font-black text-gray-950 sm:text-3xl">แบบประเมินออนไลน์ของ MindDoJo</h2>
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
                  className="md-input !rounded-[10px] !border-[#C4C1B6] !bg-white !py-3 pl-10 pr-4 text-sm font-medium sm:!py-2.5"
                />
              </label>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
              {filteredAssessments.map((item) => (
                <CardLink key={item.id} item={item} actionLabel="ดูรายละเอียด" />
              ))}
            </div>
            {filteredAssessments.length === 0 && (
              <p className="mt-8 text-center text-sm font-medium text-gray-600">ไม่พบแบบประเมินที่ตรงกับ “{query}”</p>
            )}
          </section>

          <section id="gamification" className="scroll-mt-20 pb-10 sm:scroll-mt-24 sm:pb-20">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-7">
              <div>
                <p className="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#6B5200]">
                  <span className="h-2 w-2 rounded-full bg-[#FFCC00]" aria-hidden />
                  02 / Learn through play
                </p>
                <h2 className="mt-1 text-xl font-black text-gray-950 sm:text-3xl">Gamification ของ MindDoJo</h2>
              </div>
              <span className="rounded-[10px] border border-[#C4C1B6] bg-white px-3.5 py-1.5 text-xs font-extrabold text-gray-900 shadow-sm">
                {GAMES.length} เกม
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
              {GAMES.map((item) => (
                <CardLink key={item.id} item={item} actionLabel="เข้าเล่น" />
              ))}
            </div>
          </section>
        </div>
      </main>

      <Link
        to="/admin/login"
        className="fixed bottom-[4.75rem] right-3 z-20 rounded-[10px] border border-[#C4C1B6] bg-white/95 px-2.5 py-1.5 text-[11px] font-bold text-gray-600 shadow-md backdrop-blur-sm transition hover:border-gray-500 hover:text-gray-950 sm:bottom-4 sm:right-4 sm:z-10 sm:px-3 sm:text-xs sm:text-gray-700 md:bottom-4"
        title="Login Admin MindDojo"
      >
        Admin
      </Link>

      <footer className="border-t border-[#C4C1B6] bg-white pb-[max(1rem,env(safe-area-inset-bottom))] md:pb-0">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-7 text-center sm:gap-4 sm:px-5 sm:py-8 sm:flex-row sm:text-left">
          <BrandLogo className="text-[20px]" tone="dark" />
          <span className="text-xs font-semibold text-gray-700 sm:text-sm">
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
