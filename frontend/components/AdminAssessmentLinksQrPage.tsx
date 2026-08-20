import React, { useMemo, useState } from 'react';
import { PUBLIC_SITE_URL } from '../lib/seo';

type AssessmentLinkItem = {
  id: string;
  title: string;
  href: string;
  external?: boolean;
};

const ASSESSMENT_LINKS: AssessmentLinkItem[] = [
  { id: 'minddojo-ai', title: 'MindDoJo AI Assessment', href: '/assessment/minddojo' },
  { id: 'leadership', title: 'แบบประเมินสมรรถนะภาวะผู้นำ', href: '/assessment/leadership' },
  { id: 'persuasion', title: 'Persuasion Test (Th)', href: '/assessment/persuasion' },
  { id: 'digital-leadership', title: 'Digital Leadership Competency', href: '/assessment/digital-leadership' },
  { id: 'reactive-proactive', title: 'Reactive vs Proactive Mindset', href: '/assessment/reactive-proactive-mindset' },
  { id: 'growth-fixed', title: 'Growth vs Fixed Mindset', href: '/assessment/growth-fixed-mindset' },
  { id: 'conflict-management-style', title: 'Conflict Management Style', href: '/assessment/conflict-management-style' },
  { id: 'key-principles', title: 'Key Principles Assessment', href: '/assessment/key-principles' },
  { id: 'disc', title: 'DISC Assessment', href: '/assessment/disc' },
  { id: 'mbti', title: 'MBTI Assessment', href: 'https://www.minddojo.co.th/mbti-register', external: true },
];

function toAbsoluteUrl(href: string, external?: boolean): string {
  if (external || /^https?:\/\//i.test(href)) return href;
  const origin =
    typeof window !== 'undefined' && window.location.origin.includes('localhost')
      ? PUBLIC_SITE_URL
      : typeof window !== 'undefined'
        ? window.location.origin
        : PUBLIC_SITE_URL;
  return `${origin.replace(/\/$/, '')}${href.startsWith('/') ? href : `/${href}`}`;
}

function qrImageUrl(data: string, size = 240): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&data=${encodeURIComponent(data)}`;
}

const AdminAssessmentLinksQrPage: React.FC = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const items = useMemo(
    () =>
      ASSESSMENT_LINKS.map((item) => {
        const url = toAbsoluteUrl(item.href, item.external);
        return { ...item, url };
      }),
    [],
  );

  const copyUrl = async (id: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1800);
    } catch {
      window.prompt('คัดลอกลิงก์นี้', url);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-black tracking-tight">All Link & QR Code Assessment</h1>
        <p className="text-gray-400 text-sm mt-2 max-w-2xl leading-relaxed">
          ลิงก์และ QR code ของแบบประเมินทั้งหมด — สแกนหรือแชร์ให้ผู้เข้าอบรมได้ทันที
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 flex flex-col items-center text-center shadow-lg shadow-black/20"
          >
            <h2 className="text-base font-bold text-white leading-snug min-h-[2.5rem]">{item.title}</h2>
            <img
              src={qrImageUrl(item.url)}
              alt={`QR code ${item.title}`}
              className="mt-4 w-44 h-44 rounded-xl bg-white p-2 object-contain"
              loading="lazy"
            />
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 text-xs text-yellow-400/90 hover:text-yellow-300 break-all leading-relaxed"
            >
              {item.url}
            </a>
            <div className="mt-4 flex w-full gap-2">
              <button
                type="button"
                onClick={() => void copyUrl(item.id, item.url)}
                className="flex-1 py-2 rounded-xl text-sm font-bold border border-white/15 text-gray-200 hover:bg-white/10 transition-colors"
              >
                {copiedId === item.id ? 'คัดลอกแล้ว' : 'คัดลอกลิงก์'}
              </button>
              <a
                href={qrImageUrl(item.url, 480)}
                download={`${item.id}-qr.png`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 rounded-xl text-sm font-bold bg-yellow-400 text-black hover:bg-yellow-300 transition-colors"
              >
                ดาวน์โหลด QR
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default AdminAssessmentLinksQrPage;
