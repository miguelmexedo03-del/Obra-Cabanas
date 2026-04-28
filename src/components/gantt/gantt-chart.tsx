'use client'

import { useMemo, useRef, useEffect } from 'react'
import { addMonths, differenceInDays, startOfMonth, endOfMonth } from 'date-fns'
import { GanttHeader, COL_WIDTH, PX_PER_DAY } from './gantt-header'
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
  viewMonthsBack?: number
  viewMonthsForward?: number
}

const NAME_COL_WIDTH = 220

export function GanttChart({
  tarefas,
  fases,
  canEdit,
  viewMonthsBack = 0,
  viewMonthsForward = 12,
}: GanttChartProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const today = new Date()
  const viewStart = startOfMonth(addMonths(today, -viewMonthsBack))
  const viewEnd = endOfMonth(addMonths(today, viewMonthsForward))

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

  const todayOffsetDays = differenceInDays(today, viewStart)
  const todayLeft = NAME_COL_WIDTH + todayOffsetDays * PX_PER_DAY

  // Auto-scroll para hoje ao montar
  useEffect(() => {
    if (scrollRef.current) {
      const scrollTarget = Math.max(0, todayOffsetDays * PX_PER_DAY - 200)
      scrollRef.current.scrollLeft = scrollTarget
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Largura mínima do conteúdo = coluna nomes + dias totais em px
  const totalWidth = NAME_COL_WIDTH + differenceInDays(viewEnd, viewStart) * PX_PER_DAY + COL_WIDTH

  return (
    <div ref={scrollRef} className="border border-slate-200 rounded-lg overflow-auto max-h-[80vh] bg-white">
      <div className="relative" style={{ minWidth: totalWidth }}>
      <GanttHeader
        viewStart={viewStart}
        viewEnd={viewEnd}
        nameColWidth={NAME_COL_WIDTH}
      />

      {/* Linha verde de hoje */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-emerald-500/90 pointer-events-none z-20"
        style={{ left: todayLeft }}
        aria-label="Hoje"
      />

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
            colW={COL_WIDTH}
            pxPerDay={PX_PER_DAY}
            viewStart={viewStart}
            nameColWidth={NAME_COL_WIDTH}
            canEdit={canEdit}
          />
        ))
      )}
      </div>
    </div>
  )
}
