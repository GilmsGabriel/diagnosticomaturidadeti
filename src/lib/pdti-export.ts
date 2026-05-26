// PDTI export helpers — Markdown, LaTeX and Quality Gate
// Patterned after the gold-standard reference PPTI.tex (cover, exec summary,
// strategic alignment, As-Is, SWOT, risk matrix + mitigation/contingency,
// RICE prioritization, per-action 5W2H tables with KPIs, governance + KPIs).
import type { MaturityResult } from './maturity-calculator';

export interface CompanyInfo {
  name: string;
  sector?: string | null;
  cnpj?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  mission?: string | null;
  vision?: string | null;
  values?: string | null;
  strategic_context?: string | null;
  sponsor?: string | null;
  plan_horizon?: string | null;
}

export interface RiskRow {
  id: string;
  description: string;
  category?: string | null;
  probability: number;
  impact: number;
  risk_level?: string | null;
  mitigation?: string | null;
  contingency?: string | null;
  responsible?: string | null;
  risk_type?: string | null;          // threat | opportunity
  response_strategy?: string | null;  // mitigate | transfer | accept | avoid | explore | enhance
  status: string;
}

export interface PlanRow {
  id: string;
  what: string;
  why?: string | null;
  where?: string | null;
  when?: string | null;
  who?: string | null;
  how?: string | null;
  how_much?: string | null;
  due_date?: string | null;
  priority: string;
  kanban_status: string;
  cobit_domain: string;
  rice_score?: number | null;
  risk_id?: string | null;
  kpi_success?: string | null;
  department?: string | null;
  action_code?: string | null;
}

export interface KpiRow {
  name: string;
  category?: string | null;
  current_value?: number | null;
  target_value?: number | null;
  target_year_1?: number | null;
  target_year_2?: number | null;
  unit?: string | null;
  status: string;
}

export interface RaciRow {
  process: string;
  responsible?: string | null;
  accountable?: string | null;
  consulted?: string | null;
  informed?: string | null;
}

export interface SwotRow {
  type: 'strength' | 'weakness' | 'opportunity' | 'threat';
  description: string;
}

export interface ExportData {
  company: CompanyInfo;
  assessmentDate?: string;
  maturity?: MaturityResult | null;
  targets?: Record<string, number>;
  risks: RiskRow[];
  plans: PlanRow[];
  kpis: KpiRow[];
  raci: RaciRow[];
  swot: SwotRow[];
}

export interface QualityCheck { label: string; pass: boolean; items: string[]; hint?: string; }
export interface QualityResult { ok: boolean; checks: QualityCheck[]; }

const norm = (s?: string | null) =>
  (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// ============================================================
// Quality Gate
// ============================================================
export const runQualityGate = (data: ExportData): QualityResult => {
  const checks: QualityCheck[] = [];

  // 1. Critical maturity domains without any associated risk
  const critical = (data.maturity?.categories || []).filter(c => c.answeredCount > 0 && c.score <= 1.5);
  const orphanCritical = critical.filter(c => {
    const cn = norm(c.name);
    return !data.risks.some(r => norm(r.category).includes(cn) || norm(r.description).includes(cn));
  });
  checks.push({
    label: 'Domínios críticos de maturidade (≤1.5) com risco associado',
    pass: orphanCritical.length === 0,
    items: orphanCritical.map(c => `${c.name} (score ${c.score.toFixed(1)})`),
    hint: 'Vá em Riscos e use "Criar risco" no bloco de findings de maturidade.',
  });

  // 2. Critical risks without a 5W2H plan — vínculo via risk_id (explícito)
  const criticalRisks = data.risks.filter(r => r.probability * r.impact >= 15);
  const orphanRisks = criticalRisks.filter(r => !data.plans.some(p => p.risk_id === r.id));
  checks.push({
    label: 'Riscos críticos (P×I ≥ 15) com plano 5W2H',
    pass: orphanRisks.length === 0,
    items: orphanRisks.map(r => `${r.description} (P×I=${r.probability * r.impact})`),
    hint: 'Vá em Planos de Ação e clique em "Gerar 5W2H" no risco crítico.',
  });

  // 3. Plans missing vital fields (ignore done items)
  const incomplete = data.plans.filter(p =>
    p.kanban_status !== 'done' &&
    (!p.who?.trim() || (!p.due_date && !p.when?.trim()))
  );
  checks.push({
    label: 'Planos com Responsável e Prazo preenchidos',
    pass: incomplete.length === 0,
    items: incomplete.map(p =>
      `${p.what.slice(0, 70)}${!p.who?.trim() ? ' [sem responsável]' : ''}${!p.due_date && !p.when?.trim() ? ' [sem prazo]' : ''}`,
    ),
    hint: 'Edite cada plano de ação e preencha "Quem" e "Data limite" (ou "Quando").',
  });

  return { ok: checks.every(c => c.pass), checks };
};

// ============================================================
// Shared helpers
// ============================================================
const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '');
const dashMd = (s?: string | null) => (s && String(s).trim() ? String(s) : '—');
const dashTex = (s?: string | null) => (s && String(s).trim() ? String(s) : '--');

const QUAL_PI = ['', 'Muito Baixo', 'Baixo', 'Moderado', 'Alto', 'Muito Alto'];
const qual = (n: number) => QUAL_PI[Math.max(1, Math.min(5, Math.round(n)))];

const RESPONSE_LABEL: Record<string, string> = {
  mitigate: 'Mitigar',
  transfer: 'Transferir',
  accept: 'Aceitar',
  avoid: 'Evitar',
  explore: 'Explorar',
  enhance: 'Melhorar',
  prevent: 'Prevenir',
};
const responseLabel = (s?: string | null) => (s ? RESPONSE_LABEL[s] || s : 'Mitigar');
const typeLabel = (s?: string | null) => (s === 'opportunity' ? 'Oportunidade' : 'Ameaça');

const COBIT_OBJECTIVE: Record<string, string> = {
  EDM: 'Governança e direção estratégica',
  APO: 'Alinhamento, planejamento e organização',
  BAI: 'Construir, adquirir e implementar capacidades',
  DSS: 'Entregar, servir e suportar operações',
  MEA: 'Monitorar, avaliar e analisar desempenho',
};

const codeOf = (p: PlanRow, idx: number) =>
  (p.action_code && p.action_code.trim()) || String(idx + 1).padStart(2, '0');

const isQuickWin = (p: PlanRow): boolean => {
  if (p.due_date) {
    const diff = (new Date(p.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (diff <= 45) return true;
  }
  const w = (p.when || '').toLowerCase();
  if (/(\b7\b|\b10\b|\b15\b|\b30\b|\b45\b)\s*dias/.test(w)) return true;
  if (/≤\s*45/.test(w)) return true;
  return false;
};

const sortedPlans = (plans: PlanRow[]) =>
  [...plans].sort((a, b) => (Number(b.rice_score) || 0) - (Number(a.rice_score) || 0));

// ============================================================
// Markdown generator
// ============================================================
export const buildMarkdown = (data: ExportData): string => {
  const c = data.company;
  const horizon = c.plan_horizon || `${new Date().getFullYear()}–${new Date().getFullYear() + 1}`;
  const plans = sortedPlans(data.plans);
  const lines: string[] = [];

  // ---------- COVER ----------
  lines.push(`# PLANO DIRETOR DE TECNOLOGIA DA INFORMAÇÃO`);
  lines.push(`## PDTI ${horizon}`);
  lines.push('');
  lines.push(`**${c.name.toUpperCase()}**${c.sector ? `  \n_${c.sector}_` : ''}`);
  lines.push('');
  lines.push(`> Documento elaborado segundo metodologias SISP v2.1, COBIT 5/2019, ITIL 4 e ISO/IEC 27001.`);
  lines.push('');
  lines.push(`| | |`);
  lines.push(`|---|---|`);
  if (c.sponsor) lines.push(`| **Patrocinador** | ${c.sponsor} |`);
  lines.push(`| **Versão** | 1.0 |`);
  lines.push(`| **Vigência** | ${horizon} |`);
  if (c.contact_name) lines.push(`| **Contato** | ${c.contact_name}${c.contact_email ? ` (${c.contact_email})` : ''} |`);
  if (data.assessmentDate) lines.push(`| **Diagnóstico** | ${data.assessmentDate} |`);
  lines.push(`| **Gerado em** | ${new Date().toLocaleDateString('pt-BR')} |`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // ---------- EXECUTIVE SUMMARY ----------
  const overall = data.maturity?.overallScore ?? 0;
  const level = data.maturity?.level ?? '—';
  const criticalCount = data.risks.filter(r => r.probability * r.impact >= 15).length;
  const quickWins = plans.filter(isQuickWin).length;
  lines.push('## Sumário Executivo');
  lines.push('');
  lines.push(`A organização **${c.name}** encontra-se em ponto de inflexão estratégica. ` +
    `O diagnóstico de maturidade COBIT posicionou a TI no nível **${level}** ` +
    `(score geral ${overall.toFixed(2)}/5,0), com **${criticalCount} risco(s) crítico(s)** ` +
    `(P×I ≥ 15) identificado(s) e **${quickWins} Quick Win(s)** mapeada(s) para execução ≤ 45 dias.`);
  lines.push('');
  lines.push('Este PDTI estabelece um contrato de entrega da TI, contendo: ' +
    '(i) referencial estratégico; (ii) diagnóstico As-Is por domínio; ' +
    '(iii) matriz de riscos com mitigação e contingência; ' +
    '(iv) priorização RICE; (v) plano 5W2H detalhado com KPIs; ' +
    'e (vi) modelo de governança e monitoramento.');
  lines.push('');

  // ---------- 1. INTRODUÇÃO E REFERENCIAL ESTRATÉGICO ----------
  lines.push('## 1. Introdução e Referencial Estratégico');
  lines.push('');
  lines.push('### 1.1 A Organização');
  lines.push('');
  lines.push(`**${c.name}**${c.sector ? ` — ${c.sector}` : ''}${c.cnpj ? ` (CNPJ ${c.cnpj})` : ''}.`);
  if (c.strategic_context) lines.push('', c.strategic_context);
  lines.push('');
  if (c.mission || c.vision || c.values) {
    lines.push('### 1.2 Missão, Visão e Valores da TI');
    lines.push('');
    if (c.mission) lines.push(`**Missão:** ${c.mission}`, '');
    if (c.vision) lines.push(`**Visão:** ${c.vision}`, '');
    if (c.values) lines.push(`**Valores:** ${c.values}`, '');
  }

  // Strategic alignment derived from COBIT domains used in plans
  const usedDomains = Array.from(new Set(plans.map(p => p.cobit_domain).filter(Boolean)));
  if (usedDomains.length) {
    lines.push('### 1.3 Alinhamento Estratégico (Negócio ↔ TI)');
    lines.push('');
    lines.push('| Objetivo Estratégico | Resposta da TI | Domínio COBIT |');
    lines.push('|---|---|---|');
    usedDomains.forEach(d => {
      const ex = plans.find(p => p.cobit_domain === d);
      lines.push(`| ${COBIT_OBJECTIVE[d] || d} | ${dashMd(ex?.what)} | ${d} |`);
    });
    lines.push('');
  }

  // ---------- 2. DIAGNÓSTICO SITUACIONAL ----------
  lines.push('## 2. Diagnóstico Situacional (As-Is)');
  lines.push('');
  if (data.maturity && data.maturity.categories.length) {
    lines.push('### 2.1 Maturidade COBIT — Atual vs. Alvo');
    lines.push('');
    lines.push(`**Score Geral:** ${overall.toFixed(2)}/5 — Nível **${level}**`);
    lines.push('');
    lines.push('| Domínio / Categoria | As-Is | To-Be | Gap |');
    lines.push('|---|---:|---:|---:|');
    data.maturity.categories.forEach(cat => {
      const tgt = data.targets?.[cat.id] ?? Math.min(5, Math.round(cat.score + 1));
      lines.push(`| ${cat.name} | ${cat.score.toFixed(1)} | ${tgt.toFixed(1)} | +${(tgt - cat.score).toFixed(1)} |`);
    });
    lines.push('');
  }

  // SWOT
  if (data.swot.length) {
    const byType = (t: string) => data.swot.filter(s => s.type === t);
    lines.push('### 2.2 Análise SWOT da TI');
    lines.push('');
    lines.push('| Forças (Internas) | Fraquezas (Internas) |');
    lines.push('|---|---|');
    const S = byType('strength'); const W = byType('weakness');
    const rowsSW = Math.max(S.length, W.length, 1);
    for (let i = 0; i < rowsSW; i++)
      lines.push(`| ${S[i] ? '• ' + S[i].description : ''} | ${W[i] ? '• ' + W[i].description : ''} |`);
    lines.push('');
    lines.push('| Oportunidades (Externas) | Ameaças (Externas) |');
    lines.push('|---|---|');
    const O = byType('opportunity'); const T = byType('threat');
    const rowsOT = Math.max(O.length, T.length, 1);
    for (let i = 0; i < rowsOT; i++)
      lines.push(`| ${O[i] ? '• ' + O[i].description : ''} | ${T[i] ? '• ' + T[i].description : ''} |`);
    lines.push('');
  }

  // ---------- 3. GESTÃO DE RISCOS ----------
  lines.push('## 3. Gestão de Riscos');
  lines.push('');
  if (data.risks.length) {
    lines.push('### 3.1 Matriz de Riscos');
    lines.push('');
    lines.push('| # | Descrição | Tipo | Probabilidade | Impacto | P×I | Estratégia | Responsável |');
    lines.push('|---:|---|---|---|---|---:|---|---|');
    data.risks.forEach((r, i) => {
      lines.push(`| ${i + 1} | ${r.description.replace(/\|/g, '\\|')} | ${typeLabel(r.risk_type)} | ${qual(r.probability)} | ${qual(r.impact)} | ${r.probability * r.impact} | ${responseLabel(r.response_strategy)} | ${dashMd(r.responsible)} |`);
    });
    lines.push('');

    // Mitigation + contingency for top 5
    const top = [...data.risks].sort((a, b) => b.probability * b.impact - a.probability * a.impact).slice(0, 5);
    if (top.length) {
      lines.push('### 3.2 Planos de Mitigação e Contingência (Top 5)');
      lines.push('');
      top.forEach(r => {
        lines.push(`#### ${r.description} (P×I = ${r.probability * r.impact})`);
        lines.push('');
        lines.push(`**Mitigação:** ${dashMd(r.mitigation)}`);
        lines.push('');
        lines.push(`**Contingência:** ${dashMd(r.contingency)}`);
        lines.push('');
      });
    }
  } else {
    lines.push('_Nenhum risco cadastrado._');
    lines.push('');
  }

  // ---------- 4. PRIORIZAÇÃO RICE ----------
  if (plans.length) {
    lines.push('## 4. Priorização Estratégica (RICE)');
    lines.push('');
    lines.push('| # | Ação | Departamento | Prazo | RICE |');
    lines.push('|---:|---|---|---|---:|');
    plans.forEach((p, i) => {
      const code = codeOf(p, i);
      const prazo = p.when || fmtDate(p.due_date) || '—';
      lines.push(`| ${code} | ${p.what.replace(/\|/g, '\\|')} | ${dashMd(p.department)} | ${prazo} | ${p.rice_score ? Math.round(p.rice_score) : '—'} |`);
    });
    lines.push('');
    const qw = plans.map((p, i) => isQuickWin(p) ? `#${codeOf(p, i)}` : null).filter(Boolean);
    if (qw.length) lines.push(`**Quick Wins (≤ 45 dias):** ${qw.join(', ')}`, '');

    // ---------- 5. 5W2H per action ----------
    lines.push('## 5. Plano de Ação 5W2H');
    lines.push('');
    lines.push('Detalhamento das ações priorizadas. Cada ação contempla os sete elementos da metodologia 5W2H e um KPI de sucesso vinculado.');
    lines.push('');
    plans.forEach((p, i) => {
      const code = codeOf(p, i);
      lines.push(`### Ação #${code} — RICE ${p.rice_score ? Math.round(p.rice_score) : '—'}`);
      lines.push('');
      lines.push(`**${p.what}**`);
      lines.push('');
      lines.push('| Elemento | Detalhe |');
      lines.push('|---|---|');
      lines.push(`| **What (O quê)** | ${dashMd(p.what)} |`);
      lines.push(`| **Why (Por quê)** | ${dashMd(p.why)} |`);
      lines.push(`| **Who (Quem)** | ${dashMd(p.who)} |`);
      lines.push(`| **When (Quando)** | ${dashMd(p.when || fmtDate(p.due_date))} |`);
      lines.push(`| **Where (Onde)** | ${dashMd(p.where || p.department)} |`);
      lines.push(`| **How (Como)** | ${dashMd(p.how)} |`);
      lines.push(`| **How much (Quanto)** | ${dashMd(p.how_much)} |`);
      lines.push(`| **KPI de sucesso** | ${dashMd(p.kpi_success)} |`);
      lines.push(`| **Domínio COBIT** | ${p.cobit_domain} |`);
      lines.push('');
    });
  }

  // ---------- 6. GOVERNANÇA ----------
  lines.push('## 6. Governança e Monitoramento');
  lines.push('');
  lines.push('### 6.1 Comitê de Governança Digital');
  lines.push('');
  lines.push('Instância colegiada e deliberativa, presidida pela liderança executiva, ' +
    'com mandato para deliberar sobre o portfólio de TI, aprovar mudanças relevantes, ' +
    'revisar riscos e monitorar a execução do PDTI.');
  lines.push('');
  if (data.raci.length) {
    lines.push('| Processo | Responsible | Accountable | Consulted | Informed |');
    lines.push('|---|---|---|---|---|');
    data.raci.forEach(r =>
      lines.push(`| ${r.process} | ${dashMd(r.responsible)} | ${dashMd(r.accountable)} | ${dashMd(r.consulted)} | ${dashMd(r.informed)} |`),
    );
    lines.push('');
  }

  lines.push('### 6.2 Ritos de Acompanhamento');
  lines.push('');
  lines.push('- **Quinzenal** — Reunião do Comitê: KPIs, riscos, mudanças, portfólio.');
  lines.push('- **Mensal** — Revisão de execução: Curva S e desvios.');
  lines.push('- **Trimestral** — Revisão de riscos: atualização da matriz e dos planos.');
  lines.push('- **Semestral** — Revisão do PDTI: re-priorização do portfólio.');
  lines.push('- **Anual** — Revisão completa: novo diagnóstico de maturidade.');
  lines.push('');

  if (data.kpis.length) {
    const [y1, y2] = (() => {
      const m = (c.plan_horizon || '').match(/(\d{4}).*?(\d{4})/);
      return m ? [m[1], m[2]] : [String(new Date().getFullYear()), String(new Date().getFullYear() + 1)];
    })();
    lines.push('### 6.3 KPIs do PDTI');
    lines.push('');
    lines.push(`| KPI | Unidade | Atual | Meta ${y1} | Meta ${y2} |`);
    lines.push('|---|---|---:|---:|---:|');
    data.kpis.forEach(k =>
      lines.push(`| ${k.name} | ${dashMd(k.unit)} | ${k.current_value ?? '—'} | ${k.target_year_1 ?? k.target_value ?? '—'} | ${k.target_year_2 ?? '—'} |`),
    );
    lines.push('');
  }

  lines.push('### 6.4 Curva S de Execução');
  lines.push('');
  lines.push('A Curva S consolidada do PDTI é monitorada mensalmente pelo Comitê. ' +
    'Desvios superiores a 10% acionam plano de recuperação, com revisão de escopo, prazo ou recurso. ' +
    'A linha de base é definida pela soma ponderada do esforço (E da matriz RICE) das ações priorizadas.');
  lines.push('');
  lines.push('---');
  lines.push(`_Documento gerado em ${new Date().toLocaleDateString('pt-BR')} — alinhado a COBIT 2019, ITIL 4 e ISO/IEC 27001._`);

  return lines.join('\n');
};

// ============================================================
// LaTeX generator (PPTI-style preamble + sections)
// ============================================================
const tex = (s?: string | number | null): string => {
  if (s === null || s === undefined || s === '') return '--';
  return String(s)
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([&%$#_{}])/g, '\\$1')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(/</g, '\\textless{}')
    .replace(/>/g, '\\textgreater{}')
    .replace(/\n+/g, ' \\\\ ');
};

export const buildLatex = (data: ExportData): string => {
  const c = data.company;
  const horizon = c.plan_horizon || `${new Date().getFullYear()}--${new Date().getFullYear() + 1}`;
  const plans = sortedPlans(data.plans);
  const overall = data.maturity?.overallScore ?? 0;
  const level = data.maturity?.level ?? '--';
  const criticalCount = data.risks.filter(r => r.probability * r.impact >= 15).length;
  const quickWins = plans.filter(isQuickWin).length;

  const o: string[] = [];

  // ----- Preamble (matches PPTI reference) -----
  o.push('\\documentclass[12pt, a4paper]{article}');
  o.push('\\usepackage[utf8]{inputenc}');
  o.push('\\usepackage[T1]{fontenc}');
  o.push('\\usepackage[brazil]{babel}');
  o.push('\\usepackage{geometry}');
  o.push('\\usepackage{booktabs}');
  o.push('\\usepackage{longtable}');
  o.push('\\usepackage{array}');
  o.push('\\usepackage{tabularx}');
  o.push('\\usepackage{xcolor}');
  o.push('\\usepackage{hyperref}');
  o.push('\\usepackage{fancyhdr}');
  o.push('\\usepackage{titlesec}');
  o.push('\\usepackage{enumitem}');
  o.push('\\usepackage{parskip}');
  o.push('\\usepackage{lmodern}');
  o.push('\\usepackage{microtype}');
  o.push('\\usepackage{setspace}');
  o.push('\\geometry{top=3cm, bottom=2.5cm, left=3cm, right=2.5cm}');
  o.push('\\definecolor{pdtiblue}{RGB}{0, 70, 127}');
  o.push('\\definecolor{tablegray}{RGB}{230, 230, 230}');
  o.push('\\hypersetup{colorlinks=true, linkcolor=pdtiblue, urlcolor=pdtiblue,');
  o.push(`  pdftitle={PDTI ${horizon} -- ${tex(c.name)}}, pdfauthor={${tex(c.sponsor || c.contact_name || c.name)}}}`);
  o.push('\\pagestyle{fancy}');
  o.push('\\fancyhf{}');
  o.push(`\\fancyhead[L]{\\small\\textcolor{pdtiblue}{PDTI ${horizon} --- ${tex(c.name)}}}`);
  o.push('\\fancyhead[R]{\\small\\textcolor{pdtiblue}{Confidencial}}');
  o.push('\\fancyfoot[C]{\\thepage}');
  o.push('\\renewcommand{\\headrulewidth}{0.4pt}');
  o.push('\\titleformat{\\section}{\\large\\bfseries\\color{pdtiblue}}{\\thesection.}{0.5em}{}[\\titlerule]');
  o.push('\\titleformat{\\subsection}{\\normalsize\\bfseries\\color{pdtiblue}}{\\thesubsection}{0.5em}{}');
  o.push('\\renewcommand{\\arraystretch}{1.4}');
  o.push('\\newcolumntype{L}[1]{>{\\raggedright\\arraybackslash}p{#1}}');
  o.push('\\newcolumntype{C}[1]{>{\\centering\\arraybackslash}p{#1}}');
  o.push('\\begin{document}');

  // ----- COVER -----
  o.push('\\begin{titlepage}');
  o.push('\\centering');
  o.push('\\vspace*{2cm}');
  o.push('{\\Huge\\bfseries\\color{pdtiblue} PLANO DIRETOR DE TECNOLOGIA\\\\[0.4em] DA INFORMAÇÃO\\par}');
  o.push('\\vspace{1.5cm}');
  o.push(`{\\LARGE\\bfseries PDTI ${horizon}\\par}`);
  o.push('\\vspace{1cm}\\rule{0.6\\textwidth}{1.5pt}');
  o.push('\\vspace{1cm}');
  o.push(`{\\Large\\bfseries ${tex(c.name).toUpperCase()}\\par}`);
  if (c.sector) o.push(`\\vspace{0.3cm}{\\large\\itshape ${tex(c.sector)}\\par}`);
  o.push('\\vspace{1cm}\\rule{0.6\\textwidth}{0.4pt}');
  o.push('\\vspace{1cm}');
  o.push('{\\small\\itshape Documento elaborado segundo metodologias\\\\ SISP v2.1, COBIT 5/2019, ITIL 4 e ISO/IEC 27001\\par}');
  o.push('\\vfill');
  o.push('\\begin{tabular}{ll}');
  if (c.sponsor) o.push(`\\textbf{Patrocinador:} & ${tex(c.sponsor)} \\\\[0.4em]`);
  o.push('\\textbf{Versão:} & 1.0 \\\\[0.4em]');
  o.push(`\\textbf{Vigência:} & ${horizon} \\\\[0.4em]`);
  if (c.contact_name) o.push(`\\textbf{Contato:} & ${tex(c.contact_name)}${c.contact_email ? ` (${tex(c.contact_email)})` : ''} \\\\[0.4em]`);
  if (data.assessmentDate) o.push(`\\textbf{Diagnóstico:} & ${tex(data.assessmentDate)} \\\\`);
  o.push('\\end{tabular}');
  o.push('\\vspace{2cm}');
  o.push('\\end{titlepage}');

  o.push('\\tableofcontents');
  o.push('\\newpage');

  // ----- EXEC SUMMARY -----
  o.push('\\section*{Sumário Executivo}');
  o.push('\\addcontentsline{toc}{section}{Sumário Executivo}');
  o.push(
    `A organização ${tex(c.name)} encontra-se em ponto de inflexão estratégica. ` +
    `O diagnóstico de maturidade COBIT posicionou a TI no nível \\textbf{${tex(level)}} ` +
    `(score geral ${overall.toFixed(2)}/5,0), com \\textbf{${criticalCount}} risco(s) crítico(s) ` +
    `(P$\\times$I $\\geq$ 15) e \\textbf{${quickWins}} Quick Win(s) mapeada(s) para execução em até 45 dias.`
  );
  o.push('');
  o.push('Este PDTI estabelece um contrato de entrega da TI, contendo: (i) referencial estratégico; ' +
    '(ii) diagnóstico As-Is por domínio; (iii) matriz de riscos com mitigação e contingência; ' +
    '(iv) priorização RICE; (v) plano 5W2H detalhado com KPIs; e (vi) modelo de governança.');

  // ----- 1. INTRODUÇÃO -----
  o.push('\\section{Introdução e Referencial Estratégico}');
  o.push('\\subsection{A Organização}');
  o.push(`${tex(c.name)}${c.sector ? ` --- ${tex(c.sector)}` : ''}${c.cnpj ? ` (CNPJ ${tex(c.cnpj)})` : ''}.`);
  if (c.strategic_context) o.push('', tex(c.strategic_context));

  if (c.mission || c.vision || c.values) {
    o.push('\\subsection{Missão, Visão e Valores da TI}');
    if (c.mission) o.push(`\\textbf{Missão:} ${tex(c.mission)}\\par`);
    if (c.vision) o.push(`\\textbf{Visão:} ${tex(c.vision)}\\par`);
    if (c.values) o.push(`\\textbf{Valores:} ${tex(c.values)}\\par`);
  }

  const usedDomains = Array.from(new Set(plans.map(p => p.cobit_domain).filter(Boolean)));
  if (usedDomains.length) {
    o.push('\\subsection{Alinhamento Estratégico (Negócio $\\rightleftharpoons$ TI)}');
    o.push('\\begin{longtable}{L{4.5cm} L{6.5cm} L{2.5cm}}');
    o.push('\\toprule \\textbf{Objetivo Estratégico} & \\textbf{Resposta da TI} & \\textbf{Domínio COBIT} \\\\');
    o.push('\\midrule \\endhead \\bottomrule \\endlastfoot');
    usedDomains.forEach(d => {
      const ex = plans.find(p => p.cobit_domain === d);
      o.push(`${tex(COBIT_OBJECTIVE[d] || d)} & ${tex(ex?.what)} & ${tex(d)} \\\\`);
    });
    o.push('\\end{longtable}');
  }

  // ----- 2. DIAGNÓSTICO -----
  o.push('\\section{Diagnóstico Situacional (As-Is)}');
  if (data.maturity && data.maturity.categories.length) {
    o.push('\\subsection{Maturidade COBIT --- Atual vs. Alvo}');
    o.push(`Score geral: \\textbf{${overall.toFixed(2)}/5,0} --- Nível \\textbf{${tex(level)}}.`);
    o.push('\\begin{longtable}{L{5cm} C{2cm} C{2cm} C{2cm} C{3cm}}');
    o.push('\\toprule \\textbf{Domínio} & \\textbf{Atual} & \\textbf{Alvo} & \\textbf{Gap} & \\textbf{Nível} \\\\');
    o.push('\\midrule \\endhead \\bottomrule \\endlastfoot');
    data.maturity.categories.forEach(cat => {
      const tgt = data.targets?.[cat.id] ?? Math.min(5, Math.round(cat.score + 1));
      o.push(`${tex(cat.name)} & ${cat.score.toFixed(1)} & ${tgt.toFixed(1)} & +${(tgt - cat.score).toFixed(1)} & ${tex(level)} \\\\`);
    });
    o.push('\\end{longtable}');
  }

  if (data.swot.length) {
    o.push('\\subsection{Análise SWOT da TI}');
    o.push('\\begin{longtable}{L{7cm} L{7cm}}');
    o.push('\\toprule \\textbf{Forças (Internas)} & \\textbf{Fraquezas (Internas)} \\\\ \\midrule \\endhead \\bottomrule \\endlastfoot');
    const byType = (t: string) => data.swot.filter(s => s.type === t);
    const S = byType('strength'); const W = byType('weakness');
    const itemize = (arr: SwotRow[]) =>
      arr.length
        ? '\\begin{itemize}[leftmargin=1em, topsep=0pt, itemsep=2pt]' +
          arr.map(x => `\\item ${tex(x.description)}`).join(' ') +
          '\\end{itemize}'
        : '--';
    o.push(`${itemize(S)} & ${itemize(W)} \\\\`);
    o.push('\\end{longtable}');
    o.push('\\begin{longtable}{L{7cm} L{7cm}}');
    o.push('\\toprule \\textbf{Oportunidades (Externas)} & \\textbf{Ameaças (Externas)} \\\\ \\midrule \\endhead \\bottomrule \\endlastfoot');
    const O = byType('opportunity'); const T = byType('threat');
    o.push(`${itemize(O)} & ${itemize(T)} \\\\`);
    o.push('\\end{longtable}');
  }

  // ----- 3. RISCOS -----
  o.push('\\section{Gestão de Riscos}');
  if (data.risks.length) {
    o.push('Matriz consolidada (Probabilidade $\\times$ Impacto). O escore P$\\times$I varia de 1 a 25.');
    o.push('\\subsection{Matriz de Riscos}');
    o.push('\\begin{longtable}{L{3.8cm} C{1.8cm} C{2cm} C{1.8cm} C{1cm} L{2.2cm} L{2.5cm}}');
    o.push('\\toprule \\textbf{Descrição} & \\textbf{Tipo} & \\textbf{Probabilidade} & \\textbf{Impacto} & \\textbf{P$\\times$I} & \\textbf{Estratégia} & \\textbf{Responsável} \\\\');
    o.push('\\midrule \\endhead \\bottomrule \\endlastfoot');
    data.risks.forEach(r => {
      o.push(`${tex(r.description)} & ${tex(typeLabel(r.risk_type))} & ${tex(qual(r.probability))} & ${tex(qual(r.impact))} & ${r.probability * r.impact} & ${tex(responseLabel(r.response_strategy))} & ${tex(r.responsible)} \\\\`);
    });
    o.push('\\end{longtable}');

    const top = [...data.risks].sort((a, b) => b.probability * b.impact - a.probability * a.impact).slice(0, 5);
    if (top.length) {
      o.push('\\subsection{Planos de Mitigação e Contingência (Top 5)}');
      top.forEach(r => {
        o.push(`\\subsubsection*{${tex(r.description)} (P$\\times$I = ${r.probability * r.impact})}`);
        o.push(`\\textbf{Mitigação:} ${tex(r.mitigation)}\\par`);
        o.push(`\\textbf{Contingência:} ${tex(r.contingency)}\\par`);
      });
    }
  }

  // ----- 4. RICE -----
  if (plans.length) {
    o.push('\\section{Priorização Estratégica (RICE)}');
    o.push('A priorização utiliza a matriz RICE (Reach $\\times$ Impact $\\times$ Confidence $\\div$ Effort).');
    o.push('\\begin{longtable}{C{0.8cm} L{6.5cm} L{2.8cm} C{1.8cm} C{1.5cm}}');
    o.push('\\toprule \\textbf{\\#} & \\textbf{Ação} & \\textbf{Departamento} & \\textbf{Prazo} & \\textbf{RICE} \\\\');
    o.push('\\midrule \\endhead \\bottomrule \\endlastfoot');
    plans.forEach((p, i) => {
      const prazo = p.when || fmtDate(p.due_date) || '--';
      o.push(`${codeOf(p, i)} & ${tex(p.what)} & ${tex(p.department)} & ${tex(prazo)} & ${p.rice_score ? Math.round(p.rice_score) : '--'} \\\\`);
    });
    o.push('\\end{longtable}');
    const qw = plans.map((p, i) => isQuickWin(p) ? `\\#${codeOf(p, i)}` : null).filter(Boolean);
    if (qw.length) o.push(`\\textbf{Quick Wins ($\\leq$45 dias):} ${qw.join(', ')}\\par`);

    // ----- 5. 5W2H -----
    o.push('\\section{Plano de Ação 5W2H}');
    o.push('Detalhamento das ações priorizadas. Cada ação contempla os sete elementos da metodologia 5W2H e um KPI de sucesso vinculado.');
    plans.forEach((p, i) => {
      const code = codeOf(p, i);
      o.push(`\\subsubsection*{Ação \\#${code} --- RICE ${p.rice_score ? Math.round(p.rice_score) : '--'}}`);
      o.push(`\\noindent\\textbf{${tex(p.what)}}`);
      o.push('\\begin{longtable}{L{3.5cm} L{10cm}} \\toprule');
      o.push(`\\textbf{What (O quê)} & ${tex(p.what)} \\\\ \\midrule`);
      o.push(`\\textbf{Why (Por quê)} & ${tex(p.why)} \\\\`);
      o.push(`\\textbf{Who (Quem)} & ${tex(p.who)} \\\\`);
      o.push(`\\textbf{When (Quando)} & ${tex(p.when || fmtDate(p.due_date))} \\\\`);
      o.push(`\\textbf{Where (Onde)} & ${tex(p.where || p.department)} \\\\`);
      o.push(`\\textbf{How (Como)} & ${tex(p.how)} \\\\`);
      o.push(`\\textbf{How much (Quanto)} & ${tex(p.how_much)} \\\\`);
      o.push(`\\textbf{KPI de sucesso} & ${tex(p.kpi_success)} \\\\`);
      o.push(`\\textbf{Domínio COBIT} & ${tex(p.cobit_domain)} \\\\`);
      o.push('\\bottomrule \\end{longtable}');
    });
  }

  // ----- 6. GOVERNANÇA -----
  o.push('\\section{Governança e Monitoramento}');
  o.push('\\subsection{Comitê de Governança Digital}');
  o.push('Instância colegiada e deliberativa, presidida pela liderança executiva, com mandato para deliberar sobre o portfólio de TI, aprovar mudanças relevantes, revisar riscos e monitorar a execução do PDTI.');
  if (data.raci.length) {
    o.push('\\begin{longtable}{L{4cm} L{2.6cm} L{2.6cm} L{2.6cm} L{2.6cm}}');
    o.push('\\toprule \\textbf{Processo} & \\textbf{R} & \\textbf{A} & \\textbf{C} & \\textbf{I} \\\\ \\midrule \\endhead \\bottomrule \\endlastfoot');
    data.raci.forEach(r =>
      o.push(`${tex(r.process)} & ${tex(r.responsible)} & ${tex(r.accountable)} & ${tex(r.consulted)} & ${tex(r.informed)} \\\\`),
    );
    o.push('\\end{longtable}');
  }

  o.push('\\subsection{Ritos de Acompanhamento}');
  o.push('\\begin{itemize}[leftmargin=1.5em]');
  o.push('\\item Reunião quinzenal do Comitê --- KPIs, riscos, mudanças, portfólio.');
  o.push('\\item Reunião mensal de revisão --- Curva S e desvios.');
  o.push('\\item Revisão trimestral de riscos --- matriz e planos de tratamento.');
  o.push('\\item Revisão semestral do PDTI --- re-priorização do portfólio.');
  o.push('\\item Revisão anual completa --- novo diagnóstico de maturidade.');
  o.push('\\end{itemize}');

  if (data.kpis.length) {
    const m = (c.plan_horizon || '').match(/(\d{4}).*?(\d{4})/);
    const [y1, y2] = m ? [m[1], m[2]] : [String(new Date().getFullYear()), String(new Date().getFullYear() + 1)];
    o.push('\\subsection{KPIs do PDTI}');
    o.push('\\begin{longtable}{L{6cm} C{2cm} C{2cm} C{2cm} C{2cm}}');
    o.push(`\\toprule \\textbf{KPI} & \\textbf{Unidade} & \\textbf{Atual} & \\textbf{Meta ${y1}} & \\textbf{Meta ${y2}} \\\\ \\midrule \\endhead \\bottomrule \\endlastfoot`);
    data.kpis.forEach(k =>
      o.push(`${tex(k.name)} & ${tex(k.unit)} & ${tex(k.current_value)} & ${tex(k.target_year_1 ?? k.target_value)} & ${tex(k.target_year_2)} \\\\`),
    );
    o.push('\\end{longtable}');
  }

  o.push('\\subsection{Curva S de Execução}');
  o.push('A Curva S consolidada do PDTI é monitorada mensalmente pelo Comitê. Desvios superiores a 10\\% acionam plano de recuperação, com revisão de escopo, prazo ou recurso. A linha de base é definida pela soma ponderada do esforço (E da matriz RICE) das ações priorizadas.');

  o.push('\\end{document}');
  return o.join('\n');
};