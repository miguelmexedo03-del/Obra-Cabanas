'use client'

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { format, parseISO } from 'date-fns'
import { pt } from 'date-fns/locale'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

export interface KanbanCardData {
  id: number
  apartamento_codigo: string
  fase_nome: string
  fase_cor: string
  inicio: string | null
  fim: string | null
  status: string
  responsavel_nome: string | null
  progresso: number
}

interface KanbanCardProps {
  card: KanbanCardData
  canEdit: boolean
}

export function KanbanCard({ card, canEdit }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
    data: { card },
    disabled: !canEdit,
  })

  const style = transform ? { transform: CSS.Transform.toString(transform) } : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'rounded-lg border bg-card p-3 shadow-sm select-none transition-shadow',
        canEdit && 'cursor-grab active:cursor-grabbing hover:shadow-md',
        isDragging && 'opacity-40 shadow-none',
      )}
    >
      <div className="flex items-start gap-2">
        <div
          className="w-1 self-stretch rounded-full shrink-0 mt-0.5"
          style={{ backgroundColor: card.fase_cor }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate leading-tight">{card.fase_nome}</p>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">{card.apartamento_codigo}</p>

          {(card.inicio || card.fim) && (
            <p className="text-xs text-muted-foreground mt-1.5">
              {card.inicio
                ? format(parseISO(card.inicio), 'd MMM', { locale: pt })
                : '?'}
              {' → '}
              {card.fim
                ? format(parseISO(card.fim), 'd MMM', { locale: pt })
                : '?'}
            </p>
          )}

          {card.responsavel_nome && (
            <p className="text-xs text-muted-foreground mt-1 truncate">{card.responsavel_nome}</p>
          )}
        </div>
      </div>

      <div className="mt-2.5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">{Math.round(card.progresso * 100)}%</span>
        </div>
        <Progress value={card.progresso * 100} />
      </div>
    </div>
  )
}
