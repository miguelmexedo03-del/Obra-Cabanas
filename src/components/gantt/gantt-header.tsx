'use client'

import {
  eachWeekOfInterval, format, isSameDay, startOfWeek, getQuarter, getYear
} from 'date-fns'
import { pt } from 'date-fns/locale'

export const COL_WIDTH = 56
export const PX_PER_DAY = COL_WIDTH / 7

function groupConsecutive<T>(items: T[], keyFn: (item: T) => string): { key: string; count: number }[] {
  const groups: { key: string; count: number }[] = []
  for (const item of items) {
    const k = keyFn(item)
    if (groups.length && groups[groups.length - 1].key === k) {
      groups[groups.length - 1].count++
    } else {
      groups.push({ key: k, count: 1 })
    }
  }
  return groups
}

interface GanttHeaderProps {
  viewStart: Date
  viewEnd: Date
  nameColWidth: number
}

export function GanttHeader({ viewStart, viewEnd, nameColWidth }: GanttHeaderProps) {
  const today = new Date()
  const weeks = eachWeekOfInterval({ start: viewStart, end: viewEnd }, { weekStartsOn: 1 })
  const quarterGroups = groupConsecutive(weeks, w => `Q${getQuarter(w)} ${getYear(w)}`)
  const monthGroups = groupConsecutive(weeks, w => format(w, 'yyyy-MM'))
  const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 })

  return (
    <div className="sticky top-0 z-10 shadow-sm select-none">
      {/* Row 1: Quarters */}
      <div className="flex border-b border-slate-600">
        <div className="shrink-0 bg-slate-800 border-r border-slate-600" style={{ width: nameColWidth }} />
        {quarterGroups.map(({ key, count }) => (
          <div
            key={key}
            className="shrink-0 text-center text-xs font-bold bg-slate-800 text-slate-100 border-r border-slate-600 py-1 truncate"
            style={{ width: count * COL_WIDTH }}
          >
            {key}
          </div>
        ))}
      </div>
      {/* Row 2: Months */}
      <div className="flex border-b border-slate-500">
        <div className="shrink-0 bg-slate-700 border-r border-slate-500" style={{ width: nameColWidth }} />
        {monthGroups.map(({ key, count }) => (
          <div
            key={key}
            className="shrink-0 text-center text-xs font-semibold bg-slate-700 text-slate-100 border-r border-slate-500 py-1 truncate"
            style={{ width: count * COL_WIDTH }}
          >
            {format(new Date(key + '-01'), 'MMMM', { locale: pt }).toUpperCase()}
          </div>
        ))}
      </div>
      {/* Row 3: Weeks */}
      <div className="flex border-b border-slate-200">
        <div
          className="shrink-0 flex items-center px-3 border-r border-slate-200 bg-slate-100"
          style={{ width: nameColWidth }}
        >
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Apartamento</span>
        </div>
        {weeks.map(w => {
          const isCurrentWeek = isSameDay(w, currentWeekStart)
          return (
            <div
              key={w.toISOString()}
              className={cn(
                'shrink-0 border-r text-center text-[10px] py-1',
                isCurrentWeek
                  ? 'bg-emerald-500 text-white font-bold'
                  : 'bg-slate-100 text-slate-500'
              )}
              style={{ width: COL_WIDTH }}
            >
              {format(w, 'dd/MM')}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}
