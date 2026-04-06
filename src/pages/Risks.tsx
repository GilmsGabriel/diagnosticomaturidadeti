import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

const riskLevelLabels: Record<string, { label: string; className: string }> = {
  low: { label: 'Baixo', className: 'bg-[hsl(var(--success))]/20 text-[hsl(var(--success))]' },
  medium: { label: 'Médio', className: 'bg-[hsl(var(--warning))]/20 text-[hsl(var(--warning))]' },
  high: { label: 'Alto', className: 'bg-destructive/20 text-destructive' },
  critical: { label: 'Crítico', className: 'bg-destructive text-destructive-foreground' },
};

const statusLabels: Record<string, string> = {
  identified: 'Identificado',
  mitigated: 'Mitigado',
  accepted: 'Aceito',
  resolved: 'Resolvido',
};

const Risks = () => {
  const { user } = useAuth();
  const [risks, setRisks] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ description: '', category: '', probability: '3', impact: '3', mitigation: '', status: 'identified' });

  const fetchData = async () => {
    const { data: comps } = await supabase.from('companies').select('*').order('name');
    setCompanies(comps || []);
    if (comps?.length && !selectedCompany) setSelectedCompany(comps[0].id);
  };

  const fetchRisks = async () => {
    if (!selectedCompany) return;
    const { data } = await supabase.from('risks').select('*').eq('company_id', selectedCompany).order('created_at', { ascending: false });
    setRisks((data as any[]) || []);
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { fetchRisks(); }, [selectedCompany]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const payload = { description: form.description, category: form.category, probability: parseInt(form.probability), impact: parseInt(form.impact), mitigation: form.mitigation, status: form.status };

    if (editing) {
      const { error } = await supabase.from('risks').update(payload).eq('id', editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Risco atualizado!');
    } else {
      const { error } = await supabase.from('risks').insert({ ...payload, company_id: selectedCompany, created_by: user.id });
      if (error) { toast.error(error.message); return; }
      toast.success('Risco cadastrado!');
    }
    setOpen(false);
    setEditing(null);
    setForm({ description: '', category: '', probability: '3', impact: '3', mitigation: '', status: 'identified' });
    fetchRisks();
  };

  const handleEdit = (risk: any) => {
    setEditing(risk);
    setForm({ description: risk.description, category: risk.category || '', probability: String(risk.probability), impact: String(risk.impact), mitigation: risk.mitigation || '', status: risk.status });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este risco?')) return;
    const { error } = await supabase.from('risks').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Risco removido!');
    fetchRisks();
  };

  // Build the risk matrix
  const matrixCells: Record<string, any[]> = {};
  risks.forEach(r => {
    const key = `${r.probability}-${r.impact}`;
    if (!matrixCells[key]) matrixCells[key] = [];
    matrixCells[key].push(r);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestão de Riscos</h1>
          <p className="text-muted-foreground text-sm mt-1">Mapeamento e mitigação de riscos</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm({ description: '', category: '', probability: '3', impact: '3', mitigation: '', status: 'identified' }); } }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />Novo Risco</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar Risco' : 'Novo Risco'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Descrição *</Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required placeholder="Descreva o risco" />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Ex: Segurança, Operacional" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Probabilidade (1-5)</Label>
                  <Select value={form.probability} onValueChange={v => setForm(f => ({ ...f, probability: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n} - {['Raro','Improvável','Possível','Provável','Quase certo'][n-1]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Impacto (1-5)</Label>
                  <Select value={form.impact} onValueChange={v => setForm(f => ({ ...f, impact: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n} - {['Insignificante','Menor','Moderado','Maior','Catastrófico'][n-1]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Mitigação</Label>
                <Textarea value={form.mitigation} onChange={e => setForm(f => ({ ...f, mitigation: e.target.value }))} placeholder="Ações de mitigação" rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">{editing ? 'Salvar' : 'Cadastrar'}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4 items-center">
        <Label className="whitespace-nowrap">Empresa:</Label>
        <Select value={selectedCompany} onValueChange={setSelectedCompany}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent>
            {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Risk Matrix */}
      {risks.length > 0 && (
        <Card className="glass-card">
          <CardHeader><CardTitle className="text-base">Matriz de Riscos (Probabilidade x Impacto)</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="grid grid-cols-6 gap-1 min-w-[500px]">
                <div className="text-xs text-muted-foreground flex items-end justify-center pb-1">Prob/Imp</div>
                {[1,2,3,4,5].map(i => <div key={i} className="text-xs text-center text-muted-foreground pb-1">{i}</div>)}
                {[5,4,3,2,1].map(p => (
                  <>
                    <div key={`label-${p}`} className="text-xs text-muted-foreground flex items-center justify-center">{p}</div>
                    {[1,2,3,4,5].map(i => {
                      const score = p * i;
                      const bg = score >= 16 ? 'bg-destructive/30' : score >= 9 ? 'bg-destructive/15' : score >= 4 ? 'bg-[hsl(var(--warning))]/15' : 'bg-[hsl(var(--success))]/15';
                      const items = matrixCells[`${p}-${i}`] || [];
                      return (
                        <div key={`${p}-${i}`} className={`${bg} rounded p-1 min-h-[40px] flex items-center justify-center`}>
                          {items.length > 0 && <span className="text-xs font-bold">{items.length}</span>}
                        </div>
                      );
                    })}
                  </>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {risks.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ShieldAlert className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum risco cadastrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {risks.map(risk => (
            <Card key={risk.id} className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-sm">{risk.description}</h3>
                      <Badge variant="outline" className={riskLevelLabels[risk.risk_level]?.className}>
                        {riskLevelLabels[risk.risk_level]?.label}
                      </Badge>
                      {risk.category && <Badge variant="outline">{risk.category}</Badge>}
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>Prob: {risk.probability}/5</span>
                      <span>Imp: {risk.impact}/5</span>
                      <span>Status: {statusLabels[risk.status]}</span>
                    </div>
                    {risk.mitigation && <p className="text-xs text-muted-foreground">Mitigação: {risk.mitigation}</p>}
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(risk)}><Pencil className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(risk.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Risks;
