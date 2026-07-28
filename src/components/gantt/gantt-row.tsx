'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { GanttBar } from './gantt-bar'
import { EditTarefaModal } from './edit-tarefa-modal'
import { cn } from '@/lib/utils'

interface Tarefa {
  id: number
  nome: string
  inicio: string | null
  fim: string | null
  status: string
  notas: string | null
  fase_id: number | null
}

interface FaseInfo {
  id: number
  nome: string
  cor_hex: string
}

interface GanttRowProps {
  parent: Tarefa
  children: Tarefa[]
  faseMap: Record<number, FaseInfo>
  colW: number
  pxPerDay: number
  viewStart: Date
  nameColWidth: number
  canEdit: boolean
}

export function GanttRow({ parent, children, faseMap, colW, pxPerDay, viewStart, nameColWidth, canEdit }: GanttRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [editTarefa, setEditTarefa] = useState<Tarefa | null>(null)

  // Calcular span agregado do AP (menor início + maior fim entre filhos com datas)
  const withDates = children.filter(c => c.inicio && c.fim)
  const aggregateBar = withDates.length > 0 ? {
    inicio: withDates.map(c => c.inicio!).sort()[0],
    fim: withDates.map(c => c.fim!).sort().at(-1)!,
  } : null

  const apLabel = parent.nome.replace(' — Obra Cabanas', '')

  return (
    <>
      {/* Linha pai (apartamento) — estilo "Phase header" */}
      <div className="flex items-stretch border-b border-sidebar-border bg-sidebar-accent h-9">
        <div
          className="shrink-0 flex items-center gap-1.5 px-3 text-sm font-semibold border-r border-sidebar-border cursor-pointer select-none text-sidebar-accent-foreground"
          style={{ width: nameColWidth }}
          onClick={() => setExpanded(v => !v)}
        >
          <ChevronRight className={cn('h-4 w-4 text-sidebar-foreground/70 transition-transform shrink-0', expanded && 'rotate-90')} />
          <span className="truncate">{apLabel}</span>
        </div>
        <div className="relative flex-1 overflow-hidden">
          {aggregateBar && (
            <GanttBar
              tarefaId={parent.id}
              nome=""
              inicio={aggregateBar.inicio}
              fim={aggregateBar.fim}
              corHex="#73746E"
              pxPerDay={pxPerDay}
              viewStart={viewStart}
              canEdit={false}
              onEditClick={() => {}}
            />
          )}
        </div>
      </div>

      {/* Linhas filhas (fases) — visíveis quando expandido */}
      {expanded && children.map(t => {
        const fase = t.fase_id ? faseMap[t.fase_id] : null
        return (
          <div key={t.id} className="flex items-stretch border-b border-border bg-card h-9 transition-colors hover:bg-muted/50">
            <div
              className="shrink-0 flex items-center pl-6 pr-3 text-xs font-medium text-muted-foreground border-r border-border truncate"
              style={{ width: nameColWidth }}
            >
              <span
                className="inline-block w-2.5 h-2.5 rounded-sm mr-2 shrink-0"
                style={{ backgroundColor: fase?.cor_hex ?? '#73746E' }}
              />
              {fase?.nome ?? t.nome}
            </div>
            <div className="relative flex-1 overflow-hidden">
              <GanttBar
                tarefaId={t.id}
                nome={fase?.nome ?? t.nome}
                inicio={t.inicio}
                fim={t.fim}
                corHex={fase?.cor_hex ?? '#73746E'}
                pxPerDay={pxPerDay}
                viewStart={viewStart}
                canEdit={canEdit}
                onEditClick={() => setEditTarefa(t)}
              />
            </div>
          </div>
        )
      })}

      {editTarefa && (
        <EditTarefaModal
          open={true}
          onOpenChange={v => { if (!v) setEditTarefa(null) }}
          tarefaId={editTarefa.id}
          nome={editTarefa.fase_id && faseMap[editTarefa.fase_id]
            ? `${apLabel} — ${faseMap[editTarefa.fase_id].nome}`
            : editTarefa.nome
          }
          defaultValues={{
            inicio: editTarefa.inicio,
            fim: editTarefa.fim,
            status: editTarefa.status as 'por_fazer' | 'em_curso' | 'bloqueado' | 'concluido',
            notas: editTarefa.notas,
          }}
          canEdit={canEdit}
        />
      )}
    </>
  )
}
