export type FaceExpressionKey = 'neutral' | 'happy' | 'sad' | 'angry' | 'fearful' | 'disgusted' | 'surprised';

export type FaceExpressionScores = Record<FaceExpressionKey, number>;

export type FaceMoodId = 'kind' | 'fierce' | 'sad' | 'gloomy' | 'excited' | 'worried' | 'grumpy';

export type FaceMoodScores = Record<FaceMoodId, number>;

export interface FaceMood {
  id: FaceMoodId;
  emoji: string;
  title: string;
  subtitle: string;
  description: string;
  tip: string;
  accent: string;
}

export const FACE_EXPRESSION_KEYS: FaceExpressionKey[] = ['happy', 'neutral', 'sad', 'angry', 'surprised', 'fearful', 'disgusted'];

export const FACE_MOOD_IDS: FaceMoodId[] = ['kind', 'fierce', 'sad', 'gloomy', 'excited', 'worried', 'grumpy'];

export const FACE_MOODS: Record<FaceMoodId, FaceMood> = {
  kind: {
    id: 'kind',
    emoji: '😊',
    title: 'หน้าใจดี',
    subtitle: 'The Kind Face',
    description: 'แม้ไม่ได้ยิ้ม หน้าตาของคุณก็ดูอบอุ่นและเป็นมิตร คนรอบข้างรู้สึกว่าเข้าหาได้ง่าย อยากเข้ามาคุยด้วย',
    tip: 'หน้าตาเป็นมิตรแบบนี้เป็นต้นทุนที่ดีมาก ช่วยให้ทีมกล้าพูด กล้าเสนอไอเดียกับคุณ',
    accent: '#FED201',
  },
  fierce: {
    id: 'fierce',
    emoji: '😠',
    title: 'หน้าดุ',
    subtitle: 'The Fierce Face',
    description: 'ตอนหน้านิ่ง คุณดูจริงจัง เด็ดขาด และน่าเกรงขาม คนที่เพิ่งเจออาจเกรงใจคุณนิด ๆ',
    tip: 'ลองยิ้มทักทายก่อนเริ่มคุย จะช่วยให้คนอื่นรู้ว่าจริง ๆ แล้วคุณใจดีกว่าที่เห็น',
    accent: '#F87171',
  },
  sad: {
    id: 'sad',
    emoji: '😢',
    title: 'หน้าเศร้า',
    subtitle: 'The Sad Face',
    description: 'แววตาของคุณดูอ่อนโยนและมีความรู้สึกลึกซึ้ง เป็นคนที่เข้าใจความรู้สึกของคนอื่นได้ดี',
    tip: 'ถ้าวันนี้เหนื่อย ลองพักสักแป๊บ หาเพื่อนคุย หรือหาอะไรอร่อย ๆ กินนะ',
    accent: '#60A5FA',
  },
  gloomy: {
    id: 'gloomy',
    emoji: '😔',
    title: 'หน้าซึม',
    subtitle: 'The Gloomy Face',
    description: 'ตอนหน้านิ่ง คุณดูเงียบ ๆ ซึม ๆ เหมือนกำลังคิดอะไรอยู่ในใจ คนรอบข้างอาจแอบถามว่าโอเคไหม',
    tip: 'ลองยกมุมปากขึ้นนิดเดียวตอนพูดคุย จะดูสดใสและมีพลังขึ้นทันที',
    accent: '#A78BFA',
  },
  excited: {
    id: 'excited',
    emoji: '😲',
    title: 'หน้าตื่นเต้น',
    subtitle: 'The Curious Face',
    description: 'แม้หน้านิ่ง คุณก็ดูตื่นตัว อยากรู้อยากเห็น พร้อมรับเรื่องใหม่ ๆ อยู่เสมอ',
    tip: 'ความกระตือรือร้นที่เห็นได้จากหน้าตาคือเชื้อเพลิงชั้นดีของทีม ใช้มันจุดประกายไอเดียใหม่ ๆ',
    accent: '#FB923C',
  },
  worried: {
    id: 'worried',
    emoji: '😟',
    title: 'หน้ากังวล',
    subtitle: 'The Worried Face',
    description: 'หน้าตาของคุณดูรอบคอบ คิดเผื่อไว้หลายทาง เหมือนคนที่ใส่ใจรายละเอียดและไม่อยากให้อะไรผิดพลาด',
    tip: 'หายใจลึก ๆ ผ่อนคลายหัวคิ้วสักนิด คุณจะดูมั่นใจขึ้นอีกเยอะ',
    accent: '#2DD4BF',
  },
  grumpy: {
    id: 'grumpy',
    emoji: '😒',
    title: 'หน้าเบื่อโลก',
    subtitle: 'The Grumpy Face',
    description: 'ตอนหน้านิ่ง คุณดูเหมือนมีบางอย่างไม่ถูกใจ หรือกำลังเบื่อ ๆ แต่ก็มีเสน่ห์แบบเท่ ๆ',
    tip: 'ลองผ่อนคลายรอบปากและหัวคิ้ว แล้วสบตาคู่สนทนา จะดูเปิดใจขึ้นมาก',
    accent: '#4ADE80',
  },
};

/** ค่ายิ่งมาก สัดส่วนแนวโน้มยิ่งกระจายไม่กระจุกอยู่ที่อารมณ์เดียว */
const LEAN_TEMPERATURE = 2.5;
/** โมเดลมักให้ค่า sad สูงกับหน้านิ่งทั่วไป จึงลดน้ำหนักลง */
const LEAN_BIAS: Partial<Record<FaceExpressionKey, number>> = { sad: 0.6 };
/** ค่า sad ดิบตั้งแต่ระดับนี้ขึ้นไปถือว่าเศร้าชัดเจน ต่ำกว่านี้ส่วนที่เหลือนับเป็นหน้าซึม */
const CLEAR_SAD_LEVEL = 0.5;

const MOOD_EXPRESSION: Record<Exclude<FaceMoodId, 'sad' | 'gloomy'>, FaceExpressionKey> = {
  kind: 'happy',
  fierce: 'angry',
  excited: 'surprised',
  worried: 'fearful',
  grumpy: 'disgusted',
};

const LEAN_KEYS: FaceExpressionKey[] = ['happy', 'sad', 'angry', 'surprised', 'fearful', 'disgusted'];

export const emptyExpressionScores = (): FaceExpressionScores => ({
  neutral: 0,
  happy: 0,
  sad: 0,
  angry: 0,
  fearful: 0,
  disgusted: 0,
  surprised: 0,
});

export function averageExpressionScores(samples: FaceExpressionScores[]): FaceExpressionScores {
  const total = emptyExpressionScores();
  if (samples.length === 0) return total;
  for (const sample of samples) {
    for (const key of FACE_EXPRESSION_KEYS) total[key] += sample[key];
  }
  for (const key of FACE_EXPRESSION_KEYS) total[key] /= samples.length;
  return total;
}

/** แนวโน้มของใบหน้าโดยไม่นับค่า neutral — ใช้ได้แม้ผู้ใช้ทำหน้านิ่ง */
function moodScoresForSample(sample: FaceExpressionScores): FaceMoodScores {
  const logits = LEAN_KEYS.map((key) => Math.log(Math.max(sample[key] * (LEAN_BIAS[key] ?? 1), 1e-12)) / LEAN_TEMPERATURE);
  const maxLogit = Math.max(...logits);
  const weights = logits.map((l) => Math.exp(l - maxLogit));
  const sum = weights.reduce((a, b) => a + b, 0);
  const lean = Object.fromEntries(LEAN_KEYS.map((key, i) => [key, weights[i] / sum])) as Record<FaceExpressionKey, number>;

  const clearSad = Math.min(sample.sad / CLEAR_SAD_LEVEL, 1);
  return {
    kind: lean[MOOD_EXPRESSION.kind],
    fierce: lean[MOOD_EXPRESSION.fierce],
    sad: lean.sad * clearSad,
    gloomy: lean.sad * (1 - clearSad),
    excited: lean[MOOD_EXPRESSION.excited],
    worried: lean[MOOD_EXPRESSION.worried],
    grumpy: lean[MOOD_EXPRESSION.grumpy],
  };
}

export function calculateMoodScores(samples: FaceExpressionScores[]): FaceMoodScores {
  const total = Object.fromEntries(FACE_MOOD_IDS.map((id) => [id, 0])) as FaceMoodScores;
  if (samples.length === 0) return total;
  for (const sample of samples) {
    const scores = moodScoresForSample(sample);
    for (const id of FACE_MOOD_IDS) total[id] += scores[id] / samples.length;
  }
  return total;
}

export function classifyFaceMood(moodScores: FaceMoodScores): FaceMood {
  const top = FACE_MOOD_IDS.reduce((best, id) => (moodScores[id] > moodScores[best] ? id : best), FACE_MOOD_IDS[0]);
  return FACE_MOODS[top];
}
