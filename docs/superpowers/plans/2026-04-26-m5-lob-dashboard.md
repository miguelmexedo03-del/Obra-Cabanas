# M5 — LoB + Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir o Dashboard com KPIs reais (% obra, bottleneck, AP mais atrasado) e a página Line of Balance com calculadora takt que gera um cronograma visual para os 24 apartamentos × 11 fases.

**Architecture:** Dashboard é um Server Component puro que agrega as views `progresso_por_apartamento` e `progresso_por_fase` existentes. LoB usa uma função pura `calcLobSchedule` (src/lib/lob.ts) para calcular datas a partir de takt + durações, com um gráfico SVG custom (sem biblioteca externa — consistente com a abordagem do Gantt). A interatividade do formulário LoB usa `useState` simples (não server action — é uma calculadora do lado cliente).

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS, shadcn/ui, date-fns (já instalado), SVG inline para o gráfico LoB.

---

## Ficheiros

**Novos:**
- `src/components/dashboard/kpi-card.tsx` — componente KPI card reutilizável
- `src/lib/lob.ts` — função pura `calcLobSchedule` + tipos `LobEntry`, `FaseParam`, `LobParams`
- `src/components/lob/lob-chart.tsx` — gráfico SVG do LoB (Client Component, só display)
- `src/components/lob/lob-takt-form.tsx` — formulário de inputs takt + durações (useState)
- `src/components/lob/lob-view.tsx` — wrapper Client Component que combina form + chart
- `src/app/(app)/lob/page.tsx` — Server Component: busca fases + gantt dates, passa ao LobView
- `e2e/dashboard.spec.ts` — testes e2e

**Modificados:**
- `src/app/(app)/page.tsx` — substituir placeholder pelo dashboard real
- `src/app/(app)/layout.tsx` — adicionar link "LoB" à nav

---

## Conceito LoB (Line of Balance)

O LoB é um diagrama de agendamento para obras repetitivas:
- **Eixo X**: tempo (datas)
- **Eixo Y**: unidades repetitivas (AP1..AP24, de cima para baixo)
- **Cada fase = uma banda diagonal**: AP1 começa no dia 0, AP2 começa no dia `takt`, AP24 começa no dia `23 × takt`
- **Dentro de cada AP**: as fases são sequenciais (fase 2 começa depois da fase 1 acabar)

**Cálculo do schedule** para cada (fase i, AP j):
```
inicioFase_i_APj = inicioBase + (j-1) * takt + sum(duracao[0..i-1])
fimFase_i_APj   = inicioFase_i_APj + duracao[i] - 1
```

Se o takt for menor que a duração de uma fase, a banda "inclina" mais e pode colidir com a fase seguinte — isso é o "bottleneck" que o LoB torna visível.

---

## Task 0 — `KpiCard` component + Dashboard real

**Files:**
- Create: `src/components/dashboard/kpi-card.tsx`
- Modify: `src/app/(app)/page.tsx`

- [ ] **Step 1: Criar KpiCard**

```tsx
// src/components/dashboard/kpi-card.tsx
interface KpiCardProps {
  label: string
  value: string
  sub?: string
  accent?: string  // hex color for left border strip
}

export function KpiCard({ label, value, sub, accent }: KpiCardProps) {
  return (
    <div
      className="rounded-lg border bg-card p-4"
      style={accent ? { borderLeftColor: accent, borderLeftWidth: 4 } : undefined}
    >
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-semibold mt-1 truncate">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Substituir placeholder no dashboard**

```tsx
// src/app/(app)/page.tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Progress } from '@/components/ui/progress'
import { KpiCard } from '@/components/dashboard/kpi-card'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [apResult, progApResult, progFaseResult, fasesResult] = await Promise.all([
    supabase.from('apartamentos').select('id, codigo').order('id'),
    supabase.from('progresso_por_apartamento').select('apartamento_id, percentagem, concluidos, total'),
    supabase.from('progresso_por_fase').select('fase_id, concluidos, total'),
    supabase.from('fases').select('id, nome, cor_hex').order('ordem'),
  ])

  const apartamentos = apResult.data ?? []
  const progAp = progApResult.data ?? []
  const progFase = progFaseResult.data ?? []
  const fases = fasesResult.data ?? []

  // % obra total (média das 24 percentagens, cada uma já é 0..1)
  const obraPct = progAp.length
    ? progAp.reduce((s, r) => s + (r.percentagem ?? 0), 0) / progAp.length
    : 0

  // AP mais atrasado / avançado
  const sorted = [...progAp].sort((a, b) => (a.percentagem ?? 0) - (b.percentagem ?? 0))
  const apAtrasado = sorted[0]
  const apAvancado = sorted[sorted.length - 1]
  const apMap = new Map(apartamentos.map(a => [a.id, a]))
  const progApMap = new Map(progAp.map(r => [r.apartamento_id, r]))

  // Bottleneck: fase com menor % de conclusão agregado
  const faseAgg = new Map<number, { concluidos: number; total: number }>()
  for (const r of progFase) {
    if (r.fase_id == null) continue
    const cur = faseAgg.get(r.fase_id) ?? { concluidos: 0, total: 0 }
    cur.concluidos += r.concluidos ?? 0
    cur.total += r.total ?? 0
    faseAgg.set(r.fase_id, cur)
  }
  let bottleneckFaseId: number | null = null
  let bottleneckPct = Infinity
  for (const [faseId, agg] of faseAgg) {
    const pct = agg.total > 0 ? agg.concluidos / agg.total : 0
    if (pct < bottleneckPct) { bottleneckPct = pct; bottleneckFaseId = faseId }
  }
  const bottleneckFase = fases.find(f => f.id === bottleneckFaseId)

  const hasProgress = obraPct > 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Obra Cabanas — visão geral</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Progresso total"
          value={`${Math.round(obraPct * 100)}%`}
          sub={`${progAp.reduce((s, r) => s + (r.concluidos ?? 0), 0)} / ${progAp.reduce((s, r) => s + (r.total ?? 0), 0)} itens`}
          accent="#4F81BD"
        />
        <KpiCard
          label="Bottleneck"
          value={bottleneckFase?.nome ?? '—'}
          sub={`${Math.round(bottleneckPct * 100)}% concluído`}
          accent={bottleneckFase?.cor_hex}
        />
        <KpiCard
          label="AP mais atrasado"
          value={hasProgress ? (apMap.get(apAtrasado?.apartamento_id ?? -1)?.codigo ?? '—') : '—'}
          sub={hasProgress ? `${Math.round((apAtrasado?.percentagem ?? 0) * 100)}%` : 'Sem progresso registado'}
          accent="#ef4444"
        />
        <KpiCard
          label="AP mais avançado"
          value={hasProgress ? (apMap.get(apAvancado?.apartamento_id ?? -1)?.codigo ?? '—') : '—'}
          sub={hasProgress ? `${Math.round((apAvancado?.percentagem ?? 0) * 100)}%` : 'Sem progresso registado'}
          accent="#22c55e"
        />
      </div>

      {/* AP grid */}
      <div>
        <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
          Apartamentos
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {apartamentos.map(ap => {
            const prog = progApMap.get(ap.id)
            const pct = (prog?.percentagem ?? 0) * 100
            return (
              <Link
                key={ap.id}
                href={`/apartamentos/${ap.id}`}
                className="rounded-lg border bg-card p-2.5 hover:border-ring transition-colors"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium">{ap.codigo}</span>
                  <span className="text-xs text-muted-foreground">{Math.round(pct)}%</span>
                </div>
                <Progress value={pct} className="h-1" />
              </Link>
            )
          })}
        </div>
      </div>

      {/* Fases progress */}
      <div>
        <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
          Fases
        </h2>
        <div className="space-y-2">
          {fases.map(f => {
            const agg = faseAgg.get(f.id) ?? { concluidos: 0, total: 0 }
            const pct = agg.total > 0 ? (agg.concluidos / agg.total) * 100 : 0
            return (
              <div key={f.id} className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: f.cor_hex }} />
                <span className="text-sm w-36 truncate shrink-0">{f.nome}</span>
                <Progress value={pct} className="flex-1 h-1.5" />
                <span className="text-xs text-muted-foreground w-10 text-right shrink-0">
                  {Math.round(pct)}%
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verificar build parcial**

```bash
cd "C:\Users\migue\Desktop\Obra Cabanas\Planeamento do calendario\obra-cabanas-app" && npx tsc --noEmit 2>&1 | grep -E "(dashboard|page)" | head -10
```

Esperado: sem erros TypeScript nos ficheiros modificados.

---

## Task 1 — `src/lib/lob.ts` (função pura + tipos)

**Files:**
- Create: `src/lib/lob.ts`

Esta é uma função pura sem dependências de React. Pode ser testada independentemente. Recebe os parâmetros do takt e devolve um array de `LobEntry` com datas calculadas para cada (fase, AP) par.

- [ ] **Step 1: Criar o módulo**

```ts
// src/lib/lob.ts
import { addDays, format } from 'date-fns'

export interface FaseParam {
  id: number
  nome: string
  cor_hex: string
  duracao: number   // dias
}

export interface LobEntry {
  fase_id: number
  fase_nome: string
  fase_cor: string
  ap: number        // 1..24
  inicio: string    // YYYY-MM-DD
  fim: string       // YYYY-MM-DD
}

export interface LobParams {
  inicioBase: Date   // data de início do AP1, Fase 1
  takt: number       // dias entre o início da mesma fase em APs consecutivos
  fases: FaseParam[] // ordenadas por ordem construtiva
}

/**
 * Calcula o cronograma LoB a partir de parâmetros takt.
 *
 * Para cada AP j (1..24) e cada fase i:
 *   inicio = inicioBase + (j-1)*takt + sum(duracao[0..i-1])
 *   fim    = inicio + duracao[i] - 1
 *
 * Todas as fases dentro do mesmo AP são sequenciais (sem sobreposição).
 * O takt é o avanço diário entre APs consecutivos para a mesma fase.
 */
export function calcLobSchedule({ inicioBase, takt, fases }: LobParams): LobEntry[] {
  const entries: LobEntry[] = []

  for (let j = 1; j <= 24; j++) {
    const apDayOffset = (j - 1) * takt
    let phaseOffset = 0

    for (const fase of fases) {
      const inicioDate = addDays(inicioBase, apDayOffset + phaseOffset)
      const fimDate = addDays(inicioDate, fase.duracao - 1)

      entries.push({
        fase_id: fase.id,
        fase_nome: fase.nome,
        fase_cor: fase.cor_hex,
        ap: j,
        inicio: format(inicioDate, 'yyyy-MM-dd'),
        fim: format(fimDate, 'yyyy-MM-dd'),
      })

      phaseOffset += fase.duracao
    }
  }

  return entries
}

/** Devolve o intervalo [min(inicio), max(fim)] de um array de LobEntry */
export function lobDateRange(entries: LobEntry[]): { start: Date; end: Date } | null {
  if (entries.length === 0) return null
  const starts = entries.map(e => new Date(e.inicio).getTime())
  const ends = entries.map(e => new Date(e.fim).getTime())
  return {
    start: new Date(Math.min(...starts)),
    end: new Date(Math.max(...ends)),
  }
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd "C:\Users\migue\Desktop\Obra Cabanas\Planeamento do calendario\obra-cabanas-app" && npx tsc --noEmit 2>&1 | grep "lob.ts" | head -5
```

Esperado: sem erros.

---

## Task 2 — `LobChart` SVG component

**Files:**
- Create: `src/components/lob/lob-chart.tsx`

Gráfico SVG com:
- Eixo Y: AP1..AP24 (linhas horizontais com labels à esquerda)
- Eixo X: datas (ticks mensais com labels no topo)
- Barras coloridas para cada (fase, AP)
- Linha vertical vermelha a tracejado = hoje
- Alternância de fundo nas linhas de AP (zebra stripes) para facilitar leitura
- Legenda das fases em baixo do gráfico

Usa `viewBox="0 0 1200 520"` com scroll horizontal no container pai.

- [ ] **Step 1: Criar componente**

```tsx
// src/components/lob/lob-chart.tsx
'use client'

import { differenceInDays, parseISO, eachMonthOfInterval, format } from 'date-fns'
import { pt } from 'date-fns/locale'
import type { LobEntry, FaseParam } from '@/lib/lob'

const CW = 1200   // chart total width
const CH = 520    // chart total height
const LM = 52     // left margin (AP labels)
const TM = 36     // top margin (date labels)
const BM = 20     // bottom margin
const RM = 10     // right margin
const GW = CW - LM - RM   // grid width
const GH = CH - TM - BM   // grid height
const ROW_H = GH / 24      // ~19.3px per AP row

interface LobChartProps {
  entries: LobEntry[]
  fases: FaseParam[]
  viewStart: Date
  viewEnd: Date
}

export function LobChart({ entries, fases, viewStart, viewEnd }: LobChartProps) {
  const today = new Date()
  const totalDays = Math.max(differenceInDays(viewEnd, viewStart) + 1, 1)
  const dw = GW / totalDays  // pixels per day

  function xFor(d: Date): number {
    return LM + differenceInDays(d, viewStart) * dw
  }

  const monthTicks = eachMonthOfInterval({ start: viewStart, end: viewEnd })
  const todayX = xFor(today)
  const showToday = todayX >= LM && todayX <= CW - RM

  return (
    <div className="overflow-x-auto rounded-lg border bg-background">
      <svg
        viewBox={`0 0 ${CW} ${CH}`}
        width={CW}
        height={CH}
        aria-label="Line of Balance"
        style={{ display: 'block', fontFamily: 'inherit' }}
      >
        {/* Zebra stripes on AP rows */}
        {Array.from({ length: 24 }, (_, i) => i % 2 === 0 && (
          <rect
            key={i}
            x={LM}
            y={TM + i * ROW_H}
            width={GW}
            height={ROW_H}
            fill="#f8fafc"
          />
        ))}

        {/* Month grid lines + labels */}
        {monthTicks.map(d => {
          const x = xFor(d)
          if (x < LM || x > CW - RM) return null
          return (
            <g key={d.toISOString()}>
              <line x1={x} y1={TM} x2={x} y2={CH - BM} stroke="#e2e8f0" strokeWidth={1} />
              <text x={x + 3} y={TM - 6} fontSize={10} fill="#94a3b8">
                {format(d, 'MMM yy', { locale: pt })}
              </text>
            </g>
          )
        })}

        {/* AP labels */}
        {Array.from({ length: 24 }, (_, i) => {
          const ap = i + 1
          const y = TM + i * ROW_H + ROW_H / 2 + 4
          return (
            <text key={ap} x={LM - 4} y={y} fontSize={10} fill="#64748b" textAnchor="end">
              AP{ap}
            </text>
          )
        })}

        {/* LoB bars */}
        {entries.map((e, idx) => {
          const x0 = xFor(parseISO(e.inicio))
          const x1 = xFor(parseISO(e.fim)) + dw
          const clampedX = Math.max(x0, LM)
          const clampedW = Math.min(x1, CW - RM) - clampedX
          if (clampedW <= 0) return null

          const y = TM + (e.ap - 1) * ROW_H + ROW_H * 0.12
          const h = ROW_H * 0.76

          return (
            <rect
              key={idx}
              x={clampedX}
              y={y}
              width={clampedW}
              height={h}
              fill={e.fase_cor}
              rx={2}
              opacity={0.85}
            >
              <title>{`${e.fase_nome} — AP${e.ap}: ${e.inicio} → ${e.fim}`}</title>
            </rect>
          )
        })}

        {/* Today line */}
        {showToday && (
          <line
            x1={todayX} y1={TM}
            x2={todayX} y2={CH - BM}
            stroke="#ef4444"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
        )}

        {/* Border lines */}
        <line x1={LM} y1={TM} x2={LM} y2={CH - BM} stroke="#e2e8f0" strokeWidth={1} />
        <line x1={LM} y1={CH - BM} x2={CW - RM} y2={CH - BM} stroke="#e2e8f0" strokeWidth={1} />
      </svg>

      {/* Legenda */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-2 border-t">
        {fases.map(f => (
          <div key={f.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: f.cor_hex }} />
            {f.nome}
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <div className="w-3 h-px border-t-2 border-dashed border-red-400" />
          Hoje
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd "C:\Users\migue\Desktop\Obra Cabanas\Planeamento do calendario\obra-cabanas-app" && npx tsc --noEmit 2>&1 | grep -E "lob-chart" | head -5
```

Esperado: sem erros.

---

## Task 3 — `LobTaktForm` + `LobView`

**Files:**
- Create: `src/components/lob/lob-takt-form.tsx`
- Create: `src/components/lob/lob-view.tsx`

O `LobTaktForm` usa `useState` (não react-hook-form) porque é uma calculadora local sem server action. O `LobView` orquestra o formulário + gráfico, guardando o estado dos entries calculados.

- [ ] **Step 1: Criar LobTaktForm**

```tsx
// src/components/lob/lob-takt-form.tsx
'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { FaseParam } from '@/lib/lob'

interface LobTaktFormProps {
  fases: FaseParam[]
  onCalculate: (params: { inicioBase: Date; takt: number; fases: FaseParam[] }) => void
  isLoading?: boolean
}

export function LobTaktForm({ fases, onCalculate, isLoading }: LobTaktFormProps) {
  const [inicioBase, setInicioBase] = useState(new Date().toISOString().slice(0, 10))
  const [takt, setTakt] = useState(7)
  const [duracoes, setDuracoes] = useState<Record<number, number>>(
    Object.fromEntries(fases.map(f => [f.id, f.duracao])),
  )

  const totalDays = fases.reduce((s, f) => s + (duracoes[f.id] ?? f.duracao), 0) + 23 * takt

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!inicioBase) return
    const updatedFases = fases.map(f => ({ ...f, duracao: Math.max(1, duracoes[f.id] ?? f.duracao) }))
    onCalculate({ inicioBase: new Date(inicioBase + 'T00:00:00'), takt, fases: updatedFases })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Data início (AP1, Fase 1)</label>
          <Input
            type="date"
            value={inicioBase}
            onChange={e => setInicioBase(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Takt (dias entre APs)</label>
          <Input
            type="number"
            min={1}
            max={90}
            value={takt}
            onChange={e => setTakt(Math.max(1, Number(e.target.value)))}
          />
        </div>
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Duração por fase (dias)</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {fases.map(f => (
            <div key={f.id} className="space-y-1">
              <label className="text-xs flex items-center gap-1.5 text-muted-foreground">
                <span
                  className="w-2.5 h-2.5 rounded-sm inline-block shrink-0"
                  style={{ backgroundColor: f.cor_hex }}
                />
                {f.nome}
              </label>
              <Input
                type="number"
                min={1}
                className="h-8 text-sm"
                value={duracoes[f.id] ?? f.duracao}
                onChange={e =>
                  setDuracoes(prev => ({ ...prev, [f.id]: Math.max(1, Number(e.target.value)) }))
                }
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={isLoading}>
          Calcular LoB
        </Button>
        <p className="text-xs text-muted-foreground">
          Duração total estimada: <strong>{totalDays} dias</strong>{' '}
          ({Math.ceil(totalDays / 7)} semanas)
        </p>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Criar LobView**

```tsx
// src/components/lob/lob-view.tsx
'use client'

import { useState } from 'react'
import { addDays } from 'date-fns'
import { LobTaktForm } from './lob-takt-form'
import { LobChart } from './lob-chart'
import { calcLobSchedule, lobDateRange, type FaseParam, type LobEntry } from '@/lib/lob'

interface LobViewProps {
  fases: FaseParam[]
  /** Entradas reais do tarefas_gantt (vazio se datas não definidas) */
  actualEntries: LobEntry[]
}

export function LobView({ fases, actualEntries }: LobViewProps) {
  const [calculatedEntries, setCalculatedEntries] = useState<LobEntry[] | null>(null)
  const [viewRange, setViewRange] = useState<{ start: Date; end: Date } | null>(null)

  const displayEntries = calculatedEntries ?? actualEntries
  const hasEntries = displayEntries.length > 0

  const defaultViewStart = new Date()
  const defaultViewEnd = addDays(new Date(), 180)
  const chartViewStart = viewRange?.start ?? defaultViewStart
  const chartViewEnd = viewRange?.end ?? defaultViewEnd

  function handleCalculate(params: { inicioBase: Date; takt: number; fases: FaseParam[] }) {
    const entries = calcLobSchedule(params)
    setCalculatedEntries(entries)
    const range = lobDateRange(entries)
    if (range) {
      setViewRange({
        start: addDays(range.start, -7),
        end: addDays(range.end, 7),
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="rounded-lg border p-4 bg-muted/20">
        <h2 className="text-sm font-semibold mb-4">Parâmetros do cronograma</h2>
        <LobTaktForm fases={fases} onCalculate={handleCalculate} />
      </div>

      {/* Chart */}
      {hasEntries ? (
        <div>
          {calculatedEntries && (
            <p className="text-xs text-muted-foreground mb-2">
              Cronograma calculado — {calculatedEntries.length} barras ({fases.length} fases × 24 APs)
            </p>
          )}
          {!calculatedEntries && actualEntries.length > 0 && (
            <p className="text-xs text-muted-foreground mb-2">
              Cronograma real (datas do Gantt)
            </p>
          )}
          <LobChart
            entries={displayEntries}
            fases={fases}
            viewStart={chartViewStart}
            viewEnd={chartViewEnd}
          />
        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed p-16 text-center">
          <p className="text-muted-foreground text-sm">
            Preenche o formulário acima e clica em &quot;Calcular LoB&quot; para visualizar o cronograma.
          </p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
cd "C:\Users\migue\Desktop\Obra Cabanas\Planeamento do calendario\obra-cabanas-app" && npx tsc --noEmit 2>&1 | grep -E "lob" | head -10
```

Esperado: sem erros.

---

## Task 4 — Página `/lob` + link na nav

**Files:**
- Create: `src/app/(app)/lob/page.tsx`
- Modify: `src/app/(app)/layout.tsx`

- [ ] **Step 1: Criar página LoB**

```tsx
// src/app/(app)/lob/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LobView } from '@/components/lob/lob-view'
import type { FaseParam, LobEntry } from '@/lib/lob'

export default async function LobPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: fases }, { data: tarefas }] = await Promise.all([
    supabase
      .from('fases')
      .select('id, nome, cor_hex, duracao_dias_default')
      .order('ordem'),
    supabase
      .from('tarefas_gantt')
      .select('fase_id, apartamento_id, inicio, fim')
      .eq('nivel', 2)
      .not('inicio', 'is', null)
      .not('fim', 'is', null),
  ])

  const faseParams: FaseParam[] = (fases ?? []).map(f => ({
    id: f.id,
    nome: f.nome,
    cor_hex: f.cor_hex,
    duracao: f.duracao_dias_default,
  }))

  const faseMap = new Map((fases ?? []).map(f => [f.id, f]))

  // Entradas reais do gantt (apenas se datas preenchidas)
  const actualEntries: LobEntry[] = (tarefas ?? [])
    .filter(t => t.fase_id != null && t.apartamento_id != null)
    .map(t => ({
      fase_id: t.fase_id!,
      fase_nome: faseMap.get(t.fase_id!)?.nome ?? '',
      fase_cor: faseMap.get(t.fase_id!)?.cor_hex ?? '#94a3b8',
      ap: t.apartamento_id!,
      inicio: t.inicio!,
      fim: t.fim!,
    }))

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Line of Balance — Obra Cabanas</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cronograma de fluxo de trabalho pelos 24 apartamentos. Ajusta o takt e as durações e clica em "Calcular".
        </p>
      </div>
      <LobView fases={faseParams} actualEntries={actualEntries} />
    </div>
  )
}
```

- [ ] **Step 2: Adicionar link "LoB" na nav**

Em `src/app/(app)/layout.tsx`, adicionar ao array `navLinks`:

```tsx
const navLinks = [
  { href: '/', label: 'Dashboard' },
  { href: '/apartamentos', label: 'Apartamentos' },
  { href: '/checklist', label: 'Checklist' },
  { href: '/gantt', label: 'Gantt' },
  { href: '/kanban', label: 'Kanban' },
  { href: '/lob', label: 'LoB' },   // ← adicionar
]
```

---

## Task 5 — Build completo + E2E + commit

**Files:**
- Create: `e2e/dashboard.spec.ts`

- [ ] **Step 1: Build completo**

```bash
cd "C:\Users\migue\Desktop\Obra Cabanas\Planeamento do calendario\obra-cabanas-app" && npm run build 2>&1 | tail -30
```

Esperado: `✓ Compiled successfully`. Se houver erro TypeScript no `progresso_por_apartamento` ou `progresso_por_fase` (views nullable), usar `?? 0` para null coalescence (já está no código acima). Se houver erro de tipo no SVG (e.g., `ReactNode` em SVG context), verificar que todos os elementos SVG têm tipos correctos — `<rect>`, `<line>`, `<text>` são tipos válidos em React.

**Potencial erro:** `null` iterado no `Array.from` do SVG — verificar que o `filter(Boolean)` implícito funciona (usar `.filter(x => x !== null)` se necessário).

- [ ] **Step 2: Criar e2e tests**

```ts
// e2e/dashboard.spec.ts
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

test('dashboard shows KPI cards', async ({ page }) => {
  await login(page)
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible()
  await expect(page.getByText('Progresso total')).toBeVisible()
  await expect(page.getByText('Bottleneck')).toBeVisible()
})

test('dashboard shows 24 AP cards', async ({ page }) => {
  await login(page)
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // AP grid deve ter 24 links
  const apLinks = page.getByRole('link', { name: /^AP\d+$/ })
  await expect(apLinks).toHaveCount(24)
})

test('lob page renders and takt form is present', async ({ page }) => {
  await login(page)
  await page.goto('/lob')
  await page.waitForLoadState('networkidle')

  await expect(page.getByRole('heading', { name: /line of balance/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /calcular lob/i })).toBeVisible()
})

test('lob takt form calculates and shows chart', async ({ page }) => {
  await login(page)
  await page.goto('/lob')
  await page.waitForLoadState('networkidle')

  // Submeter o formulário com valores default
  await page.getByRole('button', { name: /calcular lob/i }).click()

  // SVG chart deve aparecer
  await expect(page.locator('svg[aria-label="Line of Balance"]')).toBeVisible({ timeout: 5000 })
})
```

- [ ] **Step 3: Correr e2e**

```bash
cd "C:\Users\migue\Desktop\Obra Cabanas\Planeamento do calendario\obra-cabanas-app" && npm run test:e2e -- e2e/dashboard.spec.ts 2>&1 | tail -20
```

Esperado: 4 testes passam (ou skip se `.env.test.local` não existir).

- [ ] **Step 4: Git commit**

```bash
cd "C:\Users\migue\Desktop\Obra Cabanas\Planeamento do calendario\obra-cabanas-app" && git add src/components/dashboard/ src/components/lob/ src/lib/lob.ts "src/app/(app)/lob/" "src/app/(app)/page.tsx" "src/app/(app)/layout.tsx" e2e/dashboard.spec.ts && git commit -m "feat: M5 — Dashboard com KPIs reais e Line of Balance com calculadora takt"
```

---

## Verificação end-to-end

1. Dashboard `/` mostra 4 KPI cards com dados reais
2. Grid de 24 APs com progress bars (0% já que seed tem `concluido=false`)
3. Breakdown das 11 fases com progress bars
4. LoB `/lob` — formulário com takt=7, datas e durações default
5. "Calcular LoB" → SVG chart aparece com 264 barras coloridas em padrão diagonal
6. Alterar takt=14 → barras mais espaçadas (padrão diagonal mais inclinado)
7. "Hoje" line vermelha visível no SVG (se a data de início estiver próxima do presente)
8. `npm run build` sem erros
9. `npm run test:e2e e2e/dashboard.spec.ts` → 4 passes

---

## Notas técnicas

**Porquê `useState` em vez de `react-hook-form` para o LobTaktForm?**
O formulário é uma calculadora local — não faz mutações no servidor. `react-hook-form` é optimizado para validação + server mutations. Para um formulário de 13 campos que só calcula localmente, `useState` é mais simples e directo.

**Porquê SVG em vez de CSS absolute?**
O LoB tem 264 barras em 24 linhas horizontais. O Gantt tem barras numa única linha (a row height varia). No LoB, cada linha tem altura fixa e o posicionamento Y é proporcional à posição do AP. SVG `<rect>` com coordenadas x/y calculadas é mais directo que CSS absolute com posicionamento de 24 linhas.

**`viewBox` vs `width/height` fixo:**
O SVG tem `width={1200}` (fixo) com o container `overflow-x-auto`. Isto é intencional — num chart de timeline, não faz sentido comprimir horizontalmente para caber no ecrã; o utilizador faz scroll. O `viewBox` permite escalabilidade se necessário.

**`percentagem` nas views é 0..1:**
A view `progresso_por_apartamento` calcula `round(count_concluidos / count_total, 4)` → valor entre 0 e 1. Para display como percentagem, sempre multiplicar por 100. Nunca assumir que é 0..100.
