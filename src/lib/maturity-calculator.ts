// Maturity calculation aligned to CMMI / COBIT PAM
// Weighted average across questions and categories.
// Bands: 0-1 Inicial · 1-2 Repetível · 2-3 Definido · 3-4 Gerenciado · 4-5 Otimizado

export type MaturityLevel = 'inicial' | 'repetivel' | 'definido' | 'gerenciado' | 'otimizado';

export interface MaturityBand {
  level: MaturityLevel;
  label: string;
  shortLabel: string;
  min: number;
  max: number;
  description: string;
  color: string; // hsl token name
}

export const MATURITY_BANDS: MaturityBand[] = [
  {
    level: 'inicial',
    label: 'Nível 1 — Inicial',
    shortLabel: 'Inicial',
    min: 0,
    max: 1,
    description: 'Processos ad hoc e reativos. Sucesso depende de esforço individual.',
    color: 'maturity-1',
  },
  {
    level: 'repetivel',
    label: 'Nível 2 — Repetível',
    shortLabel: 'Repetível',
    min: 1,
    max: 2,
    description: 'Processos básicos estabelecidos, ainda sem padronização ampla.',
    color: 'maturity-2',
  },
  {
    level: 'definido',
    label: 'Nível 3 — Definido',
    shortLabel: 'Definido',
    min: 2,
    max: 3,
    description: 'Processos padronizados, documentados e integrados ao negócio.',
    color: 'maturity-3',
  },
  {
    level: 'gerenciado',
    label: 'Nível 4 — Gerenciado',
    shortLabel: 'Gerenciado',
    min: 3,
    max: 4,
    description: 'Processos medidos quantitativamente e controlados estatisticamente.',
    color: 'maturity-4',
  },
  {
    level: 'otimizado',
    label: 'Nível 5 — Otimizado',
    shortLabel: 'Otimizado',
    min: 4,
    max: 5,
    description: 'Melhoria contínua, inovação e foco em vantagem competitiva.',
    color: 'maturity-5',
  },
];

export const scoreToLevel = (score: number): MaturityLevel => {
  if (score >= 4) return 'otimizado';
  if (score >= 3) return 'gerenciado';
  if (score >= 2) return 'definido';
  if (score >= 1) return 'repetivel';
  return 'inicial';
};

export const getBand = (score: number): MaturityBand =>
  MATURITY_BANDS.find(b => score >= b.min && score < b.max) || MATURITY_BANDS[MATURITY_BANDS.length - 1];

export const getColorToken = (score: number): string => `hsl(var(--${getBand(score).color}))`;

interface QuestionLike { id: string; category_id: string; weight: number; }
interface CategoryLike { id: string; name: string; weight: number; }
interface AnswerLike { question_id: string; score: number; }

export interface CategoryResult {
  id: string;
  name: string;
  score: number;
  weight: number;
  questionCount: number;
  answeredCount: number;
}

export interface MaturityResult {
  overallScore: number;
  level: MaturityLevel;
  categories: CategoryResult[];
}

/** Weighted average: per-category uses question weights; overall uses category weights. */
export const calculateMaturity = (
  categories: CategoryLike[],
  questions: QuestionLike[],
  answers: AnswerLike[],
): MaturityResult => {
  const answerByQ = new Map(answers.map(a => [a.question_id, a]));

  const categoryResults: CategoryResult[] = categories.map(cat => {
    const catQs = questions.filter(q => q.category_id === cat.id);
    let weighted = 0;
    let totalW = 0;
    let answered = 0;
    catQs.forEach(q => {
      const a = answerByQ.get(q.id);
      if (a && a.score > 0) {
        weighted += a.score * q.weight;
        totalW += q.weight;
        answered += 1;
      }
    });
    return {
      id: cat.id,
      name: cat.name,
      score: totalW > 0 ? weighted / totalW : 0,
      weight: cat.weight,
      questionCount: catQs.length,
      answeredCount: answered,
    };
  });

  let overallW = 0;
  let overallSum = 0;
  categoryResults.forEach(cr => {
    if (cr.score > 0) {
      overallSum += cr.score * cr.weight;
      overallW += cr.weight;
    }
  });
  const overallScore = overallW > 0 ? overallSum / overallW : 0;

  return {
    overallScore: Math.round(overallScore * 100) / 100,
    level: scoreToLevel(overallScore),
    categories: categoryResults.map(c => ({ ...c, score: Math.round(c.score * 100) / 100 })),
  };
};

/** Default Target Maturity = current + 1 (capped at 5). User can override per category. */
export const defaultTarget = (current: number): number => Math.min(5, Math.round(current + 1));
