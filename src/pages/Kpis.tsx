import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { getReadableError } from '@/lib/error-messages';

const statusConfig: Record<string, { label: string; icon: any; className: string }> = {
  on_track: { label: 'No alvo', icon: TrendingUp, className: 'text-[hsl(var(--success))]' },
  at_risk: { label: 'Em risco', icon: Minus, className: 'text-[hsl(var(--warning))]' },
  off_track: { label: 'Fora do alvo', icon: TrendingDown, className: 'text-destructive' },
};

const Kpis = () => {
  const { user } = useAuth();
  const [kpis, setKpis] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ name: '', description: '', category: '', target_value: '', current_value: '', unit: '', status: 'on_track' });

  const fetchData = async () => {
    const { data: comps } = await supabase.from('companies').select('*').order('name');
    setCompanies(comps || []);
    if (comps?.length && !selectedCompany) setSelectedCompany(comps[0].id);
  };

  const fetchKpis = async () => {
    if (!selectedCompany) return;
    const { data } = await supabase.from('kpis').select('*').eq('company_id', selectedCompany).order('created_at');
    setKpis((data as any[]) || []);
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { fetchKpis(); }, [selectedCompany]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const payload = {
      name: form.name, description: form.description, category: form.category,
      target_value: form.target_value ? parseFloat(form.target_value) : null,
      current_value: form.current_value ? parseFloat(form.current_value) : null,
      unit: form.unit, status: form.status,
    };

    if (editing) {
      const { error } = await supabase.from('kpis').update(payload).eq('id', editing.id);
      if (error) { toast.error(getReadableError(error)); return; }
      toast.success('KPI atualizado!');
    } else {
      const { error } = await supabase.from('kpis').insert({ ...payload, company_id: selectedCompany, created_by: user.id });
      if (error) { toast.error(getReadableError(error)); return; }
      toast.success('KPI cadastrado!');
    }
    setOpen(false);
    setEditing(null);
    setForm({ name: '', description: '', category: '', target_value: '', current_value: '', unit: '', status: 'on_track' });
    fetchKpis();
  };

  const handleEdit = (kpi: any) => {
    setEditing(kpi);
    setForm({ name: kpi.name, description: kpi.description || '', category: kpi.category || '', target_value: kpi.target_value != null ? String(kpi.target_value) : '', current_value: kpi.current_value != null ? String(kpi.current_value) : '', unit: kpi.unit || '', status: kpi.status });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este KPI?')) return;
    const { error } = await supabase.from('kpis').delete().eq('id', id);
    if (error) { toast.error(getReadableError(error)); return; }
    toast.success('KPI removido!');
    fetchKpis();
  };

  const getProgress = (current: number | null, target: number | null) => {
    if (!target || target === 0 || current == null) return 0;
    return Math.min(100, Math.round((current / target) * 100));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">KPIs / Indicadores</h1>
          <p className="text-muted-foreground text-sm mt-1">Monitore indicadores estratégicos de TI</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm({ name: '', description: '', category: '', target_value: '', current_value: '', unit: '', status: 'on_track' }); } }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />Novo KPI</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar KPI' : 'Novo KPI'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Nome do indicador" />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descrição" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Ex: SLA, Segurança" />
                </div>
                <div className="space-y-2">
                  <Label>Unidade</Label>
                  <Input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="%, horas, R$" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Meta</Label>
                  <Input type="number" step="0.01" value={form.target_value} onChange={e => setForm(f => ({ ...f, target_value: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Valor Atual</Label>
                  <Input type="number" step="0.01" value={form.current_value} onChange={e => setForm(f => ({ ...f, current_value: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
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

      {kpis.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum KPI cadastrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {kpis.map(kpi => {
            const progress = getProgress(kpi.current_value, kpi.target_value);
            const sc = statusConfig[kpi.status] || statusConfig.on_track;
            const StatusIcon = sc.icon;
            return (
              <Card key={kpi.id} className="glass-card">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <StatusIcon className={`h-4 w-4 ${sc.className}`} />
                      <CardTitle className="text-sm">{kpi.name}</CardTitle>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(kpi)}><Pencil className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(kpi.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {kpi.description && <p className="text-xs text-muted-foreground">{kpi.description}</p>}
                  {kpi.category && <Badge variant="outline" className="text-xs">{kpi.category}</Badge>}
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {kpi.current_value != null ? kpi.current_value : '—'} {kpi.unit}
                      </span>
                      <span className="font-medium">
                        Meta: {kpi.target_value != null ? kpi.target_value : '—'} {kpi.unit}
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-right text-muted-foreground">{progress}%</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Kpis;
