'use client'

import {
  addMonths, addWeeks, eachDayOfInterval, eachWeekOfInterval,
  eachMonthOfInterval, format, isSameDay, startOfWeek
} from 'date-fns'
import { pt } from 'date-fns/locale'
import { Button } from '@/components/ui/button'

export type ZoomLevel = 'dia' | 'semana' | 'mes'

export const COL_WIDTH: Record<ZoomLevel, number> = {
  dia: 40,
  semana: 20,
  mes: 12,
}

interface GanttHeaderProps {
  viewStart: Date
  viewEnd: Date
  zoom: ZoomLevel
  onZoomChange: (z: ZoomLevel) => void
  nameColWidth: number
}

export function GanttHeader({ viewStart, viewEnd, zoom, onZoomChange, nameColWidth }: GanttHeaderProps) {
  const colW = COL_WIDTH[zoom]
  const today = new Date()

  type Label = { label: string; date: Date; isToday: boolean }
  let labels: Label[] = []

  if (zoom === 'dia') {
    labels = eachDayOfInterval({ start: viewStart, end: viewEnd }).map(d => ({
      label: format(d, 'd', { locale: pt }),
      date: d,
      isToday: isSameDay(d, today),
    }))
  } else if (zoom === 'semana') {
    const weeks = eachWeekOfInterval({ start: viewStart, end: viewEnd }, { weekStartsOn: 1 })
    labels = weeks.map(d => ({
      label: format(d, 'dd/MM', { locale: pt }),
      date: d,
      isToday: false,
    }))
    // marcar semana atual
    const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 })
    labels = labels.map(l => ({ ...l, isToday: isSameDay(l.date, startOfCurrentWeek) }))
  } else {
    labels = eachMonthOfInterval({ start: viewStart, end: viewEnd }).map(d => ({
      label: format(d, 'MMM yy', { locale: pt }),
      date: d,
      isToday: d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear(),
    }))
  }

  return (
    <div className="flex items-stretch border-b sticky top-0 bg-background z-10 shadow-sm">
      {/* Coluna de nomes + zoom */}
      <div
        className="shrink-0 flex items-center px-3 gap-2 border-r bg-muted/30"
        style={{ width: nameColWidth }}
      >
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex-1">
          Apartamento
        </span>
        <div className="flex gap-0.5">
          {(['dia', 'semana', 'mes'] as ZoomLevel[]).map(z => (
            <Button
              key={z}
              size="sm"
              variant={zoom === z ? 'default' : 'ghost'}
              className="h-6 px-2 text-xs capitalize"
              onClick={() => onZoomChange(z)}
            >
              {z === 'dia' ? 'Dia' : z === 'semana' ? 'Sem' : 'Mês'}
            </Button>
          ))}
        </div>
      </div>

      {/* Colunas de tempo */}
      <div className="flex overflow-hidden">
        {labels.map(({ label, date, isToday }) => (
          <div
            key={date.toISOString()}
            className={cn(
              'shrink-0 border-r text-center text-xs py-1 text-muted-foreground',
              isToday && 'bg-red-50 text-red-600 font-semibold'
            )}
            style={{ width: colW }}
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}

// inline cn to avoid import issues in this file
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}
