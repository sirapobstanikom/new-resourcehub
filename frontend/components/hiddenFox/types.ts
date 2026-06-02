export type GamePhase = 'idle' | 'registering' | 'playing' | 'submitted' | 'gameover';

export interface WolfPosition {
  x: number;
  y: number;
  /** รูปจิ้งจอกแต่ละตัว (V1–V8) */
  imageUrl?: string;
}

export interface GuessPosition {
  x: number;
  y: number;
  aspect?: number;
}

export interface GameMap {
  id: string;
  name: string;
  url: string;
  wolfPositions: WolfPosition[];
}

export interface GameSettings {
  wolfCount: number;
  precision: number;
  timeLimit: number;
  activeMapId: string;
  maps: GameMap[];
}

export interface RegistrationInfo {
  name: string;
  email: string;
  company: string;
}

export interface RoundResult {
  isCorrect: boolean;
  distance: number;
  time: number;
  score: number;
}

/** Stored in localStorage — `time` field holds final score (legacy key name). */
export interface LeaderboardEntry {
  name: string;
  time: number;
  date: string;
}
