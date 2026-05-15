import React, { Fragment, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  evaDashboardAuthStorageKey,
  filterTemplatesForDashboard,
  loadEvaDashboardStoreAsync,
  type EvaDashboardStore,
  resolveActiveDashboard,
} from '../lib/evaDashboardConfig';
import {
  EVA_DEFAULT_COMMITMENT_HEADERS,
  loadStoredEvaTemplates,
  type EvaEvaluationTemplate,
} from '../lib/evaTemplates';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { EvaAnswerHoverPopover } from './EvaAnswerHoverPopover';

type TemplateSummary = EvaEvaluationTemplate & {
  responseCount: number;
};

type ResponseAnswer = {
  prompt?: string;
  subPrompt?: string;
  answer?: string;
  promptType?: string;
  tableRow?: number;
  commitmentColumn?: 'commitment' | 'by_when' | 'how_know';
  commitmentHeaders?: [string, string, string];
};

type AnswerDisplayBlock =
  | { kind: 'plain'; answer: ResponseAnswer }
  | {
      kind: 'commitment_table';
      prompt: string;
      headers: [string, string, string];
      rows: Array<{ rowIndex: number; commitment: string; byWhen: string; howKnow: string }>;
    }
  | { kind: 'commitment_table_legacy'; prompt: string; items: ResponseAnswer[] };

function buildAnswerDisplayBlocks(answers: ResponseAnswer[]): AnswerDisplayBlock[] {
  const blocks: AnswerDisplayBlock[] = [];
  let i = 0;
  while (i < answers.length) {
    const cur = answers[i];
    if (cur?.promptType === 'commitment_table') {
      const prompt = cur.prompt || '';
      const isNew = typeof cur.tableRow === 'number';
      const collected: ResponseAnswer[] = [];
      while (i < answers.length) {
        const a = answers[i];
        if (a?.promptType !== 'commitment_table' || (a.prompt || '') !== prompt) break;
        const aNew = typeof a.tableRow === 'number';
        if (isNew !== aNew) break;
        collected.push(a);
        i += 1;
      }
      if (isNew) {
        const headersEntry = collected.find(
          (e) => Array.isArray(e.commitmentHeaders) && (e.commitmentHeaders as string[]).length === 3
        );
        const headers = headersEntry?.commitmentHeaders
          ? ([...headersEntry.commitmentHeaders] as [string, string, string])
          : EVA_DEFAULT_COMMITMENT_HEADERS;
        const rowMap = new Map<number, { commitment: string; byWhen: string; howKnow: string }>();
        for (const e of collected) {
          const tr = e.tableRow as number;
          if (!rowMap.has(tr)) rowMap.set(tr, { commitment: '', byWhen: '', howKnow: '' });
          const row = rowMap.get(tr)!;
          const ans = (e.answer ?? '').trim();
          if (e.commitmentColumn === 'commitment') row.commitment = ans;
          else if (e.commitmentColumn === 'by_when') row.byWhen = ans;
          else if (e.commitmentColumn === 'how_know') row.howKnow = ans;
        }
        const rows = [...rowMap.keys()]
          .sort((a, b) => a - b)
          .map((rowIndex) => ({ rowIndex, ...rowMap.get(rowIndex)! }));
        blocks.push({ kind: 'commitment_table', prompt, headers, rows });
      } else {
        blocks.push({ kind: 'commitment_table_legacy', prompt, items: collected });
      }
    } else {
      blocks.push({ kind: 'plain', answer: cur });
      i += 1;
    }
  }
  return blocks;
}

type ResponseRow = {
  rowId?: string;
  templateId: string;
  templateName: string;
  createdAt: string;
  answers: ResponseAnswer[];
};

type UserCard = {
  userName: string;
  responseCount: number;
  latestAt: string;
  submissions: ResponseRow[];
};

const EVA_DASHBOARD_RLS_SQL = `-- Run in Supabase SQL Editor
grant select, delete on table public.eva_editor_responses to anon, authenticated;

drop policy if exists "eva_editor_responses_select_policy" on public.eva_editor_responses;
create policy "eva_editor_responses_select_policy"
on public.eva_editor_responses
for select
to anon, authenticated
using (true);

drop policy if exists "eva_editor_responses_delete_policy" on public.eva_editor_responses;
create policy "eva_editor_responses_delete_policy"
on public.eva_editor_responses
for delete
to anon, authenticated
using (true);`;

const normalizeUserName = (value: string | undefined): string => {
  const cleaned = (value || '').replace(/\s+/g, ' ').trim();
  return cleaned || 'ไม่ระบุชื่อ';
};

const formatThaiDateTime = (value: string): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

const EvaDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dashParam = searchParams.get('dash');
  const [dashStore, setDashStore] = useState<EvaDashboardStore | null>(null);
  const [loadingDashStore, setLoadingDashStore] = useState(true);
  const dashInstance = useMemo(
    () => (dashStore ? resolveActiveDashboard(dashStore, dashParam) : null),
    [dashStore, dashParam]
  );

  const hasDashboardAuth =
    !!dashInstance &&
    typeof window !== 'undefined' &&
    sessionStorage.getItem(evaDashboardAuthStorageKey(dashInstance.id)) === '1';

  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedUserName, setSelectedUserName] = useState<string>('');
  const [userSearch, setUserSearch] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [deletingUserName, setDeletingUserName] = useState<string | null>(null);
  const [exportingTemplateId, setExportingTemplateId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const loadDashStore = async () => {
      const loaded = await loadEvaDashboardStoreAsync();
      if (cancelled) return;
      setDashStore(loaded.store);
      if (loaded.errorMessage) setError(loaded.errorMessage);
      setLoadingDashStore(false);
    };
    void loadDashStore();
    return () => {
      cancelled = true;
    };
  }, [dashParam]);

  const selectedTemplate = useMemo(
    () => templates.find((item) => item.id === selectedTemplateId) || null,
    [templates, selectedTemplateId]
  );

  const selectedTemplateResponses = useMemo(() => {
    if (!selectedTemplate) return [];
    return responses
      .filter(
        (item) =>
          item.templateId === selectedTemplate.id ||
          (!item.templateId && item.templateName === selectedTemplate.name)
      )
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [responses, selectedTemplate]);

  const userCards = useMemo<UserCard[]>(() => {
    const groups = new Map<string, ResponseRow[]>();
    selectedTemplateResponses.forEach((row) => {
      const firstAnswer = row.answers[0]?.answer || '';
      const userName = normalizeUserName(firstAnswer);
      const existing = groups.get(userName) || [];
      groups.set(userName, [...existing, row]);
    });

    return Array.from(groups.entries())
      .map(([userName, submissions]) => ({
        userName,
        responseCount: submissions.length,
        latestAt: submissions[0]?.createdAt || '',
        submissions,
      }))
      .sort((a, b) => b.latestAt.localeCompare(a.latestAt));
  }, [selectedTemplateResponses]);

  const selectedUserCard = useMemo(
    () => userCards.find((item) => item.userName === selectedUserName) || null,
    [userCards, selectedUserName]
  );

  const filteredUserCards = useMemo(() => {
    const keyword = userSearch.trim().toLowerCase();
    if (!keyword) return userCards;
    return userCards.filter((item) => item.userName.toLowerCase().includes(keyword));
  }, [userCards, userSearch]);

  useEffect(() => {
    if (!selectedUserCard) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [selectedUserCard]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [sidebarOpen]);

  useEffect(() => {
    if (!hasDashboardAuth) return;

    const loadDashboardData = async () => {
      setLoading(true);
      setError(null);

      const localTemplates = loadStoredEvaTemplates();
      const localMap = new Map<string, TemplateSummary>(
        localTemplates.map((item) => [item.id, { ...item, responseCount: 0 }])
      );

      let remoteTemplates: EvaEvaluationTemplate[] = [];
      if (isSupabaseConfigured) {
        const { data, error: templatesError } = await supabase
          .from('eva_editor_templates')
          .select('id, name, description, prompts_json, updated_at')
          .order('updated_at', { ascending: false });

        if (templatesError) {
          setError(
            /does not exist|could not find the table/i.test(templatesError.message || '')
              ? 'ยังไม่พบตาราง eva_editor_templates ใน Supabase'
              : `โหลดแบบประเมินจาก Supabase ไม่สำเร็จ (${templatesError.message})`
          );
        } else {
          remoteTemplates = (data || []).map((row) => ({
            id: row.id as string,
            name: row.name as string,
            description: (row.description as string) || '',
            prompts: Array.isArray(row.prompts_json) ? (row.prompts_json as EvaEvaluationTemplate['prompts']) : [],
            updatedAt: (row.updated_at as string) || new Date().toISOString(),
          }));
        }
      }

      const sourceTemplates = remoteTemplates.length > 0 ? remoteTemplates : localTemplates;
      sourceTemplates.forEach((item) => {
        localMap.set(item.id, { ...item, responseCount: localMap.get(item.id)?.responseCount || 0 });
      });

      let remoteRows: ResponseRow[] = [];

      if (isSupabaseConfigured) {
        const { data: countRows, error: countError } = await supabase
          .from('eva_editor_responses')
          .select('id, template_id, template_name, created_at, answers_json');

        if (!countError && Array.isArray(countRows)) {
          const counts = new Map<string, number>();
          for (const row of countRows) {
            const id = (row.template_id as string | null) || '';
            const name = (row.template_name as string | null) || '';
            remoteRows.push({
              rowId: (row.id as string | null) || undefined,
              templateId: id,
              templateName: name,
              createdAt: (row.created_at as string | null) || '',
              answers: Array.isArray(row.answers_json) ? (row.answers_json as ResponseAnswer[]) : [],
            });
            if (id) counts.set(id, (counts.get(id) || 0) + 1);
            if (!id && name) counts.set(name, (counts.get(name) || 0) + 1);
          }

          localMap.forEach((item, key) => {
            const byId = counts.get(item.id) || 0;
            const byName = counts.get(item.name) || 0;
            localMap.set(key, { ...item, responseCount: byId || byName });
          });
        } else if (countError && !error) {
          const rlsBlocked = /row-level security|permission denied|42501/i.test(countError.message || '');
          setError(
            /does not exist|could not find the table/i.test(countError.message || '')
              ? 'ยังไม่พบตาราง eva_editor_responses ใน Supabase'
              : rlsBlocked
                ? `ยังไม่มีสิทธิ์ Dashboard สำหรับอ่านข้อมูลผู้ตอบ (ไม่ต้องล็อกอินแอดมิน)\nให้รัน SQL นี้ใน Supabase:\n${EVA_DASHBOARD_RLS_SQL}`
                : `โหลดจำนวนคำตอบไม่สำเร็จ (${countError.message})`
          );
        }
      } else {
        setError('Dashboard นี้อ่านข้อมูลผู้ตอบจากฐานข้อมูลเท่านั้น กรุณาตั้งค่า Supabase ก่อนใช้งาน');
      }

      const sorted = Array.from(localMap.values()).sort((a, b) =>
        (b.updatedAt || '').localeCompare(a.updatedAt || '')
      );

      const inst = dashStore ? resolveActiveDashboard(dashStore, dashParam) : null;
      if (!inst) {
        setTemplates([]);
        setResponses([]);
        setLoading(false);
        return;
      }
      const visibleSorted = filterTemplatesForDashboard(sorted, inst);

      setTemplates(visibleSorted);
      setResponses(remoteRows);
      setSelectedTemplateId((current) => {
        if (visibleSorted.length === 0) return '';
        if (current && visibleSorted.some((t) => t.id === current)) return current;
        return visibleSorted[0]?.id || '';
      });
      setSelectedUserName('');
      setUserSearch('');
      setLoading(false);
    };

    loadDashboardData();
  }, [hasDashboardAuth, dashParam, dashStore, refreshKey]);

  useEffect(() => {
    if (!hasDashboardAuth || !isSupabaseConfigured) return;
    const channel = supabase
      .channel(`eva-dashboard-live-${dashInstance?.id || 'default'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'eva_editor_responses' },
        () => {
          setRefreshKey((k) => k + 1);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'eva_editor_templates' },
        () => {
          setRefreshKey((k) => k + 1);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [hasDashboardAuth, dashInstance?.id]);

  if (loadingDashStore) {
    return (
      <div className="min-h-screen bg-transparent text-white bg-grid flex items-center justify-center">
        <p className="text-sm text-gray-300">กำลังโหลดการตั้งค่า Dashboard...</p>
      </div>
    );
  }

  const isRowInSelectedTemplate = (item: ResponseRow): boolean => {
    if (!selectedTemplate) return false;
    return item.templateId === selectedTemplate.id || (!item.templateId && item.templateName === selectedTemplate.name);
  };

  const isRowOwnedByUser = (item: ResponseRow, userName: string): boolean =>
    normalizeUserName(item.answers[0]?.answer || '') === userName;

  const deleteUserCard = async (userName: string) => {
    if (!selectedTemplate) return;
    if (
      !window.confirm(
        `ยืนยันการลบข้อมูลผู้ตอบ "${userName}"?\n\n` +
          'ข้อมูลจะถูกลบถาวร และไม่สามารถดึงกลับมาได้อีก'
      )
    )
      return;

    setDeletingUserName(userName);
    setError(null);

    try {
      const targetRows = responses.filter((item) => isRowInSelectedTemplate(item) && isRowOwnedByUser(item, userName));
      const supabaseIds = targetRows.map((item) => item.rowId).filter(Boolean) as string[];

      if (isSupabaseConfigured) {
        let idsToDelete = [...supabaseIds];

        // Fallback: ดึงจาก Supabase ตรงๆ อีกรอบ เผื่อใน state ยังไม่มี rowId ครบ
        if (idsToDelete.length === 0) {
          const { data: rowsById, error: byIdError } = await supabase
            .from('eva_editor_responses')
            .select('id, template_id, template_name, answers_json')
            .eq('template_id', selectedTemplate.id);
          if (byIdError) {
            const rlsBlocked = /row-level security|permission denied|42501/i.test(byIdError.message || '');
            setError(
              rlsBlocked
                ? `ยังไม่มีสิทธิ์ Dashboard สำหรับอ่านข้อมูลผู้ตอบ (ไม่ต้องล็อกอินแอดมิน)\nให้รัน SQL นี้ใน Supabase:\n${EVA_DASHBOARD_RLS_SQL}`
                : `โหลดข้อมูลจาก Supabase เพื่อทำการลบไม่สำเร็จ (${byIdError.message})`
            );
            return;
          }

          const { data: rowsByName, error: byNameError } = await supabase
            .from('eva_editor_responses')
            .select('id, template_id, template_name, answers_json')
            .eq('template_name', selectedTemplate.name);
          if (byNameError) {
            const rlsBlocked = /row-level security|permission denied|42501/i.test(byNameError.message || '');
            setError(
              rlsBlocked
                ? `ยังไม่มีสิทธิ์ Dashboard สำหรับอ่านข้อมูลผู้ตอบ (ไม่ต้องล็อกอินแอดมิน)\nให้รัน SQL นี้ใน Supabase:\n${EVA_DASHBOARD_RLS_SQL}`
                : `โหลดข้อมูลจาก Supabase เพื่อทำการลบไม่สำเร็จ (${byNameError.message})`
            );
            return;
          }

          const mergedRemoteRows = [
            ...((rowsById || []) as Array<{ id: string; answers_json: unknown }>),
            ...((rowsByName || []) as Array<{ id: string; answers_json: unknown }>),
          ];

          idsToDelete = Array.from(
            new Set(
              mergedRemoteRows
                .filter((row) => {
                  const answers = Array.isArray(row.answers_json) ? (row.answers_json as ResponseAnswer[]) : [];
                  return normalizeUserName(answers[0]?.answer || '') === userName;
                })
                .map((row) => row.id)
                .filter(Boolean)
            )
          );
        }

        if (idsToDelete.length === 0) {
          setError(`ไม่พบข้อมูลผู้ตอบ "${userName}" ใน Supabase สำหรับแบบประเมินนี้`);
          return;
        }

        const { data: deletedRows, error: deleteError } = await supabase
          .from('eva_editor_responses')
          .delete()
          .in('id', idsToDelete)
          .select('id');

        if (deleteError) {
          const isRlsBlocked = /row-level security|permission denied|42501/i.test(deleteError.message || '');
          setError(
            isRlsBlocked
              ? `ลบข้อมูลบน Supabase ไม่สำเร็จ (ติดสิทธิ์ RLS)\nให้รัน SQL นี้ใน Supabase:\n${EVA_DASHBOARD_RLS_SQL}`
              : `ลบข้อมูลใน Supabase ไม่สำเร็จ (${deleteError.message})`
          );
          return;
        }

        const deletedCount = (deletedRows || []).length;
        if (deletedCount === 0) {
          setError(`ลบข้อมูลบน Supabase ไม่สำเร็จ (อาจติดสิทธิ์ RLS)\nให้รัน SQL นี้:\n${EVA_DASHBOARD_RLS_SQL}`);
          return;
        }
      }

      const remaining = responses.filter((item) => !(isRowInSelectedTemplate(item) && isRowOwnedByUser(item, userName)));
      setResponses(remaining);
      setTemplates((prev) =>
        prev.map((item) => {
          if (item.id !== selectedTemplate.id) return item;
          const nextCount = remaining.filter(
            (row) => row.templateId === item.id || (!row.templateId && row.templateName === item.name)
          ).length;
          return { ...item, responseCount: nextCount };
        })
      );

      if (selectedUserName === userName) setSelectedUserName('');
    } finally {
      setDeletingUserName(null);
    }
  };

  const sanitizeFileName = (name: string) =>
    name.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '').trim().slice(0, 80) || 'แบบประเมิน';

  const downloadTemplateResponses = async (template: TemplateSummary) => {
    setExportingTemplateId(template.id);
    try {
      const rows = responses
        .filter((item) => item.templateId === template.id || (!item.templateId && item.templateName === template.name))
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

      if (rows.length === 0) {
        setError('ยังไม่มีคำตอบสำหรับแบบประเมินนี้');
        return;
      }

      const questionKeys: string[] = Array.from(
        new Set(
          rows.flatMap((entry) =>
            entry.answers.map((a) => (a.subPrompt ? `${a.prompt || '-'} :: ${a.subPrompt}` : `${a.prompt || '-'}`))
          )
        )
      );

      const sheetRows = rows.map((entry, idx) => {
        const row: Record<string, string | number> = {
          ลำดับ: idx + 1,
          เวลาส่ง: formatThaiDateTime(entry.createdAt),
        };
        questionKeys.forEach((key) => {
          row[key] = '';
        });
        entry.answers.forEach((a) => {
          const key = a.subPrompt ? `${a.prompt || '-'} :: ${a.subPrompt}` : `${a.prompt || '-'}`;
          row[key] = a.answer || '';
        });
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(sheetRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'ผลคำตอบ');
      XLSX.writeFile(wb, `ผลประเมิน_${sanitizeFileName(template.name)}.xlsx`);
      setError(null);
    } finally {
      setExportingTemplateId(null);
    }
  };

  if (!dashInstance) {
    return <Navigate to="/evaluation/dashboard/login" replace />;
  }

  if (!hasDashboardAuth) {
    const q = `?dash=${encodeURIComponent(dashInstance.id)}`;
    return <Navigate to={`/evaluation/dashboard/login${q}`} replace />;
  }

  return (
    <div className="min-h-screen bg-transparent text-white bg-grid">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/70 backdrop-blur px-4 py-3 sm:px-6 sm:py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/5 w-10 h-10 text-gray-200 hover:bg-white/10"
              aria-label="เปิดรายการแบบประเมิน"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-300">{dashInstance.dashboardTitle}</h1>
          </div>
          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem(evaDashboardAuthStorageKey(dashInstance.id));
              navigate(`/evaluation/dashboard/login?dash=${encodeURIComponent(dashInstance.id)}`, { replace: true });
            }}
            className="rounded-lg border border-white/15 px-3 py-2 text-xs sm:text-sm text-gray-300 hover:bg-white/10"
          >
            ออกจาก Dashboard
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 py-4 sm:px-6 sm:py-8 lg:grid lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-6">
        <section className="hidden lg:block rounded-2xl border border-white/10 bg-white/5 p-4 h-fit max-h-[75vh] overflow-y-auto">
          <h2 className="font-semibold text-gray-200 mb-2 sm:mb-3 text-sm sm:text-base">แบบประเมิน</h2>
          {loading ? (
            <p className="text-sm text-gray-400">กำลังโหลดข้อมูล...</p>
          ) : templates.length === 0 ? (
            <p className="text-sm text-gray-400">ยังไม่มีแบบประเมินที่สร้างไว้</p>
          ) : (
            <div className="space-y-2">
              {templates.map((item) => (
                <div
                  key={item.id}
                  className={`w-full text-left rounded-xl border px-2.5 sm:px-3 py-2.5 transition-colors ${
                    selectedTemplateId === item.id
                      ? 'border-yellow-400/60 bg-yellow-400/10 text-yellow-100'
                      : 'border-white/10 bg-black/20 text-gray-200'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTemplateId(item.id);
                      setSelectedUserName('');
                      setUserSearch('');
                    }}
                    className="w-full text-left"
                  >
                    <p className="font-medium text-sm sm:text-base line-clamp-2 leading-snug">{item.name}</p>
                    <p className="text-[11px] sm:text-xs text-gray-400 mt-1">
                      {item.responseCount} คำตอบ
                    </p>
                  </button>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void downloadTemplateResponses(item)}
                      disabled={exportingTemplateId === item.id}
                      className="rounded-lg border border-emerald-400/35 bg-emerald-500/15 px-2 py-1 text-[11px] text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-60"
                    >
                      {exportingTemplateId === item.id ? 'กำลังสร้าง...' : 'Download Excel'}
                    </button>
                    <a
                      href={`/evaluation/form/${encodeURIComponent(item.id)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-white/20 bg-white/5 px-2 py-1 text-[11px] text-gray-200 hover:bg-white/10"
                    >
                      เปิดลิงก์ฟอร์ม
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
          {error && <p className="mt-3 text-sm text-amber-300">{error}</p>}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-3.5 sm:p-5 min-h-[calc(100dvh-7.5rem)] sm:min-h-0 mt-3 lg:mt-0">
          {!selectedTemplate ? (
            <p className="text-gray-400">เลือกแบบประเมินจากรายการทางซ้ายเพื่อดูรายละเอียด</p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-yellow-200/80">แบบประเมินที่เลือก</p>
                <h2 className="text-lg sm:text-2xl font-bold text-yellow-100 mt-1 leading-snug">{selectedTemplate.name}</h2>
                {selectedTemplate.description?.trim() && (
                  <p className="text-sm sm:text-base text-gray-300 mt-2 whitespace-pre-line leading-relaxed">{selectedTemplate.description}</p>
                )}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-2">
                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <p className="text-xs text-gray-400">จำนวนรายการในแบบประเมิน</p>
                  <p className="text-lg sm:text-xl font-semibold text-white mt-1">{selectedTemplate.prompts.length}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <p className="text-xs text-gray-400">จำนวนคำตอบที่บันทึก</p>
                  <p className="text-lg sm:text-xl font-semibold text-white mt-1">{selectedTemplate.responseCount}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <p className="text-xs text-gray-400">จำนวนผู้ตอบ</p>
                  <p className="text-lg sm:text-xl font-semibold text-white mt-1">{userCards.length}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-200 mb-2">ผู้ตอบแบบประเมิน </h3>
                {userCards.length > 0 && (
                  <div className="mb-3">
                    <input
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="ค้นหาชื่อผู้ตอบ..."
                      className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-sm"
                    />
                  </div>
                )}
                {userCards.length === 0 ? (
                  <p className="text-sm text-gray-400">ยังไม่มีผู้ตอบแบบประเมินนี้</p>
                ) : filteredUserCards.length === 0 ? (
                  <p className="text-sm text-gray-400">ไม่พบชื่อผู้ตอบตามคำค้นหา</p>
                ) : (
                  <div className="max-h-[60vh] overflow-y-auto pr-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                      {filteredUserCards.map((user) => (
                        <div
                          key={user.userName}
                          className={`rounded-2xl border px-4 py-3.5 text-left transition-colors min-h-[96px] ${
                            selectedUserName === user.userName
                              ? 'border-yellow-400/70 bg-yellow-400/10'
                              : 'border-white/10 bg-black/20'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedUserName(user.userName)}
                            className="w-full text-left hover:opacity-95"
                          >
                            <p className="text-base font-semibold text-white truncate">{user.userName}</p>
                            <p className="text-xs text-gray-300 mt-1">ส่งคำตอบ {user.responseCount} ครั้ง</p>
                            <p className="text-xs text-gray-400 mt-1">ล่าสุด: {formatThaiDateTime(user.latestAt)}</p>
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteUserCard(user.userName)}
                            disabled={deletingUserName === user.userName}
                            className="mt-2 rounded-lg border border-red-400/35 bg-red-500/15 px-2.5 py-1.5 text-xs text-red-200 hover:bg-red-500/25 disabled:opacity-60"
                          >
                            {deletingUserName === user.userName ? 'กำลังลบ...' : 'ลบ'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </main>
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
          <aside className="absolute left-0 top-0 bottom-0 w-[86vw] max-w-[340px] border-r border-white/10 bg-zinc-950/95 backdrop-blur p-3 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-100">เลือกแบบประเมิน</h2>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="rounded-lg border border-white/15 px-2.5 py-1.5 text-xs text-gray-300"
              >
                ปิด
              </button>
            </div>
            {loading ? (
              <p className="text-sm text-gray-400">กำลังโหลดข้อมูล...</p>
            ) : templates.length === 0 ? (
              <p className="text-sm text-gray-400">ยังไม่มีแบบประเมินที่สร้างไว้</p>
            ) : (
              <div className="space-y-2">
                {templates.map((item) => (
                  <div
                    key={item.id}
                    className={`w-full text-left rounded-xl border px-3 py-2.5 transition-colors ${
                      selectedTemplateId === item.id
                        ? 'border-yellow-400/60 bg-yellow-400/10 text-yellow-100'
                        : 'border-white/10 bg-black/20 text-gray-200'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTemplateId(item.id);
                        setSelectedUserName('');
                        setUserSearch('');
                        setSidebarOpen(false);
                      }}
                      className="w-full text-left"
                    >
                      <p className="font-medium text-sm line-clamp-2 leading-snug">{item.name}</p>
                    <p className="text-[11px] text-gray-400 mt-1">{item.responseCount} คำตอบ</p>
                    </button>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void downloadTemplateResponses(item)}
                        disabled={exportingTemplateId === item.id}
                        className="rounded-lg border border-emerald-400/35 bg-emerald-500/15 px-2 py-1 text-[11px] text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-60"
                      >
                        {exportingTemplateId === item.id ? 'กำลังสร้าง...' : 'Download Excel'}
                      </button>
                      <a
                        href={`/evaluation/form/${encodeURIComponent(item.id)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-white/20 bg-white/5 px-2 py-1 text-[11px] text-gray-200 hover:bg-white/10"
                      >
                        เปิดลิงก์ฟอร์ม
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {error && <p className="mt-3 text-sm text-amber-300">{error}</p>}
          </aside>
        </div>
      )}
      {selectedUserCard && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm p-0 sm:p-6"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedUserName('')}
        >
          <div
            className="mx-auto h-[92dvh] sm:h-full w-full max-w-4xl rounded-t-3xl sm:rounded-2xl border border-white/15 bg-zinc-950/95 flex flex-col mt-[8dvh] sm:mt-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 bg-zinc-950/95 flex items-start justify-between gap-3 border-b border-white/10 p-4 sm:p-5">
              <div className="min-w-0">
                <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-3 sm:hidden" />
                <h3 className="font-semibold text-yellow-100 truncate">
                  รายละเอียดคำตอบของ: {selectedUserCard.userName}
                </h3>
                <p className="text-sm text-gray-300 mt-1">
                  จำนวนครั้งที่ส่ง: <span className="text-white font-semibold">{selectedUserCard.responseCount}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserName('')}
                className="rounded-lg border border-white/20 px-3 py-2 text-sm text-gray-200 hover:bg-white/10 shrink-0"
              >
                ปิด
              </button>
            </div>
            <div className="px-4 sm:px-5 pt-3">
              <button
                type="button"
                onClick={() => void deleteUserCard(selectedUserCard.userName)}
                disabled={deletingUserName === selectedUserCard.userName}
                className="rounded-lg border border-red-400/35 bg-red-500/15 px-3 py-2 text-sm text-red-200 hover:bg-red-500/25 disabled:opacity-60"
              >
                {deletingUserName === selectedUserCard.userName ? 'กำลังลบข้อมูลผู้ตอบ...' : 'ลบผู้ตอบนี้'}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
              {selectedUserCard.submissions.map((submission, submitIdx) => (
                <div
                  key={`${selectedUserCard.userName}-${submission.createdAt}-${submitIdx}`}
                  className="rounded-lg border border-white/10 bg-black/25 p-3"
                >
                  <p className="text-xs text-gray-400 mb-2">
                    ส่งเมื่อ: {formatThaiDateTime(submission.createdAt)}
                  </p>
                  <div className="space-y-3">
                    {buildAnswerDisplayBlocks(submission.answers).map((block, bi) => (
                      <Fragment key={`${submission.createdAt}-block-${bi}`}>
                        {block.kind === 'plain' && (
                          <div className="text-sm rounded-lg border border-white/8 bg-black/20 p-3">
                            <p className="text-gray-200 font-medium leading-snug">
                              {bi + 1}.{' '}
                              {block.answer.subPrompt
                                ? `${block.answer.prompt} :: ${block.answer.subPrompt}`
                                : block.answer.prompt || '-'}
                            </p>
                            <p className="text-yellow-100/95 mt-2 whitespace-pre-wrap leading-relaxed">
                              {block.answer.answer ?? '-'}
                            </p>
                          </div>
                        )}
                        {block.kind === 'commitment_table' && (
                          <div className="text-sm rounded-xl border border-amber-400/25 bg-amber-950/25 p-3 sm:p-4">
                            <p className="text-gray-100 font-semibold text-base leading-snug">
                              {bi + 1}. {block.prompt}
                            </p>
                            <p className="text-xs text-amber-200/75 mt-1 mb-3">ตาราง COMMITMENT / BY WHEN / HOW</p>
                            <div className="overflow-x-auto rounded-lg border border-white/10 bg-black/40 shadow-inner">
                              <table className="w-full min-w-[560px] text-left text-sm border-collapse">
                                <thead>
                                  <tr className="border-b border-white/15 bg-white/[0.06]">
                                    <th className="px-2.5 sm:px-3 py-2.5 font-semibold text-amber-100/95 w-10 whitespace-nowrap">
                                      #
                                    </th>
                                    <th className="px-2.5 sm:px-3 py-2.5 font-semibold text-amber-100/95 align-bottom min-w-[10rem]">
                                      {block.headers[0]}
                                    </th>
                                    <th className="px-2.5 sm:px-3 py-2.5 font-semibold text-amber-100/95 align-bottom min-w-[7.5rem]">
                                      {block.headers[1]}
                                    </th>
                                    <th className="px-2.5 sm:px-3 py-2.5 font-semibold text-amber-100/95 align-bottom min-w-[9rem]">
                                      {block.headers[2]}
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {block.rows.map((r) => (
                                    <tr
                                      key={r.rowIndex}
                                      className="border-b border-white/[0.07] last:border-0 align-top hover:bg-white/[0.04]"
                                    >
                                      <td className="px-2.5 sm:px-3 py-2.5 text-gray-500 tabular-nums whitespace-nowrap">
                                        {r.rowIndex + 1}
                                      </td>
                                      <td className="px-2.5 sm:px-3 py-2.5 text-gray-200 leading-relaxed [overflow-wrap:anywhere]">
                                        {r.commitment || '—'}
                                      </td>
                                      <td className="px-2.5 sm:px-3 py-2.5 text-yellow-100/95 leading-relaxed">
                                        <EvaAnswerHoverPopover text={r.byWhen} className="block max-w-full">
                                          <span className="block line-clamp-3 cursor-help [overflow-wrap:anywhere]">
                                            {r.byWhen || '—'}
                                          </span>
                                        </EvaAnswerHoverPopover>
                                      </td>
                                      <td className="px-2.5 sm:px-3 py-2.5 text-emerald-100/90 leading-relaxed">
                                        <EvaAnswerHoverPopover text={r.howKnow} className="block max-w-full">
                                          <span className="block line-clamp-3 cursor-help [overflow-wrap:anywhere]">
                                            {r.howKnow || '—'}
                                          </span>
                                        </EvaAnswerHoverPopover>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                        {block.kind === 'commitment_table_legacy' && (
                          <div className="text-sm space-y-2 rounded-lg border border-white/8 bg-black/20 p-3">
                            <p className="text-gray-200 font-medium leading-snug">
                              {bi + 1}. {block.prompt}
                            </p>
                            <p className="text-xs text-gray-500">ตาราง (บันทึกแบบเก่า — แสดงรายข้อ)</p>
                            {block.items.map((answer, j) => (
                              <div
                                key={`${submission.createdAt}-leg-${j}`}
                                className="border-t border-white/8 pt-2 first:border-t-0 first:pt-0"
                              >
                                <p className="text-gray-300 leading-snug">
                                  {answer.subPrompt || answer.prompt || '-'}
                                </p>
                                <p className="text-yellow-100/95 mt-1 whitespace-pre-wrap leading-relaxed">
                                  {answer.answer || '-'}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EvaDashboardPage;
