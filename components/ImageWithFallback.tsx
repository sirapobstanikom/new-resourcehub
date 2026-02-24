import React, { useState } from 'react';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackClassName?: string;
}

const FallbackPlaceholder: React.FC<{ className?: string; alt: string }> = ({ className, alt }) => (
  <div
    className={`flex items-center justify-center bg-neutral-800 text-neutral-500 min-h-[80px] ${className ?? ''}`}
    role="img"
    aria-label={alt}
  >
    <svg xmlns="http://www.w3.org/2000/svg" className="w-1/3 h-1/3 min-w-8 min-h-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  </div>
);

const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt,
  className = '',
  fallbackClassName = '',
  ...props
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  if (!src || error) {
    return <FallbackPlaceholder className={className || fallbackClassName} alt={alt} />;
  }

  return (
    <div className={`relative ${className}`}>
      {loading && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-neutral-800"
          aria-hidden
        >
          <div className="w-8 h-8 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`${className} ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
        {...props}
      />
    </div>
  );
};

export default ImageWithFallback;
