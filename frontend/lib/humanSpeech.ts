import { supabaseAnonKey, supabaseFunctionsUrl } from './supabase';

let currentAudio: HTMLAudioElement | null = null;
let speakToken = 0;
const objectUrls: string[] = [];
type QueueItem = { text: string; blobPromise?: Promise<Blob | null> };
let playQueue: QueueItem[] = [];
let pumping = false;
let activeHandlers: { onStart?: () => void; onEnd?: () => void } | null = null;
let hasStarted = false;
/** ความเร็ว TTS — OpenAI รองรับ 0.25–4.0 */
let speechRate = 1.08;
export type SpeechGender = 'male' | 'female';
/** เสียง OpenAI TTS ตามเพศ — female: nova, male: onyx */
let speechVoice: 'nova' | 'onyx' | 'shimmer' | 'echo' = 'nova';
let speechGender: SpeechGender = 'female';

/** ตั้งเพศเสียงพูด (จำลองตัวละคร) — นอกจำลองใช้หญิงเป็นค่าเริ่มต้น */
export function setHumanSpeechGender(gender: SpeechGender) {
  speechGender = gender === 'male' ? 'male' : 'female';
  speechVoice = speechGender === 'male' ? 'onyx' : 'nova';
}

export function getHumanSpeechGender() {
  return speechGender;
}

/** ตั้งความเร็วพูด: 1 / 2 / 3 (โหมดออโต้) */
export function setHumanSpeechRate(multiplier: number) {
  const m = Math.max(1, Math.min(3, Math.round(multiplier) || 1));
  // x1 ≈ ธรรมชาติ, x2 เร็วขึ้นชัด, x3 เร็วมากแต่ยังฟังรู้เรื่อง
  speechRate = m === 1 ? 1.08 : m === 2 ? 1.55 : 2.15;
}

export function getHumanSpeechRate() {
  return speechRate;
}

export function isHumanSpeechBusy() {
  if (pumping || playQueue.length > 0 || currentAudio != null) return true;
  try {
    if (typeof window !== 'undefined' && window.speechSynthesis?.speaking) return true;
  } catch {
    /* ignore */
  }
  return false;
}

/** แนบ onEnd ถ้ายังพูดอยู่ ไม่เช่นนั้นเรียกทันที */
export function attachSpeechEndHandler(onEnd: () => void) {
  if (!isHumanSpeechBusy()) {
    onEnd();
    return;
  }
  const prevEnd = activeHandlers?.onEnd;
  activeHandlers = {
    ...(activeHandlers || {}),
    onEnd: () => {
      prevEnd?.();
      onEnd();
    },
  };
}

type LevelListener = (level: number) => void;
const levelListeners = new Set<LevelListener>();
let audioCtx: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let mediaSource: MediaElementAudioSourceNode | null = null;
let levelRaf = 0;
let fakeJawTimer: number | null = null;
/** element ที่สร้าง MediaElementSource แล้ว — สร้างซ้ำไม่ได้ */
const wiredAudioElements = new WeakSet<HTMLAudioElement>();

export function subscribeSpeechLevel(listener: LevelListener): () => void {
  levelListeners.add(listener);
  return () => levelListeners.delete(listener);
}

function emitSpeechLevel(level: number) {
  const n = Math.max(0, Math.min(1, level));
  levelListeners.forEach((cb) => cb(n));
}

function stopLevelMonitor() {
  if (levelRaf) {
    cancelAnimationFrame(levelRaf);
    levelRaf = 0;
  }
  if (fakeJawTimer != null) {
    window.clearInterval(fakeJawTimer);
    fakeJawTimer = null;
  }
  emitSpeechLevel(0);
}

function ensureAudioGraph() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  if (!analyser) {
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.55;
    analyser.connect(audioCtx.destination);
  }
  return audioCtx;
}

function startAnalyserLoop() {
  if (levelRaf) return;
  const data = new Uint8Array(analyser?.frequencyBinCount || 128);
  const tick = () => {
    if (!analyser) {
      levelRaf = 0;
      return;
    }
    analyser.getByteFrequencyData(data);
    let sum = 0;
    const from = 2;
    const to = Math.min(28, data.length);
    for (let i = from; i < to; i += 1) sum += data[i];
    const avg = sum / Math.max(1, to - from) / 180;
    // ขยายช่วงให้อ้าปากเห็นชัด
    emitSpeechLevel(Math.min(1, avg * 1.35));
    levelRaf = requestAnimationFrame(tick);
  };
  levelRaf = requestAnimationFrame(tick);
}

function wireAudioElement(audio: HTMLAudioElement) {
  const ctx = ensureAudioGraph();
  if (!ctx || !analyser) return;
  if (ctx.state === 'suspended') void ctx.resume();
  if (!wiredAudioElements.has(audio)) {
    try {
      // ต่อเข้ากราฟครั้งเดียวต่อ element
      const src = ctx.createMediaElementSource(audio);
      src.connect(analyser);
      wiredAudioElements.add(audio);
      mediaSource = src;
    } catch {
      // ถ้าต่อไม่ได้ ใช้ fake jaw แทน
      startFakeJaw();
      return;
    }
  }
  startAnalyserLoop();
}

function startFakeJaw() {
  if (fakeJawTimer != null) return;
  let t = 0;
  fakeJawTimer = window.setInterval(() => {
    t += 1;
    // คลื่นไม่สม่ำเสมอคล้ายพูด
    const a = 0.35 + 0.45 * Math.abs(Math.sin(t * 0.9));
    const b = 0.2 * Math.abs(Math.sin(t * 2.3));
    emitSpeechLevel(Math.min(1, a + b));
  }, 70);
}

export function stopHumanSpeech() {
  speakToken += 1;
  playQueue = [];
  pumping = false;
  hasStarted = false;
  activeHandlers = null;
  stopLevelMonitor();
  try {
    if (currentAudio) {
      currentAudio.onended = null;
      currentAudio.onerror = null;
      currentAudio.pause();
      currentAudio.src = '';
      currentAudio = null;
    }
    while (objectUrls.length) {
      const url = objectUrls.pop();
      if (url) URL.revokeObjectURL(url);
    }
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
  } catch {
    /* ignore */
  }
}

export function stripMarkdownForSpeech(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-•]\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\[\[\/?[^\]]+\]\]/g, '')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function splitSpeechChunks(text: string): string[] {
  const clean = stripMarkdownForSpeech(text);
  if (!clean) return [];
  const parts = clean
    .split(/(?<=[।.!?\u0E2F…])\s+|(?<=\.)\s+|。/)
    .map((c) => c.trim())
    .filter(Boolean);
  if (parts.length <= 1) {
    if (clean.length > 120) {
      const soft = clean.split(/(?<=[,，、;:])\s+/).map((c) => c.trim()).filter(Boolean);
      if (soft.length > 1) return soft;
    }
    return [clean];
  }
  const merged: string[] = [];
  let buf = '';
  for (const p of parts) {
    if (!buf) {
      buf = p;
      continue;
    }
    if ((buf + ' ' + p).length < 90) buf = `${buf} ${p}`;
    else {
      merged.push(buf);
      buf = p;
    }
  }
  if (buf) merged.push(buf);
  return merged;
}

function pickBestThaiVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const score = (v: SpeechSynthesisVoice) => {
    const name = v.name.toLowerCase();
    const lang = v.lang.toLowerCase();
    let s = 0;
    if (lang.startsWith('th')) s += 50;
    if (/thai|ไทย/.test(name)) s += 40;
    if (/neural|natural|premium|enhanced|online|google|microsoft/.test(name)) s += 25;
    if (v.localService === false) s += 10;
    return s;
  };
  return [...voices].sort((a, b) => score(b) - score(a))[0] || null;
}

function speakWithBrowser(text: string, token: number) {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    activeHandlers?.onEnd?.();
    return;
  }
  const parts = splitSpeechChunks(text);
  const voice = pickBestThaiVoice();
  let index = 0;
  startFakeJaw();

  const speakNext = () => {
    if (token !== speakToken) return;
    if (index >= parts.length) {
      stopLevelMonitor();
      if (!playQueue.length) activeHandlers?.onEnd?.();
      else void pumpQueue(token);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(parts[index]);
    utterance.lang = 'th-TH';
    utterance.rate = Math.min(2, Math.max(0.7, speechRate));
    utterance.pitch = speechGender === 'male' ? 0.88 : 1.08;
    if (voice) utterance.voice = voice;
    if (!hasStarted) {
      hasStarted = true;
      utterance.onstart = () => activeHandlers?.onStart?.();
    }
    utterance.onend = () => {
      index += 1;
      window.setTimeout(speakNext, 40);
    };
    utterance.onerror = () => {
      stopLevelMonitor();
      activeHandlers?.onEnd?.();
    };
    window.speechSynthesis.speak(utterance);
  };

  speakNext();
}

async function fetchTtsBlob(text: string): Promise<Blob | null> {
  if (!supabaseFunctionsUrl || !supabaseAnonKey) return null;
  const res = await fetch(`${supabaseFunctionsUrl}/functions/v1/openai-proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({
      purpose: 'tts',
      model: 'tts-1',
      voice: speechVoice,
      input: text.slice(0, 2000),
      speed: Math.min(4, Math.max(0.25, speechRate)),
    }),
  });
  if (!res.ok) return null;
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('audio')) return null;
  return await res.blob();
}

function playBlob(blob: Blob, token: number): Promise<void> {
  return new Promise((resolve) => {
    if (token !== speakToken) {
      resolve();
      return;
    }
    const url = URL.createObjectURL(blob);
    objectUrls.push(url);
    const audio = new Audio(url);
    audio.crossOrigin = 'anonymous';
    currentAudio = audio;
    wireAudioElement(audio);
    if (!hasStarted) {
      hasStarted = true;
      audio.onplay = () => {
        activeHandlers?.onStart?.();
        startAnalyserLoop();
      };
    } else {
      audio.onplay = () => startAnalyserLoop();
    }
    audio.onended = () => {
      if (currentAudio === audio) currentAudio = null;
      if (!playQueue.length) stopLevelMonitor();
      resolve();
    };
    audio.onerror = () => {
      if (currentAudio === audio) currentAudio = null;
      resolve();
    };
    void audio.play().catch(() => resolve());
  });
}

async function pumpQueue(token: number) {
  if (pumping) return;
  pumping = true;
  try {
    while (token === speakToken && playQueue.length) {
      const item = playQueue.shift()!;
      const blob = item.blobPromise ? await item.blobPromise : await fetchTtsBlob(item.text);
      if (token !== speakToken) return;
      if (!blob) {
        speakWithBrowser(item.text, token);
        // browser path continues async; stop pump for this turn
        return;
      }
      // prefetch ชิ้นถัดไปถ้ายังไม่มี
      if (playQueue[0] && !playQueue[0].blobPromise) {
        playQueue[0].blobPromise = fetchTtsBlob(playQueue[0].text);
      }
      await playBlob(blob, token);
    }
    if (token === speakToken && !playQueue.length) {
      activeHandlers?.onEnd?.();
      activeHandlers = null;
      hasStarted = false;
    }
  } finally {
    pumping = false;
  }
}

function enqueueTexts(texts: string[], handlers?: { onStart?: () => void; onEnd?: () => void }, reset = false) {
  const cleaned = texts.map((t) => stripMarkdownForSpeech(t)).filter(Boolean);
  if (!cleaned.length) {
    handlers?.onEnd?.();
    return;
  }
  if (reset) {
    stopHumanSpeech();
  }
  const token = reset ? speakToken : speakToken;
  if (handlers) activeHandlers = handlers;
  if (reset) hasStarted = false;

  for (const text of cleaned) {
    const item: QueueItem = { text };
    // เริ่ม fetch ทันทีตอนเข้าคิว
    item.blobPromise = fetchTtsBlob(text);
    playQueue.push(item);
  }
  void pumpQueue(token);
}

/** พูดทั้งข้อความแบบเร็ว: ตัดประโยค + prefetch */
export async function speakHumanThai(
  text: string,
  handlers?: { onStart?: () => void; onEnd?: () => void }
): Promise<void> {
  const chunks = splitSpeechChunks(text);
  if (!chunks.length) {
    handlers?.onEnd?.();
    return;
  }
  if (!supabaseFunctionsUrl || !supabaseAnonKey) {
    stopHumanSpeech();
    activeHandlers = handlers || null;
    hasStarted = false;
    speakWithBrowser(chunks.join(' '), speakToken);
    return;
  }
  enqueueTexts(chunks, handlers, true);
}

/** ต่อคิวประโยคระหว่าง stream โดยไม่ตัดเสียงที่กำลังเล่น */
export function enqueueHumanThai(
  text: string,
  handlers?: { onStart?: () => void; onEnd?: () => void }
): void {
  const chunks = splitSpeechChunks(text);
  if (!chunks.length) return;
  if (handlers) activeHandlers = { ...activeHandlers, ...handlers };
  if (!supabaseFunctionsUrl || !supabaseAnonKey) {
    // ถ้ายังไม่เล่นอะไร ใช้ browser; ถ้าเล่นอยู่ให้ต่อท้ายแบบง่าย
    if (!hasStarted && !pumping) {
      activeHandlers = handlers || activeHandlers;
      speakWithBrowser(chunks.join(' '), speakToken);
    }
    return;
  }
  enqueueTexts(chunks, handlers, false);
}
