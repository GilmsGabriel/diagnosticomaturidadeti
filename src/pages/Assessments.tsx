import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ClipboardCheck, Plus, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const Assessments = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const [aRes, cRes] = await Promise.all([
        supabase.from('assessments').select('*, companies(name)').order('created_at', { ascending: false }),
        supabase.from('companies').select('*').order('name'),
      ]);
      setAssessments(aRes.data || []);
      setCompanies(cRes.data || []);
    };
    fetch();
  }, []);

  const startAssessment = async () => {
    if (!selectedCompany || !user) return;
    const { data, error } = await supabase.from('assessments').insert({
      company_id: selectedCompany,
      assessor_id: user.id,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    setOpen(false);
    navigate(`/assessments/${data.id}/evaluate`);
  };

  const getStatusBadge = (status: string) => {
    if (status === 'completed') return <span className="score-badge text-xs bg-[hsl(var(--success))] text-background">Concluída</span>;
    return <span className="score-badge text-xs bg-[hsl(var(--warning))] text-background">Em progresso</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Avaliações</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie avaliações de maturidade</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />Nova Avaliação</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Iniciar Nova Avaliação</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Selecione a Empresa</Label>
                <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                  <SelectTrigger><SelectValue placeholder="Escolha uma empresa" /></SelectTrigger>
                  <SelectContent>
                    {companies.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {companies.length === 0 && (
                <p className="text-sm text-muted-foreground">Cadastre uma empresa primeiro.</p>
              )}
              <Button onClick={startAssessment} disabled={!selectedCompany} className="w-full">
                Iniciar Avaliação
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {assessments.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ClipboardCheck className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhuma avaliação realizada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {assessments.map(a => (
            <Card key={a.id} className="glass-card hover:border-primary/30 transition-colors cursor-pointer"
              onClick={() => navigate(a.status === 'completed' ? `/assessments/${a.id}/report` : `/assessments/${a.id}/evaluate`)}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{(a.companies as any)?.name}</p>
                  <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="flex items-center gap-3">
                  {a.overall_score && <span className="text-lg font-bold">{Number(a.overall_score).toFixed(1)}</span>}
                  {getStatusBadge(a.status)}
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Assessments;
