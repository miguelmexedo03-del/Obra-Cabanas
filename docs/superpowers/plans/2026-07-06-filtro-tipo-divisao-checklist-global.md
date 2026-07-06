# Filtro "Tipo de Divisão" na Checklist Global Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar um filtro "Tipo de Divisão" (WC, Suite, Quarto, Sala, etc.) à
Checklist global de ambas as apps (desktop `obra-cabanas-app` e mobile
`cabanas-mobile`), reaproveitando a categorização já existente (`tipoDivisao`/
`TIPOS_DIVISAO`).

**Architecture:** Filtro client-side via `searchParams` (`?tipo=WC`), seguindo
exatamente o padrão já usado pelos filtros existentes (`fase`, `status`, `q`). A
filtragem por tipo é feita em memória depois do fetch à BD (não há coluna
"tipo_divisao" na tabela `divisoes`), no mesmo sítio onde já se aplica `sortElementos`.

**Tech Stack:** Next.js 16 App Router + TypeScript — sem dependências novas.

## Global Constraints

- Nenhuma das duas apps tem framework de testes unitários — a verificação de cada
  tarefa é `npm run build` (type-check estrito). A mobile também corre `npm run build`
  antes de cada commit (regra de ouro #3 do `cabanas-mobile/CLAUDE.md`).
- PT-PT em toda a UI e strings visíveis; inglês no código. Sem `any`.
- **Reaproveitar o `TIPOS_DIVISAO` já existente** — não inventar novas categorias.
  Desktop já tem `TIPOS_DIVISAO`/`tipoDivisao` em `src/lib/utils.ts`; a mobile
  **duplica** a mesma constante/função (repos separados, só partilham a BD — ver
  regra de ouro #1 do `cabanas-mobile/CLAUDE.md`).
- **Simplificação em relação à spec original:** a spec previa alargar o tipo `id` de
  `FilterOption`/`Option` para `number | string` para poder passar os tipos de
  divisão como prop. Este plano evita essa mudança de tipo — o `TIPOS_DIVISAO` é
  importado diretamente dentro dos componentes de filtro (é uma constante estática,
  não vem da BD), e o dropdown mobile usa um `<select>` simples (mesmo padrão já
  usado ali para o filtro "Estado"), tal como o `checklist-filters.tsx` da desktop
  usa `SelectItem` diretamente sobre `TIPOS_DIVISAO`. Resultado idêntico, sem tocar
  no tipo `FilterOption`/`Option`.
- Âmbito: só a Checklist global (`/checklist`) nas duas apps — não a página de
  apartamento individual. Os componentes de filtro (`ChecklistFilters`,
  `MobileFilters`) são partilhados entre as duas páginas em cada app, por isso o
  novo filtro fica atrás de uma prop `showTipoFilter?: boolean` (default `false`),
  só ativada a partir da página `/checklist`.

---

### Task 1: Desktop — `ChecklistFilters` com novo filtro "Tipo de Divisão"

**Files:**
- Modify: `obra-cabanas-app/src/components/checklist/checklist-filters.tsx`

**Interfaces:**
- Consumes: `TIPOS_DIVISAO` (readonly array de strings) de `@/lib/utils` — já existe
- Produces: `ChecklistFilters` passa a aceitar `showTipoFilter?: boolean` (default
  `false`); quando `true`, lê/escreve o searchParam `tipo`. Consumido pela Task 2.

- [ ] **Step 1: Adicionar o import**

No topo do ficheiro, junto aos outros imports:

```typescript
import { TIPOS_DIVISAO } from '@/lib/utils'
```

- [ ] **Step 2: Alargar a interface `Props` e a assinatura da função**

Substitui:

```typescript
interface Props {
  apartamentos: FilterOption[]
  fases: FilterOption[]
  divisoes?: FilterOption[]
  showApFilter?: boolean
}

export function ChecklistFilters({ apartamentos, fases, divisoes, showApFilter = true }: Props) {
```

por:

```typescript
interface Props {
  apartamentos: FilterOption[]
  fases: FilterOption[]
  divisoes?: FilterOption[]
  showApFilter?: boolean
  showTipoFilter?: boolean
}

export function ChecklistFilters({ apartamentos, fases, divisoes, showApFilter = true, showTipoFilter = false }: Props) {
```

- [ ] **Step 3: Adicionar o novo `Select` entre "Fase" e "Divisão"**

O `Select` de "Fase" atual termina assim (não mexer nele):

```typescript
      <Select
        value={searchParams.get('fase') ?? undefined}
        onValueChange={(v: string | null) => setParam('fase', v === null || v === ALL ? null : v)}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue>
            {searchParams.get('fase')
              ? (fases.find(f => String(f.id) === searchParams.get('fase'))?.label ?? 'Fase')
              : <span className="text-muted-foreground">Fase</span>}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todas as fases</SelectItem>
          {fases.map(f => (
            <SelectItem key={f.id} value={String(f.id)}>
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
```

Logo a seguir a este bloco (antes do `{divisoes && divisoes.length > 0 && (...)}`),
adiciona:

```typescript
      {showTipoFilter && (
        <Select
          value={searchParams.get('tipo') ?? undefined}
          onValueChange={(v: string | null) => setParam('tipo', v === null || v === ALL ? null : v)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue>
              {searchParams.get('tipo') ?? <span className="text-muted-foreground">Tipo de Divisão</span>}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os tipos</SelectItem>
            {TIPOS_DIVISAO.map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
```

- [ ] **Step 4: Verificar build**

```bash
cd obra-cabanas-app
npm run build
```

Esperado: build sem erros de TypeScript.

- [ ] **Step 5: Commit**

```bash
git add src/components/checklist/checklist-filters.tsx
git commit -m "feat: adicionar filtro Tipo de Divisão ao ChecklistFilters (desktop)"
```

---

### Task 2: Desktop — aplicar o filtro na página `/checklist`

**Files:**
- Modify: `obra-cabanas-app/src/app/(app)/checklist/page.tsx`

**Interfaces:**
- Consumes: `showTipoFilter` prop do `ChecklistFilters` (Task 1); `tipoDivisao` de
  `@/lib/utils` (já existe)
- Produces: rota `/checklist` filtra por `?tipo=WC` além dos filtros existentes

- [ ] **Step 1: Adicionar `tipo` ao tipo `Props`**

Substitui:

```typescript
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

por:

```typescript
interface Props {
  searchParams: Promise<{
    ap?: string
    fase?: string
    divisao?: string
    status?: string
    q?: string
    tipo?: string
  }>
}
```

- [ ] **Step 2: Importar `tipoDivisao`**

Substitui a linha de import de `@/lib/utils`:

```typescript
import { sanitizeIlikePattern, sortElementos, divisaoSortPriority } from '@/lib/utils'
```

por:

```typescript
import { sanitizeIlikePattern, sortElementos, divisaoSortPriority, tipoDivisao } from '@/lib/utils'
```

- [ ] **Step 3: Filtrar os elementos por tipo depois do fetch**

Substitui (dentro de `ChecklistContent`):

```typescript
  const { data: elementos, error } = await query as { data: RawElemento[] | null; error: unknown }

  if (error) {
    return <p className="text-sm text-destructive py-8">Erro ao carregar dados.</p>
  }

  if (!elementos?.length) {
    return (
      <EmptyState
        icon={ListChecks}
        title="Nenhum item encontrado"
        description={
          Object.keys(params).length === 0
            ? 'Seleciona um apartamento ou usa a pesquisa para ver itens.'
            : 'Ajusta os filtros para ver resultados.'
        }
      />
    )
  }
```

por:

```typescript
  const { data: elementosRaw, error } = await query as { data: RawElemento[] | null; error: unknown }

  if (error) {
    return <p className="text-sm text-destructive py-8">Erro ao carregar dados.</p>
  }

  const elementos = params.tipo
    ? (elementosRaw ?? []).filter(el => el.divisoes && tipoDivisao(el.divisoes.nome) === params.tipo)
    : (elementosRaw ?? [])

  if (!elementos.length) {
    return (
      <EmptyState
        icon={ListChecks}
        title="Nenhum item encontrado"
        description={
          Object.keys(params).length === 0
            ? 'Seleciona um apartamento ou usa a pesquisa para ver itens.'
            : 'Ajusta os filtros para ver resultados.'
        }
      />
    )
  }
```

- [ ] **Step 4: Ajustar a mensagem do limite de 500 para usar a contagem crua**

Substitui:

```typescript
      <p className="text-xs text-muted-foreground">
        {elementos.length} itens {elementos.length === 500 ? '(limite 500 — aplica filtros para ver mais)' : ''}
      </p>
```

por:

```typescript
      <p className="text-xs text-muted-foreground">
        {elementos.length} itens {(elementosRaw?.length ?? 0) === 500 ? '(limite 500 — aplica filtros para ver mais)' : ''}
      </p>
```

(Isto evita esconder o aviso de limite quando o filtro por tipo reduz a contagem
visível abaixo de 500, mas o fetch original à BD já tinha atingido o limite.)

- [ ] **Step 5: Ativar o filtro no `ChecklistFilters`**

Substitui:

```typescript
          <ChecklistFilters
            apartamentos={apartamentos?.map(a => ({ id: a.id, label: a.codigo })) ?? []}
            fases={fases?.map(f => ({ id: f.id, label: f.nome })) ?? []}
            divisoes={divisoes?.map(d => ({ id: d.id, label: d.nome })) ?? undefined}
          />
```

por:

```typescript
          <ChecklistFilters
            apartamentos={apartamentos?.map(a => ({ id: a.id, label: a.codigo })) ?? []}
            fases={fases?.map(f => ({ id: f.id, label: f.nome })) ?? []}
            divisoes={divisoes?.map(d => ({ id: d.id, label: d.nome })) ?? undefined}
            showTipoFilter
          />
```

- [ ] **Step 6: Verificar build**

```bash
npm run build
```

Esperado: build sem erros de TypeScript.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(app)/checklist/page.tsx"
git commit -m "feat: aplicar filtro Tipo de Divisão na Checklist global (desktop)"
```

---

### Task 3: Mobile — copiar `TIPOS_DIVISAO`/`tipoDivisao` para `utils.ts`

**Files:**
- Modify: `cabanas-mobile/src/lib/utils.ts`

**Interfaces:**
- Consumes: nada
- Produces:
  - `export const TIPOS_DIVISAO: readonly string[]` (mesmas 11 categorias da desktop)
  - `export type TipoDivisao = typeof TIPOS_DIVISAO[number]`
  - `export function tipoDivisao(nome: string): TipoDivisao`
  - Usado por Task 4 (`mobile-filters.tsx`) e Task 5 (`checklist/page.tsx`)

- [ ] **Step 1: Adicionar o código**

Insere isto imediatamente antes da função `sortElementos` existente (depois de
`divisaoSortPriority`), copiado tal e qual da desktop:

```typescript
export const TIPOS_DIVISAO = [
  'Entrada', 'Sala', 'Cozinha', 'Suite Principal', 'Suite 1', 'Suite 2',
  'Outra Suite', 'Quarto', 'WC', 'Closet', 'Varanda',
] as const

export type TipoDivisao = typeof TIPOS_DIVISAO[number]

// Categoriza uma divisão pelo tipo de compartimento, colapsando variantes
// (WC Suite 1, WC de Serviço, WC(Suite Principal)...) numa única categoria "WC"
// para responder a perguntas do tipo "todas as casas de banho".
export function tipoDivisao(nome: string): TipoDivisao {
  const n = nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s*\(/g, ' (')
    .replace(/\s+/g, ' ')
    .trim()

  if (n.includes('wc')) return 'WC'
  if (n.startsWith('closet')) return 'Closet'
  if (n === 'sala') return 'Sala'
  if (n === 'cozinha') return 'Cozinha'
  if (n.startsWith('entrada')) return 'Entrada'
  if (n.startsWith('varanda')) return 'Varanda'
  if (n.startsWith('quarto')) return 'Quarto'
  if (n === 'suite principal') return 'Suite Principal'
  if (n.startsWith('suite 1')) return 'Suite 1'
  if (n.startsWith('suite 2')) return 'Suite 2'
  return 'Outra Suite'
}
```

- [ ] **Step 2: Escrever script de verificação temporário**

Cria `cabanas-mobile/scratch-verify-tipo-divisao.ts` (ficheiro temporário, NÃO
committed) com os mesmos 27 casos já validados na desktop:

```typescript
import { tipoDivisao } from './src/lib/utils.ts'

const casos: [string, string][] = [
  ['Closet', 'Closet'],
  ['Closet (lavandaria)', 'Closet'],
  ['Closet (Suite Principal)', 'Closet'],
  ['Closet (Suite)', 'Closet'],
  ['Cozinha', 'Cozinha'],
  ['Entrada', 'Entrada'],
  ['Entrada / Acessos', 'Entrada'],
  ['Quarto', 'Quarto'],
  ['Quarto em frente', 'Quarto'],
  ['Sala', 'Sala'],
  ['Suite', 'Outra Suite'],
  ['Suite 1 em frente', 'Suite 1'],
  ['Suite 2 à esquerda', 'Suite 2'],
  ['Suite á direita (escritório)', 'Outra Suite'],
  ['Suite Principal', 'Suite Principal'],
  ['Varanda', 'Varanda'],
  ['WC', 'WC'],
  ['WC  (Suite Principal)', 'WC'],
  ['WC (Quarto)', 'WC'],
  ['WC (Suite 1)', 'WC'],
  ['WC (Suite 2)', 'WC'],
  ['WC (Suite Principal)', 'WC'],
  ['WC (Suite)', 'WC'],
  ['WC de Serviço', 'WC'],
  ['WC Serviço', 'WC'],
  ['WC(Suite 1)', 'WC'],
  ['WC(Suite Principal)', 'WC'],
]

let falhas = 0
for (const [nome, esperado] of casos) {
  const obtido = tipoDivisao(nome)
  if (obtido !== esperado) {
    falhas++
    console.log(`FALHA: "${nome}" -> "${obtido}" (esperado "${esperado}")`)
  }
}
console.log(falhas === 0 ? `OK: ${casos.length} casos passaram` : `${falhas} falhas`)
```

- [ ] **Step 3: Correr o script e confirmar que passa**

```bash
cd cabanas-mobile
node scratch-verify-tipo-divisao.ts
```

Esperado: `OK: 27 casos passaram` (o aviso `MODULE_TYPELESS_PACKAGE_JSON` do Node é
inofensivo, ignora).

- [ ] **Step 4: Apagar o script temporário**

```bash
rm scratch-verify-tipo-divisao.ts
```

- [ ] **Step 5: Verificar build**

```bash
npm run build
```

Esperado: build sem erros de TypeScript.

- [ ] **Step 6: Commit**

```bash
git add src/lib/utils.ts
git commit -m "feat: adicionar TIPOS_DIVISAO/tipoDivisao (cópia da desktop) para filtro por tipo de divisão"
```

---

### Task 4: Mobile — `MobileFilters` com novo dropdown "Tipo de Divisão"

**Files:**
- Modify: `cabanas-mobile/src/components/mobile-filters.tsx`

**Interfaces:**
- Consumes: `TIPOS_DIVISAO` de `@/lib/utils` (Task 3)
- Produces: `MobileFilters` passa a aceitar `showTipoFilter?: boolean` (default
  `false`); quando `true`, lê/escreve o searchParam `tipo`. Consumido pela Task 5.

- [ ] **Step 1: Adicionar o import**

```typescript
import { TIPOS_DIVISAO } from '@/lib/utils'
```

- [ ] **Step 2: Alargar a interface `Props` e a assinatura da função**

Substitui:

```typescript
interface Props {
  fases: Option[]
  apartamentos?: Option[]
  divisoes?: Option[]
  showAp?: boolean
  showStatus?: boolean
  showSearch?: boolean
}

export function MobileFilters({
  fases,
  apartamentos = [],
  divisoes = [],
  showAp = false,
  showStatus = true,
  showSearch = true,
}: Props) {
```

por:

```typescript
interface Props {
  fases: Option[]
  apartamentos?: Option[]
  divisoes?: Option[]
  showAp?: boolean
  showStatus?: boolean
  showSearch?: boolean
  showTipoFilter?: boolean
}

export function MobileFilters({
  fases,
  apartamentos = [],
  divisoes = [],
  showAp = false,
  showStatus = true,
  showSearch = true,
  showTipoFilter = false,
}: Props) {
```

- [ ] **Step 3: Adicionar o dropdown entre "Fase" e "Divisão"**

O dropdown de "Fase" atual (não mexer):

```typescript
        <Dropdown
          value={searchParams.get('fase') ?? ''}
          onChange={v => setParam('fase', v)}
          allLabel="Todas as fases"
          options={fases}
          selectClass={selectClass}
        />
```

Logo a seguir a este bloco (antes do `{divisoes.length > 0 && (...)}`), adiciona um
`<select>` simples (mesmo padrão já usado para "Estado" no mesmo ficheiro, já que
`TIPOS_DIVISAO` são strings e o `Dropdown` genérico espera `Option.id: number`):

```typescript
        {showTipoFilter && (
          <div className="relative flex-shrink-0">
            <select
              value={searchParams.get('tipo') ?? ''}
              onChange={e => setParam('tipo', e.target.value)}
              className={selectClass}
            >
              <option value="">Todos os tipos</option>
              {TIPOS_DIVISAO.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <ChevronIcon />
          </div>
        )}
```

- [ ] **Step 4: Verificar build**

```bash
npm run build
```

Esperado: build sem erros de TypeScript.

- [ ] **Step 5: Commit**

```bash
git add src/components/mobile-filters.tsx
git commit -m "feat: adicionar filtro Tipo de Divisão ao MobileFilters"
```

---

### Task 5: Mobile — aplicar o filtro na página `/checklist`

**Files:**
- Modify: `cabanas-mobile/src/app/(app)/checklist/page.tsx`

**Interfaces:**
- Consumes: `showTipoFilter` prop do `MobileFilters` (Task 4); `tipoDivisao` de
  `@/lib/utils` (Task 3)
- Produces: rota `/checklist` (mobile) filtra por `?tipo=WC` além dos filtros
  existentes

- [ ] **Step 1: Adicionar `tipo` ao tipo `Props`**

Substitui:

```typescript
interface Props {
  searchParams: Promise<{
    ap?: string; fase?: string; divisao?: string; status?: string; q?: string
  }>
}
```

por:

```typescript
interface Props {
  searchParams: Promise<{
    ap?: string; fase?: string; divisao?: string; status?: string; q?: string; tipo?: string
  }>
}
```

- [ ] **Step 2: Importar `tipoDivisao`**

Substitui:

```typescript
import { sanitizeIlikePattern, sortElementos, divisaoSortPriority } from '@/lib/utils'
```

por:

```typescript
import { sanitizeIlikePattern, sortElementos, divisaoSortPriority, tipoDivisao } from '@/lib/utils'
```

- [ ] **Step 3: Filtrar os elementos por tipo depois do fetch**

Substitui (dentro de `ChecklistContent`):

```typescript
  const { data: elementos } = await query as { data: RawElemento[] | null }

  const groupMap = new Map<string, Group>()
  for (const el of elementos ?? []) {
```

por:

```typescript
  const { data: elementosRaw } = await query as { data: RawElemento[] | null }

  const elementos = params.tipo
    ? (elementosRaw ?? []).filter(el => el.divisoes && tipoDivisao(el.divisoes.nome) === params.tipo)
    : (elementosRaw ?? [])

  const groupMap = new Map<string, Group>()
  for (const el of elementos) {
```

- [ ] **Step 4: Atualizar as restantes referências a `elementos` na mesma função**

Substitui:

```typescript
  const elementoIds = (elementos ?? []).map(e => e.id)
```

por:

```typescript
  const elementoIds = elementos.map(e => e.id)
```

Substitui:

```typescript
  return (
    <ChecklistGlobal
      grupos={grupos}
      totalItens={elementos?.length ?? 0}
      limite={(elementos?.length ?? 0) === 500}
      evidenciasCountMap={evidenciasCountMap}
    />
  )
```

por:

```typescript
  return (
    <ChecklistGlobal
      grupos={grupos}
      totalItens={elementos.length}
      limite={(elementosRaw?.length ?? 0) === 500}
      evidenciasCountMap={evidenciasCountMap}
    />
  )
```

(O `limite` continua a olhar para `elementosRaw` — o mesmo raciocínio da Task 2: não
esconder o aviso de limite de 500 só porque o filtro por tipo reduziu a contagem
visível.)

- [ ] **Step 5: Ativar o filtro no `MobileFilters`**

Substitui:

```typescript
          <MobileFilters
            apartamentos={apartamentos}
            fases={fases}
            divisoes={divisoes}
            showAp
            showStatus
            showSearch
          />
```

por:

```typescript
          <MobileFilters
            apartamentos={apartamentos}
            fases={fases}
            divisoes={divisoes}
            showAp
            showStatus
            showSearch
            showTipoFilter
          />
```

- [ ] **Step 6: Verificar build**

```bash
npm run build
```

Esperado: build sem erros de TypeScript.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(app)/checklist/page.tsx"
git commit -m "feat: aplicar filtro Tipo de Divisão na Checklist global (mobile)"
```

---

### Task 6: Deploy e verificação final

**Files:** nenhum (só comandos)

- [ ] **Step 1: Push do repositório desktop**

```bash
cd obra-cabanas-app
git push origin main
```

- [ ] **Step 2: Push do repositório mobile**

```bash
cd cabanas-mobile
git push origin main
```

- [ ] **Step 3: Confirmar os dois deploys no Vercel**

Ambos os pushes despoletam deploy automático (CI/CD via GitHub Integration). Confirma
que `obra-cabanas.vercel.app` e `cabanas-mobile.vercel.app` terminaram o deploy com
sucesso (usa as ferramentas MCP do Vercel — `list_deployments`/`get_deployment` — tal
como foi feito na feature anterior, com os projectId/teamId já conhecidos:
`prj_oZRdE4TToeMdidycIpYc2nlwyVNI` / `prj_s76lJDIk77PijtNmuymAb1QluJGv`,
`team_iCZ8qTkXtdMWAgj1wxgDIgnn`).

- [ ] **Step 4: Pedir ao Miguel para validar em produção**

Abrir `/checklist` em cada app, escolher Tipo de Divisão = WC (ou Suite/Quarto),
confirmar que só aparecem grupos de divisões desse tipo, em todos os apartamentos, e
que combinar com o filtro de Fase/Estado/AP continua a funcionar como esperado.
