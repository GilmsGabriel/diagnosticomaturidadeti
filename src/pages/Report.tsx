import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Download, TrendingUp } from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';

interface CategoryScore {
  name: string;
  score: number;
  maxScore: number;
  percentage: number;
  questionCount: number;
}

const maturityDescriptions: Record<string, { title: string; description: string; recommendations: string[] }> = {
  inicial: {
    title: 'Nível 1 — Inicial',
    description: 'A organização possui processos de TI ad hoc e reativos. Não há padronização e o sucesso depende de esforços individuais. Os processos são frequentemente caóticos e a organização não fornece um ambiente estável.',
    recommendations: [
      'Estabelecer processos básicos de governança de TI',
      'Documentar procedimentos críticos',
      'Implementar controles básicos de segurança',
      'Definir responsabilidades e papéis de TI',
      'Criar um inventário de ativos de TI',
    ],
  },
  repetivel: {
    title: 'Nível 2 — Repetível',
    description: 'Processos básicos foram estabelecidos para repetir atividades de TI com sucesso similar. Existe disciplina de processo básica, mas documentação e treinamento ainda são limitados.',
    recommendations: [
      'Formalizar e documentar todos os processos existentes',
      'Implementar métricas básicas de desempenho',
      'Investir em treinamento da equipe de TI',
      'Estabelecer SLAs para serviços críticos',
      'Iniciar programa de gestão de riscos',
    ],
  },
  definido: {
    title: 'Nível 3 — Definido',
    description: 'Os processos de TI são documentados, padronizados e integrados. A organização usa práticas proativas e existe um entendimento claro de como a TI suporta os objetivos do negócio.',
    recommendations: [
      'Implementar métricas avançadas e KPIs',
      'Adotar frameworks como ITIL e COBIT',
      'Automatizar processos repetitivos',
      'Estabelecer programa de melhoria contínua',
      'Alinhar investimentos de TI com estratégia de negócios',
    ],
  },
  gerenciado: {
    title: 'Nível 4 — Gerenciado',
    description: 'A organização mede e controla seus processos de TI de forma quantitativa. Variações de desempenho são identificadas e tratadas. Os processos são previsíveis e consistentes.',
    recommendations: [
      'Implementar análise preditiva e inteligência artificial',
      'Otimizar custos através de automação avançada',
      'Desenvolver capacidades de inovação',
      'Criar centro de excelência em TI',
      'Implementar DevOps e práticas ágeis avançadas',
    ],
  },
  otimizado: {
    title: 'Nível 5 — Otimizado',
    description: 'A organização foca em melhoria contínua e inovação. Processos são continuamente otimizados através de feedback quantitativo e testes piloto de novas tecnologias. A TI é um diferencial competitivo.',
    recommendations: [
      'Manter cultura de inovação e experimentação',
      'Investir em tecnologias emergentes estratégicas',
      'Compartilhar melhores práticas externamente',
      'Desenvolver capacidades de transformação digital',
      'Liderar iniciativas de inovação no setor',
    ],
  },
};

const Report = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState<any>(null);
  const [categoryScores, setCategoryScores] = useState<CategoryScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      const { data: assessmentData } = await supabase
        .from('assessments')
        .select('*, companies(name)')
        .eq('id', id!)
        .single();

      const [answersRes, categoriesRes, questionsRes] = await Promise.all([
        supabase.from('assessment_answers').select('*').eq('assessment_id', id!),
        supabase.from('categories').select('*').order('sort_order'),
        supabase.from('questions').select('*').eq('active', true),
      ]);

      setAssessment(assessmentData);

      const answers = answersRes.data || [];
      const categories = categoriesRes.data || [];
      const questions = questionsRes.data || [];

      const scores: CategoryScore[] = categories.map(cat => {
        const catQuestions = questions.filter(q => q.category_id === cat.id);
        const catAnswers = answers.filter(a => catQuestions.some(q => q.id === a.question_id));

        let totalWeighted = 0;
        let totalWeight = 0;
        catAnswers.forEach(a => {
          const q = catQuestions.find(q => q.id === a.question_id);
          const w = q?.weight || 1;
          totalWeighted += a.score * w;
          totalWeight += w;
        });

        const score = totalWeight > 0 ? totalWeighted / totalWeight : 0;
        return {
          name: cat.name,
          score: Math.round(score * 100) / 100,
          maxScore: 5,
          percentage: Math.round((score / 5) * 100),
          questionCount: catQuestions.length,
        };
      });

      setCategoryScores(scores);
      setLoading(false);
    };
    fetchReport();
  }, [id]);

  if (loading || !assessment) return null;

  const maturityInfo = maturityDescriptions[assessment.maturity_level || 'inicial'];
  const overallScore = Number(assessment.overall_score || 0);

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return 'hsl(var(--maturity-5))';
    if (score >= 3.5) return 'hsl(var(--maturity-4))';
    if (score >= 2.5) return 'hsl(var(--maturity-3))';
    if (score >= 1.5) return 'hsl(var(--maturity-2))';
    return 'hsl(var(--maturity-1))';
  };

  const radarData = categoryScores.map(cs => ({
    subject: cs.name.replace('Gestão de ', '').replace('da Informação', ''),
    score: cs.score,
    fullMark: 5,
  }));

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/assessments')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Relatório de Maturidade</h1>
            <p className="text-muted-foreground text-sm">
              {(assessment.companies as any)?.name} — {new Date(assessment.created_at).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => window.print()}>
          <Download className="h-4 w-4" />
          Exportar
        </Button>
      </div>

      {/* Overall Score */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass-card md:col-span-1">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-sm text-muted-foreground mb-2">Score Geral</p>
            <div
              className="w-32 h-32 rounded-full flex items-center justify-center border-4"
              style={{ borderColor: getScoreColor(overallScore) }}
            >
              <span className="text-4xl font-bold">{overallScore.toFixed(1)}</span>
            </div>
            <span
              className="mt-3 score-badge text-sm"
              style={{ backgroundColor: getScoreColor(overallScore), color: 'hsl(var(--background))' }}
            >
              {maturityInfo.title}
            </span>
          </CardContent>
        </Card>

        <Card className="glass-card md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Score por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {categoryScores.map(cs => (
                <div key={cs.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{cs.name}</span>
                    <span className="font-bold">{cs.score.toFixed(1)} / 5</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${cs.percentage}%`,
                        backgroundColor: getScoreColor(cs.score),
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Radar de Maturidade</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                <Radar name="Score" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Comparativo por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryScores.map(cs => ({ name: cs.name.substring(0, 12), score: cs.score }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                <YAxis domain={[0, 5]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))',
                  }}
                />
                <Bar dataKey="score" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Maturity Description */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">{maturityInfo.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{maturityInfo.description}</p>
          <div>
            <h3 className="font-semibold text-sm mb-2">Recomendações</h3>
            <ul className="space-y-2">
              {maturityInfo.recommendations.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-primary font-bold mt-0.5">•</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Report;
