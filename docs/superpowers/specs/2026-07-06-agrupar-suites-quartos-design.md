# Design: agrupar Suites/Quartos numa só categoria de tipo de divisão

Data: 2026-07-06

## Contexto / Motivação

O filtro "Tipo de Divisão" (Checklist global, desktop + mobile) e a Consulta cruzada
(`/relatorio/consulta`, desktop) têm hoje 5 categorias separadas para
compartimentos-tipo-quarto: Suite Principal, Suite 1, Suite 2, Outra Suite, Quarto.
O Miguel pediu para as agrupar numa categoria única — no dia-a-dia não interessa
distinguir qual suite/quarto específico, só "isto é um quarto/suite" vs. "isto é
uma WC" vs. "isto é a sala".

## Mudança

`TIPOS_DIVISAO` passa de 11 para 7 categorias:

Antes: Entrada, Sala, Cozinha, Suite Principal, Suite 1, Suite 2, Outra Suite,
Quarto, WC, Closet, Varanda

Depois: Entrada, Sala, Cozinha, **Suites/Quartos**, WC, Closet, Varanda

`tipoDivisao()` simplifica: as 5 verificações antigas (`suite principal`,
`suite 1`, `suite 2`, `quarto`, catch-all `Outra Suite`) colapsam numa única
condição — qualquer nome que comece por "suite" ou "quarto" (depois de
normalizado) devolve `'Suites/Quartos'`.

## Âmbito

Aplica-se **às duas apps** (desktop + mobile) e **aos dois consumidores** desta
categorização — Checklist global e Consulta cruzada — porque ambos partilham a
mesma função/constante. Não é preciso tocar em mais nenhum ficheiro além de
`utils.ts` em cada app: `ChecklistFilters`, `MobileFilters`, `ConsultaFilters` e a
página/rota de export da Consulta já leem `TIPOS_DIVISAO` dinamicamente, por isso
a lista mais curta propaga-se sozinha.

**Não muda:** `divisaoSortPriority` — é a função que ordena as divisões dentro de
um apartamento (Sala → Suite Principal → WC Suite Principal → Suite 1 → ... →
Varanda), um problema diferente da categorização do filtro. Fica exatamente como
está.

## Ficheiros a alterar (2)

| Ficheiro | Mudança |
|---|---|
| `obra-cabanas-app/src/lib/utils.ts` | `TIPOS_DIVISAO` (7 categorias) + `tipoDivisao()` simplificado |
| `cabanas-mobile/src/lib/utils.ts` | Mesma mudança, cópia exata (repos separados, não partilham código) |

## Comportamento resultante na Consulta cruzada

Ao escolher Tipo = "Suites/Quartos" na Consulta, o resultado mostra uma linha por
(apartamento, divisão) tal como hoje — mas agora inclui todas as suites e quartos
de cada apartamento na mesma consulta, com o nome real de cada divisão (ex: "Suite
1 em frente", "Quarto em frente") na coluna Divisão. Não há mudança na lógica de
agregação (`buildResultado`) — só muda que mais divisões passam no filtro de tipo.

## Fora de âmbito

- Qualquer alteração a `divisaoSortPriority` (ordenação física dentro do AP)
- Qualquer alteração às páginas/componentes que consomem `TIPOS_DIVISAO`
  (`checklist-filters.tsx`, `mobile-filters.tsx`, `consulta-filters.tsx`,
  `page.tsx`/`route.ts` da Consulta) — já leem a constante dinamicamente
