# Relatório Executivo — geração determinística

**Decisão de 2026-07-28:** o relatório deixou de usar LLM (Gemini). O
formato variava de relatório para relatório (o LLM não garantia
consistência) e o free tier do Gemini estava a dar timeout com
frequência. `lib/relatorio/gerar.ts` gera agora o texto sempre pela
mesma estrutura determinística (`lib/relatorio/template.ts`): secções
fixas por tópico (pintura, chão e rodapé, portas e aros, móveis,
pladur e pedra, equipamentos de WC, eletrodomésticos, ar condicionado,
bomba de calor, "a registar", observações), com bullet points por
divisão. Só o conteúdo muda entre apartamentos — nunca a estrutura.

As observações escritas nos itens da checklist (feature "evidências")
entram no relatório; evidências só com fotos, sem texto, são ignoradas.

A página `/relatorio/executivo/config` (instruções avançadas para o
LLM) foi removida — deixou de fazer sentido sem LLM. `lib/llm/` e as
env vars `LLM_PROVIDER`/`LLM_API_KEY`/`LLM_MODEL` no Vercel ficaram
órfãs (podem ser removidas do Vercel, não são lidas por código nenhum).
