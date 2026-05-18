# Gantt + Checklist Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three bugs and improve two UX areas: (1) Gantt headers ilegíveis em semana/mês, (2) filtros do checklist a mostrar `__all__`, (3) hierarquia visual dos items do checklist.

**Architecture:** All changes are isolated to 4 files — gantt-header.tsx (column widths), checklist-filters.tsx (Select values + Divisão filter), checklist/page.tsx (fetch divisões + divisao param), checklist-item.tsx (typography hierarchy).

**Tech Stack:** Next.js 16, @base-ui/react (Select), date-fns, Tailwind CSS, Supabase

---

## Bug Analysis

### Bug 1 — Gantt headers ilegíveis (semana/mês)
`COL_WIDTH.semana = 20` → texto "27/04" (5 chars ≈ 35px) não cabe em 20px, ultrapassa para a célula seguinte.  
`COL_WIDTH.mes = 12` → texto "abr 26" (6 chars ≈ 42px) não cabe em 12px.  
**Fix:** aumentar para `semana: 60`, `mes: 80`.

### Bug 2 — Filtros a mostrar `__all__`
O Select usa `@base-ui/react`, não Radix. Base UI não suporta `value=""` (empty string) — representa internamente como `__all__`. Os 3 filtros usam `value={param ?? ''}`.  
**Fix:** usar sentinel `"all"` como valor do "Todos" e `value={param ?? 'all'}`.

### Bug 3 — Falta filtro de Divisão
A page já filtra por divisão na query, mas não expõe o filtro na UI. O checklist-filters não recebe divisões como prop.  
**Fix:** buscar divisões na page, passar como prop, adicionar 4.º select.

### Bug 4 — Sub-elementos pouco visíveis
`checklist-item.tsx` usa `text-xs text-muted-foreground` para sub_elemento — muito pequeno e claro.  
**Fix:** aumentar para `text-sm`, escurecer (`text-foreground/75`), adicionar indentação e marcador visual.

---

## Task 1: Fix Gantt column widths

**Files:**
- Modify: `src/components/gantt/gantt-header.tsx:12-16`

- [ ] **Step 1: Increase column widths and simplify labels**

In `gantt-header.tsx`, replace the `COL_WIDTH` object and the week label format:

```tsx
// BEFORE:
export const COL_WIDTH: Record<ZoomLevel, number> = {
  dia: 40,
  semana: 20,
  mes: 12,
}

// AFTER:
export const COL_WIDTH: Record<ZoomLevel, number> = {
  dia: 40,
  semana: 60,
  mes: 80,
}
```

Still in `gantt-header.tsx`, the week label currently uses `format(d, 'dd/MM')`. Keep it — at 60px it fits comfortably.  
The month label uses `format(d, 'MMM yy')`. At 80px it also fits. No label change needed.

- [ ] **Step 2: Verify today indicator alignment still works**

`gantt-chart.tsx:71` calculates `todayLeft = NAME_COL_WIDTH + todayOffsetDays * colW`. This reads `COL_WIDTH[zoom]` dynamically, so it auto-corrects. No change needed there.

- [ ] **Step 3: Run the dev server and verify visually**

```bash
cd obra-cabanas-app
npm run dev
```

Navigate to `/gantt`. Switch between Dia / Sem / Mês and confirm all date labels are readable. Today's column should be highlighted in red.

- [ ] **Step 4: Commit**

```bash
git add src/components/gantt/gantt-header.tsx
git commit -m "fix(gantt): increase column widths for semana (60px) and mes (80px)"
```

---

## Task 2: Fix checklist filter `__all__` bug

**Files:**
- Modify: `src/components/checklist/checklist-filters.tsx`

**Root cause:** `@base-ui/react` Select renders `__all__` when `value=""`. Fix: use `"all"` as the sentinel value for "no filter", and pass `value={param ?? 'all'}`.

- [ ] **Step 1: Update the Apartamento filter**

In `checklist-filters.tsx`, change the AP Select (lines 63–79):

```tsx
// BEFORE:
<Select
  value={searchParams.get('ap') ?? ''}
  onValueChange={(v: string | null) => setParam('ap', v || null)}
>
  <SelectTrigger className="w-[130px]">
    <SelectValue placeholder="Apartamento" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="">Todos os APs</SelectItem>
    {apartamentos.map(a => (
      <SelectItem key={a.id} value={String(a.id)}>
        {a.label}
      </SelectItem>
    ))}
  </SelectContent>
</Select>

// AFTER:
<Select
  value={searchParams.get('ap') ?? 'all'}
  onValueChange={(v: string) => setParam('ap', v === 'all' ? null : v)}
>
  <SelectTrigger className="w-[140px]">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">Todos os APs</SelectItem>
    {apartamentos.map(a => (
      <SelectItem key={a.id} value={String(a.id)}>
        {a.label}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

- [ ] **Step 2: Update the Fase filter (same pattern)**

```tsx
// BEFORE:
<Select
  value={searchParams.get('fase') ?? ''}
  onValueChange={(v: string | null) => setParam('fase', v || null)}
>
  <SelectTrigger className="w-[140px]">
    <SelectValue placeholder="Fase" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="">Todas as fases</SelectItem>
    ...
  </SelectContent>
</Select>

// AFTER:
<Select
  value={searchParams.get('fase') ?? 'all'}
  onValueChange={(v: string) => setParam('fase', v === 'all' ? null : v)}
>
  <SelectTrigger className="w-[140px]">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">Todas as fases</SelectItem>
    {fases.map(f => (
      <SelectItem key={f.id} value={String(f.id)}>
        {f.label}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

- [ ] **Step 3: Update the Estado filter (same pattern)**

```tsx
// BEFORE:
<Select
  value={searchParams.get('status') ?? ''}
  onValueChange={(v: string | null) => setParam('status', v || null)}
>
  <SelectTrigger className="w-[130px]">
    <SelectValue placeholder="Estado" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="">Todos</SelectItem>
    <SelectItem value="unchecked">Por fazer</SelectItem>
    <SelectItem value="checked">Concluídos</SelectItem>
  </SelectContent>
</Select>

// AFTER:
<Select
  value={searchParams.get('status') ?? 'all'}
  onValueChange={(v: string) => setParam('status', v === 'all' ? null : v)}
>
  <SelectTrigger className="w-[130px]">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">Todos</SelectItem>
    <SelectItem value="unchecked">Por fazer</SelectItem>
    <SelectItem value="checked">Concluídos</SelectItem>
  </SelectContent>
</Select>
```

- [ ] **Step 4: Verify visually**

Navigate to `/checklist`. Confirm the 3 selects show "Todos os APs", "Todas as fases", "Todos" instead of `__all__`. Selecting and deselecting an option must work.

- [ ] **Step 5: Commit**

```bash
git add src/components/checklist/checklist-filters.tsx
git commit -m "fix(checklist): use sentinel 'all' value for Base UI Select filters"
```

---

## Task 3: Add Divisão filter to checklist

**Files:**
- Modify: `src/components/checklist/checklist-filters.tsx`
- Modify: `src/app/(app)/checklist/page.tsx`

- [ ] **Step 1: Add `divisoes` prop to ChecklistFilters interface**

In `checklist-filters.tsx`, update the `Props` interface:

```tsx
// BEFORE:
interface FilterOption {
  id: number
  label: string
}

interface Props {
  apartamentos: FilterOption[]
  fases: FilterOption[]
  showApFilter?: boolean
}

// AFTER:
interface FilterOption {
  id: number
  label: string
}

interface Props {
  apartamentos: FilterOption[]
  fases: FilterOption[]
  divisoes: FilterOption[]
  showApFilter?: boolean
}
```

- [ ] **Step 2: Add Divisão select to the component**

In `checklist-filters.tsx`, add the divisão Select after the Fase select and before the Estado select. The new select (insert after the fase `</Select>` closing tag):

```tsx
<Select
  value={searchParams.get('divisao') ?? 'all'}
  onValueChange={(v: string) => setParam('divisao', v === 'all' ? null : v)}
>
  <SelectTrigger className="w-[150px]">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">Todas as divisões</SelectItem>
    {divisoes.map(d => (
      <SelectItem key={d.id} value={String(d.id)}>
        {d.label}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

- [ ] **Step 3: Fetch divisões in ChecklistPage and wire up filter**

In `checklist/page.tsx`:

**3a. Add `divisao` to searchParams type:**
```tsx
interface Props {
  searchParams: Promise<{
    ap?: string
    fase?: string
    divisao?: string
    status?: string
    q?: string
  }>
}
```

**3b. Apply divisão filter in the query (inside `ChecklistContent`, after the existing `if (params.fase)` line):**
```tsx
if (params.divisao) query = query.eq('divisao_id', Number(params.divisao))
```

**3c. Fetch divisões in `ChecklistPage` (add to the `Promise.all`):**
```tsx
const [apResult, fasesResult, divisoesResult] = await Promise.all([
  supabase.from('apartamentos').select('id, codigo').order('id'),
  supabase.from('fases').select('id, nome, cor_hex, ordem').order('ordem'),
  supabase.from('divisoes').select('id, nome').order('nome'),
])

const apartamentos = apResult.data as { id: number; codigo: string }[] | null
const fases = fasesResult.data as { id: number; nome: string; cor_hex: string; ordem: number }[] | null
const divisoes = divisoesResult.data as { id: number; nome: string }[] | null
```

**3d. Pass divisões to ChecklistFilters:**
```tsx
<ChecklistFilters
  apartamentos={apartamentos?.map(a => ({ id: a.id, label: a.codigo })) ?? []}
  fases={fases?.map(f => ({ id: f.id, label: f.nome })) ?? []}
  divisoes={divisoes?.map(d => ({ id: d.id, label: d.nome })) ?? []}
/>
```

- [ ] **Step 4: Verify the 4 filters work**

Navigate to `/checklist`. Confirm 4 selects: Apartamento, Fase, Divisão, Estado. Select "Cozinha" in divisão and confirm the list filters correctly.

- [ ] **Step 5: Commit**

```bash
git add src/components/checklist/checklist-filters.tsx src/app/(app)/checklist/page.tsx
git commit -m "feat(checklist): add Divisão filter"
```

---

## Task 4: Improve checklist item visual hierarchy

**Files:**
- Modify: `src/components/checklist/checklist-item.tsx`

**Goal:** Sub-elemento should be clearly subordinate to elemento — bigger text, slightly indented, with a visual connector. Currently `text-xs text-muted-foreground` makes it invisible.

- [ ] **Step 1: Redesign the text hierarchy in ChecklistItem**

Replace the entire content of the `<div className="flex-1 min-w-0">` block in `checklist-item.tsx`:

```tsx
// BEFORE:
<div className="flex-1 min-w-0">
  <p
    className={`text-sm leading-relaxed break-words ${
      optimistic ? 'line-through text-muted-foreground' : 'text-foreground'
    }`}
  >
    {elemento}
  </p>
  {sub_elemento && (
    <p className="text-xs text-muted-foreground mt-0.5 break-words">{sub_elemento}</p>
  )}
</div>

// AFTER:
<div className="flex-1 min-w-0">
  {sub_elemento ? (
    <>
      {/* elemento = categoria pai (label compacto) */}
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide leading-tight mb-0.5">
        {elemento}
      </p>
      {/* sub_elemento = item real do checklist (texto principal) */}
      <p
        className={`text-sm leading-relaxed break-words ${
          optimistic ? 'line-through text-muted-foreground' : 'text-foreground/90'
        }`}
      >
        {sub_elemento}
      </p>
    </>
  ) : (
    <p
      className={`text-sm leading-relaxed break-words ${
        optimistic ? 'line-through text-muted-foreground' : 'text-foreground'
      }`}
    >
      {elemento}
    </p>
  )}
</div>
```

This renders items with sub_elemento like:
```
TETO          ← small uppercase label (categoria)
Primer        ← main text (o item real)
```

And items without sub_elemento unchanged:
```
Chão          ← main text
```

- [ ] **Step 2: Update the aria-label to use sub_elemento when present**

The `aria-label` on the hidden input currently only shows `elemento`. Update it:

```tsx
// BEFORE:
aria-label={elemento}

// AFTER:
aria-label={sub_elemento ? `${elemento} — ${sub_elemento}` : elemento}
```

- [ ] **Step 3: Verify visual result**

Navigate to `/checklist`, select AP1. Confirm items with sub_elemento show the elemento as a small uppercase label and sub_elemento as the main clickable text. Items without sub_elemento look unchanged.

- [ ] **Step 4: Commit**

```bash
git add src/components/checklist/checklist-item.tsx
git commit -m "fix(checklist): improve visual hierarchy — sub_elemento as primary text, elemento as category label"
```

---

## Self-Review

**Spec coverage:**
- ✅ Gantt semana/mês ilegível → Task 1 (column widths)
- ✅ Gantt dia mostra poucos dias → não é bug, é falta de datas nas tarefas; Task 1 melhora a legibilidade geral
- ✅ Filtros `__all__` → Task 2
- ✅ Filtro Divisão em falta → Task 3
- ✅ Sub-elementos pequenos/claros → Task 4
- ⏳ Design geral com frontend-design skill → fora deste plano, sessão separada

**Placeholder scan:** nenhum TBD ou TODO no plano.

**Type consistency:** 
- `FilterOption` (id, label) é consistente entre Tasks 2 e 3.
- `setParam('divisao', ...)` em Task 3 Step 2 é consistente com `params.divisao` em Step 3.
- sentinel `'all'` é consistente em todos os selects de Task 2.
