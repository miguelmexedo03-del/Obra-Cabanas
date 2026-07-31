import type { CSSProperties } from 'react'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ListChecks, AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { PageHeader } from '@/components/layout'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [apResult, progApResult, progFaseResult, fasesResult] = await Promise.all([
    supabase.from('apartamentos').select('id, codigo').eq('tipo', 'apartamento').order('id'),
    supabase.from('progresso_por_apartamento').select('apartamento_id, percentagem, concluidos, total'),
    supabase.from('progresso_por_fase').select('apartamento_id, fase_id, concluidos, total'),
    supabase.from('fases').select('id, nome, cor_hex').order('ordem'),
  ])

  const apartamentos = apResult.data ?? []
  const apIds = new Set(apartamentos.map(a => a.id))
  const progAp = (progApResult.data ?? []).filter(r => r.apartamento_id != null && apIds.has(r.apartamento_id))
  const progFase = (progFaseResult.data ?? []).filter(r => r.apartamento_id != null && apIds.has(r.apartamento_id))
  const fases = fasesResult.data ?? []

  const obraPct = progAp.length
    ? progAp.reduce((s, r) => s + (r.percentagem ?? 0), 0) / progAp.length
    : 0

  const sorted = [...progAp].sort((a, b) => (a.percentagem ?? 0) - (b.percentagem ?? 0))
  const apAtrasado = sorted[0]
  const apAvancado = sorted[sorted.length - 1]
  const apMap = new Map(apartamentos.map(a => [a.id, a]))
  const progApMap = new Map(progAp.map(r => [r.apartamento_id, r]))

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
      <PageHeader title="Dashboard" description="Visão geral da obra" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Progresso total"
          value={`${Math.round(obraPct * 100)}%`}
          sub={`${progAp.reduce((s, r) => s + (r.concluidos ?? 0), 0)} / ${progAp.reduce((s, r) => s + (r.total ?? 0), 0)} itens`}
          accent="#626D3A"
          icon={ListChecks}
        />
        <KpiCard
          label="Bottleneck"
          value={bottleneckFase?.nome ?? '—'}
          sub={`${Math.round(bottleneckPct * 100)}% concluído`}
          accent={bottleneckFase?.cor_hex ?? '#73746E'}
          icon={AlertTriangle}
        />
        <KpiCard
          label="AP mais atrasado"
          value={hasProgress ? (apMap.get(apAtrasado?.apartamento_id ?? -1)?.codigo ?? '—') : '—'}
          sub={hasProgress ? `${Math.round((apAtrasado?.percentagem ?? 0) * 100)}%` : 'Sem progresso registado'}
          accent="#DC2626"
          icon={TrendingDown}
          trend="down"
        />
        <KpiCard
          label="AP mais avançado"
          value={hasProgress ? (apMap.get(apAvancado?.apartamento_id ?? -1)?.codigo ?? '—') : '—'}
          sub={hasProgress ? `${Math.round((apAvancado?.percentagem ?? 0) * 100)}%` : 'Sem progresso registado'}
          accent="#7D8A49"
          icon={TrendingUp}
          trend="up"
        />
      </div>

      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Apartamentos
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {apartamentos.map(ap => {
            const prog = progApMap.get(ap.id)
            const pct = (prog?.percentagem ?? 0) * 100
            return (
              <Link
                key={ap.id}
                href={`/apartamentos/${ap.id}`}
                className="group rounded-lg border border-border bg-card p-3 transition-colors hover:border-ring hover:bg-muted/40"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{ap.codigo}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">{Math.round(pct)}%</span>
                </div>
                <Progress value={pct} className="h-1.5" />
              </Link>
            )
          })}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 ring-1 ring-foreground/5">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Fases
        </h2>
        <div className="space-y-3">
          {fases.map(f => {
            const agg = faseAgg.get(f.id) ?? { concluidos: 0, total: 0 }
            const pct = agg.total > 0 ? (agg.concluidos / agg.total) * 100 : 0
            return (
              <div key={f.id} className="flex items-center gap-3">
                <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: f.cor_hex }} />
                <span className="w-40 shrink-0 truncate text-sm text-foreground">{f.nome}</span>
                <Progress
                  value={pct}
                  className="h-1.5 flex-1"
                  style={{ '--color-primary': f.cor_hex } as CSSProperties}
                />
                <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
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
