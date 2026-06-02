export type GamePhase = 'idle' | 'registering' | 'playing' | 'submitted' | 'gameover';

export interface WolfPosition {
  x: number;
  y: number;
  imageUrl?: string;
}

export interface GuessPosition {
  x: number;
  y: number;
  aspect?: number;
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
