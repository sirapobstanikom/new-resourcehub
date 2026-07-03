import React, { useEffect, useMemo, useState } from 'react';
import type { CollectionId } from './AdminDashboard';

type Row = Record<string, unknown>;

export type ResponseItem = {
  rowId: string | number;
  value: string;
};

type NumericInsight = {
  kind: 'numeric';
  column: string;
  avg: number;
  min: number;
  max: number;
  count: number;
};

type CategoryInsight = {
  kind: 'category';
  column: string;
  items: { label: string; count: number }[];
};

type TimelineInsight = {
  kind: 'timeline';
  column: string;
  items: { label: string; count: number }[];
};

type JsonNumericInsight = {
  kind: 'json_numeric';
  column: string;
  keys: { label: string; avg: number; min: number; max: number; count: number }[];
};

type TextInsight = {
  kind: 'text';
  column: string;
  filled: number;
  empty: number;
  responses: ResponseItem[];
};

export type ColumnInsight =
  | NumericInsight
  | CategoryInsight
  | TimelineInsight
  | JsonNumericInsight
  | TextInsight;

export type DashboardTopSection = {
  id: string;
  title: string;
  body: string;
};

export type DashboardSnapshot = {
  collectionId: CollectionId;
  collectionLabel: string;
  rowCount: number;
  columnCount: number;
  dateRangeLabel: string;
  overallNumericAvg: number | null;
  insights: ColumnInsight[];
  numericInsights: NumericInsight[];
  categoryInsights: CategoryInsight[];
  timelineInsights: TimelineInsight[];
  jsonInsights: JsonNumericInsight[];
  textInsights: TextInsight[];
  filledFieldCount: number;
  summaryInsights: ColumnInsight[];
  detailInsights: ColumnInsight[];
  customLabels: Record<string, string>;
  resolvedFieldTitles: Record<string, string>;
  topSections: DashboardTopSection[];
};

const SKIP_COLUMNS = new Set(['id', 'updated_at']);

function isNumericValue(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function parseMaybeNumber(value: unknown): number | null {
  if (isNumericValue(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function isDateColumn(column: string): boolean {
  return column === 'created_at' || column.endsWith('_at') || column.endsWith('_date');
}

export function formatNumber(value: number, digits = 2): string {
  return value.toLocaleString('th-TH', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatThaiDate(value: unknown): string {
  if (value == null) return '—';
  const date = new Date(value as string | number | Date);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function dayKey(value: unknown): string | null {
  if (value == null) return null;
  const date = new Date(value as string | number | Date);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' });
}

export function formatColumnLabel(column: string): string {
  return column
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function stringifyValue(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value).trim();
}

export function buildResponseItems(rows: Row[], column: string): ResponseItem[] {
  return rows
    .filter((row) => row.id != null)
    .map((row) => ({
      rowId: row.id as string | number,
      value: stringifyValue(row[column]),
    }))
    .filter((item) => item.value);
}

function labelsStorageKey(collectionId: CollectionId): string {
  return `admin_dashboard_field_labels_${collectionId}`;
}

function hiddenStorageKey(collectionId: CollectionId): string {
  return `admin_dashboard_hidden_fields_${collectionId}`;
}

function topSectionsStorageKey(collectionId: CollectionId): string {
  return `admin_dashboard_top_sections_${collectionId}`;
}

function loadCustomLabels(collectionId: CollectionId): Record<string, string> {
  try {
    const raw = localStorage.getItem(labelsStorageKey(collectionId));
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function loadHiddenColumns(collectionId: CollectionId): string[] {
  try {
    const raw = localStorage.getItem(hiddenStorageKey(collectionId));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function loadTopSections(collectionId: CollectionId): DashboardTopSection[] {
  try {
    const raw = localStorage.getItem(topSectionsStorageKey(collectionId));
    return raw ? (JSON.parse(raw) as DashboardTopSection[]) : [];
  } catch {
    return [];
  }
}

function hasTopSectionContent(section: DashboardTopSection): boolean {
  return Boolean(section.title.trim() || section.body.trim());
}

function getVisibleTopSections(sections: DashboardTopSection[]): DashboardTopSection[] {
  return sections.filter(hasTopSectionContent);
}

function createTopSection(): DashboardTopSection {
  return { id: `top-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, title: '', body: '' };
}

function getDisplayTitle(column: string, customLabels: Record<string, string>): string {
  const custom = customLabels[column]?.trim();
  return custom || formatColumnLabel(column);
}

function subKeyLabelKey(column: string, subKey: string): string {
  return `${column}::${subKey}`;
}

function getSubKeyDisplayTitle(column: string, subKey: string, customLabels: Record<string, string>): string {
  const custom =
    customLabels[subKeyLabelKey(column, subKey)]?.trim() ||
    customLabels[subKey]?.trim();
  return custom || formatColumnLabel(subKey);
}

function getInsightLabelKey(insight: ColumnInsight): string {
  if (insight.kind === 'json_numeric' && insight.keys.length === 1) {
    return subKeyLabelKey(insight.column, insight.keys[0].label);
  }
  return insight.column;
}

function getInsightCardTitle(insight: ColumnInsight, customLabels: Record<string, string>): string {
  if (insight.kind === 'json_numeric') {
    if (insight.keys.length === 1) {
      return getSubKeyDisplayTitle(insight.column, insight.keys[0].label, customLabels);
    }
    const parentCustom = customLabels[insight.column]?.trim();
    if (parentCustom) return parentCustom;
  }
  return getDisplayTitle(insight.column, customLabels);
}

function getInsightCardColumnKey(insight: ColumnInsight): string {
  if (insight.kind === 'json_numeric' && insight.keys.length === 1) {
    return insight.keys[0].label;
  }
  return insight.column;
}

function hasCustomInsightTitle(insight: ColumnInsight, customLabels: Record<string, string>): boolean {
  const labelKey = getInsightLabelKey(insight);
  return Boolean(customLabels[labelKey]?.trim() || customLabels[insight.column]?.trim());
}

function buildResolvedFieldTitles(
  insights: ColumnInsight[],
  customLabels: Record<string, string>,
): Record<string, string> {
  const resolved: Record<string, string> = {};
  insights.forEach((insight) => {
    resolved[insight.column] = getInsightCardTitle(insight, customLabels);
    if (insight.kind === 'json_numeric') {
      insight.keys.forEach((key) => {
        resolved[subKeyLabelKey(insight.column, key.label)] = getSubKeyDisplayTitle(
          insight.column,
          key.label,
          customLabels,
        );
      });
    }
  });
  return resolved;
}

type FieldTitleEntry = {
  labelKey: string;
  columnKey: string;
  subKey?: string;
  section: 'summary' | 'detail';
};

function buildFieldTitleEntries(insights: ColumnInsight[]): FieldTitleEntry[] {
  return insights.flatMap((insight) => {
    const section: FieldTitleEntry['section'] = isSummaryInsight(insight) ? 'summary' : 'detail';
    if (insight.kind === 'json_numeric' && insight.keys.length > 1) {
      return insight.keys.map((key) => ({
        labelKey: subKeyLabelKey(insight.column, key.label),
        columnKey: insight.column,
        subKey: key.label,
        section,
      }));
    }
    if (insight.kind === 'json_numeric' && insight.keys.length === 1) {
      return [
        {
          labelKey: subKeyLabelKey(insight.column, insight.keys[0].label),
          columnKey: insight.keys[0].label,
          subKey: insight.keys[0].label,
          section,
        },
      ];
    }
    return [
      {
        labelKey: insight.column,
        columnKey: insight.column,
        section,
      },
    ];
  });
}

function getFieldDisplayTitle(
  entry: FieldTitleEntry,
  customLabels: Record<string, string>,
): string {
  const custom = customLabels[entry.labelKey]?.trim();
  if (custom) return custom;
  if (entry.subKey) return formatColumnLabel(entry.subKey);
  return formatColumnLabel(entry.columnKey);
}

function applyColumnLabel(
  labels: Record<string, string>,
  labelKey: string,
  value: string,
  fallbackColumnKey: string,
): Record<string, string> {
  const trimmed = value.trim();
  const next = { ...labels };
  const fallbackTitle = formatColumnLabel(
    labelKey.includes('::') ? labelKey.split('::')[1] : fallbackColumnKey,
  );
  if (!trimmed || trimmed === fallbackTitle) {
    delete next[labelKey];
  } else {
    next[labelKey] = trimmed;
  }
  return next;
}

function formatAnswersLabel(count: number): string {
  if (count <= 1) return '';
  return `${count.toLocaleString('th-TH')} การตอบ`;
}

function formatItemsLabel(count: number): string {
  if (count <= 1) return '';
  return `${count.toLocaleString('th-TH')} รายการ`;
}

function formatTimesLabel(count: number): string {
  if (count <= 1) return '';
  return `${count.toLocaleString('th-TH')} ครั้ง`;
}

function isSummaryInsight(insight: ColumnInsight): boolean {
  return insight.kind === 'numeric' || insight.kind === 'json_numeric';
}

function isDetailInsight(insight: ColumnInsight): boolean {
  return insight.kind === 'text' || insight.kind === 'timeline' || insight.kind === 'category';
}

function splitInsights(insights: ColumnInsight[]) {
  return {
    summaryInsights: insights.filter(isSummaryInsight),
    detailInsights: insights.filter(isDetailInsight),
  };
}

function joinMeta(parts: string[]): string {
  return parts.filter(Boolean).join(' · ');
}

const longTextClass = 'break-words [overflow-wrap:anywhere] whitespace-pre-wrap';
const readableBodyClass = `${longTextClass} text-sm leading-6 text-white/90`;
const readableTitleClass = `${longTextClass} text-base font-semibold leading-snug text-white sm:text-lg`;
const readableMutedClass = 'text-xs leading-relaxed text-white/50';

function flattenJsonNumbers(value: unknown): Record<string, number[]> {
  const result: Record<string, number[]> = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return result;

  Object.entries(value as Record<string, unknown>).forEach(([key, raw]) => {
    const num = parseMaybeNumber(raw);
    if (num != null) {
      result[key] = result[key] || [];
      result[key].push(num);
    }
  });
  return result;
}

export function analyzeRows(rows: Row[], columns: string[]): ColumnInsight[] {
  const insights: ColumnInsight[] = [];

  columns.forEach((column) => {
    if (SKIP_COLUMNS.has(column)) return;

    const values = rows.map((row) => row[column]);
    const nonNull = values.filter((value) => value != null && value !== '');
    if (nonNull.length === 0) return;

    if (isDateColumn(column)) {
      const grouped = nonNull.reduce<Record<string, number>>((acc, value) => {
        const key = dayKey(value);
        if (!key) return acc;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
      const items = Object.entries(grouped)
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => {
          const ad = new Date(a.label).getTime();
          const bd = new Date(b.label).getTime();
          if (!Number.isNaN(ad) && !Number.isNaN(bd)) return ad - bd;
          return a.label.localeCompare(b.label);
        });
      if (items.length > 0) insights.push({ kind: 'timeline', column, items });
      return;
    }

    const hasObject = nonNull.some((value) => typeof value === 'object' && value !== null && !Array.isArray(value));
    if (hasObject) {
      const merged: Record<string, number[]> = {};
      nonNull.forEach((value) => {
        const chunk = flattenJsonNumbers(value);
        Object.entries(chunk).forEach(([key, nums]) => {
          merged[key] = (merged[key] || []).concat(nums);
        });
      });
      const keys = Object.entries(merged)
        .map(([label, nums]) => ({
          label,
          avg: nums.reduce((sum, n) => sum + n, 0) / nums.length,
          min: Math.min(...nums),
          max: Math.max(...nums),
          count: nums.length,
        }))
        .sort((a, b) => b.avg - a.avg);
      if (keys.length > 0) {
        insights.push({ kind: 'json_numeric', column, keys });
        return;
      }

      const responses = buildResponseItems(rows, column);
      insights.push({
        kind: 'text',
        column,
        filled: responses.length,
        empty: rows.length - responses.length,
        responses,
      });
      return;
    }

    const numericValues = nonNull
      .map((value) => parseMaybeNumber(value))
      .filter((value): value is number => value != null);
    const isScoreLike = /score|rating|point|rank/i.test(column);

    if (
      numericValues.length > 0 &&
      (isScoreLike || numericValues.length >= Math.max(1, Math.floor(nonNull.length * 0.4)))
    ) {
      const sum = numericValues.reduce((acc, value) => acc + value, 0);
      insights.push({
        kind: 'numeric',
        column,
        avg: sum / numericValues.length,
        min: Math.min(...numericValues),
        max: Math.max(...numericValues),
        count: numericValues.length,
      });
      return;
    }

    const labels = nonNull.map((value) => stringifyValue(value)).filter(Boolean);
    const avgLength = labels.reduce((sum, label) => sum + label.length, 0) / Math.max(labels.length, 1);

    if (avgLength > 80) {
      const responses = buildResponseItems(rows, column);
      insights.push({
        kind: 'text',
        column,
        filled: responses.length,
        empty: rows.length - responses.length,
        responses,
      });
      return;
    }

    const grouped = labels.reduce<Record<string, number>>((acc, label) => {
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {});
    const items = Object.entries(grouped)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
    insights.push({ kind: 'category', column, items });
  });

  return insights;
}

export function buildDashboardSnapshot({
  collectionId,
  collectionLabel,
  rows,
  columns,
  dateFrom,
  dateTo,
  customLabels = {},
  hiddenColumns = [],
  topSections = [],
}: {
  collectionId: CollectionId;
  collectionLabel: string;
  rows: Row[];
  columns: string[];
  dateFrom: string;
  dateTo: string;
  customLabels?: Record<string, string>;
  hiddenColumns?: string[];
  topSections?: DashboardTopSection[];
}): DashboardSnapshot {
  const hiddenSet = new Set(hiddenColumns);
  const insights = analyzeRows(rows, columns).filter((item) => !hiddenSet.has(item.column));
  const numericInsights = insights.filter((item): item is NumericInsight => item.kind === 'numeric');
  const categoryInsights = insights.filter((item): item is CategoryInsight => item.kind === 'category');
  const timelineInsights = insights.filter((item): item is TimelineInsight => item.kind === 'timeline');
  const jsonInsights = insights.filter((item): item is JsonNumericInsight => item.kind === 'json_numeric');
  const textInsights = insights.filter((item): item is TextInsight => item.kind === 'text');

  const createdValues = rows.map((row) => row.created_at).filter((value) => value != null);
  const earliest = createdValues.length
    ? createdValues.reduce((min, value) => (new Date(value as string) < new Date(min as string) ? value : min))
    : null;
  const latest = createdValues.length
    ? createdValues.reduce((max, value) => (new Date(value as string) > new Date(max as string) ? value : max))
    : null;

  const overallNumericAvg =
    numericInsights.length > 0
      ? numericInsights.reduce((sum, item) => sum + item.avg, 0) / numericInsights.length
      : null;

  const dateRangeLabel =
    dateFrom || dateTo
      ? `${dateFrom ? formatThaiDate(dateFrom) : 'เริ่มต้น'} → ${dateTo ? formatThaiDate(dateTo) : 'ปัจจุบัน'}`
      : earliest && latest
        ? `${formatThaiDate(earliest)} → ${formatThaiDate(latest)}`
        : 'ไม่มีข้อมูลวันที่';

  return {
    collectionId,
    collectionLabel,
    rowCount: rows.length,
    columnCount: columns.length,
    dateRangeLabel,
    overallNumericAvg,
    insights,
    numericInsights,
    categoryInsights,
    timelineInsights,
    jsonInsights,
    textInsights,
    filledFieldCount: insights.length,
    ...splitInsights(insights),
    customLabels,
    resolvedFieldTitles: buildResolvedFieldTitles(insights, customLabels),
    topSections: getVisibleTopSections(topSections),
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderHtmlDataRows(
  items: { label: string; value: string }[],
): string {
  if (items.length === 0) return '';
  return `
    <div class="data-rows">
      ${items
        .map(
          (item) => `
        <div class="data-row ${item.label.length <= 42 && item.value ? 'row-inline' : ''}">
          <span class="data-label">${escapeHtml(item.label)}</span>
          ${item.value ? `<span class="data-value">${escapeHtml(item.value)}</span>` : ''}
        </div>`,
        )
        .join('')}
    </div>`;
}

function renderHtmlTimelineList(items: { label: string; count: number }[]): string {
  return renderHtmlDataRows(
    items.map((item) => ({
      label: item.label,
      value: formatItemsLabel(item.count),
    })),
  );
}

function renderHtmlResponses(responses: ResponseItem[]): string {
  return `
    <div class="response-list">
      ${responses
        .map(
          (response, index) => `
        <article class="response-item">
          ${responses.length > 1 ? `<span class="response-index">${index + 1}</span>` : ''}
          <p>${escapeHtml(response.value)}</p>
        </article>`,
        )
        .join('')}
    </div>`;
}

function renderHtmlPanelHead(
  title: string,
  meta: string,
  columnKey: string,
  showColumnKey = true,
): string {
  const columnHtml = showColumnKey
    ? `<span class="panel-column-key">${escapeHtml(columnKey)}</span>`
    : '';
  return `<div class="panel-head"><h2>${escapeHtml(title)}</h2>${columnHtml}${meta ? `<span class="panel-meta">${escapeHtml(meta)}</span>` : ''}</div>`;
}

function renderHtmlNumericPills(avg: number, min: number, max: number): string {
  return `
        <div class="stat-pills">
          <div class="stat-pill"><p>เฉลี่ย</p><strong>${formatNumber(avg)}</strong></div>
          <div class="stat-pill"><p>ต่ำสุด</p><strong>${formatNumber(min)}</strong></div>
          <div class="stat-pill"><p>สูงสุด</p><strong>${formatNumber(max)}</strong></div>
        </div>`;
}

function renderHtmlFieldInsight(
  insight: ColumnInsight,
  customLabels: Record<string, string>,
  resolvedFieldTitles: Record<string, string>,
  options: { summary?: boolean } = {},
): string {
  const label = resolvedFieldTitles[insight.column] || getInsightCardTitle(insight, customLabels);
  const columnKey = getInsightCardColumnKey(insight);
  const meta = fieldInsightMeta(insight);
  const showColumnKey = options.summary ? !hasCustomInsightTitle(insight, customLabels) : true;
  const head = renderHtmlPanelHead(label, meta, columnKey, showColumnKey);

  if (insight.kind === 'timeline') {
    return `
      <section class="panel">
        ${head}
        ${renderHtmlTimelineList(insight.items)}
      </section>`;
  }

  if (insight.kind === 'numeric') {
    return `
      <section class="panel">
        ${head}
        ${renderHtmlNumericPills(insight.avg, insight.min, insight.max)}
      </section>`;
  }

  if (insight.kind === 'json_numeric') {
    const keysHtml = insight.keys
      .map((key) => {
        const subTitle =
          resolvedFieldTitles[subKeyLabelKey(insight.column, key.label)] ||
          getSubKeyDisplayTitle(insight.column, key.label, customLabels);
        const subHead =
          insight.keys.length > 1
            ? `<p class="sub-key-label">${escapeHtml(subTitle)}</p><span class="panel-column-key">${escapeHtml(key.label)}</span>`
            : '';
        return `
        ${subHead}
        ${renderHtmlNumericPills(key.avg, key.min, key.max)}`;
      })
      .join('');
    return `
      <section class="panel">
        ${head}
        <div class="json-numeric-keys">${keysHtml}</div>
      </section>`;
  }

  if (insight.kind === 'category') {
    return `
      <section class="panel panel-wide">
        ${head}
        ${renderHtmlDataRows(
          insight.items.map((item) => ({
            label: item.label,
            value: formatTimesLabel(item.count),
          })),
        )}
      </section>`;
  }

  return `
    <section class="panel panel-wide">
      ${head}
      ${renderHtmlResponses(insight.responses)}
    </section>`;
}

function renderHtmlTopSections(sections: DashboardTopSection[]): string {
  const visible = getVisibleTopSections(sections);
  if (visible.length === 0) return '';
  return visible
    .map(
      (section) => `
    <section class="top-section">
      ${section.title.trim() ? `<h2 class="top-section-title">${escapeHtml(section.title.trim())}</h2>` : ''}
      ${section.body.trim() ? `<p class="top-section-body">${escapeHtml(section.body.trim())}</p>` : ''}
    </section>`,
    )
    .join('');
}

export function generateDashboardHtml(snapshot: DashboardSnapshot): string {
  const {
    collectionLabel,
    rowCount,
    columnCount,
    summaryInsights,
    detailInsights,
    filledFieldCount,
    customLabels,
    resolvedFieldTitles,
    topSections,
  } = snapshot;

  const summarySections =
    summaryInsights.length > 0
      ? summaryInsights
          .map((insight) =>
            renderHtmlFieldInsight(insight, customLabels, resolvedFieldTitles, { summary: true }),
          )
          .join('')
      : '';

  const detailSections =
    detailInsights.length > 0
      ? detailInsights
          .map((insight) => renderHtmlFieldInsight(insight, customLabels, resolvedFieldTitles))
          .join('')
      : '';

  const emptyHtml = `<section class="panel empty">ไม่พบหัวข้อที่ผู้ใช้กรอกในชุดข้อมูลนี้</section>`;

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(collectionLabel)} — MindDoJo Dashboard</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #ffffff;
      background: linear-gradient(180deg, #0a0705 0%, #050403 55%, #000000 100%);
      min-height: 100vh;
    }
    .wrap { max-width: 1100px; margin: 0 auto; padding: 24px 16px 40px; }
    .hero {
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 14px;
      padding: 18px 20px;
      background: rgba(255,255,255,0.04);
      margin-bottom: 16px;
    }
    .eyebrow { color: rgba(255,255,255,0.45); font-size: 12px; }
    h1 {
      margin: 6px 0 0;
      font-size: clamp(1.15rem, 2.5vw, 1.5rem);
      line-height: 1.35;
      font-weight: 600;
      color: #ffffff;
      word-break: break-word;
      overflow-wrap: anywhere;
    }
    .meta { margin-top: 12px; display: flex; flex-wrap: wrap; gap: 6px; }
    .pill {
      border-radius: 8px;
      padding: 5px 10px;
      font-size: 12px;
      background: rgba(255,255,255,0.05);
      color: rgba(255,255,255,0.7);
    }
    .grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
    @media (min-width: 1024px) {
      .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    .panel {
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 14px 16px;
      background: rgba(255,255,255,0.03);
      min-width: 0;
    }
    .panel-wide { grid-column: 1 / -1; }
    .panel-head {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 6px;
      margin-bottom: 12px;
      padding-bottom: 10px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .panel-head h2 {
      margin: 0;
      font-size: 1rem;
      line-height: 1.4;
      font-weight: 600;
      color: #ffffff;
      word-break: break-word;
      overflow-wrap: anywhere;
      width: 100%;
    }
    .panel-column-key {
      display: block;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      color: rgba(255,255,255,0.35);
      word-break: break-all;
    }
    .panel-meta {
      display: inline-block;
      border-radius: 6px;
      padding: 2px 8px;
      background: rgba(255,255,255,0.05);
      color: rgba(255,255,255,0.45);
      font-size: 11px;
      line-height: 1.4;
    }
    .data-rows {
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 10px;
      overflow: hidden;
      background: rgba(255,255,255,0.02);
    }
    .data-row {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 10px 12px;
      border-top: 1px solid rgba(255,255,255,0.06);
    }
    .data-row:first-child { border-top: none; }
    @media (min-width: 640px) {
      .data-row.row-inline {
        flex-direction: row;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
      }
    }
    .data-label {
      flex: 1;
      color: rgba(255,255,255,0.9);
      font-size: 14px;
      line-height: 1.6;
      word-break: break-word;
      overflow-wrap: anywhere;
      white-space: pre-wrap;
    }
    .data-value {
      align-self: flex-start;
      border-radius: 6px;
      padding: 4px 8px;
      background: rgba(250,204,21,0.12);
      color: #fde68a;
      font-size: 12px;
      font-weight: 600;
    }
    .stat-pills {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
      gap: 8px;
    }
    .stat-pill {
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px;
      padding: 12px;
      background: rgba(255,255,255,0.04);
      text-align: center;
    }
    .stat-pill p { margin: 0; color: rgba(255,255,255,0.5); font-size: 12px; }
    .stat-pill strong { display: block; margin-top: 4px; color: #ffffff; font-size: 1.25rem; font-weight: 700; }
    .json-numeric-keys { display: grid; gap: 12px; }
    .sub-key-label { margin: 0 0 6px; font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.55); word-break: break-word; }
    .response-list { display: grid; gap: 8px; }
    .response-item {
      position: relative;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 10px;
      background: rgba(255,255,255,0.02);
      padding: 10px 12px 10px 16px;
    }
    .response-item::before {
      content: "";
      position: absolute;
      left: 0;
      top: 10px;
      bottom: 10px;
      width: 3px;
      border-radius: 999px;
      background: rgba(250,204,21,0.8);
    }
    .response-index {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 22px;
      height: 22px;
      margin-bottom: 6px;
      border-radius: 6px;
      background: rgba(250,204,21,0.12);
      color: #fde68a;
      font-size: 12px;
      font-weight: 600;
    }
    .response-item p {
      margin: 0;
      color: rgba(255,255,255,0.9);
      font-size: 14px;
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-word;
      overflow-wrap: anywhere;
    }
    .section-title {
      margin: 0 0 12px;
      font-size: 1rem;
      line-height: 1.4;
      font-weight: 600;
      color: #ffffff;
      word-break: break-word;
    }
    .section-block + .section-block { margin-top: 28px; padding-top: 4px; border-top: 1px solid rgba(255,255,255,0.08); }
    .top-section {
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 14px;
      padding: 16px 18px;
      background: rgba(255,255,255,0.03);
      margin-bottom: 12px;
    }
    .top-section-title {
      margin: 0 0 8px;
      font-size: 1.05rem;
      line-height: 1.45;
      font-weight: 600;
      color: #ffffff;
      word-break: break-word;
      overflow-wrap: anywhere;
    }
    .top-section-body {
      margin: 0;
      font-size: 14px;
      line-height: 1.65;
      color: rgba(255,255,255,0.88);
      white-space: pre-wrap;
      word-break: break-word;
      overflow-wrap: anywhere;
    }
    .empty { text-align: center; color: rgba(255,255,255,0.55); padding: 40px 20px; }
    @media (max-width: 720px) {
      .data-row { flex-direction: column; align-items: flex-start; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <section class="hero">
      <div class="eyebrow">สรุปข้อมูล</div>
      <h1>${escapeHtml(collectionLabel)}</h1>
      <div class="meta">
        <span class="pill">${rowCount.toLocaleString('th-TH')} แถว</span>
        <span class="pill">${columnCount} คอลัมน์</span>
        <span class="pill">${filledFieldCount} หัวข้อ</span>
      </div>
    </section>
    ${renderHtmlTopSections(topSections)}
    ${
      summaryInsights.length > 0
        ? `<div class="section-block">
      <h2 class="section-title">สรุปคะแนน (${summaryInsights.length} หัวข้อตัวเลข)</h2>
      <div class="grid">${summarySections}</div>
    </div>`
        : ''
    }
    ${
      detailInsights.length > 0
        ? `<div class="section-block">
      <h2 class="section-title">รายละเอียดข้อมูล (${detailInsights.length} หัวข้อ)</h2>
      <div class="grid">${detailSections}</div>
    </div>`
        : ''
    }
    ${summaryInsights.length === 0 && detailInsights.length === 0 ? emptyHtml : ''}
  </div>
</body>
</html>`;
}

export function downloadDashboardHtml(snapshot: DashboardSnapshot): void {
  const html = generateDashboardHtml(snapshot);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  anchor.href = url;
  anchor.download = `${snapshot.collectionId}_dashboard_${date}.html`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function DataRowList({ items }: { items: { label: string; value: string }[] }) {
  return (
    <ul className="divide-y divide-white/8 rounded-xl border border-white/10 bg-white/[0.03]">
      {items.map((item) => (
        <li
          key={`${item.label}-${item.value}`}
          className="flex flex-col gap-1.5 px-3 py-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3 sm:px-3.5"
        >
          <span className={`flex-1 ${readableBodyClass}`}>{item.label}</span>
          {item.value && (
            <span className="shrink-0 self-start rounded-md bg-yellow-400/15 px-2 py-1 text-xs font-semibold text-yellow-200">
              {item.value}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

function NumericSummaryPills({ avg, min, max }: { avg: number; min: number; max: number }) {
  const pills = [
    { label: 'เฉลี่ย', value: formatNumber(avg) },
    { label: 'ต่ำสุด', value: formatNumber(min) },
    { label: 'สูงสุด', value: formatNumber(max) },
  ];
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {pills.map((pill) => (
        <div key={pill.label} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-center">
          <p className="text-xs text-white/50">{pill.label}</p>
          <p className="mt-1 text-xl font-bold text-white">{pill.value}</p>
        </div>
      ))}
    </div>
  );
}

function ResponseList({
  responses,
  onDeleteRow,
  deletingRowId,
}: {
  responses: ResponseItem[];
  onDeleteRow?: (rowId: string | number) => void;
  deletingRowId: string | number | null;
}) {
  return (
    <div className="space-y-2.5">
      {responses.map((response, index) => (
        <article
          key={`${response.rowId}-${index}`}
          className="relative rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-4 pr-3 sm:py-3 sm:pl-5 sm:pr-4"
        >
          <div className="absolute inset-y-2.5 left-0 w-0.5 rounded-full bg-yellow-400/80 sm:inset-y-3" />
          <div className="mb-2 flex items-start justify-between gap-2">
            {responses.length > 1 ? (
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-yellow-400/15 text-xs font-semibold text-yellow-200">
                {index + 1}
              </span>
            ) : (
              <span />
            )}
            {onDeleteRow && (
              <button
                type="button"
                onClick={() => onDeleteRow(response.rowId)}
                disabled={deletingRowId === response.rowId}
                className="shrink-0 self-start rounded-md border border-red-400/25 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-300 hover:bg-red-500/15 disabled:opacity-50"
              >
                {deletingRowId === response.rowId ? 'กำลังลบ...' : 'ลบข้อมูล'}
              </button>
            )}
          </div>
          <p className={readableBodyClass}>{response.value}</p>
        </article>
      ))}
    </div>
  );
}

function RowRecordsList({
  entries,
  onDeleteRow,
  deletingRowId,
}: {
  entries: ResponseItem[];
  onDeleteRow?: (rowId: string | number) => void;
  deletingRowId: string | number | null;
}) {
  if (entries.length === 0 || !onDeleteRow) return null;

  return (
    <div className="mt-3 border-t border-white/8 pt-3">
      <p className="mb-2 text-xs font-medium text-white/45">ลบข้อมูล</p>
      <div className="space-y-1.5">
        {entries.map((entry) => (
          <div
            key={entry.rowId}
            className="flex flex-col gap-2 rounded-lg border border-white/8 bg-black/20 px-3 py-2 sm:flex-row sm:items-start sm:justify-between"
          >
            <span className={`flex-1 ${readableBodyClass}`}>{entry.value}</span>
            <button
              type="button"
              onClick={() => onDeleteRow(entry.rowId)}
              disabled={deletingRowId === entry.rowId}
              className="shrink-0 self-start rounded-md border border-red-400/25 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-300 hover:bg-red-500/15 disabled:opacity-50"
            >
              {deletingRowId === entry.rowId ? 'กำลังลบ...' : 'ลบ'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function FieldInsightContent({
  insight,
  entries,
  customLabels,
  onDeleteRow,
  deletingRowId,
}: {
  insight: ColumnInsight;
  entries: ResponseItem[];
  customLabels: Record<string, string>;
  onDeleteRow?: (rowId: string | number) => void;
  deletingRowId: string | number | null;
}) {
  if (insight.kind === 'timeline') {
    return (
      <>
        <DataRowList
          items={insight.items.map((item) => ({
            label: item.label,
            value: formatItemsLabel(item.count),
          }))}
        />
        <RowRecordsList entries={entries} onDeleteRow={onDeleteRow} deletingRowId={deletingRowId} />
      </>
    );
  }

  if (insight.kind === 'numeric') {
    return <NumericSummaryPills avg={insight.avg} min={insight.min} max={insight.max} />;
  }

  if (insight.kind === 'json_numeric') {
    return (
      <div className="space-y-3">
        {insight.keys.map((key) => (
          <div key={key.label}>
            {insight.keys.length > 1 && (
              <div className="mb-2 space-y-0.5">
                <p className="text-xs font-medium text-white/70">
                  {getSubKeyDisplayTitle(insight.column, key.label, customLabels)}
                </p>
                <p className="font-mono text-[11px] text-white/35 break-all">{key.label}</p>
              </div>
            )}
            <NumericSummaryPills avg={key.avg} min={key.min} max={key.max} />
          </div>
        ))}
      </div>
    );
  }

  if (insight.kind === 'category') {
    return (
      <>
        <DataRowList
          items={insight.items.map((item) => ({
            label: item.label,
            value: formatTimesLabel(item.count),
          }))}
        />
        <RowRecordsList entries={entries} onDeleteRow={onDeleteRow} deletingRowId={deletingRowId} />
      </>
    );
  }

  return (
    <ResponseList
      responses={insight.responses}
      onDeleteRow={onDeleteRow}
      deletingRowId={deletingRowId}
    />
  );
}

function fieldInsightMeta(insight: ColumnInsight): string {
  if (insight.kind === 'timeline') {
    return insight.items.length > 1 ? `${insight.items.length} วัน` : '';
  }
  if (insight.kind === 'numeric') {
    return joinMeta([`เฉลี่ย ${formatNumber(insight.avg)}`, formatAnswersLabel(insight.count)]);
  }
  if (insight.kind === 'json_numeric') {
    return insight.keys.length > 1 ? `${insight.keys.length} หัวข้อย่อย` : '';
  }
  if (insight.kind === 'category') {
    const total = insight.items.reduce((sum, item) => sum + item.count, 0);
    return joinMeta([
      insight.items.length > 1 ? `${insight.items.length} ค่าที่แตกต่าง` : '',
      formatAnswersLabel(total),
    ]);
  }
  return joinMeta([
    formatAnswersLabel(insight.filled),
    insight.empty > 0 ? `ว่าง ${insight.empty.toLocaleString('th-TH')}` : '',
  ]);
}

function InsightFieldTitlesPanel({
  summaryInsights,
  detailInsights,
  customLabels,
  onLabelChange,
}: {
  summaryInsights: ColumnInsight[];
  detailInsights: ColumnInsight[];
  customLabels: Record<string, string>;
  onLabelChange: (entry: FieldTitleEntry, value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const summaryEntries = buildFieldTitleEntries(summaryInsights);
  const detailEntries = buildFieldTitleEntries(detailInsights);
  const allEntries = [...summaryEntries, ...detailEntries];
  if (allEntries.length === 0) return null;

  const customCount = allEntries.filter((entry) => customLabels[entry.labelKey]?.trim()).length;

  const renderEditors = (entries: FieldTitleEntry[], sectionLabel: string) => {
    if (entries.length === 0) return null;
    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold text-yellow-200/85">{sectionLabel}</p>
        {entries.map((entry) => {
          const displayTitle = getFieldDisplayTitle(entry, customLabels);
          return (
            <div
              key={entry.labelKey}
              className="rounded-lg border border-white/8 bg-black/20 px-3 py-2.5"
            >
              <input
                type="text"
                value={customLabels[entry.labelKey] ?? ''}
                onChange={(event) => onLabelChange(entry, event.target.value)}
                placeholder={entry.subKey ? formatColumnLabel(entry.subKey) : formatColumnLabel(entry.columnKey)}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-yellow-400/40"
              />
              <p className="mt-1.5 font-mono text-[11px] text-white/35 break-all">{entry.columnKey}</p>
              <p className={`mt-1 ${readableMutedClass}`}>ชื่อที่แสดง: {displayTitle}</p>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03]">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left sm:px-5"
      >
        <div>
          <p className="text-sm font-medium text-white">แก้ชื่อหัวข้อแต่ละฟิลด์</p>
          <p className={`mt-0.5 ${readableMutedClass}`}>
            ชื่อเล็กด้านล่างคือคอลัมน์ในฐานข้อมูล · ใส่ชื่อที่อ่านง่ายด้านบนได้ · อัปเดตทั้งสรุปคะแนนและ HTML
            {customCount > 0 ? ` · ตั้งชื่อแล้ว ${customCount} ฟิลด์` : ''}
          </p>
        </div>
        <span className="shrink-0 text-xs text-white/45">{open ? 'ซ่อน ▲' : 'แสดง ▼'}</span>
      </button>
      {open && (
        <div className="border-t border-white/8 px-4 py-3 sm:px-5 sm:py-4">
          <div className="max-h-96 space-y-4 overflow-y-auto pr-1">
            {renderEditors(summaryEntries, 'สรุปคะแนน')}
            {renderEditors(detailEntries, 'รายละเอียดข้อมูล')}
          </div>
        </div>
      )}
    </section>
  );
}

function DashboardTopSectionsPanel({
  sections,
  onChange,
}: {
  sections: DashboardTopSection[];
  onChange: (sections: DashboardTopSection[]) => void;
}) {
  const updateSection = (id: string, patch: Partial<Pick<DashboardTopSection, 'title' | 'body'>>) => {
    onChange(sections.map((section) => (section.id === id ? { ...section, ...patch } : section)));
  };

  const removeSection = (id: string) => {
    onChange(sections.filter((section) => section.id !== id));
  };

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-white">หัวข้อด้านบน</p>
          <p className={`mt-0.5 ${readableMutedClass}`}>เพิ่มหัวข้อหรือข้อความแสดงด้านบน Dashboard · ไม่ใส่ก็ได้</p>
        </div>
        <button
          type="button"
          onClick={() => onChange([...sections, createTopSection()])}
          className="shrink-0 rounded-lg border border-yellow-400/25 bg-yellow-400/10 px-3 py-2 text-xs font-medium text-yellow-200 hover:bg-yellow-400/20"
        >
          + เพิ่มหัวข้อ
        </button>
      </div>

      {sections.length === 0 ? (
        <p className="rounded-lg border border-dashed border-white/10 px-4 py-6 text-center text-sm text-white/45">
          ยังไม่มีหัวข้อด้านบน — กด &quot;เพิ่มหัวข้อ&quot; ถ้าต้องการใส่
        </p>
      ) : (
        <div className="space-y-3">
          {sections.map((section, index) => (
            <div key={section.id} className="rounded-lg border border-white/10 bg-black/20 p-3 sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-white/50">หัวข้อที่ {index + 1}</p>
                <button
                  type="button"
                  onClick={() => removeSection(section.id)}
                  className="rounded-md border border-red-400/25 bg-red-500/10 px-2 py-1 text-[11px] text-red-300 hover:bg-red-500/15"
                >
                  ลบหัวข้อ
                </button>
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  value={section.title}
                  onChange={(event) => updateSection(section.id, { title: event.target.value })}
                  placeholder="ชื่อหัวข้อ (ไม่บังคับ)"
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-yellow-400/40"
                />
                <textarea
                  value={section.body}
                  onChange={(event) => updateSection(section.id, { body: event.target.value })}
                  rows={3}
                  placeholder="เนื้อหา / คำอธิบาย (ไม่บังคับ)"
                  className={`w-full resize-y rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-yellow-400/40 ${longTextClass}`}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function DashboardTopSectionsDisplay({ sections }: { sections: DashboardTopSection[] }) {
  const visible = getVisibleTopSections(sections);
  if (visible.length === 0) return null;

  return (
    <div className="space-y-3">
      {visible.map((section) => (
        <section key={section.id} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4 sm:px-5 sm:py-5">
          {section.title.trim() && <h4 className={readableTitleClass}>{section.title.trim()}</h4>}
          {section.body.trim() && (
            <p className={`${section.title.trim() ? 'mt-2' : ''} ${readableBodyClass}`}>{section.body.trim()}</p>
          )}
        </section>
      ))}
    </div>
  );
}

function InsightCard({
  title,
  columnKey,
  meta,
  children,
  wide,
  onEditTitle,
  onHideTopic,
  isEditing,
  editingValue,
  onEditingValueChange,
  onSaveTitle,
  onCancelEdit,
}: {
  title: string;
  columnKey?: string;
  meta?: string;
  children: React.ReactNode;
  wide?: boolean;
  onEditTitle?: () => void;
  onHideTopic?: () => void;
  isEditing?: boolean;
  editingValue?: string;
  onEditingValueChange?: (value: string) => void;
  onSaveTitle?: () => void;
  onCancelEdit?: () => void;
}) {
  return (
    <section className={`min-w-0 rounded-xl border border-white/10 bg-white/[0.03] p-3.5 sm:p-4 ${wide ? 'lg:col-span-2' : ''}`}>
      <div className="mb-3 border-b border-white/8 pb-3">
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editingValue ?? ''}
              onChange={(event) => onEditingValueChange?.(event.target.value)}
              rows={Math.min(3, Math.max(2, Math.ceil((editingValue?.length || 0) / 48)))}
              className={`w-full resize-y rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-yellow-400/40 ${longTextClass}`}
              placeholder="เช่น 1. ความพึงพอใจโดยรวมต่อ Facilitator *"
            />
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={onSaveTitle}
                className="rounded-md bg-yellow-400 px-3 py-1.5 text-xs font-semibold text-black hover:bg-yellow-300"
              >
                บันทึก
              </button>
              <button
                type="button"
                onClick={onCancelEdit}
                className="rounded-md border border-white/15 px-3 py-1.5 text-xs text-white/80 hover:bg-white/5"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1 space-y-1">
              <h4 className={readableTitleClass}>{title}</h4>
              {columnKey && (
                <p className="font-mono text-[11px] text-white/35 break-all">{columnKey}</p>
              )}
              {meta && (
                <span className="inline-block rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-white/45">{meta}</span>
              )}
            </div>
            {(onEditTitle || onHideTopic) && (
              <div className="flex shrink-0 flex-wrap gap-1.5">
                {onEditTitle && (
                  <button
                    type="button"
                    onClick={onEditTitle}
                    className="rounded-md border border-yellow-400/25 bg-yellow-400/10 px-2.5 py-1 text-xs font-medium text-yellow-200 hover:bg-yellow-400/20"
                  >
                    แก้ไขหัวข้อ
                  </button>
                )}
                {onHideTopic && (
                  <button
                    type="button"
                    onClick={onHideTopic}
                    className="rounded-md border border-red-400/25 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-300 hover:bg-red-500/15"
                  >
                    ลบหัวข้อ
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      {children}
    </section>
  );
}

type InsightCardsGridProps = {
  insights: ColumnInsight[];
  rows: Row[];
  customLabels: Record<string, string>;
  editingColumn: string | null;
  editingDraft: string;
  deletingRowId: string | number | null;
  onStartEditTitle: (insight: ColumnInsight) => void;
  onHideTopic: (column: string) => void;
  onSaveTitle: (insight: ColumnInsight) => void;
  onCancelEdit: () => void;
  onEditingDraftChange: (value: string) => void;
  onDeleteRow: (rowId: string | number) => void;
  wideFor?: (insight: ColumnInsight) => boolean;
};

function InsightCardsGrid({
  insights,
  rows,
  customLabels,
  editingColumn,
  editingDraft,
  deletingRowId,
  onStartEditTitle,
  onHideTopic,
  onSaveTitle,
  onCancelEdit,
  onEditingDraftChange,
  onDeleteRow,
  wideFor,
}: InsightCardsGridProps) {
  if (insights.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {insights.map((insight) => {
        const title = getInsightCardTitle(insight, customLabels);
        const columnKey = getInsightCardColumnKey(insight);
        const showColumnKey = !hasCustomInsightTitle(insight, customLabels) || !isSummaryInsight(insight);
        const wide = wideFor?.(insight) ?? false;
        return (
          <React.Fragment key={insight.column}>
            <InsightCard
              title={title}
              columnKey={showColumnKey ? columnKey : undefined}
              meta={fieldInsightMeta(insight)}
              wide={wide}
              onEditTitle={() => onStartEditTitle(insight)}
              onHideTopic={() => onHideTopic(insight.column)}
              isEditing={editingColumn === insight.column}
              editingValue={editingDraft}
              onEditingValueChange={onEditingDraftChange}
              onSaveTitle={() => onSaveTitle(insight)}
              onCancelEdit={onCancelEdit}
            >
              <FieldInsightContent
                insight={insight}
                entries={buildResponseItems(rows, insight.column)}
                customLabels={customLabels}
                onDeleteRow={onDeleteRow}
                deletingRowId={deletingRowId}
              />
            </InsightCard>
          </React.Fragment>
        );
      })}
    </div>
  );
}

type AdminDatabaseSummaryDashboardProps = {
  collectionId: CollectionId;
  collectionLabel: string;
  rows: Row[];
  columns: string[];
  dateFrom: string;
  dateTo: string;
  onBack: () => void;
  onDeleteRow: (rowId: string | number) => Promise<void>;
};

const AdminDatabaseSummaryDashboard: React.FC<AdminDatabaseSummaryDashboardProps> = ({
  collectionId,
  collectionLabel,
  rows,
  columns,
  dateFrom,
  dateTo,
  onBack,
  onDeleteRow,
}) => {
  const [customLabels, setCustomLabels] = useState<Record<string, string>>(() => loadCustomLabels(collectionId));
  const [hiddenColumns, setHiddenColumns] = useState<string[]>(() => loadHiddenColumns(collectionId));
  const [topSections, setTopSections] = useState<DashboardTopSection[]>(() => loadTopSections(collectionId));
  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState('');
  const [deletingRowId, setDeletingRowId] = useState<string | number | null>(null);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    setCustomLabels(loadCustomLabels(collectionId));
    setHiddenColumns(loadHiddenColumns(collectionId));
    setTopSections(loadTopSections(collectionId));
    setEditingColumn(null);
    setEditingDraft('');
    setActionError('');
  }, [collectionId]);

  useEffect(() => {
    localStorage.setItem(labelsStorageKey(collectionId), JSON.stringify(customLabels));
  }, [collectionId, customLabels]);

  useEffect(() => {
    localStorage.setItem(hiddenStorageKey(collectionId), JSON.stringify(hiddenColumns));
  }, [collectionId, hiddenColumns]);

  useEffect(() => {
    localStorage.setItem(topSectionsStorageKey(collectionId), JSON.stringify(topSections));
  }, [collectionId, topSections]);

  const snapshot = useMemo(
    () =>
      buildDashboardSnapshot({
        collectionId,
        collectionLabel,
        rows,
        columns,
        dateFrom,
        dateTo,
        customLabels,
        hiddenColumns,
        topSections,
      }),
    [collectionId, collectionLabel, rows, columns, dateFrom, dateTo, customLabels, hiddenColumns, topSections],
  );

  const {
    summaryInsights,
    detailInsights,
    filledFieldCount,
  } = snapshot;

  const updateColumnLabel = (entry: FieldTitleEntry, value: string) => {
    setCustomLabels((prev) => applyColumnLabel(prev, entry.labelKey, value, entry.columnKey));
  };

  const handleDeleteRow = async (rowId: string | number) => {
    if (!window.confirm('ลบข้อมูลนี้จากฐานข้อมูลทั้งแถว?')) return;
    setActionError('');
    setDeletingRowId(rowId);
    try {
      await onDeleteRow(rowId);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'ลบข้อมูลไม่สำเร็จ');
    } finally {
      setDeletingRowId(null);
    }
  };

  const startEditTitle = (insight: ColumnInsight) => {
    setEditingColumn(insight.column);
    setEditingDraft(getInsightCardTitle(insight, customLabels));
  };

  const saveTitle = (insight: ColumnInsight) => {
    const labelKey = getInsightLabelKey(insight);
    setCustomLabels((prev) =>
      applyColumnLabel(prev, labelKey, editingDraft, getInsightCardColumnKey(insight)),
    );
    setEditingColumn(null);
    setEditingDraft('');
  };

  const hideTopic = (column: string) => {
    if (!window.confirm('ลบหัวข้อนี้ออกจาก Dashboard?')) return;
    setHiddenColumns((prev) => (prev.includes(column) ? prev : [...prev, column]));
  };

  const restoreTopic = (column: string) => {
    setHiddenColumns((prev) => prev.filter((item) => item !== column));
  };

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs text-white/45">สรุปข้อมูล</p>
            <h3 className={`mt-1 ${readableTitleClass} text-xl sm:text-2xl`}>{collectionLabel}</h3>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="rounded-md bg-white/5 px-2.5 py-1 text-xs text-white/70">
                {rows.length.toLocaleString('th-TH')} แถว
              </span>
              <span className="rounded-md bg-white/5 px-2.5 py-1 text-xs text-white/70">
                {columns.length} คอลัมน์
              </span>
              <span className="rounded-md bg-white/5 px-2.5 py-1 text-xs text-white/70">
                {filledFieldCount} หัวข้อ
              </span>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row lg:flex-col">
            <button
              type="button"
              onClick={() => downloadDashboardHtml(snapshot)}
              className="rounded-lg bg-yellow-400 px-4 py-2 text-xs font-semibold text-black hover:bg-yellow-300"
            >
              ดาวน์โหลด HTML
            </button>
            <button
              type="button"
              onClick={onBack}
              className="rounded-lg border border-white/15 px-4 py-2 text-xs text-white/80 hover:bg-white/5"
            >
              ← กลับตาราง
            </button>
          </div>
        </div>
      </section>

      <DashboardTopSectionsPanel sections={topSections} onChange={setTopSections} />

      {(summaryInsights.length > 0 || detailInsights.length > 0) && (
        <InsightFieldTitlesPanel
          summaryInsights={summaryInsights}
          detailInsights={detailInsights}
          customLabels={customLabels}
          onLabelChange={updateColumnLabel}
        />
      )}

      {actionError && (
        <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200">
          {actionError}
        </div>
      )}

      {hiddenColumns.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
          <p className={`mb-3 ${readableMutedClass}`}>หัวข้อที่ซ่อนอยู่ ({hiddenColumns.length})</p>
          <div className="flex flex-wrap gap-2">
            {hiddenColumns.map((column) => (
              <button
                key={column}
                type="button"
                onClick={() => restoreTopic(column)}
                className="max-w-full rounded-full border border-yellow-400/25 bg-yellow-400/10 px-3 py-1.5 text-left text-xs font-bold leading-relaxed text-yellow-200 hover:bg-yellow-400/20 break-words [overflow-wrap:anywhere]"
              >
                นำกลับ: {getDisplayTitle(column, customLabels)}
              </button>
            ))}
          </div>
        </div>
      )}

      <DashboardTopSectionsDisplay sections={topSections} />

      {rows.length === 0 ? (
        <div className="rounded-[1.8rem] border border-yellow-400/15 bg-black/40 p-12 text-center text-white/55">
          ไม่มีข้อมูลสำหรับสร้าง Dashboard
        </div>
      ) : (
        <div className="space-y-6">
          {summaryInsights.length > 0 && (
            <section className="space-y-3">
              <div>
                <h4 className={`${readableTitleClass} text-base`}>สรุปคะแนน</h4>
                <p className={`mt-0.5 ${readableMutedClass}`}>{summaryInsights.length} หัวข้อ · เฉพาะตัวเลขที่ผู้ใช้กรอก</p>
              </div>
              <InsightCardsGrid
                insights={summaryInsights}
                rows={rows}
                customLabels={customLabels}
                editingColumn={editingColumn}
                editingDraft={editingDraft}
                deletingRowId={deletingRowId}
                onStartEditTitle={startEditTitle}
                onHideTopic={hideTopic}
                onSaveTitle={saveTitle}
                onCancelEdit={() => {
                  setEditingColumn(null);
                  setEditingDraft('');
                }}
                onEditingDraftChange={setEditingDraft}
                onDeleteRow={handleDeleteRow}
              />
            </section>
          )}

          {detailInsights.length > 0 && (
            <section className="space-y-3 border-t border-white/8 pt-6">
              <div>
                <h4 className={`${readableTitleClass} text-base`}>รายละเอียดข้อมูล</h4>
                <p className={`mt-0.5 ${readableMutedClass}`}>{detailInsights.length} หัวข้อ · คำตอบและข้อมูลดิบ</p>
              </div>
              <InsightCardsGrid
                insights={detailInsights}
                rows={rows}
                customLabels={customLabels}
                editingColumn={editingColumn}
                editingDraft={editingDraft}
                deletingRowId={deletingRowId}
                onStartEditTitle={startEditTitle}
                onHideTopic={hideTopic}
                onSaveTitle={saveTitle}
                onCancelEdit={() => {
                  setEditingColumn(null);
                  setEditingDraft('');
                }}
                onEditingDraftChange={setEditingDraft}
                onDeleteRow={handleDeleteRow}
                wideFor={(insight) => insight.kind === 'text' || insight.kind === 'category'}
              />
            </section>
          )}

          {summaryInsights.length === 0 && detailInsights.length === 0 && (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-white/55">
              ไม่พบหัวข้อที่ผู้ใช้กรอกในชุดข้อมูลนี้
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminDatabaseSummaryDashboard;
