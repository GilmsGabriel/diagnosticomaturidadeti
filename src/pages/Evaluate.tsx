import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Category { id: string; name: string; description: string | null; weight: number; }
interface Question { id: string; category_id: string; text: string; description: string | null; weight: number; }
interface Answer { question_id: string; score: number; observation: string; }

const scoreLabels = [
  { value: 1, label: 'Inicial', desc: 'Processos ad hoc e caóticos' },
  { value: 2, label: 'Repetível', desc: 'Processos básicos estabelecidos' },
  { value: 3, label: 'Definido', desc: 'Processos padronizados e documentados' },
  { value: 4, label: 'Gerenciado', desc: 'Processos medidos e controlados' },
  { value: 5, label: 'Otimizado', desc: 'Melhoria contínua e inovação' },
];

const Evaluate = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentCatIndex, setCurrentCatIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
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

      // Load existing answers
      const loaded: Record<string, Answer> = {};
      (ansRes.data || []).forEach((a: any) => {
        loaded[a.question_id] = { question_id: a.question_id, score: a.score, observation: a.observation || '' };
      });
      setAnswers(loaded);
    };
    fetchData();
  }, [id]);

  const currentCategory = categories[currentCatIndex];
  const currentQuestions = currentCategory ? questions.filter(q => q.category_id === currentCategory.id) : [];

  const totalQuestions = questions.length;
  const answeredQuestions = Object.keys(answers).length;
  const progress = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;

  const setAnswer = (questionId: string, score: number) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], question_id: questionId, score, observation: prev[questionId]?.observation || '' },
    }));
  };

  const setObservation = (questionId: string, observation: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], question_id: questionId, score: prev[questionId]?.score || 0, observation },
    }));
  };

  const calculateResults = () => {
    const categoryScores: Record<string, { total: number; weight: number; count: number }> = {};

    Object.values(answers).forEach(answer => {
      const question = questions.find(q => q.id === answer.question_id);
      if (!question) return;
      if (!categoryScores[question.category_id]) {
        categoryScores[question.category_id] = { total: 0, weight: 0, count: 0 };
      }
      categoryScores[question.category_id].total += answer.score * question.weight;
      categoryScores[question.category_id].weight += question.weight;
      categoryScores[question.category_id].count += 1;
    });

    let overallTotal = 0;
    let overallWeight = 0;

    Object.entries(categoryScores).forEach(([catId, data]) => {
      const cat = categories.find(c => c.id === catId);
      const catWeight = cat?.weight || 1;
      const catAvg = data.weight > 0 ? data.total / data.weight : 0;
      overallTotal += catAvg * catWeight;
      overallWeight += catWeight;
    });

    const overallScore = overallWeight > 0 ? overallTotal / overallWeight : 0;
    let level: 'inicial' | 'repetivel' | 'definido' | 'gerenciado' | 'otimizado' = 'inicial';
    if (overallScore >= 4.5) level = 'otimizado';
    else if (overallScore >= 3.5) level = 'gerenciado';
    else if (overallScore >= 2.5) level = 'definido';
    else if (overallScore >= 1.5) level = 'repetivel';

    return { overallScore: Math.round(overallScore * 100) / 100, level };
  };

  const handleFinish = async () => {
    const unanswered = questions.filter(q => !answers[q.id] || !answers[q.id].score);
    if (unanswered.length > 0) {
      toast.error(`Ainda há ${unanswered.length} questões sem resposta.`);
      return;
    }

    setSaving(true);
    try {
      // Delete existing answers
      if (existingAnswers.length > 0) {
        await supabase.from('assessment_answers').delete().eq('assessment_id', id!);
      }

      // Insert all answers
      const answerRows = Object.values(answers).map(a => ({
        assessment_id: id!,
        question_id: a.question_id,
        score: a.score,
        observation: a.observation || null,
      }));

      const { error: ansError } = await supabase.from('assessment_answers').insert(answerRows);
      if (ansError) throw ansError;

      // Calculate and update assessment
      const { overallScore, level } = calculateResults();
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
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (!currentCategory) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Avaliação de Maturidade</h1>
        <div className="flex items-center gap-4 mt-3">
          <Progress value={progress} className="flex-1 h-2" />
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {answeredQuestions}/{totalQuestions} respondidas
          </span>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((cat, i) => {
          const catQuestions = questions.filter(q => q.category_id === cat.id);
          const catAnswered = catQuestions.filter(q => answers[q.id]?.score).length;
          const complete = catAnswered === catQuestions.length && catQuestions.length > 0;

          return (
            <button
              key={cat.id}
              onClick={() => setCurrentCatIndex(i)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all
                ${i === currentCatIndex ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}
              `}
            >
              {complete && <Check className="h-3 w-3" />}
              {cat.name}
              <span className="text-xs opacity-70">{catAnswered}/{catQuestions.length}</span>
            </button>
          );
        })}
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {currentCategory.description && (
          <p className="text-sm text-muted-foreground">{currentCategory.description}</p>
        )}

        {currentQuestions.map((q, i) => (
          <Card key={q.id} className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex gap-2">
                <span className="text-muted-foreground">{i + 1}.</span>
                {q.text}
              </CardTitle>
              {q.description && (
                <p className="text-xs text-muted-foreground">{q.description}</p>
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
                placeholder="Observações (opcional)"
                value={answers[q.id]?.observation || ''}
                onChange={e => setObservation(q.id, e.target.value)}
                className="text-sm"
                rows={2}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <Button
          variant="outline"
          onClick={() => setCurrentCatIndex(i => Math.max(0, i - 1))}
          disabled={currentCatIndex === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Anterior
        </Button>

        {currentCatIndex === categories.length - 1 ? (
          <Button onClick={handleFinish} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Finalizar Avaliação
          </Button>
        ) : (
          <Button onClick={() => setCurrentCatIndex(i => Math.min(categories.length - 1, i + 1))}>
            Próxima
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default Evaluate;
