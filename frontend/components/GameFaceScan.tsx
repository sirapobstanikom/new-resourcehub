import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import BrandLogo, { prepareBrandLogosForExport } from './BrandLogo';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  FACE_EXPRESSION_KEYS,
  FACE_MOOD_IDS,
  FACE_MOODS,
  averageExpressionScores,
  calculateMoodScores,
  classifyFaceMood,
  emptyExpressionScores,
  type FaceExpressionScores,
  type FaceMood,
  type FaceMoodScores,
} from '../lib/faceMoodData';
import { buildMeshEdges, drawFaceHud, withForeheadPoints, type HudPoint } from '../lib/faceScanHud';

type FaceApi = typeof import('@vladmandic/face-api');
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
  expressions: FaceExpressionScores;
  photo: string;
  scannedAt: string;
}

const REGISTRATION_KEY = 'minddojo.face_scan.registration';
const MODEL_URL = `${import.meta.env.BASE_URL}models/face-api`;
const SCAN_DURATION_MS = 3000;
const MIN_FACE_SAMPLES = 4;
const YELLOW = '#FED201';
const EMPTY_REG: Registration = { name: '', company: '', email: '' };
const PREVIEW_EMOJIS = FACE_MOOD_IDS.map((id) => FACE_MOODS[id].emoji);

let faceApiPromise: Promise<FaceApi> | null = null;

const loadFaceApi = (): Promise<FaceApi> => {
  faceApiPromise ??= (async () => {
    const faceapi = await import('@vladmandic/face-api');
    await (faceapi.tf as unknown as { ready: () => Promise<void> }).ready();
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
    ]);
    return faceapi;
  })().catch((err) => {
    faceApiPromise = null;
    throw err;
  });
  return faceApiPromise;
};

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
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('loading');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraAttempt, setCameraAttempt] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanError, setScanError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [pngLoading, setPngLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const scanningRef = useRef(false);
  const scanStartRef = useRef(0);
  const samplesRef = useRef<FaceExpressionScores[]>([]);
  const faceDetectedRef = useRef(false);
  const lastFaceBoxRef = useRef<FaceBox | null>(null);
  const finishScanRef = useRef<() => void>(() => {});
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const hudTargetRef = useRef<{ points: HudPoint[]; confidence: number; seenAt: number } | null>(null);
  const liveMoodRef = useRef<FaceMoodScores | null>(null);

  const saveResult = async (scan: ScanResult, sampleCount: number) => {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.from('face_scan_results').insert({
      name: reg.name,
      company: reg.company,
      email: reg.email,
      mood_id: scan.mood.id,
      mood_title: scan.mood.title,
      mood_scores: scan.moodScores,
      expressions: scan.expressions,
      sample_count: sampleCount,
      scanned_at: scan.scannedAt,
    });
    if (error) console.warn('Face scan save to DB:', error.message);
  };

  finishScanRef.current = () => {
    scanningRef.current = false;
    setScanning(false);
    setScanProgress(0);
    const samples = samplesRef.current;
    const video = videoRef.current;
    if (samples.length < MIN_FACE_SAMPLES || !video) {
      setScanError('มองไม่เห็นใบหน้าชัดเจน ลองหันหน้าเข้ากล้องในที่ที่มีแสงสว่าง แล้วสแกนใหม่');
      return;
    }
    const moodScores = calculateMoodScores(samples);
    const scan: ScanResult = {
      mood: classifyFaceMood(moodScores),
      moodScores,
      expressions: averageExpressionScores(samples),
      photo: capturePhoto(video, lastFaceBoxRef.current),
      scannedAt: new Date().toISOString(),
    };
    setResult(scan);
    setPhase('result');
    void saveResult(scan, samples.length);
  };

  useEffect(() => {
    if (phase !== 'scan') return;
    const session = { active: true };
    let stream: MediaStream | null = null;
    let timer: number | undefined;
    let frameId: number | undefined;
    hudTargetRef.current = null;
    liveMoodRef.current = null;

    setCameraStatus('loading');
    setCameraError(null);
    setFaceDetected(false);
    faceDetectedRef.current = false;

    const detectLoop = async (faceapi: FaceApi, video: HTMLVideoElement) => {
      const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
      const tick = async () => {
        if (!session.active) return;
        if (video.readyState >= 2) {
          const detection = await faceapi.detectSingleFace(video, options).withFaceLandmarks(true).withFaceExpressions();
          if (!session.active) return;
          const found = Boolean(detection);
          if (found !== faceDetectedRef.current) {
            faceDetectedRef.current = found;
            setFaceDetected(found);
          }
          if (detection) {
            hudTargetRef.current = {
              points: withForeheadPoints(detection.landmarks.positions.map(({ x, y }) => ({ x, y }))),
              confidence: detection.detection.score,
              seenAt: performance.now(),
            };
          }
          if (scanningRef.current) {
            if (detection) {
              const { x, y, width, height } = detection.detection.box;
              lastFaceBoxRef.current = { x, y, width, height };
              const sample = emptyExpressionScores();
              for (const key of FACE_EXPRESSION_KEYS) sample[key] = detection.expressions[key];
              samplesRef.current.push(sample);
              liveMoodRef.current = calculateMoodScores(samplesRef.current.slice(-8));
            }
            const progress = Math.min((performance.now() - scanStartRef.current) / SCAN_DURATION_MS, 1);
            setScanProgress(progress);
            if (progress >= 1) {
              finishScanRef.current();
              return;
            }
          }
        }
        timer = window.setTimeout(tick, 60);
      };
      await tick();
    };

    const drawLoop = (video: HTMLVideoElement) => {
      let smoothed: HudPoint[] | null = null;
      let edges: ReturnType<typeof buildMeshEdges> | null = null;
      const draw = (now: number) => {
        if (!session.active) return;
        frameId = requestAnimationFrame(draw);
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

        const target = hudTargetRef.current;
        if (!target || now - target.seenAt > 500 || !video.videoWidth) {
          smoothed = null;
          return;
        }
        smoothed = smoothed
          ? smoothed.map((p, i) => ({ x: p.x + (target.points[i].x - p.x) * 0.35, y: p.y + (target.points[i].y - p.y) * 0.35 }))
          : target.points;
        edges ??= buildMeshEdges(target.points);

        const scale = Math.max(cw / video.videoWidth, ch / video.videoHeight);
        const offsetX = (cw - video.videoWidth * scale) / 2;
        const offsetY = (ch - video.videoHeight * scale) / 2;
        const points = smoothed.map((p) => ({ x: cw - (offsetX + p.x * scale), y: offsetY + p.y * scale }));

        const scanning = scanningRef.current;
        const live = liveMoodRef.current;
        drawFaceHud(
          ctx,
          cw,
          ch,
          {
            points,
            confidence: target.confidence,
            scanning,
            progress: scanning ? Math.min((now - scanStartRef.current) / SCAN_DURATION_MS, 1) : 0,
            readouts:
              scanning && live
                ? [...FACE_MOOD_IDS]
                    .sort((a, b) => live[b] - live[a])
                    .slice(0, 3)
                    .map((id) => ({ label: `${FACE_MOODS[id].emoji} ${FACE_MOODS[id].title}`, value: live[id] }))
                : [],
            time: now,
          },
          edges,
        );
      };
      frameId = requestAnimationFrame(draw);
    };

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');
        const [faceapi, media] = await Promise.all([
          loadFaceApi(),
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
        void detectLoop(faceapi, video);
        drawLoop(video);
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
      window.clearTimeout(timer);
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
    setReg(trimmed);
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
    liveMoodRef.current = null;
    scanStartRef.current = performance.now();
    scanningRef.current = true;
    setScanError(null);
    setScanProgress(0);
    setScanning(true);
  };

  const scanAgain = () => {
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
              ไม่ต้องยิ้ม ไม่ต้องทำหน้า — แค่มองกล้องตามปกติ AI จะอ่านแนวโน้มจากหน้านิ่งของคุณว่าไปทางใจดี ดุ เศร้า ซึม ตื่นเต้น กังวล
              หรือเบื่อโลก ภายใน 3 วินาที
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
            {regError && <p className="mt-4 text-sm font-semibold text-red-400">{regError}</p>}
            <button
              type="submit"
              className="mt-6 w-full rounded-full py-3.5 text-base font-bold text-black shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
              style={{ backgroundColor: YELLOW }}
            >
              เข้าสู่การสแกนใบหน้า
            </button>
            <p className="mt-4 text-center text-xs leading-relaxed text-white/45">
              ระบบวิเคราะห์ใบหน้าบนอุปกรณ์ของคุณเท่านั้น ไม่มีการอัปโหลดหรือบันทึกรูปภาพ
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
      : scanning
        ? `กำลังสแกน... ${Math.max(0, (SCAN_DURATION_MS / 1000) * (1 - scanProgress)).toFixed(1)} วินาที`
        : faceDetected
          ? 'พบใบหน้าแล้ว พร้อมสแกน'
          : 'ยังไม่พบใบหน้า — หันหน้าเข้ากล้องให้อยู่ในกรอบ';
    const guideColor = scanning ? YELLOW : faceDetected ? '#4ADE80' : 'rgba(255,255,255,0.45)';

    return (
      <PageShell>
        <div className="mx-auto max-w-xl text-center">
          <p className="text-sm text-white/60">สวัสดีคุณ {reg.name}</p>
          <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">วางใบหน้าให้อยู่ในกรอบ แล้วกดสแกน</h1>
          <p className="mt-2 text-sm text-white/60">ทำหน้าตามปกติ ไม่ต้องยิ้ม — ระบบจะอ่านแนวโน้มจากหน้านิ่งของคุณ</p>

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

  const { mood, moodScores, expressions, photo } = result;
  const sortedMoods = [...FACE_MOOD_IDS].sort((a, b) => moodScores[b] - moodScores[a]);
  const stillness = Math.round(expressions.neutral * 100);
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
              <div className="overflow-hidden rounded-3xl border-4" style={{ borderColor: mood.accent }}>
                {photo ? (
                  <img src={photo} alt="ภาพใบหน้าที่สแกน" className="aspect-square w-full object-cover" />
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center bg-white/5 text-7xl">{mood.emoji}</div>
                )}
              </div>
              <span
                className="absolute -bottom-4 -right-4 flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-[#0d0d12] text-4xl"
                style={{ backgroundColor: mood.accent }}
                aria-hidden
              >
                {mood.emoji}
              </span>
            </div>

            <div className="text-center sm:text-left">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/50">Face Mood Scan</p>
              <p className="mt-2 text-sm text-white/70">
                {reg.name} · {reg.company}
              </p>
              <p className="mt-4 text-sm text-white/60">ใบหน้าของคุณมีแนวโน้มเป็น...</p>
              <h1 className="text-4xl font-extrabold sm:text-5xl" style={{ color: mood.accent }}>
                {mood.title}
              </h1>
              <p className="mt-1 text-sm font-semibold uppercase tracking-[0.2em] text-white/60">{mood.subtitle}</p>
              <p className="mt-4 text-[15px] leading-relaxed text-white/85">{mood.description}</p>
              <p className="mt-3 rounded-2xl bg-white/5 px-4 py-3 text-sm leading-relaxed text-white/70">💡 {mood.tip}</p>
            </div>
          </div>

          <div className="border-t border-white/10 px-6 py-6 sm:px-8">
            <p className="text-center text-xs font-bold uppercase tracking-[0.3em] text-white/50">แนวโน้มของใบหน้า</p>
            <p className="mt-1 text-center text-xs text-white/40">ความนิ่งของใบหน้าขณะสแกน {stillness}%</p>
            <div className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
              {sortedMoods.map((id) => {
                const pct = Math.round(moodScores[id] * 100);
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
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={handleDownloadPng}
            disabled={pngLoading}
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
