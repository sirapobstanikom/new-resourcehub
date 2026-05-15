import React from 'react';
import type {
  EvaDescriptionAlign,
  EvaDescriptionLine,
  EvaDescriptionLineStyle,
} from '../lib/evaTemplates';

const LINE_STYLES: { value: EvaDescriptionLineStyle; label: string }[] = [
  { value: 'normal', label: 'ปกติ' },
  { value: 'bold', label: 'ตัวหนา' },
  { value: 'small', label: 'ตัวเล็ก' },
];

type EvaDescriptionLinesEditorProps = {
  fieldId: string;
  lines: EvaDescriptionLine[];
  align: EvaDescriptionAlign;
  onLinesChange: (lines: EvaDescriptionLine[]) => void;
  onAlignChange: (align: EvaDescriptionAlign) => void;
};

/** แก้ไขคำอธิบายทีละบรรทัด — เลือกสไตล์ต่อบรรทัด + จัดกึ่งกลาง/ชิดซ้ายทั้งบล็อก */
export function EvaDescriptionLinesEditor({
  fieldId,
  lines,
  align,
  onLinesChange,
  onAlignChange,
}: EvaDescriptionLinesEditorProps) {
  const updateLine = (lineIdx: number, patch: Partial<EvaDescriptionLine>) => {
    onLinesChange(lines.map((l, i) => (i === lineIdx ? { ...l, ...patch } : l)));
  };

  const addLine = () => onLinesChange([...lines, { text: '', style: 'normal' }]);

  const removeLine = (lineIdx: number) => {
    if (lines.length <= 1) {
      onLinesChange([{ text: '', style: 'normal' }]);
      return;
    }
    onLinesChange(lines.filter((_, i) => i !== lineIdx));
  };

  return (
    <div className="space-y-3 text-xs text-gray-400">
      <fieldset className="space-y-1">
        <legend className="font-medium text-gray-300">จัดตำแหน่งทั้งบล็อก</legend>
        <div className="flex flex-wrap gap-3">
          <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="radio"
              name={`${fieldId}-align`}
              checked={align === 'left'}
              onChange={() => onAlignChange('left')}
              className="accent-yellow-400"
            />
            ชิดซ้าย
          </label>
          <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="radio"
              name={`${fieldId}-align`}
              checked={align === 'center'}
              onChange={() => onAlignChange('center')}
              className="accent-yellow-400"
            />
            กึ่งกลาง
          </label>
        </div>
      </fieldset>

      <p className="font-medium text-gray-300">เนื้อหาแยกบรรทัด (เลือกสไตล์ต่อบรรทัด)</p>
      <div className="space-y-2">
        {lines.map((line, lineIdx) => (
          <div
            key={`${fieldId}-line-${lineIdx}`}
            className="rounded-lg border border-white/10 bg-black/25 p-2 space-y-2"
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500 tabular-nums w-5 shrink-0">{lineIdx + 1}.</span>
              <input
                type="text"
                value={line.text}
                onChange={(e) => updateLine(lineIdx, { text: e.target.value })}
                placeholder="ข้อความบรรทัดนี้"
                className="flex-1 min-w-0 rounded-md border border-white/15 bg-black/40 px-2 py-1.5 text-sm text-gray-100"
              />
              <button
                type="button"
                onClick={() => removeLine(lineIdx)}
                className="shrink-0 rounded-md bg-red-500/15 border border-red-400/35 px-2 py-1 text-[10px] font-semibold text-red-200 hover:bg-red-500/25"
              >
                ลบ
              </button>
            </div>
            <div className="flex flex-wrap gap-2 pl-7">
              {LINE_STYLES.map((opt) => (
                <label
                  key={opt.value}
                  className="inline-flex items-center gap-1 cursor-pointer select-none rounded-md border border-white/10 bg-white/5 px-2 py-1 hover:bg-white/10"
                >
                  <input
                    type="radio"
                    name={`${fieldId}-style-${lineIdx}`}
                    checked={line.style === opt.value}
                    onChange={() => updateLine(lineIdx, { style: opt.value })}
                    className="accent-yellow-400"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addLine}
        className="rounded-md border border-amber-400/35 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-100 hover:bg-amber-500/20"
      >
        + เพิ่มบรรทัด
      </button>
    </div>
  );
}
