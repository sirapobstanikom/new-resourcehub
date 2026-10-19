import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import BrandLogo, { prepareBrandLogosForExport } from './BrandLogo';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { FaceLandmarker } from '@mediapipe/tasks-vision';
import {
  DEFAULT_NORMS,
  FACE_METRIC_IDS,
  FACE_MOOD_IDS,
  FACE_MOODS,
  averageMetrics,
  buildNorms,
  calculateMoodScores,
  classifyFaceMood,
  extractFaceMetrics,
  headPose,
  isFaceMetrics,
  medianMetrics,
  toStoredMetrics,
  metricLabel,
  metricLevels,
  moodEvidence,
  type FaceMetrics,
  type FaceMood,
  type FaceMoodScores,
  type FaceNorms,
} from '../lib/faceMoodData';
import { drawFaceHud, type HudMesh, type HudPoint } from '../lib/faceScanHud';
import { getFaceMoodVerdict } from '../services/faceMoodAi';

type Phase = 'register' | 'scan' | 'result';
type CameraStatus = 'loading' | 'ready' | 'error';

interface Registration {
  name: string;
  company: string;
  email: string;
}

interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ScanResult {
  mood: FaceMood;
  moodScores: FaceMoodScores;
  metrics: FaceMetrics;
  norms: FaceNorms;
  photo: string;
  scannedAt: string;
  /** ใครเป็นผู้สรุปแบบหน้า: GPT จากค่าที่วัดได้ หรือสูตรสำรองเมื่อเรียก AI ไม่สำเร็จ */
  source: 'pending' | 'ai' | 'formula';
  aiSummary?: string;
  aiTip?: string;
}

interface FaceEngine {
  landmarker: FaceLandmarker;
  mesh: HudMesh;
}

const REGISTRATION_KEY = 'minddojo.face_scan.registration';
/** เปลี่ยนเมื่อแก้ข้อความยินยอม เพื่อแยกว่าผู้ใช้ยินยอมกับข้อความฉบับไหน */
const CONSENT_VERSION = 'face-scan-pdpa-v1';
const MEDIAPIPE_WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const FACE_MODEL_URL = `${import.meta.env.BASE_URL}models/mediapipe/face_landmarker.task`;
const SCAN_DURATION_MS = 3000;
const MIN_FACE_SAMPLES = 10;
const DETECT_INTERVAL_MS = 33;
const FACE_LOST_GRACE_MS = 400;
const NORM_SAMPLE_LIMIT = 1000;
const SCAN_TIMEOUT_MS = 15000;
/** มุมหันสูงสุดที่ยังวัดโครงหน้าได้แม่น (องศา) */
const MAX_YAW = 15;
const MAX_PITCH = 18;
const MAX_ROLL = 12;
const YELLOW = '#FED201';
const EMPTY_REG: Registration = { name: '', company: '', email: '' };
const PREVIEW_EMOJIS = FACE_MOOD_IDS.map((id) => FACE_MOODS[id].emoji);
const HUD_KEY_POINTS = [1, 10, 33, 133, 362, 263, 61, 291, 152];

let enginePromise: Promise<FaceEngine> | null = null;

const loadFaceEngine = (): Promise<FaceEngine> => {
  enginePromise ??= (async () => {
    const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
    const fileset = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL);
    const create = (delegate: 'GPU' | 'CPU') =>
      FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: FACE_MODEL_URL, delegate },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
      });
    const landmarker = await create('GPU').catch(() => create('CPU'));
    const toEdges = (connections: { start: number; end: number }[]) =>
      connections.map(({ start, end }) => [start, end] as [number, number]);
    return {
      landmarker,
      mesh: {
        tessellation: toEdges(FaceLandmarker.FACE_LANDMARKS_TESSELATION),
        contours: toEdges(FaceLandmarker.FACE_LANDMARKS_CONTOURS),
        keyPoints: HUD_KEY_POINTS,
      },
    };
  })().catch((err) => {
    enginePromise = null;
    throw err;
  });
  return enginePromise;
};

const topReadouts = <T extends string>(ids: readonly T[], values: Record<T, number>, label: (id: T) => string, count: number) =>
  [...ids]
    .sort((a, b) => values[b] - values[a])
    .slice(0, count)
    .map((id) => ({ label: label(id), value: values[id] }));

const poseHintFor = ({ yaw, pitch, roll }: { yaw: number; pitch: number; roll: number }): string | null => {
  if (Math.abs(yaw) > MAX_YAW) return 'หันหน้าตรงเข้าหากล้อง';
  if (Math.abs(pitch) > MAX_PITCH) return 'อย่าก้มหรือเงยหน้า — วางกล้องให้อยู่ระดับสายตา';
  if (Math.abs(roll) > MAX_ROLL) return 'ตั้งศีรษะให้ตรง ไม่เอียงซ้าย-ขวา';
  return null;
};

/** ลักษณะที่ต่างจากคนทั่วไปมากที่สุด — value = ความห่างจากค่ากลาง (0 = เหมือนคนทั่วไป, 1 = ต่างสุด) */
const topDeviations = (levels: FaceMetrics, count: number) =>
  [...FACE_METRIC_IDS]
    .sort((a, b) => Math.abs(levels[b] - 0.5) - Math.abs(levels[a] - 0.5))
    .slice(0, count)
    .map((id) => ({ label: metricLabel(id, levels[id]), value: Math.abs(levels[id] - 0.5) * 2 }));

const loadRegistration = (): Registration => {
  try {
    const raw = localStorage.getItem(REGISTRATION_KEY);
    return raw ? { ...EMPTY_REG, ...(JSON.parse(raw) as Partial<Registration>) } : EMPTY_REG;
  } catch {
    return EMPTY_REG;
  }
};

const cameraErrorMessage = (err: unknown): string => {
  const name = err instanceof DOMException ? err.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'กรุณาอนุญาตให้เว็บไซต์ใช้กล้อง แล้วกดลองอีกครั้ง';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'ไม่พบกล้องบนอุปกรณ์นี้';
  if (name === 'NotReadableError') return 'กล้องกำลังถูกใช้งานโดยโปรแกรมอื่น ปิดโปรแกรมนั้นแล้วลองอีกครั้ง';
  return 'เปิดกล้องหรือโหลดระบบวิเคราะห์ใบหน้าไม่สำเร็จ กรุณาลองอีกครั้ง';
};

const capturePhoto = (video: HTMLVideoElement, face: FaceBox | null): string => {
  const { videoWidth: vw, videoHeight: vh } = video;
  const maxSize = Math.min(vw, vh);
  if (maxSize === 0) return '';
  const size = face ? Math.min(maxSize, Math.max(face.width, face.height) * 2.2) : maxSize;
  const centerX = face ? face.x + face.width / 2 : vw / 2;
  const centerY = face ? face.y + face.height / 2 : vh / 2;
  const sx = Math.min(Math.max(centerX - size / 2, 0), vw - size);
  const sy = Math.min(Math.max(centerY - size / 2, 0), vh - size);

  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, sx, sy, size, size, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.88);
};

const PageShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="relative min-h-[100dvh] overflow-hidden bg-[#08080b] text-white">
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(254,210,1,0.16),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(167,139,250,0.10),transparent_45%)]" />
      <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:36px_36px]" />
    </div>
    <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5 sm:px-8">
      <Link
        to="/"
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur-md hover:bg-white/10"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        หน้าหลัก
      </Link>
      <BrandLogo className="text-[24px] sm:text-[28px]" />
    </header>
    <main className="relative z-10 mx-auto w-full max-w-5xl px-5 pb-16 sm:px-8">{children}</main>
  </div>
);

const GameFaceScan: React.FC = () => {
  const [phase, setPhase] = useState<Phase>('register');
  const [reg, setReg] = useState<Registration>(loadRegistration);
  const [regError, setRegError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [consentAt, setConsentAt] = useState<string | null>(null);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('loading');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraAttempt, setCameraAttempt] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanError, setScanError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [pngLoading, setPngLoading] = useState(false);
  const [poseHint, setPoseHint] = useState<string | null>(null);
  const normsRef = useRef<FaceNorms>(DEFAULT_NORMS);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('face_scan_results')
        .select('email, metrics')
        .order('created_at', { ascending: false })
        .limit(NORM_SAMPLE_LIMIT);
      if (cancelled || error || !data) return;
      const byPerson = new Map<string, FaceMetrics[]>();
      for (const row of data as { email: string; metrics: unknown }[]) {
        if (!isFaceMetrics(row.metrics)) continue;
        const key = row.email.trim().toLowerCase();
        byPerson.set(key, [...(byPerson.get(key) ?? []), row.metrics]);
      }
      normsRef.current = buildNorms([...byPerson.values()].map(medianMetrics));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const videoRef = useRef<HTMLVideoElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const scanningRef = useRef(false);
  const scanStartRef = useRef(0);
  const scanElapsedRef = useRef(0);
  const samplesRef = useRef<FaceMetrics[]>([]);
  const faceDetectedRef = useRef(false);
  const lastFaceBoxRef = useRef<FaceBox | null>(null);
  const finishScanRef = useRef<() => void>(() => {});
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const scanTokenRef = useRef(0);

  const saveResult = async (scan: ScanResult, sampleCount: number) => {
    if (!isSupabaseConfigured || !consentAt) return;
    const row = {
      name: reg.name,
      company: reg.company,
      email: reg.email,
      mood_id: scan.mood.id,
      mood_title: scan.mood.title,
      mood_scores: scan.moodScores,
      metrics: toStoredMetrics(scan.metrics),
      sample_count: sampleCount,
      scanned_at: scan.scannedAt,
    };
    let { error } = await supabase
      .from('face_scan_results')
      .insert({
        ...row,
        mood_source: scan.source,
        ai_summary: scan.aiSummary ?? null,
        consent_at: consentAt,
        consent_version: CONSENT_VERSION,
      });
    // ตารางที่ยังไม่ได้รัน SQL เพิ่มคอลัมน์ AI/consent — บันทึกส่วนหลักไว้ก่อน
    if (error?.code === 'PGRST204') ({ error } = await supabase.from('face_scan_results').insert(row));
    if (error) console.warn('Face scan save to DB:', error.message);
  };

  finishScanRef.current = () => {
    scanningRef.current = false;
    setScanning(false);
    setScanProgress(0);
    const samples = samplesRef.current;
    const video = videoRef.current;
    if (samples.length < MIN_FACE_SAMPLES || !video) {
      setScanError('วัดใบหน้าไม่ได้ — มองตรงเข้ากล้อง ไม่ก้ม/เงย/หันข้าง ในที่ที่มีแสงสว่าง แล้วสแกนใหม่');
      return;
    }
    const metrics = medianMetrics(samples);
    const norms = normsRef.current;
    const moodScores = calculateMoodScores(metrics, norms);
    const pending: ScanResult = {
      mood: classifyFaceMood(moodScores),
      moodScores,
      metrics,
      norms,
      photo: capturePhoto(video, lastFaceBoxRef.current),
      scannedAt: new Date().toISOString(),
      source: 'pending',
    };
    const token = ++scanTokenRef.current;
    setResult(pending);
    setPhase('result');

    void (async () => {
      const verdict = await getFaceMoodVerdict(metrics, norms);
      if (token !== scanTokenRef.current) return;
      const final: ScanResult = verdict
        ? {
            ...pending,
            mood: FACE_MOODS[verdict.moodId],
            moodScores: verdict.moodScores,
            source: 'ai',
            aiSummary: verdict.summary,
            aiTip: verdict.tip,
          }
        : { ...pending, source: 'formula' };
      setResult(final);
      void saveResult(final, samples.length);
    })();
  };

  useEffect(() => {
    if (phase !== 'scan') return;
    const session = { active: true };
    let stream: MediaStream | null = null;
    let frameId: number | undefined;

    setCameraStatus('loading');
    setCameraError(null);
    setFaceDetected(false);
    faceDetectedRef.current = false;

    const runLoop = ({ landmarker, mesh }: FaceEngine, video: HTMLVideoElement) => {
      let lastDetectAt = 0;
      let lastSeenAt = 0;
      let lastLoopAt = 0;
      let lastProgressShown = 0;
      let frontal = false;
      let shownHint: string | null = null;
      let target: HudPoint[] | null = null;
      let smoothed: HudPoint[] | null = null;
      let liveMetrics: FaceMetrics | null = null;

      const updateHint = (hint: string | null) => {
        if (hint === shownHint) return;
        shownHint = hint;
        setPoseHint(hint);
      };

      const detect = (now: number) => {
        const res = landmarker.detectForVideo(video, now);
        const landmarks = res.faceLandmarks[0];
        const blendshapes = res.faceBlendshapes[0];
        const matrix = res.facialTransformationMatrixes?.[0];
        if (landmarks && blendshapes) {
          lastSeenAt = now;
          const hint = matrix ? poseHintFor(headPose(matrix.data)) : null;
          frontal = hint === null;
          updateHint(hint);
          target = landmarks.map(({ x, y }) => ({ x: x * video.videoWidth, y: y * video.videoHeight }));
          const metrics = extractFaceMetrics(
            landmarks,
            Object.fromEntries(blendshapes.categories.map((c) => [c.categoryName, c.score])),
            video.videoWidth,
            video.videoHeight,
          );
          liveMetrics = liveMetrics
            ? (Object.fromEntries(FACE_METRIC_IDS.map((id) => [id, liveMetrics![id] + (metrics[id] - liveMetrics![id]) * 0.25])) as FaceMetrics)
            : metrics;
          if (scanningRef.current && frontal) {
            samplesRef.current.push(metrics);
            const xs = target.map((p) => p.x);
            const ys = target.map((p) => p.y);
            const minX = Math.min(...xs);
            const minY = Math.min(...ys);
            lastFaceBoxRef.current = { x: minX, y: minY, width: Math.max(...xs) - minX, height: Math.max(...ys) - minY };
          }
        }
        const found = now - lastSeenAt < FACE_LOST_GRACE_MS;
        if (found !== faceDetectedRef.current) {
          faceDetectedRef.current = found;
          setFaceDetected(found);
        }
        if (!found) {
          target = null;
          liveMetrics = null;
          frontal = false;
          updateHint(null);
        }
      };

      const draw = (now: number) => {
        const canvas = overlayRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        const dpr = window.devicePixelRatio || 1;
        const cw = canvas.clientWidth;
        const ch = canvas.clientHeight;
        if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
          canvas.width = Math.round(cw * dpr);
          canvas.height = Math.round(ch * dpr);
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, cw, ch);
        const current = target;
        if (!current) {
          smoothed = null;
          return;
        }
        smoothed = smoothed
          ? smoothed.map((p, i) => ({ x: p.x + (current[i].x - p.x) * 0.5, y: p.y + (current[i].y - p.y) * 0.5 }))
          : current;

        const scale = Math.max(cw / video.videoWidth, ch / video.videoHeight);
        const offsetX = (cw - video.videoWidth * scale) / 2;
        const offsetY = (ch - video.videoHeight * scale) / 2;
        const points = smoothed.map((p) => ({ x: cw - (offsetX + p.x * scale), y: offsetY + p.y * scale }));

        const scanning = scanningRef.current;
        const recent = samplesRef.current.slice(-12);
        const liveMoods = scanning && recent.length > 0 ? calculateMoodScores(averageMetrics(recent), normsRef.current) : null;
        const liveLevels = liveMetrics ? metricLevels(liveMetrics, normsRef.current) : null;
        drawFaceHud(
          ctx,
          cw,
          ch,
          {
            points,
            scanning,
            progress: scanning ? Math.min(scanElapsedRef.current / SCAN_DURATION_MS, 1) : 0,
            moodReadouts: liveMoods ? topReadouts(FACE_MOOD_IDS, liveMoods, (id) => `${FACE_MOODS[id].emoji} ${FACE_MOODS[id].title}`, 3) : [],
            sensorReadouts: liveLevels ? topDeviations(liveLevels, 4) : [],
            time: now,
          },
          mesh,
        );
      };

      const loop = (now: number) => {
        if (!session.active) return;
        frameId = requestAnimationFrame(loop);
        if (video.readyState >= 2 && video.videoWidth > 0 && now - lastDetectAt >= DETECT_INTERVAL_MS) {
          lastDetectAt = now;
          detect(now);
        }
        if (scanningRef.current) {
          if (frontal && faceDetectedRef.current) scanElapsedRef.current += Math.min(now - lastLoopAt, 100);
          const progress = Math.min(scanElapsedRef.current / SCAN_DURATION_MS, 1);
          if (Math.abs(progress - lastProgressShown) >= 0.02 || progress >= 1) {
            lastProgressShown = progress;
            setScanProgress(progress);
          }
          if (progress >= 1 || now - scanStartRef.current > SCAN_TIMEOUT_MS) {
            lastProgressShown = 0;
            finishScanRef.current();
          }
        }
        lastLoopAt = now;
        draw(now);
      };
      frameId = requestAnimationFrame(loop);
    };

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');
        const [engine, media] = await Promise.all([
          loadFaceEngine(),
          navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 720 } },
          }),
        ]);
        stream = media;
        const video = videoRef.current;
        if (!session.active || !video) return;
        video.srcObject = media;
        await video.play();
        if (!session.active) return;
        setCameraStatus('ready');
        runLoop(engine, video);
      } catch (err) {
        if (!session.active) return;
        setCameraStatus('error');
        setCameraError(
          err instanceof Error && err.message === 'unsupported'
            ? 'เบราว์เซอร์นี้ไม่รองรับการใช้กล้อง (ต้องเปิดผ่าน https)'
            : cameraErrorMessage(err),
        );
      }
    })();

    return () => {
      session.active = false;
      if (frameId !== undefined) cancelAnimationFrame(frameId);
      scanningRef.current = false;
      stream?.getTracks().forEach((track) => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [phase, cameraAttempt]);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed: Registration = { name: reg.name.trim(), company: reg.company.trim(), email: reg.email.trim().toLowerCase() };
    if (!trimmed.name || !trimmed.company || !trimmed.email) {
      setRegError('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed.email)) {
      setRegError('กรุณากรอกอีเมลให้ถูกต้อง');
      return;
    }
    if (!consent) {
      setRegError('กรุณาให้ความยินยอมในการเก็บข้อมูลใบหน้าก่อนเริ่มสแกน');
      return;
    }
    setReg(trimmed);
    setConsentAt(new Date().toISOString());
    setRegError(null);
    try {
      localStorage.setItem(REGISTRATION_KEY, JSON.stringify(trimmed));
    } catch {}
    setPhase('scan');
  };

  const startScan = () => {
    if (scanningRef.current || !faceDetectedRef.current) return;
    samplesRef.current = [];
    lastFaceBoxRef.current = null;
    scanStartRef.current = performance.now();
    scanElapsedRef.current = 0;
    scanningRef.current = true;
    setScanError(null);
    setScanProgress(0);
    setScanning(true);
  };

  const scanAgain = () => {
    scanTokenRef.current += 1;
    setResult(null);
    setScanError(null);
    setPhase('scan');
  };

  const handleDownloadPng = async () => {
    if (!resultRef.current || !result) return;
    setPngLoading(true);
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(resultRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#0d0d12',
        logging: false,
        onclone: await prepareBrandLogosForExport(),
      });
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `FaceScan-${result.mood.subtitle.replace(/\s+/g, '')}-${reg.name || 'result'}.png`;
      link.click();
    } catch (err) {
      console.warn('Face scan export:', err);
    } finally {
      setPngLoading(false);
    }
  };

  if (phase === 'register') {
    return (
      <PageShell>
        <div className="mx-auto grid max-w-5xl items-center gap-10 pt-4 lg:grid-cols-2 lg:pt-10">
          <section className="text-center lg:text-left">
            <p className="text-[11px] font-bold uppercase tracking-[0.32em]" style={{ color: YELLOW }}>
              MindDojo Gamification
            </p>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight sm:text-5xl">Face Mood Scan</h1>
            <p className="mt-4 text-lg text-white/80 sm:text-xl">สแกนหน้านิ่ง ๆ ของคุณ แล้วดูว่าคุณเป็นคน “หน้าแบบไหน”</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2 lg:justify-start">
              {PREVIEW_EMOJIS.map((emoji) => (
                <span key={emoji} className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl">
                  {emoji}
                </span>
              ))}
            </div>
            <p className="mt-5 text-sm text-white/60">
              ไม่ต้องยิ้ม ไม่ต้องทำหน้า — แค่มองกล้องตามปกติ ระบบจะวัดใบหน้า 478 จุดและกล้ามเนื้อ 52 ตำแหน่ง เช่น มุมปาก คิ้ว และหนังตา
              แล้วบอกว่าหน้านิ่งของคุณดูคล้ายอารมณ์ไหนใน 7 อารมณ์พื้นฐานสากลตามทฤษฎีของ Paul Ekman — สุข เศร้า กลัว โกรธ ประหลาดใจ
              ดูแคลน หรือรังเกียจ ภายใน 3 วินาที
            </p>
          </section>

          <form
            onSubmit={handleRegister}
            className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/40 backdrop-blur-md sm:p-8"
            noValidate
          >
            <h2 className="text-xl font-bold">ลงทะเบียนก่อนเริ่มสแกน</h2>
            <div className="mt-5 space-y-4">
              {(
                [
                  { key: 'name', label: 'ชื่อ-นามสกุล', type: 'text', autoComplete: 'name' },
                  { key: 'company', label: 'บริษัท / องค์กร', type: 'text', autoComplete: 'organization' },
                  { key: 'email', label: 'อีเมล', type: 'email', autoComplete: 'email' },
                ] as const
              ).map(({ key, label, type, autoComplete }) => (
                <label key={key} htmlFor={`face-scan-${key}`} className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/50">{label}</span>
                  <input
                    id={`face-scan-${key}`}
                    type={type}
                    autoComplete={autoComplete}
                    value={reg[key]}
                    onChange={(e) => setReg((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-base text-white outline-none transition placeholder:text-white/30 focus:border-[#FED201] focus:ring-2 focus:ring-[#FED201]/30"
                  />
                </label>
              ))}
            </div>
            <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4">
              <label htmlFor="face-scan-consent" className="flex cursor-pointer items-start gap-3">
                <input
                  id="face-scan-consent"
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => {
                    setConsent(e.target.checked);
                    if (e.target.checked) setRegError(null);
                  }}
                  className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[#FED201]"
                />
                <span className="text-sm leading-relaxed text-white/80">
                  ข้าพเจ้ายินยอมให้ MindDojo เก็บและใช้ข้อมูลใบหน้าที่วัดได้ ร่วมกับชื่อ บริษัท และอีเมล เพื่อแสดงผลเกมนี้
                  ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)
                </span>
              </label>
              <details className="mt-3 pl-8 text-xs leading-relaxed text-white/55">
                <summary className="cursor-pointer font-semibold text-white/70 hover:text-white">อ่านรายละเอียดการเก็บข้อมูล</summary>
                <ul className="mt-2 list-disc space-y-1.5 pl-4">
                  <li>
                    <b className="text-white/75">ข้อมูลที่เก็บ:</b> ชื่อ บริษัท อีเมล ค่าตัวเลขที่วัดจากใบหน้า {FACE_METRIC_IDS.length} ค่า (เช่น ระดับมุมปาก คิ้ว หนังตา)
                    ผลแบบหน้า และคำสรุปจาก AI — <b className="text-white/75">ไม่เก็บรูปภาพหรือวิดีโอใบหน้า</b>
                  </li>
                  <li>
                    <b className="text-white/75">วัตถุประสงค์:</b> ประมวลผลและแสดงผลเกม และใช้ค่าตัวเลขแบบไม่ระบุตัวตนเป็นค่าเฉลี่ยอ้างอิงสำหรับผู้เล่นคนถัดไป
                  </li>
                  <li>
                    <b className="text-white/75">การส่งข้อมูลให้ผู้อื่น:</b> ค่าตัวเลขจากใบหน้า (ไม่มีชื่อ อีเมล หรือรูป) จะถูกส่งให้บริการ AI ของ OpenAI
                    ซึ่งอาจประมวลผลนอกประเทศไทย เพื่อสรุปแบบหน้า
                  </li>
                  <li>
                    <b className="text-white/75">สิทธิ์ของคุณ:</b> ขอเข้าถึง แก้ไข หรือลบข้อมูล และถอนความยินยอมได้ทุกเมื่อ โดยติดต่อผู้จัดกิจกรรม
                    การถอนความยินยอมไม่กระทบการประมวลผลที่ทำไปก่อนหน้า
                  </li>
                  <li>ผลลัพธ์มีไว้เพื่อความสนุก ไม่ใช้ประเมินบุคลิกภาพ การจ้างงาน หรือการตัดสินใจใด ๆ เกี่ยวกับตัวคุณ</li>
                </ul>
              </details>
            </div>
            {regError && <p className="mt-4 text-sm font-semibold text-red-400">{regError}</p>}
            <button
              type="submit"
              disabled={!consent}
              className="mt-6 w-full rounded-full py-3.5 text-base font-bold text-black shadow-lg transition-transform enabled:hover:scale-[1.02] enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              style={{ backgroundColor: YELLOW }}
            >
              เข้าสู่การสแกนใบหน้า
            </button>
            <p className="mt-4 text-center text-xs leading-relaxed text-white/45">
              ระบบวัดใบหน้าบนอุปกรณ์ของคุณ ไม่มีการอัปโหลดหรือบันทึกรูปภาพ — ส่งเฉพาะค่าตัวเลขที่วัดได้ให้ AI สรุปผล
            </p>
          </form>
        </div>
      </PageShell>
    );
  }

  if (phase === 'scan') {
    const ready = cameraStatus === 'ready';
    const statusText = !ready
      ? cameraStatus === 'error'
        ? 'เปิดกล้องไม่สำเร็จ'
        : 'กำลังเปิดกล้องและโหลดระบบวิเคราะห์ใบหน้า...'
      : faceDetected && poseHint
        ? `${poseHint}${scanning ? ' (หยุดสแกนชั่วคราว)' : ''}`
        : scanning
          ? `กำลังสแกน... ${Math.max(0, (SCAN_DURATION_MS / 1000) * (1 - scanProgress)).toFixed(1)} วินาที`
          : faceDetected
            ? 'พบใบหน้าแล้ว พร้อมสแกน'
            : 'ยังไม่พบใบหน้า — หันหน้าเข้ากล้องให้อยู่ในกรอบ';
    const guideColor = faceDetected && poseHint ? '#FB923C' : scanning ? YELLOW : faceDetected ? '#4ADE80' : 'rgba(255,255,255,0.45)';

    return (
      <PageShell>
        <div className="mx-auto max-w-xl text-center">
          <p className="text-sm text-white/60">สวัสดีคุณ {reg.name}</p>
          <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">วางใบหน้าให้อยู่ในกรอบ แล้วกดสแกน</h1>
          <p className="mt-2 text-sm text-white/60">
            ทำหน้าตามปกติ ไม่ต้องยิ้ม มองตรงเข้ากล้องระดับสายตา — ระบบจะวัดโครงหน้าตอนนิ่งของคุณ
          </p>

          <div className="relative mx-auto mt-6 aspect-[3/4] w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-black sm:aspect-[4/3]">
            <video ref={videoRef} playsInline muted className="h-full w-full -scale-x-100 object-cover contrast-110 saturate-[0.8]" />

            <div className="pointer-events-none absolute inset-0" aria-hidden>
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.65)_100%)]" />
              <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(34,211,238,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.18)_1px,transparent_1px)] [background-size:28px_28px]" />
              <div className="absolute inset-0 opacity-30 [background-image:repeating-linear-gradient(0deg,rgba(0,0,0,0.5)_0px,rgba(0,0,0,0.5)_1px,transparent_1px,transparent_3px)]" />
              {(['left-3 top-3 border-l-2 border-t-2', 'right-3 top-3 border-r-2 border-t-2', 'bottom-3 left-3 border-b-2 border-l-2', 'bottom-3 right-3 border-b-2 border-r-2'] as const).map(
                (pos) => (
                  <span key={pos} className={`absolute h-6 w-6 border-cyan-300/80 ${pos}`} />
                ),
              )}
              <span className="absolute left-5 top-4 font-mono text-[10px] font-bold tracking-[0.2em] text-cyan-300/90">BIOMETRIC SENSOR</span>
              <span className="absolute right-5 top-4 flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-[0.2em] text-red-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                LIVE
              </span>
              <span className="absolute bottom-4 left-5 font-mono text-[10px] tracking-[0.2em] text-cyan-300/70">
                {scanning ? 'MODE: MOOD ANALYSIS' : faceDetected ? 'MODE: TRACKING' : 'MODE: SEARCHING'}
              </span>
            </div>

            {!faceDetected && cameraStatus === 'ready' && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div
                  className="h-[72%] w-[56%] animate-pulse rounded-[50%] border-2 border-dashed sm:h-[78%] sm:w-[42%]"
                  style={{ borderColor: guideColor }}
                />
              </div>
            )}

            <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden />

            {cameraStatus === 'loading' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70">
                <span className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-[#FED201]" />
                <p className="text-sm text-white/80">กำลังเตรียมกล้อง...</p>
              </div>
            )}

            {cameraStatus === 'error' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/85 p-6">
                <span className="text-4xl" aria-hidden>
                  📷
                </span>
                <p className="text-sm leading-relaxed text-white/85">{cameraError}</p>
                <button
                  type="button"
                  onClick={() => setCameraAttempt((n) => n + 1)}
                  className="rounded-full px-6 py-2.5 text-sm font-bold text-black"
                  style={{ backgroundColor: YELLOW }}
                >
                  ลองอีกครั้ง
                </button>
              </div>
            )}
          </div>

          <p className="mt-4 text-sm font-semibold" style={{ color: ready && faceDetected ? guideColor : 'rgba(255,255,255,0.75)' }} aria-live="polite">
            {statusText}
          </p>
          <div className="mx-auto mt-3 h-2 max-w-md overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full transition-[width] duration-100" style={{ width: `${scanProgress * 100}%`, backgroundColor: YELLOW }} />
          </div>

          {scanError && <p className="mx-auto mt-4 max-w-md text-sm font-semibold text-red-400">{scanError}</p>}

          <div className="mt-6 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={startScan}
              disabled={!ready || !faceDetected || scanning}
              className="w-full max-w-xs rounded-full py-3.5 text-base font-bold text-black shadow-lg transition-transform enabled:hover:scale-[1.03] enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              style={{ backgroundColor: YELLOW }}
            >
              {scanning ? 'กำลังสแกน...' : 'สแกนใบหน้า'}
            </button>
            <button type="button" onClick={() => setPhase('register')} className="text-sm text-white/55 underline-offset-4 hover:text-white hover:underline">
              แก้ไขข้อมูลลงทะเบียน
            </button>
          </div>
          <p className="mx-auto mt-6 max-w-md text-xs leading-relaxed text-white/40">
            ผลลัพธ์เป็นการวิเคราะห์สีหน้าเพื่อความสนุกเท่านั้น ไม่ได้ใช้ประเมินบุคลิกภาพหรือตัวตนจริงของคุณ
          </p>
        </div>
      </PageShell>
    );
  }

  if (!result) return null;

  const { mood, moodScores, metrics, norms, photo, source, aiSummary, aiTip } = result;
  const pending = source === 'pending';
  const accent = pending ? 'rgba(255,255,255,0.25)' : mood.accent;
  const sortedMoods = [...FACE_MOOD_IDS].sort((a, b) => moodScores[b] - moodScores[a]);
  const levels = metricLevels(metrics, norms);
  const sortedMetrics = [...FACE_METRIC_IDS].sort((a, b) => Math.abs(levels[b] - 0.5) - Math.abs(levels[a] - 0.5)).slice(0, 8);
  const evidence = moodEvidence(mood.id, metrics, norms);
  const scannedDate = new Date(result.scannedAt).toLocaleDateString('th-TH', { dateStyle: 'long' });

  return (
    <PageShell>
      <div className="mx-auto max-w-3xl">
        <div ref={resultRef} className="overflow-hidden rounded-3xl border border-white/10 bg-[#0d0d12] shadow-2xl shadow-black/50">
          <div className="flex items-center justify-between px-6 pt-6 sm:px-8">
            <BrandLogo className="text-[22px]" />
            <span className="text-xs text-white/50">{scannedDate}</span>
          </div>

          <div className="grid items-center gap-6 px-6 pb-8 pt-6 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] sm:px-8">
            <div className="relative mx-auto w-full max-w-[280px]">
              <div className="overflow-hidden rounded-3xl border-4 transition-colors" style={{ borderColor: accent }}>
                {photo ? (
                  <img src={photo} alt="ภาพใบหน้าที่สแกน" className="aspect-square w-full object-cover" />
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center bg-white/5 text-7xl">{pending ? '🤖' : mood.emoji}</div>
                )}
              </div>
              {!pending && (
                <span
                  className="absolute -bottom-4 -right-4 flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-[#0d0d12] text-4xl"
                  style={{ backgroundColor: mood.accent }}
                  aria-hidden
                >
                  {mood.emoji}
                </span>
              )}
            </div>

            <div className="text-center sm:text-left">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/50">Face Mood Scan</p>
              <p className="mt-2 text-sm text-white/70">
                {reg.name} · {reg.company}
              </p>
              {pending ? (
                <div className="mt-6 flex flex-col items-center gap-3 sm:items-start" aria-live="polite">
                  <span className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-[#FED201]" />
                  <p className="text-lg font-bold text-white">AI กำลังสรุปผล...</p>
                  <p className="text-sm leading-relaxed text-white/60">
                    วิเคราะห์ค่าที่วัดได้ {FACE_METRIC_IDS.length} ค่าจากโครงหน้าและกล้ามเนื้อใบหน้าของคุณ เทียบกับคนทั่วไป
                  </p>
                </div>
              ) : (
                <>
                  <p className="mt-4 text-sm text-white/60">หน้านิ่งของคุณดูคล้ายอารมณ์...</p>
                  <h1 className="text-4xl font-extrabold sm:text-5xl" style={{ color: mood.accent }}>
                    {mood.title}
                  </h1>
                  <p className="mt-1 text-sm font-semibold uppercase tracking-[0.2em] text-white/60">{mood.subtitle}</p>
                  {source === 'ai' && aiSummary ? (
                    <div className="mt-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.25em]" style={{ color: mood.accent }}>
                        ✦ AI วิเคราะห์
                      </p>
                      <p className="mt-1 text-[15px] leading-relaxed text-white/85">{aiSummary}</p>
                    </div>
                  ) : (
                    <p className="mt-4 text-[15px] leading-relaxed text-white/85">{mood.description}</p>
                  )}
                  {evidence.length > 0 && (
                    <div className="mt-3 flex flex-wrap justify-center gap-1.5 sm:justify-start">
                      <span className="text-xs text-white/50">วัดได้จาก:</span>
                      {evidence.map(({ id, label }) => (
                        <span key={id} className="rounded-full border px-2.5 py-0.5 text-xs font-semibold" style={{ borderColor: `${mood.accent}80`, color: mood.accent }}>
                          {label}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="mt-3 rounded-2xl bg-white/5 px-4 py-3 text-sm leading-relaxed text-white/70">💡 {aiTip || mood.tip}</p>
                </>
              )}
            </div>
          </div>

          <div className="border-t border-white/10 px-6 py-6 sm:px-8">
            <div className="grid gap-8 sm:grid-cols-2">
              <section>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/50">
                  7 อารมณ์พื้นฐาน (Ekman){source === 'ai' ? ' · สรุปโดย AI' : ''}
                </p>
                <div className={`mt-4 space-y-3 ${pending ? 'animate-pulse opacity-30' : ''}`}>
                  {sortedMoods.map((id) => {
                    const pct = pending ? 0 : Math.round(moodScores[id] * 100);
                    return (
                      <div key={id}>
                        <div className="flex justify-between text-sm">
                          <span className="text-white/80">
                            {FACE_MOODS[id].emoji} {FACE_MOODS[id].title}
                          </span>
                          <span className="font-bold text-white">{pct}%</span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, backgroundColor: id === sortedMoods[0] ? mood.accent : 'rgba(255,255,255,0.45)' }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
              <section>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/50">ค่าที่วัดได้เทียบคนทั่วไป</p>
                <div className="mt-4 space-y-3">
                  {sortedMetrics.map((id) => {
                    const level = levels[id];
                    const high = level >= 0.5;
                    const pct = Math.min(Math.round((high ? level : 1 - level) * 100), 99);
                    return (
                      <div key={id}>
                        <div className="flex justify-between gap-2 text-sm">
                          <span className="text-white/80">{metricLabel(id, level)}</span>
                          <span className="shrink-0 text-xs text-white/60">
                            เด่นกว่า <span className="font-bold text-white">{pct}%</span> ของคน
                          </span>
                        </div>
                        <div className="relative mt-1 h-2 rounded-full bg-white/10">
                          <div
                            className="absolute inset-y-0 rounded-full bg-cyan-400"
                            style={high ? { left: '50%', width: `${(level - 0.5) * 100}%` } : { right: '50%', width: `${(0.5 - level) * 100}%` }}
                          />
                          <div className="absolute -inset-y-0.5 left-1/2 w-0.5 bg-white/70" />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-3 text-[11px] leading-relaxed text-white/40">
                  วัดโครงหน้า 478 จุดจากทุกเฟรมที่หน้าตรงระหว่างสแกน 3 วินาที แล้วเทียบกับคนที่สแกนก่อนหน้าทั้งหมด · เส้นกลาง = คนทั่วไป
                </p>
              </section>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={handleDownloadPng}
            disabled={pngLoading || pending}
            className="rounded-full px-6 py-3 text-sm font-bold text-black shadow-lg transition-transform hover:scale-[1.03] disabled:opacity-60"
            style={{ backgroundColor: YELLOW }}
          >
            {pngLoading ? 'กำลังสร้างรูป...' : 'บันทึกผลเป็นรูปภาพ'}
          </button>
          <button
            type="button"
            onClick={scanAgain}
            className="rounded-full border-2 border-white/80 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white hover:text-black"
          >
            สแกนใหม่
          </button>
          <Link to="/" className="rounded-full border-2 border-white/20 px-6 py-3 text-sm font-bold text-white/80 transition-colors hover:border-white/60 hover:text-white">
            กลับหน้าหลัก
          </Link>
        </div>
      </div>
    </PageShell>
  );
};

export default GameFaceScan;
