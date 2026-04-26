'use client'

import { useState, useMemo } from 'react'
import { addMonths, differenceInDays, startOfMonth, endOfMonth } from 'date-fns'
import { GanttHeader, COL_WIDTH, type ZoomLevel } from './gantt-header'
import { GanttRow } from './gantt-row'

interface TarefaRow {
  id: number
  parent_id: number | null
  apartamento_id: number
  fase_id: number | null
  nivel: number
  nome: string
  inicio: string | null
  fim: string | null
  status: string
  notas: string | null
}

interface FaseInfo {
  id: number
  nome: string
  cor_hex: string
}

interface GanttChartProps {
  tarefas: TarefaRow[]
  fases: FaseInfo[]
  canEdit: boolean
  /** Meses para trás a mostrar no viewport inicial */
  viewMonthsBack?: number
  /** Meses para a frente a mostrar no viewport inicial */
  viewMonthsForward?: number
}

const NAME_COL_WIDTH = 220

export function GanttChart({
  tarefas,
  fases,
  canEdit,
  viewMonthsBack = 1,
  viewMonthsForward = 6,
}: GanttChartProps) {
  const [zoom, setZoom] = useState<ZoomLevel>('semana')

  const today = new Date()
  const viewStart = startOfMonth(addMonths(today, -viewMonthsBack))
  const viewEnd = endOfMonth(addMonths(today, viewMonthsForward))
  const colW = COL_WIDTH[zoom]

  const faseMap = useMemo(
    () => Object.fromEntries(fases.map(f => [f.id, f])) as Record<number, FaseInfo>,
    [fases]
  )

  const parents = useMemo(() => tarefas.filter(t => t.nivel === 1), [tarefas])

  const childrenByParent = useMemo(() => {
    const map: Record<number, TarefaRow[]> = {}
    for (const t of tarefas.filter(t => t.nivel === 2)) {
      if (!map[t.parent_id!]) map[t.parent_id!] = []
      map[t.parent_id!].push(t)
    }
    return map
  }, [tarefas])

  // Posição da linha vertical de hoje (relativa ao início da área de timeline)
  const todayOffsetDays = differenceInDays(today, viewStart)
  const todayLeft = NAME_COL_WIDTH + todayOffsetDays * colW

  return (
    <div className="relative border rounded-lg overflow-auto max-h-[75vh]">
      <GanttHeader
        viewStart={viewStart}
        viewEnd={viewEnd}
        zoom={zoom}
        onZoomChange={setZoom}
        nameColWidth={NAME_COL_WIDTH}
      />

      {/* Linha vermelha de hoje */}
      <div
        className="absolute top-0 bottom-0 w-px bg-red-400/70 pointer-events-none z-20"
        style={{ left: todayLeft }}
        aria-label="Hoje"
      />

      {/* Linhas de apartamentos */}
      {parents.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground text-sm">
          Sem tarefas Gantt. Recarrega a página.
        </div>
      ) : (
        parents.map(p => (
          <GanttRow
            key={p.id}
            parent={p}
            children={childrenByParent[p.id] ?? []}
            faseMap={faseMap}
            zoom={zoom}
            viewStart={viewStart}
            nameColWidth={NAME_COL_WIDTH}
            canEdit={canEdit}
          />
        ))
      )}
    </div>
  )
}
