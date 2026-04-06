import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, ClipboardCheck, FileQuestion, TrendingUp, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ companies: 0, assessments: 0, questions: 0, avgScore: 0 });
  const [recentAssessments, setRecentAssessments] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      const [companies, assessments, questions] = await Promise.all([
        supabase.from('companies').select('id', { count: 'exact', head: true }),
        supabase.from('assessments').select('id, overall_score', { count: 'exact' }),
        supabase.from('questions').select('id', { count: 'exact', head: true }),
      ]);

      const scores = assessments.data?.filter(a => a.overall_score).map(a => a.overall_score as number) || [];
      const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

      setStats({
        companies: companies.count || 0,
        assessments: assessments.count || 0,
        questions: questions.count || 0,
        avgScore: Math.round(avg * 10) / 10,
      });

      // Recent assessments with company name
      const { data: recent } = await supabase
        .from('assessments')
        .select('*, companies(name)')
        .order('created_at', { ascending: false })
        .limit(5);
      setRecentAssessments(recent || []);
    };
    fetchStats();
  }, []);

  const getMaturityLabel = (level: string | null) => {
    const labels: Record<string, string> = {
      inicial: 'Inicial',
      repetivel: 'Repetível',
      definido: 'Definido',
      gerenciado: 'Gerenciado',
      otimizado: 'Otimizado',
    };
    return level ? labels[level] || level : '—';
  };

  const getMaturityColor = (level: string | null) => {
    const colors: Record<string, string> = {
      inicial: 'bg-[hsl(var(--maturity-1))]',
      repetivel: 'bg-[hsl(var(--maturity-2))]',
      definido: 'bg-[hsl(var(--maturity-3))]',
      gerenciado: 'bg-[hsl(var(--maturity-4))]',
      otimizado: 'bg-[hsl(var(--maturity-5))]',
    };
    return level ? colors[level] || '' : '';
  };

  const statCards = [
    { label: 'Empresas', value: stats.companies, icon: Building2, color: 'text-primary' },
    { label: 'Avaliações', value: stats.assessments, icon: ClipboardCheck, color: 'text-accent' },
    { label: 'Questões', value: stats.questions, icon: FileQuestion, color: 'text-[hsl(var(--warning))]' },
    { label: 'Score Médio', value: stats.avgScore || '—', icon: TrendingUp, color: 'text-[hsl(var(--success))]' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Visão geral das avaliações de maturidade</p>
        </div>
        <Button onClick={() => navigate('/assessments')} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Avaliação
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => (
          <Card key={card.label} className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="text-3xl font-bold mt-1">{card.value}</p>
                </div>
                <card.icon className={`h-8 w-8 ${card.color} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Avaliações Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {recentAssessments.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              Nenhuma avaliação realizada ainda.
            </p>
          ) : (
            <div className="space-y-3">
              {recentAssessments.map(a => (
                <div
                  key={a.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/assessments/${a.id}/report`)}
                >
                  <div>
                    <p className="font-medium text-sm">{(a.companies as any)?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {a.overall_score && (
                      <span className="text-lg font-bold">{a.overall_score.toFixed(1)}</span>
                    )}
                    {a.maturity_level && (
                      <span className={`score-badge text-xs ${getMaturityColor(a.maturity_level)} text-background`}>
                        {getMaturityLabel(a.maturity_level)}
                      </span>
                    )}
                    {a.status === 'in_progress' && (
                      <span className="score-badge text-xs bg-[hsl(var(--warning))] text-background">
                        Em progresso
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
