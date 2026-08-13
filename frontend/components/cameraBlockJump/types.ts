export interface DebugInfo {
  poseDetected: boolean;
  isJumping: boolean;
  headX: number;
  headY: number;
  blockState: 'READY' | 'USED';
  mode: 'SINGLE_HIT' | 'MULTI_HIT';
  fps: number;
}

export interface Coin {
  id: number;
  x: number;
  y: number;
  vy: number;
  rotation: number;
  active: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  lifetime: number;
}
