export const LINK_VAULT_TABLE = 'link_vault_items';
export const LINK_VAULT_SELECT = 'id, title, url, note, sort_order, created_at, updated_at';
export const LINK_VAULT_LOCAL_KEY = 'minddojo.link-vault.v1';

export const LINK_VAULT_SQL = `-- เก็บลิ้ง — ลิงก์รวมดูได้โดยไม่ต้องล็อกอิน
-- รันใน Supabase → SQL Editor → Run

create table if not exists public.link_vault_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null,
  note text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists link_vault_items_sort_idx
  on public.link_vault_items (sort_order asc, created_at desc);

alter table public.link_vault_items enable row level security;

drop policy if exists "link_vault_items_select" on public.link_vault_items;
create policy "link_vault_items_select"
  on public.link_vault_items for select
  using (true);

drop policy if exists "link_vault_items_insert" on public.link_vault_items;
create policy "link_vault_items_insert"
  on public.link_vault_items for insert
  with check (true);

drop policy if exists "link_vault_items_update" on public.link_vault_items;
create policy "link_vault_items_update"
  on public.link_vault_items for update
  using (true)
  with check (true);

drop policy if exists "link_vault_items_delete" on public.link_vault_items;
create policy "link_vault_items_delete"
  on public.link_vault_items for delete
  using (true);
`;

export type LinkVaultItem = {
  id: string;
  title: string;
  url: string;
  note: string;
  sort_order: number;
  created_at?: string | null;
  updated_at?: string | null;
};

export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/')) return trimmed;
  return `https://${trimmed}`;
}

export function isProbablyUrl(raw: string): boolean {
  const value = normalizeUrl(raw);
  if (!value) return false;
  if (value.startsWith('/')) return value.length > 1;
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function resolveHref(url: string): string {
  const value = normalizeUrl(url);
  if (value.startsWith('/')) {
    if (typeof window === 'undefined') return value;
    return `${window.location.origin}${value}`;
  }
  return value;
}

function isValidLocalItem(row: unknown): row is LinkVaultItem {
  if (!row || typeof row !== 'object') return false;
  const item = row as LinkVaultItem;
  return (
    typeof item.id === 'string' &&
    typeof item.title === 'string' &&
    typeof item.url === 'string' &&
    typeof item.note === 'string' &&
    typeof item.sort_order === 'number'
  );
}

export function readLocalLinks(): LinkVaultItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(LINK_VAULT_LOCAL_KEY) || '[]') as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidLocalItem);
  } catch {
    return [];
  }
}

export function writeLocalLinks(items: LinkVaultItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LINK_VAULT_LOCAL_KEY, JSON.stringify(items));
  } catch {
    /* ignore quota */
  }
}

export function mapRow(row: Record<string, unknown>): LinkVaultItem {
  return {
    id: String(row.id ?? ''),
    title: String(row.title ?? '').trim() || 'ลิงก์',
    url: String(row.url ?? '').trim(),
    note: String(row.note ?? '').trim(),
    sort_order: Number(row.sort_order ?? 0) || 0,
    created_at: (row.created_at as string | null | undefined) ?? null,
    updated_at: (row.updated_at as string | null | undefined) ?? null,
  };
}
