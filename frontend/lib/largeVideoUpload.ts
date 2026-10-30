import * as tus from 'tus-js-client';
import { supabase, supabaseAnonKey, supabaseFunctionsUrl } from './supabase';

/** รองรับวิดีโอคุณภาพสูง / ไฟล์ใหญ่ (เช่น 4K, ProRes, MOV) */
export const MAX_VIDEO_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB
export const MAX_VIDEO_LABEL = '5 GB';

/** ใช้ TUS เมื่อไฟล์ใหญ่ — ลดโอกาส timeout ระหว่างอัปโหลด */
const RESUMABLE_THRESHOLD_BYTES = 6 * 1024 * 1024; // 6 MB
const TUS_CHUNK_SIZE = 6 * 1024 * 1024;

const VIDEO_EXTENSIONS = /\.(mp4|m4v|mov|webm|mkv|avi|mpeg|mpg|wmv|3gp|hevc|m2ts|mts)$/i;

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function isAllowedVideoFile(file: File): boolean {
  if (file.type.startsWith('video/')) return true;
  // บางเบราว์เซอร์/ไฟล์ .mov ไม่ส่ง MIME — เช็คนามสกุลแทน
  return VIDEO_EXTENSIONS.test(file.name);
}

export function sanitizeVideoStorageName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

type UploadProgressFn = (percent: number, status: string) => void;

async function getUploadAuthToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || supabaseAnonKey;
}

function uploadSmallFile(
  bucket: string,
  path: string,
  file: File,
  onProgress: UploadProgressFn
): Promise<void> {
  onProgress(20, 'กำลังอัปโหลดไฟล์วิดีโอ...');
  return supabase.storage
    .from(bucket)
    .upload(path, file, {
      contentType: file.type || 'video/mp4',
      cacheControl: '3600',
      upsert: false,
    })
    .then(({ error }) => {
      if (error) throw new Error(error.message);
      onProgress(80, 'อัปโหลดไฟล์สำเร็จ กำลังบันทึกรายละเอียด...');
    });
}

function uploadResumable(
  bucket: string,
  path: string,
  file: File,
  onProgress: UploadProgressFn
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    const token = await getUploadAuthToken();
    const endpoint = `${supabaseFunctionsUrl}/storage/v1/upload/resumable`;

    onProgress(5, 'เริ่มอัปโหลดแบบแบ่งชิ้น (รองรับไฟล์ใหญ่)...');

    const upload = new tus.Upload(file, {
      endpoint,
      retryDelays: [0, 1000, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${token}`,
        apikey: supabaseAnonKey,
        'x-upsert': 'false',
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: TUS_CHUNK_SIZE,
      metadata: {
        bucketName: bucket,
        objectName: path,
        contentType: file.type || 'application/octet-stream',
        cacheControl: '3600',
      },
      onError(error) {
        reject(new Error(error.message || 'อัปโหลดวิดีโอล้มเหลว'));
      },
      onProgress(bytesUploaded, bytesTotal) {
        const raw = bytesTotal > 0 ? (bytesUploaded / bytesTotal) * 100 : 0;
        // เหลือช่วง 80–100 ให้ขั้นบันทึก metadata
        const percent = Math.min(88, Math.max(5, Math.round(raw * 0.88)));
        onProgress(
          percent,
          `กำลังอัปโหลดวิดีโอคุณภาพสูง... ${formatBytes(bytesUploaded)} / ${formatBytes(bytesTotal)}`
        );
      },
      onSuccess() {
        onProgress(90, 'อัปโหลดไฟล์สำเร็จ กำลังบันทึกรายละเอียด...');
        resolve();
      },
    });

    upload.findPreviousUploads().then((previous) => {
      if (previous.length > 0) {
        upload.resumeFromPreviousUpload(previous[0]);
        onProgress(8, 'พบการอัปโหลดค้างไว้ — กำลังทำต่อ...');
      }
      upload.start();
    }).catch(() => {
      upload.start();
    });
  });
}

/** อัปโหลดวิดีโอขึ้น Supabase Storage — ไฟล์ใหญ่ใช้ TUS แบ่งชิ้นอัตโนมัติ */
export async function uploadVideoToBucket(
  bucket: string,
  path: string,
  file: File,
  onProgress: UploadProgressFn = () => undefined
): Promise<void> {
  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error(`วิดีโอใหญ่เกินไป กรุณาใช้ไฟล์ไม่เกิน ${MAX_VIDEO_LABEL}`);
  }
  if (file.size >= RESUMABLE_THRESHOLD_BYTES) {
    await uploadResumable(bucket, path, file, onProgress);
    return;
  }
  await uploadSmallFile(bucket, path, file, onProgress);
}
