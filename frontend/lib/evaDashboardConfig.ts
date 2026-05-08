import { isSupabaseConfigured, supabase } from './supabase';

export type EvaDashboardConfig = {

  /** ข้อความหน้า login */

  loginTitle: string;

  loginSubtitle: string;

  loginNote: string;

  loginButtonText: string;

  usernameLabel: string;

  passwordLabel: string;

  loginErrorMessage: string;

  /** ล็อกอินหน้า dashboard */

  username: string;

  password: string;

  /** หัวข้อบนหน้า dashboard */

  dashboardTitle: string;

  /** null = แสดงแบบประเมินทั้งหมดในระบบ; array (รวมว่าง []) = เฉพาะ id เหล่านั้น (ว่าง = ไม่แสดงรายการ) */

  visibleTemplateIds: string[] | null;

};



/** หนึ่ง dashboard — id ใช้ใน URL (?dash=…) */

export type EvaDashboardInstance = EvaDashboardConfig & {

  id: string;

  /** ชื่อภายใน editor (แยกจากหัวข้อที่ผู้ใช้เห็น) */

  label: string;

};



export type EvaDashboardStore = {

  version: 2;

  dashboards: EvaDashboardInstance[];

  /** เลือกไว้ล่าสุดใน eva-editor (optional) */

  editorSelectedDashboardId?: string;

};



export const EVA_DASHBOARD_CONFIG_KEY = 'minddojo.eva-dashboard.config.v1';
export const EVA_DASHBOARD_REMOTE_TABLE = 'eva_dashboard_configs';
export const EVA_DASHBOARD_REMOTE_ROW_ID = 'default';
export const EVA_DASHBOARD_REMOTE_SQL = `-- Run in Supabase SQL Editor
create table if not exists public.eva_dashboard_configs (
  id text primary key,
  store_json jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.eva_dashboard_configs enable row level security;

drop policy if exists "eva_dashboard_configs_select_policy" on public.eva_dashboard_configs;
create policy "eva_dashboard_configs_select_policy"
on public.eva_dashboard_configs
for select
to anon, authenticated
using (true);

drop policy if exists "eva_dashboard_configs_upsert_policy" on public.eva_dashboard_configs;
create policy "eva_dashboard_configs_upsert_policy"
on public.eva_dashboard_configs
for all
to anon, authenticated
using (true)
with check (true);`;



/** sessionStorage — เปิดรายการเข้าระบบต่อหนึ่ง dashboard */

export function evaDashboardAuthStorageKey(dashboardId: string): string {

  return `minddojo.eva-dashboard.auth.dash.${dashboardId}`;

}



function generateDashboardId(): string {

  try {

    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {

      return `eva-dash-${crypto.randomUUID()}`;

    }

  } catch {

    /* ignore */

  }

  return `eva-dash-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

}



export function getDefaultEvaDashboardConfig(): EvaDashboardConfig {

  return {

    loginTitle: 'All EVA Dashboard',

    loginSubtitle: 'กรุณาเข้าสู่ระบบเพื่อดูข้อมูลแบบประเมินจาก EVA Editor',

    loginNote: '* สิทธิ์หน้านี้ไม่ใช่สิทธิ์ Admin และไม่สามารถใช้แทนการเข้า Admin ได้',

    loginButtonText: 'เข้าสู่ Dashboard',

    usernameLabel: 'Username',

    passwordLabel: 'Password',

    loginErrorMessage: 'username หรือ password ไม่ถูกต้อง',

    username: 'CKPOWER',

    password: '1234',

    dashboardTitle: 'All EVA Dashboard',

    visibleTemplateIds: null,

  };

}



function stripInstanceMeta(row: Partial<EvaDashboardInstance>): Partial<EvaDashboardConfig> {
  const { id: _id, label: _label, ...rest } = row;
  return rest;
}

function mergeConfigFields(parsed: Partial<EvaDashboardConfig> | undefined): EvaDashboardConfig {

  const defaults = getDefaultEvaDashboardConfig();

  let visibleIds: string[] | null =

    parsed?.visibleTemplateIds === undefined ? defaults.visibleTemplateIds : parsed.visibleTemplateIds;

  if (visibleIds != null && !Array.isArray(visibleIds)) visibleIds = defaults.visibleTemplateIds;

  const username =

    typeof parsed?.username === 'string' && parsed.username.trim() !== ''

      ? parsed.username.trim()

      : defaults.username;

  const password =

    typeof parsed?.password === 'string' && parsed.password !== '' ? parsed.password : defaults.password;



  return {

    ...defaults,

    ...(parsed || {}),

    visibleTemplateIds: visibleIds,

    username,

    password,

  };

}



function normalizeInstance(row: Partial<EvaDashboardInstance> & { id?: string }, fallbackId?: string): EvaDashboardInstance {

  const config = mergeConfigFields(stripInstanceMeta(row));

  const id =

    typeof row?.id === 'string' && row.id.trim() !== '' ? row.id.trim() : fallbackId || generateDashboardId();

  const label =

    typeof row?.label === 'string' && row.label.trim() !== '' ? row.label.trim() : config.dashboardTitle || 'Dashboard';

  return {

    ...config,

    id,

    label,

  };

}



export function createNewEvaDashboardInstance(label?: string): EvaDashboardInstance {

  const defaults = mergeConfigFields({});

  return normalizeInstance({

    ...defaults,

    label: label?.trim() || 'Dashboard ใหม่',

    dashboardTitle: label?.trim() || 'Dashboard ใหม่',

    loginTitle: label?.trim() || defaults.loginTitle,

  });

}



export function getDefaultEvaDashboardStore(): EvaDashboardStore {

  const first = normalizeInstance(mergeConfigFields({}), generateDashboardId());

  return {

    version: 2,

    dashboards: [{ ...first, label: first.label || 'Dashboard หลัก' }],

    editorSelectedDashboardId: first.id,

  };

}



/** ถ้ามีเก็บเป็น object เดียวแบบ v1 */

function migrateLegacyV1(parsed: Record<string, unknown>): EvaDashboardStore {

  const { dashboards: _omit, version: __omit, editorSelectedDashboardId: ___omit, ...rest } = parsed as Record<

    string,

    unknown

  >;

  const config = mergeConfigFields(rest as Partial<EvaDashboardConfig>);

  const inst = normalizeInstance({ ...config, label: config.dashboardTitle || 'Dashboard หลัก' });

  return {

    version: 2,

    dashboards: [inst],

    editorSelectedDashboardId: inst.id,

  };

}



export function loadEvaDashboardStore(): EvaDashboardStore {

  if (typeof window === 'undefined') return getDefaultEvaDashboardStore();

  try {

    const raw = localStorage.getItem(EVA_DASHBOARD_CONFIG_KEY);

    if (!raw) return getDefaultEvaDashboardStore();

    const parsed = JSON.parse(raw) as unknown;



    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {

      const obj = parsed as Record<string, unknown>;

      if (Array.isArray(obj.dashboards)) {

        const list = obj.dashboards as Partial<EvaDashboardInstance>[];

        const dashboards =

          list.length === 0

            ? getDefaultEvaDashboardStore().dashboards

            : list.map((d) => normalizeInstance(d));

        let editorSelectedDashboardId =

          typeof obj.editorSelectedDashboardId === 'string' ? obj.editorSelectedDashboardId.trim() : undefined;

        if (!editorSelectedDashboardId || !dashboards.some((d) => d.id === editorSelectedDashboardId)) {

          editorSelectedDashboardId = dashboards[0]?.id;

        }

        return { version: 2, dashboards, editorSelectedDashboardId };

      }

      return migrateLegacyV1(obj);

    }

    return getDefaultEvaDashboardStore();

  } catch {

    return getDefaultEvaDashboardStore();

  }

}



export function saveEvaDashboardStore(store: EvaDashboardStore): void {

  if (typeof window === 'undefined') return;

  localStorage.setItem(

    EVA_DASHBOARD_CONFIG_KEY,

    JSON.stringify({

      version: 2,

      dashboards: store.dashboards,

      ...(store.editorSelectedDashboardId

        ? { editorSelectedDashboardId: store.editorSelectedDashboardId }

        : {}),

    })

  );

}

export async function loadEvaDashboardStoreAsync(): Promise<{
  store: EvaDashboardStore;
  from: 'supabase' | 'local';
  errorMessage: string | null;
}> {
  const localStore = loadEvaDashboardStore();
  if (!isSupabaseConfigured) {
    return { store: localStore, from: 'local', errorMessage: null };
  }
  const { data, error } = await supabase
    .from(EVA_DASHBOARD_REMOTE_TABLE)
    .select('store_json')
    .eq('id', EVA_DASHBOARD_REMOTE_ROW_ID)
    .maybeSingle();
  if (error) {
    const msg =
      /does not exist|could not find the table/i.test(error.message || '')
        ? `ยังไม่พบตาราง ${EVA_DASHBOARD_REMOTE_TABLE} ใน Supabase`
        : `โหลด Dashboard config จาก Supabase ไม่สำเร็จ: ${error.message}`;
    return { store: localStore, from: 'local', errorMessage: `${msg}\n${EVA_DASHBOARD_REMOTE_SQL}` };
  }
  const raw = data?.store_json;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { store: localStore, from: 'local', errorMessage: null };
  }
  const remoteStore = (raw as unknown) as EvaDashboardStore;
  const normalized = normalizeDashboardStore(remoteStore);
  saveEvaDashboardStore(normalized);
  return { store: normalized, from: 'supabase', errorMessage: null };
}

export async function saveEvaDashboardStoreAsync(store: EvaDashboardStore): Promise<{
  ok: boolean;
  errorMessage: string | null;
}> {
  const normalized = normalizeDashboardStore(store);
  saveEvaDashboardStore(normalized);
  if (!isSupabaseConfigured) return { ok: true, errorMessage: null };

  const { error } = await supabase.from(EVA_DASHBOARD_REMOTE_TABLE).upsert({
    id: EVA_DASHBOARD_REMOTE_ROW_ID,
    store_json: normalized,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    const msg =
      /does not exist|could not find the table/i.test(error.message || '')
        ? `ยังไม่พบตาราง ${EVA_DASHBOARD_REMOTE_TABLE} ใน Supabase`
        : `บันทึก Dashboard config ไป Supabase ไม่สำเร็จ: ${error.message}`;
    return { ok: false, errorMessage: `${msg}\n${EVA_DASHBOARD_REMOTE_SQL}` };
  }
  return { ok: true, errorMessage: null };
}

function normalizeDashboardStore(store: EvaDashboardStore): EvaDashboardStore {
  const dashboards =
    Array.isArray(store.dashboards) && store.dashboards.length > 0
      ? store.dashboards.map((d) => normalizeInstance(d))
      : getDefaultEvaDashboardStore().dashboards;
  let editorSelectedDashboardId = store.editorSelectedDashboardId;
  if (!editorSelectedDashboardId || !dashboards.some((d) => d.id === editorSelectedDashboardId)) {
    editorSelectedDashboardId = dashboards[0]?.id;
  }
  return {
    version: 2,
    dashboards,
    editorSelectedDashboardId,
  };
}



/** จาก query ?dash= หรือค่าว่าง → เลือก dashboard ที่ใช้ */

export function resolveActiveDashboard(store: EvaDashboardStore, dashId?: string | null): EvaDashboardInstance | null {

  const trimmed = dashId?.trim();

  if (trimmed) {

    const found = store.dashboards.find((d) => d.id === trimmed);

    return found ?? null;

  }

  return store.dashboards[0] ?? null;

}



export function upsertDashboardInStore(

  store: EvaDashboardStore,

  instance: EvaDashboardInstance,

  opts?: { editorSelectedId?: string }

): EvaDashboardStore {

  const idx = store.dashboards.findIndex((d) => d.id === instance.id);

  const next =

    idx >= 0

      ? store.dashboards.map((d, i) => (i === idx ? instance : d))

      : [...store.dashboards, instance];

  return {

    version: 2,

    dashboards: next,

    editorSelectedDashboardId:

      opts?.editorSelectedId ?? store.editorSelectedDashboardId ?? instance.id,

  };

}



export function removeDashboardFromStore(

  store: EvaDashboardStore,

  removeId: string,

  fallbackSelectId?: string

): EvaDashboardStore | null {

  if (store.dashboards.length <= 1) return null;

  const next = store.dashboards.filter((d) => d.id !== removeId);

  if (next.length === 0) return null;

  const prefer =

    fallbackSelectId && next.some((d) => d.id === fallbackSelectId)

      ? fallbackSelectId

      : store.editorSelectedDashboardId &&

          next.some((d) => d.id === store.editorSelectedDashboardId) &&

          store.editorSelectedDashboardId !== removeId

        ? store.editorSelectedDashboardId

        : next[0].id;

  return {

    version: 2,

    dashboards: next,

    editorSelectedDashboardId: prefer,

  };

}



export function filterTemplatesForDashboard<T extends { id: string }>(templates: T[], config: EvaDashboardConfig): T[] {

  const ids = config.visibleTemplateIds;

  if (ids == null) return templates;

  if (ids.length === 0) return [];

  const set = new Set(ids);

  return templates.filter((t) => set.has(t.id));

}



/** @deprecated ใช้ loadEvaDashboardStore + resolveActiveDashboard — เก็บเพื่อเข้ากับโค้ดเก่า */

export function loadEvaDashboardConfig(): EvaDashboardConfig {

  const store = loadEvaDashboardStore();

  const first = store.dashboards[0];

  return first ? ({ ...first } as EvaDashboardConfig) : getDefaultEvaDashboardConfig();

}



/** @deprecated ใช้ saveEvaDashboardStore */

export function saveEvaDashboardConfig(config: EvaDashboardConfig): void {

  const store = loadEvaDashboardStore();

  if (store.dashboards.length === 0) {

    const inst = normalizeInstance(config);

    saveEvaDashboardStore({ version: 2, dashboards: [inst], editorSelectedDashboardId: inst.id });

    return;

  }

  const firstId = store.dashboards[0].id;

  const merged = normalizeInstance(

    {

      ...(store.dashboards[0] as EvaDashboardInstance),

      ...config,

      id: firstId,

    },

    firstId

  );

  saveEvaDashboardStore(upsertDashboardInStore(store, merged));

}


