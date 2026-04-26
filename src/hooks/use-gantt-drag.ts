'use client'

import { useRef, useCallback } from 'react'
import { addDays, differenceInDays, parseISO } from 'date-fns'
import { updateTarefa } from '@/app/actions/gantt'

type DragType = 'move' | 'resize-start' | 'resize-end'

interface DragState {
  type: DragType
  startX: number
  originalInicio: string
  originalFim: string
}

interface UseDragOptions {
  colWidthPx: number
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
    const deltaDays = Math.round(deltaX / opts.colWidthPx)
    let newInicio = d.originalInicio
    let newFim = d.originalFim

    if (d.type === 'move') {
      newInicio = addDays(parseISO(d.originalInicio), deltaDays).toISOString().slice(0, 10)
      newFim = addDays(parseISO(d.originalFim), deltaDays).toISOString().slice(0, 10)
    } else if (d.type === 'resize-start') {
      const candidate = addDays(parseISO(d.originalInicio), deltaDays).toISOString().slice(0, 10)
      if (candidate < d.originalFim) newInicio = candidate
    } else {
      const candidate = addDays(parseISO(d.originalFim), deltaDays).toISOString().slice(0, 10)
      if (candidate > d.originalInicio) newFim = candidate
    }
    return { newInicio, newFim }
  }, [opts.colWidthPx])

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
    if (Math.abs(deltaX) < opts.colWidthPx / 2) return // movimento insignificante

    const { newInicio, newFim } = computeDates(d, deltaX)
    const result = await updateTarefa(tarefaId, { inicio: newInicio, fim: newFim })
    if (!result.success) opts.onRollback()
  }, [tarefaId, computeDates, opts])

  return { startDrag, onPointerMove, onPointerUp }
}
