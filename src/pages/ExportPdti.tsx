import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Copy, FileText, CheckCircle2, XCircle, ShieldCheck, Lock, ExternalLink } from 'lucide-react';
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

    const [{ data: ass }, { data: risks }, { data: plans }, { data: kpis }, { data: raci }, { data: cats }, { data: qs }, { data: swot }] = await Promise.all([
      supabase.from('assessments').select('*').eq('company_id', selectedCompany).order('created_at', { ascending: false }).limit(1),
      supabase.from('risks').select('*').eq('company_id', selectedCompany),
      supabase.from('action_plans').select('*').eq('company_id', selectedCompany).order('rice_score', { ascending: false }),
      supabase.from('kpis').select('*').eq('company_id', selectedCompany),
      supabase.from('raci_entries').select('*').eq('company_id', selectedCompany),
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('questions').select('*').eq('active', true),
      supabase.from('swot_entries').select('*').eq('company_id', selectedCompany).order('sort_order'),
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
      swot: (swot as any[]) || [],
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

  const downloadTex = () => {
    if (!data) return;
    const blob = new Blob([latex], { type: 'application/x-tex;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PDTI_${data.company.name.replace(/\s+/g, '_')}.tex`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Arquivo .tex baixado!');
  };

  const copyLatex = async () => {
    if (!gate?.ok) { toast.error('Corrija as inconsistências do Quality Gate antes de copiar.'); return; }
    await navigator.clipboard.writeText(latex);
    toast.success('Código LaTeX copiado!');
  };

  const disabled = !data || !gate?.ok;
  const gateTitle = disabled ? 'Corrija as inconsistências do Quality Gate para liberar a exportação.' : '';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6 text-primary" /> Central de Exportação PDTI</h1>
        <p className="text-muted-foreground text-sm mt-1">Compila Maturidade, Riscos, Planos, SWOT, KPIs e Governança em formato Markdown e LaTeX (Overleaf-ready), no padrão SISP v2.1 / COBIT 2019 / ITIL 4 / ISO 27001.</p>
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
                <div className="ml-6 space-y-1">
                  <ul className="text-xs text-muted-foreground list-disc ml-4">
                    {c.items.map((it, j) => <li key={j}>{it}</li>)}
                  </ul>
                  {c.hint && (
                    <p className="text-xs text-muted-foreground italic flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" /> {c.hint}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
          {gate && (
            <div className={`text-xs mt-2 ${gate.ok ? 'text-[hsl(var(--success))]' : 'text-destructive'}`}>
              {gate.ok ? '✓ Documento aprovado para exportação.' : (
                <div className="flex items-center gap-2 flex-wrap">
                  <span>⚠ Corrija as inconsistências antes de exportar.</span>
                  <Link to="/risks" className="underline">Ir para Riscos</Link>
                  <Link to="/action-plans" className="underline">Ir para Planos</Link>
                  <Link to="/companies" className="underline">Ir para Empresas</Link>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader><CardTitle className="text-base">PDTI Executivo (Markdown)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">Capa, Sumário Executivo, Alinhamento Estratégico, SWOT, Diagnóstico, Riscos com mitigação+contingência, Priorização RICE, 5W2H por ação com KPI, RACI e KPIs anuais.</p>
          <Button onClick={downloadMd} disabled={disabled} title={gateTitle} className="gap-2">
            <Download className="h-4 w-4" /> Exportar .md
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Template LaTeX (Overleaf-Ready)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">Preâmbulo profissional (geometry, fancyhdr, titleformat, booktabs, longtable, hyperref). Cole no Overleaf e compile.</p>
          <div className="relative">
            <Textarea
              value={disabled ? '/* Documento bloqueado pelo Quality Gate — corrija as inconsistências acima para liberar. */' : latex}
              readOnly
              rows={14}
              className={`font-mono text-xs ${disabled ? 'blur-sm pointer-events-none select-none' : ''}`}
              onCopy={(e) => { if (disabled) { e.preventDefault(); toast.error('Bloqueado pelo Quality Gate.'); } }}
            />
            {disabled && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-md">
                <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                  <Lock className="h-4 w-4" /> Bloqueado — corrija o Quality Gate
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={copyLatex} disabled={disabled} title={gateTitle} variant="secondary" className="gap-2">
              <Copy className="h-4 w-4" /> Copiar código LaTeX
            </Button>
            <Button onClick={downloadTex} disabled={disabled} title={gateTitle} variant="outline" className="gap-2">
              <Download className="h-4 w-4" /> Baixar .tex
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExportPdti;