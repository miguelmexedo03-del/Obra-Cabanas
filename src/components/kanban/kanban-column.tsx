'use client'

import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import { KanbanCard, type KanbanCardData } from './kanban-card'

const COLUMN_LABELS: Record<string, string> = {
  por_fazer: 'Por Fazer',
  em_curso: 'Em Curso',
  bloqueado: 'Bloqueado',
  concluido: 'Concluído',
}

const COLUMN_HEADING_COLORS: Record<string, string> = {
  por_fazer: 'text-muted-foreground',
  em_curso: 'text-blue-600 dark:text-blue-400',
  bloqueado: 'text-red-600 dark:text-red-400',
  concluido: 'text-green-600 dark:text-green-400',
}

interface KanbanColumnProps {
  status: string
  cards: KanbanCardData[]
  canEdit: boolean
}

export function KanbanColumn({ status, cards, canEdit }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div className="flex flex-col min-h-0">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <h2 className={cn('text-sm font-semibold', COLUMN_HEADING_COLORS[status])}>
          {COLUMN_LABELS[status]}
        </h2>
        <span className="text-xs bg-muted rounded-full px-2 py-0.5 text-muted-foreground tabular-nums">
          {cards.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 space-y-2 rounded-lg p-2 min-h-48 transition-colors duration-150',
          isOver && canEdit
            ? 'bg-primary/5 ring-2 ring-primary/30'
            : 'bg-muted/30',
        )}
      >
        {cards.map(card => (
          <KanbanCard key={card.id} card={card} canEdit={canEdit} />
        ))}

        {cards.length === 0 && (
          <div className={cn(
            'flex items-center justify-center h-24 rounded-md border-2 border-dashed text-xs text-muted-foreground/50 transition-colors',
            isOver && canEdit && 'border-primary/40 text-primary/60',
          )}>
            Sem cartões
          </div>
        )}
      </div>
    </div>
  )
}
