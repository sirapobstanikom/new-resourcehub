import React, { useEffect, useMemo, useState } from 'react';
import { PUBLIC_SITE_URL } from '../lib/seo';

type LinkCategory = 'assessment' | 'eva';

type LinkItem = {
  id: string;
  title: string;
  href: string;
  category: LinkCategory;
};

const STORAGE_KEY = 'minddojo.admin-link-qr.v2';
const LEGACY_STORAGE_KEY = 'minddojo.admin-link-qr.v1';

const BUILTIN_LINKS: LinkItem[] = [
  { id: 'minddojo-ai', title: 'MindDoJo AI Assessment', href: '/assessment/minddojo', category: 'assessment' },
  { id: 'leadership', title: 'แบบประเมินสมรรถนะภาวะผู้นำ', href: '/assessment/leadership', category: 'assessment' },
  { id: 'persuasion', title: 'Persuasion Test (Th)', href: '/assessment/persuasion', category: 'assessment' },
  { id: 'digital-leadership', title: 'Digital Leadership Competency', href: '/assessment/digital-leadership', category: 'assessment' },
  { id: 'reactive-proactive', title: 'Reactive vs Proactive Mindset', href: '/assessment/reactive-proactive-mindset', category: 'assessment' },
  { id: 'growth-fixed', title: 'Growth vs Fixed Mindset', href: '/assessment/growth-fixed-mindset', category: 'assessment' },
  { id: 'conflict-management-style', title: 'Conflict Management Style', href: '/assessment/conflict-management-style', category: 'assessment' },
  { id: 'key-principles', title: 'Key Principles Assessment', href: '/assessment/key-principles', category: 'assessment' },
  { id: 'disc', title: 'DISC Assessment', href: '/assessment/disc', category: 'assessment' },
  { id: 'mbti', title: 'MBTI Assessment', href: 'https://www.minddojo.co.th/mbti-register', category: 'assessment' },
  { id: 'eva-innoclub', title: 'แบบประเมิน InnoClub', href: '/evaluation/innoclub', category: 'eva' },
  { id: 'eva-innoclub-2', title: 'แบบประเมิน InnoClub ครั้งที่ 2', href: '/evaluation/innoclub-2', category: 'eva' },
  { id: 'eva-innovation', title: 'แบบประเมิน Innovation', href: '/evaluation/innovation', category: 'eva' },
  { id: 'eva-editor', title: 'Eva editor', href: '/evaluation/eva-editor', category: 'eva' },
  { id: 'eva-one-page', title: 'Eva สรุป 1 หน้า', href: '/evaluation/eva-one-page', category: 'eva' },
  { id: 'eva-dashboard', title: 'Eva Dashboard', href: '/evaluation/dashboard', category: 'eva' },
  { id: 'eva-hogwarts', title: 'Hogwarts InnoClub', href: '/evaluation/innoclub-hogwarts', category: 'eva' },
  { id: 'eva-hogwarts-guest', title: 'Guest Hogwarts', href: '/evaluation/innoclub-hogwarts-guest', category: 'eva' },
];

function isValidItem(row: unknown): row is LinkItem {
  if (!row || typeof row !== 'object') return false;
  const item = row as LinkItem;
  return (
    typeof item.id === 'string' &&
    typeof item.title === 'string' &&
    typeof item.href === 'string' &&
    (item.category === 'assessment' || item.category === 'eva')
  );
}

function parseLinkList(raw: string | null): LinkItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidItem).map((item) => ({
      id: item.id,
      title: item.title,
      href: item.href,
      category: item.category,
    }));
  } catch {
    return [];
  }
}

function readStoredLinks(): LinkItem[] {
  if (typeof window === 'undefined') return [...BUILTIN_LINKS];
  const current = parseLinkList(localStorage.getItem(STORAGE_KEY));
  if (current.length > 0) return current;

  const legacyCustom = parseLinkList(localStorage.getItem(LEGACY_STORAGE_KEY));
  if (legacyCustom.length > 0) {
    const merged = [...BUILTIN_LINKS, ...legacyCustom.filter((item) => !BUILTIN_LINKS.some((b) => b.id === item.id))];
    writeStoredLinks(merged);
    return merged;
  }
  return [...BUILTIN_LINKS];
}

function writeStoredLinks(items: LinkItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* ignore quota */
  }
}

function toAbsoluteUrl(href: string): string {
  const trimmed = href.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const origin =
    typeof window !== 'undefined' && window.location.origin.includes('localhost')
      ? PUBLIC_SITE_URL
      : typeof window !== 'undefined'
        ? window.location.origin
        : PUBLIC_SITE_URL;
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${origin.replace(/\/$/, '')}${path}`;
}

function qrImageUrl(data: string, size = 240): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&data=${encodeURIComponent(data)}`;
}

type CardItem = LinkItem & { url: string };

const LinkCard: React.FC<{
  item: CardItem;
  copiedId: string | null;
  onCopy: (id: string, url: string) => void;
  onEdit: (item: LinkItem) => void;
  onDelete: (id: string) => void;
}> = ({ item, copiedId, onCopy, onEdit, onDelete }) => (
  <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 flex flex-col items-center text-center shadow-lg shadow-black/20">
    <h3 className="text-base font-bold text-white leading-snug min-h-[2.5rem]">{item.title}</h3>
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
        onClick={() => onCopy(item.id, item.url)}
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
    <div className="mt-2 flex w-full gap-2">
      <button
        type="button"
        onClick={() => onEdit(item)}
        className="flex-1 py-2 rounded-xl text-sm font-bold border border-white/15 text-gray-200 hover:bg-white/10 transition-colors"
      >
        แก้ไข
      </button>
      <button
        type="button"
        onClick={() => onDelete(item.id)}
        className="flex-1 py-2 rounded-xl text-sm font-bold border border-red-400/30 text-red-300 hover:bg-red-500/10 transition-colors"
      >
        ลบ
      </button>
    </div>
  </article>
);

const AdminAssessmentLinksQrPage: React.FC = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [links, setLinks] = useState<LinkItem[]>(BUILTIN_LINKS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [href, setHref] = useState('');
  const [category, setCategory] = useState<LinkCategory>('assessment');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setLinks(readStoredLinks());
  }, []);

  const persist = (next: LinkItem[]) => {
    setLinks(next);
    writeStoredLinks(next);
  };

  const cards = useMemo<CardItem[]>(
    () => links.map((item) => ({ ...item, url: toAbsoluteUrl(item.href) })),
    [links],
  );
  const assessmentItems = cards.filter((item) => item.category === 'assessment');
  const evaItems = cards.filter((item) => item.category === 'eva');
  const isEditing = Boolean(editingId);

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setHref('');
    setCategory('assessment');
    setFormError(null);
  };

  const copyUrl = async (id: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1800);
    } catch {
      window.prompt('คัดลอกลิงก์นี้', url);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextTitle = title.trim();
    const nextHref = href.trim();
    if (!nextTitle || !nextHref) {
      setFormError('กรอกชื่อและลิงก์ให้ครบ');
      return;
    }

    if (editingId) {
      persist(
        links.map((item) =>
          item.id === editingId ? { ...item, title: nextTitle, href: nextHref, category } : item,
        ),
      );
    } else {
      persist([
        ...links,
        {
          id: `custom-${Date.now()}`,
          title: nextTitle,
          href: nextHref,
          category,
        },
      ]);
    }
    resetForm();
  };

  const handleEdit = (item: LinkItem) => {
    setEditingId(item.id);
    setTitle(item.title);
    setHref(item.href);
    setCategory(item.category);
    setFormError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string) => {
    const target = links.find((item) => item.id === id);
    if (!target) return;
    if (!window.confirm(`ลบ “${target.title}” ใช่ไหม?`)) return;
    persist(links.filter((item) => item.id !== id));
    if (editingId === id) resetForm();
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-black tracking-tight">All Link & QR Code Assessment</h1>
        <p className="text-gray-400 text-sm mt-2 max-w-2xl leading-relaxed">
          ลิงก์และ QR code แยกหมวด Assessment และ EVA — เพิ่ม แก้ไข และลบได้
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mb-10 rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-5 md:p-6 space-y-4"
      >
        <h2 className="text-sm font-bold uppercase tracking-wider text-yellow-400">
          {isEditing ? 'แก้ไขลิงก์' : 'เพิ่มลิงก์'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr_auto] gap-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="ชื่อ เช่น Growth Mindset"
            className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
          />
          <input
            type="text"
            value={href}
            onChange={(e) => setHref(e.target.value)}
            placeholder="ลิงก์ เช่น /assessment/disc หรือ https://..."
            className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
          />
          <button
            type="submit"
            className="px-5 py-3 rounded-xl font-bold bg-yellow-400 text-black hover:bg-yellow-300 transition-colors"
          >
            {isEditing ? 'บันทึก' : 'เพิ่ม'}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="inline-flex items-center gap-2 text-gray-300 cursor-pointer">
            <input
              type="radio"
              name="link-category"
              checked={category === 'assessment'}
              onChange={() => setCategory('assessment')}
              className="accent-yellow-400"
            />
            Assessment
          </label>
          <label className="inline-flex items-center gap-2 text-gray-300 cursor-pointer">
            <input
              type="radio"
              name="link-category"
              checked={category === 'eva'}
              onChange={() => setCategory('eva')}
              className="accent-yellow-400"
            />
            EVA
          </label>
          {isEditing && (
            <button
              type="button"
              onClick={resetForm}
              className="text-gray-400 hover:text-white underline underline-offset-2"
            >
              ยกเลิกการแก้ไข
            </button>
          )}
        </div>
        {formError && <p className="text-sm text-red-400">{formError}</p>}
      </form>

      <section className="mb-12">
        <h2 className="text-xl font-black mb-4">Assessment</h2>
        {assessmentItems.length === 0 ? (
          <p className="text-sm text-gray-500">ยังไม่มีรายการในหมวดนี้</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {assessmentItems.map((item) => (
              <LinkCard
                key={item.id}
                item={item}
                copiedId={copiedId}
                onCopy={copyUrl}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-black mb-4">EVA</h2>
        {evaItems.length === 0 ? (
          <p className="text-sm text-gray-500">ยังไม่มีรายการในหมวดนี้</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {evaItems.map((item) => (
              <LinkCard
                key={item.id}
                item={item}
                copiedId={copiedId}
                onCopy={copyUrl}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminAssessmentLinksQrPage;
