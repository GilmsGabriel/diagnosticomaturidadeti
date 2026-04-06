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
import { Plus, Pencil, Trash2, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';

const statusLabels: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pendente', className: 'bg-[hsl(var(--warning))]/20 text-[hsl(var(--warning))]' },
  in_progress: { label: 'Em andamento', className: 'bg-[hsl(var(--info))]/20 text-[hsl(var(--info))]' },
  completed: { label: 'Concluído', className: 'bg-[hsl(var(--success))]/20 text-[hsl(var(--success))]' },
  cancelled: { label: 'Cancelado', className: 'bg-destructive/20 text-destructive' },
};

const priorityLabels: Record<string, { label: string; className: string }> = {
  low: { label: 'Baixa', className: 'bg-muted text-muted-foreground' },
  medium: { label: 'Média', className: 'bg-[hsl(var(--warning))]/20 text-[hsl(var(--warning))]' },
  high: { label: 'Alta', className: 'bg-destructive/20 text-destructive' },
};

const ActionPlans = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ what: '', why: '', where: '', when: '', who: '', how: '', how_much: '', status: 'pending', priority: 'medium' });

  const fetchData = async () => {
    const { data: comps } = await supabase.from('companies').select('*').order('name');
    setCompanies(comps || []);
    if (comps?.length && !selectedCompany) setSelectedCompany(comps[0].id);
  };

  const fetchPlans = async () => {
    if (!selectedCompany) return;
    const { data } = await supabase.from('action_plans').select('*').eq('company_id', selectedCompany).order('created_at', { ascending: false });
    setPlans((data as any[]) || []);
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { fetchPlans(); }, [selectedCompany]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (editing) {
      const { error } = await supabase.from('action_plans').update(form).eq('id', editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Plano atualizado!');
    } else {
      const { error } = await supabase.from('action_plans').insert({ ...form, company_id: selectedCompany, created_by: user.id });
      if (error) { toast.error(error.message); return; }
      toast.success('Plano criado!');
    }
    setOpen(false);
    setEditing(null);
    setForm({ what: '', why: '', where: '', when: '', who: '', how: '', how_much: '', status: 'pending', priority: 'medium' });
    fetchPlans();
  };

  const handleEdit = (plan: any) => {
    setEditing(plan);
    setForm({ what: plan.what, why: plan.why || '', where: plan.where || '', when: plan.when || '', who: plan.who || '', how: plan.how || '', how_much: plan.how_much || '', status: plan.status, priority: plan.priority });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este plano?')) return;
    const { error } = await supabase.from('action_plans').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Plano removido!');
    fetchPlans();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Planos de Ação</h1>
          <p className="text-muted-foreground text-sm mt-1">Metodologia 5W2H para governança</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm({ what: '', why: '', where: '', when: '', who: '', how: '', how_much: '', status: 'pending', priority: 'medium' }); } }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />Novo Plano</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar Plano de Ação' : 'Novo Plano de Ação (5W2H)'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>O quê? (What) *</Label>
                <Textarea value={form.what} onChange={e => setForm(f => ({ ...f, what: e.target.value }))} required placeholder="O que será feito?" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Por quê? (Why)</Label>
                  <Textarea value={form.why} onChange={e => setForm(f => ({ ...f, why: e.target.value }))} placeholder="Justificativa" rows={2} />
                </div>
                <div className="space-y-2">
                  <Label>Onde? (Where)</Label>
                  <Input value={form.where} onChange={e => setForm(f => ({ ...f, where: e.target.value }))} placeholder="Local / Departamento" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quando? (When)</Label>
                  <Input value={form.when} onChange={e => setForm(f => ({ ...f, when: e.target.value }))} placeholder="Prazo" />
                </div>
                <div className="space-y-2">
                  <Label>Quem? (Who)</Label>
                  <Input value={form.who} onChange={e => setForm(f => ({ ...f, who: e.target.value }))} placeholder="Responsável" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Como? (How)</Label>
                  <Textarea value={form.how} onChange={e => setForm(f => ({ ...f, how: e.target.value }))} placeholder="Método" rows={2} />
                </div>
                <div className="space-y-2">
                  <Label>Quanto custa? (How Much)</Label>
                  <Input value={form.how_much} onChange={e => setForm(f => ({ ...f, how_much: e.target.value }))} placeholder="Custo estimado" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Prioridade</Label>
                  <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(priorityLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
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

      {plans.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum plano de ação cadastrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {plans.map(plan => (
            <Card key={plan.id} className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-sm">{plan.what}</h3>
                      <Badge variant="outline" className={statusLabels[plan.status]?.className}>{statusLabels[plan.status]?.label}</Badge>
                      <Badge variant="outline" className={priorityLabels[plan.priority]?.className}>{priorityLabels[plan.priority]?.label}</Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
                      {plan.who && <span>👤 {plan.who}</span>}
                      {plan.when && <span>📅 {plan.when}</span>}
                      {plan.where && <span>📍 {plan.where}</span>}
                      {plan.how_much && <span>💰 {plan.how_much}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(plan)}><Pencil className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(plan.id)}><Trash2 className="h-3 w-3" /></Button>
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

export default ActionPlans;
