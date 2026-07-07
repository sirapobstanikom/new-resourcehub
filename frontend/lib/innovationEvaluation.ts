export const INNOVATION_EVALUATION_SQL = `-- Run in Supabase SQL Editor: backend/supabase/create_innovation_evaluation.sql`;

export const EVALUATORS = [
  { id: 'keita_ono', name: 'Dr. Keita Ono' },
  { id: 'jeerawat_yaowanich', name: 'Jeerawat Yaowanich' },
] as const;

export type EvaluatorId = (typeof EVALUATORS)[number]['id'];

export const SCORE_FIELDS = [
  'score_business_clarity',
  'score_open_innovation',
  'score_idea_value',
  'score_feasibility',
  'score_pitching_quality',
] as const;

export type ScoreField = (typeof SCORE_FIELDS)[number];

export const CRITERIA: {
  field: ScoreField;
  label: string;
  weight: number;
  maxPoints: number;
}[] = [
  {
    field: 'score_business_clarity',
    label: 'ความชัดเจนของโจทย์หรือโอกาสทางธุรกิจ',
    weight: 20,
    maxPoints: 20,
  },
  {
    field: 'score_open_innovation',
    label: 'การเชื่อมโยงกับ Open Innovation / แหล่งนวัตกรรมภายนอก',
    weight: 30,
    maxPoints: 30,
  },
  {
    field: 'score_idea_value',
    label: 'คุณค่าของไอเดียและผลกระทบที่คาดว่าจะเกิดขึ้น',
    weight: 20,
    maxPoints: 20,
  },
  {
    field: 'score_feasibility',
    label: 'ความเป็นไปได้ในการทดลองและนำไปใช้จริง',
    weight: 20,
    maxPoints: 20,
  },
  {
    field: 'score_pitching_quality',
    label: 'คุณภาพการนำเสนอและความน่าสนใจของ Pitching',
    weight: 10,
    maxPoints: 10,
  },
];

export type InnovationScores = Record<ScoreField, number>;

export const EMPTY_SCORES: InnovationScores = {
  score_business_clarity: 0,
  score_open_innovation: 0,
  score_idea_value: 0,
  score_feasibility: 0,
  score_pitching_quality: 0,
};

export function criterionPoints(score: number, weight: number): number {
  if (!score || score < 1 || score > 5) return 0;
  return (score / 5) * weight;
}

export function calcTotalScore(scores: InnovationScores): number {
  return CRITERIA.reduce((sum, criterion) => sum + criterionPoints(scores[criterion.field], criterion.weight), 0);
}

export function formatInnovationScore(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : '0.00';
}

export function getEvaluatorName(evaluatorId: string): string {
  return EVALUATORS.find((item) => item.id === evaluatorId)?.name || evaluatorId;
}

export type InnovationEvaluatee = {
  id: string;
  name: string;
  team_name: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
};

export type InnovationResponseRow = InnovationScores & {
  id: number;
  evaluatee_id: string;
  evaluator_id: EvaluatorId;
  total_score: number;
  note: string | null;
  created_at: string;
  updated_at?: string;
};

export type EvaluateeSummary = {
  evaluateeId: string;
  name: string;
  teamName: string;
  keitaScore: number | null;
  jeerawatScore: number | null;
  finalScore: number | null;
  keitaCriteria: Partial<InnovationScores> | null;
  jeerawatCriteria: Partial<InnovationScores> | null;
  responseCount: number;
};

export function buildEvaluateeSummaries(
  evaluatees: InnovationEvaluatee[],
  responses: InnovationResponseRow[],
): EvaluateeSummary[] {
  return evaluatees
    .filter((item) => item.is_active)
    .map((evaluatee) => {
      const related = responses.filter((row) => row.evaluatee_id === evaluatee.id);
      const keita = related.find((row) => row.evaluator_id === 'keita_ono');
      const jeerawat = related.find((row) => row.evaluator_id === 'jeerawat_yaowanich');
      const keitaScore = keita ? Number(keita.total_score) : null;
      const jeerawatScore = jeerawat ? Number(jeerawat.total_score) : null;
      const finalScore =
        keitaScore != null && jeerawatScore != null ? keitaScore * 0.5 + jeerawatScore * 0.5 : null;

      return {
        evaluateeId: evaluatee.id,
        name: evaluatee.name,
        teamName: evaluatee.team_name || '—',
        keitaScore,
        jeerawatScore,
        finalScore,
        keitaCriteria: keita || null,
        jeerawatCriteria: jeerawat || null,
        responseCount: related.length,
      };
    })
    .sort((a, b) => {
      if (a.finalScore == null && b.finalScore == null) return a.name.localeCompare(b.name, 'th');
      if (a.finalScore == null) return 1;
      if (b.finalScore == null) return -1;
      return b.finalScore - a.finalScore;
    });
}
