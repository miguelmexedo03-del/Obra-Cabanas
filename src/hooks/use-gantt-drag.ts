'use client'

import { useRef, useCallback } from 'react'
import { addDays, format, parseISO } from 'date-fns'
import { updateTarefa } from '@/app/actions/gantt'

type DragType = 'move' | 'resize-start' | 'resize-end'

interface DragState {
  type: DragType
  startX: number
  originalInicio: string
  originalFim: string
}

interface UseDragOptions {
  pxPerDay: number
  onOptimisticUpdate: (inicio: string, fim: string) => void
  onRollback: () => void
}

export function useGanttDrag(
  tarefaId: number,
  inicio: string | null,
  fim: string | null,
  opts: UseDragOptions
) {
  const dragRef = useRef<DragState | null>(null)

  const startDrag = useCallback((e: React.PointerEvent, type: DragType) => {
    if (!inicio || !fim) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { type, startX: e.clientX, originalInicio: inicio, originalFim: fim }
  }, [inicio, fim])

  const computeDates = useCallback((d: DragState, deltaX: number): { newInicio: string; newFim: string } => {
    const deltaDays = Math.round(deltaX / opts.pxPerDay)
    let newInicio = d.originalInicio
    let newFim = d.originalFim

    // format() usa o fuso local; toISOString() converteria para UTC e recuaria
    // 1 dia no horário de verão (meia-noite local = 23:00 UTC do dia anterior).
    if (d.type === 'move') {
      newInicio = format(addDays(parseISO(d.originalInicio), deltaDays), 'yyyy-MM-dd')
      newFim = format(addDays(parseISO(d.originalFim), deltaDays), 'yyyy-MM-dd')
    } else if (d.type === 'resize-start') {
      const candidate = format(addDays(parseISO(d.originalInicio), deltaDays), 'yyyy-MM-dd')
      if (candidate < d.originalFim) newInicio = candidate
    } else {
      const candidate = format(addDays(parseISO(d.originalFim), deltaDays), 'yyyy-MM-dd')
      if (candidate > d.originalInicio) newFim = candidate
    }
    return { newInicio, newFim }
  }, [opts.pxPerDay])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current
    if (!d) return
    const { newInicio, newFim } = computeDates(d, e.clientX - d.startX)
    opts.onOptimisticUpdate(newInicio, newFim)
  }, [computeDates, opts])

  const onPointerUp = useCallback(async (e: React.PointerEvent) => {
    const d = dragRef.current
    if (!d) return
    dragRef.current = null
    const deltaX = e.clientX - d.startX
    if (Math.abs(deltaX) < opts.pxPerDay / 2) return // movimento insignificante

    const { newInicio, newFim } = computeDates(d, deltaX)
    const result = await updateTarefa(tarefaId, { inicio: newInicio, fim: newFim })
    if (!result.success) opts.onRollback()
  }, [tarefaId, computeDates, opts])

  return { startDrag, onPointerMove, onPointerUp }
}
