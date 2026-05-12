## PDTI — Grupo Horizonte S.A.

Gerar dois artefatos baixáveis (não altera o app):
- `PDTI_Grupo_Horizonte.docx` — versão editável (Word)
- `PDTI_Grupo_Horizonte.pdf` — versão executiva diagramada

### Fontes de entrada
- `Caso_1_Governanca.md` — contexto, governança, dupla liderança, conflitos de agência
- `maturidade-ti-Grupo-Horizonte.pdf` — diagnóstico de maturidade (As-Is) por domínio COBIT
- `5W2H_PlanoDeAcao_GrupoHorizonte_90dias.xlsx` — ações 90 dias (Quick Wins)
- `Planilha_de_riscos_-_TIC.xlsx` — matriz de riscos TIC
- `Guia_Estratégico_PDTI_Roadmap_e_Governança.txt` — referencial metodológico SISP/TCU

### Estrutura do documento (SISP v2.1 + COBIT 5)

1. **Capa & Sumário Executivo** — identificação, vigência (2026–2027), patrocinador.
2. **Introdução e Referencial Estratégico**
   - Apresentação do Grupo Horizonte (logística multimodal, 2.500 veículos, 3 terminais)
   - Missão/Visão/Valores da TI
   - Alinhamento com objetivos: profissionalização da governança, sustentabilidade financeira, expansão digital
3. **Diagnóstico Situacional (As-Is)**
   - Infraestrutura, sistemas legados, pessoas
   - SWOT da TI (extraída do caso e do PDF de maturidade)
   - Maturidade por domínio COBIT (EDM/APO/BAI/DSS/MEA) com gap atual vs. alvo
4. **Gestão de Riscos**
   - Matriz Probabilidade × Impacto (importada da planilha de riscos)
   - Foco: continuidade do negócio, LGPD, dependência do fundador (risco-chave de governança)
   - Planos de mitigação e contingência
5. **Priorização Estratégica (RICE + GUT)**
   - Tabela priorizada das demandas com justificativa
6. **Plano de Ação 5W2H**
   - Quick Wins (90 dias) da planilha + ações de médio/longo prazo
   - KPIs por ação
7. **Governança e Monitoramento**
   - Comitê de Governança Digital (composição, papéis RACI)
   - Ritos: reuniões mensais, revisão semestral, Curva S, indicadores
   - Política de revisão anual
8. **Anexos** — referências (COBIT, ITIL, ISO 27001, SISP)

### Detalhes técnicos
- Parsear PDF/XLSX/MD com `document--parse_document` e `pandas`
- DOCX gerado com biblioteca `docx` (Node) seguindo skill/docx: US Letter, Arial, headings estilizados, sumário (TOC), tabelas com DXA, sem bullets unicode
- Conversão para PDF via LibreOffice headless (`run_libreoffice.py`)
- QA visual: converter PDF para imagens com `pdftoppm` e inspecionar todas as páginas antes de entregar
- Saída em `/mnt/documents/`, entregue via `<lov-artifact>`

### Entregáveis
Dois arquivos prontos para download — sem alterações no código do app.