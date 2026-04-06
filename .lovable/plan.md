
## Correções e Novas Funcionalidades

### 1. Recuperação de Senha ✅
- Adicionar link "Esqueci minha senha" na tela de login
- Criar página `/reset-password` para definir nova senha
- Usar `supabase.auth.resetPasswordForEmail()` e `updateUser()`

### 2. Corrigir botão "Nova Avaliação" no Dashboard ✅
- O botão aponta para `/assessments/new` que não existe
- Redirecionar para `/assessments` (a página já tem o dialog de nova avaliação)

### 3. Cadastro de Categorias ✅
- Adicionar CRUD de categorias na página de Questões (ou página separada)
- Permitir criar, editar e excluir categorias (somente admin)

### 4. Matriz RACI 🆕
- Nova tabela `raci_entries` no banco (company_id, process, responsible, accountable, consulted, informed)
- Nova página `/raci` com interface de tabela editável
- Vincular à empresa

### 5. Planos de Ação (5W2H) 🆕
- Nova tabela `action_plans` (assessment_id, what, why, where, when, who, how, how_much, status)
- Nova página `/action-plans` vinculada às avaliações
- Gerar planos de ação a partir das recomendações do relatório

### 6. Gestão de Riscos 🆕
- Nova tabela `risks` (company_id, description, probability, impact, mitigation, status)
- Nova página `/risks` com matriz de riscos (probabilidade x impacto)

### 7. KPIs / Indicadores 🆕
- Nova tabela `kpis` (company_id, name, target, current_value, unit)
- Nova página `/kpis` com dashboard de indicadores

### Menus adicionados no sidebar:
- Dashboard | Empresas | Questões | Avaliações | **RACI** | **Planos de Ação** | **Riscos** | **KPIs**

Deseja que eu implemente tudo isso? Ou prefere priorizar alguns itens primeiro?
