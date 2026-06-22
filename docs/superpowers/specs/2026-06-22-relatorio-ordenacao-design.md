# Spec — Relatório por Apartamento + Ordenação de Itens

**Data:** 2026-06-22  
**Apps afetadas:** `obra-cabanas-app` (desktop) + `cabanas-mobile` (ordenação)  
**Estado:** aprovado, pronto para plano de implementação

---

## 1. Problema

A app desktop não tem forma de gerar um relatório focado por apartamento. O patrão precisa de abrir um documento que mostre exatamente o que está em falta e o que foi feito mas tem uma ocorrência registada (nota ou foto) — sem ver os 3748 itens da checklist.

Adicionalmente, os itens de checklist dentro de cada divisão aparecem em ordem de inserção (arbitrária) tanto na desktop como na mobile. A ordenação correta segue a sequência construtiva: Teto → Paredes → Chão → Rodapé, com sub_elementos em ordem Primário → Extracoat → 1ª demão → 2ª demão.

---

## 2. Decisões de design

| Decisão | Escolha | Razão |
|---|---|---|
| Formato PDF | `window.print()` + `@media print` | Zero infraestrutura extra; sem dependências novas; qualidade suficiente para uso interno |
| Scope do relatório | Por apartamento apenas | Um relatório geral de 24 APs é demasiado para o uso real; o patrão consulta AP a AP |
| URL | `/relatorio?ap={id}` | Simples, sem parâmetro de scope |
| Modo impressão | `/relatorio?ap={id}&print=1` | `PrintTrigger` client component chama `window.print()` no mount |
| Conteúdo | Só "Em falta" + "Concluído com ocorrência" | Itens limpos não aparecem — o relatório é um documento de qualidade, não de progresso |
| Divisões sem ocorrências | Omitidas | Reduz ruído; o patrão vê só o que precisa de atenção |
| Ordem das divisões | `divisoes.ordem` já na BD, sem migration | Os valores já estão corretos por AP; queried com `.order('ordem')` |
| Ordem dos itens | `sortElementos` client-side | Consistente com mobile; sem mudança de schema |
| Lightbox | Custom, sem biblioteca | Consistente com mobile; zero dependências novas |
| Botões | Só em `/apartamentos/[id]` | Onde o utilizador já está no contexto do AP |
| Auth | Middleware existente | Relatório atrás de login, sem link partilhável |

---

## 3. Lógica do relatório

### Filtro de itens

```typescript
// Mostrar no relatório:
const relevantes = elementos.filter(el =>
  !el.concluido ||                          // em falta
  el.notas !== null ||                      // concluído com nota direta
  (el.item_evidencias?.length ?? 0) > 0    // concluído com fotos/registo
)
// Itens concluídos sem notas nem fotos → não aparecem
```

### Agrupamento

Agrupar por `divisao_id`, ordenar grupos por `divisoes.ordem`. Omitir grupos onde `relevantes` está vazio após o filtro.

Dentro de cada grupo, duas secções:
- **Em falta** — `concluido === false`
- **Com registo** — `concluido === true && (notas || evidencias.length > 0)`

### Query Supabase

```typescript
supabase.from('elementos')
  .select(`
    id, elemento, sub_elemento, concluido, concluido_em, notas,
    fase_id, divisao_id,
    fases(nome, cor_hex),
    divisoes(id, nome, ordem),
    item_evidencias(
      id, texto, criado_em,
      evidencia_fotos(id, url_publica)
    )
  `)
  .eq('apartamento_id', apId)
```

---

## 4. Ordenação de itens (`sortElementos`)

Função utilitária a adicionar a `src/lib/utils.ts` (mesma lógica já existente na `cabanas-mobile/src/lib/utils.ts`):

```typescript
const ELEMENTO_ORDER: Record<string, number> = {
  Teto: 0, Paredes: 1, Chão: 2, Rodapé: 3,
}
const SUB_ELEMENTO_ORDER: Record<string, number> = {
  Primário: 10, Extracoat: 20, '1ª demão': 30, '2ª demão': 40,
}

export function sortElementos<T extends {
  elemento: string; fase_id: number; sub_elemento: string | null
}>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const eA = ELEMENTO_ORDER[a.elemento] ?? 99
    const eB = ELEMENTO_ORDER[b.elemento] ?? 99
    if (eA !== eB) return eA - eB
    if (a.fase_id !== b.fase_id) return a.fase_id - b.fase_id
    const sA = a.sub_elemento === null ? 0 : (SUB_ELEMENTO_ORDER[a.sub_elemento] ?? 50)
    const sB = b.sub_elemento === null ? 0 : (SUB_ELEMENTO_ORDER[b.sub_elemento] ?? 50)
    if (sA !== sB) return sA - sB
    return (a.sub_elemento ?? '').localeCompare(b.sub_elemento ?? '', 'pt')
  })
}
```

**Aplicado em:**
1. `obra-cabanas-app/src/app/(app)/apartamentos/[id]/page.tsx`
2. `obra-cabanas-app/src/app/(app)/checklist/page.tsx`
3. `obra-cabanas-app/src/app/(app)/relatorio/page.tsx` (novo)
4. `cabanas-mobile/src/lib/utils.ts` — já existe, sem alteração

---

## 5. Estrutura de ficheiros novos

```
obra-cabanas-app/src/app/(app)/relatorio/
  page.tsx                          — Server Component: fetch + render
  _components/
    relatorio-header.tsx            — nome AP, data geração, stats, botões
    relatorio-divisao.tsx           — secção por divisão (Em falta + Com registo)
    foto-grid.tsx                   — grelha de miniaturas 3 colunas (client)
    lightbox.tsx                    — overlay custom: teclado Escape, setas, clique fora (client)
    print-trigger.tsx               — lê ?print=1, chama window.print() no mount (client)
```

**Ficheiros modificados:**

| Ficheiro | Alteração |
|---|---|
| `src/lib/utils.ts` | Adicionar `sortElementos` |
| `src/app/(app)/apartamentos/[id]/page.tsx` | Aplicar `sortElementos`; adicionar botões "Ver Relatório" + "Exportar PDF" |
| `src/app/(app)/checklist/page.tsx` | Aplicar `sortElementos` |

---

## 6. Layout visual do relatório

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 AP3 — Cabanas          22/06/2026
 4 em falta · 2 com registo        [Voltar]  [Exportar PDF]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SALA
────────────────────────────────
Em falta (2)
  • Teto › Extracoat
  • Paredes › 2ª demão

Com registo (1)
  ✓ Teto › Primário
    "Fissura no canto esquerdo"
    [📷] [📷]

WC SUITE 1
────────────────────────────────
Em falta (1)
  • Sanita
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Modo impressão (`@media print`):**
- Botões ocultos (`hidden print:hidden`)
- Lightbox overlay oculto
- Fotos: grelha fixa 3 colunas, max-height por foto
- `break-inside: avoid` em cada secção de divisão
- `break-before: page` entre divisões se necessário

---

## 7. Botões na página do apartamento

Em `apartamentos/[id]/page.tsx`, junto ao cabeçalho do AP:

```tsx
<a href={`/relatorio?ap=${ap.id}`} target="_blank">
  Ver Relatório
</a>
<a href={`/relatorio?ap=${ap.id}&print=1`} target="_blank">
  Exportar PDF
</a>
```

---

## 8. O que está fora de scope

- Scope "obra" ou "divisão" — só por apartamento
- Partilha de relatório sem login (link público)
- Geração automática de PDF no servidor (`react-pdf`, Puppeteer)
- Adição/gestão de itens de checklist — spec separado (`prompt_gestao_itens.md`)
- Alterações de schema na BD

---

## 9. Ordem de implementação

1. Adicionar `sortElementos` a `utils.ts` e aplicar nas duas páginas existentes de checklist
2. Criar `relatorio/page.tsx` com fetch de dados e estrutura
3. Criar `relatorio-header.tsx` e `relatorio-divisao.tsx` com layout base
4. Criar `foto-grid.tsx` e `lightbox.tsx` (client components)
5. Criar `print-trigger.tsx` e testar `@media print`
6. Adicionar botões "Ver Relatório" + "Exportar PDF" em `apartamentos/[id]/page.tsx`
7. Testar AP com mix de itens em falta + com registo + limpos
8. Testar modo impressão (Ctrl+P → Guardar como PDF)
