## Evolução do Fluxo: Esteira PDTI + Central de Exportação

Conectar as funções existentes (Maturidade → Riscos → Plano de Ação) e adicionar uma página de exportação executiva com trava de qualidade.

### 1. Interconexão — Maturidade → Riscos
Em `src/pages/Risks.tsx`:
- Buscar o último assessment da empresa selecionada e calcular score por categoria via `calculateMaturity` (lib existente).
- Renderizar bloco "Findings de Maturidade" no topo, listando categorias com score ≤ 1.5.
- Cada finding tem botão **"Criar risco a partir deste finding"** que abre o dialog já preenchido (descrição = "Baixa maturidade em {categoria} (score X)", categoria = nome do domínio COBIT, probabilidade=4, impacto=4).

### 2. Interconexão — Riscos → Plano de Ação
Em `src/pages/ActionPlans.tsx`:
- Buscar riscos da empresa com `probability * impact >= 15`.
- Renderizar bloco "Sugestões de Plano (riscos críticos)" listando esses riscos com botão **"Gerar 5W2H"** que abre o dialog preenchido:
  - `what` = "Mitigar: {descrição}"
  - `why` = "Risco crítico P×I = {valor}"
  - `how` = mitigação do risco
  - `cobit_domain` = derivado da categoria
- Suportar abertura via querystring `?risk_id=...` (para chamadas vindas de outras telas).

### 3. Nova página: Central de Exportação PDTI
Criar `src/pages/ExportPdti.tsx` + rota `/export-pdti` no `App.tsx` + item no `AppLayout` (grupo Geral, ícone `FileDown`).

Estrutura da página:
- Seletor de empresa.
- Carrega: company, último assessment + answers + categories + questions, riscos, action_plans, KPIs, RACI.
- **Quality Gate (checklist visual)**:
  - ✅/❌ Domínios críticos (≤1.5) sem risco associado (match por nome de categoria em `risks.category` ou descrição).
  - ✅/❌ Riscos críticos (P×I≥15) sem ação 5W2H (match por descrição/categoria).
  - ✅/❌ Planos sem `who` ou (`due_date` e `when` vazios).
  - Lista os itens faltantes; botões de exportar ficam `disabled` se algum check falhar (com tooltip explicativo).
- **Botão "Exportar Markdown (.md)"**: gera string com seções (Capa, Diagnóstico, Tabela de Maturidade, Tabela de Riscos, Tabela 5W2H, Governança/RACI, KPIs) e dispara download via Blob.
- **Área "Template LaTeX (Overleaf)"**: `<Textarea readOnly>` com documento LaTeX (`documentclass{article}`, `booktabs`, `longtable`, `geometry`) preenchido dinamicamente + botão **"Copiar Código"** (`navigator.clipboard.writeText`).

### 4. Helpers
Criar `src/lib/pdti-export.ts` com:
- `buildMarkdown(data)` → string.
- `buildLatex(data)` → string (escapando `&`, `_`, `%`, `#`).
- `runQualityGate(data)` → `{ ok, checks: [{label, pass, items[]}] }`.

### Arquivos
- **Novos**: `src/pages/ExportPdti.tsx`, `src/lib/pdti-export.ts`.
- **Editados**: `src/pages/Risks.tsx`, `src/pages/ActionPlans.tsx`, `src/App.tsx`, `src/components/AppLayout.tsx`.

Sem mudanças no banco — toda a lógica usa tabelas existentes.
