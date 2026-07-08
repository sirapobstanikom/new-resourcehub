import { ELEVATE_CASE_A, type ElevateCaseContent } from './ElevateAnswerKeySections';
import { ELEVATE_CASE_B } from './elevateCaseB';
import { ELEVATE_CASE_C } from './elevateCaseC';

export type ElevateCaseId = 'case-a' | 'case-b' | 'case-c';

export type ElevateCaseOption = {
  id: ElevateCaseId;
  code: string;
  subtitle: string;
  hint: string;
};

export const ELEVATE_CASE_OPTIONS: ElevateCaseOption[] = [
  {
    id: 'case-a',
    code: 'CASE A',
    subtitle: 'Thanaburi · Full Canvas Answer Key',
    hint: 'Day 1 + Day 2 · all canvases · Michelin × MindDojo',
  },
  {
    id: 'case-b',
    code: 'CASE B',
    subtitle: 'Beihan · Full Canvas Answer Key',
    hint: 'Day 1 + Day 2 · all canvases · Michelin × MindDojo',
  },
  {
    id: 'case-c',
    code: 'CASE C',
    subtitle: 'Valterra · Full Canvas Answer Key',
    hint: 'Day 1 + Day 2 · all canvases · Michelin × MindDojo',
  },
];

const CASE_CONTENT: Partial<Record<ElevateCaseId, ElevateCaseContent>> = {
  'case-a': ELEVATE_CASE_A,
  'case-b': ELEVATE_CASE_B,
  'case-c': ELEVATE_CASE_C,
};

export function getElevateCaseContent(id: ElevateCaseId): ElevateCaseContent | null {
  return CASE_CONTENT[id] ?? null;
}

export function isElevateCaseId(value: string): value is ElevateCaseId {
  return ELEVATE_CASE_OPTIONS.some((option) => option.id === value);
}

export function getElevateCaseOption(id: ElevateCaseId): ElevateCaseOption | undefined {
  return ELEVATE_CASE_OPTIONS.find((option) => option.id === id);
}
