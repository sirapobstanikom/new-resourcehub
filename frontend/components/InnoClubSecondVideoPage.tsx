import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

const VIDEO_BUCKET = 'innoclub-second-videos';
const MAX_VIDEO_BYTES = 250 * 1024 * 1024;

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

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#090201] text-white selection:bg-yellow-300 selection:text-black innoclub-angsana">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_30%_0%,rgba(250,204,21,0.2),transparent_35%),linear-gradient(180deg,rgba(84,13,8,0.42),rgba(0,0,0,0.92))]" />
      <header className="relative z-10 border-b border-yellow-200/20 bg-black/35 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <Link to="/evaluation/innoclub-2" className="text-sm font-bold text-yellow-100/80 hover:text-yellow-100">
            กลับหน้า InnoClub-2
          </Link>
          <div className="rounded-xl border border-yellow-200/25 bg-[#160503]/80 px-3 py-2 text-sm font-black text-yellow-100">
            INNO CLUB VIDEO
          </div>
        </div>
      </header>
      <main className="relative z-10 mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-14">
        {children}
      </main>
    </div>
  );
}

function Hero({ dashboard }: { dashboard?: boolean }) {
  return (
    <section className="mb-7 overflow-hidden rounded-[2rem] border border-yellow-200/25 bg-[linear-gradient(145deg,rgba(49,8,5,0.92),rgba(12,2,1,0.96))] p-6 text-center shadow-[0_24px_90px_rgba(0,0,0,0.52)] sm:p-9">
      <p className="text-xs font-black uppercase tracking-[0.28em] text-yellow-100/80">
        PTT GROUP INNO CLUB
      </p>
      <h1 className="mt-3 text-4xl font-black leading-tight text-[#fff3cf] sm:text-6xl">
        {dashboard ? 'Video Upload Dashboard' : 'อัปโหลดวิดีโอ'}
      </h1>
      <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-yellow-50/75 sm:text-base">
        {dashboard
          ? 'ดูวิดีโอและรายละเอียดทั้งหมดที่ผู้เข้าร่วมอัปโหลด'
          : 'อัปโหลดวิดีโอผลงาน พร้อมกรอกรายละเอียดเพื่อรวบรวมไว้ใน Dashboard'}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <Link
          to="/evaluation/innoclub-2/videos"
          className="rounded-full border border-yellow-200/30 bg-black/35 px-4 py-2 text-sm font-black text-yellow-100 hover:bg-yellow-100/10"
        >
          หน้าอัปโหลด
        </Link>
        <Link
          to="/evaluation/innoclub-2/videos/dashboard"
          className="rounded-full bg-gradient-to-r from-yellow-100 via-amber-300 to-yellow-600 px-4 py-2 text-sm font-black text-black hover:from-white hover:to-amber-400"
        >
          Dashboard
        </Link>
      </div>
    </section>
  );
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

  const canSubmit = teamName.trim() && title.trim() && file;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!canSubmit || !file) {
      setError('กรุณากรอกชื่อทีม ชื่อวิดีโอ และเลือกไฟล์วิดีโอ');
      return;
    }
    if (!file.type.startsWith('video/')) {
      setError('กรุณาเลือกไฟล์วิดีโอเท่านั้น');
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setError('วิดีโอใหญ่เกินไป กรุณาใช้ไฟล์ไม่เกิน 250MB');
      return;
    }
    if (!isSupabaseConfigured) {
      setError('ยังไม่ได้ตั้งค่า Supabase กรุณาติดต่อผู้ดูแล');
      return;
    }

    setUploading(true);
    setUploadStatus('กำลังเตรียมไฟล์วิดีโอ...');
    setUploadProgress(12);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${Date.now()}-${Math.random().toString(16).slice(2)}-${safeName}`;
    setUploadStatus('กำลังอัปโหลดไฟล์วิดีโอ...');
    setUploadProgress(35);
    const { error: uploadError } = await supabase.storage.from(VIDEO_BUCKET).upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

    if (uploadError) {
      setUploading(false);
      setUploadStatus('');
      setUploadProgress(0);
      setError(uploadError.message);
      return;
    }

    setUploadStatus('อัปโหลดไฟล์สำเร็จ กำลังบันทึกรายละเอียด...');
    setUploadProgress(82);
    const { data: publicUrlData } = supabase.storage.from(VIDEO_BUCKET).getPublicUrl(path);
    const { error: insertError } = await supabase.from('innoclub_second_videos').insert({
      team_name: teamName.trim(),
      title: title.trim(),
      description: description.trim() || null,
      video_url: publicUrlData.publicUrl,
      storage_path: path,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
    });

    if (insertError) {
      setUploading(false);
      setUploadStatus('');
      setUploadProgress(0);
      setError(insertError.message);
      return;
    }

    setUploadStatus('อัปโหลดเสร็จสมบูรณ์');
    setUploadProgress(100);
    setUploading(false);
    setTeamName('');
    setTitle('');
    setDescription('');
    setFile(null);
    setMessage('อัปโหลดวิดีโอเรียบร้อยแล้ว');
    window.setTimeout(() => {
      setUploadStatus('');
      setUploadProgress(0);
    }, 1200);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <PageShell>
      <Hero />
      {message && <div className="mb-5 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 font-bold text-emerald-100">{message}</div>}
      {error && <div className="mb-5 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 font-bold text-red-200">{error}</div>}
      <form onSubmit={submit} className="space-y-5 rounded-[2rem] border border-yellow-200/20 bg-black/45 p-5 shadow-[0_18px_55px_rgba(0,0,0,0.38)] sm:p-7">
        <div>
          <label htmlFor="teamName" className="mb-2 block text-sm font-black text-yellow-100">
            ชื่อทีม *
          </label>
          <input
            id="teamName"
            value={teamName}
            onChange={(event) => setTeamName(event.target.value)}
            placeholder="เช่น Team A / ทีม 1"
            className="w-full rounded-2xl border border-yellow-200/20 bg-black/45 px-4 py-3 text-yellow-50 outline-none placeholder:text-yellow-100/35 focus:border-yellow-300"
          />
        </div>
        <div>
          <label htmlFor="title" className="mb-2 block text-sm font-black text-yellow-100">
            ชื่อวิดีโอ *
          </label>
          <input
            id="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="กรอกชื่อวิดีโอ"
            className="w-full rounded-2xl border border-yellow-200/20 bg-black/45 px-4 py-3 text-yellow-50 outline-none placeholder:text-yellow-100/35 focus:border-yellow-300"
          />
        </div>
        <div>
          <label htmlFor="description" className="mb-2 block text-sm font-black text-yellow-100">
            รายละเอียดวิดีโอ
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            placeholder="เล่ารายละเอียด คอนเซ็ปต์ หรือสิ่งที่อยากให้ผู้ชมรู้"
            className="w-full resize-none rounded-2xl border border-yellow-200/20 bg-black/45 px-4 py-3 text-yellow-50 outline-none placeholder:text-yellow-100/35 focus:border-yellow-300"
          />
        </div>
        <div>
          <label htmlFor="video" className="mb-2 block text-sm font-black text-yellow-100">
            ไฟล์วิดีโอ *
          </label>
          <input
            id="video"
            type="file"
            accept="video/*"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            className="w-full rounded-2xl border border-yellow-200/20 bg-black/45 px-4 py-3 text-yellow-50 file:mr-4 file:rounded-full file:border-0 file:bg-yellow-400 file:px-4 file:py-2 file:font-black file:text-black"
          />
          <p className="mt-2 text-xs text-yellow-100/55">รองรับวิดีโอทั่วไป ขนาดไม่เกิน 250MB</p>
        </div>
        {(uploading || uploadStatus) && (
          <div className="rounded-2xl border border-yellow-200/20 bg-black/35 p-4">
            <div className="mb-2 flex items-center justify-between gap-3 text-sm font-bold text-yellow-100">
              <span>{uploadStatus || 'กำลังอัปโหลด...'}</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-yellow-100 via-amber-300 to-yellow-600 transition-all duration-500"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-yellow-100/55">
              กรุณาอย่าปิดหน้านี้ระหว่างอัปโหลดวิดีโอ
            </p>
          </div>
        )}
        <button
          type="submit"
          disabled={uploading || !canSubmit}
          className="w-full rounded-full bg-gradient-to-r from-yellow-100 via-amber-300 to-yellow-600 px-8 py-4 text-base font-black text-black shadow-[0_16px_40px_rgba(250,204,21,0.28)] hover:from-white hover:to-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? 'กำลังอัปโหลด...' : 'อัปโหลดวิดีโอ'}
        </button>
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

    const { error: deleteError } = await supabase
      .from('innoclub_second_videos')
      .delete()
      .eq('id', video.id);
    setDeletingId(null);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setVideos((prev) => prev.filter((item) => item.id !== video.id));
  };

  return (
    <PageShell>
      <Hero dashboard />
      {error && <div className="mb-5 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 font-bold text-red-200">{error}</div>}
      <section className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto]">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="ค้นหาชื่อทีม / ชื่อวิดีโอ / รายละเอียด"
          className="rounded-2xl border border-yellow-200/20 bg-black/45 px-4 py-3 text-yellow-50 outline-none placeholder:text-yellow-100/35 focus:border-yellow-300"
        />
        <button
          type="button"
          onClick={loadVideos}
          className="rounded-2xl bg-yellow-400 px-5 py-3 font-black text-black hover:bg-yellow-300"
        >
          รีเฟรช
        </button>
      </section>
      <section className="mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-3xl border border-yellow-200/20 bg-black/45 p-5">
          <p className="text-xs font-bold text-yellow-100/55">จำนวนวิดีโอทั้งหมด</p>
          <p className="mt-2 text-3xl font-black text-yellow-300">{videos.length}</p>
        </div>
        <div className="rounded-3xl border border-yellow-200/20 bg-black/45 p-5">
          <p className="text-xs font-bold text-yellow-100/55">แสดงผลตอนนี้</p>
          <p className="mt-2 text-3xl font-black text-yellow-300">{filteredVideos.length}</p>
        </div>
      </section>
      {loading ? (
        <div className="rounded-3xl border border-yellow-200/20 bg-black/45 p-8 text-center text-yellow-100">กำลังโหลดวิดีโอ...</div>
      ) : filteredVideos.length === 0 ? (
        <div className="rounded-3xl border border-yellow-200/20 bg-black/45 p-8 text-center text-yellow-100">ยังไม่มีวิดีโอ</div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {filteredVideos.map((video) => (
            <article key={video.id} className="overflow-hidden rounded-[2rem] border border-yellow-200/20 bg-black/50 shadow-[0_18px_55px_rgba(0,0,0,0.35)]">
              <video src={video.video_url} controls preload="metadata" className="aspect-video w-full bg-black object-contain" />
              <div className="space-y-3 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-yellow-300">{video.team_name}</p>
                    <h2 className="text-2xl font-black text-yellow-50">{video.title}</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={video.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-yellow-200/30 px-3 py-1 text-xs font-black text-yellow-100 hover:bg-yellow-100/10"
                    >
                      เปิดวิดีโอ
                    </a>
                    <button
                      type="button"
                      onClick={() => deleteVideo(video)}
                      disabled={deletingId === video.id}
                      className="rounded-full border border-red-400/35 bg-red-500/10 px-3 py-1 text-xs font-black text-red-200 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingId === video.id ? 'กำลังลบ...' : 'ลบวิดีโอ'}
                    </button>
                  </div>
                </div>
                {video.description && <p className="text-sm leading-relaxed text-yellow-50/75">{video.description}</p>}
                <div className="flex flex-wrap gap-2 text-xs text-yellow-100/55">
                  <span>{new Date(video.created_at).toLocaleString('th-TH')}</span>
                  {video.file_name && <span>ไฟล์: {video.file_name}</span>}
                  {video.file_size != null && <span>{(video.file_size / 1024 / 1024).toFixed(1)} MB</span>}
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
