# Consulta Cruzada + Fix Delete Evidências — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir o bug de RLS que impede apagar evidências (fotos/observações) na
app mobile, e construir uma nova página `/relatorio/consulta` na app desktop que
permite responder a perguntas do tipo "lista das WC com o teto pintado" — uma consulta
cruzada por tipo de divisão + fase + estado, em todos os apartamentos, com exportação
para PDF.

**Architecture:** Fix 1 é só uma migration Postgres (3 políticas RLS de `DELETE`) — a
Server Action e a UI já existem e estão corretas. Fix 2 é uma nova rota Next.js
server-rendered, seguindo o padrão já estabelecido em `/checklist` e `/relatorio`
(filtros via `searchParams`, agregação em memória, export via rota HTML imprimível).

**Tech Stack:** Next.js 16 App Router + TypeScript + Supabase (Postgres/RLS) — nenhuma
dependência nova.

## Global Constraints

- Este repositório **não tem framework de testes unitários** (só Playwright e2e,
  configurado em `test:e2e` — o Miguel reportou que abrir localhost crasha o
  computador dele, por isso **não corras `npm run dev` nem Playwright** neste plano).
  A verificação de cada tarefa de código é `npm run build` (type-check estrito do
  Next.js) — mesma convenção já usada nas features anteriores deste projeto.
- PT-PT em toda a UI e strings visíveis; inglês no código. Sem `any`.
- Server Components por defeito; Client Components só onde há estado/interação
  (`'use client'` explícito).
- A migration desta tarefa aplica-se a uma **base de dados de produção partilhada**
  pelas apps `obra-cabanas-app` e `cabanas-mobile`. Confirma com o Miguel
  imediatamente antes de correr o passo que aplica a migration — não avances
  automaticamente só por causa da aprovação geral da spec.
- Projeto Supabase esperado: `larfdydhlbqupmllxunq` (confirmar via
  `mcp__supabase__list_projects` antes de usar).
- Todos os commits ficam no repositório `obra-cabanas-app` (é onde vivem as
  migrations canónicas e a nova página — a `cabanas-mobile` não precisa de nenhuma
  alteração de código, só beneficia da migration).

---

### Task 1: Fix RLS — permitir apagar evidências/fotos (mobile)

**Files:**
- Create: `obra-cabanas-app/supabase/migrations/0010_evidencias_delete_policies.sql`

**Interfaces:**
- Consumes: nada (schema puro)
- Produces: políticas RLS de `DELETE` nas tabelas `item_evidencias`,
  `evidencia_fotos`, e no bucket `evidencias` de `storage.objects`. Nenhum código
  TypeScript depende disto — a Server Action `apagarEvidencia` em
  `cabanas-mobile/src/app/actions/evidencias.ts` já assume que estas políticas
  existem.

- [ ] **Step 1: Escrever a migration**

```sql
-- Corrige bug: apagar evidências/fotos falhava silenciosamente porque a migration
-- 0009 só criou políticas de SELECT e INSERT. Sem política de DELETE, o Postgres
-- nega a operação silenciosamente (0 linhas afetadas, sem erro) — por isso o botão
-- "Apagar registo" na mobile parecia funcionar mas o registo reaparecia.
CREATE POLICY "autenticados podem apagar evidencias" ON item_evidencias
  FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "autenticados podem apagar fotos" ON evidencia_fotos
  FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "autenticados podem apagar evidencias storage" ON storage.objects
  FOR DELETE USING (bucket_id = 'evidencias' AND auth.role() = 'authenticated');
```

- [ ] **Step 2: Confirmar o project_id do Supabase**

Chama `mcp__supabase__list_projects` e confirma que existe um projeto com
`id = "larfdydhlbqupmllxunq"`. Usa esse `project_id` nos passos seguintes.

- [ ] **Step 3: CONFIRMAR COM O MIGUEL antes de continuar**

Esta migration altera a base de dados de produção partilhada pelas duas apps.
Pergunta explicitamente antes de avançar para o Step 4 — mesmo que a spec já tenha
sido aprovada, a aplicação da migration em si precisa de confirmação imediatamente
antes de correr.

- [ ] **Step 4: Aplicar a migration**

Usa `mcp__supabase__apply_migration` com `project_id` do Step 2, `name:
"evidencias_delete_policies"`, e o conteúdo SQL do Step 1.

- [ ] **Step 5: Verificar que as 3 políticas foram criadas**

Usa `mcp__supabase__execute_sql` com `project_id` do Step 2 e esta query:

```sql
select schemaname, tablename, policyname, cmd
from pg_policies
where policyname in (
  'autenticados podem apagar evidencias',
  'autenticados podem apagar fotos',
  'autenticados podem apagar evidencias storage'
);
```

Esperado: 3 linhas devolvidas, todas com `cmd = 'DELETE'`.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0010_evidencias_delete_policies.sql
git commit -m "fix: adicionar políticas RLS de DELETE para evidências (fotos/observações)

Sem estas políticas o Postgres negava o DELETE silenciosamente (0 linhas
afetadas, sem erro), fazendo o botão 'Apagar registo' na mobile parecer
funcionar mas o registo reaparecia no próximo carregamento."
```

---

### Task 2: Categorização de divisões por tipo (`tipoDivisao`)

**Files:**
- Modify: `obra-cabanas-app/src/lib/utils.ts`

**Interfaces:**
- Consumes: nada
- Produces:
  - `export const TIPOS_DIVISAO: readonly string[]` — lista fixa de categorias
  - `export type TipoDivisao = typeof TIPOS_DIVISAO[number]`
  - `export function tipoDivisao(nome: string): TipoDivisao`
  - Usado por Task 3 (`build-resultado.ts`), Task 4 (`consulta-filters.tsx`) e
    Task 5/6 (page.tsx / export route)

- [ ] **Step 1: Adicionar a função a `utils.ts`**

Insere isto imediatamente antes da função `sortElementos` existente (depois de
`divisaoSortPriority`):

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

Cria `obra-cabanas-app/scratch-verify-tipo-divisao.ts` (ficheiro temporário, NÃO
committed) com todos os 27 nomes de divisão reais conhecidos (extraídos da migration
de seed):

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
cd obra-cabanas-app
node scratch-verify-tipo-divisao.ts
```

Esperado: `OK: 27 casos passaram` (um aviso `MODULE_TYPELESS_PACKAGE_JSON` do Node
pode aparecer antes da linha — é inofensivo, ignora).

Se houver falhas, ajusta a função `tipoDivisao` no Step 1 e repete este step até
passar.

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
git commit -m "feat: adicionar tipoDivisao() para categorizar divisões por tipo de compartimento

Agrupa variantes (WC Suite 1, WC de Serviço, WC(Suite Principal)...) numa
única categoria WC, para permitir consultas cruzadas por tipo de divisão."
```

---

### Task 3: Módulo puro de agregação (`build-resultado.ts`)

**Files:**
- Create: `obra-cabanas-app/src/app/(app)/relatorio/consulta/_lib/build-resultado.ts`

**Interfaces:**
- Consumes: `tipoDivisao`, `divisaoSortPriority`, `type TipoDivisao` de
  `@/lib/utils` (produzidos na Task 2 e já existentes)
- Produces:
  - `export type EstadoFiltro = 'completo' | 'incompleto' | 'todos'`
  - `export type ElementoConsulta = { concluido: boolean; apartamento_id: number; divisao_id: number; divisoes: { nome: string } | null; apartamentos: { codigo: string } | null }`
  - `export type ResultadoRow = { apartamentoId: number; apCodigo: string; divisaoId: number; divisaoNome: string; total: number; concluidos: number; estado: 'Completo' | 'Incompleto' }`
  - `export function buildResultado(elementos: ElementoConsulta[], tipo: TipoDivisao, estadoFiltro: EstadoFiltro): ResultadoRow[]`
  - Usado por Task 5 (`page.tsx`) e Task 6 (`export/route.ts`)

- [ ] **Step 1: Criar o ficheiro**

```typescript
import { tipoDivisao, divisaoSortPriority, type TipoDivisao } from '@/lib/utils'

export type EstadoFiltro = 'completo' | 'incompleto' | 'todos'

export type ElementoConsulta = {
  concluido: boolean
  apartamento_id: number
  divisao_id: number
  divisoes: { nome: string } | null
  apartamentos: { codigo: string } | null
}

export type ResultadoRow = {
  apartamentoId: number
  apCodigo: string
  divisaoId: number
  divisaoNome: string
  total: number
  concluidos: number
  estado: 'Completo' | 'Incompleto'
}

// Agrega elementos por (apartamento, divisão) para o tipo de divisão escolhido,
// calculando se essa divisão está 100% concluída nessa fase — evita mostrar uma
// linha por item individual (uma WC tem ~7 itens de teto), que seria ruído para
// perguntas do tipo "que WC já têm o teto pintado".
export function buildResultado(
  elementos: ElementoConsulta[],
  tipo: TipoDivisao,
  estadoFiltro: EstadoFiltro,
): ResultadoRow[] {
  const map = new Map<string, ResultadoRow>()

  for (const el of elementos) {
    if (!el.divisoes || tipoDivisao(el.divisoes.nome) !== tipo) continue
    const key = `${el.apartamento_id}__${el.divisao_id}`
    if (!map.has(key)) {
      map.set(key, {
        apartamentoId: el.apartamento_id,
        apCodigo: el.apartamentos?.codigo ?? `AP${el.apartamento_id}`,
        divisaoId: el.divisao_id,
        divisaoNome: el.divisoes.nome,
        total: 0,
        concluidos: 0,
        estado: 'Incompleto',
      })
    }
    const row = map.get(key)!
    row.total++
    if (el.concluido) row.concluidos++
  }

  const rows: ResultadoRow[] = Array.from(map.values()).map(r => ({
    ...r,
    estado: (r.total > 0 && r.concluidos === r.total ? 'Completo' : 'Incompleto') as 'Completo' | 'Incompleto',
  }))

  const filtrados = estadoFiltro === 'todos'
    ? rows
    : rows.filter(r => r.estado === (estadoFiltro === 'completo' ? 'Completo' : 'Incompleto'))

  return filtrados.sort((a, b) => {
    if (a.apartamentoId !== b.apartamentoId) return a.apartamentoId - b.apartamentoId
    return divisaoSortPriority(a.divisaoNome) - divisaoSortPriority(b.divisaoNome)
  })
}
```

- [ ] **Step 2: Verificação manual do caso de exemplo**

Não há test runner neste repo (ver Global Constraints) — a verificação aqui é
lógica, não executada. Confirma manualmente que, para este input:

```typescript
const elementos: ElementoConsulta[] = [
  { concluido: true, apartamento_id: 1, divisao_id: 10, divisoes: { nome: 'WC (Suite 1)' }, apartamentos: { codigo: 'AP1' } },
  { concluido: true, apartamento_id: 1, divisao_id: 10, divisoes: { nome: 'WC (Suite 1)' }, apartamentos: { codigo: 'AP1' } },
  { concluido: false, apartamento_id: 2, divisao_id: 20, divisoes: { nome: 'WC de Serviço' }, apartamentos: { codigo: 'AP2' } },
  { concluido: true, apartamento_id: 2, divisao_id: 20, divisoes: { nome: 'WC de Serviço' }, apartamentos: { codigo: 'AP2' } },
]
buildResultado(elementos, 'WC', 'completo')
```

o resultado esperado é **uma única linha**: `{ apCodigo: 'AP1', divisaoNome: 'WC (Suite 1)', total: 2, concluidos: 2, estado: 'Completo' }` — a linha do AP2 fica de fora porque `concluidos (1) !== total (2)`, logo `estado = 'Incompleto'`, e o filtro pedido é `'completo'`.

Com `estadoFiltro = 'todos'` devolveria as duas linhas, ordenadas por
`apartamentoId` (AP1 antes de AP2).

- [ ] **Step 3: Verificar build**

```bash
npm run build
```

Esperado: build sem erros de TypeScript (confirma que os tipos batem certo com o
que a Task 2 exportou).

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/relatorio/consulta/_lib/build-resultado.ts"
git commit -m "feat: agregação pura por (apartamento, divisão) para a consulta cruzada"
```

---

### Task 4: Filtros da consulta (`ConsultaFilters`)

**Files:**
- Create: `obra-cabanas-app/src/app/(app)/relatorio/consulta/_components/consulta-filters.tsx`

**Interfaces:**
- Consumes: `TIPOS_DIVISAO` de `@/lib/utils` (Task 2); `Select`, `SelectContent`,
  `SelectItem`, `SelectTrigger`, `SelectValue` de `@/components/ui/select`
  (já existentes, ver `checklist-filters.tsx` para o padrão)
- Produces: `export function ConsultaFilters({ fases }: { fases: { id: number; label: string }[] }): JSX.Element` — client component que lê/escreve `tipo`, `fase`, `estado` em `searchParams`. Usado por Task 5 (`page.tsx`).

- [ ] **Step 1: Criar o componente**

```tsx
'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { TIPOS_DIVISAO } from '@/lib/utils'

interface FaseOption {
  id: number
  label: string
}

interface Props {
  fases: FaseOption[]
}

export function ConsultaFilters({ fases }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value === null) params.delete(key)
      else params.set(key, value)
      startTransition(() => router.replace(`${pathname}?${params.toString()}`))
    },
    [router, pathname, searchParams]
  )

  const tipo = searchParams.get('tipo') ?? undefined
  const fase = searchParams.get('fase') ?? undefined
  const estado = searchParams.get('estado') ?? 'completo'

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <Select value={tipo} onValueChange={(v: string | null) => { if (v) setParam('tipo', v) }}>
        <SelectTrigger className="w-[160px]">
          <SelectValue>
            {tipo ?? <span className="text-muted-foreground">Tipo de Divisão</span>}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {TIPOS_DIVISAO.map(t => (
            <SelectItem key={t} value={t}>{t}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={fase} onValueChange={(v: string | null) => { if (v) setParam('fase', v) }}>
        <SelectTrigger className="w-[160px]">
          <SelectValue>
            {fase
              ? (fases.find(f => String(f.id) === fase)?.label ?? 'Fase')
              : <span className="text-muted-foreground">Fase</span>}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {fases.map(f => (
            <SelectItem key={f.id} value={String(f.id)}>{f.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={estado} onValueChange={(v: string | null) => { if (v) setParam('estado', v) }}>
        <SelectTrigger className="w-[140px]">
          <SelectValue>
            {estado === 'incompleto' ? 'Incompleto' : estado === 'todos' ? 'Todos' : 'Completo'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="completo">Completo</SelectItem>
          <SelectItem value="incompleto">Incompleto</SelectItem>
          <SelectItem value="todos">Todos</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
```

- [ ] **Step 2: Verificar build**

```bash
npm run build
```

Esperado: build sem erros de TypeScript.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/relatorio/consulta/_components/consulta-filters.tsx"
git commit -m "feat: filtros de tipo de divisão, fase e estado para a consulta cruzada"
```

---

### Task 5: Página `/relatorio/consulta`

**Files:**
- Create: `obra-cabanas-app/src/app/(app)/relatorio/consulta/page.tsx`

**Interfaces:**
- Consumes:
  - `buildResultado`, `type ElementoConsulta`, `type EstadoFiltro` de
    `./_lib/build-resultado` (Task 3)
  - `TIPOS_DIVISAO`, `type TipoDivisao` de `@/lib/utils` (Task 2)
  - `ConsultaFilters` de `./_components/consulta-filters` (Task 4)
  - `PageHeader`, `EmptyState` de `@/components/layout` (já existentes)
  - `Button` de `@/components/ui/button` (já existente)
  - `createClient` de `@/lib/supabase/server` (já existente)
- Produces: rota `/relatorio/consulta`, consumida pela Task 7 (link na sidebar) e
  pela Task 6 (o botão "Exportar" aponta para `/relatorio/consulta/export`)

- [ ] **Step 1: Criar `page.tsx`**

```tsx
import { Suspense } from 'react'
import { FileDown, ListChecks } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ConsultaFilters } from './_components/consulta-filters'
import { buildResultado } from './_lib/build-resultado'
import type { ElementoConsulta, EstadoFiltro } from './_lib/build-resultado'
import { TIPOS_DIVISAO, type TipoDivisao } from '@/lib/utils'
import { PageHeader, EmptyState } from '@/components/layout'
import { Button } from '@/components/ui/button'

interface Props {
  searchParams: Promise<{ tipo?: string; fase?: string; estado?: string }>
}

function parseEstado(v: string | undefined): EstadoFiltro {
  return v === 'incompleto' || v === 'todos' ? v : 'completo'
}

async function ConsultaResultado({ searchParams }: Props) {
  const params = await searchParams
  const tipoParam = params.tipo
  const tipo: TipoDivisao | null =
    tipoParam && (TIPOS_DIVISAO as readonly string[]).includes(tipoParam)
      ? (tipoParam as TipoDivisao)
      : null
  const faseId = params.fase ? Number(params.fase) : null
  const estado = parseEstado(params.estado)

  if (!tipo || !faseId) {
    return (
      <EmptyState
        icon={ListChecks}
        title="Escolhe um tipo de divisão e uma fase"
        description="A tabela aparece depois de escolheres os dois filtros."
      />
    )
  }

  const supabase = await createClient()
  const { data } = await supabase
    .from('elementos')
    .select('concluido, apartamento_id, divisao_id, divisoes(nome), apartamentos(codigo)')
    .eq('fase_id', faseId)
    .not('divisao_id', 'is', null)

  const elementos = (data ?? []) as ElementoConsulta[]
  const linhas = buildResultado(elementos, tipo, estado)

  if (linhas.length === 0) {
    return (
      <EmptyState
        icon={ListChecks}
        title="Nenhum resultado"
        description="Não há divisões deste tipo que correspondam ao filtro de estado escolhido."
      />
    )
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 border-b">
          <tr>
            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Apartamento</th>
            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Divisão</th>
            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Concluídos/Total</th>
            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {linhas.map(l => (
            <tr key={`${l.apartamentoId}__${l.divisaoId}`}>
              <td className="px-4 py-2.5">{l.apCodigo}</td>
              <td className="px-4 py-2.5">{l.divisaoNome}</td>
              <td className="px-4 py-2.5">{l.concluidos}/{l.total}</td>
              <td className="px-4 py-2.5">
                <span className={l.estado === 'Completo' ? 'text-green-700' : 'text-amber-700'}>
                  {l.estado}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default async function ConsultaPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: fasesData } = await supabase.from('fases').select('id, nome').order('ordem')
  const fases = (fasesData ?? []).map(f => ({ id: f.id, label: f.nome }))

  const params = await searchParams
  const exportQuery = new URLSearchParams(
    Object.entries(params).filter((e): e is [string, string] => Boolean(e[1]))
  ).toString()

  return (
    <div>
      <PageHeader
        title="Consulta"
        description="Filtra por tipo de divisão, fase e estado, em todos os apartamentos"
        actions={
          <Button
            size="sm"
            render={<a href={`/relatorio/consulta/export?${exportQuery}`} target="_blank" rel="noopener noreferrer" />}
          >
            <FileDown className="h-4 w-4" />
            Exportar
          </Button>
        }
      />

      <div className="mb-4">
        <Suspense>
          <ConsultaFilters fases={fases} />
        </Suspense>
      </div>

      <Suspense fallback={<p className="text-sm text-muted-foreground py-4">A carregar…</p>}>
        <ConsultaResultado searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
```

- [ ] **Step 2: Verificar build**

```bash
npm run build
```

Esperado: build sem erros de TypeScript. Presta atenção especial a erros de tipo em
`(TIPOS_DIVISAO as readonly string[]).includes(tipoParam)` — se o TypeScript
reclamar, é porque `tipoParam` pode ser `undefined`; o `tipoParam &&` antes já trata
disso, mas confirma que o build passa mesmo assim.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/relatorio/consulta/page.tsx"
git commit -m "feat: página /relatorio/consulta com query builder e tabela agregada"
```

---

### Task 6: Rota de exportação (`/relatorio/consulta/export`)

**Files:**
- Create: `obra-cabanas-app/src/app/(app)/relatorio/consulta/export/route.ts`

**Interfaces:**
- Consumes: `buildResultado`, `type ElementoConsulta`, `type EstadoFiltro` de
  `../_lib/build-resultado` (Task 3); `TIPOS_DIVISAO`, `type TipoDivisao` de
  `@/lib/utils` (Task 2); `createClient` de `@/lib/supabase/server`
- Produces: `GET` handler em `/relatorio/consulta/export`, consumido pelo botão
  "Exportar" da Task 5

- [ ] **Step 1: Criar `route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildResultado } from '../_lib/build-resultado'
import type { ElementoConsulta, EstadoFiltro } from '../_lib/build-resultado'
import { TIPOS_DIVISAO, type TipoDivisao } from '@/lib/utils'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Não autorizado', { status: 401 })

  const tipoParam = request.nextUrl.searchParams.get('tipo')
  const tipo: TipoDivisao | null =
    tipoParam && (TIPOS_DIVISAO as readonly string[]).includes(tipoParam)
      ? (tipoParam as TipoDivisao)
      : null
  if (!tipo) return new NextResponse('Parâmetro tipo inválido', { status: 400 })

  const faseParam = request.nextUrl.searchParams.get('fase')
  const faseId = faseParam ? Number(faseParam) : NaN
  if (isNaN(faseId)) return new NextResponse('Parâmetro fase inválido', { status: 400 })

  const estadoParam = request.nextUrl.searchParams.get('estado')
  const estado: EstadoFiltro = estadoParam === 'incompleto' || estadoParam === 'todos' ? estadoParam : 'completo'

  const [{ data: elementosData }, { data: faseData }] = await Promise.all([
    supabase
      .from('elementos')
      .select('concluido, apartamento_id, divisao_id, divisoes(nome), apartamentos(codigo)')
      .eq('fase_id', faseId)
      .not('divisao_id', 'is', null),
    supabase.from('fases').select('nome').eq('id', faseId).single(),
  ])

  const elementos = (elementosData ?? []) as ElementoConsulta[]
  const linhas = buildResultado(elementos, tipo, estado)
  const faseNome = faseData?.nome ?? `Fase ${faseId}`

  const geradoEm = new Date().toLocaleDateString('pt-PT', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const linhasHtml = linhas.length > 0
    ? linhas.map(l => `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${esc(l.apCodigo)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${esc(l.divisaoNome)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${l.concluidos}/${l.total}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:${l.estado === 'Completo' ? '#15803d' : '#b45309'}">${esc(l.estado)}</td>
      </tr>`).join('')
    : `<tr><td colspan="4" style="padding:24px;text-align:center;color:#9ca3af">Nenhum resultado.</td></tr>`

  const html = `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Consulta — ${esc(tipo)} — ${esc(faseNome)} — Obra Cabanas</title>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;line-height:1.5;color:#111827;background:#fff;padding:2rem;max-width:860px;margin:0 auto}
    table{width:100%;border-collapse:collapse}
    th{text-align:left;padding:8px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;border-bottom:2px solid #e5e7eb}
    @media print{body{padding:1rem}}
  </style>
</head>
<body>
  <div style="padding-bottom:20px;border-bottom:1px solid #e5e7eb;margin-bottom:20px">
    <h1 style="font-size:22px;font-weight:700;letter-spacing:-.025em">Consulta — Obra Cabanas</h1>
    <p style="color:#6b7280;font-size:13px;margin-top:4px">
      Tipo: <strong>${esc(tipo)}</strong> · Fase: <strong>${esc(faseNome)}</strong> · Estado: <strong>${esc(estado)}</strong>
    </p>
    <p style="color:#6b7280;font-size:13px;margin-top:2px">Gerado em <strong>${esc(geradoEm)}</strong></p>
  </div>
  <table>
    <thead>
      <tr>
        <th>Apartamento</th><th>Divisão</th><th>Concluídos/Total</th><th>Estado</th>
      </tr>
    </thead>
    <tbody>${linhasHtml}</tbody>
  </table>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="consulta-${tipo.toLowerCase().replace(/\s+/g, '-')}.html"`,
    },
  })
}
```

- [ ] **Step 2: Verificar build**

```bash
npm run build
```

Esperado: build sem erros de TypeScript.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/relatorio/consulta/export/route.ts"
git commit -m "feat: exportação HTML/PDF da consulta cruzada"
```

---

### Task 7: Ligação na navegação (sidebar)

**Files:**
- Modify: `obra-cabanas-app/src/components/layout/app-sidebar.tsx:1-29`

**Interfaces:**
- Consumes: rota `/relatorio/consulta` (Task 5)
- Produces: item de navegação visível para todos os utilizadores (não é admin-only)

- [ ] **Step 1: Adicionar o import do ícone**

Em `app-sidebar.tsx:2-5`, adiciona `Search` à lista de imports do `lucide-react`:

```typescript
import {
  LayoutDashboard, Building2, ListChecks, GanttChartSquare,
  KanbanSquare, BarChart3, Users, FileClock, User, BookOpen, PlusSquare, Search, LucideIcon,
} from 'lucide-react'
```

- [ ] **Step 2: Adicionar a entrada no array `NAV`**

Em `app-sidebar.tsx:20-29`, adiciona a entrada logo a seguir a `/gerir-itens`:

```typescript
const NAV: { href: string; label: string; icon: LucideIcon; exact?: boolean }[] = [
  { href: '/guia', label: 'Guia', icon: BookOpen },
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/apartamentos', label: 'Apartamentos', icon: Building2 },
  { href: '/checklist', label: 'Checklist', icon: ListChecks },
  { href: '/gerir-itens', label: 'Gerir Itens', icon: PlusSquare },
  { href: '/relatorio/consulta', label: 'Consulta', icon: Search },
  { href: '/gantt', label: 'Gantt', icon: GanttChartSquare },
  { href: '/kanban', label: 'Kanban', icon: KanbanSquare },
  { href: '/lob', label: 'LoB', icon: BarChart3 },
]
```

- [ ] **Step 3: Verificar build**

```bash
npm run build
```

Esperado: build sem erros de TypeScript.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/app-sidebar.tsx
git commit -m "feat: adicionar 'Consulta' à navegação principal"
```

---

### Task 8: Deploy e verificação final

**Files:** nenhum (só comandos)

- [ ] **Step 1: Push para o repositório remoto**

```bash
git push origin main
```

- [ ] **Step 2: Confirmar deploy no Vercel**

O push despoleta deploy automático (CI/CD via GitHub Integration, já configurado —
ver `obra-cabanas-app/CLAUDE.md` secção Deploy). Confirma no dashboard do Vercel
(ou pergunta ao Miguel) que o deploy de `obra-cabanas.vercel.app` terminou com
sucesso.

- [ ] **Step 3: Pedir ao Miguel para validar em produção**

Como o Playwright/localhost crasha o computador dele, a validação funcional final
é manual, no site de produção:
1. Abrir `obra-cabanas.vercel.app/relatorio/consulta`, escolher Tipo="WC",
   Fase="Pintura Teto" (ou a fase de teto equivalente), Estado="Completo", e
   confirmar que a tabela mostra só WCs 100% concluídas nessa fase.
2. Clicar "Exportar" e confirmar que abre/descarrega um HTML com a mesma tabela.
3. Na mobile (`cabanas-mobile.vercel.app`), abrir uma evidência já existente com
   foto ou observação, clicar "Apagar registo", confirmar, fechar a sheet, reabrir
   o elemento e confirmar que o registo **não reaparece**.
