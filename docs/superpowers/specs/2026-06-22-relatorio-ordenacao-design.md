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
| Conteúdo | Só "Em falta" + "Feito com observação" | Itens limpos não aparecem — o relatório é um documento de qualidade, não de progresso |
| Label segunda secção | "Feito com observação" | Mais claro que "Com registo" — qualquer operário percebe que está marcado mas há algo a verificar |
| Fotos | Aparecem em qualquer item que as tenha | Inclui itens em falta com fotos (ex: foto do defeito antes de estar resolvido) |
| Divisões sem ocorrências | Omitidas | Reduz ruído; o patrão vê só o que precisa de atenção |
| Ordem das divisões | `divisoes.ordem` já na BD, sem migration | Os valores já estão corretos por AP; queried com `.order('ordem')` |
| Ordem dos itens | `sortElementos` client-side | Consistente com mobile; sem mudança de schema |
| Lightbox | Custom, sem biblioteca | Consistente com mobile; zero dependências novas |
| Botões | Só em `/apartamentos/[id]` | Onde o utilizador já está no contexto do AP |
| Auth | Middleware existente | Relatório atrás de login, sem link partilhável |
| Sumário IA | Fora de scope (por agora) | Adicionável depois com Claude Haiku; custo < €0.01/relatório |

---

## 3. Lógica do relatório

### Filtro de itens

```typescript
// Mostrar no relatório:
const relevantes = elementos.filter(el =>
  !el.concluido ||                                    // em falta
  el.notas !== null ||                                // concluído com nota direta
  (el.item_evidencias?.length ?? 0) > 0              // qualquer item com fotos/registo
)
// Itens concluídos sem notas nem fotos → não aparecem
```

Nota: itens **em falta com fotos** também aparecem — alguém fotografou o defeito antes de o resolver.

### Agrupamento por divisão

Agrupar por `divisao_id`, ordenar por `divisoes.ordem`. Omitir divisões onde `relevantes` fica vazio após filtro.

Dentro de cada divisão, duas secções em ordem fixa:
1. **Em falta** — `concluido === false` — ícone vazio ☐ vermelho
2. **Feito com observação** — `concluido === true && (notas || evidencias.length > 0)` — ícone ✓ verde

Cada item mostra, por ordem:
- Linha principal: ícone + `elemento › sub_elemento`
- Nota (se existir): faixa amarela à esquerda com o texto
- Fotos (se existirem): grelha de miniaturas 72×72px, clicáveis para lightbox

### Query Supabase

```typescript
// Elementos do AP com evidências e última modificação
const [elementosResult, lastModResult] = await Promise.all([
  supabase.from('elementos')
    .select(`
      id, elemento, sub_elemento, concluido, concluido_em, notas,
      fase_id, divisao_id, updated_at,
      fases(nome, cor_hex),
      divisoes(id, nome, ordem),
      item_evidencias(
        id, texto, criado_em,
        evidencia_fotos(id, url_publica)
      )
    `)
    .eq('apartamento_id', apId),

  supabase.from('elementos')
    .select('updated_at')
    .eq('apartamento_id', apId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single(),
])
```

---

## 4. Header do relatório

```
AP3 — Cabanas
Gerado em 22 de junho de 2026 · Última alteração na checklist: 19 de junho de 2026
[7 em falta]  [3 feitos com observação]           [Voltar]  [Exportar PDF]
```

- **Data de geração**: `new Date()` no momento do render do Server Component
- **Última alteração**: `MAX(updated_at)` dos elementos do AP (apanha checks, unchecks, notas)
- **Stats**: contagem total de "em falta" e "feitos com observação" em todas as divisões

---

## 5. Ordenação de itens (`sortElementos`)

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

## 6. Estrutura de ficheiros novos

```
obra-cabanas-app/src/app/(app)/relatorio/
  page.tsx                          — Server Component: fetch + render
  _components/
    relatorio-header.tsx            — nome AP, datas, stats, botões Voltar + Exportar PDF
    relatorio-divisao.tsx           — secção por divisão: Em falta + Feito com observação
    foto-grid.tsx                   — miniaturas 72×72 clicáveis (client component)
    lightbox.tsx                    — overlay custom: Escape fecha, clique fora fecha (client)
    print-trigger.tsx               — lê ?print=1, chama window.print() no mount (client)
```

**Ficheiros modificados:**

| Ficheiro | Alteração |
|---|---|
| `src/lib/utils.ts` | Adicionar `sortElementos` |
| `src/app/(app)/apartamentos/[id]/page.tsx` | Aplicar `sortElementos`; adicionar botões "Ver Relatório" + "Exportar PDF" |
| `src/app/(app)/checklist/page.tsx` | Aplicar `sortElementos` |

---

## 7. Botões na página do apartamento

Em `apartamentos/[id]/page.tsx`, junto ao cabeçalho do AP (shadcn `Button` com `asChild`):

```tsx
<Button variant="outline" asChild>
  <a href={`/relatorio?ap=${ap.id}`} target="_blank">Ver Relatório</a>
</Button>
<Button asChild>
  <a href={`/relatorio?ap=${ap.id}&print=1`} target="_blank">Exportar PDF</a>
</Button>
```

---

## 8. Modo impressão (`@media print`)

- Botões "Voltar" e "Exportar PDF" ocultos
- Lightbox overlay oculto
- Fundo branco, sem sombras
- `break-inside: avoid` em cada secção de divisão
- Fotos incluídas automaticamente (browser trata do fetch das imagens)

---

## 9. O que está fora de scope

- Scope "obra" ou "divisão" — só por apartamento
- Sumário gerado por IA — adicionável depois com Claude Haiku
- Partilha de relatório sem login (link público)
- Geração automática de PDF no servidor (`react-pdf`, Puppeteer)
- Adição/gestão de itens de checklist — spec separado (`prompt_gestao_itens.md`)
- Alterações de schema na BD

---

## 10. Ordem de implementação

1. Adicionar `sortElementos` a `utils.ts`; aplicar em `apartamentos/[id]/page.tsx` e `checklist/page.tsx`
2. Criar `relatorio/page.tsx` com fetch de dados (elementos + lastMod) e estrutura de dados
3. Criar `relatorio-header.tsx` — datas, stats, botões
4. Criar `relatorio-divisao.tsx` — dois grupos por divisão, layout de item com nota + fotos
5. Criar `foto-grid.tsx` + `lightbox.tsx` (client components)
6. Criar `print-trigger.tsx`; adicionar `@media print` styles
7. Adicionar botões "Ver Relatório" + "Exportar PDF" em `apartamentos/[id]/page.tsx`
8. Testar AP real com mix de: itens em falta, em falta com fotos, feitos com nota, feitos com fotos, feitos limpos
9. Testar modo impressão (Ctrl+P → Guardar como PDF)
