import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Building2, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Company {
  id: string;
  name: string;
  cnpj: string | null;
  sector: string | null;
  contact_name: string | null;
  contact_email: string | null;
  created_at: string;
}

const Companies = () => {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [form, setForm] = useState({ name: '', cnpj: '', sector: '', contact_name: '', contact_email: '' });

  const fetchCompanies = async () => {
    const { data } = await supabase.from('companies').select('*').order('name');
    setCompanies(data || []);
  };

  useEffect(() => { fetchCompanies(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (editing) {
      const { error } = await supabase.from('companies').update({
        name: form.name,
        cnpj: form.cnpj || null,
        sector: form.sector || null,
        contact_name: form.contact_name || null,
        contact_email: form.contact_email || null,
      }).eq('id', editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Empresa atualizada!');
    } else {
      const { error } = await supabase.from('companies').insert({
        name: form.name,
        cnpj: form.cnpj || null,
        sector: form.sector || null,
        contact_name: form.contact_name || null,
        contact_email: form.contact_email || null,
        created_by: user.id,
      });
      if (error) { toast.error(error.message); return; }
      toast.success('Empresa cadastrada!');
    }

    setOpen(false);
    setEditing(null);
    setForm({ name: '', cnpj: '', sector: '', contact_name: '', contact_email: '' });
    fetchCompanies();
  };

  const handleEdit = (company: Company) => {
    setEditing(company);
    setForm({
      name: company.name,
      cnpj: company.cnpj || '',
      sector: company.sector || '',
      contact_name: company.contact_name || '',
      contact_email: company.contact_email || '',
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta empresa?')) return;
    const { error } = await supabase.from('companies').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Empresa excluída!');
    fetchCompanies();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Empresas</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie as empresas clientes</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm({ name: '', cnpj: '', sector: '', contact_name: '', contact_email: '' }); } }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />Nova Empresa</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar Empresa' : 'Nova Empresa'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CNPJ</Label>
                  <Input value={form.cnpj} onChange={e => setForm(f => ({ ...f, cnpj: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Setor</Label>
                  <Input value={form.sector} onChange={e => setForm(f => ({ ...f, sector: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contato</Label>
                  <Input value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Email Contato</Label>
                  <Input type="email" value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} />
                </div>
              </div>
              <Button type="submit" className="w-full">{editing ? 'Salvar' : 'Cadastrar'}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {companies.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhuma empresa cadastrada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map(company => (
            <Card key={company.id} className="glass-card hover:border-primary/30 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{company.name}</CardTitle>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(company)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(company.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-1">
                {company.cnpj && <p>CNPJ: {company.cnpj}</p>}
                {company.sector && <p>Setor: {company.sector}</p>}
                {company.contact_name && <p>Contato: {company.contact_name}</p>}
                {company.contact_email && <p>Email: {company.contact_email}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Companies;
