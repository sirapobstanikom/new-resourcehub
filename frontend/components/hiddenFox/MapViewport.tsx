import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Target } from 'lucide-react';
import { FOX_IMAGE } from './constants';
import type { GamePhase, GuessPosition, WolfPosition } from './types';

interface Props {
  mapUrl: string;
  guessPositions: GuessPosition[];
  onMapClick: (x: number, y: number, aspect: number) => void;
  gameState: GamePhase;
  wolfPositions: WolfPosition[];
  foundWolfIndices?: number[];
}

/** Slight rotation per spot so markers do not look identical. */
const FOX_ROTATIONS = [-6, 4, -3, 7, -5, 3];

const MapViewport: React.FC<Props> = ({
  mapUrl,
  guessPositions,
  onMapClick,
  gameState,
  wolfPositions,
  foundWolfIndices = [],
}) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [scrollStart, setScrollStart] = useState(0);
  const [didDrag, setDidDrag] = useState(false);

  const handleResize = useCallback(() => {}, []);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  const effectiveState = gameState === 'gameover' ? 'submitted' : gameState;
  const showPeekingFoxes = effectiveState === 'playing';

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
        if (!didDrag && effectiveState === 'playing' && imgRef.current) {
          const rect = imgRef.current.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          const y = ((e.clientY - rect.top) / rect.height) * 100;
          if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
            onMapClick(x, y, rect.width / rect.height);
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
          width: 'max-content',
          display: 'block',
          pointerEvents: 'none',
        }}
      >
        <img
          ref={imgRef}
          src={mapUrl}
          alt="Tactical Map"
          onLoad={handleResize}
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://via.placeholder.com/1920x1080?text=MAP+LOAD+ERROR';
          }}
          style={{
            height: '100%',
            width: 'auto',
            maxWidth: 'none',
            display: 'block',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
        <div
          className="map-interaction-layer"
          style={{ position: 'absolute', inset: 0, zIndex: 100, pointerEvents: 'none' }}
        >
          {wolfPositions.map((pos, idx) => {
            const isFound = foundWolfIndices.includes(idx);
            const rotate = FOX_ROTATIONS[idx % FOX_ROTATIONS.length];

            if (isFound) {
              return (
                <div
                  key={`fox-found-${idx}`}
                  className="fox-marker fox-marker--found"
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                  }}
                >
                  <div className="fox-marker__ring" aria-hidden />
                  <img src={FOX_IMAGE} alt="" className="fox-marker__img fox-marker__img--found" draggable={false} />
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
                <img src={FOX_IMAGE} alt="" className="fox-marker__img fox-marker__img--hidden" draggable={false} />
              </div>
            );
          })}
          {guessPositions.map((pos, idx) => (
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
      </div>
      <style>{`
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
        /* ตอนเล่น: จิ้งจอกเล็ก มองเห็นชัดทั้งตัว */
        .fox-marker__img--hidden {
          width: clamp(24px, 3.5vw, 44px);
          filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.45));
        }
        /* หาเจอแล้ว: ใหญ่ขึ้นเล็กน้อย + วงเหลือง */
        .fox-marker__img--found {
          width: clamp(36px, 5.5vw, 68px);
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
