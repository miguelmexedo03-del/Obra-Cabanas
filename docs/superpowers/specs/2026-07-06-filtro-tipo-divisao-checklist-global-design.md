# Design: filtro "Tipo de Divisão" na Checklist global (desktop + mobile)

Data: 2026-07-06

## Contexto / Motivação

A feature "Consulta cruzada por tipo de divisão" (`/relatorio/consulta`, já implementada)
adicionou a capacidade de filtrar por categoria de compartimento (WC, Suite, Quarto,
etc.) em todos os apartamentos. O Miguel quer o mesmo tipo de filtro disponível no
dia-a-dia da Checklist global — não só num relatório formal — para conseguir ver, por
exemplo, "todas as WC de todos os apartamentos" ou "todas as suites/quartos"
diretamente na lista de trabalho normal.

## Âmbito

- **Só a Checklist global** (`/checklist` na desktop, `/checklist` na mobile) — não a
  página de apartamento individual (`/apartamentos/[id]`), onde o filtro "Divisão"
  existente já mostra as divisões reais desse AP especificamente.
- **Desktop e mobile**, já que ambas têm uma Checklist global equivalente.

## Categorização

Reaproveita integralmente o que já existe:
- Desktop: `TIPOS_DIVISAO` e `tipoDivisao()`, já em `obra-cabanas-app/src/lib/utils.ts`.
- Mobile: **duplica** a mesma constante e função em `cabanas-mobile/src/lib/utils.ts`.
  A mobile não importa código da desktop (repos separados, só partilham a BD — ver
  `cabanas-mobile/CLAUDE.md` regra de ouro #1), pelo mesmo motivo que já duplica
  `sortElementos`/`divisaoSortPriority` hoje.

Nenhuma categoria nova é criada — reutiliza exatamente as 11 categorias já validadas:
Entrada, Sala, Cozinha, Suite Principal, Suite 1, Suite 2, Outra Suite, Quarto, WC,
Closet, Varanda.

## UI

Novo dropdown "Tipo de Divisão" em ambos os componentes de filtro
(`checklist-filters.tsx` na desktop, `mobile-filters.tsx` na mobile), posicionado
entre "Fase" e "Divisão". Ao contrário do filtro "Divisão" (só aparece quando um AP
específico está selecionado), o "Tipo de Divisão" está **sempre visível**, porque
funciona across todos os apartamentos — é essa a razão de ser do filtro.

Parâmetro de URL: `?tipo=WC` (mesmo nome usado na Consulta, para consistência).

**Mudança de tipo necessária nos componentes de filtro:** `FilterOption`/`Option`
(desktop/mobile respetivamente) atualmente tipam `id` como `number` (para
apartamentos, fases, divisões — todos IDs numéricos da BD). O tipo de divisão é uma
categoria de texto (`'WC'`, `'Sala'`, etc.), sem ID numérico próprio. Alarga o tipo
para `id: number | string` nos dois ficheiros — mudança mínima, não quebra nenhum
uso existente (todos os IDs numéricos continuam válidos).

## Lógica de filtragem

Aplicada em memória, depois de os elementos serem devolvidos pela query Supabase —
no mesmo sítio onde já se aplica `sortElementos` (a BD não tem uma coluna
"tipo_divisao", por isso não dá para filtrar isso diretamente na query SQL).

```typescript
const elementosFiltrados = tipoParam
  ? elementos.filter(el => el.divisoes && tipoDivisao(el.divisoes.nome) === tipoParam)
  : elementos
```

Combina com os restantes filtros (AP, Fase, Divisão, Estado, pesquisa) por AND — sem
regras especiais de exclusão mútua. Se o utilizador escolher uma Divisão específica
E um Tipo incompatível (ex: Divisão = "Sala" + Tipo = "WC"), o resultado é
simplesmente uma lista vazia, tal como já acontece hoje com outras combinações de
filtros contraditórias.

## Ficheiros a alterar

| Ficheiro | Mudança |
|---|---|
| `obra-cabanas-app/src/components/checklist/checklist-filters.tsx` | Novo `Select` "Tipo de Divisão"; `FilterOption.id` passa a `number \| string` |
| `obra-cabanas-app/src/app/(app)/checklist/page.tsx` | Lê `params.tipo`, filtra `elementos` antes de agrupar por divisão |
| `cabanas-mobile/src/lib/utils.ts` | Adicionar `TIPOS_DIVISAO`/`tipoDivisao` (cópia exata da desktop) |
| `cabanas-mobile/src/components/mobile-filters.tsx` | Novo dropdown "Tipo de Divisão"; `Option.id` passa a `number \| string` |
| `cabanas-mobile/src/app/(app)/checklist/page.tsx` | Lê `params.tipo`, filtra `elementos` antes de agrupar |

## Fora de âmbito

- Página de apartamento individual (`/apartamentos/[id]`) em qualquer das apps.
- Qualquer nova categoria de divisão além das 11 já existentes.
- Alterações à Consulta cruzada (`/relatorio/consulta`) — já implementada e não
  tocada por esta spec.
