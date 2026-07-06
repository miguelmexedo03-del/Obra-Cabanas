# Design: consulta cruzada por tipo de divisão + fix apagar evidências (mobile)

Data: 2026-07-06

## Contexto / Motivação

Miguel recebeu um pedido do tipo "preciso de uma lista das casas de banho que já têm os
tetos pintados" e não conseguiu responder — os filtros da checklist atual são sempre
por apartamento (a lista de divisões só aparece quando um AP específico está
selecionado), não existe forma de perguntar "todas as WC, de todos os apartamentos,
com uma fase concluída".

Ao mesmo tempo, reportou que o botão "Apagar registo" das evidências (fotos/observações)
na app mobile parece funcionar (o item desaparece) mas reaparece mais tarde.

Investigação confirmou duas causas distintas, tratadas como dois problemas
independentes neste documento.

## Problema 1 — Apagar evidências na mobile falha silenciosamente

### Causa raiz

A Server Action `apagarEvidencia` (`cabanas-mobile/src/app/actions/evidencias.ts`) e a
UI (`evidencias-sheet.tsx`, função `handleApagar`) já estão implementadas e ligadas
corretamente. O problema é que a migration `0009_item_evidencias.sql` só criou
políticas RLS de `SELECT` e `INSERT` para `item_evidencias`, `evidencia_fotos` e para
`storage.objects` do bucket `evidencias` — nunca `DELETE`.

Por defeito, o Postgres RLS nega qualquer operação sem política explícita, mas fá-lo
**silenciosamente** para `DELETE` (a query "sucede" e afeta 0 linhas, sem lançar erro).
Por isso a Server Action recebe `{ success: true }`, o item some da lista local
(otimista), mas nunca foi de facto apagado na BD — reaparece no próximo carregamento.

### Fix

Nova migration `0010_evidencias_delete_policies.sql` no repo `obra-cabanas-app`
(fonte canónica de schema, per CLAUDE.md), a adicionar 3 políticas de `DELETE` para
qualquer utilizador autenticado (decisão confirmada com o Miguel — consistente com o
resto da app, onde `user` já edita tudo):

```sql
CREATE POLICY "autenticados podem apagar evidencias" ON item_evidencias
  FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "autenticados podem apagar fotos" ON evidencia_fotos
  FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "autenticados podem apagar evidencias storage" ON storage.objects
  FOR DELETE USING (bucket_id = 'evidencias' AND auth.role() = 'authenticated');
```

Não há alterações de código necessárias — a Server Action e a UI já existem e estão
corretas. `evidencia_fotos` tem `ON DELETE CASCADE` a partir de `item_evidencias`, por
isso apagar a evidência já limpa as fotos associadas na BD; a política extra em
`evidencia_fotos` é defensiva, para o caso de precisarmos de apagar só uma foto sem
apagar a evidência completa no futuro.

**Nota:** é uma migration em produção (BD partilhada pelas duas apps) — só aplicar
depois de confirmação explícita antes de correr `apply_migration`.

## Problema 2 — Consulta cruzada por tipo de divisão

### Âmbito

**Desktop only.** A mobile mantém-se deliberadamente simples (CLAUDE.md da mobile,
regra de ouro #2) — esta é uma funcionalidade de consulta/relatório, fora do âmbito
das 3 tabs da mobile.

### Categorização de divisões

Nova função `tipoDivisao(nome: string): string` em `obra-cabanas-app/src/lib/utils.ts`,
mais grosseira que `normalizarNome` (usada em `/gerir-itens`, que distingue "WC Suite 1"
de "WC Suite 2"). Aqui o objetivo é agrupar por **tipo de compartimento**, não por
divisão exata, para responder a perguntas do tipo "todas as WC":

- `Entrada`
- `Sala`
- `Cozinha`
- `Suite Principal` (só o quarto, sem WC/closet)
- `Suite 1` (idem)
- `Suite 2` (idem)
- `Outra Suite` (variantes como "Suite á direita (escritório)")
- `Quarto`
- `WC` — engloba TODAS as variantes de casa de banho, independentemente da suite/quarto
  associado (WC Suite 1, WC Suite 2, WC Suite Principal, WC de Serviço, WC solto)
- `Closet`
- `Varanda`

Reutiliza a mesma normalização de string já usada em `divisaoSortPriority`
(lowercase → NFD → strip diacríticos → trim).

### Nova página `/relatorio/consulta`

Server Component com um query builder client-side (3 selects, via searchParams, para
suportar deep-link e voltar atrás no browser — convenção já usada nos outros filtros
da app):

1. **Tipo de Divisão** — dropdown com as categorias acima
2. **Fase** — dropdown com as 11 fases existentes
3. **Estado** — Completo / Incompleto / Todos (default: Completo)

### Query e agregação

Busca todos os `elementos` (das 24 APs) cujo `fase_id` corresponde à fase escolhida e
cuja `divisoes.nome` normalizado cai na categoria escolhida. Agrega por
`(apartamento_id, divisao_id)`:

- `total` = nº de elementos dessa fase, nessa divisão
- `concluidos` = nº de `concluido = true`
- `estado` = `"Completo"` se `concluidos === total && total > 0`, senão `"Incompleto"`

Filtra as linhas do resultado conforme o select "Estado" (Completo/Incompleto/Todos).

### Tabela de resultado

Colunas: **Apartamento | Divisão | Concluídos/Total | Estado**

Ordenação: `apartamento_id` asc, depois por `divisaoSortPriority` (reutiliza a função
já existente da secção de ordenação de divisões).

### Export

Botão "Exportar" que gera um ficheiro HTML para impressão/PDF, seguindo exatamente o
mesmo padrão do `/relatorio/export` existente (mesmo `PrintTrigger`, mesmo CSS de
impressão `@media print`). Não introduz nova biblioteca nem novo formato (sem CSV) —
mantém consistência com o resto da app.

### Navegação

Novo item na sidebar (`app-sidebar.tsx`) e/ou botão na página `/relatorio` existente,
apontando para `/relatorio/consulta`. Nome sugerido: **"Consulta"**.

## Fora de âmbito (não incluído nesta spec)

- Audit log de quem apagou uma evidência (a app já regista quem *criou*, não quem
  apaga — pode ser pedido separado se vier a ser necessário)
- Restringir o "apagar" só ao criador do registo (decidido explicitamente que não)
- Exportação em CSV/Excel (decidido explicitamente que não, por agora)
- Qualquer alteração à mobile além do fix de RLS (que é só schema, sem código)
