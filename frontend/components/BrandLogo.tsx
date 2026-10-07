import React from 'react';

export const MINDDOJO_LOGO_URL =
  'https://axaasphuaaadzjoffznj.supabase.co/storage/v1/object/public/images/MindDojo%20Logo%20W.png';

/**
 * The source PNG (1920×649) has wide transparent padding; the wordmark occupies
 * x 366–1566, y 200–446. The wrapper crops to that box, sized in `em` so the
 * logo height follows the font-size set via `className` (e.g. `text-[28px]`).
 */
const CONTENT_HEIGHT = 246;
const CROP = {
  width: `${1200 / CONTENT_HEIGHT}em`,
  imgHeight: `${649 / CONTENT_HEIGHT}em`,
  offsetTop: `${-200 / CONTENT_HEIGHT}em`,
  offsetLeft: `${-366 / CONTENT_HEIGHT}em`,
};

interface BrandLogoProps {
  className?: string;
  /** `dark` renders the white logo in black for light backgrounds. */
  tone?: 'light' | 'dark';
}

const BrandLogo: React.FC<BrandLogoProps> = ({ className = 'text-[28px]', tone = 'light' }) => (
  <span
    className={`relative inline-block shrink-0 overflow-hidden align-middle leading-none ${className}`}
    style={{ height: '1em', width: CROP.width }}
  >
    <img
      src={MINDDOJO_LOGO_URL}
      alt="MindDojo"
      draggable={false}
      className="pointer-events-none absolute select-none"
      style={{
        height: CROP.imgHeight,
        width: 'auto',
        maxWidth: 'none',
        top: CROP.offsetTop,
        left: CROP.offsetLeft,
        filter: tone === 'dark' ? 'brightness(0)' : undefined,
      }}
      data-brand-logo-tone={tone}
    />
  </span>
);

let darkLogoDataUrl: Promise<string> | null = null;

/** html2canvas ignores CSS `filter`, so exports need a pre-blackened copy of the logo. */
const getDarkLogoDataUrl = (): Promise<string> => {
  darkLogoDataUrl ??= new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas 2D context unavailable'));
      ctx.drawImage(img, 0, 0);
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to load logo'));
    img.src = MINDDOJO_LOGO_URL;
  }).catch((err) => {
    darkLogoDataUrl = null;
    throw err;
  });
  return darkLogoDataUrl;
};

/** Pass as html2canvas `onclone` to render `tone="dark"` logos correctly. */
export const prepareBrandLogosForExport = async (): Promise<(doc: Document) => void> => {
  const dark = await getDarkLogoDataUrl();
  return (doc) => {
    doc.querySelectorAll<HTMLImageElement>('img[data-brand-logo-tone="dark"]').forEach((img) => {
      img.src = dark;
      img.style.filter = '';
    });
  };
};

export default BrandLogo;
