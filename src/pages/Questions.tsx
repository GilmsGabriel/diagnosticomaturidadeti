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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Plus, Pencil, Trash2, FileQuestion } from 'lucide-react';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
  description: string | null;
}

interface Question {
  id: string;
  category_id: string;
  text: string;
  description: string | null;
  weight: number;
  sort_order: number;
}

const Questions = () => {
  const { isAdmin } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [open, setOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [form, setForm] = useState({ text: '', description: '', category_id: '', weight: '1' });
  const [catForm, setCatForm] = useState({ name: '', description: '', weight: '1' });

  const fetchData = async () => {
    const [catRes, qRes] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('questions').select('*').eq('active', true).order('sort_order'),
    ]);
    setCategories(catRes.data || []);
    setQuestions(qRes.data || []);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      text: form.text,
      description: form.description || null,
      category_id: form.category_id,
      weight: parseFloat(form.weight) || 1,
    };

    if (editing) {
      const { error } = await supabase.from('questions').update(payload).eq('id', editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Questão atualizada!');
    } else {
      const { error } = await supabase.from('questions').insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success('Questão cadastrada!');
    }

    setOpen(false);
    setEditing(null);
    setForm({ text: '', description: '', category_id: '', weight: '1' });
    fetchData();
  };

  const handleEdit = (q: Question) => {
    setEditing(q);
    setForm({ text: q.text, description: q.description || '', category_id: q.category_id, weight: String(q.weight) });
    setOpen(true);
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Excluir esta questão?')) return;
    const { error } = await supabase.from('questions').update({ active: false }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Questão removida!');
    fetchData();
  };

  const handleCatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name: catForm.name, description: catForm.description || null, weight: parseFloat(catForm.weight) || 1 };
    if (editingCat) {
      const { error } = await supabase.from('categories').update(payload).eq('id', editingCat.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Categoria atualizada!');
    } else {
      const { error } = await supabase.from('categories').insert({ ...payload, sort_order: categories.length });
      if (error) { toast.error(error.message); return; }
      toast.success('Categoria cadastrada!');
    }
    setCatOpen(false);
    setEditingCat(null);
    setCatForm({ name: '', description: '', weight: '1' });
    fetchData();
  };

  const handleEditCat = (cat: Category) => {
    setEditingCat(cat);
    setCatForm({ name: cat.name, description: cat.description || '', weight: '1' });
    setCatOpen(true);
  };

  const handleDeleteCat = async (id: string) => {
    if (!confirm('Excluir esta categoria e todas suas questões?')) return;
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Categoria removida!');
    fetchData();
  };

  const getQuestionsForCategory = (catId: string) => questions.filter(q => q.category_id === catId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Questões</h1>
          <p className="text-muted-foreground text-sm mt-1">Banco de questões por categoria</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Dialog open={catOpen} onOpenChange={(v) => { setCatOpen(v); if (!v) { setEditingCat(null); setCatForm({ name: '', description: '', weight: '1' }); } }}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2"><Plus className="h-4 w-4" />Nova Categoria</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingCat ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCatSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome *</Label>
                    <Input value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Textarea value={catForm.description} onChange={e => setCatForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Peso</Label>
                    <Input type="number" min="0.1" step="0.1" value={catForm.weight} onChange={e => setCatForm(f => ({ ...f, weight: e.target.value }))} />
                  </div>
                  <Button type="submit" className="w-full">{editingCat ? 'Salvar' : 'Cadastrar'}</Button>
                </form>
              </DialogContent>
            </Dialog>
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm({ text: '', description: '', category_id: '', weight: '1' }); } }}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="h-4 w-4" />Nova Questão</Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? 'Editar Questão' : 'Nova Questão'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Categoria *</Label>
                  <Select value={form.category_id} onValueChange={v => setForm(f => ({ ...f, category_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Pergunta *</Label>
                  <Textarea value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>Descrição / Orientação</Label>
                  <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Peso</Label>
                  <Input type="number" min="0.1" step="0.1" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} />
                </div>
                <Button type="submit" className="w-full">{editing ? 'Salvar' : 'Cadastrar'}</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {categories.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileQuestion className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhuma categoria encontrada</p>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" defaultValue={categories.map(c => c.id)} className="space-y-3">
          {categories.map(cat => {
            const catQuestions = getQuestionsForCategory(cat.id);
            return (
              <AccordionItem key={cat.id} value={cat.id} className="glass-card border-none">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-3 text-left">
                    <span className="font-semibold">{cat.name}</span>
                    <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                      {catQuestions.length} questões
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4">
                  {cat.description && (
                    <p className="text-sm text-muted-foreground mb-4">{cat.description}</p>
                  )}
                  {catQuestions.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">Nenhuma questão nesta categoria</p>
                  ) : (
                    <div className="space-y-2">
                      {catQuestions.map((q, i) => (
                        <div key={q.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
                          <span className="text-xs font-mono text-muted-foreground mt-0.5">{i + 1}.</span>
                          <div className="flex-1">
                            <p className="text-sm">{q.text}</p>
                            {q.description && <p className="text-xs text-muted-foreground mt-1">{q.description}</p>}
                          </div>
                          {isAdmin && (
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(q)}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(q.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
};

export default Questions;
