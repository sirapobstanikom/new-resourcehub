import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isAuthenticated } from '../lib/auth';

const ASSESSMENTS = [
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
    href: '#',
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
  const loggedIn = isAuthenticated();

  return (
    <div className="min-h-screen bg-black text-white bg-grid flex flex-col selection:bg-yellow-400 selection:text-black">
      {/* Header */}
      <header className="flex justify-between items-center px-6 py-6 max-w-6xl mx-auto w-full">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center glow-yellow">
            <span className="text-black font-black text-xl">M</span>
          </div>
          <span className="text-xl font-bold tracking-tighter">MindDoJo</span>
        </Link>
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
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="text-4xl md:text-7xl font-black tracking-tighter leading-tight mb-4">
          Welcome to <span className="text-yellow-400">MindDoJo</span>
        </h1>
        <p className="text-gray-400 text-lg md:text-xl max-w-xl mb-14">
          แพลตฟอร์มสำหรับการประเมิน เครื่องมือ และความรู้เพื่อพัฒนาองค์กร
        </p>
      </section>

      {/* ResourceHub CTA */}
      <section className="px-6 pb-20 max-w-4xl mx-auto w-full">
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 md:p-10 text-center">
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
