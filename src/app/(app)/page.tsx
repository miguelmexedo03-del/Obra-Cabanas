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
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Obra Cabanas — visão geral</p>
      </div>

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
