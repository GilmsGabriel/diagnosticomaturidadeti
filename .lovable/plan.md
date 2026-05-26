
## Objetivo

Corrigir os bugs apontados e elevar o PDTI exportado ao mesmo padrão do `PPTI.tex` anexado (capa, sumário executivo, SWOT, missão/visão, alinhamento estratégico, riscos com mitigação/contingência, 5W2H detalhado por ação com KPI, RACI, KPIs 2026/2027, ritos de governança).

---

## 1. Correções de bugs (interconexão Riscos ↔ Planos)

**Raiz:** hoje o "link" entre risco e plano é heurístico (substring). Por isso o botão "Gerar 5W2H" nunca some, o Quality Gate marca planos errados como faltantes e a contagem fica inconsistente.

**Solução — vínculo explícito:**
- **Migração**: adicionar `risk_id uuid` em `action_plans` (nullable, sem FK rígida para não bloquear deletes) + índice. Migração inclui `GRANT` revalidado.
- `prefillFromRisk` passa a setar `form.risk_id`; ao salvar, persiste `risk_id`.
- `ActionPlans.tsx`: cartão "Sugestões" só mostra riscos críticos **que ainda não têm plano com `risk_id` correspondente**. Quando já existe, o item some da lista (em vez de só virar `ghost`).
- `pdti-export.ts` (`runQualityGate`): o check "risco crítico sem 5W2H" passa a comparar `risk_id` em vez de fuzzy match.

## 2. Correções no Quality Gate e Exportação

- Check "Planos com Responsável e Prazo" itera sobre `data.plans` (já correto) — adicionar guard para ignorar planos cujo `kanban_status === 'done'` e melhorar mensagens.
- Gate "Riscos críticos com 5W2H": usar `risk_id`.
- **Travar LaTeX quando o gate falha**: substituir `<Textarea readOnly>` por um bloco mascarado (`blur-sm` + overlay "Corrija as inconsistências para liberar") quando `!gate.ok`; botão "Copiar" continua `disabled`.
- Tooltip nos botões desabilitados explicando o motivo exato (qual check falhou).

## 3. Enriquecimento do modelo de dados (para PDTI rico)

Migração única adicionando colunas opcionais que alimentam as novas seções do documento.

**`companies`** (campos do referencial estratégico):
- `mission text`, `vision text`, `values text`
- `strategic_context text` (drivers de mercado)
- `sponsor text` (patrocinador executivo)
- `plan_horizon text` (ex.: "2026-2027")

**`risks`**:
- `risk_type text default 'threat'` (`threat` | `opportunity`)
- `response_strategy text` (`mitigate` | `transfer` | `accept` | `avoid` | `explore` | `enhance`)
- `contingency text` (plano de contingência distinto da mitigação)
- `responsible text`

**`action_plans`**:
- `risk_id uuid` (item 1)
- `kpi_success text` (KPI da ação — visto no PPTI: "0 contas Super Admin sem dono")
- `department text`
- `action_code text` (ex.: "#01" para numeração estável)

**`kpis`**:
- `target_year_1 numeric`, `target_year_2 numeric` (Meta 2026 / Meta 2027)

**Nova tabela `swot_entries`** (`company_id`, `type` in `strength|weakness|opportunity|threat`, `description`, RLS por `created_by`, GRANT padrão).

Todos os campos novos são **opcionais** — o app continua funcionando sem eles, mas o PDTI exportado fica genérico se vazios.

## 4. UI mínima para preencher o novo conteúdo

- **Companies.tsx**: ao editar, expandir o dialog com aba "Estratégia" (missão, visão, valores, contexto, patrocinador, horizonte) e aba "SWOT" (CRUD simples de entradas).
- **Risks.tsx**: dialog ganha campos `tipo`, `estratégia de resposta`, `contingência`, `responsável`.
- **ActionPlans.tsx**: dialog ganha campos `KPI de sucesso`, `departamento`, `código da ação`.
- **Kpis.tsx**: campos `Meta Ano 1` e `Meta Ano 2` ao lado de `target_value`.

Cada campo novo herda valor inteligente por padrão (ex.: `responsible` = "Gerente de TI") para não travar fluxos existentes.

## 5. Exportação PDTI ao padrão PPTI

Reescrever `src/lib/pdti-export.ts` em dois geradores espelhando a estrutura do `PPTI.tex` de referência:

### Estrutura do documento (idêntica ao PPTI.tex)
1. **Capa** — título, horizonte (`plan_horizon`), patrocinador, vigência, autores, "Confidencial".
2. **Sumário executivo** — parágrafo gerado a partir de: nível de maturidade calculado + nº de riscos críticos + nº de ações Quick Win.
3. **Introdução e referencial estratégico** — empresa, contexto/drivers, missão/visão/valores, **tabela de alinhamento** (objetivo de negócio × resposta de TI × domínio COBIT) derivada de `action_plans.cobit_domain`.
4. **Diagnóstico situacional (As-Is)** — infra/sistemas/pessoas (texto a partir das observações dos answers), tabela de maturidade Atual×Alvo×Gap×Nível, **SWOT** em tabela 2×2.
5. **Gestão de riscos** — matriz completa (Descrição, Tipo, Probabilidade qualitativa, Impacto qualitativo, PxI, Estratégia, Responsável) + **subseção "Planos de mitigação e contingência (Top 5)"** com mitigation/contingency por risco.
6. **Priorização estratégica (RICE)** — tabela ordenada com #, ação, departamento, prazo, RICE; rodapé "Quick Wins ≤45 dias: #X, #Y…".
7. **Plano de ação 5W2H** — **uma tabela por ação** (no estilo `\acaotitulo` + `acaotab` do PPTI) com 8 linhas: What/Why/Who/When/Where/How/How much/KPI de sucesso.
8. **Governança e monitoramento** — Comitê (papéis a partir do RACI), ritos fixos (quinzenal/mensal/trimestral/semestral/anual), **KPIs Meta 2026 × Meta 2027**, Curva S (parágrafo padrão).

### Geradores
- `buildLatex(data)`: usa preâmbulo idêntico ao PPTI (geometry, fancyhdr, titleformat, cor `horizonblue` parametrizada pelo nome da empresa, colunas `L`/`C`, ambientes `acaotab`).
- `buildMarkdown(data)`: mesma estrutura em Markdown limpo (capa, headings, tabelas).
- Helpers: `qualLevel(n)` (1→"Muito Baixo", 5→"Muito Alto"), `responseLabel(s)`, `pxiLabel(n)`.
- Função `tex()` reforçada (já existe) + escape para Markdown.

### Quick Wins / numeração
- Ações ordenadas por `rice_score desc`; numeração #01..#NN gerada em runtime se `action_code` vazio.
- Quick Wins = ações com `due_date` em ≤45 dias **ou** prazo descritivo contendo "≤ 45" / "30 dias" etc. (regex simples).

## 6. ExportPdti.tsx — ajustes

- Carregar também `swot_entries` e novos campos.
- Renderizar **preview do documento** (primeiras seções renderizadas em HTML) acima dos botões, para o usuário ver antes de exportar.
- Botão **"Baixar .tex"** (além de copiar): emite blob `application/x-tex`.
- Mensagens de erro do Quality Gate linkam para a página onde corrigir (botão "Ir para Riscos" / "Ir para Planos").

---

## Arquivos

**Novos**
- `supabase/migrations/<timestamp>_pdti_v2.sql` (colunas + tabela SWOT + GRANTs + RLS)
- `src/components/companies/StrategyForm.tsx` (aba estratégia + SWOT)

**Editados**
- `src/lib/pdti-export.ts` — reescrita completa (Markdown + LaTeX no padrão PPTI)
- `src/pages/ExportPdti.tsx` — preview, novos dados, gate via `risk_id`, .tex download, máscara LaTeX
- `src/pages/ActionPlans.tsx` — `risk_id`, KPI de sucesso, departamento, código; cartão sugestões filtrado
- `src/pages/Risks.tsx` — novos campos (tipo, estratégia, contingência, responsável)
- `src/pages/Companies.tsx` — abas Estratégia + SWOT
- `src/pages/Kpis.tsx` — metas 2026/2027

Sem mudanças em `client.ts`/`types.ts` (regenerados automaticamente após a migração).

## Aceitação

1. Clicar "Gerar 5W2H" e salvar → o item some do cartão de sugestões (não muda apenas a cor).
2. Quality Gate da página Export reflete só os planos reais (não as sugestões).
3. Com gate falhando, **nem** o Markdown **nem** o LaTeX podem ser copiados/baixados.
4. PDTI exportado para uma empresa preenchida tem capa, sumário executivo, SWOT, alinhamento estratégico, mitigação+contingência por risco crítico, **uma tabela 5W2H por ação com KPI**, RACI, e KPIs 2026/2027 — equivalente em estrutura ao `PPTI.tex`.
