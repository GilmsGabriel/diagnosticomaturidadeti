import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, RotateCcw, Save, Info } from 'lucide-react';
import { toast } from 'sonner';
import {
  NARRATIVE_META,
  loadNarratives,
  saveNarratives,
  defaultNarrative,
  renderTemplate,
  type NarrativeKey,
  type ReportNarratives,
} from '@/lib/report-narratives';
import { getReadableError } from '@/lib/error-messages';

const ReportSettings = () => {
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [values, setValues] = useState<ReportNarratives>({});

  const companyName = useMemo(
    () => companies.find(c => c.id === selectedCompany)?.name || '',
    [companies, selectedCompany],
  );

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('companies').select('id, name').order('name');
      if (error) { toast.error(getReadableError(error)); return; }
      setCompanies(data || []);
      if (data?.length) setSelectedCompany(data[0].id);
    })();
  }, []);

  useEffect(() => {
    if (!selectedCompany) return;
    setValues(loadNarratives(selectedCompany));
  }, [selectedCompany]);

  const setField = (key: NarrativeKey, v: string) =>
    setValues(prev => ({ ...prev, [key]: v }));

  const resetField = (key: NarrativeKey) => {
    const next = { ...values, [key]: defaultNarrative(key, companyName) };
    setValues(next);
    saveNarratives(selectedCompany, next);
    toast.success('Texto padrão restaurado.');
  };

  const handleSave = () => {
    if (!selectedCompany) return;
    saveNarratives(selectedCompany, values);
    toast.success('Configurações do relatório salvas.');
  };

  // Effective text shown in the textarea: stored value (incl. empty string) or rendered default
  const effective = (key: NarrativeKey): string => {
    const v = values[key];
    if (v === undefined || v === null) return defaultNarrative(key, companyName);
    return renderTemplate(v, companyName);
  };

  const isEmpty = (key: NarrativeKey) => {
    const v = values[key];
    return v !== undefined && v !== null && !v.trim();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" /> Configurações do Relatório
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Personalize os blocos narrativos do PDTI por empresa. Use a variável{' '}
          <code className="text-xs bg-secondary px-1 rounded">{'{{current_company}}'}</code> para
          inserir o nome da empresa selecionada. Campos deixados em branco são omitidos do PDF final.
        </p>
      </div>

      <div className="flex gap-4 items-center flex-wrap">
        <Label className="whitespace-nowrap">Empresa:</Label>
        <Select value={selectedCompany} onValueChange={setSelectedCompany}>
          <SelectTrigger className="w-72"><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent>
            {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {selectedCompany && NARRATIVE_META.map(meta => (
        <Card key={meta.key} className="glass-card">
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="text-base">{meta.label}</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">{meta.helper}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => resetField(meta.key)}
            >
              <RotateCcw className="h-3.5 w-3.5" /> Restaurar Padrão
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            <Textarea
              value={effective(meta.key)}
              onChange={e => setField(meta.key, e.target.value)}
              rows={8}
              className="text-sm leading-relaxed"
              placeholder="Deixe em branco para omitir esta seção do PDF final."
            />
            {isEmpty(meta.key) && (
              <p className="text-xs text-[hsl(var(--warning))] flex items-center gap-1.5">
                <Info className="h-3 w-3" /> Esta seção será omitida do PDF exportado.
              </p>
            )}
          </CardContent>
        </Card>
      ))}

      {selectedCompany && (
        <div className="flex justify-end">
          <Button onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" /> Salvar configurações
          </Button>
        </div>
      )}
    </div>
  );
};

export default ReportSettings;