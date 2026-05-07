import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { isAdminAuthenticated } from '../lib/auth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  type EvaEvaluationTemplate,
  type EvaPrompt,
  type EvaPromptType,
  EVA_TEMPLATE_STORAGE_KEY,
  evaBaseIdFromName,
  evaUniqueIdFromName,
  loadStoredEvaTemplates,
} from '../lib/evaTemplates';

const DEFAULT_TEMPLATES: EvaEvaluationTemplate[] = [
  {
    id: evaBaseIdFromName('แบบประเมิน InnoClub'),
    name: 'แบบประเมิน InnoClub',
    prompts: [
      {
        id: 'prompt-1',
        title: 'ความพึงพอใจโดยรวมต่อกิจกรรม',
        type: 'rating_1_5',
        ratingItems: ['คำถาม 1', 'คำถาม 2', 'คำถาม 3', 'คำถาม 4'],
      },
    ],
    updatedAt: new Date().toISOString(),
  },
];
const RESPONSE_STORAGE_KEY = 'minddojo.eva-editor.responses.v1';
const OTHER_OPTION_TOKEN = '__OTHER_OPTION__';
const OTHER_OPTION_PREFIX = `${OTHER_OPTION_TOKEN}::`;

const isOtherOption = (value: string) =>
  value === OTHER_OPTION_TOKEN || value.startsWith(OTHER_OPTION_PREFIX);

const getOtherOptionLabel = (value: string) =>
  value.startsWith(OTHER_OPTION_PREFIX) ? value.slice(OTHER_OPTION_PREFIX.length) || 'Other:' : 'Other:';

const buildOtherOptionValue = (label: string) => `${OTHER_OPTION_PREFIX}${label.trim() || 'Other:'}`;

function readTemplates(): EvaEvaluationTemplate[] {
  if (typeof window === 'undefined') return DEFAULT_TEMPLATES;
  const stored = loadStoredEvaTemplates();
  if (stored.length === 0) return DEFAULT_TEMPLATES;
  return stored;
}

type SaveOptions = { upsertTemplateId?: string; deleteTemplateId?: string };

const EvaEditorPage: React.FC = () => {
  const isAdmin = isAdminAuthenticated();
  const [templates, setTemplates] = useState<EvaEvaluationTemplate[]>(() => readTemplates());
  const [selectedId, setSelectedId] = useState<string>(() => readTemplates()[0]?.id || '');
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newPromptTitle, setNewPromptTitle] = useState('');
  const [newPromptType, setNewPromptType] = useState<EvaPromptType>('text');
  const [newPromptOptions, setNewPromptOptions] = useState<string[]>(['ตัวเลือก 1', 'ตัวเลือก 2']);
  const [newPromptRatingItems, setNewPromptRatingItems] = useState<string[]>(['คำถาม 1', 'คำถาม 2']);
  const [message, setMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [exportingTemplateId, setExportingTemplateId] = useState<string | null>(null);
  const [exportDateFrom, setExportDateFrom] = useState('');
  const [exportDateTo, setExportDateTo] = useState('');

  const selectedTemplate = useMemo(
    () => templates.find((item) => item.id === selectedId) || null,
    [templates, selectedId]
  );

  const buildPublicLink = (id: string) =>
    `${window.location.origin}/evaluation/form/${encodeURIComponent(id)}`;

  const syncTemplateToSupabase = async (template: EvaEvaluationTemplate) => {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.from('eva_editor_templates').upsert({
      id: template.id,
      name: template.name,
      prompts_json: template.prompts,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      setSyncError(
        /does not exist|could not find the table/i.test(error.message || '')
          ? 'ยังไม่พบตาราง eva_editor_templates ใน Supabase'
          : `บันทึก Supabase ไม่สำเร็จ: ${error.message}`
      );
    } else {
      setSyncError(null);
    }
  };

  const deleteTemplateFromSupabase = async (templateId: string) => {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.from('eva_editor_templates').delete().eq('id', templateId);
    if (error) {
      setSyncError(`ลบจาก Supabase ไม่สำเร็จ: ${error.message}`);
    } else {
      setSyncError(null);
    }
  };

  const saveTemplates = (next: EvaEvaluationTemplate[], options?: SaveOptions) => {
    setTemplates(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem(EVA_TEMPLATE_STORAGE_KEY, JSON.stringify(next));
    }
    if (options?.upsertTemplateId) {
      const target = next.find((item) => item.id === options.upsertTemplateId);
      if (target) void syncTemplateToSupabase(target);
    }
    if (options?.deleteTemplateId) {
      void deleteTemplateFromSupabase(options.deleteTemplateId);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const loadTemplatesFromSupabase = async () => {
      const { data, error } = await supabase
        .from('eva_editor_templates')
        .select('id, name, prompts_json, updated_at')
        .order('updated_at', { ascending: false });
      if (error) {
        setSyncError(
          /does not exist|could not find the table/i.test(error.message || '')
            ? 'ยังไม่พบตาราง eva_editor_templates ใน Supabase'
            : `โหลดข้อมูล Supabase ไม่สำเร็จ: ${error.message}`
        );
        return;
      }
      const mapped: EvaEvaluationTemplate[] = (data || []).map((row) => ({
        id: row.id as string,
        name: row.name as string,
        prompts: Array.isArray(row.prompts_json) ? (row.prompts_json as EvaPrompt[]) : [],
        updatedAt: (row.updated_at as string) || new Date().toISOString(),
      }));
      if (mapped.length > 0) {
        setTemplates(mapped);
        if (typeof window !== 'undefined') {
          localStorage.setItem(EVA_TEMPLATE_STORAGE_KEY, JSON.stringify(mapped));
        }
        setSelectedId(mapped[0].id);
      }
      setSyncError(null);
    };
    loadTemplatesFromSupabase();
  }, []);

  const addTemplate = () => {
    const name = newTemplateName.trim();
    if (!name) return;
    const existingIds = new Set(templates.map((t) => t.id));
    const nextItem: EvaEvaluationTemplate = {
      id: evaUniqueIdFromName(name, existingIds),
      name,
      prompts: [],
      updatedAt: new Date().toISOString(),
    };
    const next = [nextItem, ...templates];
    saveTemplates(next, { upsertTemplateId: nextItem.id });
    setSelectedId(nextItem.id);
    setNewTemplateName('');
    setMessage('เพิ่มแบบประเมินใหม่แล้ว');
  };

  const updateTemplateName = (name: string) => {
    if (!selectedTemplate) return;
    const next = templates.map((item) =>
      item.id === selectedTemplate.id
        ? { ...item, name, updatedAt: new Date().toISOString() }
        : item
    );
    saveTemplates(next, { upsertTemplateId: selectedTemplate.id });
  };

  const deleteTemplate = () => {
    if (!selectedTemplate) return;
    if (!window.confirm(`ยืนยันการลบแบบประเมิน "${selectedTemplate.name}" ?`)) return;
    const next = templates.filter((item) => item.id !== selectedTemplate.id);
    saveTemplates(next, { deleteTemplateId: selectedTemplate.id });
    setSelectedId(next[0]?.id || '');
    setMessage('ลบแบบประเมินแล้ว');
  };

  const updateSelectedTemplate = (updater: (current: EvaEvaluationTemplate) => EvaEvaluationTemplate) => {
    if (!selectedTemplate) return;
    const next = templates.map((item) => (item.id === selectedTemplate.id ? updater(item) : item));
    saveTemplates(next, { upsertTemplateId: selectedTemplate.id });
  };

  const addPrompt = () => {
    if (!selectedTemplate) return;
    const title = newPromptTitle.trim();
    if (!title) return;
    const promptId = `prompt-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
    const options =
      newPromptType === 'choice' || newPromptType === 'multi_choice'
        ? newPromptOptions.map((line) => line.trim()).filter(Boolean)
        : undefined;
    const ratingItems =
      newPromptType === 'rating_1_5' ? newPromptRatingItems.map((line) => line.trim()).filter(Boolean) : undefined;
    if ((newPromptType === 'choice' || newPromptType === 'multi_choice') && (!options || options.length < 2)) {
      setMessage('โจทย์แบบตัวเลือกต้องมีอย่างน้อย 2 ข้อ');
      return;
    }
    const nextPrompt: EvaPrompt = { id: promptId, title, type: newPromptType, options, ratingItems };
    updateSelectedTemplate((item) => ({
      ...item,
      prompts: [...item.prompts, nextPrompt],
      updatedAt: new Date().toISOString(),
    }));
    setNewPromptTitle('');
    setNewPromptType('text');
    setNewPromptOptions(['ตัวเลือก 1', 'ตัวเลือก 2']);
    setNewPromptRatingItems(['คำถาม 1', 'คำถาม 2']);
    setMessage('เพิ่มโจทย์แล้ว');
  };

  const updatePromptTitle = (idx: number, value: string) =>
    updateSelectedTemplate((item) => {
      const prompts = [...item.prompts];
      prompts[idx] = { ...prompts[idx], title: value };
      return { ...item, prompts, updatedAt: new Date().toISOString() };
    });

  const updatePromptType = (idx: number, type: EvaPromptType) =>
    updateSelectedTemplate((item) => {
      const prompts = [...item.prompts];
      const current = prompts[idx];
      prompts[idx] = {
        ...current,
        type,
        options:
          type === 'choice' || type === 'multi_choice'
            ? current.options || ['ตัวเลือก 1', 'ตัวเลือก 2']
            : undefined,
        ratingItems: type === 'rating_1_5' ? current.ratingItems || ['คำถาม 1', 'คำถาม 2'] : undefined,
      };
      return { ...item, prompts, updatedAt: new Date().toISOString() };
    });

  const updatePromptOptionItem = (idx: number, optionIdx: number, value: string) =>
    updateSelectedTemplate((item) => {
      const prompts = [...item.prompts];
      const options = [...(prompts[idx].options || [''])];
      if (isOtherOption(options[optionIdx]) && value.trim() === '') {
        options.splice(optionIdx, 1);
      } else {
        options[optionIdx] = isOtherOption(options[optionIdx]) ? buildOtherOptionValue(value) : value;
      }
      prompts[idx] = { ...prompts[idx], options };
      return { ...item, prompts, updatedAt: new Date().toISOString() };
    });

  const addPromptOptionItem = (idx: number) =>
    updateSelectedTemplate((item) => {
      const prompts = [...item.prompts];
      const options = [...(prompts[idx].options || [])];
      prompts[idx] = { ...prompts[idx], options: [...options, `ตัวเลือก ${options.length + 1}`] };
      return { ...item, prompts, updatedAt: new Date().toISOString() };
    });

  const removePromptOptionItem = (idx: number, optionIdx: number) =>
    updateSelectedTemplate((item) => {
      const prompts = [...item.prompts];
      const options = [...(prompts[idx].options || [])].filter((_, i) => i !== optionIdx);
      prompts[idx] = { ...prompts[idx], options };
      return { ...item, prompts, updatedAt: new Date().toISOString() };
    });

  const addOtherOptionItem = (idx: number) =>
    updateSelectedTemplate((item) => {
      const prompts = [...item.prompts];
      const options = [...(prompts[idx].options || [])];
      if (!options.some((opt) => isOtherOption(opt))) {
        prompts[idx] = { ...prompts[idx], options: [...options, buildOtherOptionValue('Other:')] };
      }
      return { ...item, prompts, updatedAt: new Date().toISOString() };
    });

  const updatePromptRatingItem = (idx: number, itemIdx: number, value: string) =>
    updateSelectedTemplate((item) => {
      const prompts = [...item.prompts];
      const ratingItems = [...(prompts[idx].ratingItems || [''])];
      ratingItems[itemIdx] = value;
      prompts[idx] = { ...prompts[idx], ratingItems };
      return { ...item, prompts, updatedAt: new Date().toISOString() };
    });

  const addPromptRatingItem = (idx: number) =>
    updateSelectedTemplate((item) => {
      const prompts = [...item.prompts];
      const ratingItems = [...(prompts[idx].ratingItems || [])];
      prompts[idx] = { ...prompts[idx], ratingItems: [...ratingItems, `คำถาม ${ratingItems.length + 1}`] };
      return { ...item, prompts, updatedAt: new Date().toISOString() };
    });

  const removePromptRatingItem = (idx: number, itemIdx: number) =>
    updateSelectedTemplate((item) => {
      const prompts = [...item.prompts];
      const ratingItems = [...(prompts[idx].ratingItems || [])].filter((_, i) => i !== itemIdx);
      prompts[idx] = { ...prompts[idx], ratingItems };
      return { ...item, prompts, updatedAt: new Date().toISOString() };
    });

  const removePrompt = (idx: number) =>
    updateSelectedTemplate((item) => ({
      ...item,
      prompts: item.prompts.filter((_, i) => i !== idx),
      updatedAt: new Date().toISOString(),
    }));

  const isDateInRange = (isoDate: string) => {
    if (!isoDate) return true;
    const value = new Date(isoDate);
    if (Number.isNaN(value.getTime())) return true;
    if (exportDateFrom) {
      const from = new Date(`${exportDateFrom}T00:00:00`);
      if (value < from) return false;
    }
    if (exportDateTo) {
      const to = new Date(`${exportDateTo}T23:59:59.999`);
      if (value > to) return false;
    }
    return true;
  };

  const sanitizeFileName = (name: string) =>
    name.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '').trim().slice(0, 80) || 'แบบประเมิน';

  const downloadTemplateResponses = async (template: EvaEvaluationTemplate) => {
    setExportingTemplateId(template.id);
    setMessage(null);
    const localRaw = typeof window !== 'undefined' ? localStorage.getItem(RESPONSE_STORAGE_KEY) : null;
    const localRows = (() => {
      if (!localRaw) return [];
      try {
        const parsed = JSON.parse(localRaw) as Array<{
          templateId?: string;
          templateName?: string;
          answers?: Array<{ prompt?: string; subPrompt?: string; answer?: string }>;
          createdAt?: string;
        }>;
        return Array.isArray(parsed) ? parsed.filter((r) => r.templateId === template.id) : [];
      } catch {
        return [];
      }
    })();

    let remoteRows: Array<{ created_at?: string; answers_json?: Array<{ prompt?: string; subPrompt?: string; answer?: string }> }> = [];
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('eva_editor_responses')
        .select('created_at, answers_json')
        .eq('template_id', template.id)
        .order('created_at', { ascending: false });
      if (error) {
        setSyncError(`โหลดคำตอบจาก Supabase ไม่สำเร็จ: ${error.message}`);
      } else {
        remoteRows = (data || []) as typeof remoteRows;
      }
    }

    const normalized = [
      ...remoteRows.map((row) => ({
        createdAt: row.created_at || '',
        answers: Array.isArray(row.answers_json) ? row.answers_json : [],
      })),
      ...localRows.map((row) => ({
        createdAt: row.createdAt || '',
        answers: Array.isArray(row.answers) ? row.answers : [],
      })),
    ];

    const deduped = Array.from(
      new Map(
        normalized.map((entry) => {
          const key = `${entry.createdAt}::${JSON.stringify(entry.answers)}`;
          return [key, entry];
        })
      ).values()
    ).filter((entry) => isDateInRange(entry.createdAt));

    if (deduped.length === 0) {
      setMessage('ยังไม่มีคำตอบสำหรับแบบประเมินนี้');
      setExportingTemplateId(null);
      return;
    }

    const questionKeys = Array.from(
      new Set(
        deduped.flatMap((entry) =>
          entry.answers.map((a) => (a.subPrompt ? `${a.prompt || '-'} :: ${a.subPrompt}` : `${a.prompt || '-'}`))
        )
      )
    );

    const sheetRows = deduped.map((entry, idx) => {
      const row: Record<string, string | number> = {
        ลำดับ: idx + 1,
        เวลาส่ง: entry.createdAt || '-',
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
    const dateSuffix =
      exportDateFrom || exportDateTo
        ? `_${exportDateFrom || 'ต้นช่วง'}-${exportDateTo || 'ปลายช่วง'}`
        : '';
    const fileName = `ผลประเมิน_${sanitizeFileName(template.name)}${dateSuffix}.xlsx`;
    XLSX.writeFile(wb, fileName);
    setExportingTemplateId(null);
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-transparent text-white bg-grid px-6 py-10">
        <div className="max-w-3xl mx-auto rounded-2xl border border-red-400/30 bg-red-500/10 p-6">
          <h1 className="text-2xl font-bold text-red-200">Eva editor</h1>
          <p className="text-red-100/90 mt-3">หน้านี้สำหรับผู้ดูแลระบบเท่านั้น กรุณาเข้าสู่ระบบแอดมินก่อนใช้งาน</p>
          <Link to="/admin/login" className="inline-block mt-5 rounded-lg bg-yellow-400 px-4 py-2 font-semibold text-black hover:bg-yellow-300 transition-colors">
            ไปหน้า Admin Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-white bg-grid">
      <header className="border-b border-white/10 px-6 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <h1 className="text-xl md:text-2xl font-bold text-yellow-300">Eva editor</h1>
          <Link to="/admin" className="text-sm text-gray-300 hover:text-white">กลับหน้าแอดมิน</Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid lg:grid-cols-[320px_minmax(0,1fr)] gap-6">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 h-fit">
          <h2 className="font-semibold text-gray-200 mb-3">รายการแบบประเมิน</h2>
          <div className="mb-3 rounded-lg border border-white/10 bg-black/20 p-3 space-y-2">
            <p className="text-xs text-gray-400">กรองช่วงวันที่ก่อนดาวน์โหลด Excel</p>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={exportDateFrom}
                onChange={(e) => setExportDateFrom(e.target.value)}
                className="rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-xs"
              />
              <input
                type="date"
                value={exportDateTo}
                onChange={(e) => setExportDateTo(e.target.value)}
                className="rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-xs"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setExportDateFrom('');
                setExportDateTo('');
              }}
              className="text-xs text-gray-300 underline underline-offset-2 hover:text-white"
            >
              ล้างช่วงวันที่
            </button>
          </div>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {templates.map((item) => (
              <div
                key={item.id}
                className={`rounded-lg border px-3 py-2 transition-colors ${
                  selectedId === item.id
                    ? 'border-yellow-400/60 bg-yellow-400/10 text-yellow-200'
                    : 'border-white/10 bg-black/20 text-gray-200'
                }`}
              >
                <button type="button" onClick={() => setSelectedId(item.id)} className="w-full text-left">
                  <p className="font-medium truncate">{item.name}</p>
                  <p className="text-xs text-gray-400 mt-1">{item.prompts.length} โจทย์</p>
                </button>
                <a
                  href={`/evaluation/form/${encodeURIComponent(item.id)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2 text-xs text-yellow-200 hover:text-yellow-100 underline underline-offset-2"
                >
                  ลิงก์ผู้ใช้
                </a>
                <button
                  type="button"
                  onClick={() => downloadTemplateResponses(item)}
                  disabled={exportingTemplateId === item.id}
                  className="mt-2 ml-3 inline-block text-xs rounded-md bg-emerald-400/20 border border-emerald-300/35 px-2.5 py-1.5 text-emerald-100 hover:bg-emerald-400/30 disabled:opacity-60"
                >
                  {exportingTemplateId === item.id ? 'กำลังสร้างไฟล์...' : 'Download Excel'}
                </button>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            <input
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              placeholder="ชื่อแบบประเมินใหม่"
              className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={addTemplate}
              className="w-full rounded-lg bg-yellow-400 px-3 py-2 text-sm font-semibold text-black hover:bg-yellow-300 transition-colors"
            >
              เพิ่มแบบประเมิน
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          {!selectedTemplate ? (
            <p className="text-gray-400">ยังไม่มีแบบประเมิน กรุณาเพิ่มรายการใหม่</p>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex-1 min-w-[220px]">
                  <label className="text-sm text-gray-400">ชื่อแบบประเมิน</label>
                  <input
                    value={selectedTemplate.name}
                    onChange={(e) => updateTemplateName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2"
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <a
                      href={`/evaluation/form/${encodeURIComponent(selectedTemplate.id)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs rounded-md bg-white/10 px-2.5 py-1.5 text-gray-200 hover:bg-white/20 transition-colors"
                    >
                      เปิดลิงก์ผู้ใช้
                    </a>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(buildPublicLink(selectedTemplate.id));
                          setMessage('คัดลอกลิงก์ผู้ใช้แล้ว');
                        } catch {
                          setMessage('คัดลอกลิงก์ไม่สำเร็จ');
                        }
                      }}
                      className="text-xs rounded-md bg-yellow-400/20 border border-yellow-300/35 px-2.5 py-1.5 text-yellow-100 hover:bg-yellow-400/30 transition-colors"
                    >
                      คัดลอกลิงก์
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={deleteTemplate}
                  className="rounded-lg bg-red-500/20 border border-red-400/40 px-3 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/30 transition-colors"
                >
                  ลบแบบประเมิน
                </button>
              </div>

              <div>
                <h3 className="font-semibold text-gray-200 mb-3">โจทย์ ({selectedTemplate.prompts.length})</h3>
                <div className="space-y-3">
                  {selectedTemplate.prompts.map((prompt, idx) => (
                    <div key={`${selectedTemplate.id}-prompt-${idx}`} className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <div className="flex items-start gap-2 mb-2">
                        <span className="text-sm text-gray-400 pt-2">{idx + 1}.</span>
                        <textarea
                          value={prompt.title}
                          onChange={(e) => updatePromptTitle(idx, e.target.value)}
                          rows={2}
                          className="flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm resize-y"
                        />
                        <button
                          type="button"
                          onClick={() => removePrompt(idx)}
                          className="rounded-lg bg-red-500/20 border border-red-400/40 px-2.5 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/30 transition-colors"
                        >
                          ลบ
                        </button>
                      </div>
                      <div className="space-y-2 pl-6">
                        <select
                          value={prompt.type}
                          onChange={(e) => updatePromptType(idx, e.target.value as EvaPromptType)}
                          className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
                        >
                          <option value="text">คำตอบแบบข้อความ</option>
                          <option value="choice">คำตอบแบบช้อยส์</option>
                          <option value="multi_choice">คำตอบแบบเลือกได้หลายอัน</option>
                          <option value="rating_1_5">เลือกระดับ 1-5</option>
                        </select>
                        {(prompt.type === 'choice' || prompt.type === 'multi_choice') && (
                          <div className="space-y-2">
                            {(prompt.options || []).map((option, optionIdx) => (
                              <div key={`${prompt.id}-option-${optionIdx}`} className="flex items-center gap-2">
                                <input
                                  value={isOtherOption(option) ? getOtherOptionLabel(option) : option}
                                  onChange={(e) => updatePromptOptionItem(idx, optionIdx, e.target.value)}
                                  className="flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
                                />
                                <button
                                  type="button"
                                  onClick={() => removePromptOptionItem(idx, optionIdx)}
                                  className="rounded-lg bg-red-500/20 border border-red-400/40 px-2.5 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/30 transition-colors"
                                >
                                  ลบ
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => addPromptOptionItem(idx)}
                              className="rounded-lg bg-emerald-400/20 border border-emerald-300/40 px-3 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-400/30 transition-colors"
                            >
                              + เพิ่มตัวเลือก
                            </button>
                            <button
                              type="button"
                              onClick={() => addOtherOptionItem(idx)}
                              className="ml-2 rounded-lg bg-amber-400/20 border border-amber-300/40 px-3 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-400/30 transition-colors"
                            >
                              + เพิ่ม Other:
                            </button>
                          </div>
                        )}
                        {prompt.type === 'rating_1_5' && (
                          <div className="space-y-2">
                            {(prompt.ratingItems || []).map((itemText, itemIdx) => (
                              <div key={`${prompt.id}-rating-item-${itemIdx}`} className="flex items-center gap-2">
                                <input
                                  value={itemText}
                                  onChange={(e) => updatePromptRatingItem(idx, itemIdx, e.target.value)}
                                  className="flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
                                />
                                <button
                                  type="button"
                                  onClick={() => removePromptRatingItem(idx, itemIdx)}
                                  className="rounded-lg bg-red-500/20 border border-red-400/40 px-2.5 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/30 transition-colors"
                                >
                                  ลบ
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => addPromptRatingItem(idx)}
                              className="rounded-lg bg-emerald-400/20 border border-emerald-300/40 px-3 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-400/30 transition-colors"
                            >
                              + เพิ่มข้อย่อย
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                <label className="text-sm text-gray-400">เพิ่มโจทย์ใหม่</label>
                <select
                  value={newPromptType}
                  onChange={(e) => setNewPromptType(e.target.value as EvaPromptType)}
                  className="mt-2 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
                >
                  <option value="text">คำตอบแบบข้อความ</option>
                  <option value="choice">คำตอบแบบช้อยส์</option>
                  <option value="multi_choice">คำตอบแบบเลือกได้หลายอัน</option>
                  <option value="rating_1_5">เลือกระดับ 1-5</option>
                </select>
                <textarea
                  value={newPromptTitle}
                  onChange={(e) => setNewPromptTitle(e.target.value)}
                  rows={3}
                  placeholder="พิมพ์โจทย์ที่ต้องการเพิ่ม..."
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm resize-y"
                />
                {(newPromptType === 'choice' || newPromptType === 'multi_choice') && (
                  <div className="mt-2 space-y-2">
                    {newPromptOptions.map((option, idx) => (
                      <div key={`new-option-${idx}`} className="flex items-center gap-2">
                        <input
                          value={isOtherOption(option) ? getOtherOptionLabel(option) : option}
                          onChange={(e) =>
                            setNewPromptOptions((prev) =>
                              prev
                                .map((item, i) => {
                                  if (i !== idx) return item;
                                  if (isOtherOption(item) && e.target.value.trim() === '') return '';
                                  return isOtherOption(item)
                                    ? buildOtherOptionValue(e.target.value)
                                    : e.target.value;
                                })
                                .filter((item) => item !== '')
                            )
                          }
                          className="flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setNewPromptOptions((prev) => prev.filter((_, i) => i !== idx))}
                          className="rounded-lg bg-red-500/20 border border-red-400/40 px-2.5 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/30 transition-colors"
                        >
                          ลบ
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setNewPromptOptions((prev) => [...prev, `ตัวเลือก ${prev.length + 1}`])}
                      className="rounded-lg bg-emerald-400/20 border border-emerald-300/40 px-3 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-400/30 transition-colors"
                    >
                      + เพิ่มตัวเลือก
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setNewPromptOptions((prev) =>
                          prev.some((item) => isOtherOption(item))
                            ? prev
                            : [...prev, buildOtherOptionValue('Other:')]
                        )
                      }
                      className="ml-2 rounded-lg bg-amber-400/20 border border-amber-300/40 px-3 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-400/30 transition-colors"
                    >
                      + เพิ่ม Other:
                    </button>
                  </div>
                )}
                {newPromptType === 'rating_1_5' && (
                  <div className="mt-2 space-y-2">
                    {newPromptRatingItems.map((itemText, idx) => (
                      <div key={`new-rating-item-${idx}`} className="flex items-center gap-2">
                        <input
                          value={itemText}
                          onChange={(e) =>
                            setNewPromptRatingItems((prev) => prev.map((item, i) => (i === idx ? e.target.value : item)))
                          }
                          className="flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setNewPromptRatingItems((prev) => prev.filter((_, i) => i !== idx))}
                          className="rounded-lg bg-red-500/20 border border-red-400/40 px-2.5 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/30 transition-colors"
                        >
                          ลบ
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setNewPromptRatingItems((prev) => [...prev, `คำถาม ${prev.length + 1}`])}
                      className="rounded-lg bg-emerald-400/20 border border-emerald-300/40 px-3 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-400/30 transition-colors"
                    >
                      + เพิ่มข้อย่อย
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={addPrompt}
                  className="mt-2 rounded-lg bg-emerald-400/25 border border-emerald-300/40 px-3 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-400/35 transition-colors"
                >
                  เพิ่มโจทย์
                </button>
              </div>
            </div>
          )}
          {message && <p className="mt-4 text-sm text-emerald-300">{message}</p>}
          {syncError && <p className="mt-2 text-sm text-amber-300">{syncError}</p>}
        </section>
      </main>
    </div>
  );
};

export default EvaEditorPage;
