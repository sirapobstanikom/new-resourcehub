import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { isAdminAuthenticated } from '../lib/auth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  createNewEvaDashboardInstance,
  loadEvaDashboardStore,
  loadEvaDashboardStoreAsync,
  removeDashboardFromStore,
  saveEvaDashboardStoreAsync,
  type EvaDashboardInstance,
  upsertDashboardInStore,
} from '../lib/evaDashboardConfig';
import {
  type EvaEvaluationTemplate,
  type EvaPrompt,
  type EvaPromptNumberStyle,
  type EvaPromptType,
  type EvaCommitmentRow,
  EVA_TEMPLATE_STORAGE_KEY,
  EVA_DEFAULT_COMMITMENT_HEADERS,
  EVA_DEFAULT_FILL_BRIDGE,
  EVA_DEFAULT_FILL_CLOSING,
  EVA_DEFAULT_FILL_INTRO_EN,
  EVA_DEFAULT_FILL_INTRO_TH,
  EVA_DEFAULT_FILL_LEAD_IN,
  defaultEvaCommitmentRows,
  evaBaseIdFromName,
  evaUniqueIdFromName,
  getPromptNumberStyle,
  loadStoredEvaTemplates,
} from '../lib/evaTemplates';

type EvaEditorPageMode = 'templates' | 'dashboard';

const DEFAULT_TEMPLATES: EvaEvaluationTemplate[] = [
  {
    id: evaBaseIdFromName('แบบประเมิน InnoClub'),
    name: 'แบบประเมิน InnoClub',
    description: 'โปรดอ่านคำอธิบายและตอบคำถามให้ครบทุกข้อ',
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

function newEvaBlockId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
}

function makeNewTextPrompt(): EvaPrompt {
  return { id: newEvaBlockId('prompt'), title: 'คำถามใหม่', type: 'text' };
}

function makeNewDescriptionPrompt(): EvaPrompt {
  return {
    id: newEvaBlockId('desc'),
    title: 'พิมพ์คำอธิบายระหว่างโจทย์ที่นี่...',
    type: 'description',
  };
}

function readTemplates(): EvaEvaluationTemplate[] {
  if (typeof window === 'undefined') return DEFAULT_TEMPLATES;
  const stored = loadStoredEvaTemplates();
  if (stored.length === 0) return DEFAULT_TEMPLATES;
  return stored;
}

type SaveOptions = { upsertTemplateId?: string; deleteTemplateId?: string };

const EvaEditorPage: React.FC = () => {
  const isAdmin = isAdminAuthenticated();
  const [pageMode, setPageMode] = useState<EvaEditorPageMode>('templates');
  const [dashStore, setDashStore] = useState(() => loadEvaDashboardStore());
  const [selectedDashId, setSelectedDashId] = useState(() => {
    const s = loadEvaDashboardStore();
    return s.editorSelectedDashboardId ?? s.dashboards[0]?.id ?? '';
  });
  const [draftDashboard, setDraftDashboard] = useState<EvaDashboardInstance>(() => {
    const s = loadEvaDashboardStore();
    const id = s.editorSelectedDashboardId ?? s.dashboards[0]?.id ?? '';
    return s.dashboards.find((d) => d.id === id) ?? s.dashboards[0]!;
  });
  const [dashShowPw, setDashShowPw] = useState(false);
  const [templates, setTemplates] = useState<EvaEvaluationTemplate[]>(() => readTemplates());
  const [selectedId, setSelectedId] = useState<string>(() => readTemplates()[0]?.id || '');
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newPromptTitle, setNewPromptTitle] = useState('');
  const [newPromptType, setNewPromptType] = useState<EvaPromptType>('text');
  const [newPromptOptions, setNewPromptOptions] = useState<string[]>(['ตัวเลือก 1', 'ตัวเลือก 2']);
  const [newPromptRatingItems, setNewPromptRatingItems] = useState<string[]>(['คำถาม 1', 'คำถาม 2']);
  const [newCommitmentHeaders, setNewCommitmentHeaders] = useState<[string, string, string]>(() => [
    ...EVA_DEFAULT_COMMITMENT_HEADERS,
  ]);
  const [newCommitmentRows, setNewCommitmentRows] = useState<EvaCommitmentRow[]>(() =>
    defaultEvaCommitmentRows().map((r) => ({ ...r }))
  );
  const [newFillIntroEn, setNewFillIntroEn] = useState(EVA_DEFAULT_FILL_INTRO_EN);
  const [newFillIntroTh, setNewFillIntroTh] = useState(EVA_DEFAULT_FILL_INTRO_TH);
  const [newFillLeadIn, setNewFillLeadIn] = useState(EVA_DEFAULT_FILL_LEAD_IN);
  const [newFillBridge, setNewFillBridge] = useState(EVA_DEFAULT_FILL_BRIDGE);
  const [newFillClosing, setNewFillClosing] = useState(EVA_DEFAULT_FILL_CLOSING);
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
      description: template.description || '',
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

  const persistDashboardConfig = async () => {
    const latest = loadEvaDashboardStore();
    let nextStore = upsertDashboardInStore(latest, draftDashboard, { editorSelectedId: selectedDashId });
    nextStore = { ...nextStore, editorSelectedDashboardId: selectedDashId };
    const saved = await saveEvaDashboardStoreAsync(nextStore);
    setDashStore(nextStore);
    if (saved.ok) {
      setMessage('บันทึกการตั้งค่า Dashboard แล้ว (sync Supabase สำเร็จ)');
      setSyncError(null);
    } else {
      setMessage('บันทึกลงเครื่องแล้ว แต่ sync Supabase ไม่สำเร็จ');
      setSyncError(saved.errorMessage);
    }
  };

  const refreshDashboardEditorState = async () => {
    const loaded = await loadEvaDashboardStoreAsync();
    const s = loaded.store;
    setDashStore(s);
    const sid = s.editorSelectedDashboardId ?? s.dashboards[0]?.id ?? '';
    setSelectedDashId(sid);
    const inst = s.dashboards.find((d) => d.id === sid) ?? s.dashboards[0];
    if (inst) setDraftDashboard({ ...inst });
    if (loaded.errorMessage) setSyncError(loaded.errorMessage);
  };

  const addDashboardSlot = async () => {
    const nextInst = createNewEvaDashboardInstance();
    const latest = loadEvaDashboardStore();
    let nextStore = upsertDashboardInStore(latest, nextInst, { editorSelectedId: nextInst.id });
    nextStore = { ...nextStore, editorSelectedDashboardId: nextInst.id };
    const saved = await saveEvaDashboardStoreAsync(nextStore);
    setDashStore(nextStore);
    setSelectedDashId(nextInst.id);
    setDraftDashboard(nextInst);
    setMessage(saved.ok ? 'สร้าง Dashboard ใหม่แล้ว — ตั้งชื่อและกดบันทึกเมื่อพร้อม' : 'สร้าง Dashboard แล้ว แต่ sync Supabase ไม่สำเร็จ');
    if (!saved.ok) setSyncError(saved.errorMessage);
  };

  const deleteSelectedDashboard = async () => {
    const latest = loadEvaDashboardStore();
    if (latest.dashboards.length <= 1) {
      setMessage('ต้องมีอย่างน้อยหนึ่ง Dashboard');
      return;
    }
    const nextStore = removeDashboardFromStore(latest, selectedDashId);
    if (!nextStore) {
      setMessage('ต้องมีอย่างน้อยหนึ่ง Dashboard');
      return;
    }
    const saved = await saveEvaDashboardStoreAsync(nextStore);
    setDashStore(nextStore);
    const nid = nextStore.editorSelectedDashboardId ?? nextStore.dashboards[0].id;
    setSelectedDashId(nid);
    const inst = nextStore.dashboards.find((d) => d.id === nid)!;
    setDraftDashboard(inst);
    setMessage(saved.ok ? 'ลบ Dashboard แล้ว' : 'ลบ Dashboard แล้ว แต่ sync Supabase ไม่สำเร็จ');
    if (!saved.ok) setSyncError(saved.errorMessage);
  };

  const restrictDashboardList = draftDashboard.visibleTemplateIds !== null;

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
        .select('id, name, description, prompts_json, updated_at')
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
        description: (row.description as string) || '',
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

  useEffect(() => {
    void refreshDashboardEditorState();
  }, []);

  const addTemplate = () => {
    const name = newTemplateName.trim();
    if (!name) return;
    const existingIds = new Set(templates.map((t) => t.id));
    const nextItem: EvaEvaluationTemplate = {
      id: evaUniqueIdFromName(name, existingIds),
      name,
      description: '',
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

  const syncTemplateLinkFromName = () => {
    if (!selectedTemplate) return;
    const nextName = selectedTemplate.name.trim();
    if (!nextName) return;
    const existingIds = new Set(
      templates
        .filter((item) => item.id !== selectedTemplate.id)
        .map((item) => item.id)
    );
    const nextId = evaUniqueIdFromName(nextName, existingIds);
    if (nextId === selectedTemplate.id) return;

    const previousId = selectedTemplate.id;
    const previousName = selectedTemplate.name;
    const next = templates.map((item) =>
      item.id === previousId
        ? { ...item, id: nextId, updatedAt: new Date().toISOString() }
        : item
    );
    saveTemplates(next, { upsertTemplateId: nextId, deleteTemplateId: previousId });
    if (isSupabaseConfigured) {
      void supabase
        .from('eva_editor_responses')
        .update({ template_id: nextId, template_name: nextName })
        .eq('template_id', previousId);
      void supabase
        .from('eva_editor_responses')
        .update({ template_id: nextId, template_name: nextName })
        .eq('template_name', previousName);
    }
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(RESPONSE_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed)) {
          const migrated = parsed.map((row) => {
            if (row?.templateId === previousId || row?.templateName === previousName) {
              return { ...row, templateId: nextId, templateName: nextName };
            }
            return row;
          });
          localStorage.setItem(RESPONSE_STORAGE_KEY, JSON.stringify(migrated));
        }
      } catch {
        // ignore local migration failure
      }
    }
    setSelectedId(nextId);
    setMessage('อัปเดตชื่อและลิงก์แบบประเมินแล้ว');
  };

  const updateTemplateDescription = (description: string) => {
    if (!selectedTemplate) return;
    const next = templates.map((item) =>
      item.id === selectedTemplate.id
        ? { ...item, description, updatedAt: new Date().toISOString() }
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
    if (newPromptType === 'description') {
      if (!title) {
        setMessage('กรุณาพิมพ์เนื้อหาคำอธิบาย');
        return;
      }
    } else if (!title) return;
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
    if (newPromptType === 'commitment_table') {
      const rows = newCommitmentRows.map((r) => ({
        commitment: r.commitment.trim(),
        byWhenPlaceholder: r.byWhenPlaceholder?.trim() || '',
        howKnowPlaceholder: r.howKnowPlaceholder?.trim() || '',
      }));
      if (!rows.some((r) => r.commitment)) {
        setMessage('โจทย์แบบตารางต้องมีอย่างน้อยหนึ่งแถวที่มีข้อความในคอลัมน์ COMMITMENT');
        return;
      }
    }
    const commitmentHeaders: [string, string, string] | undefined =
      newPromptType === 'commitment_table' ? [...newCommitmentHeaders] : undefined;
    const commitmentRows: EvaCommitmentRow[] | undefined =
      newPromptType === 'commitment_table'
        ? newCommitmentRows.map((r) => ({
            commitment: r.commitment.trim(),
            byWhenPlaceholder: r.byWhenPlaceholder?.trim() || '',
            howKnowPlaceholder: r.howKnowPlaceholder?.trim() || '',
          }))
        : undefined;
    const fillIntroEn = newPromptType === 'fill_sentence' ? newFillIntroEn.trim() : undefined;
    const fillIntroTh = newPromptType === 'fill_sentence' ? newFillIntroTh.trim() : undefined;
    const fillLeadIn = newPromptType === 'fill_sentence' ? newFillLeadIn : undefined;
    const fillBridge = newPromptType === 'fill_sentence' ? newFillBridge : undefined;
    const fillClosing = newPromptType === 'fill_sentence' ? newFillClosing : undefined;

    if (newPromptType === 'description') {
      const nextPrompt: EvaPrompt = { id: newEvaBlockId('desc'), title, type: 'description' };
      updateSelectedTemplate((item) => ({
        ...item,
        prompts: [...item.prompts, nextPrompt],
        updatedAt: new Date().toISOString(),
      }));
      setNewPromptTitle('');
      setNewPromptType('text');
      setNewPromptOptions(['ตัวเลือก 1', 'ตัวเลือก 2']);
      setNewPromptRatingItems(['คำถาม 1', 'คำถาม 2']);
      setNewCommitmentHeaders([...EVA_DEFAULT_COMMITMENT_HEADERS]);
      setNewCommitmentRows(defaultEvaCommitmentRows().map((r) => ({ ...r })));
      setNewFillIntroEn(EVA_DEFAULT_FILL_INTRO_EN);
      setNewFillIntroTh(EVA_DEFAULT_FILL_INTRO_TH);
      setNewFillLeadIn(EVA_DEFAULT_FILL_LEAD_IN);
      setNewFillBridge(EVA_DEFAULT_FILL_BRIDGE);
      setNewFillClosing(EVA_DEFAULT_FILL_CLOSING);
      setMessage('เพิ่มคำอธิบายแล้ว');
      return;
    }

    const promptId = newEvaBlockId('prompt');

    const nextPrompt: EvaPrompt = {
      id: promptId,
      title,
      type: newPromptType,
      options,
      ratingItems,
      commitmentHeaders,
      commitmentRows,
      fillIntroEn,
      fillIntroTh,
      fillLeadIn,
      fillBridge,
      fillClosing,
    };
    updateSelectedTemplate((item) => ({
      ...item,
      prompts: [...item.prompts, nextPrompt],
      updatedAt: new Date().toISOString(),
    }));
    setNewPromptTitle('');
    setNewPromptType('text');
    setNewPromptOptions(['ตัวเลือก 1', 'ตัวเลือก 2']);
    setNewPromptRatingItems(['คำถาม 1', 'คำถาม 2']);
    setNewCommitmentHeaders([...EVA_DEFAULT_COMMITMENT_HEADERS]);
    setNewCommitmentRows(defaultEvaCommitmentRows().map((r) => ({ ...r })));
    setNewFillIntroEn(EVA_DEFAULT_FILL_INTRO_EN);
    setNewFillIntroTh(EVA_DEFAULT_FILL_INTRO_TH);
    setNewFillLeadIn(EVA_DEFAULT_FILL_LEAD_IN);
    setNewFillBridge(EVA_DEFAULT_FILL_BRIDGE);
    setNewFillClosing(EVA_DEFAULT_FILL_CLOSING);
    setMessage('เพิ่มโจทย์แล้ว');
  };

  const updatePromptTitle = (idx: number, value: string) =>
    updateSelectedTemplate((item) => {
      const prompts = [...item.prompts];
      prompts[idx] = { ...prompts[idx], title: value };
      return { ...item, prompts, updatedAt: new Date().toISOString() };
    });

  const setPromptNumberStyle = (idx: number, style: EvaPromptNumberStyle) =>
    updateSelectedTemplate((item) => {
      const prompts = [...item.prompts];
      const cur = prompts[idx];
      if (cur.type === 'description') return item;
      const next: EvaPrompt = { ...cur };
      delete next.showNumberPrefix;
      if (style === 'auto') {
        delete next.promptNumberStyle;
        delete next.fixedNumberPrefix;
      } else if (style === 'none') {
        next.promptNumberStyle = 'none';
        delete next.fixedNumberPrefix;
      } else {
        next.promptNumberStyle = 'fixed';
        if (next.fixedNumberPrefix === undefined) next.fixedNumberPrefix = '';
      }
      prompts[idx] = next;
      return { ...item, prompts, updatedAt: new Date().toISOString() };
    });

  const updatePromptFixedNumberPrefix = (idx: number, value: string) =>
    updateSelectedTemplate((item) => {
      const prompts = [...item.prompts];
      const cur = prompts[idx];
      if (cur.type === 'description' || getPromptNumberStyle(cur) !== 'fixed') return item;
      prompts[idx] = { ...cur, fixedNumberPrefix: value };
      return { ...item, prompts, updatedAt: new Date().toISOString() };
    });

  const updatePromptType = (idx: number, type: EvaPromptType) =>
    updateSelectedTemplate((item) => {
      const prompts = [...item.prompts];
      const current = prompts[idx];
      if (type === 'description') {
        prompts[idx] = { id: current.id, title: current.title, type: 'description' };
        return { ...item, prompts, updatedAt: new Date().toISOString() };
      }
      const next: EvaPrompt = {
        id: current.id,
        title: current.title,
        type,
      };
      const numStyle = getPromptNumberStyle(current);
      if (numStyle === 'none') {
        next.promptNumberStyle = 'none';
      } else if (numStyle === 'fixed') {
        next.promptNumberStyle = 'fixed';
        next.fixedNumberPrefix = current.fixedNumberPrefix ?? '';
      }
      if (type === 'choice' || type === 'multi_choice') {
        next.options = current.options || ['ตัวเลือก 1', 'ตัวเลือก 2'];
      }
      if (type === 'rating_1_5') {
        next.ratingItems = current.ratingItems || ['คำถาม 1', 'คำถาม 2'];
      }
      if (type === 'commitment_table') {
        next.commitmentHeaders = current.commitmentHeaders
          ? [...current.commitmentHeaders]
          : [...EVA_DEFAULT_COMMITMENT_HEADERS];
        next.commitmentRows =
          current.commitmentRows && current.commitmentRows.length > 0
            ? current.commitmentRows.map((r) => ({ ...r }))
            : defaultEvaCommitmentRows();
      }
      if (type === 'fill_sentence') {
        next.fillIntroEn = current.fillIntroEn ?? EVA_DEFAULT_FILL_INTRO_EN;
        next.fillIntroTh = current.fillIntroTh ?? EVA_DEFAULT_FILL_INTRO_TH;
        next.fillLeadIn = current.fillLeadIn ?? EVA_DEFAULT_FILL_LEAD_IN;
        next.fillBridge = current.fillBridge ?? EVA_DEFAULT_FILL_BRIDGE;
        next.fillClosing = current.fillClosing ?? EVA_DEFAULT_FILL_CLOSING;
      }
      prompts[idx] = next;
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

  const updatePromptCommitmentHeader = (idx: number, col: 0 | 1 | 2, value: string) =>
    updateSelectedTemplate((item) => {
      const prompts = [...item.prompts];
      const p = prompts[idx];
      if (p.type !== 'commitment_table') return item;
      const h = [...(p.commitmentHeaders ?? [...EVA_DEFAULT_COMMITMENT_HEADERS])] as [string, string, string];
      h[col] = value;
      prompts[idx] = { ...p, commitmentHeaders: h };
      return { ...item, prompts, updatedAt: new Date().toISOString() };
    });

  const updatePromptCommitmentRow = (pIdx: number, rowIdx: number, field: keyof EvaCommitmentRow, value: string) =>
    updateSelectedTemplate((item) => {
      const prompts = [...item.prompts];
      const p = prompts[pIdx];
      if (p.type !== 'commitment_table') return item;
      const rows = [...(p.commitmentRows ?? defaultEvaCommitmentRows())];
      const row = { ...rows[rowIdx], [field]: value };
      rows[rowIdx] = row;
      prompts[pIdx] = { ...p, commitmentRows: rows };
      return { ...item, prompts, updatedAt: new Date().toISOString() };
    });

  const addPromptCommitmentRow = (pIdx: number) =>
    updateSelectedTemplate((item) => {
      const prompts = [...item.prompts];
      const p = prompts[pIdx];
      if (p.type !== 'commitment_table') return item;
      const rows = [...(p.commitmentRows ?? defaultEvaCommitmentRows())];
      rows.push({ commitment: '', byWhenPlaceholder: '', howKnowPlaceholder: '' });
      prompts[pIdx] = { ...p, commitmentRows: rows };
      return { ...item, prompts, updatedAt: new Date().toISOString() };
    });

  const removePromptCommitmentRow = (pIdx: number, rowIdx: number) =>
    updateSelectedTemplate((item) => {
      const prompts = [...item.prompts];
      const p = prompts[pIdx];
      if (p.type !== 'commitment_table') return item;
      const rows = [...(p.commitmentRows ?? [])].filter((_, i) => i !== rowIdx);
      prompts[pIdx] = { ...p, commitmentRows: rows.length > 0 ? rows : defaultEvaCommitmentRows() };
      return { ...item, prompts, updatedAt: new Date().toISOString() };
    });

  const updatePromptFillField = (
    pIdx: number,
    key: 'fillIntroEn' | 'fillIntroTh' | 'fillLeadIn' | 'fillBridge' | 'fillClosing',
    value: string
  ) =>
    updateSelectedTemplate((item) => {
      const prompts = [...item.prompts];
      const p = prompts[pIdx];
      if (p.type !== 'fill_sentence') return item;
      prompts[pIdx] = { ...p, [key]: value };
      return { ...item, prompts, updatedAt: new Date().toISOString() };
    });

  const removePrompt = (idx: number) =>
    updateSelectedTemplate((item) => ({
      ...item,
      prompts: item.prompts.filter((_, i) => i !== idx),
      updatedAt: new Date().toISOString(),
    }));

  const insertPromptAt = (insertIndex: number, prompt: EvaPrompt) => {
    updateSelectedTemplate((item) => {
      const prompts = [...item.prompts];
      const i = Math.max(0, Math.min(insertIndex, prompts.length));
      prompts.splice(i, 0, prompt);
      return { ...item, prompts, updatedAt: new Date().toISOString() };
    });
    setMessage('แทรกรายการแล้ว');
  };

  const movePrompt = (idx: number, delta: -1 | 1) => {
    updateSelectedTemplate((item) => {
      const prompts = [...item.prompts];
      const j = idx + delta;
      if (j < 0 || j >= prompts.length) return item;
      const tmp = prompts[idx];
      prompts[idx] = prompts[j];
      prompts[j] = tmp;
      return { ...item, prompts, updatedAt: new Date().toISOString() };
    });
  };

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
        return Array.isArray(parsed)
          ? parsed.filter((r) => r.templateId === template.id || r.templateName === template.name)
          : [];
      } catch {
        return [];
      }
    })();

    let remoteRows: Array<{ created_at?: string; answers_json?: Array<{ prompt?: string; subPrompt?: string; answer?: string }> }> = [];
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('eva_editor_responses')
        .select('created_at, answers_json')
        .or(`template_id.eq.${template.id},template_name.eq.${template.name}`)
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
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl md:text-2xl font-bold text-yellow-300">Eva editor</h1>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex rounded-xl border border-white/15 bg-black/30 p-1">
              <button
                type="button"
                onClick={() => {
                  setMessage(null);
                  setPageMode('templates');
                }}
                className={`rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-colors ${
                  pageMode === 'templates'
                    ? 'bg-yellow-400/25 text-yellow-100'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                แก้ไขแบบประเมิน
              </button>
              <button
                type="button"
                onClick={() => {
                  setMessage(null);
                  setPageMode('dashboard');
                  void refreshDashboardEditorState();
                }}
                className={`rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-colors ${
                  pageMode === 'dashboard'
                    ? 'bg-yellow-400/25 text-yellow-100'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                แก้ไข Dashboard
              </button>
            </div>
            <Link to="/admin" className="text-sm text-gray-300 hover:text-white">
              กลับหน้าแอดมิน
            </Link>
          </div>
        </div>
      </header>

      {pageMode === 'dashboard' ? (
        <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
          <p className="text-sm text-gray-400 leading-relaxed">
            ตั้งค่าได้หลาย Dashboard — แยกลิงก์ด้วย <span className="font-mono text-gray-300">?dash=id</span> บันทึกใน
            Supabase (พร้อม cache ในเครื่อง)
          </p>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
            <h2 className="font-semibold text-yellow-100">เลือก / จัดการ Dashboard</h2>
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 items-stretch sm:items-end">
              <div className="flex-1 min-w-[180px]">
                <label className="text-sm text-gray-400">เลือก Dashboard ที่จะแก้ไข</label>
                <select
                  value={selectedDashId}
                  onChange={(e) => {
                    const id = e.target.value;
                    const inst = dashStore.dashboards.find((d) => d.id === id);
                    if (!inst) return;
                    setSelectedDashId(id);
                    setDraftDashboard({ ...inst });
                  }}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
                >
                  {dashStore.dashboards.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.id === selectedDashId
                        ? draftDashboard.label.trim() || draftDashboard.dashboardTitle || d.id
                        : (d.label || '').trim() || d.dashboardTitle || d.id}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void addDashboardSlot()}
                  className="rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-100 hover:bg-emerald-500/25"
                >
                  + สร้าง Dashboard ใหม่
                </button>
                <button
                  type="button"
                  disabled={dashStore.dashboards.length <= 1}
                  onClick={() => void deleteSelectedDashboard()}
                  className="rounded-xl border border-red-400/35 bg-red-500/15 px-4 py-2 text-sm font-medium text-red-100 hover:bg-red-500/25 disabled:opacity-40 disabled:pointer-events-none"
                >
                  ลบที่เลือก
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-400">ชื่อภายใน (แสดงในรายการ editor)</label>
              <input
                value={draftDashboard.label}
                onChange={(e) => setDraftDashboard((c) => ({ ...c, label: e.target.value }))}
                placeholder="เช่น Dashboard การอบรม A"
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
              />
              <p className="mt-1 text-[11px] text-gray-500">
                ชื่อในรายการเลือกด้านบนและหัวข้อลิงก์ด้านล่างใช้ค่านี้เดียวกัน (บันทึกแล้ว sync ไป Supabase)
              </p>
            </div>
            {selectedDashId && draftDashboard.id === selectedDashId && (
              <div className="rounded-xl border border-yellow-400/25 bg-yellow-400/10 p-3 space-y-2">
                <p className="text-xs font-medium text-gray-400">ลิงก์ของ Dashboard นี้ (เปิดแท็บใหม่)</p>
                <p className="text-sm font-semibold text-yellow-100">
                  {draftDashboard.label.trim() || '(ตั้งชื่อภายในก่อนหรือกรอกที่ช่องด้านบน)'}
                </p>
                <p className="text-[11px] text-gray-500 font-mono break-all">{draftDashboard.id}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <a
                    href={`/evaluation/dashboard?dash=${encodeURIComponent(draftDashboard.id)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex rounded-lg border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-medium text-gray-100 hover:bg-white/15"
                  >
                    ไปที่ หน้า Dashboard ของแบบประเมินนี้
                  </a>
                </div>
              </div>
            )}
            <p className="text-xs text-gray-500">
              <span className="text-gray-400">dash id (พารามิเตอร์ </span>
              <span className="font-mono text-gray-400">?dash=</span>
              <span className="text-gray-400">): </span>
              <span className="font-mono text-gray-300 break-all">{draftDashboard.id}</span>
            </p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
            <h2 className="font-semibold text-yellow-100">ข้อความหน้า Login Dashboard</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-400">หัวข้อ (Title)</label>
                <input
                  value={draftDashboard.loginTitle}
                  onChange={(e) => setDraftDashboard((c) => ({ ...c, loginTitle: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400">ข้อความใต้หัวข้อ</label>
                <textarea
                  value={draftDashboard.loginSubtitle}
                  onChange={(e) => setDraftDashboard((c) => ({ ...c, loginSubtitle: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm resize-y"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400">ข้อความหมายเหตุด้านบนแบบฟอร์ม (ปล่อยว่างได้)</label>
                <textarea
                  value={draftDashboard.loginNote}
                  onChange={(e) => setDraftDashboard((c) => ({ ...c, loginNote: e.target.value }))}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm resize-y"
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-400">ป้ายกำกับช่อง Username</label>
                  <input
                    value={draftDashboard.usernameLabel}
                    onChange={(e) => setDraftDashboard((c) => ({ ...c, usernameLabel: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400">ป้ายกำกับช่อง Password</label>
                  <input
                    value={draftDashboard.passwordLabel}
                    onChange={(e) => setDraftDashboard((c) => ({ ...c, passwordLabel: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-400">ข้อความปุ่มเข้าระบบ</label>
                  <input
                    value={draftDashboard.loginButtonText}
                    onChange={(e) => setDraftDashboard((c) => ({ ...c, loginButtonText: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400">ข้อความเมื่อผิดรหัส</label>
                  <input
                    value={draftDashboard.loginErrorMessage}
                    onChange={(e) => setDraftDashboard((c) => ({ ...c, loginErrorMessage: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
            <h2 className="font-semibold text-yellow-100">รหัสเข้าสู่ Dashboard</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-400">Username</label>
                <input
                  value={draftDashboard.username}
                  onChange={(e) => setDraftDashboard((c) => ({ ...c, username: e.target.value }))}
                  autoComplete="off"
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm font-mono"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400">Password</label>
                <div className="mt-1 flex gap-2">
                  <input
                    type={dashShowPw ? 'text' : 'password'}
                    value={draftDashboard.password}
                    onChange={(e) => setDraftDashboard((c) => ({ ...c, password: e.target.value }))}
                    autoComplete="new-password"
                    className="flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setDashShowPw((v) => !v)}
                    className="rounded-lg border border-white/20 px-3 py-2 text-xs text-gray-300 hover:bg-white/10 whitespace-nowrap"
                  >
                    {dashShowPw ? 'ซ่อน' : 'แสดง'}
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
            <h2 className="font-semibold text-yellow-100">หน้ารายการ Dashboard</h2>
            <div>
              <label className="text-sm text-gray-400">หัวข้อแถบบนเมื่อเข้าระบบแล้ว</label>
              <input
                value={draftDashboard.dashboardTitle}
                onChange={(e) => setDraftDashboard((c) => ({ ...c, dashboardTitle: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
              />
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
            <h2 className="font-semibold text-yellow-100">แบบประเมินที่แสดงบน Dashboard</h2>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={restrictDashboardList}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setDraftDashboard((c) => ({
                    ...c,
                    visibleTemplateIds: checked ? templates.map((t) => t.id) : null,
                  }));
                }}
                className="mt-1 shrink-0"
              />
              <span className="text-sm text-gray-300 leading-relaxed">
                จำกัดเฉพาะแบบประเมินที่เลือก (ถ้าไม่เลือกกล่องนี้ จะ<strong>แสดงแบบประเมินทั้งหมด</strong>ที่มีในระบบบน Dashboard)
              </span>
            </label>
            {restrictDashboardList && (
              <div className="rounded-lg border border-white/10 bg-black/25 p-3 max-h-64 overflow-y-auto space-y-2">
                {templates.length === 0 ? (
                  <p className="text-sm text-gray-500">ยังไม่มีแบบประเมิน ให้ไปที่แท็บ &quot;แก้ไขแบบประเมิน&quot; เพื่อสร้างก่อน</p>
                ) : (
                  templates.map((item) => {
                    const ids = draftDashboard.visibleTemplateIds ?? [];
                    const checked = ids.includes(item.id);
                    return (
                      <label key={item.id} className="flex items-start gap-2 cursor-pointer py-1">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(ev) => {
                            const next = ev.target.checked
                              ? [...new Set([...ids, item.id])]
                              : ids.filter((id) => id !== item.id);
                            setDraftDashboard((c) => ({ ...c, visibleTemplateIds: next }));
                          }}
                          className="mt-1 shrink-0"
                        />
                        <span className="text-sm text-gray-200 leading-snug">{item.name}</span>
                      </label>
                    );
                  })
                )}
              </div>
            )}
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                void persistDashboardConfig();
              }}
              className="rounded-xl bg-yellow-400 px-5 py-2.5 text-sm font-semibold text-black hover:bg-yellow-300 transition-colors"
            >
              บันทึกการตั้งค่า Dashboard
            </button>
            <button
              type="button"
              onClick={() => {
                void refreshDashboardEditorState();
                setMessage('โหลดค่าล่าสุดจากระบบแล้ว');
              }}
              className="rounded-xl border border-white/20 px-4 py-2.5 text-sm text-gray-200 hover:bg-white/10 transition-colors"
            >
              โหลดค่าที่บันทึกไว้
            </button>
          </div>
          {message && <p className="text-sm text-emerald-300">{message}</p>}
          {syncError && <p className="text-sm text-amber-300">{syncError}</p>}
        </main>
      ) : (
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
                  <p className="text-xs text-gray-400 mt-1">{item.prompts.length} รายการ</p>
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
                    onBlur={syncTemplateLinkFromName}
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2"
                  />
                  <label className="text-sm text-gray-400 mt-3 block">คำอธิบายใต้ชื่อแบบประเมิน</label>
                  <textarea
                    value={selectedTemplate.description || ''}
                    onChange={(e) => updateTemplateDescription(e.target.value)}
                    rows={3}
                    placeholder="เช่น โปรดตอบตามความคิดเห็นจริง ใช้เวลาประมาณ 3-5 นาที"
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm resize-y"
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
                <h3 className="font-semibold text-gray-200 mb-3">
                  โจทย์และคำอธิบาย ({selectedTemplate.prompts.length})
                </h3>
                <div className="space-y-3">
                  {selectedTemplate.prompts.map((prompt, idx) => (
                    <div key={`${selectedTemplate.id}-${prompt.id}`} className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <div className="flex items-start gap-2 mb-2">
                        <span className="text-sm text-gray-400 pt-2 w-7 shrink-0 text-right tabular-nums">{idx + 1}.</span>
                        <div className="flex-1 min-w-0 space-y-1.5">
                          {prompt.type === 'description' && (
                            <span className="inline-block rounded-md border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-100">
                              คำอธิบาย
                            </span>
                          )}
                          <textarea
                            value={prompt.title}
                            onChange={(e) => updatePromptTitle(idx, e.target.value)}
                            rows={prompt.type === 'description' ? 5 : 2}
                            placeholder={
                              prompt.type === 'description'
                                ? 'เนื้อหาคำอธิบายระหว่างโจทย์ (หลายบรรทัดได้)'
                                : 'ข้อความโจทย์ที่ผู้ตอบเห็น'
                            }
                            className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm resize-y"
                          />
                          {prompt.type !== 'description' && (
                            <div className="space-y-2 text-xs text-gray-400">
                              <p className="font-medium text-gray-300">เลข / ข้อความนำหน้าบนฟอร์มผู้ตอบ</p>
                              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                                  <input
                                    type="radio"
                                    name={`eva-num-${selectedTemplate.id}-${prompt.id}`}
                                    checked={getPromptNumberStyle(prompt) === 'auto'}
                                    onChange={() => setPromptNumberStyle(idx, 'auto')}
                                    className="border-white/30 bg-black/40 accent-yellow-400"
                                  />
                                  อัตโนมัติ (1. 2. …)
                                </label>
                                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                                  <input
                                    type="radio"
                                    name={`eva-num-${selectedTemplate.id}-${prompt.id}`}
                                    checked={getPromptNumberStyle(prompt) === 'none'}
                                    onChange={() => setPromptNumberStyle(idx, 'none')}
                                    className="border-white/30 bg-black/40 accent-yellow-400"
                                  />
                                  ไม่มีนำหน้า
                                </label>
                                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                                  <input
                                    type="radio"
                                    name={`eva-num-${selectedTemplate.id}-${prompt.id}`}
                                    checked={getPromptNumberStyle(prompt) === 'fixed'}
                                    onChange={() => setPromptNumberStyle(idx, 'fixed')}
                                    className="border-white/30 bg-black/40 accent-yellow-400"
                                  />
                                  กำหนดเอง
                                </label>
                              </div>
                              {getPromptNumberStyle(prompt) === 'fixed' && (
                                <input
                                  type="text"
                                  value={prompt.fixedNumberPrefix ?? ''}
                                  onChange={(e) => updatePromptFixedNumberPrefix(idx, e.target.value)}
                                  placeholder="เช่น Q1. หรือ ข้อ ก. (ใส่ช่องว่างท้ายได้)"
                                  className="w-full max-w-md rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-sm text-gray-100 placeholder:text-gray-500"
                                />
                              )}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removePrompt(idx)}
                          className="rounded-lg bg-red-500/20 border border-red-400/40 px-2.5 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/30 transition-colors shrink-0"
                        >
                          ลบ
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-2 pl-8 sm:pl-9">
                        <button
                          type="button"
                          onClick={() => insertPromptAt(idx, makeNewTextPrompt())}
                          className="rounded-md border border-emerald-400/35 bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-100 hover:bg-emerald-500/20"
                        >
                          แทรกโจทย์ด้านบน
                        </button>
                        <button
                          type="button"
                          onClick={() => insertPromptAt(idx, makeNewDescriptionPrompt())}
                          className="rounded-md border border-amber-400/35 bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-100 hover:bg-amber-500/20"
                        >
                          แทรกคำอธิบายด้านบน
                        </button>
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => movePrompt(idx, -1)}
                          className="rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[11px] text-gray-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          เลื่อนขึ้น
                        </button>
                        <button
                          type="button"
                          disabled={idx >= selectedTemplate.prompts.length - 1}
                          onClick={() => movePrompt(idx, 1)}
                          className="rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[11px] text-gray-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          เลื่อนลง
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
                          <option value="commitment_table">ตาราง COMMITMENT / BY WHEN / HOW</option>
                          <option value="fill_sentence">เติมช่องว่าง — คำมั่นผู้นำ (ประโยคเดียว)</option>
                          <option value="description">คำอธิบาย (ไม่ต้องตอบ)</option>
                        </select>
                        {prompt.type === 'description' && (
                          <p className="text-xs text-gray-500 leading-relaxed">
                            แสดงเป็นข้อความบนฟอร์มผู้ตอบเท่านั้น ไม่นับเป็นข้อที่ต้องกรอก และไม่บันทึกในคำตอบ
                          </p>
                        )}
                        {prompt.type !== 'description' && (
                          <>
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
                        {prompt.type === 'commitment_table' && (
                          <div className="space-y-3 rounded-lg border border-white/10 bg-black/25 p-3">
                            <p className="text-xs text-gray-500">หัวตาราง (3 คอลัมน์)</p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              {([0, 1, 2] as const).map((col) => (
                                <input
                                  key={col}
                                  value={(prompt.commitmentHeaders ?? EVA_DEFAULT_COMMITMENT_HEADERS)[col]}
                                  onChange={(e) => updatePromptCommitmentHeader(idx, col, e.target.value)}
                                  className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-xs"
                                />
                              ))}
                            </div>
                            <p className="text-xs text-gray-500">แถว — คอลัมน์ 2–3 ใช้เป็นข้อความตัวอย่าง (placeholder) บนฟอร์มผู้ตอบ</p>
                            {(prompt.commitmentRows ?? defaultEvaCommitmentRows()).map((row, ri) => (
                              <div key={`${prompt.id}-er-${ri}`} className="space-y-2 rounded border border-white/8 p-2">
                                <div className="flex justify-end">
                                  <button
                                    type="button"
                                    onClick={() => removePromptCommitmentRow(idx, ri)}
                                    className="text-xs text-red-300 hover:underline"
                                  >
                                    ลบแถว
                                  </button>
                                </div>
                                <input
                                  value={row.commitment}
                                  onChange={(e) => updatePromptCommitmentRow(idx, ri, 'commitment', e.target.value)}
                                  placeholder="ข้อความ COMMITMENT"
                                  className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
                                />
                                <input
                                  value={row.byWhenPlaceholder || ''}
                                  onChange={(e) =>
                                    updatePromptCommitmentRow(idx, ri, 'byWhenPlaceholder', e.target.value)
                                  }
                                  placeholder="placeholder BY WHEN (เช่น By end of week)"
                                  className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-xs"
                                />
                                <input
                                  value={row.howKnowPlaceholder || ''}
                                  onChange={(e) =>
                                    updatePromptCommitmentRow(idx, ri, 'howKnowPlaceholder', e.target.value)
                                  }
                                  placeholder="placeholder HOW I'LL KNOW..."
                                  className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-xs"
                                />
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => addPromptCommitmentRow(idx)}
                              className="rounded-lg bg-emerald-400/20 border border-emerald-300/40 px-3 py-2 text-xs font-semibold text-emerald-100"
                            >
                              + เพิ่มแถว
                            </button>
                          </div>
                        )}
                        {prompt.type === 'fill_sentence' && (
                          <div className="space-y-2 rounded-lg border border-white/10 bg-black/25 p-3">
                            <input
                              value={prompt.fillIntroEn ?? ''}
                              onChange={(e) => updatePromptFillField(idx, 'fillIntroEn', e.target.value)}
                              placeholder="หัวข้อ EN"
                              className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
                            />
                            <input
                              value={prompt.fillIntroTh ?? ''}
                              onChange={(e) => updatePromptFillField(idx, 'fillIntroTh', e.target.value)}
                              placeholder="หัวข้อ TH"
                              className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
                            />
                            <input
                              value={prompt.fillLeadIn ?? ''}
                              onChange={(e) => updatePromptFillField(idx, 'fillLeadIn', e.target.value)}
                              placeholder="ก่อนช่องว่างแรก (เช่น I commit to )"
                              className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-xs"
                            />
                            <input
                              value={prompt.fillBridge ?? ''}
                              onChange={(e) => updatePromptFillField(idx, 'fillBridge', e.target.value)}
                              placeholder="ระหว่างช่องว่าง"
                              className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-xs"
                            />
                            <input
                              value={prompt.fillClosing ?? ''}
                              onChange={(e) => updatePromptFillField(idx, 'fillClosing', e.target.value)}
                              placeholder="หลังช่องว่างที่สอง (เช่น .)"
                              className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-xs"
                            />
                          </div>
                        )}
                          </>
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
                  <option value="commitment_table">ตาราง COMMITMENT / BY WHEN / HOW</option>
                  <option value="fill_sentence">เติมช่องว่าง — คำมั่นผู้นำ (ประโยคเดียว)</option>
                  <option value="description">คำอธิบาย (ไม่ต้องตอบ)</option>
                </select>
                <textarea
                  value={newPromptTitle}
                  onChange={(e) => setNewPromptTitle(e.target.value)}
                  rows={newPromptType === 'description' ? 4 : 3}
                  placeholder={
                    newPromptType === 'description'
                      ? 'พิมพ์คำอธิบายระหว่างโจทย์ (หลายบรรทัดได้)...'
                      : 'พิมพ์โจทย์ที่ต้องการเพิ่ม...'
                  }
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm resize-y"
                />
                {newPromptType === 'description' && (
                  <p className="mt-1 text-xs text-gray-500">ไม่บังคับให้ผู้ตอบกรอก — ใช้แบ่งช่วงหรืออธิบายบริบท</p>
                )}
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
                {(newPromptType === 'commitment_table' || newPromptType === 'fill_sentence' || newPromptType === 'description') && (
                  <p className="mt-2 text-xs text-gray-500">
                    {newPromptType === 'description'
                      ? 'ช่องด้านบนคือข้อความคำอธิบายที่ผู้ตอบจะเห็น (ไม่มีช่องกรอก)'
                      : 'ช่องชื่อโจทย์ด้านบนคือหัวข้อที่ผู้ตอบเห็นเหนือคำถาม (เช่น ตาราง Accountability)'}
                  </p>
                )}
                {newPromptType === 'commitment_table' && (
                  <div className="mt-2 space-y-3 rounded-lg border border-white/10 bg-black/25 p-3">
                    <button
                      type="button"
                      onClick={() => {
                        setNewCommitmentHeaders([...EVA_DEFAULT_COMMITMENT_HEADERS]);
                        setNewCommitmentRows(defaultEvaCommitmentRows().map((r) => ({ ...r })));
                      }}
                      className="rounded-lg bg-sky-500/20 border border-sky-400/40 px-3 py-2 text-xs font-semibold text-sky-100 hover:bg-sky-500/30"
                    >
                      ใส่ตัวอย่าง Accountability / Whale Done
                    </button>
                    <p className="text-xs text-gray-500">หัวตาราง (3 คอลัมน์)</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {([0, 1, 2] as const).map((col) => (
                        <input
                          key={col}
                          value={newCommitmentHeaders[col]}
                          onChange={(e) =>
                            setNewCommitmentHeaders((prev) => {
                              const n = [...prev] as [string, string, string];
                              n[col] = e.target.value;
                              return n;
                            })
                          }
                          className="rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-xs"
                        />
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">
                      แต่ละแถว: คอลัมน์ 2–3 เป็นข้อความตัวอย่าง (placeholder) บนฟอร์มผู้ตอบ
                    </p>
                    {newCommitmentRows.map((row, ri) => (
                      <div key={`new-ct-${ri}`} className="space-y-1 rounded border border-white/8 p-2">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() =>
                              setNewCommitmentRows((prev) =>
                                prev.length <= 1 ? prev : prev.filter((_, i) => i !== ri)
                              )
                            }
                            className="text-xs text-red-300 hover:underline"
                          >
                            ลบแถว
                          </button>
                        </div>
                        <input
                          value={row.commitment}
                          onChange={(e) =>
                            setNewCommitmentRows((prev) =>
                              prev.map((r, i) => (i === ri ? { ...r, commitment: e.target.value } : r))
                            )
                          }
                          placeholder="COMMITMENT"
                          className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
                        />
                        <input
                          value={row.byWhenPlaceholder || ''}
                          onChange={(e) =>
                            setNewCommitmentRows((prev) =>
                              prev.map((r, i) => (i === ri ? { ...r, byWhenPlaceholder: e.target.value } : r))
                            )
                          }
                          placeholder="placeholder BY WHEN"
                          className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-xs"
                        />
                        <input
                          value={row.howKnowPlaceholder || ''}
                          onChange={(e) =>
                            setNewCommitmentRows((prev) =>
                              prev.map((r, i) => (i === ri ? { ...r, howKnowPlaceholder: e.target.value } : r))
                            )
                          }
                          placeholder="placeholder HOW I'LL KNOW"
                          className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-xs"
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        setNewCommitmentRows((prev) => [
                          ...prev,
                          { commitment: '', byWhenPlaceholder: '', howKnowPlaceholder: '' },
                        ])
                      }
                      className="rounded-lg bg-emerald-400/20 border border-emerald-300/40 px-3 py-2 text-xs font-semibold text-emerald-100"
                    >
                      + เพิ่มแถว
                    </button>
                  </div>
                )}
                {newPromptType === 'fill_sentence' && (
                  <div className="mt-2 space-y-2 rounded-lg border border-white/10 bg-black/25 p-3">
                    <button
                      type="button"
                      onClick={() => {
                        setNewFillIntroEn(EVA_DEFAULT_FILL_INTRO_EN);
                        setNewFillIntroTh(EVA_DEFAULT_FILL_INTRO_TH);
                        setNewFillLeadIn(EVA_DEFAULT_FILL_LEAD_IN);
                        setNewFillBridge(EVA_DEFAULT_FILL_BRIDGE);
                        setNewFillClosing(EVA_DEFAULT_FILL_CLOSING);
                      }}
                      className="rounded-lg bg-sky-500/20 border border-sky-400/40 px-3 py-2 text-xs font-semibold text-sky-100 hover:bg-sky-500/30"
                    >
                      ใส่ตัวอย่างประโยคคำมั่นผู้นำ
                    </button>
                    <input
                      value={newFillIntroEn}
                      onChange={(e) => setNewFillIntroEn(e.target.value)}
                      placeholder="หัวข้อ EN"
                      className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
                    />
                    <input
                      value={newFillIntroTh}
                      onChange={(e) => setNewFillIntroTh(e.target.value)}
                      placeholder="หัวข้อ TH"
                      className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
                    />
                    <input
                      value={newFillLeadIn}
                      onChange={(e) => setNewFillLeadIn(e.target.value)}
                      placeholder="ก่อนช่องว่างแรก"
                      className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-xs"
                    />
                    <input
                      value={newFillBridge}
                      onChange={(e) => setNewFillBridge(e.target.value)}
                      placeholder="ระหว่างช่องว่าง"
                      className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-xs"
                    />
                    <input
                      value={newFillClosing}
                      onChange={(e) => setNewFillClosing(e.target.value)}
                      placeholder="หลังช่องว่างที่สอง"
                      className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-xs"
                    />
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
      )}
    </div>
  );
};

export default EvaEditorPage;
