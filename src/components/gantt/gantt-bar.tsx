'use client'

import { useState, useOptimistic, useTransition } from 'react'
import { differenceInDays, parseISO } from 'date-fns'
import { useGanttDrag } from '@/hooks/use-gantt-drag'
import { cn } from '@/lib/utils'

interface GanttBarProps {
  tarefaId: number
  nome: string
  inicio: string | null
  fim: string | null
  corHex: string
  colWidthPx: number
  viewStart: Date
  canEdit: boolean
  onEditClick: () => void
}

export function GanttBar({
  tarefaId, nome, inicio, fim, corHex,
  colWidthPx, viewStart, canEdit, onEditClick,
}: GanttBarProps) {
  const [, startTransition] = useTransition()
  const [optimistic, setOptimistic] = useOptimistic({ inicio, fim })
  const [error, setError] = useState<string | null>(null)

  const { startDrag, onPointerMove, onPointerUp } = useGanttDrag(
    tarefaId, optimistic.inicio, optimistic.fim,
    {
      colWidthPx,
      onOptimisticUpdate: (i, f) => startTransition(() => setOptimistic({ inicio: i, fim: f })),
      onRollback: () => {
        startTransition(() => setOptimistic({ inicio, fim }))
        setError('Erro ao guardar datas.')
        setTimeout(() => setError(null), 4000)
      },
    }
  )

  if (!optimistic.inicio || !optimistic.fim) {
    return (
      <div
        className="absolute inset-y-1 left-2 right-2 rounded border-2 border-dashed border-muted-foreground/30 flex items-center justify-center cursor-pointer text-xs text-muted-foreground hover:border-muted-foreground/60 transition-colors"
        onClick={onEditClick}
      >
        {nome} — sem datas
      </div>
    )
  }

  const startOffset = differenceInDays(parseISO(optimistic.inicio), viewStart)
  const duration = differenceInDays(parseISO(optimistic.fim), parseISO(optimistic.inicio)) + 1
  const left = startOffset * colWidthPx
  const width = Math.max(duration * colWidthPx, colWidthPx)

  const today = new Date().toISOString().slice(0, 10)
  const isOverdue = optimistic.fim < today

  return (
    <>
      <div
        className={cn(
          'absolute inset-y-1 rounded select-none flex items-center px-2 text-xs font-medium text-white overflow-hidden',
          isOverdue && 'ring-2 ring-red-500 ring-inset',
          canEdit ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
        )}
        style={{ left, width, backgroundColor: corHex }}
        onClick={onEditClick}
        onPointerMove={canEdit ? onPointerMove : undefined}
        onPointerDown={canEdit ? e => startDrag(e, 'move') : undefined}
        onPointerUp={canEdit ? onPointerUp : undefined}
      >
        {canEdit && (
          <div
            className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize z-10"
            onPointerDown={e => { e.stopPropagation(); startDrag(e, 'resize-start') }}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          />
        )}
        <span className="truncate ml-1">{nome}</span>
        {canEdit && (
          <div
            className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize z-10"
            onPointerDown={e => { e.stopPropagation(); startDrag(e, 'resize-end') }}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          />
        )}
      </div>
      {error && (
        <p role="alert" className="absolute bottom-0 left-0 text-xs text-destructive bg-background px-1 rounded">
          {error}
        </p>
      )}
    </>
  )
}
