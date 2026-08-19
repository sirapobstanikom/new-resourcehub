import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, CameraOff, Monitor, Shield, Zap, RefreshCw, Eye, EyeOff, Play, Maximize2, Minimize2, Sparkles, Trophy, Gift, X } from 'lucide-react';
import { Pose, Results, POSE_CONNECTIONS } from '@mediapipe/pose';
import confetti from 'canvas-confetti';
import { Coin, Particle } from '../cameraBlockJump/types';
import { soundEffects } from '../cameraBlockJump/audio';
import {
  AUTO_RUN_SPEED,
  BLOCK_BASE_Y,
  BLOCK_H,
  BLOCK_W,
  BLOCK_WORLD_X,
  CAMERA_FOLLOW_X,
  feetOnGround,
  FINISH_X,
  GROUND_SEGMENTS,
  GROUND_Y,
  PRIZE_KICK_VY,
  PRIZE_MIN_LEAD,
  PRIZE_RUN_SPEED,
  SCENERY_BUSHES,
  VIEW_H,
  VIEW_W,
  WORLD_W,
  worldToScreen,
  isVisible,
} from './level';

interface EmergingNumber {
  id: number;
  digit: number;
  hitIndex: number;
  startX: number;
  targetX: number;
  startY: number;
  targetY: number;
  currentX: number;
  currentY: number;
  progress: number;
}

// 8-bit NES Pixel Art Font Bitmaps (7x5 Grid)
const PIXEL_FONT: Record<string, number[][]> = {
  '#': [
    [0, 1, 0, 1, 0],
    [1, 1, 1, 1, 1],
    [0, 1, 0, 1, 0],
    [1, 1, 1, 1, 1],
    [0, 1, 0, 1, 0],
    [0, 1, 0, 1, 0],
    [0, 0, 0, 0, 0],
  ],
  '0': [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 1, 1],
    [1, 0, 1, 0, 1],
    [1, 1, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  '1': [
    [0, 0, 1, 0, 0],
    [0, 1, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 1, 1, 1, 0],
  ],
  '2': [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [0, 0, 0, 0, 1],
    [0, 0, 1, 1, 0],
    [0, 1, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 1, 1],
  ],
  '3': [
    [1, 1, 1, 1, 0],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 0, 1],
    [1, 1, 1, 1, 0],
  ],
  '4': [
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 0, 1],
  ],
  '5': [
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 1, 0],
    [0, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  '6': [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  '7': [
    [1, 1, 1, 1, 1],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 1, 0],
    [0, 0, 1, 0, 0],
    [0, 1, 0, 0, 0],
    [0, 1, 0, 0, 0],
    [0, 1, 0, 0, 0],
  ],
  '8': [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  '9': [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 1],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  I: [
    [1, 1, 1, 1, 1],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [1, 1, 1, 1, 1],
  ],
  N: [
    [1, 0, 0, 0, 1],
    [1, 1, 0, 0, 1],
    [1, 0, 1, 0, 1],
    [1, 0, 0, 1, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
  ],
  O: [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  C: [
    [0, 1, 1, 1, 1],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [0, 1, 1, 1, 1],
  ],
  L: [
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 1, 1],
  ],
  U: [
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  B: [
    [1, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 0],
  ],
  R: [
    [1, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 0],
    [1, 0, 1, 0, 0],
    [1, 0, 0, 1, 0],
    [1, 0, 0, 0, 1],
  ],
  X: [
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 0, 1, 0],
    [0, 0, 1, 0, 0],
    [0, 1, 0, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
  ],
  M: [
    [1, 0, 0, 0, 1],
    [1, 1, 0, 1, 1],
    [1, 0, 1, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
  ],
  D: [
    [1, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 0],
  ],
  J: [
    [0, 0, 1, 1, 1],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  W: [
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 1, 0, 1],
    [1, 0, 1, 0, 1],
    [1, 1, 0, 1, 1],
    [1, 0, 0, 0, 1],
  ],
  K: [
    [1, 0, 0, 0, 1],
    [1, 0, 0, 1, 0],
    [1, 0, 1, 0, 0],
    [1, 1, 0, 0, 0],
    [1, 0, 1, 0, 0],
    [1, 0, 0, 1, 0],
    [1, 0, 0, 0, 1],
  ],
  T: [
    [1, 1, 1, 1, 1],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
  ],
  E: [
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 1, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 1, 1],
  ],
  H: [
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
  ],
  P: [
    [1, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
  ],
  F: [
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 1, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
  ],
  A: [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
  ],
  ' ': [
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
  ],
};

type FallingPrize = {
  digit: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  landed: boolean;
};

// Pure 8-bit Pixel Art Number Display Renderer Component
const PixelNumberDisplay: React.FC<{ text: string; pixelSize?: number }> = ({ text, pixelSize = 8 }) => {
  const charWidth = 5;
  const charGap = 1;
  const chars = text.split('');
  const glyphs = chars.map((c) => PIXEL_FONT[c] || PIXEL_FONT['0']);
  const gridWidth = chars.length * (charWidth + charGap) - charGap;
  const gridHeight = 7;

  const rowColors = [
    '#FCFCFC', // row 0: Pure White Top Highlight
    '#FCFCFC', // row 1: Pure White Top Highlight
    '#F8B800', // row 2: Classic NES Gold
    '#F8B800', // row 3: Classic NES Gold
    '#E45C10', // row 4: Red-Orange Base
    '#E45C10', // row 5: Red-Orange Base
    '#800000', // row 6: Deep Shadow Line
  ];

  return (
    <div className="relative p-5 sm:p-6 bg-black border-4 border-black shadow-[0_8px_0_0_#000] my-2 inline-flex flex-col items-center justify-center">
      {/* 8-Bit Outer Pixel Border */}
      <div className="absolute -inset-2 border-4 border-[#F8B800] pointer-events-none" />
      <div className="absolute -inset-1 border-2 border-black pointer-events-none" />

      {/* Pixel Corner Accents */}
      <div className="absolute -top-3 -left-3 w-3 h-3 bg-[#F8B800] border-2 border-black" />
      <div className="absolute -top-3 -right-3 w-3 h-3 bg-[#F8B800] border-2 border-black" />
      <div className="absolute -bottom-3 -left-3 w-3 h-3 bg-[#F8B800] border-2 border-black" />
      <div className="absolute -bottom-3 -right-3 w-3 h-3 bg-[#F8B800] border-2 border-black" />

      <div
        className="grid select-none my-1"
        style={{
          gridTemplateColumns: `repeat(${gridWidth}, ${pixelSize}px)`,
          gridTemplateRows: `repeat(${gridHeight}, ${pixelSize}px)`,
          gap: '0px',
        }}
      >
        {Array.from({ length: gridHeight }).map((_, r) =>
          Array.from({ length: gridWidth }).map((_, c) => {
            const charIdx = Math.floor(c / (charWidth + charGap));
            const colInChar = c % (charWidth + charGap);

            let isFilled = false;
            if (colInChar < charWidth && charIdx < glyphs.length) {
              const glyph = glyphs[charIdx];
              if (glyph && glyph[r] && glyph[r][colInChar] === 1) {
                isFilled = true;
              }
            }

            return (
              <div
                key={`${r}-${c}`}
                style={{
                  width: `${pixelSize}px`,
                  height: `${pixelSize}px`,
                  backgroundColor: isFilled ? rowColors[r] : 'transparent',
                  boxShadow: isFilled ? '1px 1px 0px #000' : 'none',
                }}
              />
            );
          })
        )}
      </div>
    </div>
  );
};

interface Props {
  singleHit: boolean;
  setSingleHit: (val: boolean) => void;
  cameraOn: boolean;
  setCameraOn: (val: boolean) => void;
  debugMode: boolean;
  setDebugMode: (val: boolean) => void;
  coinsCount: number;
  setCoinsCount: React.Dispatch<React.SetStateAction<number>>;
  currentNumber: number | null;
  assignedHistory: number[];
  onWin: (n: number) => Promise<number>;
  onNeedNextNumber: () => void | Promise<void>;
}

export const PrizeCatchCanvas: React.FC<Props> = ({
  singleHit,
  setSingleHit,
  cameraOn,
  setCameraOn,
  debugMode,
  setDebugMode,
  coinsCount,
  setCoinsCount,
  currentNumber,
  assignedHistory,
  onWin,
  onNeedNextNumber,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const stageContainerRef = useRef<HTMLDivElement | null>(null);

  // States
  const [poseDetected, setPoseDetected] = useState(false);
  const [blockIsUsed, setBlockIsUsed] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [simulationMode, setSimulationMode] = useState(false);
  const [pipLarge, setPipLarge] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Prize catch: number pops from the lucky block and falls like a Mario item
  const [secretNumber, setSecretNumber] = useState<number>(() => currentNumber ?? 1);
  const [wonNumber, setWonNumber] = useState<number | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [savingNumber, setSavingNumber] = useState(false);
  const [prizeReleased, setPrizeReleased] = useState(false);
  const [hitCount, setHitCount] = useState(0);
  const [showFail, setShowFail] = useState(false);

  // Fullscreen toggle handler with native API & CSS fallback
  const toggleFullscreen = useCallback(() => {
    if (!stageContainerRef.current) return;

    if (!document.fullscreenElement) {
      if (stageContainerRef.current.requestFullscreen) {
        stageContainerRef.current.requestFullscreen().then(() => {
          setIsFullscreen(true);
        }).catch(() => {
          setIsFullscreen((prev) => !prev);
        });
      } else {
        setIsFullscreen((prev) => !prev);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          setIsFullscreen(false);
        }).catch(() => {
          setIsFullscreen(false);
        });
      } else {
        setIsFullscreen(false);
      }
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Refs for animation loop
  const headHistoryRef = useRef<number[]>([]);
  const shoulderHistoryRef = useRef<number[]>([]);
  const smoothedYRef = useRef<number | null>(null);
  const lastJumpTimeRef = useRef<number>(0);
  const blockBumpOffsetRef = useRef(0);
  const blockBumpVyRef = useRef(0);
  const coinsRef = useRef<Coin[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<{ id: number; text: string; x: number; y: number; vy: number; lifetime: number }[]>([]);
  const secretNumberRef = useRef<number>(secretNumber);
  const onWinRef = useRef(onWin);
  onWinRef.current = onWin;

  useEffect(() => {
    if (currentNumber == null) return;
    setSecretNumber(currentNumber);
    secretNumberRef.current = currentNumber;
  }, [currentNumber]);

  const emergenceYRef = useRef<number>(185);
  const hitCountRef = useRef<number>(0);
  const hitCooldownRef = useRef(0);
  const isJumpingRef = useRef(false);
  const headPosRef = useRef({ x: 320, y: 350 });
  const prizeRef = useRef<FallingPrize | null>(null);
  const prizeReleasedRef = useRef(false);
  const prizeCaughtRef = useRef(false);
  const cameraXRef = useRef(0);
  const chaseModeRef = useRef(false);
  const failedRef = useRef(false);
  const pendingPrizeRef = useRef(false);
  const pendingPrizeAtRef = useRef(0);
  const blockUsedRef = useRef(false);
  const poseDetectedRef = useRef(false);
  const jumpLockRef = useRef(false);
  const prizeCatchAtRef = useRef(0);

  // Character State Refs (Walk Left/Right & Jump)
  const PLAYER_W = 44;
  const PLAYER_H = 52;
  const playerXRef = useRef<number>(BLOCK_WORLD_X + BLOCK_W / 2 - 22);
  const playerYRef = useRef<number>(GROUND_Y - PLAYER_H);
  const playerVyRef = useRef<number>(0);
  const playerIsGroundedRef = useRef<boolean>(true);
  const facingRightRef = useRef<boolean>(true);
  const isMovingRef = useRef<boolean>(false);
  const animFrameRef = useRef<number>(0);

  // Keyboard keys pressed tracking
  const keysPressedRef = useRef<{ [key: string]: boolean }>({});

  // Keyboard listeners for walking left/right and jumping
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressedRef.current[e.key] = true;
      if (['ArrowUp', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        // Prevent default scrolling
        if (document.activeElement === document.body) {
          e.preventDefault();
        }
      }
      if ((e.key === 'ArrowUp' || e.key === ' ' || e.key === 'w' || e.key === 'W') && playerIsGroundedRef.current && !failedRef.current && !jumpLockRef.current) {
        playerVyRef.current = -19;
        playerIsGroundedRef.current = false;
        isJumpingRef.current = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressedRef.current[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Initialize MediaPipe Pose & Camera
  useEffect(() => {
    let active = true;
    let stream: MediaStream | null = null;
    let poseInstance: Pose | null = null;
    let animFrameId: number;

    async function initCameraAndPose() {
      if (!cameraOn) {
        poseDetectedRef.current = false;
        setPoseDetected(false);
        return;
      }

      try {
        setCameraError(null);
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
        });

        if (!active) return;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // Initialize MediaPipe Pose
        poseInstance = new Pose({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
        });

        poseInstance.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        poseInstance.onResults((results: Results) => {
          if (!active) return;
          if (results.poseLandmarks && results.poseLandmarks.length > 0) {
            poseDetectedRef.current = true;
            setPoseDetected(true);
            const nose = results.poseLandmarks[0];
            const lEar = results.poseLandmarks[7];
            const rEar = results.poseLandmarks[8];
            const lShoulder = results.poseLandmarks[11];
            const rShoulder = results.poseLandmarks[12];
            const lHip = results.poseLandmarks[23];
            const rHip = results.poseLandmarks[24];

            // Invert X for mirror view
            const rawX = (1 - (nose.x + lEar.x + rEar.x) / 3) * 640;
            const rawHeadY = ((nose.y + lEar.y + rEar.y) / 3) * 480;

            // Strict Shoulder Anchor Y: ONLY track shoulders to prevent head tilt/bowing jumps
            const hasShoulders = lShoulder && rShoulder && (lShoulder.visibility ?? 1) > 0.4 && (rShoulder.visibility ?? 1) > 0.4;
            let anchorY: number | null = null;
            if (hasShoulders) {
              anchorY = ((lShoulder.y + rShoulder.y) / 2) * 480;

              // Safety check: ignore jump if head/nose is bowed way down near shoulder level
              if (nose && (nose.visibility ?? 1) > 0.4) {
                const noseY = nose.y * 480;
                if (noseY > anchorY - 15) {
                  anchorY = null;
                }
              }
            }

            // ระหว่างโหม่งกล่อง — ไม่ดึง X ด้วยกล้อง (กันโดนดึงออกแล้วกระโดดครั้งที่ 3 ไม่โดน)
            if (!chaseModeRef.current && !jumpLockRef.current && hitCountRef.current < 3) {
              const underBlock = BLOCK_WORLD_X + BLOCK_W / 2 - PLAYER_W / 2;
              playerXRef.current += (underBlock - playerXRef.current) * 0.2;
              isMovingRef.current = Math.abs(underBlock - playerXRef.current) > 2;
            }

            // Calculate Jump using Exponential Moving Average & Sustained Upward Motion
            if (anchorY !== null) {
              if (smoothedYRef.current === null) {
                smoothedYRef.current = anchorY;
              } else {
                // Apply EMA filter (0.75 * old + 0.25 * new) to smooth out camera jitter/flicker
                smoothedYRef.current = smoothedYRef.current * 0.75 + anchorY * 0.25;
              }

              const currentY = smoothedYRef.current;
              const history = headHistoryRef.current;
              history.push(currentY);
              if (history.length > 8) history.shift();

              const now = Date.now();
              // Must be grounded and past the jump cooldown (600ms)
              if (
                history.length >= 6 &&
                playerIsGroundedRef.current &&
                now - lastJumpTimeRef.current > 600
              ) {
                const totalUpwardDelta = history[0] - history[history.length - 1];

                // Ensure body is actively moving upward across recent frames
                const isConsistentlyMovingUp =
                  history[history.length - 1] < history[history.length - 2] &&
                  history[history.length - 2] < history[history.length - 3];

                // Requires significant physical upward jump (>30px smoothed) + active upward momentum
                if (
                  totalUpwardDelta > 30 &&
                  isConsistentlyMovingUp &&
                  !failedRef.current &&
                  !jumpLockRef.current
                ) {
                  playerVyRef.current = -19;
                  playerIsGroundedRef.current = false;
                  isJumpingRef.current = true;
                  lastJumpTimeRef.current = now;
                  headHistoryRef.current = [];
                  smoothedYRef.current = null;
                }
              }
            } else {
              headHistoryRef.current = [];
              smoothedYRef.current = null;
            }

            headPosRef.current = { x: rawX, y: rawHeadY };
          } else {
            poseDetectedRef.current = false;
        setPoseDetected(false);
          }
        });

        const processFrame = async () => {
          if (videoRef.current && poseInstance && cameraOn && !videoRef.current.paused && !videoRef.current.ended) {
            await poseInstance.send({ image: videoRef.current });
          }
          if (active) {
            animFrameId = requestAnimationFrame(processFrame);
          }
        };

        processFrame();
      } catch (err) {
        console.warn('Camera access issue:', err);
        setCameraError('Webcam not active or permission required. Enable simulation mode below to test gameplay!');
        setSimulationMode(true);
      }
    }

    initCameraAndPose();

    return () => {
      active = false;
      if (animFrameId) cancelAnimationFrame(animFrameId);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (poseInstance) {
        poseInstance.close();
      }
    };
  }, [cameraOn]);

  const releasePrize = useCallback(() => {
    if (prizeReleasedRef.current || prizeCaughtRef.current) return;
    prizeReleasedRef.current = true;
    pendingPrizeRef.current = false;
    jumpLockRef.current = true;
    blockUsedRef.current = true;

    prizeRef.current = {
      digit: secretNumberRef.current,
      x: BLOCK_WORLD_X + BLOCK_W + 16,
      y: BLOCK_BASE_Y - 8,
      vx: PRIZE_RUN_SPEED,
      vy: PRIZE_KICK_VY,
      w: 48,
      h: 48,
      landed: false,
    };
    chaseModeRef.current = true;
    jumpLockRef.current = false;
    window.setTimeout(() => {
      setPrizeReleased(true);
      setBlockIsUsed(true);
    }, 0);
  }, []);

  const catchPrize = useCallback((digit: number) => {
    if (prizeCaughtRef.current || failedRef.current) return;
    prizeCaughtRef.current = true;
    chaseModeRef.current = false;
    setWonNumber(digit);
    setShowModal(true);
    if (prizeRef.current) {
      prizeRef.current.x = FINISH_X - 24;
      prizeRef.current.y = GROUND_Y - prizeRef.current.h;
      prizeRef.current.vy = 0;
      prizeRef.current.landed = true;
    }
    setCoinsCount((prev) => prev + 1);
    setSavingNumber(true);
    try {
      soundEffects.playPowerupSound();
    } catch {
      /* ignore */
    }
    try {
      confetti({
        particleCount: 120,
        spread: 110,
        origin: { x: 0.5, y: 0.45 },
      });
    } catch {
      /* ignore */
    }
    void Promise.resolve(onWinRef.current(digit)).then((assigned) => {
      setWonNumber(assigned);
      setSecretNumber(assigned);
      secretNumberRef.current = assigned;
    }).catch(() => {
      /* keep the on-screen win even if saving fails */
    }).finally(() => {
      setSavingNumber(false);
    });
  }, [setCoinsCount]);

  const triggerFail = useCallback(() => {
    if (failedRef.current || prizeCaughtRef.current) return;
    failedRef.current = true;
    chaseModeRef.current = false;
    playerVyRef.current = -11;
    playerIsGroundedRef.current = false;
    isJumpingRef.current = true;
    soundEffects.playFailSound();
    setTimeout(() => setShowFail(true), 750);
  }, []);

  const catchPrizeRef = useRef(catchPrize);
  catchPrizeRef.current = catchPrize;
  const triggerFailRef = useRef(triggerFail);
  triggerFailRef.current = triggerFail;
  const releasePrizeRef = useRef(releasePrize);
  releasePrizeRef.current = releasePrize;

  // Handle Trigger Block Hit — ครั้งที่ 3 รอ落地ก่อน แล้วค่อยปล่อยของรางวัล
  const triggerBlockHit = useCallback(() => {
    if (prizeReleasedRef.current || prizeCaughtRef.current || hitCountRef.current >= 3) {
      soundEffects.playBumpSound();
      return;
    }

    hitCooldownRef.current = 18;
    blockBumpVyRef.current = -12;
    playerVyRef.current = 2;

    const currentHit = hitCountRef.current + 1;
    hitCountRef.current = currentHit;
    soundEffects.playCoinSound();

    coinsRef.current.push({
      id: Date.now() + Math.random(),
      x: BLOCK_WORLD_X + BLOCK_W / 2,
      y: BLOCK_BASE_Y + BLOCK_H,
      vy: -8,
      rotation: 0,
      active: true,
    });

    for (let i = 0; i < 12; i++) {
      particlesRef.current.push({
        x: BLOCK_WORLD_X + BLOCK_W / 2 + (Math.random() - 0.5) * 30,
        y: BLOCK_BASE_Y + 20,
        vx: (Math.random() - 0.5) * 8,
        vy: -Math.random() * 7 - 2,
        color: Math.random() > 0.3 ? '#FFD700' : '#00E5FF',
        size: Math.random() * 5 + 4,
        lifetime: 1.0,
      });
    }

    if (currentHit === 3) {
      prizeReleasedRef.current = true;
      blockUsedRef.current = true;
      chaseModeRef.current = true;
      jumpLockRef.current = false;
      prizeRef.current = {
        digit: secretNumberRef.current || 1,
        x: BLOCK_WORLD_X + BLOCK_W + 16,
        y: BLOCK_BASE_Y - 8,
        vx: PRIZE_RUN_SPEED,
        vy: PRIZE_KICK_VY,
        w: 48,
        h: 48,
        landed: false,
      };
      prizeCatchAtRef.current = performance.now() + 1400;
      soundEffects.playPowerupSound();
    }
  }, []);

  const triggerBlockHitRef = useRef(triggerBlockHit);
  triggerBlockHitRef.current = triggerBlockHit;

  // Main Canvas Render Loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      try {
        const keys = keysPressedRef.current;
      if (failedRef.current) {
        playerYRef.current += playerVyRef.current;
        playerVyRef.current += 0.85;
        isMovingRef.current = false;
      } else if (chaseModeRef.current) {
        playerXRef.current += AUTO_RUN_SPEED;
        if (keys['ArrowRight'] || keys['d'] || keys['D']) playerXRef.current += 1.8;
        facingRightRef.current = true;
        isMovingRef.current = true;
      } else {
        const movingLeft = keys['ArrowLeft'] || keys['a'] || keys['A'];
        const movingRight = keys['ArrowRight'] || keys['d'] || keys['D'];
        if (hitCountRef.current < 3 && !jumpLockRef.current) {
          const underBlock = BLOCK_WORLD_X + BLOCK_W / 2 - PLAYER_W / 2;
          playerXRef.current += (underBlock - playerXRef.current) * 0.25;
          if (movingLeft || movingRight) isMovingRef.current = true;
        } else if (movingLeft) {
          playerXRef.current -= 5;
          facingRightRef.current = false;
          isMovingRef.current = true;
        } else if (movingRight) {
          playerXRef.current += 5;
          facingRightRef.current = true;
          isMovingRef.current = true;
        } else if (!poseDetectedRef.current) {
          isMovingRef.current = false;
        }
      }

      playerXRef.current = Math.min(playerXRef.current, WORLD_W - PLAYER_W - 20);

      const groundedFeet = feetOnGround(playerXRef.current, playerXRef.current + PLAYER_W);

      if (!failedRef.current) {
        if (!playerIsGroundedRef.current) {
          playerYRef.current += playerVyRef.current;
          playerVyRef.current += 0.85;

          if (playerYRef.current >= GROUND_Y - PLAYER_H && groundedFeet) {
            playerYRef.current = GROUND_Y - PLAYER_H;
            playerVyRef.current = 0;
            playerIsGroundedRef.current = true;
            isJumpingRef.current = false;
          }
        } else if (groundedFeet) {
          playerYRef.current = GROUND_Y - PLAYER_H;
          if (!feetOnGround(playerXRef.current + 2, playerXRef.current + PLAYER_W - 2)) {
            playerIsGroundedRef.current = false;
          }
        } else {
          playerIsGroundedRef.current = false;
          playerVyRef.current = Math.max(playerVyRef.current, 0.5);
        }
      }

      if (!failedRef.current && !prizeCaughtRef.current && playerYRef.current > GROUND_Y + 70) {
        triggerFailRef.current();
      }

      if (isMovingRef.current && playerIsGroundedRef.current) {
        animFrameRef.current = (animFrameRef.current + 1) % 20;
      }

      const camTarget = Math.max(0, Math.min(WORLD_W - VIEW_W, playerXRef.current - CAMERA_FOLLOW_X));
      cameraXRef.current += (camTarget - cameraXRef.current) * 0.14;

      if (hitCooldownRef.current > 0) hitCooldownRef.current--;

      const pX = playerXRef.current;
      const pY = playerYRef.current;
      const blockBottom = BLOCK_BASE_Y + BLOCK_H + blockBumpOffsetRef.current;
      const inXRange = pX + PLAYER_W >= BLOCK_WORLD_X - 18 && pX <= BLOCK_WORLD_X + BLOCK_W + 18;
      const hittingBottom = playerVyRef.current < 0 && pY <= blockBottom + 28 && pY >= blockBottom - 50;

      if (!chaseModeRef.current && hitCountRef.current < 3 && inXRange && hittingBottom && hitCooldownRef.current === 0) {
        triggerBlockHitRef.current();
      }

      if (blockBumpOffsetRef.current !== 0 || blockBumpVyRef.current !== 0) {
        blockBumpOffsetRef.current += blockBumpVyRef.current;
        blockBumpVyRef.current += 1.5;
        if (blockBumpOffsetRef.current >= 0) {
          blockBumpOffsetRef.current = 0;
          blockBumpVyRef.current = 0;
        }
      }

      const currentBlockY = BLOCK_BASE_Y + blockBumpOffsetRef.current;
      const cameraX = cameraXRef.current;

      coinsRef.current.forEach((coin) => {
        coin.y += coin.vy;
        coin.vy += 0.6;
        coin.rotation += 15;
        if (coin.vy > 0 && coin.y >= GROUND_Y - 10 && feetOnGround(coin.x - 8, coin.x + 8)) {
          coin.active = false;
        }
      });
      coinsRef.current = coinsRef.current.filter((c) => c.active);

      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.3;
        p.lifetime -= 0.04;
      });
      particlesRef.current = particlesRef.current.filter((p) => p.lifetime > 0);

      floatingTextsRef.current.forEach((ft) => {
        ft.y += ft.vy;
        ft.vy += 0.12;
        ft.lifetime -= 0.02;
      });
      floatingTextsRef.current = floatingTextsRef.current.filter((ft) => ft.lifetime > 0);

      const targetEmergenceY =
        hitCountRef.current === 0 ? 195 : hitCountRef.current === 1 ? 141 : hitCountRef.current === 2 ? 131 : 124;
      emergenceYRef.current += (targetEmergenceY - emergenceYRef.current) * 0.18;

      if (hitCountRef.current >= 3 && !prizeCaughtRef.current && !prizeRef.current) {
        prizeReleasedRef.current = true;
        blockUsedRef.current = true;
        chaseModeRef.current = true;
        prizeRef.current = {
          digit: secretNumberRef.current || 1,
          x: BLOCK_WORLD_X + BLOCK_W + 16,
          y: BLOCK_BASE_Y - 8,
          vx: PRIZE_RUN_SPEED,
          vy: PRIZE_KICK_VY,
          w: 48,
          h: 48,
          landed: false,
        };
        prizeCatchAtRef.current = performance.now() + 1400;
      }

      const prize = prizeRef.current;
      if (prize && !prizeCaughtRef.current && !failedRef.current) {
        const prizeGoalX = FINISH_X - 24;
        const atGoal = prize.x >= prizeGoalX;
        if (!atGoal) {
          prize.x += prize.vx || PRIZE_RUN_SPEED;
        } else {
          prize.x = prizeGoalX;
        }
        prize.vy += 0.75;
        prize.y += prize.vy;

        if (prize.y + prize.h >= GROUND_Y && feetOnGround(prize.x + 8, prize.x + prize.w - 8)) {
          prize.y = GROUND_Y - prize.h;
          prize.vy = 0;
          prize.landed = true;
        }

        if (!atGoal && prize.landed && !feetOnGround(prize.x + prize.w + 12, prize.x + prize.w + 20)) {
          prize.vy = -14;
          prize.landed = false;
        }

        const ahead = prize.x > playerXRef.current + PLAYER_W + PRIZE_MIN_LEAD;
        const canCatch = performance.now() >= prizeCatchAtRef.current && (ahead || atGoal);
        const hitPrize =
          playerXRef.current < prize.x + prize.w + 8 &&
          playerXRef.current + PLAYER_W > prize.x - 8 &&
          playerYRef.current < prize.y + prize.h + 8 &&
          playerYRef.current + PLAYER_H > prize.y - 8;
        const reachedGoal =
          atGoal && playerXRef.current + PLAYER_W >= prize.x - 12;
        if (canCatch && (hitPrize || reachedGoal)) {
          catchPrizeRef.current(prize.digit);
        }
      }

      // --- Draw ---
      ctx.fillStyle = '#1B8EFF';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);

      drawCloud(ctx, 40 - cameraX * 0.05, 95, 0.95);
      drawCloud(ctx, 180 - cameraX * 0.05, 125, 0.7);
      drawCloud(ctx, 310 - cameraX * 0.05, 90, 1.1);
      drawCloud(ctx, 460 - cameraX * 0.05, 115, 0.85);
      drawCloud(ctx, 560 - cameraX * 0.05, 95, 1.0);

      for (const seg of GROUND_SEGMENTS) {
        const sx = worldToScreen(seg.start, cameraX);
        const sw = seg.end - seg.start;
        if (sx + sw < -20 || sx > VIEW_W + 20) continue;

        ctx.fillStyle = '#00A040';
        ctx.fillRect(sx, GROUND_Y, sw, 60);
        ctx.fillStyle = '#00732C';
        ctx.fillRect(sx, GROUND_Y, sw, 4);

        ctx.fillStyle = '#00CB53';
        for (let wx = seg.start + 12; wx < seg.end - 8; wx += 24) {
          const studX = worldToScreen(wx, cameraX);
          if (studX < -10 || studX > VIEW_W + 10) continue;
          ctx.beginPath();
          ctx.ellipse(studX, 422, 6, 2.5, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Pit edges (brick lips)
      for (let i = 0; i < GROUND_SEGMENTS.length - 1; i++) {
        const pitLeft = GROUND_SEGMENTS[i].end;
        const pitRight = GROUND_SEGMENTS[i + 1].start;
        const lipL = worldToScreen(pitLeft - 8, cameraX);
        const lipR = worldToScreen(pitRight, cameraX);
        if (lipL > VIEW_W + 20 || lipR < -20) continue;
        ctx.fillStyle = '#795548';
        ctx.fillRect(lipL, GROUND_Y, 10, 14);
        ctx.fillRect(lipR - 10, GROUND_Y, 10, 14);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(worldToScreen(pitLeft, cameraX), GROUND_Y + 4, pitRight - pitLeft, 56);
      }

      SCENERY_BUSHES.forEach((wx) => {
        if (!isVisible(wx, 40, cameraX)) return;
        drawBush(ctx, worldToScreen(wx, cameraX), GROUND_Y, 0.85);
      });

      // Finish flag
      if (isVisible(FINISH_X, 60, cameraX)) {
        const fx = worldToScreen(FINISH_X, cameraX);
        ctx.save();
        ctx.fillStyle = '#C0C0C0';
        ctx.fillRect(fx, GROUND_Y - 210, 8, 210);
        ctx.fillStyle = '#000000';
        ctx.fillRect(fx - 1, GROUND_Y - 210, 10, 4);
        ctx.fillStyle = '#E2231A';
        ctx.beginPath();
        ctx.moveTo(fx + 8, GROUND_Y - 206);
        ctx.lineTo(fx + 58, GROUND_Y - 186);
        ctx.lineTo(fx + 8, GROUND_Y - 166);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '900 11px "Prompt", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('GOAL', fx + 12, GROUND_Y - 182);
        ctx.fillStyle = '#FFC400';
        ctx.fillRect(fx - 16, GROUND_Y - 8, 40, 8);
        ctx.restore();
      }

      const blockScreenX = worldToScreen(BLOCK_WORLD_X, cameraX);
      if (isVisible(BLOCK_WORLD_X, BLOCK_W, cameraX)) {
        ctx.save();
        if (blockUsedRef.current) {
          ctx.fillStyle = '#2C2D30';
          ctx.fillRect(blockScreenX, currentBlockY, BLOCK_W, BLOCK_H);
          ctx.fillStyle = '#404247';
          ctx.fillRect(blockScreenX + 10, currentBlockY - 4, 14, 4);
          ctx.fillRect(blockScreenX + 33, currentBlockY - 4, 14, 4);
          ctx.fillRect(blockScreenX + 56, currentBlockY - 4, 14, 4);
          ctx.strokeStyle = '#18191B';
          ctx.lineWidth = 4;
          ctx.strokeRect(blockScreenX, currentBlockY, BLOCK_W, BLOCK_H);
          ctx.fillStyle = '#60636B';
          ctx.font = 'bold 36px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('✓', blockScreenX + BLOCK_W / 2, currentBlockY + 52);
        } else {
          ctx.fillStyle = '#FFC400';
          ctx.fillRect(blockScreenX, currentBlockY, BLOCK_W, BLOCK_H);
          ctx.fillStyle = '#FFE57F';
          ctx.fillRect(blockScreenX + 10, currentBlockY - 5, 14, 5);
          ctx.fillRect(blockScreenX + 33, currentBlockY - 5, 14, 5);
          ctx.fillRect(blockScreenX + 56, currentBlockY - 5, 14, 5);
          ctx.fillStyle = '#FFE57F';
          ctx.fillRect(blockScreenX, currentBlockY, BLOCK_W, 5);
          ctx.fillRect(blockScreenX, currentBlockY, 5, BLOCK_H);
          ctx.fillStyle = '#CC9D00';
          ctx.fillRect(blockScreenX, currentBlockY + BLOCK_H - 5, BLOCK_W, 5);
          ctx.fillRect(blockScreenX + BLOCK_W - 5, currentBlockY, 5, BLOCK_H);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 4;
          ctx.strokeRect(blockScreenX, currentBlockY, BLOCK_W, BLOCK_H);
          drawQuestionMark(ctx, blockScreenX + BLOCK_W / 2, currentBlockY + 40, 1.15);
        }

        if (hitCountRef.current > 0 || prizeReleasedRef.current) {
          ctx.fillStyle = '#00FFFF';
          ctx.shadowColor = '#00FFFF';
          ctx.shadowBlur = hitCountRef.current === 3 || prizeReleasedRef.current ? 15 : 8;
          ctx.fillRect(blockScreenX + 12, currentBlockY - 3, BLOCK_W - 24, 5);
          ctx.shadowBlur = 0;
        }
        ctx.restore();

        if (hitCountRef.current > 0 && hitCountRef.current < 3 && !prizeRef.current) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(blockScreenX, 0, BLOCK_W, currentBlockY + 2);
          ctx.clip();
          const currentY = emergenceYRef.current;
          const hCount = hitCountRef.current;
          const auraScale = hCount === 1 ? 0.6 : 0.85;
          const numCenterX = blockScreenX + BLOCK_W / 2;
          ctx.save();
          ctx.translate(numCenterX, currentY + 18);
          const aura = ctx.createRadialGradient(0, 0, 2, 0, 0, 42 * auraScale);
          aura.addColorStop(0, 'rgba(255, 215, 0, 0.45)');
          aura.addColorStop(0.5, 'rgba(0, 229, 255, 0.25)');
          aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = aura;
          ctx.beginPath();
          ctx.arc(0, 0, 42 * auraScale, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          drawPixelBanner(ctx, String(secretNumberRef.current), numCenterX, currentY, 5.2);
          ctx.restore();
        }
      }

      if (prizeRef.current) {
        const item = prizeRef.current;
        const ix = worldToScreen(item.x, cameraX);
        const iy = item.y;
        ctx.save();
        ctx.fillStyle = '#FFC400';
        ctx.fillRect(ix, iy, item.w, item.h);
        ctx.fillStyle = '#FFE57F';
        ctx.fillRect(ix, iy, item.w, 5);
        ctx.fillRect(ix, iy, 5, item.h);
        ctx.fillStyle = '#CC9D00';
        ctx.fillRect(ix, iy + item.h - 5, item.w, 5);
        ctx.fillRect(ix + item.w - 5, iy, 5, item.h);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.strokeRect(ix, iy, item.w, item.h);
        drawPixelBanner(ctx, String(item.digit), ix + item.w / 2, iy + 6, 4.6);
        ctx.restore();
      }

      coinsRef.current.forEach((coin) => {
        const cx = worldToScreen(coin.x, cameraX);
        ctx.save();
        ctx.translate(cx, coin.y);
        const scale = Math.abs(Math.cos((coin.rotation * Math.PI) / 180));
        const w = Math.max(4, 18 * scale);
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.ellipse(0, 0, w, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#B8860B';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      });

      particlesRef.current.forEach((p) => {
        const px = worldToScreen(p.x, cameraX);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.lifetime);
        ctx.fillRect(px, p.y, p.size, p.size);
        ctx.globalAlpha = 1.0;
      });

      floatingTextsRef.current.forEach((ft) => {
        const fx = worldToScreen(ft.x, cameraX);
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = '900 36px Impact, "Arial Black", monospace, sans-serif';
        ctx.globalAlpha = Math.max(0, ft.lifetime);
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#000000';
        ctx.strokeText(ft.text, fx, ft.y);
        ctx.fillStyle = '#FFE033';
        ctx.fillText(ft.text, fx, ft.y);
        ctx.restore();
      });

      drawPlayerCharacter(
        ctx,
        worldToScreen(playerXRef.current, cameraX),
        playerYRef.current,
        facingRightRef.current,
        playerIsGroundedRef.current,
        isMovingRef.current,
        animFrameRef.current
      );

      drawPixelBanner(ctx, 'MINDDOJO', 320, 18, 5);
      drawPixelBanner(ctx, 'WORKTECH EXPO', 320, 62, 3.4);

      if (!prizeCaughtRef.current && !failedRef.current) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = '900 14px "Prompt", sans-serif';
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#000000';
        ctx.fillStyle = '#FFFFFF';
        let hint = 'กระโดดโหม่งกล่อง 3 ครั้ง!';
        if (jumpLockRef.current && !chaseModeRef.current) {
          hint = 'ของรางวัลออกแล้ว! รอลงพื้น';
        } else if (prizeReleasedRef.current) {
          hint = 'วิ่งตามไปแตะเลข!';
        } else if (hitCountRef.current === 1) {
          hint = 'โหม่งอีก 2 ครั้ง!';
        } else if (hitCountRef.current === 2) {
          hint = 'โหม่งอีก 1 ครั้ง แล้ววิ่งตามแตะเลข!';
        }
        ctx.strokeText(hint, 320, 108);
        ctx.fillText(hint, 320, 108);
        ctx.restore();
      }

      if (chaseModeRef.current && !prizeCaughtRef.current && !failedRef.current) {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(8, 118, 168, 28);
        ctx.fillStyle = '#FFE033';
        ctx.font = 'bold 13px "Prompt", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('▶ วิ่งตามแตะเลข', 16, 137);
        ctx.restore();
      }
      } catch (err) {
        console.warn('prize-catch frame error', err);
      } finally {
        animId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  // Helper Roblox Blocky Avatar character renderer
  function drawPlayerCharacter(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    facingRight: boolean,
    isGrounded: boolean,
    isMoving: boolean,
    animFrame: number
  ) {
    ctx.save();
    const pw = PLAYER_W;
    const ph = PLAYER_H;

    // Roblox Blocky Palette
    const YELLOW_HEAD = '#FFE600';
    const YELLOW_ARM = '#FFE600';
    const BLUE_TORSO = '#0084FF';
    const GREEN_LEG = '#00D26A';
    const BLACK = '#000000';

    const walkCycle = Math.floor(animFrame / 5) % 2;

    // 1. LEGS (Green Roblox Blocky Legs)
    ctx.fillStyle = GREEN_LEG;
    if (!isGrounded) {
      // Classic Roblox R6 Jump Leg Pose (Legs split outward)
      ctx.fillRect(px + 6, py + 36, 11, 16);
      ctx.fillRect(px + 27, py + 36, 11, 16);

      ctx.strokeStyle = BLACK;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(px + 6, py + 36, 11, 16);
      ctx.strokeRect(px + 27, py + 36, 11, 16);
    } else if (isMoving) {
      // Walk animation: leg stride
      const lLegY = walkCycle === 0 ? py + 34 : py + 37;
      const rLegY = walkCycle === 0 ? py + 37 : py + 34;

      ctx.fillRect(px + 10, lLegY, 11, 15);
      ctx.fillRect(px + 23, rLegY, 11, 15);

      ctx.strokeStyle = BLACK;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(px + 10, lLegY, 11, 15);
      ctx.strokeRect(px + 23, rLegY, 11, 15);
    } else {
      // Standing
      ctx.fillRect(px + 10, py + 36, 11, 16);
      ctx.fillRect(px + 23, py + 36, 11, 16);

      ctx.strokeStyle = BLACK;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(px + 10, py + 36, 11, 16);
      ctx.strokeRect(px + 23, py + 36, 11, 16);

      // Leg Divider Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(px + 21, py + 36, 2, 16);
    }

    // 2. TORSO (Blue Roblox Blocky Torso)
    const torsoX = px + 10;
    const torsoY = py + 16;
    const torsoW = 24;
    const torsoH = 20;

    // Main Torso Box
    ctx.fillStyle = BLUE_TORSO;
    ctx.fillRect(torsoX, torsoY, torsoW, torsoH);

    // Torso 3D Top Highlight & Bottom Shadow
    ctx.fillStyle = '#33A0FF';
    ctx.fillRect(torsoX, torsoY, torsoW, 3);
    ctx.fillStyle = '#0062CC';
    ctx.fillRect(torsoX, torsoY + torsoH - 3, torsoW, 3);

    // Roblox "R" Chest Badge
    const logoX = facingRight ? torsoX + 13 : torsoX + 4;
    const logoY = torsoY + 4;
    ctx.fillStyle = BLACK;
    ctx.fillRect(logoX, logoY, 7, 7);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(logoX + 2, logoY + 1, 3, 5);
    ctx.fillStyle = BLACK;
    ctx.fillRect(logoX + 3, logoY + 2, 2, 1);

    // Torso Black Outline
    ctx.strokeStyle = BLACK;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(torsoX, torsoY, torsoW, torsoH);

    // 3. ARMS (Yellow Roblox Blocky Arms)
    if (!isGrounded) {
      // Jump Pose: Arms raised angled up/outward
      ctx.fillStyle = YELLOW_ARM;
      ctx.fillRect(px + 1, py + 10, 8, 18);
      ctx.strokeStyle = BLACK;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(px + 1, py + 10, 8, 18);

      ctx.fillRect(px + 35, py + 10, 8, 18);
      ctx.strokeRect(px + 35, py + 10, 8, 18);
    } else if (isMoving) {
      // Walk animation: arm swing
      const lArmY = walkCycle === 0 ? py + 18 : py + 14;
      const rArmY = walkCycle === 0 ? py + 14 : py + 18;

      ctx.fillStyle = YELLOW_ARM;
      ctx.fillRect(px + 2, lArmY, 8, 18);
      ctx.fillRect(px + 34, rArmY, 8, 18);

      ctx.strokeStyle = BLACK;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(px + 2, lArmY, 8, 18);
      ctx.strokeRect(px + 34, rArmY, 8, 18);
    } else {
      // Standing Arms
      ctx.fillStyle = YELLOW_ARM;
      ctx.fillRect(px + 2, py + 16, 8, 18);
      ctx.fillRect(px + 34, py + 16, 8, 18);

      ctx.strokeStyle = BLACK;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(px + 2, py + 16, 8, 18);
      ctx.strokeRect(px + 34, py + 16, 8, 18);

      // Arm 3D Highlight
      ctx.fillStyle = '#FFF266';
      ctx.fillRect(px + 2, py + 16, 8, 2);
      ctx.fillRect(px + 34, py + 16, 8, 2);
    }

    // 4. HEAD (Yellow Roblox Blocky Head with Stud & Classic Smile)
    const headX = px + 12;
    const headY = py;
    const headW = 20;
    const headH = 16;

    // Head Block
    ctx.fillStyle = YELLOW_HEAD;
    ctx.fillRect(headX, headY, headW, headH);

    // Head 3D Highlight & Shadow
    ctx.fillStyle = '#FFF566';
    ctx.fillRect(headX, headY, headW, 3);
    ctx.fillStyle = '#D6C000';
    ctx.fillRect(headX, headY + headH - 2, headW, 2);

    // Roblox Stud on top of head
    ctx.fillStyle = YELLOW_HEAD;
    ctx.fillRect(headX + 6, headY - 3, 8, 3);
    ctx.fillStyle = '#FFF566';
    ctx.fillRect(headX + 6, headY - 3, 8, 1);
    ctx.strokeStyle = BLACK;
    ctx.lineWidth = 1;
    ctx.strokeRect(headX + 6, headY - 3, 8, 3);

    // Head Outline
    ctx.strokeStyle = BLACK;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(headX, headY, headW, headH);

    // Classic Roblox Face (Eyes + Smile)
    ctx.fillStyle = BLACK;
    const eyeY = headY + 5;
    if (facingRight) {
      ctx.fillRect(headX + 8, eyeY, 3, 3); // left eye
      ctx.fillRect(headX + 15, eyeY, 3, 3); // right eye
      // Smile
      ctx.fillRect(headX + 7, headY + 10, 10, 2);
      ctx.fillRect(headX + 7, headY + 9, 2, 1);
      ctx.fillRect(headX + 15, headY + 9, 2, 1);
    } else {
      ctx.fillRect(headX + 2, eyeY, 3, 3); // left eye
      ctx.fillRect(headX + 9, eyeY, 3, 3); // right eye
      // Smile
      ctx.fillRect(headX + 3, headY + 10, 10, 2);
      ctx.fillRect(headX + 3, headY + 9, 2, 1);
      ctx.fillRect(headX + 11, headY + 9, 2, 1);
    }

    ctx.restore();
  }

  // Helper crisp 8-bit vector Roblox Question Mark renderer
  function drawQuestionMark(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    scale = 1.0
  ) {
    ctx.save();
    
    // Pixel geometry for perfect un-flipped Roblox Question Mark
    const renderQ = (ox: number, oy: number, color: string) => {
      ctx.fillStyle = color;
      const s = scale;
      // Top bar
      ctx.fillRect(centerX - 12 * s + ox, centerY - 20 * s + oy, 24 * s, 6 * s);
      // Left top arc
      ctx.fillRect(centerX - 12 * s + ox, centerY - 14 * s + oy, 6 * s, 8 * s);
      // Right top arc going down
      ctx.fillRect(centerX + 6 * s + ox, centerY - 14 * s + oy, 6 * s, 12 * s);
      // Middle curve returning back left
      ctx.fillRect(centerX + ox, centerY - 2 * s + oy, 12 * s, 6 * s);
      // Center vertical stem
      ctx.fillRect(centerX - 2 * s + ox, centerY + 4 * s + oy, 6 * s, 8 * s);
      // Bottom dot
      ctx.fillRect(centerX - 2 * s + ox, centerY + 16 * s + oy, 6 * s, 6 * s);
    };

    // 1. Black 3D Drop Shadow
    renderQ(2.5, 2.5, '#000000');
    // 2. Pure White Front
    renderQ(0, 0, '#FFFFFF');

    ctx.restore();
  }

  // Helper Roblox Voxel Cloud Renderer
  function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1.0) {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.strokeStyle = 'rgba(180, 210, 255, 0.9)';
    ctx.lineWidth = 2;

    const w = 70 * scale;
    const h = 22 * scale;
    // Main voxel block
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    // Top stacked voxel block
    ctx.fillRect(x + 15 * scale, y - 12 * scale, 40 * scale, 12 * scale);
    ctx.strokeRect(x + 15 * scale, y - 12 * scale, 40 * scale, 12 * scale);
    // Top mini stud block
    ctx.fillRect(x + 25 * scale, y - 18 * scale, 20 * scale, 6 * scale);

    // Subtle 3D bottom shadow
    ctx.fillStyle = 'rgba(180, 200, 230, 0.6)';
    ctx.fillRect(x, y + h - 3, w, 3);
    ctx.restore();
  }

  // Helper Roblox Obby Blocky Tree / Pillar Renderer
  function drawBush(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1.0) {
    ctx.save();
    // Blocky Roblox Tree Trunk
    const trunkW = 14 * scale;
    const trunkH = 35 * scale;
    const trunkX = x - trunkW / 2;
    const trunkY = y - trunkH;

    // Brown Wood Block Trunk
    ctx.fillStyle = '#795548';
    ctx.fillRect(trunkX, trunkY, trunkW, trunkH);
    ctx.strokeStyle = '#3E2723';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(trunkX, trunkY, trunkW, trunkH);

    // Neon Roblox Green Foliage (2 stacked blocky cubes)
    ctx.fillStyle = '#00E676';
    const leafW1 = 40 * scale;
    const leafH1 = 20 * scale;
    ctx.fillRect(x - leafW1 / 2, trunkY - leafH1 + 5, leafW1, leafH1);
    ctx.strokeStyle = '#00A152';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x - leafW1 / 2, trunkY - leafH1 + 5, leafW1, leafH1);

    ctx.fillStyle = '#00C853';
    const leafW2 = 30 * scale;
    const leafH2 = 16 * scale;
    ctx.fillRect(x - leafW2 / 2, trunkY - leafH1 - leafH2 + 8, leafW2, leafH2);
    ctx.strokeRect(x - leafW2 / 2, trunkY - leafH1 - leafH2 + 8, leafW2, leafH2);

    // Roblox Top Stud
    ctx.fillStyle = '#69F0AE';
    ctx.fillRect(x - 6 * scale, trunkY - leafH1 - leafH2 + 4, 12 * scale, 4 * scale);

    ctx.restore();
  }



  // Helper 8-bit Huge Pixel Banner renderer
  function drawPixelBanner(
    ctx: CanvasRenderingContext2D,
    text: string,
    centerX: number,
    startY: number,
    pixelSize: number = 10
  ) {
    const charWidth = 5;
    const charGap = 1.5;
    const totalGridWidth = text.length * (charWidth + charGap) - charGap;
    const startX = Math.round(centerX - (totalGridWidth * pixelSize) / 2);

    ctx.save();

    // Helper to render one full text pass with given pixel offsets and colors
    const renderPass = (
      offsetX: number,
      offsetY: number,
      colorFn: (r: number, c: number) => string
    ) => {
      let charIdx = 0;
      for (const ch of text.toUpperCase()) {
        const glyph = PIXEL_FONT[ch];
        if (glyph) {
          const charStartX = startX + charIdx * (charWidth + charGap) * pixelSize + offsetX;
          for (let r = 0; r < glyph.length; r++) {
            for (let c = 0; c < glyph[r].length; c++) {
              if (glyph[r][c] === 1) {
                ctx.fillStyle = colorFn(r, c);
                ctx.fillRect(
                  charStartX + c * pixelSize,
                  startY + offsetY + r * pixelSize,
                  pixelSize,
                  pixelSize
                );
              }
            }
          }
        }
        charIdx++;
      }
    };

    // 1. Solid Black Pixel Drop Shadow (3D Extrusion)
    renderPass(pixelSize, pixelSize, () => '#000000');

    // 2. Crisp Black Pixel Outline
    const outlines = [
      [-1, 0], [1, 0], [0, -1], [0, 1]
    ];
    for (const [ox, oy] of outlines) {
      renderPass(ox * pixelSize, oy * pixelSize, () => '#000000');
    }

    // 3. Roblox Iconic Red & White Palette
    const rowColors = [
      '#FFFFFF', // row 0: Pure White Top Highlight
      '#FFFFFF', // row 1: Pure White Top Highlight
      '#FF332A', // row 2: Roblox Vibrant Red
      '#E2231A', // row 3: Roblox Classic Red
      '#E2231A', // row 4: Roblox Classic Red
      '#B81810', // row 5: Dark Red Shadow Base
      '#660A05', // row 6: Deep Shadow Base
    ];

    renderPass(0, 0, (r) => rowColors[r] || '#E2231A');

    ctx.restore();
  }

  // Handle Simulation Jump Trigger
  const handleSimulateJump = () => {
    setSimulationMode(true);
    handleCharacterJump();
  };

  // On-screen Touch / Button Movement Handlers
  const handleMoveLeft = () => {
    if (chaseModeRef.current) return;
    playerXRef.current = Math.max(40, playerXRef.current - 35);
    facingRightRef.current = false;
    isMovingRef.current = true;
  };

  const handleMoveRight = () => {
    playerXRef.current = Math.min(WORLD_W - PLAYER_W - 20, playerXRef.current + 35);
    facingRightRef.current = true;
    isMovingRef.current = true;
  };

  const handleCharacterJump = () => {
    if (failedRef.current || showFail || jumpLockRef.current) return;
    if (playerIsGroundedRef.current) {
      playerVyRef.current = -19;
      playerIsGroundedRef.current = false;
      isJumpingRef.current = true;
    }
  };

  const resetPhysics = () => {
    emergenceYRef.current = 195;
    setBlockIsUsed(false);
    setHitCount(0);
    hitCountRef.current = 0;
    setWonNumber(null);
    setSavingNumber(false);
    setCoinsCount(0);
    setPrizeReleased(false);
    setShowFail(false);
    prizeReleasedRef.current = false;
    prizeCaughtRef.current = false;
    prizeRef.current = null;
    chaseModeRef.current = false;
    failedRef.current = false;
    pendingPrizeRef.current = false;
    pendingPrizeAtRef.current = 0;
    blockUsedRef.current = false;
    jumpLockRef.current = false;
    prizeCatchAtRef.current = 0;
    cameraXRef.current = 0;
    playerXRef.current = BLOCK_WORLD_X + BLOCK_W / 2 - PLAYER_W / 2;
    playerYRef.current = GROUND_Y - PLAYER_H;
    playerVyRef.current = 0;
    playerIsGroundedRef.current = true;
  };

  const resetBlock = () => {
    resetPhysics();
    void onNeedNextNumber();
  };

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto space-y-4">
      {/* Main Game Stage Container */}
      <div
        ref={stageContainerRef}
        className={`relative w-full overflow-hidden bg-slate-900 transition-all flex items-center justify-center [&:fullscreen]:w-screen [&:fullscreen]:h-screen [&:fullscreen]:bg-slate-950 [&:fullscreen]:p-0 ${
          isFullscreen
            ? 'fixed inset-0 z-50 rounded-none w-screen h-screen bg-slate-950 p-0 border-0 ring-0'
            : 'rounded-3xl border-4 border-black ring-4 ring-yellow-400/80 shadow-[0_20px_50px_rgba(0,0,0,0.7)] aspect-[4/3]'
        }`}
      >
        <div className={`relative w-full h-full flex items-center justify-center ${isFullscreen ? 'p-0' : 'p-1 md:p-2'}`}>
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            className="w-full h-full max-w-full max-h-full"
            style={{
              width: '100%',
              height: '100%',
              maxWidth: '100%',
              maxHeight: '100%',
              aspectRatio: isFullscreen ? 'unset' : '4 / 3',
              objectFit: isFullscreen ? 'fill' : 'contain'
            }}
          />
        </div>

        {/* Top-Right Floating Fullscreen Toggle Button */}
        <button
          onClick={toggleFullscreen}
          className="absolute top-4 right-4 z-30 p-2.5 bg-black/80 hover:bg-black text-yellow-300 hover:text-yellow-200 border-2 border-yellow-400/70 hover:border-yellow-300 rounded-xl backdrop-blur-md shadow-xl transition-all active:scale-95 flex items-center justify-center"
          title={isFullscreen ? 'ออกจากหน้าจอเต็ม (Exit Fullscreen)' : 'ขยายเต็มจอ (Fullscreen)'}
        >
          {isFullscreen ? (
            <Minimize2 className="w-5 h-5" />
          ) : (
            <Maximize2 className="w-5 h-5" />
          )}
        </button>

        {/* Floating Webcam PIP with Live Video Feed ONLY (No text overlays) */}
        {cameraOn && !cameraError && (
          <div
            onClick={() => setPipLarge(!pipLarge)}
            className={`absolute bottom-4 right-4 rounded-2xl border-4 border-white overflow-hidden shadow-2xl bg-black cursor-pointer z-20 transition-all duration-300 ${
              pipLarge ? 'w-72 h-52' : 'w-52 h-36'
            }`}
            title="Click to resize camera"
          >
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="w-full h-full object-cover -scale-x-100"
            />
          </div>
        )}

        {/* Camera Permission Alert Banner if needed */}
        {cameraError && (
          <div className="absolute top-4 inset-x-4 bg-yellow-400 text-slate-950 px-4 py-3 rounded-2xl border-2 border-black font-medium shadow-xl flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs">
              <Camera className="w-4 h-4 shrink-0" />
              <span className="font-bold">{cameraError}</span>
            </div>
            <button
              onClick={handleSimulateJump}
              className="px-3.5 py-1.5 bg-black text-yellow-400 hover:bg-slate-900 rounded-xl text-xs font-black transition shadow-md"
            >
              Simulate Jump
            </button>
          </div>
        )}

        {showFail && (
          <div className="absolute inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
            <div className="flex flex-col items-center gap-6">
              <PixelNumberDisplay text="FAIL" pixelSize={10} />
              <p className="text-sm font-black uppercase tracking-[0.3em] text-red-400">ตกหลุม — แพ้แล้ว</p>
              <button
                type="button"
                onClick={() => {
                  resetBlock();
                  setShowFail(false);
                }}
                className="px-8 py-3 bg-[#E2231A] hover:bg-[#FF2E24] text-white font-black text-lg rounded-2xl border-2 border-black shadow-[3px_3px_0_0_#000]"
              >
                ลองใหม่
              </button>
            </div>
          </div>
        )}

        {/* Roblox Theme Victory Popup Modal Overlay */}
        {showModal && (
          <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
            {/* Roblox Dark Glass Card Container */}
            <div className="relative w-full max-w-sm sm:max-w-md bg-[#191B1D] border-4 border-[#3A3D45] rounded-3xl p-2 shadow-[0_25px_60px_rgba(0,0,0,0.9)] select-none">
              
              {/* Inner Dark Card */}
              <div className="bg-[#232527] border-2 border-[#3A3D45] rounded-2xl p-4 flex flex-col items-center space-y-4 relative">

                {/* Roblox Lucky Block Title Card */}
                <div className="flex items-center space-x-3 bg-[#111216] border-2 border-[#FFC400] rounded-2xl p-3 w-full justify-center shadow-md">
                  {/* Roblox Lucky Block Icon */}
                  <div className="w-10 h-10 bg-[#FFC400] border-2 border-black rounded-lg relative flex items-center justify-center shadow-[2px_2px_0_0_#000] shrink-0">
                    <span className="font-mono font-black text-black text-2xl animate-bounce">?</span>
                    <div className="absolute -top-1 inset-x-1 h-1 bg-[#FFE57F] rounded-t" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-sans font-black text-2xl text-yellow-400 tracking-wide">
                      ชนะแล้ว
                    </h3>
                    <p className="mt-1 text-sm font-bold text-white">
                      ยินดีด้วย รับของรางวัลได้เลย
                    </p>
                  </div>
                </div>

                {/* Central Display: Revealed Secret Number */}
                <div className="w-full bg-[#111216] border-2 border-[#FFC400] rounded-2xl p-4 flex flex-col items-center justify-center relative shadow-[inset_0_0_15px_rgba(255,196,0,0.2)]">
                  {/* Single Revealed Number Card */}
                  <div className="bg-[#1A1C20] border-2 border-yellow-400 rounded-2xl px-6 py-3 flex flex-col items-center shadow-xl my-1 z-10 transform hover:scale-105 transition">
                    <PixelNumberDisplay text={`#${wonNumber ?? secretNumber}`} pixelSize={8} />
                    {savingNumber ? (
                      <p className="mt-2 text-[11px] font-bold text-yellow-300">กำลังบันทึกเลข...</p>
                    ) : null}
                  </div>
                </div>

                {/* Single Action Button: เริ่มใหม่ (Roblox Red) */}
                <button
                  onClick={() => {
                    confetti({
                      particleCount: 50,
                      spread: 80,
                      origin: { x: 0.5, y: 0.5 },
                    });
                    resetBlock();
                    setShowModal(false);
                  }}
                  disabled={savingNumber}
                  className="w-full py-3.5 bg-[#E2231A] hover:bg-[#FF2E24] active:bg-[#B81810] text-[#FFFFFF] font-extrabold text-base sm:text-lg rounded-2xl border-2 border-black shadow-[3px_3px_0_0_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center tracking-wider"
                >
                  เริ่มใหม่
                </button>

              </div>
            </div>
          </div>
        )}
      </div>

      {/* On-Screen D-Pad & Keyboard Controls Helper */}
      <div className="w-full bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-700/80 p-3.5 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-black text-yellow-400 bg-black/60 px-3 py-1.5 rounded-xl border border-yellow-400/40 uppercase tracking-wide">
            🎮 กระโดดตามถึงเส้นชัย
          </span>
          <span className="text-[11px] text-slate-400 hidden sm:inline font-mono">
            โหม่ง 3 ครั้ง → กระโดดข้ามหลุมถึงธง | <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-slate-200">Space</kbd> กระโดด — ตกหลุม = FAIL
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleMoveLeft}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-100 font-extrabold text-xs rounded-xl border border-slate-600 shadow-md transition-all active:scale-95 flex items-center space-x-1.5"
            title="Walk Character Left"
          >
            <span>⬅️ Left</span>
          </button>

          <button
            onClick={handleCharacterJump}
            className="px-5 py-2 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-slate-950 font-black text-xs rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-y-0.5 active:shadow-none flex items-center space-x-1.5"
            title="Jump Character Upwards"
          >
            <span>🦘 JUMP!</span>
          </button>

          <button
            onClick={handleMoveRight}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-100 font-extrabold text-xs rounded-xl border border-slate-600 shadow-md transition-all active:scale-95 flex items-center space-x-1.5"
            title="Walk Character Right"
          >
            <span>Right ➡️</span>
          </button>
        </div>
      </div>

      {/* Interactive Control Deck with Tactile Pill Buttons */}
      <div className="w-full bg-slate-900/95 backdrop-blur-lg rounded-2xl border-2 border-slate-700/80 p-4 shadow-2xl flex flex-wrap items-center justify-between gap-3">
        {/* Toggle Camera, Fullscreen & Debug HUD */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCameraOn(!cameraOn)}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-full text-xs font-extrabold transition-all shadow-md ${
              cameraOn
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600'
            }`}
          >
            {cameraOn ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
            <span>{cameraOn ? 'CAMERA ON' : 'CAMERA OFF'}</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-full text-xs font-extrabold transition-all shadow-md ${
              isFullscreen
                ? 'bg-amber-400 text-slate-950 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600'
            }`}
            title={isFullscreen ? 'ออกจากหน้าจอเต็ม (Exit Fullscreen)' : 'ขยายเกมเต็มจอ (Fullscreen)'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span>{isFullscreen ? 'ย่อหน้าจอ' : 'ขยายเต็มจอ'}</span>
          </button>

          <button
            onClick={() => setDebugMode(!debugMode)}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all ${
              debugMode
                ? 'bg-cyan-500/20 text-cyan-300 border-2 border-cyan-400/60 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
            }`}
          >
            {debugMode ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            <span>DEBUG HUD</span>
          </button>
        </div>

        <p className="text-xs font-black text-amber-300 bg-black/60 px-3 py-1.5 rounded-xl border border-amber-400/40">
            โหม่ง 3 ครั้ง แล้วกระโดดตามถึงเส้นชัย — ตกหลุม = FAIL
        </p>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleSimulateJump}
            className="flex items-center space-x-2 px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 rounded-full text-xs font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] border-2 border-black transition-all active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
            title="Trigger a virtual jump to bump the block"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>TEST JUMP!</span>
          </button>

          <button
            onClick={resetBlock}
            className="flex items-center space-x-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-full text-xs font-bold border border-slate-600 transition"
            title="Reset block state"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Number History Strip */}
      {assignedHistory.length > 0 && (
        <div className="w-full bg-slate-900/90 border-2 border-slate-700/80 rounded-2xl p-3 shadow-xl flex items-center space-x-3 overflow-x-auto">
          <div className="flex items-center space-x-1.5 text-xs font-black text-yellow-400 shrink-0">
            <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
            <span>เลขที่แจกไปแล้ว ({assignedHistory.length}):</span>
          </div>
          <div className="flex items-center space-x-2 overflow-x-auto py-0.5">
            {[...assignedHistory].reverse().map((num, idx) => (
              <span
                key={`${num}-${idx}`}
                className={`px-3 py-1 rounded-xl text-xs font-black border font-mono shrink-0 ${
                  idx === 0
                    ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 border-black shadow-md scale-105'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                #{num}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
