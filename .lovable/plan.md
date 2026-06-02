## 1. Corrigir bug das linhas divisórias na capa (LaTeX)

**Causa:** em `src/lib/pdti-export.ts` (linhas 504 e 508), `\vspace{...}\rule{...}` aparecem sem `\par` separando, então o `\rule` é tratado como conteúdo inline da linha anterior — em `\centering` isso quebra o alinhamento e faz a régua "escapar" da centralização (aparece deslocada/duplicada visualmente quando combinada com o `\vspace` seguinte).

**Correção:** isolar cada régua em seu próprio parágrafo, no padrão:

```
\vspace{1cm}\par
{\centering\rule{0.6\textwidth}{1.5pt}\par}
\vspace{1cm}
```

Aplicar nas duas réguas (1.5pt e 0.4pt). Sem outras mudanças no resto do template.

## 2. Exportação PDF compilando o .tex

Compilar LaTeX no navegador é inviável (binário enorme). Solução: **edge function** que envia o `.tex` para um serviço público de compilação e devolve o PDF binário.

### Backend
- Nova edge function `compile-latex` (verify_jwt = false; chamada autenticada via supabase client):
  - Recebe `{ tex: string, filename?: string }` no body.
  - Faz POST para `https://texlive.net/cgi-bin/latexcgi` (serviço gratuito mantido pela TUG, suporta `pdflatex`/`xelatex` com pacotes do TeX Live completo — `geometry`, `fancyhdr`, `booktabs`, `longtable`, `titlesec`, `hyperref` já incluídos).
  - Retorna o PDF como `application/pdf` (passthrough do binário, com `Content-Disposition: attachment`).
  - Em caso de erro de compilação, retorna `{ error, log }` em JSON com status 422 para o frontend exibir o log de erro do LaTeX.
- Fallback: se `texlive.net` falhar (timeout/5xx), tentar `https://latexonline.cc/compile` com mesmo payload. Ambos são gratuitos e não exigem chave.

### Frontend (`ExportPdti.tsx`)
- Novo botão **"Baixar PDF (compilado)"** ao lado de "Copiar LaTeX" / "Baixar .tex".
- Desabilitado pelo Quality Gate (mesma regra dos outros botões).
- Ao clicar:
  1. Mostra `toast.loading("Compilando PDF…")`.
  2. `supabase.functions.invoke('compile-latex', { body: { tex: latex, filename: ... } })`.
  3. Se sucesso: cria blob, faz download `PDTI_<empresa>.pdf`, toast de sucesso.
  4. Se erro: toast de erro com primeira linha do log do LaTeX e botão "Ver log" que abre um `<Dialog>` com o log completo (útil para debug).

### Observações
- Não mexer em `client.ts`, `types.ts` ou `.env`.
- Nada de novas dependências npm — usar `fetch` nativo no edge function.
- A função fica stateless e sem dados sensíveis (só recebe o .tex já gerado no cliente).

## Arquivos

**Novos**
- `supabase/functions/compile-latex/index.ts`

**Editados**
- `src/lib/pdti-export.ts` — corrigir réguas da capa (linhas 504 e 508).
- `src/pages/ExportPdti.tsx` — botão "Baixar PDF (compilado)" + diálogo de log de erro.
- `supabase/config.toml` — registrar a função com `verify_jwt = false`.

## Aceitação

1. Capa do PDF gerado mostra duas linhas divisórias centralizadas, sem deslocamento ou sobreposição.
2. Botão "Baixar PDF" gera e baixa um PDF compilado idêntico em estilo ao `.tex`.
3. Se o LaTeX tiver erro de compilação, aparece toast de erro com opção de ver o log completo.
