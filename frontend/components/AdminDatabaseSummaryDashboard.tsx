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
  keys: { label: string; avg: number; count: number }[];
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
  customLabels: Record<string, string>;
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

function getDisplayTitle(column: string, customLabels: Record<string, string>): string {
  const custom = customLabels[column]?.trim();
  return custom || formatColumnLabel(column);
}

function formatTimesLabel(count: number): string {
  if (count <= 1) return '';
  return `${count.toLocaleString('th-TH')} ครั้ง`;
}

function formatAnswersLabel(count: number): string {
  if (count <= 1) return '';
  return `${count.toLocaleString('th-TH')} การตอบ`;
}

function formatItemsLabel(count: number): string {
  if (count <= 1) return '';
  return `${count.toLocaleString('th-TH')} รายการ`;
}

function joinMeta(parts: string[]): string {
  return parts.filter(Boolean).join(' · ');
}

function isLongText(text: string, threshold = 42): boolean {
  return text.trim().length > threshold;
}

function shouldInsightBeWide(insight: ColumnInsight, title: string): boolean {
  if (insight.kind === 'text') return true;
  if (isLongText(title, 34)) return true;
  if (insight.kind === 'category' && insight.items.some((item) => isLongText(item.label, 34))) return true;
  if (insight.kind === 'json_numeric' && insight.keys.some((item) => isLongText(item.label, 34))) return true;
  return false;
}

function htmlPanelClass(insight: ColumnInsight, label: string): string {
  return shouldInsightBeWide(insight, label) ? 'panel panel-wide' : 'panel';
}

const longTextClass = 'break-words [overflow-wrap:anywhere] whitespace-pre-wrap leading-relaxed';

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
}: {
  collectionId: CollectionId;
  collectionLabel: string;
  rows: Row[];
  columns: string[];
  dateFrom: string;
  dateTo: string;
  customLabels?: Record<string, string>;
  hiddenColumns?: string[];
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
    customLabels,
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
        <div class="response-item">
          ${responses.length > 1 ? `<span class="response-index">#${index + 1}</span>` : ''}
          <p>${escapeHtml(response.value)}</p>
        </div>`,
        )
        .join('')}
    </div>`;
}

function renderHtmlFieldInsight(
  insight: ColumnInsight,
  customLabels: Record<string, string>,
): string {
  const label = getDisplayTitle(insight.column, customLabels);
  const panelClass = htmlPanelClass(insight, label);
  if (insight.kind === 'timeline') {
    return `
      <section class="${panelClass}">
        <div class="panel-head"><h2>${escapeHtml(label)}</h2><span>${joinMeta([insight.column, insight.items.length > 1 ? `${insight.items.length} วัน` : ''])}</span></div>
        ${renderHtmlTimelineList(insight.items)}
      </section>`;
  }

  if (insight.kind === 'numeric') {
    return `
      <section class="${panelClass}">
        <div class="panel-head"><h2>${escapeHtml(label)}</h2><span>${insight.count > 1 ? `${insight.count.toLocaleString('th-TH')} การตอบ` : ''}</span></div>
        <div class="stat-pills">
          <div class="stat-pill"><p>เฉลี่ย</p><strong>${formatNumber(insight.avg)}</strong></div>
          <div class="stat-pill"><p>ต่ำสุด</p><strong>${formatNumber(insight.min)}</strong></div>
          <div class="stat-pill"><p>สูงสุด</p><strong>${formatNumber(insight.max)}</strong></div>
        </div>
      </section>`;
  }

  if (insight.kind === 'json_numeric') {
    return `
      <section class="${panelClass}">
        <div class="panel-head"><h2>${escapeHtml(label)}</h2><span>${joinMeta([insight.column, insight.keys.length > 1 ? `${insight.keys.length} หัวข้อย่อย` : ''])}</span></div>
        ${renderHtmlDataRows(
          insight.keys.map((key) => ({
            label: key.label,
            value:
              key.count > 1
                ? `เฉลี่ย ${formatNumber(key.avg)} (${key.count.toLocaleString('th-TH')} ครั้ง)`
                : `เฉลี่ย ${formatNumber(key.avg)}`,
          })),
        )}
      </section>`;
  }

  if (insight.kind === 'category') {
    return `
      <section class="${panelClass}">
        <div class="panel-head"><h2>${escapeHtml(label)}</h2><span>${joinMeta([
          insight.items.length > 1 ? `${insight.items.length} ค่าที่แตกต่าง` : '',
          insight.items.reduce((sum, item) => sum + item.count, 0) > 1
            ? `${insight.items.reduce((sum, item) => sum + item.count, 0).toLocaleString('th-TH')} การตอบ`
            : '',
        ])}</span></div>
        ${renderHtmlDataRows(
          insight.items.map((item) => ({
            label: item.label,
            value: formatTimesLabel(item.count),
          })),
        )}
      </section>`;
  }

  return `
    <section class="${panelClass}">
      <div class="panel-head"><h2>${escapeHtml(label)}</h2><span>${joinMeta([
        insight.filled > 1 ? `${insight.filled.toLocaleString('th-TH')} การตอบ` : '',
        insight.empty > 0 ? `ว่าง ${insight.empty.toLocaleString('th-TH')}` : '',
      ])}</span></div>
      ${renderHtmlResponses(insight.responses)}
    </section>`;
}

export function generateDashboardHtml(snapshot: DashboardSnapshot): string {
  const {
    collectionLabel,
    rowCount,
    columnCount,
    dateRangeLabel,
    overallNumericAvg,
    numericInsights,
    insights,
    filledFieldCount,
    customLabels,
  } = snapshot;

  const statCards = `
    <div class="stat-grid">
      <div class="stat-card"><p>จำนวนแถว</p><h3>${rowCount.toLocaleString('th-TH')}</h3><span>${columnCount} คอลัมน์</span></div>
      <div class="stat-card"><p>หัวข้อที่มีการตอบ</p><h3>${filledFieldCount}</h3><span>แสดงครบทุกหัวข้อที่ผู้ใช้กรอก</span></div>
      <div class="stat-card"><p>คอลัมน์ตัวเลข</p><h3>${numericInsights.length}</h3><span>${overallNumericAvg != null ? `เฉลี่ยรวม ${formatNumber(overallNumericAvg)}` : '—'}</span></div>
      <div class="stat-card"><p>ช่วงเวลา</p><h3>${escapeHtml(dateRangeLabel)}</h3></div>
    </div>`;

  const sections =
    insights.length > 0
      ? insights.map((insight) => renderHtmlFieldInsight(insight, customLabels)).join('')
      : `<section class="panel empty">ไม่พบหัวข้อที่ผู้ใช้กรอกในชุดข้อมูลนี้</section>`;

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
      color: #ffffff;
      background:
        radial-gradient(circle at 15% 0%, rgba(250,204,21,0.16), transparent 32%),
        radial-gradient(circle at 85% 10%, rgba(250,204,21,0.08), transparent 28%),
        linear-gradient(180deg, #0a0705 0%, #050403 55%, #000000 100%);
      min-height: 100vh;
    }
    .wrap { max-width: 1180px; margin: 0 auto; padding: 32px 20px 56px; }
    .hero {
      position: relative;
      overflow: hidden;
      border: 1px solid rgba(250,204,21,0.22);
      border-radius: 28px;
      padding: 32px;
      background: linear-gradient(135deg, rgba(69,10,6,0.92), rgba(10,3,2,0.96));
      box-shadow: 0 28px 90px rgba(0,0,0,0.45);
      margin-bottom: 28px;
    }
    .hero::before, .hero::after {
      content: "";
      position: absolute;
      border-radius: 999px;
      filter: blur(40px);
      pointer-events: none;
    }
    .hero::before { width: 220px; height: 220px; top: -80px; right: -40px; background: rgba(250,204,21,0.18); }
    .hero::after { width: 180px; height: 180px; bottom: -70px; left: -30px; background: rgba(250,204,21,0.1); }
    .eyebrow { color: #fde68a; font-size: 12px; letter-spacing: 0.28em; text-transform: uppercase; font-weight: 800; }
    h1 {
      margin: 12px 0 8px;
      font-size: clamp(1.6rem, 4vw, 3rem);
      line-height: 1.25;
      color: #ffffff;
      word-break: break-word;
      overflow-wrap: anywhere;
    }
    .subtitle { color: rgba(255,255,255,0.72); max-width: 720px; line-height: 1.75; word-break: break-word; overflow-wrap: anywhere; }
    .meta { margin-top: 18px; display: flex; flex-wrap: wrap; gap: 10px; }
    .pill {
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(255,255,255,0.05);
      border-radius: 999px;
      padding: 8px 14px;
      font-size: 13px;
      color: rgba(255,255,255,0.88);
    }
    .stat-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .stat-card {
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 22px;
      padding: 22px;
      background: linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02));
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
    }
    .stat-card p { margin: 0; color: rgba(255,255,255,0.55); font-size: 12px; text-transform: uppercase; letter-spacing: 0.16em; }
    .stat-card h3 { margin: 10px 0 6px; font-size: 2.2rem; color: #facc15; }
    .stat-card span { color: rgba(255,255,255,0.55); font-size: 13px; }
    .grid { display: grid; grid-template-columns: 1fr; gap: 18px; }
    @media (min-width: 1024px) {
      .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    .panel, .panel-wide {
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 24px;
      padding: 22px;
      background: rgba(255,255,255,0.04);
      backdrop-filter: blur(8px);
      box-shadow: 0 18px 50px rgba(0,0,0,0.22);
      min-width: 0;
    }
    .panel-wide { grid-column: 1 / -1; }
    .panel-head {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
      margin-bottom: 18px;
    }
    .panel-head h2 {
      margin: 0;
      font-size: clamp(1rem, 2.2vw, 1.35rem);
      line-height: 1.45;
      letter-spacing: 0.04em;
      text-transform: none;
      color: #fde68a;
      word-break: break-word;
      overflow-wrap: anywhere;
      width: 100%;
    }
    .panel-head span {
      color: rgba(255,255,255,0.55);
      font-size: 12px;
      line-height: 1.6;
      word-break: break-word;
      overflow-wrap: anywhere;
      width: 100%;
    }
    .data-rows { display: grid; gap: 10px; }
    .data-row {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 10px;
      padding: 14px 16px;
      border: 1px solid rgba(250,204,21,0.12);
      border-radius: 16px;
      background: rgba(0,0,0,0.35);
    }
    @media (min-width: 640px) {
      .data-row.row-inline {
        flex-direction: row;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
      }
    }
    .data-label {
      flex: 1;
      color: #ffffff;
      line-height: 1.75;
      word-break: break-word;
      overflow-wrap: anywhere;
      white-space: pre-wrap;
    }
    .data-value {
      align-self: flex-start;
      border-radius: 999px;
      padding: 6px 12px;
      background: rgba(250,204,21,0.14);
      border: 1px solid rgba(250,204,21,0.24);
      color: #facc15;
      font-size: 12px;
      font-weight: 800;
      white-space: nowrap;
    }
    .stat-pills {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px;
    }
    .stat-pill {
      border: 1px solid rgba(250,204,21,0.15);
      border-radius: 18px;
      padding: 16px;
      background: rgba(0,0,0,0.35);
      text-align: center;
    }
    .stat-pill p { margin: 0; color: rgba(255,255,255,0.55); font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; }
    .stat-pill strong { display: block; margin-top: 8px; color: #ffffff; font-size: 1.5rem; }
    .response-list { display: grid; gap: 12px; margin-top: 4px; }
    .response-item {
      border: 1px solid rgba(250,204,21,0.12);
      border-radius: 16px;
      background: rgba(0,0,0,0.35);
      padding: 16px 18px;
    }
    .response-index { color: #facc15; font-size: 12px; font-weight: 800; margin-right: 8px; }
    .response-item p {
      margin: 8px 0 0;
      color: rgba(255,255,255,0.9);
      line-height: 1.8;
      white-space: pre-wrap;
      word-break: break-word;
      overflow-wrap: anywhere;
    }
    .single-metric { margin-bottom: 16px; }
    .section-title {
      margin: 8px 0 18px;
      font-size: clamp(1.2rem, 2.5vw, 1.5rem);
      line-height: 1.35;
      color: #ffffff;
      letter-spacing: 0.02em;
      word-break: break-word;
    }
    .empty { text-align: center; color: rgba(255,255,255,0.55); padding: 40px 20px; }
    .footer { margin-top: 28px; text-align: center; color: rgba(255,255,255,0.45); font-size: 12px; }
    @media (max-width: 720px) {
      .data-row { flex-direction: column; align-items: flex-start; }
      .panel-head { flex-direction: column; align-items: flex-start; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <section class="hero">
      <div class="eyebrow">MindDoJo · Database Summary Dashboard</div>
      <h1>${escapeHtml(collectionLabel)}</h1>
      <div class="meta">
        <span class="pill">${rowCount.toLocaleString('th-TH')} แถว</span>
        <span class="pill">${columnCount} คอลัมน์</span>
        <span class="pill">${escapeHtml(dateRangeLabel)}</span>
      </div>
    </section>
    ${statCards}
    <h2 class="section-title">ทุกหัวข้อที่ผู้ใช้กรอก (${filledFieldCount} หัวข้อ)</h2>
    <div class="grid">
      ${sections}
    </div>
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
    <div className="space-y-2.5">
      {items.map((item) => {
        const stack = isLongText(item.label, 42) || isLongText(item.value, 18);
        return (
          <div
            key={`${item.label}-${item.value}`}
            className={`gap-3 rounded-2xl border border-yellow-400/12 bg-black/50 px-4 py-3.5 ${
              stack ? 'flex flex-col' : 'flex flex-col sm:flex-row sm:items-start sm:justify-between'
            }`}
          >
            <span className={`flex-1 text-sm text-white ${longTextClass}`}>{item.label}</span>
            {item.value && (
              <span className="shrink-0 self-start rounded-full border border-yellow-400/25 bg-yellow-400/10 px-3 py-1 text-xs font-black text-yellow-300">
                {item.value}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function NumericSummaryPills({ avg, min, max }: { avg: number; min: number; max: number }) {
  const pills = [
    { label: 'เฉลี่ย', value: formatNumber(avg) },
    { label: 'ต่ำสุด', value: formatNumber(min) },
    { label: 'สูงสุด', value: formatNumber(max) },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {pills.map((pill) => (
        <div key={pill.label} className="rounded-2xl border border-yellow-400/15 bg-black/50 px-4 py-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">{pill.label}</p>
          <p className="mt-2 text-2xl font-black text-white">{pill.value}</p>
        </div>
      ))}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  accent,
  valueClassName,
}: {
  label: string;
  value: string;
  hint?: string;
  accent: string;
  valueClassName?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-[1.6rem] border border-yellow-400/15 bg-gradient-to-br from-yellow-400/[0.08] to-black/40 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
      <div className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl ${accent}`} />
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/55">{label}</p>
      <p className={`mt-3 font-black text-yellow-300 ${valueClassName ?? 'text-4xl'} ${longTextClass}`}>{value}</p>
      {hint && <p className={`mt-2 text-sm text-white/50 ${longTextClass}`}>{hint}</p>}
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
    <div className="space-y-3">
      {responses.map((response, index) => (
        <div
          key={`${response.rowId}-${index}`}
          className="rounded-2xl border border-yellow-400/12 bg-black/50 px-4 py-4 sm:px-5 sm:py-5"
        >
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            {responses.length > 1 ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-yellow-400/25 bg-yellow-400/10 px-2 text-xs font-black text-yellow-300">
                  {index + 1}
                </span>
                <span className="text-xs text-white/45">คำตอบ</span>
              </div>
            ) : (
              <span />
            )}
            {onDeleteRow && (
              <button
                type="button"
                onClick={() => onDeleteRow(response.rowId)}
                disabled={deletingRowId === response.rowId}
                className="self-start rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1 text-xs font-bold text-red-200 hover:bg-red-500/20 disabled:opacity-50"
              >
                {deletingRowId === response.rowId ? 'กำลังลบ...' : 'ลบ'}
              </button>
            )}
          </div>
          <p className={`text-sm sm:text-[15px] text-white/90 ${longTextClass}`}>{response.value}</p>
        </div>
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
    <div className="mt-5 border-t border-yellow-400/10 pt-5">
      <p className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-white/45">ลบรายการข้อมูล</p>
      <div className="space-y-2">
        {entries.map((entry) => (
          <div
            key={entry.rowId}
            className="flex flex-col gap-3 rounded-xl border border-yellow-400/10 bg-black/40 px-3 py-3 sm:flex-row sm:items-start sm:justify-between"
          >
            <span className={`flex-1 text-sm text-white/85 ${longTextClass}`}>{entry.value}</span>
            <button
              type="button"
              onClick={() => onDeleteRow(entry.rowId)}
              disabled={deletingRowId === entry.rowId}
              className="shrink-0 rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1 text-xs font-bold text-red-200 hover:bg-red-500/20 disabled:opacity-50"
            >
              {deletingRowId === entry.rowId ? '...' : 'ลบ'}
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
  onDeleteRow,
  deletingRowId,
}: {
  insight: ColumnInsight;
  entries: ResponseItem[];
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
    return (
      <>
        <NumericSummaryPills avg={insight.avg} min={insight.min} max={insight.max} />
        <RowRecordsList entries={entries} onDeleteRow={onDeleteRow} deletingRowId={deletingRowId} />
      </>
    );
  }

  if (insight.kind === 'json_numeric') {
    return (
      <>
        <DataRowList
          items={insight.keys.map((key) => ({
            label: key.label,
            value: `เฉลี่ย ${formatNumber(key.avg)}`,
          }))}
        />
        <RowRecordsList entries={entries} onDeleteRow={onDeleteRow} deletingRowId={deletingRowId} />
      </>
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
  if (insight.kind === 'numeric') return formatAnswersLabel(insight.count);
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
  columnKey: string;
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
  const titleIsLong = isLongText(title, 34);
  return (
    <section
      className={`relative min-w-0 overflow-hidden rounded-[1.8rem] border border-yellow-400/15 bg-[linear-gradient(180deg,rgba(250,204,21,0.06),rgba(0,0,0,0.45))] p-5 shadow-[0_22px_60px_rgba(0,0,0,0.35)] backdrop-blur-sm sm:p-6 ${wide ? 'lg:col-span-2' : ''}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-yellow-300/50 to-transparent" />
      <div className="mb-5 space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editingValue ?? ''}
                  onChange={(event) => onEditingValueChange?.(event.target.value)}
                  rows={Math.min(4, Math.max(2, Math.ceil((editingValue?.length || 0) / 42)))}
                  className={`w-full resize-y rounded-xl border border-yellow-400/25 bg-black/60 px-3 py-2 text-sm font-bold text-white outline-none focus:border-yellow-300 ${longTextClass}`}
                  placeholder="ชื่อหัวข้อ"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={onSaveTitle}
                    className="rounded-full bg-yellow-400 px-3 py-1.5 text-xs font-black text-black hover:bg-yellow-300"
                  >
                    บันทึก
                  </button>
                  <button
                    type="button"
                    onClick={onCancelEdit}
                    className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10"
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h4
                  className={`font-black text-yellow-300 ${
                    titleIsLong
                      ? 'text-base leading-[1.45] sm:text-lg'
                      : 'text-sm uppercase tracking-[0.12em] sm:text-base'
                  } ${longTextClass}`}
                >
                  {title}
                </h4>
                <p className={`mt-2 font-mono text-[11px] leading-relaxed text-white/40 ${longTextClass}`}>{columnKey}</p>
                {meta && <p className={`mt-1 text-xs text-white/50 ${longTextClass}`}>{meta}</p>}
              </>
            )}
          </div>
          {!isEditing && (onEditTitle || onHideTopic) && (
            <div className="flex flex-wrap gap-2 lg:max-w-[220px] lg:justify-end">
              {onEditTitle && (
                <button
                  type="button"
                  onClick={onEditTitle}
                  className="rounded-full border border-yellow-400/25 bg-yellow-400/10 px-3 py-1.5 text-xs font-bold text-yellow-200 hover:bg-yellow-400/20"
                >
                  แก้ไขหัวข้อ
                </button>
              )}
              {onHideTopic && (
                <button
                  type="button"
                  onClick={onHideTopic}
                  className="rounded-full border border-red-400/25 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-200 hover:bg-red-500/20"
                >
                  ลบหัวข้อ
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {children}
    </section>
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
  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState('');
  const [deletingRowId, setDeletingRowId] = useState<string | number | null>(null);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    setCustomLabels(loadCustomLabels(collectionId));
    setHiddenColumns(loadHiddenColumns(collectionId));
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
      }),
    [collectionId, collectionLabel, rows, columns, dateFrom, dateTo, customLabels, hiddenColumns],
  );

  const {
    insights,
    overallNumericAvg,
    dateRangeLabel,
    filledFieldCount,
    numericInsights,
  } = snapshot;

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

  const startEditTitle = (column: string) => {
    setEditingColumn(column);
    setEditingDraft(getDisplayTitle(column, customLabels));
  };

  const saveTitle = (column: string) => {
    const trimmed = editingDraft.trim();
    setCustomLabels((prev) => {
      const next = { ...prev };
      if (!trimmed || trimmed === formatColumnLabel(column)) {
        delete next[column];
      } else {
        next[column] = trimmed;
      }
      return next;
    });
    setEditingColumn(null);
    setEditingDraft('');
  };

  const hideTopic = (column: string) => {
    if (!window.confirm('ซ่อนหัวข้อนี้จาก Dashboard?')) return;
    setHiddenColumns((prev) => (prev.includes(column) ? prev : [...prev, column]));
  };

  const restoreTopic = (column: string) => {
    setHiddenColumns((prev) => prev.filter((item) => item !== column));
  };

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-[2rem] border border-yellow-400/25 bg-[linear-gradient(135deg,rgba(0,0,0,0.96),rgba(20,15,5,0.98))] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.55)] sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-yellow-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-yellow-300/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-black uppercase tracking-[0.32em] text-yellow-200/80">
              MindDoJo · Database Summary Dashboard
            </p>
            <h3 className="mt-3 text-2xl font-black leading-[1.25] break-words [overflow-wrap:anywhere] text-white sm:text-4xl lg:text-5xl">
              {collectionLabel}
            </h3>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full border border-yellow-400/20 bg-black/40 px-3 py-1.5 text-xs text-white/85">
                {rows.length.toLocaleString('th-TH')} แถว
              </span>
              <span className="rounded-full border border-yellow-400/20 bg-black/40 px-3 py-1.5 text-xs text-white/85">
                {columns.length} คอลัมน์
              </span>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
            <button
              type="button"
              onClick={() => downloadDashboardHtml(snapshot)}
              className="rounded-xl bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-600 px-5 py-3 text-sm font-black text-black shadow-[0_12px_30px_rgba(250,204,21,0.25)] hover:from-white hover:to-yellow-300"
            >
              ดาวน์โหลด HTML
            </button>
            <button
              type="button"
              onClick={onBack}
              className="rounded-xl border border-yellow-400/25 bg-black/50 px-5 py-3 text-sm font-semibold text-white hover:bg-yellow-400/10"
            >
              ← กลับตาราง
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="จำนวนแถวทั้งหมด"
          value={rows.length.toLocaleString('th-TH')}
          hint={`${columns.length} คอลัมน์ในชุดข้อมูลนี้`}
          accent="bg-yellow-400/20"
        />
        <SummaryCard
          label="หัวข้อที่มีการตอบ"
          value={filledFieldCount.toLocaleString('th-TH')}
          hint="แสดงครบทุกหัวข้อที่ผู้ใช้กรอก"
          accent="bg-yellow-300/15"
        />
        <SummaryCard
          label="คอลัมน์ตัวเลข"
          value={numericInsights.length.toLocaleString('th-TH')}
          hint={overallNumericAvg != null ? `ค่าเฉลี่ยรวม ${formatNumber(overallNumericAvg)}` : 'ไม่พบคอลัมน์ตัวเลข'}
          accent="bg-yellow-500/15"
        />
        <SummaryCard
          label="ช่วงเวลา"
          value={rows.length > 0 ? dateRangeLabel : '—'}
          valueClassName="text-lg sm:text-xl"
          accent="bg-white/10"
        />
      </div>

      {actionError && (
        <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200">
          {actionError}
        </div>
      )}

      {hiddenColumns.length > 0 && (
        <div className="rounded-2xl border border-yellow-400/15 bg-black/40 px-4 py-4">
          <p className="mb-3 text-sm font-bold text-white/70">หัวข้อที่ซ่อนอยู่ ({hiddenColumns.length})</p>
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

      {rows.length === 0 ? (
        <div className="rounded-[1.8rem] border border-yellow-400/15 bg-black/40 p-12 text-center text-white/55">
          ไม่มีข้อมูลสำหรับสร้าง Dashboard
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h4 className="text-xl font-black leading-snug break-words [overflow-wrap:anywhere] text-white sm:text-2xl">
                ทุกหัวข้อที่ผู้ใช้กรอก
              </h4>
              <p className="mt-1 text-sm text-white/50">{filledFieldCount} หัวข้อ · แสดงคำตอบและสรุปครบทุกฟิลด์</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {insights.map((insight) => {
              const title = getDisplayTitle(insight.column, customLabels);
              const wide = shouldInsightBeWide(insight, title);
              return (
              <React.Fragment key={insight.column}>
              <InsightCard
                title={title}
                columnKey={insight.column}
                meta={fieldInsightMeta(insight)}
                wide={wide}
                onEditTitle={() => startEditTitle(insight.column)}
                onHideTopic={() => hideTopic(insight.column)}
                isEditing={editingColumn === insight.column}
                editingValue={editingDraft}
                onEditingValueChange={setEditingDraft}
                onSaveTitle={() => saveTitle(insight.column)}
                onCancelEdit={() => {
                  setEditingColumn(null);
                  setEditingDraft('');
                }}
              >
                <FieldInsightContent
                  insight={insight}
                  entries={buildResponseItems(rows, insight.column)}
                  onDeleteRow={handleDeleteRow}
                  deletingRowId={deletingRowId}
                />
              </InsightCard>
              </React.Fragment>
              );
            })}

            {insights.length === 0 && (
              <div className="xl:col-span-2 rounded-[1.8rem] border border-yellow-400/15 bg-black/40 p-10 text-center text-white/55">
                ไม่พบหัวข้อที่ผู้ใช้กรอกในชุดข้อมูลนี้
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDatabaseSummaryDashboard;
