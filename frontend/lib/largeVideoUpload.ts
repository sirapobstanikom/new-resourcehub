import * as tus from 'tus-js-client';
import { supabase, supabaseAnonKey, supabaseFunctionsUrl } from './supabase';

/** รองรับวิดีโอคุณภาพสูง / ไฟล์ใหญ่ (เช่น 4K, ProRes, MOV) */
export const MAX_VIDEO_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB
export const MAX_VIDEO_LABEL = '5 GB';

/** รูปภาพความละเอียดสูง */
export const MAX_IMAGE_BYTES = 50 * 1024 * 1024; // 50 MB
export const MAX_IMAGE_LABEL = '50 MB';

/** ใช้ TUS เมื่อไฟล์ใหญ่ — ลดโอกาส timeout ระหว่างอัปโหลด */
const RESUMABLE_THRESHOLD_BYTES = 6 * 1024 * 1024; // 6 MB
const TUS_CHUNK_SIZE = 6 * 1024 * 1024;

const VIDEO_EXTENSIONS = /\.(mp4|m4v|mov|webm|mkv|avi|mpeg|mpg|wmv|3gp|hevc|m2ts|mts)$/i;
const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|heic|heif|bmp|tiff?)$/i;

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

export function isAllowedImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true;
  return IMAGE_EXTENSIONS.test(file.name);
}

export function isAllowedMediaFile(file: File): boolean {
  return isAllowedVideoFile(file) || isAllowedImageFile(file);
}

export function isImageMedia(mimeType?: string | null, fileName?: string | null): boolean {
  if (mimeType?.startsWith('image/')) return true;
  if (fileName && IMAGE_EXTENSIONS.test(fileName)) return true;
  return false;
}

export function maxBytesForMediaFile(file: File): number {
  return isAllowedImageFile(file) && !isAllowedVideoFile(file) ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
}

export function maxLabelForMediaFile(file: File): string {
  return isAllowedImageFile(file) && !isAllowedVideoFile(file) ? MAX_IMAGE_LABEL : MAX_VIDEO_LABEL;
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
  const kind = isAllowedImageFile(file) && !file.type.startsWith('video/') ? 'รูปภาพ' : 'วิดีโอ';
  onProgress(20, `กำลังอัปโหลด${kind}...`);
  return supabase.storage
    .from(bucket)
    .upload(path, file, {
      contentType: file.type || (kind === 'รูปภาพ' ? 'image/jpeg' : 'video/mp4'),
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
        reject(new Error(error.message || 'อัปโหลดไฟล์ล้มเหลว'));
      },
      onProgress(bytesUploaded, bytesTotal) {
        const raw = bytesTotal > 0 ? (bytesUploaded / bytesTotal) * 100 : 0;
        // เหลือช่วง 80–100 ให้ขั้นบันทึก metadata
        const percent = Math.min(88, Math.max(5, Math.round(raw * 0.88)));
        onProgress(
          percent,
          `กำลังอัปโหลด... ${formatBytes(bytesUploaded)} / ${formatBytes(bytesTotal)}`
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

/** อัปโหลดวิดีโอ/รูปภาพขึ้น Supabase Storage — ไฟล์ใหญ่ใช้ TUS แบ่งชิ้นอัตโนมัติ */
export async function uploadVideoToBucket(
  bucket: string,
  path: string,
  file: File,
  onProgress: UploadProgressFn = () => undefined
): Promise<void> {
  const maxBytes = maxBytesForMediaFile(file);
  const maxLabel = maxLabelForMediaFile(file);
  if (file.size > maxBytes) {
    throw new Error(`ไฟล์ใหญ่เกินไป กรุณาใช้ไฟล์ไม่เกิน ${maxLabel}`);
  }
  if (file.size >= RESUMABLE_THRESHOLD_BYTES) {
    await uploadResumable(bucket, path, file, onProgress);
    return;
  }
  await uploadSmallFile(bucket, path, file, onProgress);
}
