## Diagnóstico

Você está certo. As 16 questões novas (APO/BAI/DSS/MEA) já existem no banco, mas a tela `Evaluate.tsx` agrupa as questões por domínio COBIT lendo um prefixo `[XXX##]` no campo `description` (ex.: `[APO12] ...`). Como inseri as questões com `description = NULL`, o `getDomainForCode` retorna `undefined` e o fallback joga tudo em **EDM** — por isso na avaliação só aparece EDM.

A página `Questions.tsx` (banco de questões) lista por categoria via accordion. Se você só está vendo EDM lá, provavelmente os outros accordions estão fechados — eles existem (confirmado: 10 categorias × 4 questões cada).

## Correção

Atualizar o campo `description` das 16 questões novas para incluir o prefixo COBIT correto, mapeando assim:

- **APO12** (Riscos): questões 1 e 2 de APO  
- **APO13** (Segurança): questões 3 e 4 de APO  
- **BAI06** (Mudanças): questões 1 e 2 de BAI  
- **BAI09** (Ativos): questões 3 e 4 de BAI  
- **DSS01** (Operações): questão 1 de DSS  
- **DSS03** (Problemas): questões 2 e 4 de DSS  
- **DSS04** (Continuidade/DRP): questão 3 de DSS  
- **MEA01** (Performance): questões 1 e 2 de MEA  
- **MEA03** (Conformidade LGPD): questões 3 e 4 de MEA  

Cada `description` ficará no formato `[CÓDIGO] texto da pergunta`, satisfazendo o regex `^\[([A-Z]{3}\d{2})\]` usado em `extractCobitCode`.

## Implementação

1. Executar `UPDATE` em `public.questions` ajustando `description` das 16 questões novas (uma instrução por código COBIT, filtrando por `description IS NULL` + `LIKE` no texto para evitar afetar as questões legadas).
2. Nenhuma mudança de código front-end necessária — `Evaluate.tsx`, o cálculo de `calculateMaturity` e o gráfico Radar já iteram dinamicamente sobre todas as categorias e domínios.

## Resultado esperado

- Na avaliação, as 5 abas COBIT (EDM, APO, BAI, DSS, MEA) passam a exibir suas questões correspondentes.
- Score Geral e Radar consideram a média ponderada das 10 categorias existentes.
- PDF reflete automaticamente a nova estrutura.
