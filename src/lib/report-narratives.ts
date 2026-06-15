// Narrative templates for the Report Customization screen.
// Each field can be: undefined (never touched → use default), '' (explicitly
// cleared → omit the section/subsection from LaTeX), or a custom string.

export type NarrativeKey = 'intro' | 'curvaS' | 'conclusao';

export interface ReportNarratives {
  intro?: string;
  curvaS?: string;
  conclusao?: string;
}

const COMPANY_VAR = /\{\{\s*current_company\s*\}\}/g;

export const NARRATIVE_DEFAULTS: Record<NarrativeKey, string> = {
  intro:
    'A governança de TI da {{current_company}} adota um modelo colegiado, alinhado às boas práticas COBIT 2019, ITIL 4 e ISO/IEC 27001. O Comitê de Governança Digital é a instância deliberativa responsável por aprovar o portfólio, revisar riscos, monitorar a execução do PDTI e arbitrar mudanças relevantes. Esta seção consolida estrutura, ritos, indicadores e gatilhos de auditoria que sustentam a disciplina de execução do plano.',
  curvaS:
    'A Curva S consolidada do PDTI da {{current_company}} é monitorada mensalmente pelo Comitê de Governança Digital. Desvios superiores a 10% acionam plano de recuperação, com revisão de escopo, prazo ou recurso. A linha de base é definida pela soma ponderada do esforço (E da matriz RICE) das ações priorizadas. Desvios acumulados acima de 20% caracterizam gatilho compulsório de auditoria, convocando o comitê de auditoria da {{current_company}} para revisão independente, reporte à diretoria executiva e, quando aplicável, ao conselho de administração ou entidade reguladora competente.',
  conclusao:
    'Este PDTI consolida o roteiro de evolução da TI da {{current_company}} e atua como instrumento central de alinhamento entre tecnologia e estratégia de longo prazo. A execução disciplinada das ações priorizadas eleva a maturidade COBIT, reduz a exposição a riscos críticos e amplia a previsibilidade financeira via separação clara entre CAPEX e OPEX. Para a {{current_company}}, o PDTI sustenta decisões estratégicas de longo prazo — incluindo eventuais eventos de liquidez futura (M&A, abertura de capital/IPO) — ao demonstrar governança madura, controles auditáveis e aderência às boas práticas de COBIT 2019, ITIL 4, ISO/IEC 27001 e ao arcabouço regulatório aplicável (LGPD e demais requisitos setoriais). Em última análise, o documento institucionaliza a TI como vetor de geração de valor, mitigação de riscos e conformidade contínua.',
};

export const NARRATIVE_META: { key: NarrativeKey; label: string; helper: string }[] = [
  {
    key: 'intro',
    label: 'Texto de Introdução à Governança',
    helper: 'Prosa introdutória da seção "Governança, Monitoramento e Conclusão".',
  },
  {
    key: 'curvaS',
    label: 'Curva S e Gatilhos',
    helper: 'Narrativa da subseção "Curva S de Execução e Gatilho de Governança".',
  },
  {
    key: 'conclusao',
    label: 'Conclusão',
    helper: 'Texto final da subseção "Conclusão".',
  },
];

export const renderTemplate = (tpl: string, companyName: string): string =>
  tpl.replace(COMPANY_VAR, companyName || '{{current_company}}');

export const defaultNarrative = (key: NarrativeKey, companyName: string): string =>
  renderTemplate(NARRATIVE_DEFAULTS[key], companyName);

const storageKey = (companyId: string) => `pdti.narratives.${companyId}`;

export const loadNarratives = (companyId: string): ReportNarratives => {
  if (!companyId || typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(storageKey(companyId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === 'object') ? parsed as ReportNarratives : {};
  } catch {
    return {};
  }
};

export const saveNarratives = (companyId: string, n: ReportNarratives): void => {
  if (!companyId || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(companyId), JSON.stringify(n));
  } catch { /* ignore quota */ }
};

// Resolve narratives for the exporter:
// - undefined → use default (rendered with company name)
// - '' (empty after trim) → return '' so exporter omits the section
// - non-empty → return the custom text (template variables rendered)
export const resolveNarratives = (
  stored: ReportNarratives,
  companyName: string,
): Required<ReportNarratives> => {
  const resolve = (key: NarrativeKey): string => {
    const v = stored[key];
    if (v === undefined || v === null) return defaultNarrative(key, companyName);
    if (!v.trim()) return '';
    return renderTemplate(v, companyName);
  };
  return { intro: resolve('intro'), curvaS: resolve('curvaS'), conclusao: resolve('conclusao') };
};