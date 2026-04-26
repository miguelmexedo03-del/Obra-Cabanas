'use client'

import { useState } from 'react'
import { addDays } from 'date-fns'
import { LobTaktForm } from './lob-takt-form'
import { LobChart } from './lob-chart'
import { calcLobSchedule, lobDateRange, type FaseParam, type LobEntry } from '@/lib/lob'

interface LobViewProps {
  fases: FaseParam[]
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
      <div className="rounded-lg border p-4 bg-muted/20">
        <h2 className="text-sm font-semibold mb-4">Parâmetros do cronograma</h2>
        <LobTaktForm fases={fases} onCalculate={handleCalculate} />
      </div>

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
