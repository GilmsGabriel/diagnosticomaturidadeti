// PDTI export helpers — Markdown, LaTeX and Quality Gate
import type { MaturityResult } from './maturity-calculator';

export interface ExportData {
  company: { name: string; sector?: string | null; cnpj?: string | null; contact_name?: string | null; contact_email?: string | null };
  assessmentDate?: string;
  maturity?: MaturityResult | null;
  targets?: Record<string, number>;
  risks: Array<{
    description: string; category?: string | null; probability: number; impact: number;
    risk_level?: string | null; mitigation?: string | null; status: string;
  }>;
  plans: Array<{
    what: string; why?: string | null; where?: string | null; when?: string | null;
    who?: string | null; how?: string | null; how_much?: string | null;
    due_date?: string | null; priority: string; kanban_status: string;
    cobit_domain: string; rice_score?: number | null;
  }>;
  kpis: Array<{ name: string; category?: string | null; current_value?: number | null; target_value?: number | null; unit?: string | null; status: string }>;
  raci: Array<{ process: string; responsible?: string | null; accountable?: string | null; consulted?: string | null; informed?: string | null }>;
}

export interface QualityCheck { label: string; pass: boolean; items: string[]; }
export interface QualityResult { ok: boolean; checks: QualityCheck[]; }

const norm = (s?: string | null) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const runQualityGate = (data: ExportData): QualityResult => {
  const checks: QualityCheck[] = [];

  // 1. Critical maturity domains without risk
  const critical = (data.maturity?.categories || []).filter(c => c.answeredCount > 0 && c.score <= 1.5);
  const orphanCritical = critical.filter(c => {
    const cn = norm(c.name);
    return !data.risks.some(r => norm(r.category).includes(cn) || norm(r.description).includes(cn));
  });
  checks.push({
    label: 'Domínios críticos de maturidade (≤1.5) com risco associado',
    pass: orphanCritical.length === 0,
    items: orphanCritical.map(c => `${c.name} (score ${c.score.toFixed(1)})`),
  });

  // 2. Critical risks without action
  const criticalRisks = data.risks.filter(r => r.probability * r.impact >= 15);
  const orphanRisks = criticalRisks.filter(r => {
    const rd = norm(r.description);
    return !data.plans.some(p => norm(p.what).includes(rd.slice(0, 20)) || (r.description && norm(p.why).includes(rd.slice(0, 20))));
  });
  checks.push({
    label: 'Riscos críticos (P×I ≥ 15) com plano 5W2H',
    pass: orphanRisks.length === 0,
    items: orphanRisks.map(r => `${r.description} (P×I=${r.probability * r.impact})`),
  });

  // 3. Plans missing vital fields
  const incomplete = data.plans.filter(p => !p.who?.trim() || (!p.due_date && !p.when?.trim()));
  checks.push({
    label: 'Planos com Responsável e Prazo preenchidos',
    pass: incomplete.length === 0,
    items: incomplete.map(p => `${p.what.slice(0, 60)}${!p.who?.trim() ? ' [sem responsável]' : ''}${!p.due_date && !p.when?.trim() ? ' [sem prazo]' : ''}`),
  });

  return { ok: checks.every(c => c.pass), checks };
};

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');
const dash = (s?: string | null) => (s && s.trim() ? s : '—');

export const buildMarkdown = (data: ExportData): string => {
  const c = data.company;
  const lines: string[] = [];
  lines.push(`# PDTI — ${c.name}`);
  lines.push('');
  lines.push(`**Plano Diretor de Tecnologia da Informação** — gerado em ${new Date().toLocaleDateString('pt-BR')}`);
  lines.push('');
  lines.push('## 1. Identificação da Organização');
  lines.push('');
  lines.push(`- **Empresa:** ${c.name}`);
  if (c.sector) lines.push(`- **Setor:** ${c.sector}`);
  if (c.cnpj) lines.push(`- **CNPJ:** ${c.cnpj}`);
  if (c.contact_name) lines.push(`- **Contato:** ${c.contact_name}${c.contact_email ? ` (${c.contact_email})` : ''}`);
  lines.push('');

  lines.push('## 2. Diagnóstico de Maturidade');
  lines.push('');
  if (data.maturity && data.maturity.categories.length) {
    lines.push(`**Score Geral:** ${data.maturity.overallScore.toFixed(2)} / 5 — Nível: **${data.maturity.level}**`);
    lines.push('');
    lines.push('| Categoria | Atual (As-Is) | Alvo (To-Be) | Gap |');
    lines.push('|---|---:|---:|---:|');
    data.maturity.categories.forEach(cat => {
      const tgt = data.targets?.[cat.id] ?? Math.min(5, Math.round(cat.score + 1));
      lines.push(`| ${cat.name} | ${cat.score.toFixed(1)} | ${tgt.toFixed(1)} | +${(tgt - cat.score).toFixed(1)} |`);
    });
  } else {
    lines.push('_Nenhum diagnóstico de maturidade disponível._');
  }
  lines.push('');

  lines.push('## 3. Matriz de Riscos');
  lines.push('');
  if (data.risks.length) {
    lines.push('| # | Descrição | Categoria | P | I | P×I | Nível | Mitigação | Status |');
    lines.push('|---|---|---|---:|---:|---:|---|---|---|');
    data.risks.forEach((r, i) => {
      lines.push(`| ${i + 1} | ${r.description.replace(/\|/g, '\\|')} | ${dash(r.category)} | ${r.probability} | ${r.impact} | ${r.probability * r.impact} | ${dash(r.risk_level)} | ${dash(r.mitigation).replace(/\|/g, '\\|')} | ${r.status} |`);
    });
  } else lines.push('_Nenhum risco cadastrado._');
  lines.push('');

  lines.push('## 4. Plano de Ação 5W2H');
  lines.push('');
  if (data.plans.length) {
    lines.push('| # | O quê | Por quê | Onde | Quando | Quem | Como | Quanto | Prazo | Prioridade | RICE | COBIT |');
    lines.push('|---|---|---|---|---|---|---|---|---|---|---:|---|');
    data.plans.forEach((p, i) => {
      lines.push(`| ${i + 1} | ${dash(p.what)} | ${dash(p.why)} | ${dash(p.where)} | ${dash(p.when)} | ${dash(p.who)} | ${dash(p.how)} | ${dash(p.how_much)} | ${fmtDate(p.due_date)} | ${p.priority} | ${p.rice_score ? Math.round(p.rice_score) : '—'} | ${p.cobit_domain} |`.replace(/\n/g, ' '));
    });
  } else lines.push('_Nenhuma ação cadastrada._');
  lines.push('');

  if (data.kpis.length) {
    lines.push('## 5. KPIs (MEA)');
    lines.push('');
    lines.push('| KPI | Categoria | Atual | Alvo | Unid. | Status |');
    lines.push('|---|---|---:|---:|---|---|');
    data.kpis.forEach(k => lines.push(`| ${k.name} | ${dash(k.category)} | ${k.current_value ?? '—'} | ${k.target_value ?? '—'} | ${dash(k.unit)} | ${k.status} |`));
    lines.push('');
  }

  if (data.raci.length) {
    lines.push('## 6. Governança — Matriz RACI');
    lines.push('');
    lines.push('| Processo | Responsible | Accountable | Consulted | Informed |');
    lines.push('|---|---|---|---|---|');
    data.raci.forEach(r => lines.push(`| ${r.process} | ${dash(r.responsible)} | ${dash(r.accountable)} | ${dash(r.consulted)} | ${dash(r.informed)} |`));
    lines.push('');
  }

  lines.push('---');
  lines.push('_Documento gerado pelo IT Maturity Assessment — alinhado a COBIT 2019, ITIL 4 e ISO/IEC 27001._');
  return lines.join('\n');
};

const tex = (s?: string | null): string => {
  if (!s) return '--';
  return String(s)
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([&%$#_{}])/g, '\\$1')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(/\n+/g, ' ');
};

export const buildLatex = (data: ExportData): string => {
  const c = data.company;
  const out: string[] = [];
  out.push('\\documentclass[11pt,a4paper]{article}');
  out.push('\\usepackage[utf8]{inputenc}');
  out.push('\\usepackage[T1]{fontenc}');
  out.push('\\usepackage[brazil]{babel}');
  out.push('\\usepackage[margin=2.2cm]{geometry}');
  out.push('\\usepackage{booktabs}');
  out.push('\\usepackage{longtable}');
  out.push('\\usepackage{array}');
  out.push('\\usepackage{xcolor}');
  out.push('\\usepackage{titlesec}');
  out.push('\\usepackage{hyperref}');
  out.push('\\title{PDTI --- ' + tex(c.name) + '}');
  out.push('\\author{Plano Diretor de Tecnologia da Informa\\c{c}\\~ao}');
  out.push('\\date{\\today}');
  out.push('\\begin{document}');
  out.push('\\maketitle');
  out.push('\\tableofcontents');
  out.push('\\newpage');

  out.push('\\section{Identifica\\c{c}\\~ao da Organiza\\c{c}\\~ao}');
  out.push('\\begin{itemize}');
  out.push('  \\item \\textbf{Empresa:} ' + tex(c.name));
  if (c.sector) out.push('  \\item \\textbf{Setor:} ' + tex(c.sector));
  if (c.cnpj) out.push('  \\item \\textbf{CNPJ:} ' + tex(c.cnpj));
  if (c.contact_name) out.push('  \\item \\textbf{Contato:} ' + tex(c.contact_name) + (c.contact_email ? ' (' + tex(c.contact_email) + ')' : ''));
  out.push('\\end{itemize}');

  out.push('\\section{Diagn\\\'ostico de Maturidade}');
  if (data.maturity && data.maturity.categories.length) {
    out.push('Score geral: \\textbf{' + data.maturity.overallScore.toFixed(2) + ' / 5} --- N\\\'ivel: \\textbf{' + tex(data.maturity.level) + '}.');
    out.push('\\begin{longtable}{lrrr}');
    out.push('\\toprule');
    out.push('\\textbf{Categoria} & \\textbf{As-Is} & \\textbf{To-Be} & \\textbf{Gap} \\\\');
    out.push('\\midrule \\endhead');
    data.maturity.categories.forEach(cat => {
      const tgt = data.targets?.[cat.id] ?? Math.min(5, Math.round(cat.score + 1));
      out.push(`${tex(cat.name)} & ${cat.score.toFixed(1)} & ${tgt.toFixed(1)} & +${(tgt - cat.score).toFixed(1)} \\\\`);
    });
    out.push('\\bottomrule');
    out.push('\\end{longtable}');
  } else {
    out.push('Nenhum diagn\\\'ostico dispon\\\'ivel.');
  }

  out.push('\\section{Matriz de Riscos}');
  if (data.risks.length) {
    out.push('\\begin{longtable}{p{4.5cm}p{2cm}rrrp{3.5cm}p{2cm}}');
    out.push('\\toprule');
    out.push('\\textbf{Descri\\c{c}\\~ao} & \\textbf{Categoria} & \\textbf{P} & \\textbf{I} & \\textbf{P$\\times$I} & \\textbf{Mitiga\\c{c}\\~ao} & \\textbf{Status} \\\\');
    out.push('\\midrule \\endhead');
    data.risks.forEach(r => out.push(`${tex(r.description)} & ${tex(r.category)} & ${r.probability} & ${r.impact} & ${r.probability * r.impact} & ${tex(r.mitigation)} & ${tex(r.status)} \\\\`));
    out.push('\\bottomrule');
    out.push('\\end{longtable}');
  }

  out.push('\\section{Plano de A\\c{c}\\~ao 5W2H}');
  if (data.plans.length) {
    out.push('\\begin{longtable}{p{3.5cm}p{2.5cm}p{2.5cm}p{2cm}p{2.5cm}rl}');
    out.push('\\toprule');
    out.push('\\textbf{O qu\\^e} & \\textbf{Por qu\\^e} & \\textbf{Como} & \\textbf{Quem} & \\textbf{Quando} & \\textbf{RICE} & \\textbf{COBIT} \\\\');
    out.push('\\midrule \\endhead');
    data.plans.forEach(p => out.push(`${tex(p.what)} & ${tex(p.why)} & ${tex(p.how)} & ${tex(p.who)} & ${tex(p.when || fmtDate(p.due_date))} & ${p.rice_score ? Math.round(p.rice_score) : '--'} & ${tex(p.cobit_domain)} \\\\`));
    out.push('\\bottomrule');
    out.push('\\end{longtable}');
  }

  if (data.kpis.length) {
    out.push('\\section{KPIs (MEA)}');
    out.push('\\begin{longtable}{p{4.5cm}p{2.5cm}rrll}');
    out.push('\\toprule');
    out.push('\\textbf{KPI} & \\textbf{Categoria} & \\textbf{Atual} & \\textbf{Alvo} & \\textbf{Unid.} & \\textbf{Status} \\\\');
    out.push('\\midrule \\endhead');
    data.kpis.forEach(k => out.push(`${tex(k.name)} & ${tex(k.category)} & ${k.current_value ?? '--'} & ${k.target_value ?? '--'} & ${tex(k.unit)} & ${tex(k.status)} \\\\`));
    out.push('\\bottomrule');
    out.push('\\end{longtable}');
  }

  if (data.raci.length) {
    out.push('\\section{Governan\\c{c}a --- Matriz RACI}');
    out.push('\\begin{longtable}{p{3.5cm}p{2.5cm}p{2.5cm}p{2.5cm}p{2.5cm}}');
    out.push('\\toprule');
    out.push('\\textbf{Processo} & \\textbf{R} & \\textbf{A} & \\textbf{C} & \\textbf{I} \\\\');
    out.push('\\midrule \\endhead');
    data.raci.forEach(r => out.push(`${tex(r.process)} & ${tex(r.responsible)} & ${tex(r.accountable)} & ${tex(r.consulted)} & ${tex(r.informed)} \\\\`));
    out.push('\\bottomrule');
    out.push('\\end{longtable}');
  }

  out.push('\\end{document}');
  return out.join('\n');
};