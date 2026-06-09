## Objetivo
Injetar todos os dados do caso **Banco Meridional S.A.** nas tabelas existentes (sem alterar UI, schemas ou exportação LaTeX) para o usuário `bancomeridional@gmail.com` (id `37e65076-1736-4bff-a26e-baa94c0852ce`), de modo que o **Quality Gate da tela "Exportar PDTI" fique 100% aprovado** e o `.tex` esteja liberado.

## Estratégia de injeção
Tudo via **uma única chamada de data-write (insert/update/delete)**. Para idempotência, antes de inserir, removo registros prévios da empresa do usuário; depois insiro o conjunto completo.

Empresa-alvo já existente: `Banco Meridional S.A` (id `80e4d8ce-3793-4ec6-ae24-a9d4d7695775`). Será **atualizada** (não recriada) para preservar o id; demais entidades (riscos, planos, KPIs, RACI, SWOT, assessment, answers) serão deletadas e reinseridas.

## Conteúdo a ser populado

### 1. `companies` (UPDATE da empresa existente)
- `name`: Banco Meridional S.A.
- `sector`: Financeiro / Bancário (Banco Múltiplo)
- `cnpj`: (deduzido — usar placeholder genérico se faltar)
- `contact_name`: Paulo Salles (Diretor de Tecnologia)
- `contact_email`: paulo.salles@bancomeridional.com.br
- `sponsor`: Conselho de Administração / Fundo de Pensão (resolução aprovada 5×4)
- `plan_horizon`: 2026–2028
- `mission` / `vision` / `values`: derivados do Plano "Meridional 2028" e cultura do "banco de relações"
- `strategic_context`: parágrafo consolidando sede em Cuiabá-MT, carteira R$ 9,8 bi, 359.000 clientes (312k PF + 47k PJ), 68 agências + 4 centros + call center 380 posições + data center local, plano "Meridional 2028" (4 frentes) e pressões regulatórias (BACEN Res. 4.893/CMN 4.557, COAF, ANPD).

### 2. `assessments` + `assessment_answers` (1 assessment "completed")
Para cada uma das 10 categorias (4 perguntas cada), gravar respostas inteiras (1–5) cuja **média bate o score-alvo** abaixo. Como `Governança de TI` exige 1.5, usar `[2,2,1,1]` (média 1.5); demais categorias todas em `[1,1,1,1]` (média 1.0).

| Categoria | Score atual | Respostas |
|---|---:|---|
| Governança de TI | 1.5 | 2,2,1,1 |
| Segurança da Informação | 1.0 | 1,1,1,1 |
| Infraestrutura | 1.0 | 1,1,1,1 |
| Gestão de Serviços | 1.0 | 1,1,1,1 |
| Desenvolvimento e Inovação | 1.0 | 1,1,1,1 |
| Gestão de Dados | 1.0 | 1,1,1,1 |
| APO | 1.0 | 1,1,1,1 |
| BAI | 1.0 | 1,1,1,1 |
| DSS | 1.0 | 1,1,1,1 |
| MEA | 1.0 | 1,1,1,1 |

`assessments`: status `completed`, `overall_score` ≈ 1.05, `maturity_level` `repetivel`, `notes` = "Diagnóstico baseado no caso Banco Meridional 2026; conformidade BACEN Res. 4.893 / CMN 4.557.", `completed_at` = agora.

### 3. `risks` — 10 registros (4 nomeados críticos + 6 auxiliares)
**Os 4 críticos (P×I ≥ 15) terão `id` fixo** para serem referenciados pelos planos (`risk_id`):
- R01 Colapso do Código Mestre — P 5 × I 5 = 25, categoria "Desenvolvimento e Inovação / Operacional"
- R02 Fraude Interna / Segregação — P 4 × I 4 = 16, categoria "BAI / Fraude / Compliance"
- R03 Engenharia Social/Phishing/Vishing — P 5 × I 4 = 20, categoria "Segurança da Informação"
- R04 Sanções BACEN/ANPD/COAF — P 5 × I 5 = 25, categoria "MEA / Legal / Regulatório"

**6 auxiliares (P×I < 15)** com a descrição contendo o nome da categoria, para satisfazer o gate "todo domínio ≤1.5 tem risco associado". Cada um P 3 × I 3 = 9, estratégia "mitigate", status "identified", `swot_origin` apropriado:
- R-Aux Governança de TI (centralização Meireles 26 anos, conselho sem independência)
- R-Aux Infraestrutura (data center 1997, nobreak 61%, sem hot site)
- R-Aux Gestão de Serviços (sem ITSM, heroísmo, chamados via telefone)
- R-Aux Gestão de Dados (logs 30d, Excel com 2,3% erro, sem ROPA)
- R-Aux APO (orçamento 74% legado, TI vista como custo, matriz de riscos desatualizada)
- R-Aux DSS (uptime 93,8%, MTTR 5,1h, sem runbooks)

Cada risco terá `swot_origin` apontando para o código SWOT relevante (FRA-01..04, AME-01..03).

### 4. `action_plans` — 4 planos 5W2H (vinculados a R01–R04 via `risk_id`)
Todos os campos preenchidos conforme o briefing (what, why, where, when, who, how, how_much, due_date, priority=`high`, kanban_status=`backlog`, cobit_domain, cia_indicators, RICE, action_code, kpi_success, department) com **CAPEX/OPEX deduzidos do how_much**:

| Ação | Risco | CAPEX | OPEX | swot_trace |
|---|---|---:|---:|---|
| ACT-SEC-01 MFA + 38 contas | R03 | 0 | 25.000 | FRA-02 |
| ACT-GOV-01 CISO + Comitê | R02 | 0 | 90.000 | FRA-03 |
| ACT-REG-01 Open Finance APIs | R04 | 380.000 | 0 | AME-01 |
| ACT-OPS-01 DRP + Backups | R01 | 40.000 | 0 | FRA-04 |

### 5. `swot_entries` — 13 itens (códigos auto-atribuídos)
- **FOR-01..03** — 3 forças (relacionamento agro, baixa inadimplência rural, carteira R$ 9,8 bi)
- **FRA-01..04** — 4 fraquezas (Código Mestre COBOL, dependência 3 devs, governança centralizada, data center 1997)
- **OPO-01..03** — 3 oportunidades (app mobile, Open Finance, novo core homologado BACEN)
- **AME-01..03** — 3 ameaças (BACEN/multas, ANPD/dados não-anonimizados, fraudes/engenharia social)

### 6. `kpis` — KPIs deduzidos do caso (não obrigatório p/ gate, mas completa o PDTI)
- Uptime core bancário (Atual 93,8 % / Meta y1 99,5 % / Meta y2 99,7 %)
- MTTR (5,1 h → 2,0 h → 1,0 h)
- % MFA ativo (0 % → 100 %)
- Contas ativas de ex-funcionários (38 → 0)
- Retenção de logs (30 d → 180 d)
- % orçamento em modernização (11 % → 35 %)
- Multas regulatórias acumuladas R$ (16 mi → 0)

### 7. `raci_entries` — 6 processos-chave
Governança de TI, Gestão de Segurança, Gestão de Riscos, Open Finance, Mudanças em Produção, Continuidade/DRP — com R/A/C/I extraídos do caso (Paulo Salles, Beatriz Fontes, Oswaldo Meireles, CISO novo, Comitê de Auditoria, Conselho/Fundo de Pensão).

## Detalhes técnicos
- Operação executada em **uma transação SQL única** via `supabase--insert`:
  1. `DELETE FROM action_plans WHERE company_id = '<id>'`
  2. `DELETE FROM risks WHERE company_id = '<id>'`
  3. `DELETE FROM kpis WHERE company_id = '<id>'`
  4. `DELETE FROM raci_entries WHERE company_id = '<id>'`
  5. `DELETE FROM swot_entries WHERE company_id = '<id>'`
  6. `DELETE FROM assessment_answers WHERE assessment_id IN (SELECT id FROM assessments WHERE company_id = '<id>')`
  7. `DELETE FROM assessments WHERE company_id = '<id>'`
  8. `UPDATE companies SET ... WHERE id = '<id>'`
  9. `INSERT INTO swot_entries ... RETURNING id` (com códigos FOR/FRA/OPO/AME)
  10. `INSERT INTO risks ...` (10 linhas, 4 com ids fixos)
  11. `INSERT INTO action_plans ...` (4 linhas com `risk_id` apontando para R01–R04)
  12. `INSERT INTO kpis ...` (7 linhas)
  13. `INSERT INTO raci_entries ...` (6 linhas)
  14. `INSERT INTO assessments ... RETURNING id`
  15. `INSERT INTO assessment_answers ...` (40 linhas — 4 por categoria × 10 categorias)
- Todos os `created_by`, `assessor_id`, `company_id` apontando para os ids reais já existentes.
- Sem migração de schema, sem mudança de arquivos do projeto. **Nenhuma alteração de UI ou de `pdti-export.ts`.**

## Validação final
Após a injeção, acessar `/export-pdti` selecionando "Banco Meridional S.A." deve mostrar:
- ✓ Domínios críticos com risco associado
- ✓ Riscos críticos com plano 5W2H
- ✓ Planos com Responsável e Prazo
- Botões "Copiar LaTeX", "Baixar .tex" e "Baixar PDF compilado" liberados.