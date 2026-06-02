import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Target } from 'lucide-react';
import { FOX_IMAGE } from './constants';
import type { GamePhase, GuessPosition, WolfPosition } from './types';

interface Props {
  mapUrl: string;
  roundSession: number;
  guessPositions: GuessPosition[];
  onMapClick: (x: number, y: number, aspect: number) => void;
  onMapReadyChange?: (ready: boolean) => void;
  gameState: GamePhase;
  wolfPositions: WolfPosition[];
  foundWolfIndices?: number[];
}

/** Slight rotation per spot so markers do not look identical. */
const FOX_ROTATIONS = [-6, 4, -3, 7, -5, 3];
const MAP_FALLBACK_URL = 'https://via.placeholder.com/1920x1080?text=MAP+LOAD+ERROR';

const MapViewport: React.FC<Props> = ({
  mapUrl,
  roundSession,
  guessPositions,
  onMapClick,
  onMapReadyChange,
  gameState,
  wolfPositions,
  foundWolfIndices = [],
}) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [renderBox, setRenderBox] = useState({ left: 0, top: 0, width: 0, height: 0 });
  const [mapSrc, setMapSrc] = useState(mapUrl);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [scrollStart, setScrollStart] = useState(0);
  const [didDrag, setDidDrag] = useState(false);

  const updateRenderBox = useCallback(() => {
    if (!viewportRef.current) return;
    const viewportWidth = viewportRef.current.clientWidth;
    const viewportHeight = viewportRef.current.clientHeight;
    if (viewportWidth <= 0 || viewportHeight <= 0) return;

    const imageWidth = naturalSize.width;
    const imageHeight = naturalSize.height;
    if (imageWidth <= 0 || imageHeight <= 0) {
      setRenderBox({ left: 0, top: 0, width: viewportWidth, height: viewportHeight });
      return;
    }

    const imageAspect = imageWidth / imageHeight;
    const viewportAspect = viewportWidth / viewportHeight;
    let width = viewportWidth;
    let height = viewportHeight;

    if (imageAspect > viewportAspect) {
      height = width / imageAspect;
    } else {
      width = height * imageAspect;
    }

    setRenderBox({
      left: (viewportWidth - width) / 2,
      top: (viewportHeight - height) / 2,
      width,
      height,
    });
  }, [naturalSize.height, naturalSize.width]);

  useEffect(() => {
    window.addEventListener('resize', updateRenderBox);
    return () => window.removeEventListener('resize', updateRenderBox);
  }, [updateRenderBox]);

  const effectiveState = gameState === 'gameover' ? 'submitted' : gameState;
  const showPeekingFoxes = effectiveState === 'playing' && isMapReady;

  useEffect(() => {
    setMapSrc(mapUrl);
    setIsMapReady(false);
    onMapReadyChange?.(false);
  }, [mapUrl]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    const img = imgRef.current;
    if (!img) return;

    // If browser already cached image, skip long loading overlay.
    if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
      setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
      setIsMapReady(true);
      updateRenderBox();
      return;
    }

    setIsMapReady(false);
    onMapReadyChange?.(false);
  }, [gameState, mapUrl, onMapReadyChange, roundSession, updateRenderBox]);

  useEffect(() => {
    if (gameState !== 'playing' || isMapReady) return;
    const timeoutId = window.setTimeout(() => {
      setIsMapReady(true);
      onMapReadyChange?.(true);
    }, 5000);
    return () => window.clearTimeout(timeoutId);
  }, [gameState, isMapReady, onMapReadyChange]);


  useEffect(() => {
    onMapReadyChange?.(isMapReady);
  }, [isMapReady, onMapReadyChange]);

  useEffect(() => {
    if (!viewportRef.current || !imgRef.current) return;
    const observer = new ResizeObserver(() => updateRenderBox());
    observer.observe(viewportRef.current);
    observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, [updateRenderBox]);

  return (
    <div
      ref={viewportRef}
      className="game-map-viewport"
      onMouseDown={(e) => {
        if (!viewportRef.current) return;
        setIsDragging(true);
        setDidDrag(false);
        setDragStartX(e.pageX - viewportRef.current.offsetLeft);
        setScrollStart(viewportRef.current.scrollLeft);
      }}
      onMouseLeave={() => setIsDragging(false)}
      onMouseUp={(e) => {
        setIsDragging(false);
        if (!didDrag && isMapReady && effectiveState === 'playing' && viewportRef.current) {
          const viewportRect = viewportRef.current.getBoundingClientRect();
          const left = viewportRect.left + renderBox.left;
          const top = viewportRect.top + renderBox.top;
          const x = ((e.clientX - left) / renderBox.width) * 100;
          const y = ((e.clientY - top) / renderBox.height) * 100;
          if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
            onMapClick(x, y, renderBox.width / renderBox.height);
          }
        }
      }}
      onMouseMove={(e) => {
        if (!isDragging || !viewportRef.current) return;
        e.preventDefault();
        const walk = (e.pageX - viewportRef.current.offsetLeft - dragStartX) * 2;
        if (Math.abs(walk) > 5) setDidDrag(true);
        viewportRef.current.scrollLeft = scrollStart - walk;
      }}
      style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: 'transparent',
        zIndex: 1,
        overflowX: 'auto',
        overflowY: 'hidden',
        cursor: isDragging ? 'grabbing' : effectiveState === 'playing' ? 'crosshair' : 'default',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          position: 'relative',
          height: '100%',
          width: '100%',
          display: 'block',
          pointerEvents: 'none',
        }}
      >
        <img
          ref={imgRef}
          src={mapSrc}
          alt="Tactical Map"
          onLoad={(e) => {
            const target = e.currentTarget;
            const width = target.naturalWidth || target.width;
            const height = target.naturalHeight || target.height;
            setNaturalSize({ width, height });
            setIsMapReady(true);
            updateRenderBox();
            if (target.naturalWidth > 0 && target.naturalHeight > 0) {
              if (viewportRef.current) viewportRef.current.scrollLeft = 0;
            }
          }}
          onError={() => {
            if (mapSrc !== MAP_FALLBACK_URL) {
              setMapSrc(MAP_FALLBACK_URL);
              return;
            }
            setIsMapReady(true);
          }}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
        <div
          className="map-interaction-layer"
          style={{
            position: 'absolute',
            left: renderBox.left,
            top: renderBox.top,
            width: renderBox.width,
            height: renderBox.height,
            zIndex: 100,
            pointerEvents: 'none',
          }}
        >
          {isMapReady && wolfPositions.map((pos, idx) => {
            const isFound = foundWolfIndices.includes(idx);
            const rotate = FOX_ROTATIONS[idx % FOX_ROTATIONS.length];
            const foxSrc = pos.imageUrl ?? FOX_IMAGE;

            if (isFound) {
              return (
                <div
                  key={`fox-found-${idx}`}
                  className="fox-marker fox-marker--found"
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    transform: `translate(-50%, -50%) rotate(${rotate}deg)`,
                  }}
                >
                  <div className="fox-marker__ring" aria-hidden />
                  <img src={foxSrc} alt="" className="fox-marker__img fox-marker__img--found" draggable={false} />
                </div>
              );
            }

            if (!showPeekingFoxes) return null;

            return (
              <div
                key={`fox-hidden-${idx}`}
                className="fox-marker fox-marker--hidden"
                style={{
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  transform: `translate(-50%, -50%) rotate(${rotate}deg)`,
                }}
              >
                <img src={foxSrc} alt="" className="fox-marker__img fox-marker__img--hidden" draggable={false} />
              </div>
            );
          })}
          {isMapReady && guessPositions.map((pos, idx) => (
            <div
              key={`guess-${idx}`}
              style={{
                position: 'absolute',
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 1000,
                pointerEvents: 'none',
              }}
            >
              <div className="friendly-marker">
                <Target size={40} color="#facc15" strokeWidth={4} />
              </div>
            </div>
          ))}
        </div>
        {!isMapReady && (
          <div className="map-loading-overlay" aria-live="polite">
            <div className="map-loading-spinner" />
            <span>กำลังโหลดแผนที่...</span>
          </div>
        )}
      </div>
      <style>{`
        .map-loading-overlay {
          position: absolute;
          inset: 0;
          z-index: 300;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          background: radial-gradient(circle at center, rgba(15, 16, 32, 0.82), rgba(7, 7, 15, 0.96));
          color: #cbd5e1;
          font-weight: 700;
          letter-spacing: 0.02em;
        }
        .map-loading-spinner {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          border: 3px solid rgba(250, 204, 21, 0.25);
          border-top-color: #facc15;
          animation: map-spin 0.9s linear infinite;
        }
        @keyframes map-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .fox-marker {
          position: absolute;
          pointer-events: none;
          z-index: 105;
        }
        .fox-marker--hidden {
          z-index: 102;
        }
        .fox-marker--found {
          z-index: 115;
          transform: translate(-50%, -50%);
          animation: fox-found-pop 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .fox-marker__img {
          display: block;
          height: auto;
          object-fit: contain;
          opacity: 1;
          user-select: none;
          -webkit-user-drag: none;
          image-rendering: auto;
        }
        /* ตอนเล่น: จิ้งจอกเล็ก (ซ่อนบนแมป) */
        .fox-marker__img--hidden {
          width: clamp(16px, 2.4vw, 32px);
          max-height: clamp(20px, 3vw, 40px);
          filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.45));
        }
        /* หาเจอแล้ว: ใหญ่ขึ้นเล็กน้อย + วงเหลือง */
        .fox-marker__img--found {
          width: clamp(28px, 4vw, 52px);
          max-height: clamp(36px, 5vw, 64px);
          position: relative;
          z-index: 1;
          filter: drop-shadow(0 4px 12px rgba(250, 204, 21, 0.45));
        }
        .fox-marker__ring {
          position: absolute;
          inset: -10%;
          border: 3px solid var(--neon-green);
          border-radius: 50%;
          box-shadow:
            0 0 20px rgba(250, 204, 21, 0.5),
            0 0 32px rgba(250, 204, 21, 0.2);
          z-index: 0;
        }
        @keyframes fox-found-pop {
          0% {
            transform: translate(-50%, -50%) scale(0.65);
            opacity: 0;
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
        }
        .friendly-marker {
          display: flex;
          align-items: center;
          justify-content: center;
          width: clamp(40px, 6vw, 80px);
          height: clamp(40px, 6vw, 80px);
          background: rgba(250, 204, 21, 0.2);
          border: 3px solid var(--neon-green);
          border-radius: 50%;
          box-shadow: 0 0 15px rgba(250, 204, 21, 0.45);
          animation: pulse-marker 1.5s infinite;
        }
        @keyframes pulse-marker {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
};

export default memo(MapViewport);
