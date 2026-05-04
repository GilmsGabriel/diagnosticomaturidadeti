import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, Download, TrendingUp, Target } from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, Legend, Tooltip,
} from 'recharts';
import { MATURITY_BANDS, calculateMaturity, defaultTarget, getColorToken } from '@/lib/maturity-calculator';
import { generateMaturityPdf } from '@/lib/pdf-report';

const recommendationsByLevel: Record<string, string[]> = {
  inicial: [
    'COBIT EDM01: Estabelecer um framework formal de governança com papéis e responsabilidades.',
    'ITIL: Documentar serviços críticos e definir SLAs básicos.',
    'ISO 27001: Implementar política de segurança e inventário de ativos (A.5, A.8).',
    'COBIT APO01: Formalizar processos básicos de gestão de TI.',
    'COBIT DSS02: Criar processo de gestão de incidentes (Service Desk).',
  ],
  repetivel: [
    'COBIT MEA01: Implementar métricas e indicadores de desempenho.',
    'ITIL: Estruturar Catálogo de Serviços e Acordos de Nível Operacional (OLAs).',
    'ISO 27001: Realizar análise de riscos formal (ISO 27005) e plano de tratamento.',
    'COBIT APO12: Estabelecer processo contínuo de gestão de riscos.',
    'COBIT BAI06: Formalizar processo de gestão de mudanças.',
  ],
  definido: [
    'COBIT MEA02: Auditorias internas regulares de controle.',
    'ITIL: Implementar gestão de problemas e melhoria contínua (CSI).',
    'ISO 27001: Buscar certificação formal e SOA documentada.',
    'COBIT APO04: Estabelecer programa estruturado de inovação.',
    'COBIT DSS04: Plano formal de continuidade de negócio (BCP/DRP).',
  ],
  gerenciado: [
    'COBIT BAI04: Análise preditiva de capacidade e disponibilidade.',
    'ITIL: Práticas DevOps e automação de operações.',
    'ISO 27001: Threat Intelligence e SOC com monitoramento 24x7.',
    'COBIT APO02: Roadmap estratégico de TI alinhado à transformação digital.',
    'COBIT EDM02: Métricas de valor entregue ao negócio (Value Stream).',
  ],
  otimizado: [
    'Sustentar cultura de melhoria contínua e benchmarking externo.',
    'Investir em tecnologias emergentes (IA, automação cognitiva).',
    'Compartilhar boas práticas e contribuir com a comunidade.',
    'COBIT APO04: Liderar inovação no setor de atuação.',
    'ISO 27001: Maturidade integrada com ESG e compliance regulatório.',
  ],
};

const Report = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<any[]>([]);
  const [targets, setTargets] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: a } = await supabase
        .from('assessments').select('*, companies(name)').eq('id', id!).single();
      const [aRes, cRes, qRes] = await Promise.all([
        supabase.from('assessment_answers').select('*').eq('assessment_id', id!),
        supabase.from('categories').select('*').order('sort_order'),
        supabase.from('questions').select('*').eq('active', true),
      ]);
      setAssessment(a);
      setAnswers(aRes.data || []);
      setCategories(cRes.data || []);
      setQuestions(qRes.data || []);
      setLoading(false);
    };
    fetch();
  }, [id]);

  const result = useMemo(
    () => calculateMaturity(categories, questions, answers),
    [categories, questions, answers],
  );

  // Initialize targets when result is computed
  useEffect(() => {
    if (result.categories.length && Object.keys(targets).length === 0) {
      const t: Record<string, number> = {};
      result.categories.forEach(c => { t[c.id] = defaultTarget(c.score); });
      setTargets(t);
    }
  }, [result.categories]); // eslint-disable-line

  if (loading || !assessment) return null;

  const overallScore = result.overallScore;
  const band = MATURITY_BANDS.find(b => b.level === result.level)!;

  const radarData = result.categories.map(c => ({
    subject: c.name.length > 18 ? c.name.substring(0, 16) + '…' : c.name,
    Atual: c.score,
    Alvo: targets[c.id] ?? defaultTarget(c.score),
    fullMark: 5,
  }));

  const handlePdf = () => {
    (async () => {
      const { data: plans } = await supabase
        .from('action_plans')
        .select('what, who, due_date, cobit_domain, kanban_status, rice_score, reach, impact_score, confidence, effort')
        .eq('company_id', assessment.company_id)
        .order('rice_score', { ascending: false });
      generateMaturityPdf({
        companyName: (assessment.companies as any)?.name || 'Empresa',
        assessmentDate: new Date(assessment.created_at).toLocaleDateString('pt-BR'),
        result,
        targets,
        recommendations: recommendationsByLevel[result.level] || [],
        actionPlans: (plans as any[]) || [],
      });
    })();
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
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
        <Button onClick={handlePdf} className="gap-2">
          <Download className="h-4 w-4" />
          Exportar PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass-card md:col-span-1">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-sm text-muted-foreground mb-2">Score Geral</p>
            <div
              className="w-32 h-32 rounded-full flex items-center justify-center border-4"
              style={{ borderColor: getColorToken(overallScore) }}
            >
              <span className="text-4xl font-bold">{overallScore.toFixed(1)}</span>
            </div>
            <span
              className="mt-3 score-badge text-sm"
              style={{ backgroundColor: getColorToken(overallScore), color: 'hsl(var(--background))' }}
            >
              {band.label}
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
              {result.categories.map(c => (
                <div key={c.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{c.name}</span>
                    <span className="font-bold">{c.score.toFixed(1)} / 5</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(c.score / 5) * 100}%`,
                        backgroundColor: getColorToken(c.score),
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Radar Atual vs Alvo (Análise de Gap) */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Análise de Gap — Atual vs Alvo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={380}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
              <Radar name="Maturidade Alvo" dataKey="Alvo" stroke="hsl(var(--accent))"
                fill="hsl(var(--accent))" fillOpacity={0.25} strokeWidth={2} strokeDasharray="4 4" />
              <Radar name="Maturidade Atual" dataKey="Atual" stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))" fillOpacity={0.45} strokeWidth={2} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Tooltip contentStyle={{
                backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))',
                borderRadius: '8px', color: 'hsl(var(--foreground))', fontSize: 12,
              }} />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Configuração de Maturidade Alvo (As-is vs To-be) */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Definir Maturidade Alvo (To-be)</CardTitle>
          <p className="text-xs text-muted-foreground">
            Padrão: Atual + 1. Ajuste manualmente conforme estratégia da empresa.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {result.categories.map(c => {
            const t = targets[c.id] ?? defaultTarget(c.score);
            const gap = (t - c.score).toFixed(1);
            return (
              <div key={c.id} className="grid grid-cols-1 md:grid-cols-[1fr_auto_2fr_auto] items-center gap-3 text-sm">
                <span className="font-medium truncate">{c.name}</span>
                <span className="text-muted-foreground text-xs whitespace-nowrap">
                  Atual <strong className="text-foreground">{c.score.toFixed(1)}</strong>
                </span>
                <Slider
                  min={1} max={5} step={0.5}
                  value={[t]}
                  onValueChange={v => setTargets(prev => ({ ...prev, [c.id]: v[0] }))}
                />
                <span className="text-xs whitespace-nowrap">
                  Alvo <strong className="text-accent">{t.toFixed(1)}</strong>
                  <span className="ml-2 text-muted-foreground">Gap +{gap}</span>
                </span>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">{band.label}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{band.description}</p>
          <div>
            <h3 className="font-semibold text-sm mb-2">Recomendações (COBIT · ITIL · ISO 27001)</h3>
            <ul className="space-y-2">
              {(recommendationsByLevel[result.level] || []).map((r, i) => (
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
