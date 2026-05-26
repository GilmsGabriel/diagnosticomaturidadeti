import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, ClipboardList, Target, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { getReadableError } from '@/lib/error-messages';
import { KanbanBoard, type ActionPlan, type KanbanStatus } from '@/components/action-plans/KanbanBoard';
import { COBIT_DOMAINS, type CIAIndicator } from '@/lib/cobit-framework';

const KANBAN_LABELS: Record<KanbanStatus, string> = {
  backlog: 'Backlog',
  todo: 'A Fazer',
  doing: 'Em Progresso',
  done: 'Concluído',
};

const PRIORITY_LABELS: Record<string, string> = { low: 'Baixa', medium: 'Média', high: 'Alta' };

const emptyForm = {
  what: '', why: '', where: '', when: '', who: '', how: '', how_much: '',
  due_date: '', priority: 'medium', status: 'pending',
  kanban_status: 'backlog' as KanbanStatus,
  cobit_domain: 'APO',
  cia_indicators: [] as CIAIndicator[],
  reach: 100, impact_score: 1, confidence: 80, effort: 1,
  assessment_id: null as string | null,
  risk_id: null as string | null,
  kpi_success: '',
  department: '',
  action_code: '',
};

const ActionPlans = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [plans, setPlans] = useState<ActionPlan[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [criticalRisks, setCriticalRisks] = useState<any[]>([]);

  useEffect(() => { (async () => {
    const { data: comps } = await supabase.from('companies').select('*').order('name');
    setCompanies(comps || []);
    if (comps?.length) setSelectedCompany(comps[0].id);
  })(); }, []);

  const fetchPlans = async () => {
    if (!selectedCompany) return;
    const { data } = await supabase.from('action_plans').select('*').eq('company_id', selectedCompany).order('rice_score', { ascending: false });
    setPlans((data as any[]) || []);
    const { data: ass } = await supabase.from('assessments').select('id, created_at, status').eq('company_id', selectedCompany).order('created_at', { ascending: false });
    setAssessments(ass || []);
    const { data: risks } = await supabase.from('risks').select('*').eq('company_id', selectedCompany);
    setCriticalRisks(((risks as any[]) || []).filter(r => r.probability * r.impact >= 15));
  };
  useEffect(() => { fetchPlans(); }, [selectedCompany]);

  const prefillFromRisk = (risk: any) => {
    setEditing(null);
    setForm({
      ...emptyForm,
      what: `Mitigar: ${risk.description}`,
      why: `Risco crítico (P×I = ${risk.probability * risk.impact}). Categoria: ${risk.category || 'n/d'}.`,
      how: risk.mitigation || 'Definir e executar plano de mitigação.',
      priority: 'high',
      cobit_domain: 'APO',
      impact_score: 3,
      confidence: 90,
      risk_id: risk.id,
      who: risk.responsible || '',
      kpi_success: '',
    });
    setOpen(true);
  };

  // Open prefilled from ?risk_id=
  useEffect(() => {
    const riskId = searchParams.get('risk_id');
    if (riskId && criticalRisks.length) {
      const r = criticalRisks.find(x => x.id === riskId);
      if (r) { prefillFromRisk(r); searchParams.delete('risk_id'); setSearchParams(searchParams, { replace: true }); }
    }
    // eslint-disable-next-line
  }, [criticalRisks]);

  const riceScore = useMemo(() => {
    const e = Number(form.effort) || 1;
    return (Number(form.reach) * Number(form.impact_score) * Number(form.confidence)) / e;
  }, [form.reach, form.impact_score, form.confidence, form.effort]);

  const resetForm = () => { setForm(emptyForm); setEditing(null); };

  const toggleCia = (k: CIAIndicator) => setForm(f => ({
    ...f,
    cia_indicators: f.cia_indicators.includes(k) ? f.cia_indicators.filter(x => x !== k) : [...f.cia_indicators, k],
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const payload: any = {
      what: form.what, why: form.why, where: form.where, when: form.when, who: form.who, how: form.how, how_much: form.how_much,
      due_date: form.due_date || null,
      priority: form.priority, status: form.status, kanban_status: form.kanban_status,
      cobit_domain: form.cobit_domain, cia_indicators: form.cia_indicators,
      reach: form.reach, impact_score: form.impact_score, confidence: form.confidence, effort: form.effort,
      assessment_id: form.assessment_id || null,
      risk_id: form.risk_id || null,
      kpi_success: form.kpi_success || '',
      department: form.department || '',
      action_code: form.action_code || '',
    };
    if (editing) {
      const { error } = await supabase.from('action_plans').update(payload).eq('id', editing.id);
      if (error) return toast.error(getReadableError(error));
      toast.success('Plano atualizado!');
    } else {
      const { error } = await supabase.from('action_plans').insert({ ...payload, company_id: selectedCompany, created_by: user.id });
      if (error) return toast.error(getReadableError(error));
      toast.success('Plano criado!');
    }
    setOpen(false); resetForm(); fetchPlans();
  };

  const handleEdit = (p: any) => {
    setEditing(p);
    setForm({
      what: p.what || '', why: p.why || '', where: p.where || '', when: p.when || '',
      who: p.who || '', how: p.how || '', how_much: p.how_much || '',
      due_date: p.due_date || '', priority: p.priority || 'medium', status: p.status || 'pending',
      kanban_status: (p.kanban_status || 'backlog') as KanbanStatus,
      cobit_domain: p.cobit_domain || 'APO',
      cia_indicators: (p.cia_indicators || []) as CIAIndicator[],
      reach: Number(p.reach ?? 100), impact_score: Number(p.impact_score ?? 1),
      confidence: Number(p.confidence ?? 80), effort: Number(p.effort ?? 1),
      assessment_id: p.assessment_id || null,
      risk_id: p.risk_id || null,
      kpi_success: p.kpi_success || '',
      department: p.department || '',
      action_code: p.action_code || '',
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este plano?')) return;
    const { error } = await supabase.from('action_plans').delete().eq('id', id);
    if (error) return toast.error(getReadableError(error));
    toast.success('Plano removido!'); fetchPlans();
  };

  const handleMove = async (id: string, status: KanbanStatus) => {
    setPlans(prev => prev.map(p => p.id === id ? { ...p, kanban_status: status } : p));
    const { error } = await supabase.from('action_plans').update({ kanban_status: status }).eq('id', id);
    if (error) { toast.error(getReadableError(error)); fetchPlans(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Planos de Ação</h1>
          <p className="text-muted-foreground text-sm mt-1">5W2H · Priorização RICE · Kanban</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />Novo Plano</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar Plano de Ação' : 'Novo Plano de Ação'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Tabs defaultValue="5w2h">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="5w2h">5W2H</TabsTrigger>
                  <TabsTrigger value="rice">RICE</TabsTrigger>
                  <TabsTrigger value="gov">Governança</TabsTrigger>
                </TabsList>

                <TabsContent value="5w2h" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>O quê? (What) *</Label>
                    <Textarea value={form.what} onChange={e => setForm(f => ({ ...f, what: e.target.value }))} required placeholder="O que será feito?" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Por quê? (Why)</Label><Textarea rows={2} value={form.why} onChange={e => setForm(f => ({ ...f, why: e.target.value }))} placeholder="Justificativa" /></div>
                    <div className="space-y-2"><Label>Onde? (Where)</Label><Input value={form.where} onChange={e => setForm(f => ({ ...f, where: e.target.value }))} placeholder="Local" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Quando? (When)</Label><Input value={form.when} onChange={e => setForm(f => ({ ...f, when: e.target.value }))} placeholder="Prazo descritivo" /></div>
                    <div className="space-y-2"><Label>Data limite *</Label><Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Quem? (Who) *</Label><Input value={form.who} onChange={e => setForm(f => ({ ...f, who: e.target.value }))} placeholder="Responsável" /></div>
                    <div className="space-y-2"><Label>Quanto custa? (How Much)</Label><Input value={form.how_much} onChange={e => setForm(f => ({ ...f, how_much: e.target.value }))} placeholder="R$ ..." /></div>
                  </div>
                  <div className="space-y-2"><Label>Como? (How)</Label><Textarea rows={2} value={form.how} onChange={e => setForm(f => ({ ...f, how: e.target.value }))} placeholder="Método de execução" /></div>
                  <div className="space-y-2">
                    <Label>KPI de sucesso</Label>
                    <Textarea rows={2} value={form.kpi_success} onChange={e => setForm(f => ({ ...f, kpi_success: e.target.value }))}
                      placeholder='Ex.: "100% dos backups com restore validado mensalmente; RPO ≤ 24h"' />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Departamento</Label><Input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} placeholder="TI / Segurança" /></div>
                    <div className="space-y-2"><Label>Código da Ação</Label><Input value={form.action_code} onChange={e => setForm(f => ({ ...f, action_code: e.target.value }))} placeholder="Ex.: 01" /></div>
                  </div>
                </TabsContent>

                <TabsContent value="rice" className="space-y-5 pt-4">
                  <div className="rounded-lg border bg-primary/5 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium"><Target className="h-4 w-4 text-primary" /> RICE Score</div>
                    <span className="text-3xl font-bold text-primary">{Math.round(riceScore).toLocaleString('pt-BR')}</span>
                  </div>
                  {[
                    { key: 'reach', label: 'Reach (Alcance)', min: 100, max: 1600, step: 50, hint: 'Quantas pessoas/sistemas serão impactados?' },
                    { key: 'impact_score', label: 'Impact (Impacto)', min: 0.25, max: 3, step: 0.25, hint: '0.25 mínimo · 0.5 baixo · 1 médio · 2 alto · 3 massivo' },
                    { key: 'confidence', label: 'Confidence (Confiança %)', min: 20, max: 100, step: 5, hint: '20% palpite · 50% médio · 80% alta · 100% certeza' },
                    { key: 'effort', label: 'Effort (Esforço — pessoa-mês)', min: 1, max: 15, step: 1, hint: '1 trivial · 5 médio · 15 muito alto' },
                  ].map(s => (
                    <div key={s.key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>{s.label}</Label>
                        <span className="text-sm font-mono text-primary">{(form as any)[s.key]}</span>
                      </div>
                      <Slider value={[(form as any)[s.key]]} min={s.min} max={s.max} step={s.step} onValueChange={([v]) => setForm(f => ({ ...f, [s.key]: v }))} />
                      <p className="text-xs text-muted-foreground">{s.hint}</p>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="gov" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Domínio COBIT</Label>
                    <Select value={form.cobit_domain} onValueChange={v => setForm(f => ({ ...f, cobit_domain: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{COBIT_DOMAINS.map(d => <SelectItem key={d.key} value={d.key}>{d.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Indicadores CIA (ISO 27001)</Label>
                    <div className="flex gap-4">
                      {(['C', 'I', 'A'] as CIAIndicator[]).map(k => (
                        <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox checked={form.cia_indicators.includes(k)} onCheckedChange={() => toggleCia(k)} />
                          {k === 'C' ? 'Confidencialidade' : k === 'I' ? 'Integridade' : 'Disponibilidade'}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Status (Kanban)</Label>
                      <Select value={form.kanban_status} onValueChange={(v) => setForm(f => ({ ...f, kanban_status: v as KanbanStatus }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(KANBAN_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Prioridade</Label>
                      <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(PRIORITY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Diagnóstico vinculado (opcional)</Label>
                    <Select value={form.assessment_id || 'none'} onValueChange={v => setForm(f => ({ ...f, assessment_id: v === 'none' ? null : v }))}>
                      <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {assessments.map(a => <SelectItem key={a.id} value={a.id}>{new Date(a.created_at).toLocaleDateString('pt-BR')} — {a.status}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
              </Tabs>

              <Button type="submit" className="w-full">{editing ? 'Salvar' : 'Cadastrar'}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4 items-center">
        <Label className="whitespace-nowrap">Empresa:</Label>
        <Select value={selectedCompany} onValueChange={setSelectedCompany}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {criticalRisks.length > 0 && (
        (() => {
          const pending = criticalRisks.filter(r => !plans.some((p: any) => p.risk_id === r.id));
          if (!pending.length) return null;
          return (
            <Card className="glass-card border-destructive/30">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ShieldAlert className="h-4 w-4 text-destructive" />
                  Sugestões de plano — riscos críticos (P×I ≥ 15) sem 5W2H
                </div>
                {pending.map(r => (
                  <div key={r.id} className="flex items-center justify-between gap-2 text-sm border-t border-border/50 pt-2">
                    <div className="flex-1 min-w-0">
                      <p className="truncate"><strong>{r.description}</strong></p>
                      <p className="text-xs text-muted-foreground">P {r.probability} · I {r.impact} · P×I {r.probability * r.impact}</p>
                    </div>
                    <Button size="sm" onClick={() => prefillFromRisk(r)}>Gerar 5W2H</Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })()
      )}

      {plans.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum plano de ação cadastrado</p>
          </CardContent>
        </Card>
      ) : (
        <KanbanBoard plans={plans} onMove={handleMove} onEdit={handleEdit} onDelete={handleDelete} />
      )}
    </div>
  );
};

export default ActionPlans;