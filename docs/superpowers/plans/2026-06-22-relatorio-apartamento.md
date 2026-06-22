# Relatório por Apartamento — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar um relatório por apartamento à app desktop que mostra apenas itens em falta e itens concluídos com observações (notas ou fotos), gerado como página HTML limpa com export para PDF via `window.print()`. Inclui também fix de ordenação dos itens de checklist nas páginas existentes.

**Architecture:** Server Component em `/relatorio?ap={id}` que faz fetch dos dados no servidor e renderiza a página completa. Filtro client-side descarta itens limpos. Lightbox custom em React gerido dentro de `FotoGrid`. Print via `window.print()` disparado por um client component que lê `?print=1`.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS, shadcn/ui, Supabase `@supabase/ssr`

## Global Constraints

- PT-PT em toda a UI. Código e comentários em inglês.
- Sem dependências npm novas — usar shadcn/ui existente e Lucide icons.
- Server Components por defeito; `'use client'` só quando necessário (estado, efeito, evento).
- Sem `any` — usar `unknown` + type narrowing se necessário.
- `npm run build` deve passar sem erros antes de qualquer commit.
- Supabase client: `createClient` do `@/lib/supabase/server` nos Server Components.

---

## Mapa de ficheiros

**Criar:**
- `src/app/(app)/relatorio/page.tsx` — Server Component principal
- `src/app/(app)/relatorio/_components/relatorio-header.tsx` — cabeçalho com datas e stats
- `src/app/(app)/relatorio/_components/relatorio-divisao.tsx` — secção por divisão
- `src/app/(app)/relatorio/_components/foto-grid.tsx` — grelha de fotos (client)
- `src/app/(app)/relatorio/_components/lightbox.tsx` — overlay fullscreen (client)
- `src/app/(app)/relatorio/_components/print-trigger.tsx` — dispara `window.print()` (client)
- `e2e/relatorio.spec.ts` — teste Playwright

**Modificar:**
- `src/lib/utils.ts` — adicionar `sortElementos`
- `src/app/(app)/apartamentos/[id]/page.tsx` — aplicar `sortElementos` + botões relatório
- `src/app/(app)/checklist/page.tsx` — aplicar `sortElementos`

---

## Task 1: `sortElementos` — ordenação dos itens de checklist

**Files:**
- Modify: `src/lib/utils.ts`
- Modify: `src/app/(app)/apartamentos/[id]/page.tsx:86-106`
- Modify: `src/app/(app)/checklist/page.tsx:89-105`

**Interfaces:**
- Produces: `sortElementos<T extends { elemento: string; fase_id: number; sub_elemento: string | null }>(items: T[]): T[]`

---

- [ ] **Step 1: Adicionar `sortElementos` a `utils.ts`**

Abre `src/lib/utils.ts`. Acrescenta no fim do ficheiro:

```typescript
const ELEMENTO_ORDER: Record<string, number> = {
  Teto: 0, Paredes: 1, Chão: 2, Rodapé: 3,
}

const SUB_ELEMENTO_ORDER: Record<string, number> = {
  Primário: 10, Extracoat: 20, '1ª demão': 30, '2ª demão': 40,
}

export function sortElementos<T extends {
  elemento: string
  fase_id: number
  sub_elemento: string | null
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

- [ ] **Step 2: Aplicar `sortElementos` em `apartamentos/[id]/page.tsx`**

Adicionar import no topo do ficheiro (junto ao `sanitizeIlikePattern`):

```typescript
import { sanitizeIlikePattern, sortElementos } from '@/lib/utils'
```

Localizar a linha 106 onde `groups` é construído e substituir:

```typescript
// ANTES (linha 106):
const groups = Array.from(groupMap.values())

// DEPOIS:
const groups = Array.from(groupMap.values()).map(g => ({
  ...g,
  items: sortElementos(g.items),
}))
```

- [ ] **Step 3: Aplicar `sortElementos` em `checklist/page.tsx`**

Adicionar import no topo (junto ao `sanitizeIlikePattern`):

```typescript
import { sanitizeIlikePattern, sortElementos } from '@/lib/utils'
```

Localizar a linha 105 e substituir:

```typescript
// ANTES (linha 105):
const groups = Array.from(groupMap.values())

// DEPOIS:
const groups = Array.from(groupMap.values()).map(g => ({
  ...g,
  items: sortElementos(g.items),
}))
```

- [ ] **Step 4: Verificar build**

```bash
cd obra-cabanas-app
npm run build
```

Esperado: build sem erros de TypeScript.

- [ ] **Step 5: Verificar visualmente**

Arrancar o servidor (`npm run dev`) e navegar para `/apartamentos/1`. Confirmar que dentro de cada divisão os itens seguem a ordem: Teto → Paredes → Chão → Rodapé, e dentro de Teto: sem sub_elemento antes de Primário → Extracoat → 1ª demão → 2ª demão.

- [ ] **Step 6: Commit**

```bash
git add src/lib/utils.ts src/app/(app)/apartamentos/[id]/page.tsx src/app/(app)/checklist/page.tsx
git commit -m "feat: add sortElementos and apply to checklist pages"
```

---

## Task 2: `Lightbox` + `FotoGrid` — componentes de visualização de fotos

**Files:**
- Create: `src/app/(app)/relatorio/_components/lightbox.tsx`
- Create: `src/app/(app)/relatorio/_components/foto-grid.tsx`

**Interfaces:**
- `Lightbox` props: `{ url: string; onClose: () => void }`
- `FotoGrid` props: `{ fotos: Array<{ id: string; url_publica: string }> }`
- `FotoGrid` renders `<Lightbox>` internamente quando uma foto está activa.

---

- [ ] **Step 1: Criar pasta de componentes**

```bash
mkdir -p obra-cabanas-app/src/app/\(app\)/relatorio/_components
```

- [ ] **Step 2: Criar `lightbox.tsx`**

```typescript
'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'

interface Props {
  url: string
  onClose: () => void
}

export function Lightbox({ url, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[300] bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        type="button"
        aria-label="Fechar foto"
        onClick={onClose}
        className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/20 text-white
          flex items-center justify-center hover:bg-white/30 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
      <img
        src={url}
        alt=""
        className="max-w-[92vw] max-h-[88vh] object-contain rounded"
        onClick={e => e.stopPropagation()}
      />
    </div>
  )
}
```

- [ ] **Step 3: Criar `foto-grid.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { Lightbox } from './lightbox'

interface Props {
  fotos: Array<{ id: string; url_publica: string }>
}

export function FotoGrid({ fotos }: Props) {
  const [activeUrl, setActiveUrl] = useState<string | null>(null)

  return (
    <>
      <div className="ml-7 mt-2 flex flex-wrap gap-1.5 print:gap-2">
        {fotos.map(f => (
          <button
            key={f.id}
            type="button"
            onClick={() => setActiveUrl(f.url_publica)}
            className="w-16 h-16 rounded-lg overflow-hidden border border-border
              hover:opacity-90 transition-opacity print:pointer-events-none"
          >
            <img
              src={f.url_publica}
              alt=""
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>

      {activeUrl && (
        <Lightbox url={activeUrl} onClose={() => setActiveUrl(null)} />
      )}
    </>
  )
}
```

- [ ] **Step 4: Verificar build**

```bash
npm run build
```

Esperado: sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/relatorio/_components/lightbox.tsx src/app/\(app\)/relatorio/_components/foto-grid.tsx
git commit -m "feat: add Lightbox and FotoGrid components for relatorio"
```

---

## Task 3: `PrintTrigger` + `RelatorioHeader`

**Files:**
- Create: `src/app/(app)/relatorio/_components/print-trigger.tsx`
- Create: `src/app/(app)/relatorio/_components/relatorio-header.tsx`

**Interfaces:**
- `PrintTrigger` props: `{ shouldPrint: boolean }`
- `RelatorioHeader` props:
  ```typescript
  {
    ap: { id: number; codigo: string }
    geradoEm: string          // ex: "22 de junho de 2026"
    ultimaAlteracao: string | null
    totalEmFalta: number
    totalObservacao: number
  }
  ```

---

- [ ] **Step 1: Criar `print-trigger.tsx`**

```typescript
'use client'

import { useEffect } from 'react'

interface Props {
  shouldPrint: boolean
}

export function PrintTrigger({ shouldPrint }: Props) {
  useEffect(() => {
    if (!shouldPrint) return
    // Delay to allow images to load before print dialog opens
    const t = setTimeout(() => window.print(), 800)
    return () => clearTimeout(t)
  }, [shouldPrint])

  return null
}
```

- [ ] **Step 2: Criar `relatorio-header.tsx`**

```typescript
import Link from 'next/link'
import { ChevronLeft, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  ap: { id: number; codigo: string }
  geradoEm: string
  ultimaAlteracao: string | null
  totalEmFalta: number
  totalObservacao: number
}

export function RelatorioHeader({
  ap, geradoEm, ultimaAlteracao, totalEmFalta, totalObservacao,
}: Props) {
  return (
    <div className="rounded-lg border bg-card p-5 flex items-start justify-between gap-4
      print:border-gray-300 print:shadow-none">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{ap.codigo} — Cabanas</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gerado em <strong>{geradoEm}</strong>
          {ultimaAlteracao && (
            <> · Última alteração na checklist: <strong>{ultimaAlteracao}</strong></>
          )}
        </p>
        <div className="flex gap-6 mt-3">
          <div>
            <p className="text-2xl font-bold text-red-500">{totalEmFalta}</p>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">
              Em falta
            </p>
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-600">{totalObservacao}</p>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">
              Feitos com observação
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 shrink-0 print:hidden">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/apartamentos/${ap.id}`}>
            <ChevronLeft className="h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <Button size="sm" asChild>
          <a href={`/relatorio?ap=${ap.id}&print=1`} target="_blank">
            <Printer className="h-4 w-4" />
            Exportar PDF
          </a>
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verificar build**

```bash
npm run build
```

Esperado: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/relatorio/_components/print-trigger.tsx src/app/\(app\)/relatorio/_components/relatorio-header.tsx
git commit -m "feat: add PrintTrigger and RelatorioHeader components"
```

---

## Task 4: `RelatorioDivisao` — renderização completa por divisão

**Files:**
- Create: `src/app/(app)/relatorio/_components/relatorio-divisao.tsx`

**Interfaces:**
- Consumes: `FotoGrid` de `./foto-grid`, `sortElementos` de `@/lib/utils`
- Consumes tipos: `DivisaoRelatorio`, `ElementoRelatorio` (definidos neste ficheiro e re-exportados)
- Produces (tipos exportados para `page.tsx`):
  ```typescript
  export type Foto = { id: string; url_publica: string }
  export type Evidencia = {
    id: string; texto: string | null; criado_em: string
    evidencia_fotos: Foto[]
  }
  export type ElementoRelatorio = {
    id: number; elemento: string; sub_elemento: string | null
    concluido: boolean; notas: string | null; fase_id: number
    divisao_id: number
    fases: { nome: string; cor_hex: string } | null
    divisoes: { id: number; nome: string; ordem: number } | null
    item_evidencias: Evidencia[]
  }
  export type DivisaoRelatorio = {
    id: number; nome: string; ordem: number
    emFalta: ElementoRelatorio[]
    comObservacao: ElementoRelatorio[]
  }
  ```

---

- [ ] **Step 1: Criar `relatorio-divisao.tsx`**

```typescript
import { cn } from '@/lib/utils'
import { FotoGrid } from './foto-grid'

export type Foto = { id: string; url_publica: string }
export type Evidencia = {
  id: string
  texto: string | null
  criado_em: string
  evidencia_fotos: Foto[]
}
export type ElementoRelatorio = {
  id: number
  elemento: string
  sub_elemento: string | null
  concluido: boolean
  notas: string | null
  fase_id: number
  divisao_id: number
  fases: { nome: string; cor_hex: string } | null
  divisoes: { id: number; nome: string; ordem: number } | null
  item_evidencias: Evidencia[]
}
export type DivisaoRelatorio = {
  id: number
  nome: string
  ordem: number
  emFalta: ElementoRelatorio[]
  comObservacao: ElementoRelatorio[]
}

interface Props {
  divisao: DivisaoRelatorio
}

export function RelatorioDivisao({ divisao }: Props) {
  const badgeParts = [
    divisao.emFalta.length > 0 ? `${divisao.emFalta.length} em falta` : null,
    divisao.comObservacao.length > 0
      ? `${divisao.comObservacao.length} feito com observação`
      : null,
  ].filter(Boolean).join(' · ')

  return (
    <div className="rounded-lg border bg-card overflow-hidden
      print:break-inside-avoid print:border-gray-300 print:shadow-none">

      {/* Divisão header */}
      <div className="bg-muted/30 px-5 py-2.5 border-b flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {divisao.nome}
        </span>
        <span className="text-xs text-muted-foreground">{badgeParts}</span>
      </div>

      {/* Em falta */}
      {divisao.emFalta.length > 0 && (
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-5 h-5 rounded flex items-center justify-center
              bg-red-100 text-xs font-bold text-red-600">
              {divisao.emFalta.length}
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-red-600">
              Em falta
            </span>
          </div>
          <div className="space-y-2">
            {divisao.emFalta.map(el => (
              <ItemRow key={el.id} el={el} tipo="falta" />
            ))}
          </div>
        </div>
      )}

      {/* Feito com observação */}
      {divisao.comObservacao.length > 0 && (
        <div className={cn('p-4', divisao.emFalta.length > 0 && 'border-t')}>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-5 h-5 rounded flex items-center justify-center
              bg-amber-100 text-xs font-bold text-amber-700">
              {divisao.comObservacao.length}
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
              Feito com observação
            </span>
          </div>
          <div className="space-y-2">
            {divisao.comObservacao.map(el => (
              <ItemRow key={el.id} el={el} tipo="observacao" />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ItemRow({
  el, tipo,
}: {
  el: ElementoRelatorio
  tipo: 'falta' | 'observacao'
}) {
  const allFotos = el.item_evidencias.flatMap(ev => ev.evidencia_fotos)
  const evidenciaNotas = el.item_evidencias
    .map(ev => ev.texto)
    .filter((t): t is string => t !== null && t.length > 0)

  return (
    <div className="py-1">
      {/* Item line */}
      <div className="flex items-center gap-2.5">
        {tipo === 'falta' ? (
          <div className="w-5 h-5 rounded border-2 border-muted-foreground/30 flex-shrink-0" />
        ) : (
          <div className="w-5 h-5 rounded bg-green-600 flex items-center justify-center flex-shrink-0">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
        <span className="text-sm">
          {el.sub_elemento ? (
            <>
              <span className="text-[11px] font-semibold uppercase tracking-wide
                text-muted-foreground mr-1.5">
                {el.elemento} ›
              </span>
              {el.sub_elemento}
            </>
          ) : (
            el.elemento
          )}
        </span>
      </div>

      {/* Direct nota from elementos.notas */}
      {el.notas && (
        <div className="ml-7 mt-1.5 text-sm text-muted-foreground
          bg-amber-50 border-l-2 border-amber-300 pl-2.5 py-1 rounded-r
          print:bg-yellow-50">
          {el.notas}
        </div>
      )}

      {/* Notas from item_evidencias.texto */}
      {evidenciaNotas.map((nota, i) => (
        <div key={i} className="ml-7 mt-1.5 text-sm text-muted-foreground
          bg-amber-50 border-l-2 border-amber-300 pl-2.5 py-1 rounded-r
          print:bg-yellow-50">
          {nota}
        </div>
      ))}

      {/* Fotos */}
      {allFotos.length > 0 && <FotoGrid fotos={allFotos} />}
    </div>
  )
}
```

- [ ] **Step 2: Verificar build**

```bash
npm run build
```

Esperado: sem erros de TypeScript.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/relatorio/_components/relatorio-divisao.tsx
git commit -m "feat: add RelatorioDivisao component with Em falta and Feito com observação groups"
```

---

## Task 5: `relatorio/page.tsx` + print styles + botões na AP page

**Files:**
- Create: `src/app/(app)/relatorio/page.tsx`
- Modify: `src/app/(app)/apartamentos/[id]/page.tsx:1-13,122-132`

**Interfaces:**
- Consumes: todos os componentes das tasks anteriores
- Consumes: tipos `ElementoRelatorio`, `DivisaoRelatorio` de `_components/relatorio-divisao`
- Consumes: `sortElementos` de `@/lib/utils`

---

- [ ] **Step 1: Criar `relatorio/page.tsx`**

```typescript
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { sortElementos } from '@/lib/utils'
import { PrintTrigger } from './_components/print-trigger'
import { RelatorioHeader } from './_components/relatorio-header'
import { RelatorioDivisao } from './_components/relatorio-divisao'
import type {
  ElementoRelatorio,
  DivisaoRelatorio,
} from './_components/relatorio-divisao'

interface Props {
  searchParams: Promise<{ ap?: string; print?: string }>
}

function buildDivisoes(elementos: ElementoRelatorio[]): DivisaoRelatorio[] {
  const map = new Map<number, DivisaoRelatorio>()

  for (const el of sortElementos(elementos)) {
    if (!el.divisao_id || !el.divisoes) continue

    const hasNota = el.notas !== null
    const hasEvidencias = el.item_evidencias.length > 0
    if (el.concluido && !hasNota && !hasEvidencias) continue

    if (!map.has(el.divisao_id)) {
      map.set(el.divisao_id, {
        id: el.divisao_id,
        nome: el.divisoes.nome,
        ordem: el.divisoes.ordem,
        emFalta: [],
        comObservacao: [],
      })
    }
    const div = map.get(el.divisao_id)!
    if (!el.concluido) {
      div.emFalta.push(el)
    } else {
      div.comObservacao.push(el)
    }
  }

  return Array.from(map.values())
    .filter(d => d.emFalta.length > 0 || d.comObservacao.length > 0)
    .sort((a, b) => a.ordem - b.ordem)
}

export default async function RelatorioPage({ searchParams }: Props) {
  const { ap: apParam, print: printParam } = await searchParams
  const apId = Number(apParam)
  if (!apParam || isNaN(apId)) notFound()

  const supabase = await createClient()

  const [apResult, elementosResult, lastModResult] = await Promise.all([
    supabase.from('apartamentos').select('id, codigo').eq('id', apId).single(),
    supabase.from('elementos').select(`
      id, elemento, sub_elemento, concluido, notas, fase_id, divisao_id,
      fases(nome, cor_hex),
      divisoes(id, nome, ordem),
      item_evidencias(
        id, texto, criado_em,
        evidencia_fotos(id, url_publica)
      )
    `).eq('apartamento_id', apId).not('divisao_id', 'is', null),
    supabase.from('elementos')
      .select('updated_at')
      .eq('apartamento_id', apId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single(),
  ])

  const ap = apResult.data
  if (!ap) notFound()

  const elementos = (elementosResult.data ?? []) as ElementoRelatorio[]
  const divisoes = buildDivisoes(elementos)

  const totalEmFalta = divisoes.reduce((s, d) => s + d.emFalta.length, 0)
  const totalObservacao = divisoes.reduce((s, d) => s + d.comObservacao.length, 0)

  const fmt = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString('pt-PT', {
          day: 'numeric', month: 'long', year: 'numeric',
        })
      : null

  const geradoEm = new Date().toLocaleDateString('pt-PT', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  const ultimaAlteracao = fmt(lastModResult.data?.updated_at ?? null)

  return (
    <>
      {/* Hide sidebar and adjust main padding in print */}
      <style>{`
        @media print {
          aside, [data-sidebar] { display: none !important; }
          main { padding: 1rem !important; }
        }
      `}</style>

      <PrintTrigger shouldPrint={printParam === '1'} />

      <div className="max-w-3xl space-y-5">
        <RelatorioHeader
          ap={ap}
          geradoEm={geradoEm}
          ultimaAlteracao={ultimaAlteracao}
          totalEmFalta={totalEmFalta}
          totalObservacao={totalObservacao}
        />

        <div className="space-y-4">
          {divisoes.map(d => (
            <RelatorioDivisao key={d.id} divisao={d} />
          ))}
          {divisoes.length === 0 && (
            <p className="text-sm text-muted-foreground py-12 text-center">
              Nenhuma ocorrência registada. Todos os itens estão concluídos sem observações.
            </p>
          )}
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Verificar que o `AppSidebar` usa `<aside>` ou `data-sidebar`**

Abrir `src/components/layout/app-sidebar.tsx` e confirmar qual o elemento raiz do componente. Se for `<aside>` o CSS de print já funciona. Se for `<div>`, adicionar `data-sidebar=""` como prop ao elemento raiz do sidebar e confirmar que o CSS o apanha.

- [ ] **Step 3: Adicionar botões "Ver Relatório" e "Exportar PDF" em `apartamentos/[id]/page.tsx`**

Adicionar imports no topo do ficheiro (junto aos existentes):

```typescript
import { FileText, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
```

Substituir o bloco `actions` do `PageHeader` (linhas 125–129):

```typescript
// ANTES:
actions={
  <Badge variant="secondary" className="text-sm">
    {Math.round(pct)}%
  </Badge>
}

// DEPOIS:
actions={
  <div className="flex items-center gap-2">
    <Badge variant="secondary" className="text-sm">
      {Math.round(pct)}%
    </Badge>
    <Button variant="outline" size="sm" asChild>
      <a href={`/relatorio?ap=${ap.id}`} target="_blank" rel="noopener noreferrer">
        <FileText className="h-4 w-4" />
        Ver Relatório
      </a>
    </Button>
    <Button size="sm" asChild>
      <a href={`/relatorio?ap=${ap.id}&print=1`} target="_blank" rel="noopener noreferrer">
        <Printer className="h-4 w-4" />
        Exportar PDF
      </a>
    </Button>
  </div>
}
```

- [ ] **Step 4: Verificar build**

```bash
npm run build
```

Esperado: sem erros. Se houver erro de tipo no `elementosResult.data` (Supabase infere tipos automaticamente mas pode divergir), fazer cast explícito: `as ElementoRelatorio[]`.

- [ ] **Step 5: Testar manualmente**

1. `npm run dev`
2. Navegar para `/apartamentos/3` — confirmar que os dois botões aparecem no cabeçalho
3. Clicar "Ver Relatório" — deve abrir `/relatorio?ap=3` numa nova tab com o relatório
4. Confirmar que divisões sem ocorrências não aparecem
5. Confirmar que itens em falta com fotos mostram as fotos
6. Clicar numa foto — lightbox deve abrir; Escape fecha
7. Abrir `/relatorio?ap=3&print=1` — deve aparecer o diálogo de impressão do sistema após ~800ms
8. No diálogo de impressão, confirmar que o sidebar não aparece na pré-visualização

- [ ] **Step 6: Commit**

```bash
git add src/app/\(app\)/relatorio/page.tsx src/app/\(app\)/apartamentos/\[id\]/page.tsx
git commit -m "feat: add relatorio page and report buttons to AP detail"
```

---

## Task 6: Teste Playwright E2E

**Files:**
- Create: `e2e/relatorio.spec.ts`

---

- [ ] **Step 1: Criar `e2e/relatorio.spec.ts`**

```typescript
import { test, expect } from '@playwright/test'

const EMAIL = process.env.TEST_USER_EMAIL ?? ''
const PASSWORD = process.env.TEST_USER_PASSWORD ?? ''

test.skip(!EMAIL || !PASSWORD, 'Set TEST_USER_EMAIL and TEST_USER_PASSWORD in .env.test.local')

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(EMAIL)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: /entrar/i }).click()
  await page.waitForURL('/')
}

test('botões de relatório aparecem na página do AP', async ({ page }) => {
  await login(page)
  await page.goto('/apartamentos/1')
  await page.waitForLoadState('networkidle')

  await expect(page.getByRole('link', { name: /ver relatório/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /exportar pdf/i })).toBeVisible()
})

test('página /relatorio?ap=1 carrega com header correto', async ({ page }) => {
  await login(page)
  await page.goto('/relatorio?ap=1')
  await page.waitForLoadState('networkidle')

  // Verifica título do AP
  await expect(page.locator('h1')).toContainText('AP1')

  // Verifica que há pelo menos uma das secções (em falta ou com observação)
  const hasSections =
    (await page.locator('text=Em falta').count()) > 0 ||
    (await page.locator('text=Feito com observação').count()) > 0 ||
    (await page.locator('text=Nenhuma ocorrência').count()) > 0

  expect(hasSections).toBe(true)
})

test('lightbox abre e fecha com Escape', async ({ page }) => {
  await login(page)

  // Encontrar um AP que tenha fotos no relatório
  await page.goto('/relatorio?ap=3')
  await page.waitForLoadState('networkidle')

  const firstPhoto = page.locator('button img').first()
  const hasPhoto = await firstPhoto.count() > 0
  test.skip(!hasPhoto, 'AP3 has no photos in report — test requires at least one photo')

  await firstPhoto.click()
  // Lightbox overlay deve aparecer
  await expect(page.locator('.fixed.z-\\[300\\]')).toBeVisible()

  // Escape fecha
  await page.keyboard.press('Escape')
  await expect(page.locator('.fixed.z-\\[300\\]')).not.toBeVisible()
})
```

- [ ] **Step 2: Correr testes (se as credenciais estiverem configuradas)**

```bash
# Verificar se .env.test.local tem as credenciais
# Se sim:
npm run test:e2e -- e2e/relatorio.spec.ts
```

Esperado: 3 testes passam (ou 2 se o AP3 não tiver fotos no relatório).

- [ ] **Step 3: Commit final**

```bash
git add e2e/relatorio.spec.ts
git commit -m "test: add Playwright e2e tests for relatorio page"
```

---

## Self-Review

**Cobertura do spec:**
- ✅ `/relatorio?ap={id}` — Task 5
- ✅ `window.print()` via `?print=1` — Task 3 + 5
- ✅ Filtro: em falta + feito com observação — Task 4 + 5
- ✅ Fotos em qualquer item (incluindo em falta) — Task 4
- ✅ Divisões sem ocorrências omitidas — Task 5 (`buildDivisoes` filtra)
- ✅ Duas datas no header (geração + última alteração) — Task 3
- ✅ Ordem divisões via `divisoes.ordem` — Task 5 (`.sort((a,b) => a.ordem - b.ordem)`)
- ✅ `sortElementos` portado para desktop — Task 1
- ✅ `sortElementos` aplicado à checklist existente — Task 1
- ✅ Lightbox custom sem biblioteca — Task 2
- ✅ Botões "Ver Relatório" + "Exportar PDF" em `apartamentos/[id]` — Task 5
- ✅ Sidebar oculto no print — Task 5 (`<style>` @media print)
- ✅ Auth via middleware existente (sem alterações necessárias — `/relatorio` está dentro de `(app)`)
