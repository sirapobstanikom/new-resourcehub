import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import {
  formatBytes,
  isAllowedVideoFile,
  MAX_VIDEO_BYTES,
  MAX_VIDEO_LABEL,
  sanitizeVideoStorageName,
  uploadVideoToBucket,
} from '../lib/largeVideoUpload';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

const VIDEO_BUCKET = 'innoclub-second-videos';

const BRAND = 'THAI BEVERAGE CAN LIMITED';
const EVENT = 'Amazing Race';

const AYUTTHAYA_HERO = '/images/ayutthaya/wat-chaiwatthanaram.jpg';
const AYUTTHAYA_ATMOSPHERE = '/images/ayutthaya/chaiwatthanaram-wide.jpg';

const UPLOAD_PATH = '/evaluation/tba-amazing-race/videos';
const DASHBOARD_PATH = '/evaluation/tba-amazing-race/videos/dashboard';

type VideoRow = {
  id: number;
  team_name: string;
  title: string;
  description: string | null;
  video_url: string;
  storage_path: string | null;
  file_name: string | null;
  file_size: number | null;
  created_at: string;
};

function PageShell({ children, hero }: { children: React.ReactNode; hero: React.ReactNode }) {
  return (
    <div className="tba-temple-theme relative min-h-screen overflow-x-hidden selection:bg-[#D4AF37] selection:text-[#1C0A0A]">
      <div className="tba-temple-bg pointer-events-none fixed inset-0 -z-10" aria-hidden />
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.18]"
        style={{
          backgroundImage: `url(${AYUTTHAYA_ATMOSPHERE})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        aria-hidden
      />
      <div className="tba-temple-pattern pointer-events-none fixed inset-0 -z-10" aria-hidden />

      {hero}

      <main className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pb-10 sm:pt-8">
        {children}
      </main>
    </div>
  );
}

function SegmentNav({ dashboard }: { dashboard?: boolean }) {
  return (
    <nav className="tba-temple-nav-pill tba-temple-rise-2 mt-5 w-full max-w-sm sm:mt-7" aria-label="สลับหน้าวิดีโอ">
      <Link to={UPLOAD_PATH} className={!dashboard ? 'is-active' : ''}>
        อัปโหลด
      </Link>
      <Link to={DASHBOARD_PATH} className={dashboard ? 'is-active' : ''}>
        คลังวิดีโอ
      </Link>
    </nav>
  );
}

function Hero({ dashboard }: { dashboard?: boolean }) {
  return (
    <section className="relative isolate min-h-[min(62vh,520px)] w-full overflow-hidden sm:min-h-[min(78vh,680px)]">
      <img
        src={AYUTTHAYA_HERO}
        alt="วัดไชยวัฒนาราม อยุธยา"
        className="tba-temple-hero-img absolute inset-0 h-full w-full object-cover object-[center_32%] sm:object-[center_35%]"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(28,10,10,0.58) 0%, rgba(28,10,10,0.32) 36%, rgba(20,8,8,0.78) 72%, rgba(14,6,6,0.98) 100%)',
        }}
        aria-hidden
      />
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background: 'radial-gradient(ellipse 70% 50% at 50% 18%, rgba(212,175,55,0.22), transparent 60%)',
        }}
        aria-hidden
      />

      <header className="relative z-10 border-b border-[#D4AF37]/12 bg-[#1C0A0A]/25 pt-[env(safe-area-inset-top)] backdrop-blur-[2px]">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3.5 sm:px-6 sm:py-4">
          <Link to="/" className="shrink-0">
            <BrandLogo className="text-[20px] sm:text-[24px]" tone="light" />
          </Link>
          <span className="hidden h-4 w-px bg-[#D4AF37]/35 sm:block" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[9px] font-semibold uppercase tracking-[0.18em] text-[#E8D5A3]/85 sm:text-[11px] sm:tracking-[0.22em]">
              {BRAND}
            </p>
            <p className="truncate text-sm font-bold text-[#F7EFE0]">{EVENT}</p>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col justify-end px-4 pb-8 pt-10 sm:px-6 sm:pb-14 sm:pt-20">
        <div className="tba-temple-rise">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#E8D5A3] sm:text-xs sm:tracking-[0.28em]">
            {BRAND}
          </p>
          <h1 className="mt-2.5 max-w-3xl text-[1.85rem] font-black leading-[1.12] tracking-tight text-[#F7EFE0] drop-shadow-[0_2px_24px_rgba(0,0,0,0.45)] sm:mt-3 sm:text-5xl lg:text-6xl">
            {dashboard ? 'คลังวิดีโอผลงาน' : 'อัปโหลดวิดีโอผลงาน'}
          </h1>
          <p className="mt-2 text-base font-semibold text-[#D4AF37] sm:mt-3 sm:text-xl">{EVENT}</p>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-[rgba(247,239,224,0.78)] sm:mt-4 sm:text-base">
            {dashboard
              ? 'รวมวิดีโอจากทีมในกิจกรรม — ชมผลงานและรายละเอียดทั้งหมด'
              : 'อัปโหลดวิดีโอคุณภาพสูงพร้อมรายละเอียด เพื่อรวบรวมไว้ในคลังผลงาน'}
          </p>
        </div>
        <SegmentNav dashboard={dashboard} />
        <div className="tba-temple-rule mt-7 max-w-md sm:mt-10" aria-hidden />
      </div>
    </section>
  );
}

function fieldClass() {
  return 'tba-temple-input w-full rounded-xl px-4 py-3.5 outline-none sm:py-3';
}

function VideoUploadPage() {
  const [teamName, setTeamName] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSubmit = teamName.trim() && title.trim() && file;

  const pickFile = (next: File | null) => {
    setFile(next);
    setError('');
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!canSubmit || !file) {
      setError('กรุณากรอกชื่อทีม ชื่อวิดีโอ และเลือกไฟล์วิดีโอ');
      return;
    }
    if (!isAllowedVideoFile(file)) {
      setError('กรุณาเลือกไฟล์วิดีโอเท่านั้น (เช่น MP4, MOV, WEBM, MKV)');
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setError(`วิดีโอใหญ่เกินไป กรุณาใช้ไฟล์ไม่เกิน ${MAX_VIDEO_LABEL}`);
      return;
    }
    if (!isSupabaseConfigured) {
      setError('ยังไม่ได้ตั้งค่า Supabase กรุณาติดต่อผู้ดูแล');
      return;
    }

    setUploading(true);
    setUploadStatus('กำลังเตรียมไฟล์วิดีโอ...');
    setUploadProgress(5);
    const safeName = sanitizeVideoStorageName(file.name);
    const path = `${Date.now()}-${Math.random().toString(16).slice(2)}-${safeName}`;

    try {
      await uploadVideoToBucket(VIDEO_BUCKET, path, file, (percent, status) => {
        setUploadProgress(percent);
        setUploadStatus(status);
      });

      const { data: publicUrlData } = supabase.storage.from(VIDEO_BUCKET).getPublicUrl(path);
      const { error: insertError } = await supabase.from('innoclub_second_videos').insert({
        team_name: teamName.trim(),
        title: title.trim(),
        description: description.trim() || null,
        video_url: publicUrlData.publicUrl,
        storage_path: path,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || 'video/mp4',
      });

      if (insertError) {
        throw new Error(insertError.message);
      }

      setUploadStatus('อัปโหลดเสร็จสมบูรณ์');
      setUploadProgress(100);
      setUploading(false);
      setTeamName('');
      setTitle('');
      setDescription('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setMessage('อัปโหลดวิดีโอเรียบร้อยแล้ว');
      window.setTimeout(() => {
        setUploadStatus('');
        setUploadProgress(0);
      }, 1200);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setUploading(false);
      setUploadStatus('');
      setUploadProgress(0);
      setError(err instanceof Error ? err.message : 'อัปโหลดวิดีโอไม่สำเร็จ');
    }
  };

  return (
    <PageShell hero={<Hero />}>
      {message && (
        <div className="tba-temple-alert mb-4 rounded-xl border border-emerald-400/30 bg-emerald-950/50 p-3.5 text-sm font-bold text-emerald-200 sm:mb-5 sm:p-4 sm:text-base">
          {message}
        </div>
      )}
      {error && (
        <div className="tba-temple-alert mb-4 rounded-xl border border-red-400/35 bg-red-950/45 p-3.5 text-sm font-bold text-red-200 sm:mb-5 sm:p-4 sm:text-base">
          {error}
        </div>
      )}
      <form onSubmit={submit} className="tba-temple-card tba-temple-rise-delay space-y-4 rounded-2xl p-4 sm:space-y-5 sm:p-7">
        <div className="tba-temple-stagger space-y-4 sm:space-y-5">
          <div>
            <label htmlFor="teamName" className="mb-2 block text-sm font-bold text-[#E8D5A3]">
              ชื่อทีม *
            </label>
            <input
              id="teamName"
              value={teamName}
              onChange={(event) => setTeamName(event.target.value)}
              placeholder="เช่น Team A / ทีม 1"
              autoComplete="organization"
              className={fieldClass()}
            />
          </div>
          <div>
            <label htmlFor="title" className="mb-2 block text-sm font-bold text-[#E8D5A3]">
              ชื่อวิดีโอ *
            </label>
            <input
              id="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="กรอกชื่อวิดีโอ"
              className={fieldClass()}
            />
          </div>
          <div>
            <label htmlFor="description" className="mb-2 block text-sm font-bold text-[#E8D5A3]">
              รายละเอียดวิดีโอ
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              placeholder="เล่ารายละเอียด คอนเซ็ปต์ หรือสิ่งที่อยากให้ผู้ชมรู้"
              className={`${fieldClass()} resize-none`}
            />
          </div>
          <div>
            <p className="mb-2 text-sm font-bold text-[#E8D5A3]">ไฟล์วิดีโอ *</p>
            <label
              htmlFor="video"
              className={`tba-temple-dropzone flex min-h-[7.5rem] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl px-4 py-5 text-center touch-manipulation ${
                file ? 'has-file' : ''
              }`}
            >
              <span className="text-sm font-bold text-[#E8D5A3]">
                {file ? 'เปลี่ยนไฟล์วิดีโอ' : 'แตะเพื่อเลือกไฟล์วิดีโอ'}
              </span>
              <span className="max-w-[20rem] text-xs leading-relaxed text-[rgba(247,239,224,0.5)]">
                MP4 / MOV / WEBM / MKV · สูงสุด {MAX_VIDEO_LABEL}
              </span>
              {file && (
                <span className="mt-1 line-clamp-2 max-w-full break-all text-xs font-semibold text-[#F7EFE0]">
                  {file.name} · {formatBytes(file.size)}
                </span>
              )}
              <input
                ref={fileInputRef}
                id="video"
                type="file"
                accept="video/*,.mp4,.m4v,.mov,.webm,.mkv,.avi,.mpeg,.mpg,.wmv,.hevc,.m2ts,.mts"
                onChange={(event) => pickFile(event.target.files?.[0] || null)}
                className="sr-only"
              />
            </label>
          </div>
        </div>

        {(uploading || uploadStatus) && (
          <div className="tba-temple-alert rounded-xl border border-[#D4AF37]/25 bg-[#140808]/70 p-4">
            <div className="mb-2 flex items-center justify-between gap-3 text-sm font-bold text-[#F7EFE0]">
              <span className="min-w-0 truncate">{uploadStatus || 'กำลังอัปโหลด...'}</span>
              <span className="shrink-0 text-[#D4AF37]">{uploadProgress}%</span>
            </div>
            <div className="tba-temple-progress-bar h-2.5 overflow-hidden rounded-full bg-[#3D1818]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#E8D5A3] to-[#D4AF37] transition-all duration-500 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="tba-temple-pulse mt-2 text-xs text-[rgba(247,239,224,0.45)]">
              กรุณาอย่าปิดหน้านี้ระหว่างอัปโหลดวิดีโอ
            </p>
          </div>
        )}

        <div className="tba-temple-sticky-cta -mx-4 px-4 pt-4 sm:static sm:mx-0 sm:bg-transparent sm:p-0 sm:pt-1">
          <button
            type="submit"
            disabled={uploading || !canSubmit}
            className="tba-temple-btn-gold min-h-[3.25rem] w-full rounded-xl px-8 py-3.5 text-base font-bold transition disabled:cursor-not-allowed touch-manipulation"
          >
            {uploading ? 'กำลังอัปโหลด...' : 'อัปโหลดวิดีโอ'}
          </button>
        </div>
      </form>
    </PageShell>
  );
}

function VideoDashboardPage() {
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const loadVideos = React.useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    setError('');
    const { data, error: loadError } = await supabase
      .from('innoclub_second_videos')
      .select('id, team_name, title, description, video_url, storage_path, file_name, file_size, created_at')
      .order('created_at', { ascending: false });
    setLoading(false);
    if (loadError) {
      setError(loadError.message);
      setVideos([]);
      return;
    }
    setVideos((data as VideoRow[]) || []);
  }, []);

  useEffect(() => {
    loadVideos();
    if (!isSupabaseConfigured) return;
    const channel = supabase
      .channel('innoclub-second-videos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'innoclub_second_videos' }, () => {
        loadVideos();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadVideos]);

  const filteredVideos = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return videos;
    return videos.filter((video) =>
      `${video.team_name} ${video.title} ${video.description || ''}`.toLowerCase().includes(keyword)
    );
  }, [search, videos]);

  const deleteVideo = async (video: VideoRow) => {
    if (!window.confirm(`ลบวิดีโอ "${video.title}" ทั้งชุด?`)) return;
    setError('');
    setDeletingId(video.id);

    if (video.storage_path) {
      const { error: storageError } = await supabase.storage.from(VIDEO_BUCKET).remove([video.storage_path]);
      if (storageError) {
        setDeletingId(null);
        setError(storageError.message);
        return;
      }
    }

    const { error: deleteError } = await supabase.from('innoclub_second_videos').delete().eq('id', video.id);
    setDeletingId(null);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setVideos((prev) => prev.filter((item) => item.id !== video.id));
  };

  return (
    <PageShell hero={<Hero dashboard />}>
      {error && (
        <div className="tba-temple-alert mb-4 rounded-xl border border-red-400/35 bg-red-950/45 p-3.5 text-sm font-bold text-red-200 sm:mb-5 sm:p-4 sm:text-base">
          {error}
        </div>
      )}
      <section className="tba-temple-rise-delay sticky top-0 z-20 -mx-4 mb-4 space-y-3 bg-[linear-gradient(180deg,rgba(14,6,6,0.96),rgba(14,6,6,0.88)_85%,transparent)] px-4 pb-3 pt-1 backdrop-blur-sm sm:static sm:mx-0 sm:mb-6 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <div className="grid gap-2.5 sm:grid-cols-[1fr_auto] sm:gap-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ค้นหาชื่อทีม / ชื่อวิดีโอ"
            inputMode="search"
            className={fieldClass()}
          />
          <button
            type="button"
            onClick={loadVideos}
            className="tba-temple-btn-gold min-h-[3rem] rounded-xl px-5 py-3 font-bold transition touch-manipulation"
          >
            รีเฟรช
          </button>
        </div>
        <p className="text-sm text-[rgba(247,239,224,0.55)]">
          ทั้งหมด <span className="font-bold text-[#E8D5A3]">{videos.length}</span>
          {search.trim() ? (
            <>
              {' '}
              · แสดง <span className="font-bold text-[#D4AF37]">{filteredVideos.length}</span>
            </>
          ) : null}
        </p>
      </section>

      {loading ? (
        <div className="tba-temple-card rounded-2xl p-8 text-center text-[#E8D5A3]">
          <span className="tba-temple-pulse inline-block">กำลังโหลดวิดีโอ...</span>
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="tba-temple-card rounded-2xl p-8 text-center text-[rgba(247,239,224,0.55)]">ยังไม่มีวิดีโอ</div>
      ) : (
        <div className="tba-temple-stagger grid gap-4 sm:gap-5 lg:grid-cols-2">
          {filteredVideos.map((video) => (
            <article key={video.id} className="tba-temple-card tba-temple-card-hover overflow-hidden rounded-2xl">
              <video
                src={video.video_url}
                controls
                playsInline
                preload="metadata"
                className="aspect-video w-full bg-black object-contain"
              />
              <div className="space-y-3 p-4 sm:p-5">
                <div>
                  <p className="text-sm font-bold text-[#D4AF37]">{video.team_name}</p>
                  <h2 className="mt-0.5 text-lg font-black leading-snug text-[#F7EFE0] sm:text-2xl">{video.title}</h2>
                </div>
                {video.description && (
                  <p className="text-sm leading-relaxed text-[rgba(247,239,224,0.62)]">{video.description}</p>
                )}
                <div className="flex flex-wrap gap-2 text-[11px] text-[rgba(247,239,224,0.4)] sm:text-xs">
                  <span>{new Date(video.created_at).toLocaleString('th-TH')}</span>
                  {video.file_size != null && <span>{(video.file_size / 1024 / 1024).toFixed(1)} MB</span>}
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <a
                    href={video.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tba-temple-btn-outline flex min-h-[2.75rem] items-center justify-center rounded-xl px-3 py-2 text-sm font-bold touch-manipulation"
                  >
                    เปิดวิดีโอ
                  </a>
                  <button
                    type="button"
                    onClick={() => deleteVideo(video)}
                    disabled={deletingId === video.id}
                    className="flex min-h-[2.75rem] items-center justify-center rounded-xl border border-red-400/40 bg-red-950/40 px-3 py-2 text-sm font-bold text-red-200 transition hover:bg-red-900/50 disabled:cursor-not-allowed disabled:opacity-60 touch-manipulation"
                  >
                    {deletingId === video.id ? 'กำลังลบ...' : 'ลบวิดีโอ'}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </PageShell>
  );
}

const InnoClubSecondVideoPage: React.FC = () => {
  const location = useLocation();
  return location.pathname.endsWith('/dashboard') ? <VideoDashboardPage /> : <VideoUploadPage />;
};

export default InnoClubSecondVideoPage;
