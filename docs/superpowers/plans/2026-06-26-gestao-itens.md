# Gestão de Itens de Checklist — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir adicionar itens à checklist individualmente (inline, por divisão) na app desktop e mobile, e em massa via wizard de 3 passos (só desktop).

**Architecture:** Parte 1 extrai o bloco de grupos da página de detalhe de apartamento para um Client Component com `useOptimistic`, adicionando um botão inline no fundo de cada divisão. Parte 2 adiciona uma nova rota `/gerir-itens` com um Server Component que pré-carrega dados e um Client Component wizard. Sem alterações ao schema da BD.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Tailwind CSS, Supabase (`@supabase/ssr`), `sonner` (toasts, só desktop), `lucide-react`

## Global Constraints

- UI em PT-PT. Código em inglês.
- Sem `any` — usar `unknown` + type narrowing.
- Server Actions devolvem `{ success: true, ... } | { success: false, error: string }`. Nunca throw.
- Server Components por defeito; `'use client'` só quando necessário.
- `npm run build` deve passar sem erros antes de cada commit.
- App desktop: `obra-cabanas-app/`. App mobile: `cabanas-mobile/` (projeto separado, mesma BD Supabase).
- Mobile usa Tailwind CSS v4 sem shadcn — UI custom. Desktop usa shadcn/ui.

---

## File Map

### Desktop (`obra-cabanas-app/src/`)

| Ficheiro | Ação |
|---|---|
| `app/actions/checklist.ts` | Editar — + `criarElemento`, `criarElementosBatch` |
| `components/checklist/add-item-inline.tsx` | Criar — botão + input inline |
| `components/checklist/checklist-groups.tsx` | Criar — Client Component com `useOptimistic` |
| `app/(app)/apartamentos/[id]/page.tsx` | Editar — calcular `defaultFaseId`, usar `ChecklistGroups` |
| `components/layout/app-sidebar.tsx` | Editar — + link "Gerir Itens" |
| `app/(app)/apartamentos/page.tsx` | Editar — + botão "Gerir Itens" |
| `app/(app)/gerir-itens/page.tsx` | Criar — Server Component |
| `app/(app)/gerir-itens/_components/gerir-itens-client.tsx` | Criar — wizard 3 passos |

### Mobile (`cabanas-mobile/src/`)

| Ficheiro | Ação |
|---|---|
| `app/actions/checklist.ts` | Editar — + `criarElemento` |
| `app/(app)/apartamentos/[id]/page.tsx` | Editar — + `id`, `defaultFaseId` nos grupos |
| `components/apartamento-checklist.tsx` | Editar — + botão inline |

---

## Task 1: Server Actions — Desktop

**Files:**
- Modify: `obra-cabanas-app/src/app/actions/checklist.ts`

**Interfaces:**
- Produces:
  - `criarElemento(apartamentoId: number, divisaoId: number, faseId: number, nome: string): Promise<{ success: true; id: number } | { success: false; error: string }>`
  - `criarElementosBatch(itens: BatchItem[]): Promise<{ success: true; count: number } | { success: false; error: string }>` onde `BatchItem = { apartamento_id: number; divisao_id: number; fase_id: number; elemento: string }`

- [ ] **Step 1: Adicionar `criarElemento` ao ficheiro**

Abre `obra-cabanas-app/src/app/actions/checklist.ts` e adiciona antes de `toggleElemento`:

```typescript
export async function criarElemento(
  apartamentoId: number,
  divisaoId: number,
  faseId: number,
  nome: string,
): Promise<{ success: true; id: number } | { success: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autenticado.' }

  const trimmed = nome.trim()
  if (!trimmed) return { success: false, error: 'Nome do item é obrigatório.' }

  const { data, error } = await supabase
    .from('elementos')
    .insert({
      apartamento_id: apartamentoId,
      divisao_id: divisaoId,
      fase_id: faseId,
      elemento: trimmed,
      concluido: false,
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath('/', 'layout')
  return { success: true, id: data.id }
}
```

- [ ] **Step 2: Adicionar `criarElementosBatch`**

Logo a seguir a `criarElemento`, adicionar:

```typescript
type BatchItem = {
  apartamento_id: number
  divisao_id: number
  fase_id: number
  elemento: string
}

export async function criarElementosBatch(
  itens: BatchItem[],
): Promise<{ success: true; count: number } | { success: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autenticado.' }
  if (itens.length === 0) return { success: false, error: 'Nenhum item a criar.' }

  const { data, error } = await supabase
    .from('elementos')
    .insert(itens.map(it => ({ ...it, concluido: false })))
    .select('id')

  if (error) return { success: false, error: error.message }

  revalidatePath('/', 'layout')
  return { success: true, count: data.length }
}
```

- [ ] **Step 3: Verificar build**

```bash
cd obra-cabanas-app && npm run build
```
Expected: sem erros TypeScript.

- [ ] **Step 4: Commit**

```bash
git add src/app/actions/checklist.ts
git commit -m "feat: server actions criarElemento e criarElementosBatch"
```

---

## Task 2: Componente `AddItemInline` — Desktop

**Files:**
- Create: `obra-cabanas-app/src/components/checklist/add-item-inline.tsx`

**Interfaces:**
- Consumes: nada externo
- Produces: `AddItemInline({ onAdd: (nome: string) => void })`

- [ ] **Step 1: Criar o ficheiro**

```typescript
'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, Check } from 'lucide-react'

interface Props {
  onAdd: (nome: string) => void
}

export function AddItemInline({ onAdd }: Props) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  function handleSubmit() {
    const trimmed = value.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setValue('')
    setOpen(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); handleSubmit() }
    if (e.key === 'Escape') { setValue(''); setOpen(false) }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-muted-foreground
          hover:text-foreground hover:bg-muted/40 transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        Adicionar item
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-t">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Nome do item..."
        className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
      />
      <button
        onClick={handleSubmit}
        disabled={!value.trim()}
        className="flex-shrink-0 p-1 rounded text-primary hover:bg-primary/10
          disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Confirmar"
      >
        <Check className="h-4 w-4" />
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Verificar build**

```bash
cd obra-cabanas-app && npm run build
```
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/checklist/add-item-inline.tsx
git commit -m "feat: componente AddItemInline com input inline e Escape para cancelar"
```

---

## Task 3: Componente `ChecklistGroups` — Desktop

**Files:**
- Create: `obra-cabanas-app/src/components/checklist/checklist-groups.tsx`

**Interfaces:**
- Consumes:
  - `ChecklistItem` de `./checklist-item`
  - `AddItemInline` de `./add-item-inline`
  - `criarElemento` de `@/app/actions/checklist`
  - `toast` de `sonner`
  - `useRouter` de `next/navigation`
- Produces:
  - `export type ChecklistGroupItem = { id: number; elemento: string; sub_elemento: string | null; concluido: boolean; fase_id: number; divisao_id: number | null }`
  - `export type ChecklistGroupData = { id: number | null; nome: string; faseColor: string; defaultFaseId: number; concluidos: number; items: ChecklistGroupItem[] }`
  - `ChecklistGroups({ initialGroups: ChecklistGroupData[]; apartamentoId: number })`

- [ ] **Step 1: Criar o ficheiro**

```typescript
'use client'

import { useOptimistic, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ChecklistItem } from './checklist-item'
import { AddItemInline } from './add-item-inline'
import { criarElemento } from '@/app/actions/checklist'

export type ChecklistGroupItem = {
  id: number
  elemento: string
  sub_elemento: string | null
  concluido: boolean
  fase_id: number
  divisao_id: number | null
}

export type ChecklistGroupData = {
  id: number | null
  nome: string
  faseColor: string
  defaultFaseId: number
  concluidos: number
  items: ChecklistGroupItem[]
}

interface Props {
  initialGroups: ChecklistGroupData[]
  apartamentoId: number
}

type OptimisticAction = {
  divisaoId: number
  item: ChecklistGroupItem
}

export function ChecklistGroups({ initialGroups, apartamentoId }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [groups, addOptimistic] = useOptimistic(
    initialGroups,
    (state: ChecklistGroupData[], action: OptimisticAction) =>
      state.map(g =>
        g.id === action.divisaoId
          ? { ...g, items: [...g.items, action.item] }
          : g,
      ),
  )

  function handleAdd(divisaoId: number, faseId: number, nome: string) {
    const tempItem: ChecklistGroupItem = {
      id: -Date.now(),
      elemento: nome,
      sub_elemento: null,
      concluido: false,
      fase_id: faseId,
      divisao_id: divisaoId,
    }

    startTransition(async () => {
      addOptimistic({ divisaoId, item: tempItem })
      const result = await criarElemento(apartamentoId, divisaoId, faseId, nome)
      if (result.success) {
        router.refresh()
      } else {
        toast.error('Erro ao criar item', { description: result.error })
      }
    })
  }

  const total = groups.reduce((s, g) => s + g.items.length, 0)

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{total} itens</p>
      {groups.map((group, i) => (
        <div key={group.id ?? i} className="rounded-lg border overflow-hidden">
          <div
            className="px-4 py-2.5 flex items-center gap-2 border-b bg-muted/30"
            style={{ borderLeftColor: group.faseColor, borderLeftWidth: '3px' }}
          >
            <span className="text-sm font-medium flex-1 truncate">{group.nome}</span>
            <span className="text-xs text-muted-foreground shrink-0">
              {group.concluidos}/{group.items.length}
            </span>
          </div>
          <div className="divide-y">
            {group.items.map(el => (
              <ChecklistItem
                key={el.id}
                id={el.id}
                elemento={el.elemento}
                sub_elemento={el.sub_elemento}
                concluido={el.concluido}
                faseColor={group.faseColor}
              />
            ))}
          </div>
          {group.id !== null && (
            <AddItemInline
              onAdd={nome => handleAdd(group.id!, group.defaultFaseId, nome)}
            />
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Verificar build**

```bash
cd obra-cabanas-app && npm run build
```
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/checklist/checklist-groups.tsx
git commit -m "feat: ChecklistGroups com useOptimistic para adição inline de itens"
```

---

## Task 4: Refactor `apartamentos/[id]/page.tsx` — Desktop

**Files:**
- Modify: `obra-cabanas-app/src/app/(app)/apartamentos/[id]/page.tsx`

**Interfaces:**
- Consumes: `ChecklistGroups`, `ChecklistGroupData` de `@/components/checklist/checklist-groups`

- [ ] **Step 1: Adicionar import e helper no topo do ficheiro**

Depois dos imports existentes, adicionar:

```typescript
import { ChecklistGroups } from '@/components/checklist/checklist-groups'
import type { ChecklistGroupData } from '@/components/checklist/checklist-groups'
```

Adicionar a função helper antes de `export default async function`:

```typescript
function getDefaultFaseId(items: RawElemento[]): number {
  if (items.length === 0) return 1
  const counts = new Map<number, number>()
  for (const item of items) {
    counts.set(item.fase_id, (counts.get(item.fase_id) ?? 0) + 1)
  }
  let bestId = items[0].fase_id
  let bestCount = 0
  for (const [faseId, count] of counts) {
    if (count > bestCount) { bestCount = count; bestId = faseId }
  }
  return bestId
}
```

- [ ] **Step 2: Atualizar a construção dos groups**

Substituir:

```typescript
const groups = Array.from(groupMap.values()).map(g => ({
  ...g,
  items: sortElementos(g.items),
}))
```

Por:

```typescript
const groups: ChecklistGroupData[] = Array.from(groupMap.values()).map(g => {
  const sorted = sortElementos(g.items)
  return {
    id: g.id,
    nome: g.nome,
    faseColor: g.faseColor,
    defaultFaseId: getDefaultFaseId(sorted),
    concluidos: g.concluidos,
    items: sorted,
  }
})
```

- [ ] **Step 3: Substituir o bloco de renderização dos grupos**

Substituir o bloco:

```typescript
{groups.length === 0 ? (
  <EmptyState icon={ListChecks} title="Nenhum item encontrado" description="Ajusta os filtros para ver resultados." />
) : (
  <div className="space-y-3">
    <p className="text-xs text-muted-foreground">{totalFiltered} itens</p>
    {groups.map((group, i) => (
      <div key={i} className="rounded-lg border overflow-hidden">
        <div
          className="px-4 py-2.5 flex items-center gap-2 border-b bg-muted/30"
          style={{ borderLeftColor: group.faseColor, borderLeftWidth: '3px' }}
        >
          <span className="text-sm font-medium flex-1 truncate">{group.nome}</span>
          <span className="text-xs text-muted-foreground shrink-0">
            {group.concluidos}/{group.items.length}
          </span>
        </div>
        <div className="divide-y">
          {group.items.map(el => (
            <ChecklistItem
              key={el.id}
              id={el.id}
              elemento={el.elemento}
              sub_elemento={el.sub_elemento}
              concluido={el.concluido}
              faseColor={group.faseColor}
            />
          ))}
        </div>
      </div>
    ))}
  </div>
)}
```

Por:

```typescript
{groups.length === 0 ? (
  <EmptyState icon={ListChecks} title="Nenhum item encontrado" description="Ajusta os filtros para ver resultados." />
) : (
  <ChecklistGroups initialGroups={groups} apartamentoId={apId} />
)}
```

- [ ] **Step 4: Remover imports não usados**

Verificar se `ChecklistItem` ainda é importado no topo. Se sim, remover o import de `ChecklistItem` (agora é usado dentro de `ChecklistGroups`).

- [ ] **Step 5: Verificar build**

```bash
cd obra-cabanas-app && npm run build
```
Expected: sem erros.

- [ ] **Step 6: Teste manual**

Abre `http://localhost:3000/apartamentos/1`. Verifica:
- Cada divisão tem `+ Adicionar item` no fundo
- Clicar abre input; escrever nome + Enter cria item imediatamente
- Escape cancela
- Campo vazio não cria nada
- Após refresh, o item aparece com os dados reais da BD

- [ ] **Step 7: Commit**

```bash
git add src/app/(app)/apartamentos/[id]/page.tsx
git commit -m "feat: adição inline de itens na checklist de apartamento (desktop)"
```

---

## Task 5: Server Action + Inline Add — Mobile

**Files:**
- Modify: `cabanas-mobile/src/app/actions/checklist.ts`
- Modify: `cabanas-mobile/src/app/(app)/apartamentos/[id]/page.tsx`
- Modify: `cabanas-mobile/src/components/apartamento-checklist.tsx`

**Interfaces:**
- Produces: `criarElemento` em `cabanas-mobile/src/app/actions/checklist.ts` (mesma assinatura do desktop)

- [ ] **Step 1: Adicionar `criarElemento` na mobile**

Em `cabanas-mobile/src/app/actions/checklist.ts`, adicionar antes de `toggleElemento`:

```typescript
export async function criarElemento(
  apartamentoId: number,
  divisaoId: number,
  faseId: number,
  nome: string,
): Promise<{ success: true; id: number } | { success: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autenticado.' }

  const trimmed = nome.trim()
  if (!trimmed) return { success: false, error: 'Nome do item é obrigatório.' }

  const { data, error } = await supabase
    .from('elementos')
    .insert({
      apartamento_id: apartamentoId,
      divisao_id: divisaoId,
      fase_id: faseId,
      elemento: trimmed,
      concluido: false,
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }

  return { success: true, id: data.id }
}
```

- [ ] **Step 2: Atualizar o tipo `DivisaoGroup` na página mobile**

Em `cabanas-mobile/src/app/(app)/apartamentos/[id]/page.tsx`, alterar o tipo `DivisaoGroup` de:

```typescript
type DivisaoGroup = {
  nome: string
  faseColor: string
  items: Elemento[]
  concluidos: number
}
```

Para:

```typescript
type DivisaoGroup = {
  id: number
  nome: string
  faseColor: string
  defaultFaseId: number
  items: Elemento[]
  concluidos: number
}
```

- [ ] **Step 3: Adicionar helper `getDefaultFaseId` na página mobile**

Adicionar antes do `export default async function`:

```typescript
function getDefaultFaseId(items: Elemento[]): number {
  if (items.length === 0) return 1
  const counts = new Map<number, number>()
  for (const item of items) {
    counts.set(item.fase_id, (counts.get(item.fase_id) ?? 0) + 1)
  }
  let bestId = items[0].fase_id
  let bestCount = 0
  for (const [faseId, count] of counts) {
    if (count > bestCount) { bestCount = count; bestId = faseId }
  }
  return bestId
}
```

- [ ] **Step 4: Atualizar a construção dos grupos na página mobile**

Substituir:

```typescript
const groupMap = new Map<number, DivisaoGroup>()
for (const el of elementos ?? []) {
  if (el.divisao_id == null) continue
  if (!groupMap.has(el.divisao_id)) {
    groupMap.set(el.divisao_id, {
      nome: el.divisoes?.nome ?? '—',
      faseColor: el.fases?.cor_hex ?? '#9ca3af',
      items: [],
      concluidos: 0,
    })
  }
  const group = groupMap.get(el.divisao_id)!
  group.items.push(el)
  if (el.concluido) group.concluidos++
}
const groups = Array.from(groupMap.values()).map(g => ({
  ...g,
  items: sortElementos(g.items),
}))
```

Por:

```typescript
const groupMap = new Map<number, DivisaoGroup>()
for (const el of elementos ?? []) {
  if (el.divisao_id == null) continue
  if (!groupMap.has(el.divisao_id)) {
    groupMap.set(el.divisao_id, {
      id: el.divisao_id,
      nome: el.divisoes?.nome ?? '—',
      faseColor: el.fases?.cor_hex ?? '#9ca3af',
      defaultFaseId: el.fase_id,
      items: [],
      concluidos: 0,
    })
  }
  const group = groupMap.get(el.divisao_id)!
  group.items.push(el)
  if (el.concluido) group.concluidos++
}
const groups = Array.from(groupMap.values()).map(g => {
  const sorted = sortElementos(g.items)
  return { ...g, items: sorted, defaultFaseId: getDefaultFaseId(sorted) }
})
```

- [ ] **Step 5: Atualizar `ApartamentoChecklist` para receber `apartamentoId`**

Em `cabanas-mobile/src/components/apartamento-checklist.tsx`, atualizar o tipo `DivisaoGroup` e a interface `Props`:

```typescript
type DivisaoGroup = {
  id: number
  nome: string
  faseColor: string
  defaultFaseId: number
  items: Elemento[]
  concluidos: number
}

interface Props {
  groups: DivisaoGroup[]
  evidenciasCountMap: Record<number, number>
  apartamentoId: number
}
```

- [ ] **Step 6: Adicionar lógica de adição inline em `ApartamentoChecklist`**

No topo do componente, adicionar imports e state:

```typescript
import { useRouter } from 'next/navigation'
import { criarElemento } from '@/app/actions/checklist'
```

No corpo do componente, antes do `return`, adicionar:

```typescript
const router = useRouter()
const [openAddId, setOpenAddId] = useState<number | null>(null)
const [addValue, setAddValue] = useState('')
const [addPending, setAddPending] = useState(false)
const [newItems, setNewItems] = useState<Map<number, Elemento[]>>(new Map())

async function handleAdd(divisaoId: number, faseId: number, apartamentoId: number) {
  const trimmed = addValue.trim()
  if (!trimmed) return
  const tempId = -Date.now()
  const tempItem: Elemento = { id: tempId, elemento: trimmed, sub_elemento: null, concluido: false, divisao_id: divisaoId, fase_id: faseId, fases: null, divisoes: null }
  setNewItems(prev => {
    const next = new Map(prev)
    next.set(divisaoId, [...(next.get(divisaoId) ?? []), tempItem])
    return next
  })
  setAddValue('')
  setOpenAddId(null)
  setAddPending(true)
  const result = await criarElemento(apartamentoId, divisaoId, faseId, trimmed)
  setAddPending(false)
  if (result.success) {
    router.refresh()
    setNewItems(new Map())
  } else {
    setNewItems(prev => {
      const next = new Map(prev)
      const items = (next.get(divisaoId) ?? []).filter(i => i.id !== tempId)
      if (items.length === 0) next.delete(divisaoId)
      else next.set(divisaoId, items)
      return next
    })
  }
}
```

- [ ] **Step 7: Atualizar o `return` para passar `apartamentoId` e mostrar o botão inline**

Na prop do componente, passar `apartamentoId`. Dentro de cada `<details>`, após o `div.divide-y` com os itens, adicionar o botão inline e os itens optimistas:

```typescript
export function ApartamentoChecklist({ groups, evidenciasCountMap, apartamentoId }: Props) {
  // ... state declarations above ...

  return (
    <>
      <div className="px-4 py-3 space-y-2">
        {groups.map((group, i) => {
          const extras = newItems.get(group.id) ?? []
          return (
            <details
              key={i}
              className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
              open
            >
              <summary className="flex items-center justify-between px-4 py-3.5 cursor-pointer
                select-none list-none active:bg-gray-50">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: group.faseColor }}
                  />
                  <span className="font-semibold text-gray-900 text-sm">{group.nome}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">
                    {group.concluidos}/{group.items.length + extras.length}
                  </span>
                  <div className={`w-2 h-2 rounded-full ${
                    group.concluidos === group.items.length + extras.length ? 'bg-green-500' :
                    group.concluidos > 0 ? 'bg-amber-400' : 'bg-gray-200'
                  }`} />
                </div>
              </summary>
              <div className="border-t border-gray-50 divide-y divide-gray-50">
                {group.items.map(el => (
                  <ChecklistItem
                    key={el.id}
                    id={el.id}
                    elemento={el.elemento}
                    sub_elemento={el.sub_elemento}
                    concluido={el.concluido}
                    faseColor={group.faseColor}
                    onOpenEvidencias={setOpenItemId}
                    evidenciasCount={evidenciasCountMap[el.id] ?? 0}
                  />
                ))}
                {extras.map(el => (
                  <div key={el.id} className="flex items-center gap-3 px-4 py-3 opacity-60">
                    <div className="w-5 h-5 rounded border-2 border-gray-300 flex-shrink-0" />
                    <span className="text-sm text-gray-900">{el.elemento}</span>
                  </div>
                ))}
              </div>
              {openAddId === group.id ? (
                <div className="flex items-center gap-2 px-4 py-2 border-t border-gray-100">
                  <input
                    autoFocus
                    type="text"
                    value={addValue}
                    onChange={e => setAddValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); handleAdd(group.id, group.defaultFaseId, apartamentoId) }
                      if (e.key === 'Escape') { setAddValue(''); setOpenAddId(null) }
                    }}
                    placeholder="Nome do item..."
                    className="flex-1 text-sm outline-none bg-transparent text-gray-900 placeholder-gray-400"
                    disabled={addPending}
                  />
                  <button
                    onClick={() => handleAdd(group.id, group.defaultFaseId, apartamentoId)}
                    disabled={!addValue.trim() || addPending}
                    className="text-blue-600 text-sm font-medium disabled:opacity-30"
                  >
                    Adicionar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setOpenAddId(group.id); setAddValue('') }}
                  className="flex items-center gap-1.5 w-full px-4 py-2.5 text-sm text-gray-400
                    active:bg-gray-50"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Adicionar item
                </button>
              )}
            </details>
          )
        })}
        {groups.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-12">Nenhum item encontrado.</p>
        )}
      </div>

      <EvidenciasSheet
        elementoId={openItemId}
        onClose={() => setOpenItemId(null)}
      />
    </>
  )
}
```

- [ ] **Step 8: Atualizar o call site em `apartamentos/[id]/page.tsx` da mobile**

Substituir:

```typescript
<ApartamentoChecklist groups={groups} evidenciasCountMap={evidenciasCountMap} />
```

Por:

```typescript
<ApartamentoChecklist groups={groups} evidenciasCountMap={evidenciasCountMap} apartamentoId={apId} />
```

- [ ] **Step 9: Verificar build mobile**

```bash
cd cabanas-mobile && npm run build
```
Expected: sem erros.

- [ ] **Step 10: Commit mobile**

```bash
cd cabanas-mobile
git add src/app/actions/checklist.ts src/components/apartamento-checklist.tsx src/app/(app)/apartamentos/[id]/page.tsx
git commit -m "feat: adição inline de itens na checklist mobile"
```

---

## Task 6: Navigation Links — Desktop

**Files:**
- Modify: `obra-cabanas-app/src/components/layout/app-sidebar.tsx`
- Modify: `obra-cabanas-app/src/app/(app)/apartamentos/page.tsx`

- [ ] **Step 1: Adicionar link na sidebar**

Em `app-sidebar.tsx`, na array `NAV`, adicionar depois de `Checklist`:

```typescript
{ href: '/gerir-itens', label: 'Gerir Itens', icon: PlusSquare },
```

Adicionar `PlusSquare` ao import do `lucide-react`:

```typescript
import {
  LayoutDashboard, Building2, ListChecks, GanttChartSquare,
  KanbanSquare, BarChart3, Users, FileClock, User, BookOpen, PlusSquare, LucideIcon,
} from 'lucide-react'
```

- [ ] **Step 2: Adicionar botão na página de Apartamentos**

Em `apartamentos/page.tsx`, adicionar ao bloco `actions` do `PageHeader`:

```typescript
<Button variant="outline" size="sm" render={<Link href="/gerir-itens" />} nativeButton={false}>
  <PlusSquare className="h-4 w-4" />
  Gerir Itens
</Button>
```

Adicionar `PlusSquare` ao import de `lucide-react` no ficheiro.

- [ ] **Step 3: Verificar build**

```bash
cd obra-cabanas-app && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/app-sidebar.tsx src/app/(app)/apartamentos/page.tsx
git commit -m "feat: links de navegação para Gerir Itens na sidebar e página de Apartamentos"
```

---

## Task 7: Painel Gerir Itens — Desktop

**Files:**
- Create: `obra-cabanas-app/src/app/(app)/gerir-itens/page.tsx`
- Create: `obra-cabanas-app/src/app/(app)/gerir-itens/_components/gerir-itens-client.tsx`

**Interfaces:**
- Consumes: `criarElementosBatch` de `@/app/actions/checklist`
- Types internos:
  ```typescript
  type Fase = { id: number; nome: string }
  type DivisaoItem = { id: number; nome: string; apartamentoId: number; apartamentoCodigo: string }
  type GrupoNormalizado = { key: string; displayName: string; divisoes: DivisaoItem[] }
  ```

- [ ] **Step 1: Criar `gerir-itens/page.tsx`**

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GerirItensClient } from './_components/gerir-itens-client'

type DivisaoRow = {
  id: number
  nome: string
  apartamento_id: number
  apartamentos: { codigo: string } | null
}

function normalizarNome(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/\s+\d+$/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export default async function GerirItensPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [fasesResult, divisoesResult] = await Promise.all([
    supabase.from('fases').select('id, nome').order('ordem'),
    supabase
      .from('divisoes')
      .select('id, nome, apartamento_id, apartamentos(codigo)')
      .order('apartamento_id')
      .order('ordem'),
  ])

  const fases = (fasesResult.data ?? []).map(f => ({ id: f.id, nome: f.nome }))
  const divisoes = (divisoesResult.data ?? []) as DivisaoRow[]

  // Group by normalized name
  const groupMap = new Map<string, { displayName: string; divisoes: { id: number; nome: string; apartamentoId: number; apartamentoCodigo: string }[] }>()
  for (const d of divisoes) {
    const key = normalizarNome(d.nome)
    if (!groupMap.has(key)) {
      groupMap.set(key, { displayName: d.nome, divisoes: [] })
    }
    const g = groupMap.get(key)!
    g.divisoes.push({
      id: d.id,
      nome: d.nome,
      apartamentoId: d.apartamento_id,
      apartamentoCodigo: d.apartamentos?.codigo ?? '—',
    })
  }

  const grupos = Array.from(groupMap.entries())
    .map(([key, g]) => ({ key, displayName: g.displayName, divisoes: g.divisoes }))
    .sort((a, b) => b.divisoes.length - a.divisoes.length)

  return (
    <GerirItensClient fases={fases} grupos={grupos} />
  )
}
```

- [ ] **Step 2: Criar `_components/gerir-itens-client.tsx`**

```typescript
'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ChevronLeft, Check } from 'lucide-react'
import { toast } from 'sonner'
import { criarElementosBatch } from '@/app/actions/checklist'
import { Button } from '@/components/ui/button'

type Fase = { id: number; nome: string }
type DivisaoItem = { id: number; nome: string; apartamentoId: number; apartamentoCodigo: string }
type GrupoNormalizado = { key: string; displayName: string; divisoes: DivisaoItem[] }

interface Props {
  fases: Fase[]
  grupos: GrupoNormalizado[]
}

type Step = 1 | 2 | 3

export function GerirItensClient({ fases, grupos }: Props) {
  const [step, setStep] = useState<Step>(1)
  const [nome, setNome] = useState('')
  const [faseId, setFaseId] = useState<number>(fases[0]?.id ?? 1)
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [isPending, startTransition] = useTransition()
  const [done, setDone] = useState<{ nome: string; count: number } | null>(null)

  function toggleGroup(key: string, divisaoIds: number[]) {
    setSelectedKeys(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
        setSelectedIds(prevIds => {
          const n = new Set(prevIds)
          for (const id of divisaoIds) n.delete(id)
          return n
        })
      } else {
        next.add(key)
        setSelectedIds(prevIds => {
          const n = new Set(prevIds)
          for (const id of divisaoIds) n.add(id)
          return n
        })
      }
      return next
    })
  }

  function toggleDivisao(id: number) {
    setSelectedIds(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  function selectAll() {
    setSelectedKeys(new Set(grupos.map(g => g.key)))
    setSelectedIds(new Set(grupos.flatMap(g => g.divisoes.map(d => d.id))))
  }

  function clearAll() {
    setSelectedKeys(new Set())
    setSelectedIds(new Set())
  }

  function handleConfirm() {
    const allDivisoes = grupos.flatMap(g => g.divisoes)
    const selected = allDivisoes.filter(d => selectedIds.has(d.id))
    const itens = selected.map(d => ({
      apartamento_id: d.apartamentoId,
      divisao_id: d.id,
      fase_id: faseId,
      elemento: nome.trim(),
    }))

    startTransition(async () => {
      const result = await criarElementosBatch(itens)
      if (result.success) {
        setDone({ nome: nome.trim(), count: result.count })
      } else {
        toast.error('Erro ao criar itens', { description: result.error })
      }
    })
  }

  function resetForm() {
    setDone(null)
    setStep(1)
    setNome('')
    setFaseId(fases[0]?.id ?? 1)
    setSelectedKeys(new Set())
    setSelectedIds(new Set())
  }

  const selectedFaseName = fases.find(f => f.id === faseId)?.nome ?? ''
  const divisoesParaRefinar = grupos.flatMap(g => g.divisoes).filter(d => selectedIds.has(d.id))

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="rounded-lg border bg-card p-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Gerir Itens em Massa</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Adiciona o mesmo item a várias divisões de uma vez
          </p>
        </div>
        <Button variant="outline" size="sm" render={<Link href="/apartamentos" />} nativeButton={false}>
          <ChevronLeft className="h-4 w-4" />
          Voltar
        </Button>
      </div>

      {/* Success state */}
      {done && (
        <div className="rounded-lg border bg-card p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium">Item adicionado com sucesso</p>
              <p className="text-sm text-muted-foreground">
                &ldquo;{done.nome}&rdquo; criado em {done.count} {done.count === 1 ? 'divisão' : 'divisões'}
              </p>
            </div>
          </div>
          <Button onClick={resetForm} variant="outline" size="sm">
            Adicionar outro item
          </Button>
        </div>
      )}

      {!done && (
        <>
          {/* Step 1 */}
          <div className="rounded-lg border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                1
              </span>
              <span className="text-sm font-medium">Nome e fase do item</span>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Ex: Verificar rodapé"
                disabled={step > 1}
                className="w-full px-3 py-2 text-sm border rounded-md bg-background outline-none
                  focus:ring-2 focus:ring-ring disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <select
                value={faseId}
                onChange={e => setFaseId(Number(e.target.value))}
                disabled={step > 1}
                className="w-full px-3 py-2 text-sm border rounded-md bg-background outline-none
                  focus:ring-2 focus:ring-ring disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {fases.map(f => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
              </select>
              {step === 1 && (
                <Button
                  onClick={() => setStep(2)}
                  disabled={!nome.trim()}
                  size="sm"
                >
                  Seguinte
                </Button>
              )}
              {step > 1 && (
                <p className="text-xs text-muted-foreground">
                  Fase: <strong>{selectedFaseName}</strong>
                  {' · '}
                  <button onClick={() => setStep(1)} className="underline hover:no-underline">
                    Alterar
                  </button>
                </p>
              )}
            </div>
          </div>

          {/* Step 2 */}
          {step >= 2 && (
            <div className="rounded-lg border bg-card p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                  ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  2
                </span>
                <span className="text-sm font-medium">Selecionar divisões</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{grupos.length} grupos</span>
                <div className="flex gap-3">
                  <button onClick={selectAll} className="text-xs text-primary hover:underline">
                    Selecionar todos
                  </button>
                  <button onClick={clearAll} className="text-xs text-muted-foreground hover:underline">
                    Limpar
                  </button>
                </div>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {grupos.map(g => (
                  <label key={g.key} className="flex items-center gap-3 p-2 rounded-md
                    hover:bg-muted/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedKeys.has(g.key)}
                      onChange={() => toggleGroup(g.key, g.divisoes.map(d => d.id))}
                      className="h-4 w-4 rounded border-input"
                    />
                    <span className="text-sm flex-1">{g.displayName}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {g.divisoes.length} divisão{g.divisoes.length !== 1 ? 'ões' : ''}
                    </span>
                  </label>
                ))}
              </div>
              {step === 2 && (
                <Button
                  onClick={() => setStep(3)}
                  disabled={selectedIds.size === 0}
                  size="sm"
                >
                  Seguinte ({selectedIds.size} divisões)
                </Button>
              )}
              {step > 2 && (
                <p className="text-xs text-muted-foreground">
                  {selectedIds.size} divisões selecionadas
                  {' · '}
                  <button onClick={() => setStep(2)} className="underline hover:no-underline">
                    Alterar
                  </button>
                </p>
              )}
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="rounded-lg border bg-card p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                  bg-primary text-primary-foreground">
                  3
                </span>
                <span className="text-sm font-medium">Confirmar divisões</span>
              </div>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {divisoesParaRefinar.map(d => (
                  <label key={d.id} className="flex items-center gap-3 px-2 py-1.5 rounded-md
                    hover:bg-muted/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(d.id)}
                      onChange={() => toggleDivisao(d.id)}
                      className="h-4 w-4 rounded border-input"
                    />
                    <span className="text-sm flex-1">{d.nome}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{d.apartamentoCodigo}</span>
                  </label>
                ))}
              </div>
              <Button
                onClick={handleConfirm}
                disabled={selectedIds.size === 0 || isPending}
              >
                {isPending
                  ? 'A criar...'
                  : `Adicionar "${nome.trim()}" a ${selectedIds.size} divisão${selectedIds.size !== 1 ? 'ões' : ''}`
                }
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verificar build**

```bash
cd obra-cabanas-app && npm run build
```
Expected: sem erros TypeScript.

- [ ] **Step 4: Teste manual do wizard**

1. Vai a `/gerir-itens`
2. Escreve "Verificar rodapé", seleciona fase "Chão/Rodapé", clica Seguinte
3. Vê os grupos (WC, Quarto, Sala, etc.) — seleciona alguns, clica Seguinte
4. Vê a lista individual — desmarca uma divisão específica, confirma
5. Vê mensagem de sucesso com o número correto de divisões
6. Clica "Adicionar outro item" — formulário reseta para o Passo 1
7. Vai a `/apartamentos/1` e confirma que o item aparece nas divisões selecionadas

- [ ] **Step 5: Commit final**

```bash
cd obra-cabanas-app
git add src/app/(app)/gerir-itens/ src/components/layout/app-sidebar.tsx src/app/(app)/apartamentos/page.tsx
git commit -m "feat: painel Gerir Itens em Massa — wizard 3 passos com normalização de divisões"
```

---

## Self-Review Checklist

- [x] `criarElemento` — cobre Parte 1 (desktop Task 1 + mobile Task 5)
- [x] `criarElementosBatch` — cobre Parte 2 (Task 1 + Task 7)
- [x] `AddItemInline` — botão inline, Enter confirma, Escape cancela (Task 2)
- [x] `ChecklistGroups` com `useOptimistic` — item aparece antes de BD confirmar (Task 3)
- [x] `defaultFaseId` calculado nos dois page.tsx (Tasks 4 + 5)
- [x] Mobile: action + `apartamentoId` no `ApartamentoChecklist` + botão inline (Task 5)
- [x] Links de navegação sidebar + página Apartamentos (Task 6)
- [x] Wizard `/gerir-itens` — 3 passos, normalização, batch insert, estado de sucesso (Task 7)
- [x] Sem schema migrations — usa tabela `elementos` existente
- [x] `npm run build` em cada task antes de commit
