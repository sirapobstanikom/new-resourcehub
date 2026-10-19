/** 7 อารมณ์พื้นฐานสากลตามทฤษฎีของ Paul Ekman */
export type FaceMoodId = 'happiness' | 'sadness' | 'fear' | 'anger' | 'surprise' | 'contempt' | 'disgust';

export type FaceMoodScores = Record<FaceMoodId, number>;

export type FaceMetricId =
  | 'cornerDrop'
  | 'mouthAsym'
  | 'lipThickness'
  | 'eyeOpen'
  | 'browHeight'
  | 'browSlant'
  | 'browGap'
  | 'smile'
  | 'jawOpen'
  | 'browDown'
  | 'browInnerUp'
  | 'eyeSquint'
  | 'lipPress'
  | 'mouthFrown'
  | 'noseSneer'
  | 'upperLipRaise'
  | 'smileAsym';

/** ค่าดิบที่วัดได้จากใบหน้า — โครงหน้าวัดเป็นสัดส่วนของระยะห่างหางตาสองข้าง, กล้ามเนื้อเป็น blendshape 0–1 */
export type FaceMetrics = Record<FaceMetricId, number>;

interface NormStat {
  mean: number;
  sd: number;
}

/** ค่าปกติของกลุ่มคนที่ใช้เทียบ: ของแต่ละค่าที่วัด และของคะแนนแต่ละแบบหน้า */
export interface FaceNorms {
  metrics: Record<FaceMetricId, NormStat>;
  moods: Record<FaceMoodId, NormStat>;
}

/** ค่า blendshape ดิบจาก MediaPipe Face Landmarker (ชื่อตาม ARKit) */
export type Blendshapes = Record<string, number>;

export interface FaceLandmark {
  x: number;
  y: number;
  z: number;
}

export interface FaceMood {
  id: FaceMoodId;
  emoji: string;
  title: string;
  subtitle: string;
  description: string;
  tip: string;
  accent: string;
}

export const FACE_MOOD_IDS: FaceMoodId[] = ['happiness', 'sadness', 'fear', 'anger', 'surprise', 'contempt', 'disgust'];

/** สัญญาณบนใบหน้าของแต่ละอารมณ์ตาม Ekman — ใช้อธิบายในหน้าผลและส่งให้ AI */
export const FACE_MOODS: Record<FaceMoodId, FaceMood> = {
  happiness: {
    id: 'happiness',
    emoji: '😄',
    title: 'หน้าสุข',
    subtitle: 'Happiness',
    description: 'มุมปากของคุณยกขึ้นแม้ตอนหน้านิ่ง ซึ่งเป็นสัญญาณของความสุขและความพอใจ ทำให้ดูอบอุ่น เป็นมิตร และเข้าหาได้ง่าย',
    tip: 'หน้าตาเป็นมิตรแบบนี้เป็นต้นทุนที่ดีมาก ช่วยให้ทีมกล้าพูด กล้าเสนอไอเดียกับคุณ',
    accent: '#FED201',
  },
  sadness: {
    id: 'sadness',
    emoji: '😢',
    title: 'หน้าเศร้า',
    subtitle: 'Sadness',
    description: 'มุมปากของคุณลู่ต่ำและหัวคิ้วยกขึ้นเล็กน้อย ซึ่งเป็นสัญญาณของความเศร้า ทำให้แววหน้าดูอ่อนโยน ลึกซึ้ง และน่าเห็นใจ',
    tip: 'ลองยกมุมปากขึ้นนิดเดียวเวลาพูดคุย หน้าจะดูสดใสขึ้นทันที',
    accent: '#60A5FA',
  },
  fear: {
    id: 'fear',
    emoji: '😨',
    title: 'หน้ากลัว',
    subtitle: 'Fear',
    description: 'ตาของคุณเปิดกว้าง หัวคิ้วยกขึ้นและชิดกัน ซึ่งเป็นสัญญาณของความกลัวหรือความกังวล ทำให้ดูระมัดระวัง ตื่นตัวต่อสิ่งรอบตัว',
    tip: 'หายใจลึก ๆ ผ่อนคลายหัวคิ้วและหนังตาสักนิด คุณจะดูมั่นใจและนิ่งขึ้นอีกเยอะ',
    accent: '#2DD4BF',
  },
  anger: {
    id: 'anger',
    emoji: '😠',
    title: 'หน้าโกรธ',
    subtitle: 'Anger',
    description: 'คิ้วของคุณอยู่ต่ำและชิดกัน ร่วมกับริมฝีปากที่เม้มบาง ซึ่งเป็นสัญญาณของความโกรธ ทำให้ดูจริงจัง เด็ดขาด และน่าเกรงขาม',
    tip: 'ลองคลายหัวคิ้วและยิ้มทักทายก่อนเริ่มคุย จะช่วยให้คนอื่นรู้ว่าจริง ๆ แล้วคุณใจดีกว่าที่เห็น',
    accent: '#F87171',
  },
  surprise: {
    id: 'surprise',
    emoji: '😲',
    title: 'หน้าประหลาดใจ',
    subtitle: 'Surprise',
    description: 'คิ้วของคุณอยู่สูงและตาเปิดกว้างกว่าคนทั่วไป ซึ่งเป็นสัญญาณของความประหลาดใจ ทำให้ดูตื่นตัว อยากรู้อยากเห็น พร้อมรับเรื่องใหม่ ๆ',
    tip: 'ความกระตือรือร้นที่เห็นได้จากหน้าตาคือเชื้อเพลิงชั้นดีของทีม ใช้มันจุดประกายไอเดียใหม่ ๆ',
    accent: '#FB923C',
  },
  contempt: {
    id: 'contempt',
    emoji: '😏',
    title: 'หน้าดูแคลน',
    subtitle: 'Contempt',
    description: 'มุมปากสองข้างของคุณสูงไม่เท่ากันคล้ายยิ้มมุมปาก ซึ่งเป็นสัญญาณของการดูแคลน ทำให้ดูมั่นใจ มีมาด แต่บางครั้งคนอื่นอาจอ่านว่าไม่ค่อยเห็นด้วย',
    tip: 'ยิ้มให้เต็มทั้งสองข้างเวลาทักทายหรือรับฟังความเห็น จะช่วยให้คนอื่นรู้สึกว่าคุณเปิดใจ',
    accent: '#A78BFA',
  },
  disgust: {
    id: 'disgust',
    emoji: '🤢',
    title: 'หน้ารังเกียจ',
    subtitle: 'Disgust',
    description: 'ริมฝีปากบนของคุณยกขึ้นและรอบจมูกตึงกว่าคนทั่วไป ซึ่งเป็นสัญญาณของความรังเกียจ ทำให้ดูเหมือนช่างเลือกและมีมาตรฐานสูง',
    tip: 'ลองผ่อนคลายรอบจมูกและริมฝีปากบน แล้วสบตาคู่สนทนา จะดูเปิดรับมากขึ้น',
    accent: '#4ADE80',
  },
};

/** ชื่อเมื่อค่าสูงกว่า / ต่ำกว่าคนทั่วไป */
export const FACE_METRIC_LABELS: Record<FaceMetricId, { high: string; low: string }> = {
  cornerDrop: { high: 'มุมปากลู่ลง', low: 'มุมปากยกขึ้น' },
  mouthAsym: { high: 'มุมปากเบี้ยว', low: 'มุมปากเท่ากัน' },
  lipThickness: { high: 'ริมฝีปากผ่อนคลาย', low: 'ริมฝีปากเม้มบาง' },
  eyeOpen: { high: 'ตาเปิดกว้าง', low: 'ตาปรือ/หนังตาตก' },
  browHeight: { high: 'คิ้วอยู่สูง', low: 'คิ้วต่ำกดตา' },
  browSlant: { high: 'หัวคิ้วยก (คิ้วลู่)', low: 'หางคิ้วชี้ขึ้น' },
  browGap: { high: 'หว่างคิ้วกว้าง', low: 'หว่างคิ้วชิด' },
  smile: { high: 'กล้ามเนื้อยิ้ม', low: 'ไม่มีรอยยิ้ม' },
  jawOpen: { high: 'ปากเผยอ', low: 'ปากปิดสนิท' },
  browDown: { high: 'กล้ามเนื้อขมวดคิ้ว', low: 'คิ้วผ่อนคลาย' },
  browInnerUp: { high: 'กล้ามเนื้อยกหัวคิ้ว', low: 'หัวคิ้วนิ่ง' },
  eyeSquint: { high: 'ตาหรี่เกร็ง', low: 'รอบตาผ่อนคลาย' },
  lipPress: { high: 'กล้ามเนื้อเม้มปาก', low: 'ปากผ่อนคลาย' },
  mouthFrown: { high: 'กล้ามเนื้อดึงมุมปากลง', low: 'มุมปากไม่ถูกดึงลง' },
  noseSneer: { high: 'จมูกย่น', low: 'จมูกผ่อนคลาย' },
  upperLipRaise: { high: 'ริมฝีปากบนยกขึ้น', low: 'ริมฝีปากบนผ่อนคลาย' },
  smileAsym: { high: 'ยิ้มมุมปากข้างเดียว', low: 'แรงยิ้มสองข้างเท่ากัน' },
};

export const FACE_METRIC_IDS = Object.keys(FACE_METRIC_LABELS) as FaceMetricId[];

export const metricLabel = (id: FaceMetricId, level: number) => (level >= 0.5 ? FACE_METRIC_LABELS[id].high : FACE_METRIC_LABELS[id].low);

/**
 * ค่าตั้งต้นของหน้านิ่งหน้ากล้อง ใช้จนกว่าจะมีผลสแกนจริงมากพอ — `buildNorms` จะค่อย ๆ แทนด้วยค่าจากผู้เล่นจริง
 */
export const DEFAULT_NORMS: FaceNorms = {
  metrics: {
    cornerDrop: { mean: 0, sd: 0.025 },
    mouthAsym: { mean: 0.03, sd: 0.025 },
    lipThickness: { mean: 0.3, sd: 0.05 },
    eyeOpen: { mean: 0.13, sd: 0.03 },
    browHeight: { mean: 0.37, sd: 0.04 },
    browSlant: { mean: 0.12, sd: 0.03 },
    browGap: { mean: 0.33, sd: 0.02 },
    smile: { mean: 0.05, sd: 0.08 },
    jawOpen: { mean: 0.03, sd: 0.04 },
    browDown: { mean: 0.12, sd: 0.1 },
    browInnerUp: { mean: 0.06, sd: 0.06 },
    eyeSquint: { mean: 0.36, sd: 0.08 },
    lipPress: { mean: 0.06, sd: 0.06 },
    mouthFrown: { mean: 0.005, sd: 0.02 },
    noseSneer: { mean: 0.005, sd: 0.02 },
    upperLipRaise: { mean: 0.04, sd: 0.04 },
    smileAsym: { mean: 0.02, sd: 0.03 },
  },
  moods: Object.fromEntries(FACE_MOOD_IDS.map((id) => [id, { mean: 0, sd: 1 }])) as FaceNorms['moods'],
};

/**
 * หน้านิ่งที่โครงหน้าคล้ายสัญญาณของอารมณ์ใด คนจะอ่านหน้านั้นเป็นอารมณ์นั้น (emotion overgeneralization)
 * สัญญาณของแต่ละอารมณ์อิงตาม Ekman/FACS — เน้นสัดส่วนโครงหน้าซึ่งคงที่ ใช้ค่ากล้ามเนื้อชั่วขณะเป็นตัวเสริม
 * น้ำหนักบวก = ยิ่งสูงกว่าคนทั่วไปยิ่งใช่, ลบ = ยิ่งต่ำกว่ายิ่งใช่
 */
export const MOOD_FORMULAS: Record<FaceMoodId, Partial<Record<FaceMetricId, number>>> = {
  // มุมปากยก + กล้ามเนื้อยิ้ม (AU12)
  happiness: { cornerDrop: -0.6, smile: 0.5 },
  // มุมปากลู่ลง (AU15) + หัวคิ้วยกจนคิ้วลู่ (AU1)
  sadness: { cornerDrop: 0.5, browSlant: 0.4, browInnerUp: 0.2, mouthFrown: 0.2 },
  // ตาเบิก (AU5) + หัวคิ้วยกและชิดกัน (AU1+4) + ปากเผยอ/ตึง (AU20, AU25)
  fear: { eyeOpen: 0.5, browSlant: 0.3, browInnerUp: 0.3, browGap: -0.2, jawOpen: 0.2, lipThickness: -0.2 },
  // คิ้วต่ำชิดกัน (AU4) + ปากเม้มบาง (AU23/24)
  anger: { browHeight: -0.5, browGap: -0.4, browDown: 0.3, lipThickness: -0.2, lipPress: 0.15 },
  // คิ้วยกทั้งแนว (AU1+2) + ตาเบิก (AU5) + อ้าปาก (AU26)
  surprise: { browHeight: 0.6, eyeOpen: 0.5, jawOpen: 0.3 },
  // มุมปากยกข้างเดียว (unilateral AU12/14)
  contempt: { mouthAsym: 0.6, smileAsym: 0.4 },
  // ย่นจมูก (AU9) + ยกริมฝีปากบน (AU10) + คิ้วต่ำ/ตาแคบตามมา
  disgust: { upperLipRaise: 0.5, noseSneer: 0.4, browHeight: -0.2, eyeOpen: -0.2 },
};

/** ความคมของการแปลงคะแนนเป็น % — สูงขึ้น = ผลชี้ขาดชัดขึ้นเมื่อหน้าต่างจากคนทั่วไปมาก */
const MOOD_SHARPNESS = 1.6;
const Z_LIMIT = 3.5;
/** น้ำหนักของค่าตั้งต้นเทียบกับจำนวนผู้เล่นจริง (เท่ากับมีคนสมมติ 5 คน) */
const PRIOR_WEIGHT = 5;

const avg = (...values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

type Vec3 = [number, number, number];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const norm = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);

/**
 * วัดโครงหน้าในแกนของใบหน้าเอง (หมุนตามหน้า) จึงไม่เพี้ยนเมื่อเอียงหรือก้มหน้าเล็กน้อย
 * u = แกนขวาของภาพ, v = แกนลงไปทางคาง, หน่วย = ระยะหางตาสองข้าง
 */
export function extractFaceMetrics(landmarks: FaceLandmark[], blendshapes: Blendshapes, width: number, height: number): FaceMetrics {
  const p = (i: number): Vec3 => [landmarks[i].x * width, landmarks[i].y * height, landmarks[i].z * width];
  const eyeR = p(33);
  const eyeL = p(263);
  const xRaw = sub(eyeL, eyeR);
  const iod = norm(xRaw);
  const xAxis = scale(xRaw, 1 / iod);
  const down = sub(p(152), p(10));
  const yRaw = sub(down, scale(xAxis, dot(down, xAxis)));
  const yAxis = scale(yRaw, 1 / norm(yRaw));
  const origin = scale([eyeR[0] + eyeL[0], eyeR[1] + eyeL[1], eyeR[2] + eyeL[2]], 0.5);
  const u = (i: number) => dot(sub(p(i), origin), xAxis) / iod;
  const v = (i: number) => dot(sub(p(i), origin), yAxis) / iod;

  const eyeCenterR = (v(33) + v(133)) / 2;
  const eyeCenterL = (v(263) + v(362)) / 2;
  const lipCenter = (v(13) + v(14)) / 2;
  // ระยะแนวตั้งหารด้วยระยะตา→ปาก ซึ่งหดตามมุมก้ม/เงยเท่ากัน จึงหักล้างผลของมุมกล้องได้
  const midFace = lipCenter - (eyeCenterR + eyeCenterL) / 2;
  const vr = (dv: number) => dv / midFace;
  const get = (name: string) => blendshapes[name] ?? 0;

  return {
    cornerDrop: vr((v(61) + v(291)) / 2 - lipCenter),
    mouthAsym: vr(Math.abs(v(61) - v(291))),
    lipThickness: vr(v(17) - v(0) - Math.max(v(14) - v(13), 0)),
    eyeOpen: vr(avg(Math.abs(v(145) - v(159)), Math.abs(v(374) - v(386)))),
    browHeight: vr(avg(eyeCenterR - v(105), eyeCenterL - v(334))),
    browSlant: vr(avg(v(70) - v(107), v(300) - v(336))),
    browGap: Math.abs(u(336) - u(107)),
    smile: avg(get('mouthSmileLeft'), get('mouthSmileRight')),
    jawOpen: get('jawOpen'),
    browDown: avg(get('browDownLeft'), get('browDownRight')),
    browInnerUp: get('browInnerUp'),
    eyeSquint: avg(get('eyeSquintLeft'), get('eyeSquintRight')),
    lipPress: avg(get('mouthPressLeft'), get('mouthPressRight')),
    mouthFrown: avg(get('mouthFrownLeft'), get('mouthFrownRight')),
    noseSneer: avg(get('noseSneerLeft'), get('noseSneerRight')),
    upperLipRaise: avg(get('mouthUpperUpLeft'), get('mouthUpperUpRight')),
    smileAsym: Math.abs(get('mouthSmileLeft') - get('mouthSmileRight')),
  };
}

/** มุมหันของศีรษะ (องศา) จาก facial transformation matrix ของ MediaPipe (4x4 column-major) */
export function headPose(matrix: ArrayLike<number>): { yaw: number; pitch: number; roll: number } {
  const deg = 180 / Math.PI;
  return {
    yaw: Math.asin(clamp(-matrix[2], -1, 1)) * deg,
    pitch: Math.atan2(matrix[6], matrix[10]) * deg,
    roll: Math.atan2(matrix[1], matrix[0]) * deg,
  };
}

/** เวอร์ชันของวิธีวัด — ใช้แยกผลสแกนเก่าที่วัดคนละแบบออกจากการคำนวณค่าปกติ */
export const METRICS_VERSION = 4;

export const toStoredMetrics = (metrics: FaceMetrics) => ({ ...metrics, version: METRICS_VERSION });

export function isFaceMetrics(value: unknown): value is FaceMetrics {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return record.version === METRICS_VERSION && FACE_METRIC_IDS.every((id) => typeof record[id] === 'number');
}

/** ค่ากลาง (median) ของทุกเฟรม — กันการกะพริบตาหรือขยับหน้าชั่วขณะดึงผล */
export function medianMetrics(samples: FaceMetrics[]): FaceMetrics {
  return Object.fromEntries(FACE_METRIC_IDS.map((id) => [id, samples.length ? median(samples.map((s) => s[id])) : 0])) as FaceMetrics;
}

export function averageMetrics(samples: FaceMetrics[]): FaceMetrics {
  const total = Object.fromEntries(FACE_METRIC_IDS.map((id) => [id, 0])) as FaceMetrics;
  if (samples.length === 0) return total;
  for (const sample of samples) {
    for (const id of FACE_METRIC_IDS) total[id] += sample[id] / samples.length;
  }
  return total;
}

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/** ค่าที่วัดได้ห่างจากคนทั่วไปกี่ SD (บวก = มากกว่าปกติ) */
export function metricDeviations(metrics: FaceMetrics, norms: FaceNorms = DEFAULT_NORMS): FaceMetrics {
  return Object.fromEntries(
    FACE_METRIC_IDS.map((id) => [id, clamp((metrics[id] - norms.metrics[id].mean) / norms.metrics[id].sd, -Z_LIMIT, Z_LIMIT)]),
  ) as FaceMetrics;
}

/** ระดับเทียบกับคนทั่วไปเป็น 0–1 (0.5 = เท่าค่าเฉลี่ย, 0.9 = มากกว่าคนส่วนใหญ่, 0.1 = น้อยกว่าคนส่วนใหญ่) */
export function metricLevels(metrics: FaceMetrics, norms: FaceNorms = DEFAULT_NORMS): FaceMetrics {
  const z = metricDeviations(metrics, norms);
  return Object.fromEntries(FACE_METRIC_IDS.map((id) => [id, 1 / (1 + Math.exp(-1.702 * z[id]))])) as FaceMetrics;
}

/** การยิ้มจริงทำให้ตาหรี่ คิ้วลด ปากบาง — ส่วนที่มาจากการยิ้มไม่นับเป็นหลักฐานของแบบหน้าอื่น */
const smileStrength = (metrics: FaceMetrics) => clamp((metrics.smile - 0.1) / 0.4, 0, 1);

/** ส่วนที่แต่ละค่าช่วยให้ได้แบบหน้านั้น — หารด้วย √Σw² ให้ทุกแบบหน้ามีโอกาสเท่ากันเมื่อหน้าเป็นแบบสุ่ม */
const moodContributions = (mood: FaceMoodId, metrics: FaceMetrics, norms: FaceNorms) => {
  const z = metricDeviations(metrics, norms);
  const entries = Object.entries(MOOD_FORMULAS[mood]) as [FaceMetricId, number][];
  const weightNorm = Math.sqrt(entries.reduce((sum, [, w]) => sum + w * w, 0));
  const damp = mood === 'happiness' ? 0 : smileStrength(metrics);
  return entries.map(([id, w]) => {
    const raw = (w * z[id]) / weightNorm;
    return { id, contribution: raw > 0 ? raw * (1 - damp) : raw };
  });
};

const rawMoodScore = (mood: FaceMoodId, metrics: FaceMetrics, norms: FaceNorms) =>
  moodContributions(mood, metrics, norms).reduce((sum, c) => sum + c.contribution, 0);

/** สร้างค่าปกติจากผลสแกนจริง (หนึ่งค่าต่อคน) ผสมกับค่าตั้งต้น — ใช้ median/MAD กันคนที่ทำหน้าแปลก ๆ ดึงค่าเพี้ยน */
export function buildNorms(people: FaceMetrics[]): FaceNorms {
  const n = people.length;
  if (n === 0) return DEFAULT_NORMS;
  const shrink = (value: number, prior: number) => (n * value + PRIOR_WEIGHT * prior) / (n + PRIOR_WEIGHT);
  const robust = (values: number[]) => {
    const center = median(values);
    return { center, spread: 1.4826 * median(values.map((x) => Math.abs(x - center))) };
  };

  const metrics = Object.fromEntries(
    FACE_METRIC_IDS.map((id) => {
      const prior = DEFAULT_NORMS.metrics[id];
      const { center, spread } = robust(people.map((m) => m[id]));
      return [id, { mean: shrink(center, prior.mean), sd: Math.max(shrink(spread, prior.sd), prior.sd * 0.4) }];
    }),
  ) as FaceNorms['metrics'];

  // ปรับให้แต่ละแบบหน้าออกบ่อยใกล้ ๆ กันในกลุ่มผู้เล่นจริง
  const base: FaceNorms = { metrics, moods: DEFAULT_NORMS.moods };
  const moods = Object.fromEntries(
    FACE_MOOD_IDS.map((mood) => {
      const { center, spread } = robust(people.map((m) => rawMoodScore(mood, m, base)));
      return [mood, { mean: shrink(center, 0), sd: Math.max(shrink(spread, 1), 0.4) }];
    }),
  ) as FaceNorms['moods'];

  return { metrics, moods };
}

export function calculateMoodScores(metrics: FaceMetrics, norms: FaceNorms = DEFAULT_NORMS): FaceMoodScores {
  const weights = Object.fromEntries(
    FACE_MOOD_IDS.map((mood) => {
      const { mean, sd } = norms.moods[mood];
      return [mood, Math.exp(MOOD_SHARPNESS * ((rawMoodScore(mood, metrics, norms) - mean) / sd))];
    }),
  ) as FaceMoodScores;
  const total = FACE_MOOD_IDS.reduce((sum, id) => sum + weights[id], 0);
  return Object.fromEntries(FACE_MOOD_IDS.map((id) => [id, weights[id] / total])) as FaceMoodScores;
}

export function classifyFaceMood(moodScores: FaceMoodScores): FaceMood {
  const top = FACE_MOOD_IDS.reduce((best, id) => (moodScores[id] > moodScores[best] ? id : best), FACE_MOOD_IDS[0]);
  return FACE_MOODS[top];
}

/** ลักษณะที่ต่างจากคนทั่วไปซึ่งทำให้ได้แบบหน้านี้ เรียงจากผลมากไปน้อย (level = ระดับเทียบคนทั่วไป 0–1) */
export function moodEvidence(mood: FaceMoodId, metrics: FaceMetrics, norms: FaceNorms = DEFAULT_NORMS) {
  const levels = metricLevels(metrics, norms);
  return moodContributions(mood, metrics, norms)
    .filter(({ contribution }) => contribution > 0.1)
    .sort((a, b) => b.contribution - a.contribution)
    .map(({ id }) => ({ id, level: levels[id], label: metricLabel(id, levels[id]) }));
}
