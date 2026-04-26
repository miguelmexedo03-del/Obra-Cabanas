'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { parseISO } from 'date-fns'
import { GanttBar } from './gantt-bar'
import { EditTarefaModal } from './edit-tarefa-modal'
import { cn } from '@/lib/utils'
import { type ZoomLevel, COL_WIDTH } from './gantt-header'

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
  zoom: ZoomLevel
  viewStart: Date
  nameColWidth: number
  canEdit: boolean
}

export function GanttRow({ parent, children, faseMap, zoom, viewStart, nameColWidth, canEdit }: GanttRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [editTarefa, setEditTarefa] = useState<Tarefa | null>(null)
  const colW = COL_WIDTH[zoom]

  // Calcular span agregado do AP (menor início + maior fim entre filhos com datas)
  const withDates = children.filter(c => c.inicio && c.fim)
  const aggregateBar = withDates.length > 0 ? {
    inicio: withDates.map(c => c.inicio!).sort()[0],
    fim: withDates.map(c => c.fim!).sort().at(-1)!,
  } : null

  const apLabel = parent.nome.replace(' — Obra Cabanas', '')

  return (
    <>
      {/* Linha pai (apartamento) */}
      <div className="flex items-stretch border-b hover:bg-muted/30 h-10 transition-colors">
        <div
          className="shrink-0 flex items-center gap-1.5 px-3 text-sm font-semibold border-r cursor-pointer select-none"
          style={{ width: nameColWidth }}
          onClick={() => setExpanded(v => !v)}
        >
          <ChevronRight className={cn('h-4 w-4 text-muted-foreground transition-transform shrink-0', expanded && 'rotate-90')} />
          <span className="truncate">{apLabel}</span>
        </div>
        <div className="relative flex-1 overflow-hidden">
          {aggregateBar && (
            <GanttBar
              tarefaId={parent.id}
              nome=""
              inicio={aggregateBar.inicio}
              fim={aggregateBar.fim}
              corHex="#64748b"
              colWidthPx={colW}
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
          <div key={t.id} className="flex items-stretch border-b bg-muted/10 h-9 transition-colors hover:bg-muted/20">
            <div
              className="shrink-0 flex items-center pl-8 pr-3 text-xs text-muted-foreground border-r truncate"
              style={{ width: nameColWidth }}
            >
              <span
                className="inline-block w-2 h-2 rounded-full mr-2 shrink-0"
                style={{ backgroundColor: fase?.cor_hex ?? '#94a3b8' }}
              />
              {fase?.nome ?? t.nome}
            </div>
            <div className="relative flex-1 overflow-hidden">
              <GanttBar
                tarefaId={t.id}
                nome={fase?.nome ?? t.nome}
                inicio={t.inicio}
                fim={t.fim}
                corHex={fase?.cor_hex ?? '#94a3b8'}
                colWidthPx={colW}
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
