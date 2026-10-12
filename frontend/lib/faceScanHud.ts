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
  scanning: boolean;
  progress: number;
  moodReadouts: HudReadout[];
  sensorReadouts: HudReadout[];
  time: number;
}

export interface HudMesh {
  tessellation: [number, number][];
  contours: [number, number][];
  keyPoints: number[];
}

const CYAN = '34, 211, 238';
const YELLOW = '254, 210, 1';
const FONT = '"Anuphan", ui-monospace, monospace';

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

const drawPanel = (
  ctx: CanvasRenderingContext2D,
  title: string,
  rows: HudReadout[],
  x: number,
  y: number,
  width: number,
  color: string,
) => {
  const rowH = 20;
  const height = 24 + rows.length * rowH;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.strokeStyle = `rgba(${color}, 0.6)`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.fill();
  ctx.stroke();
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.font = `700 10px ${FONT}`;
  ctx.fillStyle = `rgba(${color}, 1)`;
  ctx.fillText(title, x + 8, y + 7);
  rows.forEach((r, i) => {
    const ry = y + 24 + i * rowH;
    ctx.font = `600 11px ${FONT}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.textAlign = 'left';
    ctx.fillText(r.label, x + 8, ry);
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(r.value * 100)}%`, x + width - 8, ry);
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fillRect(x + 8, ry + 14, width - 16, 2);
    ctx.fillStyle = `rgba(${i === 0 ? YELLOW : CYAN}, 1)`;
    ctx.fillRect(x + 8, ry + 14, (width - 16) * Math.min(r.value, 1), 2);
  });
  return height;
};

export function drawFaceHud(ctx: CanvasRenderingContext2D, width: number, height: number, frame: HudFrame, mesh: HudMesh) {
  const { points, scanning, progress, time } = frame;
  const accent = scanning ? YELLOW : CYAN;
  const intensity = scanning ? 1 : 0.6;
  const b = boundsOf(points);
  const pad = b.width * 0.1;
  const box = { x: b.minX - pad, y: b.minY - pad, w: b.width + pad * 2, h: b.height + pad * 2 };
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const sweepY = box.y + box.h * (0.5 - 0.5 * Math.cos((time / 1400) * Math.PI));
  const sweepRange = Math.max(8, box.h * 0.06);
  const s = Math.min(Math.max(box.w / 220, 0.55), 1.5);
  const compact = box.w < 190;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // วงแหวนเรดาร์ + ขีดสเกลหมุนรอบใบหน้า
  const radius = Math.max(box.w, box.h) * 0.6;
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

  // ตาข่ายใบหน้า 478 จุด
  ctx.lineWidth = 0.6;
  ctx.strokeStyle = `rgba(${CYAN}, ${0.28 * intensity})`;
  ctx.beginPath();
  for (const [i, j] of mesh.tessellation) {
    ctx.moveTo(points[i].x, points[i].y);
    ctx.lineTo(points[j].x, points[j].y);
  }
  ctx.stroke();

  // เส้นที่แถบสแกนกำลังผ่านจะสว่างขึ้น
  ctx.lineWidth = 1;
  ctx.strokeStyle = `rgba(${YELLOW}, ${0.75 * intensity})`;
  ctx.beginPath();
  for (const [i, j] of mesh.tessellation) {
    const p = points[i];
    const q = points[j];
    if (Math.abs((p.y + q.y) / 2 - sweepY) > sweepRange) continue;
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
  }
  ctx.stroke();

  ctx.lineWidth = 1.6;
  ctx.strokeStyle = `rgba(${CYAN}, ${0.9 * intensity})`;
  ctx.shadowColor = `rgba(${CYAN}, 0.8)`;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  for (const [i, j] of mesh.contours) {
    ctx.moveTo(points[i].x, points[i].y);
    ctx.lineTo(points[j].x, points[j].y);
  }
  ctx.stroke();

  for (const i of mesh.keyPoints) {
    const p = points[i];
    ctx.fillStyle = scanning ? `rgba(${YELLOW}, 1)` : `rgba(${CYAN}, 1)`;
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.8 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  // กรอบมุม + ข้อความสถานะ
  drawBrackets(ctx, box.x, box.y, box.w, box.h, `rgba(${accent}, 0.95)`);
  ctx.font = `700 ${compact ? 10 : 11}px ${FONT}`;
  ctx.textBaseline = 'bottom';
  ctx.textAlign = 'left';
  ctx.fillStyle = `rgba(${accent}, 1)`;
  const blink = Math.floor(time / 450) % 2 === 0 ? '●' : '○';
  const status = `${blink} ${scanning ? 'ANALYZING' : 'FACE LOCKED'}`;
  const meshInfo = `MESH ${points.length} PTS`;
  const detail = scanning ? `SCAN ${Math.round(progress * 100)}%` : '52 MUSCLE SENSORS';
  if (compact) {
    ctx.fillText(meshInfo, box.x, box.y - 6);
    ctx.fillText(status, box.x, box.y - 20);
    ctx.textBaseline = 'top';
    ctx.fillText(detail, box.x, box.y + box.h + 6);
  } else {
    ctx.fillText(status, box.x, box.y - 6);
    ctx.textAlign = 'right';
    ctx.fillText(meshInfo, box.x + box.w, box.y - 6);
    ctx.textBaseline = 'top';
    ctx.fillText(detail, box.x + box.w, box.y + box.h + 6);
    ctx.textAlign = 'left';
    ctx.fillText(`X${Math.round(cx).toString().padStart(4, '0')} Y${Math.round(cy).toString().padStart(4, '0')}`, box.x, box.y + box.h + 6);
  }

  // แผงค่าที่วัดได้แบบสด (ซ้าย) และแนวโน้มหน้า (ขวา)
  if (scanning) {
    const panelW = 138;
    const gap = 14;
    const placePanel = (rows: HudReadout[], title: string, side: 'left' | 'right', color: string) => {
      if (rows.length === 0) return;
      const panelH = 24 + rows.length * 20;
      const fitsPreferred = side === 'right' ? box.x + box.w + gap + panelW <= width : box.x - gap - panelW >= 0;
      const onRight = side === 'right' ? fitsPreferred : !fitsPreferred;
      const px = onRight ? Math.min(box.x + box.w + gap, width - panelW - 8) : Math.max(8, box.x - gap - panelW);
      const offset = side === 'left' && !fitsPreferred ? panelH + 8 : 0;
      const py = Math.min(Math.max(8, cy - panelH / 2 + offset), height - panelH - 8);
      drawPanel(ctx, title, rows, px, py, panelW, color);
    };
    placePanel(frame.sensorReadouts, 'SENSOR DATA', 'left', CYAN);
    placePanel(frame.moodReadouts, 'MOOD VECTOR', 'right', YELLOW);
  }

  ctx.restore();
}
