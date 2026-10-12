export interface HudPoint {
  x: number;
  y: number;
}

export interface HudReadout {
  label: string;
  value: number;
}

export interface HudFrame {
  points: HudPoint[];
  confidence: number;
  scanning: boolean;
  progress: number;
  readouts: HudReadout[];
  time: number;
}

type Edge = [number, number];

const CYAN = '34, 211, 238';
const YELLOW = '254, 210, 1';
const FOREHEAD_SOURCES = [17, 18, 19, 20, 21, 22, 23, 24, 25, 26];
const KEY_POINTS = [30, 36, 39, 42, 45, 48, 54, 8];
const FONT = '"Anuphan", ui-monospace, monospace';

const CONTOURS: { from: number; to: number; closed: boolean }[] = [
  { from: 0, to: 16, closed: false },
  { from: 17, to: 21, closed: false },
  { from: 22, to: 26, closed: false },
  { from: 27, to: 30, closed: false },
  { from: 31, to: 35, closed: false },
  { from: 36, to: 41, closed: true },
  { from: 42, to: 47, closed: true },
  { from: 48, to: 59, closed: true },
  { from: 60, to: 67, closed: true },
];

const CONTOUR_EDGES: Edge[] = CONTOURS.flatMap(({ from, to, closed }) => {
  const edges: Edge[] = [];
  for (let i = from; i < to; i++) edges.push([i, i + 1]);
  if (closed) edges.push([to, from]);
  return edges;
});

/** เติมจุดหน้าผากจากคิ้ว เพื่อให้ตาข่ายคลุมทั้งใบหน้า (68 จุดเดิมไม่มีหน้าผาก) */
export function withForeheadPoints(points: HudPoint[]): HudPoint[] {
  const anchor = points[33];
  const forehead = FOREHEAD_SOURCES.map((i) => ({
    x: points[i].x + (points[i].x - anchor.x) * 0.15,
    y: points[i].y + (points[i].y - anchor.y) * 0.55,
  }));
  return [...points, ...forehead];
}

/** เส้นตาข่ายเชื่อมจุดที่ใกล้กันที่สุด คำนวณครั้งเดียวจากใบหน้าแรกเพื่อให้โครงคงที่ */
export function buildMeshEdges(points: HudPoint[], neighbours = 3): Edge[] {
  const seen = new Set<string>();
  const edges: Edge[] = [];
  points.forEach((p, i) => {
    points
      .map((q, j) => ({ j, d: (p.x - q.x) ** 2 + (p.y - q.y) ** 2 }))
      .filter(({ j }) => j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, neighbours)
      .forEach(({ j }) => {
        const key = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (seen.has(key)) return;
        seen.add(key);
        edges.push([Math.min(i, j), Math.max(i, j)]);
      });
  });
  return edges;
}

const boundsOf = (points: HudPoint[]) => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
};

const drawBrackets = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) => {
  const len = Math.min(w, h) * 0.18;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (const [cx, cy, dx, dy] of [
    [x, y, 1, 1],
    [x + w, y, -1, 1],
    [x, y + h, 1, -1],
    [x + w, y + h, -1, -1],
  ]) {
    ctx.moveTo(cx, cy + dy * len);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + dx * len, cy);
  }
  ctx.stroke();
};

export function drawFaceHud(ctx: CanvasRenderingContext2D, width: number, height: number, frame: HudFrame, edges: Edge[]) {
  const { points, scanning, progress, time } = frame;
  const accent = scanning ? YELLOW : CYAN;
  const intensity = scanning ? 1 : 0.6;
  const b = boundsOf(points);
  const pad = b.width * 0.14;
  const box = { x: b.minX - pad, y: b.minY - pad, w: b.width + pad * 2, h: b.height + pad * 2 };
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const sweepY = box.y + box.h * (0.5 - 0.5 * Math.cos((time / 1400) * Math.PI));
  const sweepRange = Math.max(8, box.h * 0.07);
  const s = Math.min(Math.max(box.w / 220, 0.55), 1.5);
  const compact = box.w < 190;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // วงแหวนเรดาร์ + ขีดสเกลหมุนรอบใบหน้า
  const radius = Math.max(box.w, box.h) * 0.62;
  ctx.strokeStyle = `rgba(${CYAN}, ${0.18 * intensity})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  const spin = (time / 6000) * Math.PI * 2;
  for (let i = 0; i < 72; i++) {
    const a = spin + (i / 72) * Math.PI * 2;
    const inner = radius + (i % 6 === 0 ? 4 : 7) * s;
    ctx.strokeStyle = `rgba(${CYAN}, ${(i % 6 === 0 ? 0.55 : 0.22) * intensity})`;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
    ctx.lineTo(cx + Math.cos(a) * (radius + 11 * s), cy + Math.sin(a) * (radius + 11 * s));
    ctx.stroke();
  }
  if (scanning) {
    ctx.strokeStyle = `rgba(${YELLOW}, 0.95)`;
    ctx.lineWidth = 4;
    ctx.shadowColor = `rgba(${YELLOW}, 0.9)`;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // แถบสแกนกวาดขึ้นลง
  const bandHalf = sweepRange * 2;
  const band = ctx.createLinearGradient(0, sweepY - bandHalf, 0, sweepY + bandHalf);
  band.addColorStop(0, `rgba(${accent}, 0)`);
  band.addColorStop(0.5, `rgba(${accent}, ${0.22 * intensity})`);
  band.addColorStop(1, `rgba(${accent}, 0)`);
  ctx.fillStyle = band;
  ctx.fillRect(box.x, sweepY - bandHalf, box.w, bandHalf * 2);
  ctx.strokeStyle = `rgba(${accent}, ${0.85 * intensity})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(box.x, sweepY);
  ctx.lineTo(box.x + box.w, sweepY);
  ctx.stroke();

  // ตาข่ายใบหน้า
  ctx.lineWidth = 0.8;
  ctx.strokeStyle = `rgba(${CYAN}, ${0.32 * intensity})`;
  ctx.beginPath();
  for (const [i, j] of edges) {
    const p = points[i];
    const q = points[j];
    if (!p || !q) continue;
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
  }
  ctx.stroke();

  ctx.lineWidth = 1.6;
  ctx.strokeStyle = `rgba(${CYAN}, ${0.85 * intensity})`;
  ctx.shadowColor = `rgba(${CYAN}, 0.8)`;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  for (const [i, j] of CONTOUR_EDGES) {
    ctx.moveTo(points[i].x, points[i].y);
    ctx.lineTo(points[j].x, points[j].y);
  }
  ctx.stroke();

  // จุด landmark — จุดที่แถบสแกนผ่านจะสว่างขึ้น
  points.forEach((p, i) => {
    const near = Math.max(0, 1 - Math.abs(p.y - sweepY) / sweepRange);
    const key = KEY_POINTS.includes(i);
    const r = ((key ? 2.6 : 1.5) + near * 2) * s;
    ctx.fillStyle = near > 0.2 || (key && scanning) ? `rgba(${YELLOW}, 1)` : `rgba(${CYAN}, ${0.9 * intensity})`;
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 6 + near * 10;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.shadowBlur = 0;

  // กรอบมุม + ข้อความสถานะ
  drawBrackets(ctx, box.x, box.y, box.w, box.h, `rgba(${accent}, 0.95)`);
  ctx.font = `700 ${compact ? 10 : 11}px ${FONT}`;
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = `rgba(${accent}, 1)`;
  const blink = Math.floor(time / 450) % 2 === 0 ? '●' : '○';
  const status = `${blink} ${scanning ? 'ANALYZING' : 'FACE LOCKED'}`;
  const conf = `CONF ${Math.round(frame.confidence * 100)}%`;
  const detail = scanning ? `SCAN ${Math.round(progress * 100)}%` : `MESH ${points.length} PTS`;
  if (compact) {
    ctx.fillText(conf, box.x, box.y - 6);
    ctx.fillText(status, box.x, box.y - 20);
    ctx.textBaseline = 'top';
    ctx.fillText(detail, box.x, box.y + box.h + 6);
  } else {
    ctx.fillText(status, box.x, box.y - 6);
    ctx.textAlign = 'right';
    ctx.fillText(conf, box.x + box.w, box.y - 6);
    ctx.textBaseline = 'top';
    ctx.fillText(detail, box.x + box.w, box.y + box.h + 6);
    ctx.textAlign = 'left';
    ctx.fillText(`X${Math.round(cx).toString().padStart(4, '0')} Y${Math.round(cy).toString().padStart(4, '0')}`, box.x, box.y + box.h + 6);
  }

  // แผงค่าแนวโน้มแบบสด
  if (scanning && frame.readouts.length > 0) {
    const panelW = 132;
    const rowH = 20;
    const panelH = 24 + frame.readouts.length * rowH;
    const fitsRight = box.x + box.w + 14 + panelW <= width;
    const px = fitsRight ? box.x + box.w + 14 : Math.max(8, box.x - 14 - panelW);
    const py = Math.min(Math.max(8, cy - panelH / 2), height - panelH - 8);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.strokeStyle = `rgba(${YELLOW}, 0.6)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.rect(px, py, panelW, panelH);
    ctx.fill();
    ctx.stroke();
    ctx.font = `700 10px ${FONT}`;
    ctx.fillStyle = `rgba(${YELLOW}, 1)`;
    ctx.fillText('MOOD VECTOR', px + 8, py + 7);
    frame.readouts.forEach((r, i) => {
      const y = py + 24 + i * rowH;
      ctx.font = `600 11px ${FONT}`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.textAlign = 'left';
      ctx.fillText(r.label, px + 8, y);
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.round(r.value * 100)}%`, px + panelW - 8, y);
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.fillRect(px + 8, y + 14, panelW - 16, 2);
      ctx.fillStyle = `rgba(${i === 0 ? YELLOW : CYAN}, 1)`;
      ctx.fillRect(px + 8, y + 14, (panelW - 16) * r.value, 2);
    });
  }

  ctx.restore();
}
