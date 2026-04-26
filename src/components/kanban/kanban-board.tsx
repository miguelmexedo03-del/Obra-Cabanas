'use client'

import { useState, useOptimistic, useTransition, useRef, useEffect, useCallback } from 'react'
import { useRealtimeRefresh } from '@/hooks/use-realtime-refresh'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { KanbanColumn } from './kanban-column'
import { KanbanCard, type KanbanCardData } from './kanban-card'
import { updateTarefa } from '@/app/actions/gantt'

const STATUSES = ['por_fazer', 'em_curso', 'bloqueado', 'concluido'] as const
type Status = typeof STATUSES[number]

interface KanbanBoardProps {
  cards: KanbanCardData[]
  canEdit: boolean
}

export function KanbanBoard({ cards: initialCards, canEdit }: KanbanBoardProps) {
  useRealtimeRefresh('tarefas_gantt')
  const [, startTransition] = useTransition()
  const [optimisticCards, updateOptimisticCards] = useOptimistic(
    initialCards,
    (state: KanbanCardData[], { id, status }: { id: number; status: Status }) =>
      state.map(c => (c.id === id ? { ...c, status } : c)),
  )
  const [activeCard, setActiveCard] = useState<KanbanCardData | null>(null)
  const [dragError, setDragError] = useState<string | null>(null)
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  )

  const cardsByStatus = Object.fromEntries(
    STATUSES.map(s => [s, optimisticCards.filter(c => c.status === s)]),
  ) as Record<Status, KanbanCardData[]>

  function handleDragStart(event: DragStartEvent) {
    const card = optimisticCards.find(c => c.id === event.active.id)
    setActiveCard(card ?? null)
    setDragError(null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveCard(null)
    const { active, over } = event
    if (!over || !canEdit) return

    const cardId = active.id as number
    const newStatus = over.id as string

    if (!STATUSES.includes(newStatus as Status)) return

    const card = optimisticCards.find(c => c.id === cardId)
    if (!card || card.status === newStatus) return

    startTransition(async () => {
      updateOptimisticCards({ id: cardId, status: newStatus as Status })
      const result = await updateTarefa(cardId, { status: newStatus as Status })
      if (!result.success) {
        if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
        setDragError(`Erro ao guardar: ${result.error}`)
        errorTimerRef.current = setTimeout(() => setDragError(null), 4000)
      }
    })
  }

  return (
    <div className="space-y-3">
      {dragError && (
        <p role="alert" className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
          {dragError}
        </p>
      )}

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {STATUSES.map(status => (
            <KanbanColumn
              key={status}
              status={status}
              cards={cardsByStatus[status]}
              canEdit={canEdit}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeCard && <KanbanCard card={activeCard} canEdit={false} />}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
