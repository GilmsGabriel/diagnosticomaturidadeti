import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Compass } from 'lucide-react';
import { toast } from 'sonner';
import { getReadableError } from '@/lib/error-messages';
import { useConfirm } from '@/components/ConfirmDialog';
import { ListSkeleton } from '@/components/PageSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { swotSchema, validateOrToast } from '@/lib/schemas';

type SwotType = 'strength' | 'weakness' | 'opportunity' | 'threat';

const TYPE_META: Record<SwotType, { label: string; prefix: string; tone: string }> = {
  strength:    { label: 'Força',        prefix: 'FOR', tone: 'bg-[hsl(var(--success))]/20 text-[hsl(var(--success))]' },
  weakness:    { label: 'Fraqueza',     prefix: 'FRA', tone: 'bg-destructive/20 text-destructive' },
  opportunity: { label: 'Oportunidade', prefix: 'OPO', tone: 'bg-primary/20 text-primary' },
  threat:      { label: 'Ameaça',       prefix: 'AME', tone: 'bg-[hsl(var(--warning))]/20 text-[hsl(var(--warning))]' },
};

const Swot = () => {
  const { user } = useAuth();
  const confirm = useConfirm();
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<{ type: SwotType; description: string; code: string }>({
    type: 'strength', description: '', code: '',
  });

  useEffect(() => { (async () => {
    const { data } = await supabase.from('companies').select('*').order('name');
    setCompanies(data || []);
    if (data?.length) setSelectedCompany(data[0].id);
  })(); }, []);

  const load = async () => {
    if (!selectedCompany) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase.from('swot_entries') as any)
        .select('*').eq('company_id', selectedCompany).order('type').order('sort_order');
      if (error) throw error;
      setItems(data || []);
    } catch (e) { toast.error(getReadableError(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [selectedCompany]);

  const nextCode = (type: SwotType) => {
    const prefix = TYPE_META[type].prefix;
    const existing = items.filter(i => i.type === type)
      .map(i => Number(String(i.code || '').replace(`${prefix}-`, '')))
      .filter(n => !isNaN(n));
    const n = (existing.length ? Math.max(...existing) : 0) + 1;
    return `${prefix}-${String(n).padStart(2, '0')}`;
  };

  const reset = () => { setEditing(null); setForm({ type: 'strength', description: '', code: '' }); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedCompany) return;
    const parsed = validateOrToast(swotSchema, form, toast.error);
    if (!parsed) return;
    const code = (form.code || '').trim() || nextCode(form.type);
    const payload: any = { type: form.type, description: form.description.trim(), code };
    if (editing) {
      const { error } = await (supabase.from('swot_entries') as any).update(payload).eq('id', editing.id);
      if (error) { toast.error(getReadableError(error)); return; }
      toast.success('Item SWOT atualizado!');
    } else {
      const { error } = await (supabase.from('swot_entries') as any).insert({
        ...payload, company_id: selectedCompany, created_by: user.id,
      });
      if (error) { toast.error(getReadableError(error)); return; }
      toast.success('Item SWOT cadastrado!');
    }
    setOpen(false); reset(); load();
  };

  const handleEdit = (it: any) => {
    setEditing(it);
    setForm({ type: it.type, description: it.description, code: it.code || '' });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({ title: 'Excluir item SWOT', description: 'Esta ação não pode ser desfeita.', confirmText: 'Excluir', destructive: true });
    if (!ok) return;
    const { error } = await (supabase.from('swot_entries') as any).delete().eq('id', id);
    if (error) { toast.error(getReadableError(error)); return; }
    toast.success('Item removido!'); load();
  };

  const grouped = useMemo(() => {
    const g: Record<SwotType, any[]> = { strength: [], weakness: [], opportunity: [], threat: [] };
    items.forEach(i => { if (g[i.type as SwotType]) g[i.type as SwotType].push(i); });
    return g;
  }, [items]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Compass className="h-6 w-6 text-primary" /> Análise SWOT</h1>
          <p className="text-muted-foreground text-sm mt-1">Forças, Fraquezas, Oportunidades e Ameaças da TI — códigos rastreáveis pelo PDTI.</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Novo item</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? 'Editar item SWOT' : 'Novo item SWOT'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v as SwotType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TYPE_META) as SwotType[]).map(k =>
                      <SelectItem key={k} value={k}>{TYPE_META[k].label} ({TYPE_META[k].prefix})</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Código (opcional — auto-gerado se vazio)</Label>
                <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder={`Ex.: ${TYPE_META[form.type].prefix}-01`} />
              </div>
              <div className="space-y-2">
                <Label>Descrição *</Label>
                <Textarea required rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descreva o item SWOT" />
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
          <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {loading ? <ListSkeleton rows={4} /> : items.length === 0 ? (
        <EmptyState icon={Compass} title="Nenhum item SWOT cadastrado"
          description="Mapeie Forças, Fraquezas, Oportunidades e Ameaças. Os códigos gerados serão referenciados por Riscos e Planos de Ação no PDTI." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(Object.keys(TYPE_META) as SwotType[]).map(t => (
            <Card key={t} className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Badge variant="outline" className={TYPE_META[t].tone}>{TYPE_META[t].prefix}</Badge>
                  {TYPE_META[t].label}s
                  <span className="text-muted-foreground text-xs ml-auto">{grouped[t].length}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {grouped[t].length === 0 && <p className="text-xs text-muted-foreground">Nenhum item.</p>}
                {grouped[t].map(it => (
                  <div key={it.id} className="flex items-start gap-2 border-b border-border/40 pb-2 last:border-0">
                    <Badge variant="outline" className="text-[10px] mt-0.5">{it.code || '—'}</Badge>
                    <p className="text-sm flex-1">{it.description}</p>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(it)}><Pencil className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(it.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Swot;