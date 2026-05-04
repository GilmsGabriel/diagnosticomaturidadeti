import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MATURITY_BANDS, type MaturityResult } from './maturity-calculator';

export interface PdfActionPlan {
  what: string;
  who?: string | null;
  due_date?: string | null;
  cobit_domain?: string | null;
  kanban_status?: string | null;
  rice_score?: number | null;
  reach?: number | null;
  impact_score?: number | null;
  confidence?: number | null;
  effort?: number | null;
}

interface PdfInput {
  companyName: string;
  assessmentDate: string;
  result: MaturityResult;
  targets: Record<string, number>;
  recommendations: string[];
  actionPlans?: PdfActionPlan[];
}

export const generateMaturityPdf = ({
  companyName, assessmentDate, result, targets, recommendations, actionPlans,
}: PdfInput) => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  // ===== CAPA =====
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageW, 842, 'F');
  doc.setTextColor(255);
  doc.setFontSize(12).text('IT MATURITY ASSESSMENT', 40, 80);
  doc.setFontSize(28).setFont('helvetica', 'bold').text('Relatório de Maturidade de TI', 40, 140, { maxWidth: pageW - 80 });
  doc.setFontSize(14).setFont('helvetica', 'normal').text(`Empresa: ${companyName}`, 40, 200);
  doc.text(`Data: ${assessmentDate}`, 40, 222);
  doc.text(`Frameworks: COBIT 5 · ITIL 4 · ISO/IEC 27001`, 40, 244);

  doc.setFontSize(64).setFont('helvetica', 'bold').text(result.overallScore.toFixed(1), 40, 420);
  doc.setFontSize(16).setFont('helvetica', 'normal').text(MATURITY_BANDS.find(b => b.level === result.level)?.label || '', 40, 450);

  // ===== SUMÁRIO POR DOMÍNIO =====
  doc.addPage();
  doc.setTextColor(20);
  doc.setFontSize(20).setFont('helvetica', 'bold').text('Sumário de Maturidade por Domínio', 40, 60);
  doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(90)
    .text('Comparativo entre maturidade atual (As-is) e maturidade alvo (To-be).', 40, 80);

  autoTable(doc, {
    startY: 100,
    head: [['Domínio / Categoria', 'Atual', 'Alvo', 'Gap', 'Nível Atual']],
    body: result.categories.map(c => {
      const target = targets[c.id] ?? Math.min(5, c.score + 1);
      const gap = (target - c.score).toFixed(1);
      const band = MATURITY_BANDS.find(b => c.score >= b.min && c.score < b.max) || MATURITY_BANDS[4];
      return [c.name, c.score.toFixed(2), target.toFixed(1), gap, band.shortLabel];
    }),
    headStyles: { fillColor: [37, 99, 235] },
    styles: { fontSize: 10 },
  });

  // ===== ESCALA CMMI =====
  const afterTable = (doc as any).lastAutoTable.finalY + 30;
  doc.setTextColor(20).setFontSize(14).setFont('helvetica', 'bold').text('Escala de Maturidade (CMMI / COBIT PAM)', 40, afterTable);
  autoTable(doc, {
    startY: afterTable + 10,
    head: [['Faixa', 'Nível', 'Descrição']],
    body: MATURITY_BANDS.map(b => [`${b.min} – ${b.max}`, b.shortLabel, b.description]),
    headStyles: { fillColor: [37, 99, 235] },
    styles: { fontSize: 9 },
  });

  // ===== RECOMENDAÇÕES =====
  doc.addPage();
  doc.setFontSize(20).setFont('helvetica', 'bold').setTextColor(20).text('Recomendações Automatizadas', 40, 60);
  doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(90)
    .text('Sugestões de melhoria geradas a partir do nível de maturidade atual.', 40, 80);

  let y = 110;
  recommendations.forEach((r, i) => {
    if (y > 780) { doc.addPage(); y = 60; }
    doc.setFontSize(11).setTextColor(37, 99, 235).setFont('helvetica', 'bold').text(`${i + 1}.`, 40, y);
    doc.setTextColor(30).setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(r, pageW - 100);
    doc.text(lines, 60, y);
    y += lines.length * 14 + 10;
  });

  // ===== PLANOS PRIORIZADOS (RICE) =====
  if (actionPlans && actionPlans.length) {
    doc.addPage();
    doc.setFontSize(20).setFont('helvetica', 'bold').setTextColor(20).text('Planos de Ação Priorizados (RICE)', 40, 60);
    doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(90)
      .text('Ações ordenadas pelo maior ROI técnico (Reach × Impact × Confidence ÷ Effort).', 40, 80);

    const sorted = [...actionPlans].sort((a, b) => (Number(b.rice_score) || 0) - (Number(a.rice_score) || 0));
    autoTable(doc, {
      startY: 100,
      head: [['#', 'Ação', 'COBIT', 'Status', 'Resp.', 'Prazo', 'R', 'I', 'C%', 'E', 'RICE']],
      body: sorted.map((p, i) => [
        String(i + 1),
        (p.what || '').slice(0, 60),
        p.cobit_domain || '-',
        p.kanban_status || '-',
        p.who || '-',
        p.due_date ? new Date(p.due_date).toLocaleDateString('pt-BR') : '-',
        String(p.reach ?? '-'),
        String(p.impact_score ?? '-'),
        String(p.confidence ?? '-'),
        String(p.effort ?? '-'),
        Math.round(Number(p.rice_score) || 0).toLocaleString('pt-BR'),
      ]),
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 8 },
      columnStyles: { 1: { cellWidth: 160 }, 10: { fontStyle: 'bold', halign: 'right' } },
    });
  }

  // Footer
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(8).setTextColor(150).text(`${i} / ${total}`, pageW - 50, 820);
  }

  doc.save(`maturidade-ti-${companyName.replace(/\s+/g, '-')}.pdf`);
};
