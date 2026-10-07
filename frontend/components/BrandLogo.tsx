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
    />
  </span>
);

export default BrandLogo;
