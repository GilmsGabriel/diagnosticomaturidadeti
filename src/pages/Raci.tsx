import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { getReadableError } from '@/lib/error-messages';

interface RaciEntry {
  id: string;
  company_id: string;
  process: string;
  responsible: string;
  accountable: string;
  consulted: string;
  informed: string;
}

const Raci = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<RaciEntry[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RaciEntry | null>(null);
  const [form, setForm] = useState({ process: '', responsible: '', accountable: '', consulted: '', informed: '', company_id: '' });

  const fetchData = async () => {
    const { data: comps } = await supabase.from('companies').select('*').order('name');
    setCompanies(comps || []);
    if (comps?.length && !selectedCompany) setSelectedCompany(comps[0].id);
  };

  const fetchEntries = async () => {
    if (!selectedCompany) return;
    const { data } = await supabase.from('raci_entries').select('*').eq('company_id', selectedCompany).order('created_at');
    setEntries((data as any[]) || []);
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { fetchEntries(); }, [selectedCompany]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const payload = { ...form, company_id: selectedCompany, created_by: user.id };

    if (editing) {
      const { created_by, ...updatePayload } = payload;
      const { error } = await supabase.from('raci_entries').update(updatePayload).eq('id', editing.id);
      if (error) { toast.error(getReadableError(error)); return; }
      toast.success('Entrada RACI atualizada!');
    } else {
      const { error } = await supabase.from('raci_entries').insert(payload);
      if (error) { toast.error(getReadableError(error)); return; }
      toast.success('Entrada RACI cadastrada!');
    }
    setOpen(false);
    setEditing(null);
    setForm({ process: '', responsible: '', accountable: '', consulted: '', informed: '', company_id: '' });
    fetchEntries();
  };

  const handleEdit = (entry: RaciEntry) => {
    setEditing(entry);
    setForm({ process: entry.process, responsible: entry.responsible, accountable: entry.accountable, consulted: entry.consulted, informed: entry.informed, company_id: entry.company_id });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta entrada?')) return;
    const { error } = await supabase.from('raci_entries').delete().eq('id', id);
    if (error) { toast.error(getReadableError(error)); return; }
    toast.success('Entrada removida!');
    fetchEntries();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Matriz RACI</h1>
          <p className="text-muted-foreground text-sm mt-1">Defina responsabilidades por processo</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm({ process: '', responsible: '', accountable: '', consulted: '', informed: '', company_id: '' }); } }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />Nova Entrada</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar Entrada RACI' : 'Nova Entrada RACI'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Processo / Atividade *</Label>
                <Input value={form.process} onChange={e => setForm(f => ({ ...f, process: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Responsável (R)</Label>
                  <Input value={form.responsible} onChange={e => setForm(f => ({ ...f, responsible: e.target.value }))} placeholder="Quem executa" />
                </div>
                <div className="space-y-2">
                  <Label>Aprovador (A)</Label>
                  <Input value={form.accountable} onChange={e => setForm(f => ({ ...f, accountable: e.target.value }))} placeholder="Quem aprova" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Consultado (C)</Label>
                  <Input value={form.consulted} onChange={e => setForm(f => ({ ...f, consulted: e.target.value }))} placeholder="Quem orienta" />
                </div>
                <div className="space-y-2">
                  <Label>Informado (I)</Label>
                  <Input value={form.informed} onChange={e => setForm(f => ({ ...f, informed: e.target.value }))} placeholder="Quem é notificado" />
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
          <SelectTrigger className="w-64"><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
          <SelectContent>
            {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {entries.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhuma entrada RACI cadastrada</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="glass-card overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Processo</TableHead>
                    <TableHead className="text-center">R (Responsável)</TableHead>
                    <TableHead className="text-center">A (Aprovador)</TableHead>
                    <TableHead className="text-center">C (Consultado)</TableHead>
                    <TableHead className="text-center">I (Informado)</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map(entry => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{entry.process}</TableCell>
                      <TableCell className="text-center text-sm">{entry.responsible}</TableCell>
                      <TableCell className="text-center text-sm">{entry.accountable}</TableCell>
                      <TableCell className="text-center text-sm">{entry.consulted}</TableCell>
                      <TableCell className="text-center text-sm">{entry.informed}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(entry)}><Pencil className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(entry.id)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Raci;
