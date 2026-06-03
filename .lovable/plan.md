## Objetivo

Elevar a confiabilidade percebida do app a nível profissional, eliminando bugs de consistência, telas brancas, erros silenciosos e comportamentos imprevisíveis — sem mudar funcionalidades.

## Achados da auditoria (priorizados)

### Bugs concretos
1. **`ExportPdti.downloadPdf`** voltou a usar `supabase.functions.invoke`, que não retorna binário corretamente. O toast diz "PDF compilado e baixado" mas o arquivo sai vazio. **Já corrigido antes; regressão.**
2. **`Report.tsx`** usa `.single()` em assessment — se a avaliação for excluída ou o ID for inválido, a página quebra em vez de mostrar "não encontrada".
3. **`Evaluate.handleFinish`** faz `DELETE` das respostas antigas e depois `INSERT` das novas sem transação. Se o insert falhar (rede, RLS), o usuário perde todas as respostas salvas.
4. **`Dashboard`/`ExportPdti`/`Evaluate`** ignoram erros do `Promise.all` — uma query com falha vira `data: null` silenciosamente e mostra dados parciais.
5. **`AuthContext`** chama `fetchRoles` dentro de `setTimeout(0)` — primeira render ocorre com `isAdmin=false`, causando flicker e ocasional acesso negado em rotas admin.

### Inconsistências de UX
6. Diálogos destrutivos usam `window.confirm()` nativo (7 ocorrências) — quebra o tema dark, bloqueante, sem nome do item.
7. Páginas de listagem (Companies, Questions, Risks, Kpis, ActionPlans, Raci, Assessments) não têm skeleton/loading — tela em branco até a query terminar.
8. Sem `ErrorBoundary` global — qualquer erro de render = tela branca, sem opção de "tentar novamente".
9. Formatação inconsistente: scores ora `toFixed(1)` ora cru; datas ora `toLocaleDateString('pt-BR')` ora ISO; pluralização ad-hoc.
10. Empty states ausentes ou genéricos em metade das páginas.

### Robustez de dados
11. Nenhum formulário tem validação **Zod** — apenas `required` do HTML. Aceita strings com 1000+ chars, scores fora do range, emails inválidos.
12. Mutações não refazem fetch consistentemente — após editar, UI fica dessincronizada até F5.
13. Sem otimismo nem rollback em mutações (ex.: arrastar card no Kanban).

## Plano de correção (correções rápidas, um ciclo)

### 1. Bugs críticos
- Reaplicar fix do **`downloadPdf`** com `fetch` direto + validação de `blob.size > 1000`.
- Trocar **`.single()`** por `.maybeSingle()` em `Report.tsx` com fallback "Avaliação não encontrada".
- Em **`Evaluate.handleFinish`**: usar `upsert` (com `onConflict: 'assessment_id,question_id'`) em vez de `delete + insert`; reverter status caso falhe.
- Tratar erros explícitos em todos os `Promise.all` — se qualquer query falhar, mostrar toast e estado de erro.
- Em **`AuthContext`**, aguardar `fetchRoles` antes de definir `loading=false`, para que rotas admin não tenham flicker.

### 2. Consistência de UX
- Criar componente **`ConfirmDialog`** (shadcn `AlertDialog`) e substituir todos os `window.confirm()`. Mostra o nome do item e destaca a ação destrutiva.
- Criar componente **`PageSkeleton`** e usá-lo em todas as listagens enquanto carregam.
- Adicionar **`ErrorBoundary`** global em `App.tsx` com fallback "Algo deu errado — recarregar".
- Padronizar formatação em `src/lib/format.ts`: `formatDate`, `formatScore`, `formatPercent`, `pluralize`.
- Padronizar empty states com componente **`EmptyState`** (ícone + título + descrição + CTA).

### 3. Robustez de dados (Zod)
- Adicionar schemas Zod em `src/lib/schemas.ts` para: Company, Question, Category, Assessment, ActionPlan, Risk, Kpi, Raci, Swot, Auth.
- Validar via `safeParse` antes de cada submit; mostrar erros inline nos campos.
- Limites: textos curtos ≤120, longos ≤2000, observações ≤5000, emails válidos, números nos ranges do schema.

### 4. Sincronização
- Após cada mutação (create/update/delete), refazer o fetch da lista (já existe em algumas, padronizar nas demais).
- No Kanban: rollback otimista se o `update` falhar.

## Detalhes técnicos

```text
Novos arquivos
  src/components/ui/confirm-dialog.tsx   (AlertDialog wrapper + hook useConfirm)
  src/components/ErrorBoundary.tsx       (class component + reset)
  src/components/PageSkeleton.tsx        (skeleton genérico p/ listas)
  src/components/EmptyState.tsx
  src/lib/format.ts                      (formatDate/Score/Percent/pluralize)
  src/lib/schemas.ts                     (todos os schemas Zod)

Arquivos alterados
  src/App.tsx                  + ErrorBoundary
  src/contexts/AuthContext.tsx  fetchRoles aguardado
  src/pages/ExportPdti.tsx     downloadPdf via fetch + blob size check
  src/pages/Evaluate.tsx       upsert em vez de delete+insert
  src/pages/Report.tsx         maybeSingle + estado "não encontrado"
  src/pages/Dashboard.tsx      tratamento de erro + skeleton
  Companies, Questions, Risks, Kpis, ActionPlans, Raci, Assessments
       confirm dialog, skeleton, empty state, Zod, refetch padronizado
```

## Fora de escopo (para próximo ciclo, se desejar)
- Foreign keys + ON DELETE CASCADE em todas as tabelas (migration separada).
- Testes automatizados dos fluxos críticos.
- Refatoração estrutural com React Query (hoje só `QueryClientProvider` configurado, mas o app usa `useEffect+useState` em todo lugar).
- i18n e dark/light toggle.

## Critério de aceite

- Nenhum `window.confirm()` no código.
- Nenhuma tela branca após erro de query, render ou rota.
- PDF do PDTI baixa corretamente (>1 KB) ou mostra log de erro.
- Todos os formulários rejeitam dados inválidos antes de chamar Supabase, com mensagem inline em pt-BR.
- Finalizar avaliação não pode resultar em perda de respostas.
