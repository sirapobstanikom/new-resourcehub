import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  LINK_VAULT_LOCAL_KEY,
  LINK_VAULT_SELECT,
  LINK_VAULT_SQL,
  LINK_VAULT_TABLE,
  type LinkVaultItem,
  isProbablyUrl,
  mapRow,
  normalizeUrl,
  readLocalLinks,
  resolveHref,
  writeLocalLinks,
} from '../lib/linkVault';

function newLocalId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const LinkVaultPage: React.FC = () => {
  const [items, setItems] = useState<LinkVaultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsSql, setNeedsSql] = useState(false);
  const [useLocal, setUseLocal] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pageCopied, setPageCopied] = useState(false);

  const pageUrl = useMemo(() => {
    if (typeof window === 'undefined') return '/links';
    return window.location.href;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!isSupabaseConfigured) {
      setUseLocal(true);
      setNeedsSql(false);
      setItems(readLocalLinks());
      setLoading(false);
      return;
    }

    const { data, error: fetchError } = await supabase
      .from(LINK_VAULT_TABLE)
      .select(LINK_VAULT_SELECT)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (fetchError) {
      const missing =
        /relation|does not exist|could not find|schema cache/i.test(fetchError.message) ||
        fetchError.code === '42P01' ||
        fetchError.code === 'PGRST205';
      setNeedsSql(missing);
      setUseLocal(true);
      setItems(readLocalLinks());
      if (!missing) setError(fetchError.message);
      setLoading(false);
      return;
    }

    setNeedsSql(false);
    setUseLocal(false);
    setItems((data || []).map((row) => mapRow(row as Record<string, unknown>)));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextTitle = title.trim();
    const nextUrl = normalizeUrl(url);
    const nextNote = note.trim();

    if (!nextTitle) {
      setError('กรุณาใส่ชื่อลิงก์');
      return;
    }
    if (!isProbablyUrl(nextUrl)) {
      setError('กรุณาใส่ลิงก์ให้ถูกต้อง (เช่น https://... หรือ /evaluation/innoclub)');
      return;
    }

    setSaving(true);
    setError(null);

    if (useLocal || !isSupabaseConfigured) {
      const next: LinkVaultItem = {
        id: newLocalId(),
        title: nextTitle,
        url: nextUrl,
        note: nextNote,
        sort_order: items.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const merged = [next, ...items];
      writeLocalLinks(merged);
      setItems(merged);
      setTitle('');
      setUrl('');
      setNote('');
      setSaving(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from(LINK_VAULT_TABLE)
      .insert({
        title: nextTitle,
        url: nextUrl,
        note: nextNote,
        sort_order: items.length,
        updated_at: new Date().toISOString(),
      })
      .select(LINK_VAULT_SELECT)
      .single();

    if (insertError || !data) {
      setError(insertError?.message || 'บันทึกไม่สำเร็จ');
      setSaving(false);
      return;
    }

    setItems((prev) => [mapRow(data as Record<string, unknown>), ...prev]);
    setTitle('');
    setUrl('');
    setNote('');
    setSaving(false);
  };

  const handleDelete = async (item: LinkVaultItem) => {
    if (!window.confirm(`ลบลิงก์ “${item.title}” ไหม?`)) return;
    setError(null);

    if (useLocal || !isSupabaseConfigured || item.id.startsWith('local-')) {
      const merged = items.filter((row) => row.id !== item.id);
      writeLocalLinks(merged);
      setItems(merged);
      return;
    }

    const { error: deleteError } = await supabase.from(LINK_VAULT_TABLE).delete().eq('id', item.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setItems((prev) => prev.filter((row) => row.id !== item.id));
  };

  const copyText = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1600);
    } catch {
      setError('คัดลอกไม่สำเร็จ');
    }
  };

  const copyPageLink = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setPageCopied(true);
      window.setTimeout(() => setPageCopied(false), 1600);
    } catch {
      setError('คัดลอกลิงก์หน้านี้ไม่สำเร็จ');
    }
  };

  return (
    <div className="min-h-dvh bg-[#F3F2ED] text-gray-900">
      <header className="border-b border-[#D6D4CC] bg-white/90 px-4 py-3 backdrop-blur-sm sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <Link to="/" className="inline-flex items-center gap-2 rounded-xl border border-[#D6D4CC] bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:border-yellow-400">
            ← หน้าหลัก
          </Link>
          <BrandLogo className="text-[18px] sm:text-[22px]" tone="dark" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <section className="rounded-3xl border border-[#D6D4CC] bg-white p-5 shadow-sm sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-yellow-700">MindDoJo Link Vault</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">เก็บลิ้ง</h1>
          <p className="mt-2 text-sm leading-relaxed text-gray-600 sm:text-base">
            รวมลิงก์ไว้ที่เดียว ส่งหน้านี้ให้คนอื่นเข้าดูได้โดยไม่ต้องล็อกอิน
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void copyPageLink()}
              className="inline-flex min-h-11 items-center rounded-xl border border-[#D6D4CC] bg-[#FFF8D6] px-4 text-sm font-bold text-gray-900 hover:border-yellow-500"
            >
              {pageCopied ? 'คัดลอกแล้ว' : 'คัดลอกลิงก์หน้านี้'}
            </button>
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex min-h-11 items-center rounded-xl border border-[#D6D4CC] bg-white px-4 text-sm font-semibold text-gray-700 hover:border-yellow-400"
            >
              รีเฟรช
            </button>
          </div>

          {useLocal && (
            <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              โหมดเครื่องนี้ ({LINK_VAULT_LOCAL_KEY}) — คนอื่นจะยังไม่เห็นจนกว่ารัน SQL ใน Supabase
            </p>
          )}

          {needsSql && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
              <p className="font-semibold">ยังไม่มีตารางใน Supabase — รัน SQL นี้ก่อน:</p>
              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-xl bg-white/80 p-3 text-xs text-gray-800">
                {LINK_VAULT_SQL}
              </pre>
            </div>
          )}
        </section>

        <section className="mt-6 rounded-3xl border border-[#D6D4CC] bg-white p-5 shadow-sm sm:p-8">
          <h2 className="text-lg font-semibold text-gray-900">เพิ่มลิงก์</h2>
          <form className="mt-4 space-y-3" onSubmit={(e) => void handleAdd(e)}>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">ชื่อลิงก์</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="เช่น แบบประเมิน InnoClub"
                className="w-full rounded-xl border border-[#D6D4CC] bg-white px-3 py-3 text-base outline-none focus:border-yellow-500"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">URL</span>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://... หรือ /evaluation/innoclub"
                className="w-full rounded-xl border border-[#D6D4CC] bg-white px-3 py-3 text-base outline-none focus:border-yellow-500"
                inputMode="url"
                autoCapitalize="off"
                autoCorrect="off"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">หมายเหตุ (ถ้ามี)</span>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="เช่น สำหรับทีมขาย / ใช้ในวันอบรม"
                className="w-full rounded-xl border border-[#D6D4CC] bg-white px-3 py-3 text-base outline-none focus:border-yellow-500"
              />
            </label>
            {error && <p className="text-sm font-medium text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#FFCC00] px-4 text-base font-bold text-black shadow-[0_3px_0_#E09B00] disabled:opacity-60 sm:w-auto"
            >
              {saving ? 'กำลังบันทึก…' : 'บันทึกลิงก์'}
            </button>
          </form>
        </section>

        <section className="mt-6 space-y-3">
          <div className="flex items-end justify-between gap-3 px-1">
            <h2 className="text-lg font-semibold text-gray-900">ลิงก์ทั้งหมด</h2>
            <p className="text-sm font-medium text-gray-500">{items.length} รายการ</p>
          </div>

          {loading ? (
            <p className="rounded-2xl border border-[#D6D4CC] bg-white px-4 py-6 text-center text-sm text-gray-500">
              กำลังโหลด…
            </p>
          ) : items.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[#D6D4CC] bg-white/70 px-4 py-8 text-center text-sm text-gray-500">
              ยังไม่มีลิงก์ — เพิ่มรายการด้านบนได้เลย
            </p>
          ) : (
            items.map((item) => {
              const href = resolveHref(item.url);
              return (
                <article
                  key={item.id}
                  className="rounded-2xl border border-[#D6D4CC] bg-white p-4 shadow-sm sm:p-5"
                >
                  <h3 className="text-base font-bold text-gray-900 sm:text-lg">{item.title}</h3>
                  {item.note ? <p className="mt-1 text-sm text-gray-600">{item.note}</p> : null}
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 block break-all text-sm font-medium text-blue-700 underline-offset-2 hover:underline"
                  >
                    {item.url}
                  </a>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-10 items-center rounded-xl bg-[#FFCC00] px-3 text-sm font-bold text-black"
                    >
                      เปิดลิงก์
                    </a>
                    <button
                      type="button"
                      onClick={() => void copyText(href, item.id)}
                      className="inline-flex min-h-10 items-center rounded-xl border border-[#D6D4CC] bg-white px-3 text-sm font-semibold text-gray-700 hover:border-yellow-400"
                    >
                      {copiedId === item.id ? 'คัดลอกแล้ว' : 'คัดลอก'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(item)}
                      className="inline-flex min-h-10 items-center rounded-xl border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700 hover:border-red-300"
                    >
                      ลบ
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </main>
    </div>
  );
};

export default LinkVaultPage;
