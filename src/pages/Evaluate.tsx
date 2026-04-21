import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Check, Loader2, Info, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { getReadableError } from '@/lib/error-messages';
import {
  COBIT_DOMAINS, ITIL_HINTS, CIA_BY_DOMAIN, extractCobitCode, getDomainForCode,
  type CobitDomainKey,
} from '@/lib/cobit-framework';
import { calculateMaturity, scoreToLevel } from '@/lib/maturity-calculator';
import { CIAIndicators } from '@/components/CIAIndicators';

interface Category { id: string; name: string; description: string | null; weight: number; }
interface Question { id: string; category_id: string; text: string; description: string | null; weight: number; }
interface Answer { question_id: string; score: number; observation: string; }

const scoreLabels = [
  { value: 1, label: 'Inicial' },
  { value: 2, label: 'Repetível' },
  { value: 3, label: 'Definido' },
  { value: 4, label: 'Gerenciado' },
  { value: 5, label: 'Otimizado' },
];

const Evaluate = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [activeDomain, setActiveDomain] = useState<CobitDomainKey>('EDM');
  const [saving, setSaving] = useState(false);
  const [existingAnswers, setExistingAnswers] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [catRes, qRes, ansRes] = await Promise.all([
        supabase.from('categories').select('*').order('sort_order'),
        supabase.from('questions').select('*').eq('active', true).order('sort_order'),
        supabase.from('assessment_answers').select('*').eq('assessment_id', id!),
      ]);
      setCategories(catRes.data || []);
      setQuestions(qRes.data || []);
      setExistingAnswers(ansRes.data || []);
      const loaded: Record<string, Answer> = {};
      (ansRes.data || []).forEach((a: any) => {
        loaded[a.question_id] = { question_id: a.question_id, score: a.score, observation: a.observation || '' };
      });
      setAnswers(loaded);
    };
    fetchData();
  }, [id]);

  // Group questions by COBIT domain (via [XXX##] prefix in description). Fallback: EDM.
  const questionsByDomain = useMemo(() => {
    const grouped: Record<CobitDomainKey, Question[]> = { EDM: [], APO: [], BAI: [], DSS: [], MEA: [] };
    questions.forEach(q => {
      const code = extractCobitCode(q.description);
      const domain = getDomainForCode(code) || 'EDM';
      grouped[domain].push(q);
    });
    return grouped;
  }, [questions]);

  const totalQuestions = questions.length;
  const answeredQuestions = Object.values(answers).filter(a => a.score > 0).length;
  const progress = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;

  const setAnswer = (questionId: string, score: number) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: { question_id: questionId, score, observation: prev[questionId]?.observation || '' },
    }));
  };

  const setObservation = (questionId: string, observation: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: { question_id: questionId, score: prev[questionId]?.score || 0, observation },
    }));
  };

  const handleFinish = async () => {
    const answered = Object.values(answers).filter(a => a.score > 0);
    if (answered.length < questions.length) {
      toast.error(`Ainda há ${questions.length - answered.length} questões sem resposta.`);
      return;
    }

    setSaving(true);
    try {
      if (existingAnswers.length > 0) {
        await supabase.from('assessment_answers').delete().eq('assessment_id', id!);
      }
      const answerRows = answered.map(a => ({
        assessment_id: id!,
        question_id: a.question_id,
        score: a.score,
        observation: a.observation || null,
      }));
      const { error: ansError } = await supabase.from('assessment_answers').insert(answerRows);
      if (ansError) throw ansError;

      const { overallScore } = calculateMaturity(categories, questions, answered);
      const level = scoreToLevel(overallScore);
      const { error: updateError } = await supabase.from('assessments').update({
        overall_score: overallScore,
        maturity_level: level,
        status: 'completed',
        completed_at: new Date().toISOString(),
      }).eq('id', id!);
      if (updateError) throw updateError;

      toast.success('Avaliação concluída!');
      navigate(`/assessments/${id}/report`);
    } catch (error: any) {
      toast.error(getReadableError(error));
    } finally {
      setSaving(false);
    }
  };

  const currentDomain = COBIT_DOMAINS.find(d => d.key === activeDomain)!;
  const currentQuestions = questionsByDomain[activeDomain];
  const itil = ITIL_HINTS[activeDomain];
  const cia = CIA_BY_DOMAIN[activeDomain];

  const domainOrder: CobitDomainKey[] = ['EDM', 'APO', 'BAI', 'DSS', 'MEA'];
  const idx = domainOrder.indexOf(activeDomain);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild><Link to="/assessments">Avaliações</Link></BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>{currentDomain.name}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-bold">Avaliação de Maturidade</h1>
          <Badge variant="outline" className="gap-1.5">
            <Sparkles className="h-3 w-3 text-primary" />
            COBIT · ITIL · ISO 27001
          </Badge>
        </div>
        <div className="flex items-center gap-4 mt-3">
          <Progress value={progress} className="flex-1 h-2" />
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {answeredQuestions}/{totalQuestions} ({Math.round(progress)}%)
          </span>
        </div>
      </div>

      <Tabs value={activeDomain} onValueChange={v => setActiveDomain(v as CobitDomainKey)}>
        <TabsList className="w-full h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
          {COBIT_DOMAINS.map(d => {
            const qs = questionsByDomain[d.key];
            const ans = qs.filter(q => answers[q.id]?.score).length;
            const complete = qs.length > 0 && ans === qs.length;
            return (
              <TabsTrigger
                key={d.key}
                value={d.key}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground bg-secondary/50 gap-2"
              >
                {complete && <Check className="h-3 w-3" />}
                <span className="font-mono font-bold">{d.key}</span>
                <span className="text-xs opacity-70">{ans}/{qs.length}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {/* Domain header */}
      <Card className="glass-card border-primary/30">
        <CardContent className="py-4 flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-semibold">{currentDomain.name}</h2>
              <Badge variant={currentDomain.area === 'governance' ? 'default' : 'secondary'} className="text-[10px]">
                {currentDomain.area === 'governance' ? 'Governança' : 'Gestão'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{currentDomain.description}</p>
          </div>
          <CIAIndicators indicators={cia} />
        </CardContent>
      </Card>

      <div className="space-y-4">
        {currentQuestions.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Nenhuma questão cadastrada para o domínio {activeDomain}.
              <br />
              <span className="text-xs">Dica: prefixe a descrição da questão com <code className="text-primary">[{activeDomain}01]</code> para vinculá-la a este domínio.</span>
            </CardContent>
          </Card>
        ) : currentQuestions.map((q, i) => {
          const code = extractCobitCode(q.description);
          return (
            <Card key={q.id} className="glass-card">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-sm font-medium flex gap-2 flex-1">
                    <span className="text-muted-foreground">{i + 1}.</span>
                    {q.text}
                  </CardTitle>
                  <div className="flex items-center gap-2 shrink-0">
                    {code && <Badge variant="outline" className="font-mono text-[10px]">{code}</Badge>}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="text-muted-foreground hover:text-primary transition-colors">
                          <Info className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-xs">
                        <p className="font-semibold text-xs mb-1">ITIL 4 — Utilidade</p>
                        <p className="text-xs text-muted-foreground mb-2">{itil.utility}</p>
                        <p className="font-semibold text-xs mb-1">ITIL 4 — Garantia</p>
                        <p className="text-xs text-muted-foreground">{itil.warranty}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                {q.description && (
                  <p className="text-xs text-muted-foreground">
                    {q.description.replace(/^\[[A-Z]{3}\d{2}\]\s*/, '')}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-5 gap-2">
                  {scoreLabels.map(sl => (
                    <button
                      key={sl.value}
                      onClick={() => setAnswer(q.id, sl.value)}
                      className={`
                        flex flex-col items-center gap-1 p-3 rounded-lg border text-xs transition-all
                        ${answers[q.id]?.score === sl.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/50 text-muted-foreground hover:text-foreground'
                        }
                      `}
                    >
                      <span className="text-lg font-bold">{sl.value}</span>
                      <span className="font-medium hidden sm:block">{sl.label}</span>
                    </button>
                  ))}
                </div>
                <Textarea
                  placeholder="Observações / evidências (opcional)"
                  value={answers[q.id]?.observation || ''}
                  onChange={e => setObservation(q.id, e.target.value)}
                  className="text-sm"
                  rows={2}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-4">
        <Button
          variant="outline"
          onClick={() => setActiveDomain(domainOrder[Math.max(0, idx - 1)])}
          disabled={idx === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Domínio anterior
        </Button>

        {idx === domainOrder.length - 1 ? (
          <Button onClick={handleFinish} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Finalizar Avaliação
          </Button>
        ) : (
          <Button onClick={() => setActiveDomain(domainOrder[idx + 1])}>
            Próximo domínio
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default Evaluate;
