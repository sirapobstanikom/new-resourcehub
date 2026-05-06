import React, { useEffect, useRef, useState } from 'react';

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`โหลดสคริปต์ไม่สำเร็จ: ${src}`)), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      resolve();
    });
    script.addEventListener('error', () => reject(new Error(`โหลดสคริปต์ไม่สำเร็จ: ${src}`)));
    document.head.appendChild(script);
  });
}

const GameAr: React.FC = () => {
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [ready, setReady] = useState(false);
  const [bootingAr, setBootingAr] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('ยังไม่ได้เริ่ม');
  const prevBodyMarginRef = useRef<string | null>(null);
  const prevBodyOverflowRef = useRef<string | null>(null);

  const startAr = async () => {
    try {
      setBootingAr(true);
      setError(null);
      setStatus('กำลังขอสิทธิ์กล้อง...');

      if (!window.isSecureContext) {
        throw new Error('เปิดกล้องไม่ได้: ต้องเปิดผ่าน https หรือ http://localhost เท่านั้น');
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('เบราว์เซอร์นี้ไม่รองรับการเปิดกล้องผ่าน WebRTC');
      }

      // ขอ permission ก่อน แล้วคืนกล้องให้ AR.js ไปเปิดใหม่
      const probeStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      probeStream.getTracks().forEach((t) => t.stop());

      if (prevBodyMarginRef.current == null) prevBodyMarginRef.current = document.body.style.margin;
      if (prevBodyOverflowRef.current == null) prevBodyOverflowRef.current = document.body.style.overflow;
      document.body.style.margin = '0';
      document.body.style.overflow = 'hidden';

      setStatus('กำลังโหลด A-Frame/AR.js...');
      await loadScript('https://aframe.io/releases/1.4.2/aframe.min.js');
      await loadScript('https://cdn.jsdelivr.net/gh/AR-js-org/AR.js/aframe/build/aframe-ar.min.js');
      setScriptsLoaded(true);

      setStatus('กำลังเริ่ม AR...');
      window.setTimeout(() => {
        setReady(true);
        setBootingAr(false);
        setStatus('กล้องพร้อมแล้ว: ส่อง marker hiro ได้เลย');
      }, 300);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'ไม่สามารถเปิด AR ได้';
      setError(`${msg} (ตรวจสอบสิทธิ์กล้องใน browser settings แล้วลองใหม่)`);
      setStatus('เปิดกล้องไม่สำเร็จ');
      setBootingAr(false);
    }
  };

  useEffect(() => {
    return () => {
      if (prevBodyMarginRef.current != null) {
        document.body.style.margin = prevBodyMarginRef.current;
      }
      if (prevBodyOverflowRef.current != null) {
        document.body.style.overflow = prevBodyOverflowRef.current;
      }
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const scene = document.querySelector('a-scene');
    if (!scene) return;
    const onCameraInit = () => setStatus('กล้องพร้อมแล้ว: ส่อง marker hiro ได้เลย');
    const onCameraError = () => setStatus('กล้องมีปัญหา: ตรวจสิทธิ์ camera ใน browser');
    scene.addEventListener('camera-init', onCameraInit as EventListener);
    scene.addEventListener('camera-error', onCameraError as EventListener);
    return () => {
      scene.removeEventListener('camera-init', onCameraInit as EventListener);
      scene.removeEventListener('camera-error', onCameraError as EventListener);
    };
  }, [ready]);

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6 text-center">
        <div className="space-y-3">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setScriptsLoaded(false);
              setReady(false);
              setBootingAr(false);
              setStatus('ยังไม่ได้เริ่ม');
              void startAr();
            }}
            className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 hover:bg-white/20"
          >
            ลองใหม่
          </button>
        </div>
      </div>
    );
  }

  if (!ready && !bootingAr && !scriptsLoaded && status === 'ยังไม่ได้เริ่ม') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="text-center space-y-4">
          <p className="text-zinc-300">กดเริ่มเพื่อเปิดกล้อง AR บนคอม</p>
          <button
            type="button"
            onClick={() => {
              void startAr();
            }}
            className="px-5 py-2.5 rounded-lg bg-yellow-400 text-black font-semibold hover:bg-yellow-300"
          >
            เริ่มกล้อง AR
          </button>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p>{status}</p>
        {bootingAr || !scriptsLoaded ? (
          <p className="text-xs text-zinc-400">กรุณารอสักครู่...</p>
        ) : null}
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, margin: 0, padding: 0, background: '#000' }}>
      <div style={{ position: 'fixed', top: 8, left: 8, zIndex: 20, color: 'white', background: 'rgba(0,0,0,0.45)', padding: '6px 10px', borderRadius: 8, fontSize: 12 }}>
        {status}
      </div>
      {React.createElement(
        'a-scene',
        {
          embedded: true,
          'vr-mode-ui': 'enabled: false',
          renderer: 'logarithmicDepthBuffer: true; antialias: true;',
          arjs: 'trackingMethod: best; sourceType: webcam; sourceWidth:1280; sourceHeight:720; debugUIEnabled: true;',
          style: { width: '100%', height: '100%' },
        },
        React.createElement(
          'a-marker',
          { preset: 'hiro' },
          React.createElement('a-box', { position: '0 0.5 0', material: 'color: red;' }),
        ),
        React.createElement('a-entity', { camera: true }),
      )}
    </div>
  );
};

export default GameAr;
