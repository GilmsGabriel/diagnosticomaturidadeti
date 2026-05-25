import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Copy, FileText, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { calculateMaturity, defaultTarget } from '@/lib/maturity-calculator';
import { buildMarkdown, buildLatex, runQualityGate, type ExportData } from '@/lib/pdti-export';

const ExportPdti = () => {
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [data, setData] = useState<ExportData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { (async () => {
    const { data: comps } = await supabase.from('companies').select('*').order('name');
    setCompanies(comps || []);
    if (comps?.length) setSelectedCompany(comps[0].id);
  })(); }, []);

  useEffect(() => { if (selectedCompany) load(); /* eslint-disable-next-line */ }, [selectedCompany]);

  const load = async () => {
    setLoading(true);
    const company = companies.find(c => c.id === selectedCompany);
    if (!company) { setLoading(false); return; }

    const [{ data: ass }, { data: risks }, { data: plans }, { data: kpis }, { data: raci }, { data: cats }, { data: qs }] = await Promise.all([
      supabase.from('assessments').select('*').eq('company_id', selectedCompany).order('created_at', { ascending: false }).limit(1),
      supabase.from('risks').select('*').eq('company_id', selectedCompany),
      supabase.from('action_plans').select('*').eq('company_id', selectedCompany).order('rice_score', { ascending: false }),
      supabase.from('kpis').select('*').eq('company_id', selectedCompany),
      supabase.from('raci_entries').select('*').eq('company_id', selectedCompany),
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('questions').select('*').eq('active', true),
    ]);

    let maturity = null;
    let assessmentDate: string | undefined;
    const targets: Record<string, number> = {};
    if (ass?.length) {
      const a = ass[0];
      assessmentDate = new Date(a.created_at).toLocaleDateString('pt-BR');
      const { data: ans } = await supabase.from('assessment_answers').select('*').eq('assessment_id', a.id);
      maturity = calculateMaturity(cats || [], qs || [], ans || []);
      maturity.categories.forEach(c => { targets[c.id] = defaultTarget(c.score); });
    }

    setData({
      company,
      assessmentDate,
      maturity,
      targets,
      risks: (risks as any[]) || [],
      plans: (plans as any[]) || [],
      kpis: (kpis as any[]) || [],
      raci: (raci as any[]) || [],
    });
    setLoading(false);
  };

  const gate = useMemo(() => (data ? runQualityGate(data) : null), [data]);
  const markdown = useMemo(() => (data ? buildMarkdown(data) : ''), [data]);
  const latex = useMemo(() => (data ? buildLatex(data) : ''), [data]);

  const downloadMd = () => {
    if (!data) return;
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PDTI_${data.company.name.replace(/\s+/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Markdown baixado!');
  };

  const copyLatex = async () => {
    await navigator.clipboard.writeText(latex);
    toast.success('Código LaTeX copiado!');
  };

  const disabled = !data || !gate?.ok;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6 text-primary" /> Central de Exportação PDTI</h1>
        <p className="text-muted-foreground text-sm mt-1">Compila Maturidade, Riscos, Planos e Governança em formato Markdown e LaTeX (Overleaf-ready).</p>
      </div>

      <div className="flex gap-4 items-center">
        <Label className="whitespace-nowrap">Empresa:</Label>
        <Select value={selectedCompany} onValueChange={setSelectedCompany}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> Quality Gate
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && <p className="text-sm text-muted-foreground">Carregando dados…</p>}
          {gate?.checks.map((c, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                {c.pass ? <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" /> : <XCircle className="h-4 w-4 text-destructive" />}
                <span className={c.pass ? '' : 'text-destructive font-medium'}>{c.label}</span>
              </div>
              {!c.pass && c.items.length > 0 && (
                <ul className="text-xs text-muted-foreground ml-6 list-disc">
                  {c.items.map((it, j) => <li key={j}>{it}</li>)}
                </ul>
              )}
            </div>
          ))}
          {gate && (
            <p className={`text-xs mt-2 ${gate.ok ? 'text-[hsl(var(--success))]' : 'text-destructive'}`}>
              {gate.ok ? '✓ Documento aprovado para exportação.' : '⚠ Corrija as inconsistências antes de exportar.'}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader><CardTitle className="text-base">Relatório Técnico (Markdown)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">Compila o PDTI estruturado em Markdown limpo (tabelas, seções, governança).</p>
          <Button onClick={downloadMd} disabled={disabled} className="gap-2">
            <Download className="h-4 w-4" /> Exportar .md
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Template LaTeX (Overleaf-Ready)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">Use <code>longtable</code> e <code>booktabs</code>. Cole no Overleaf e compile.</p>
          <Textarea value={latex} readOnly rows={14} className="font-mono text-xs" />
          <Button onClick={copyLatex} disabled={disabled} variant="secondary" className="gap-2">
            <Copy className="h-4 w-4" /> Copiar código LaTeX
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExportPdti;