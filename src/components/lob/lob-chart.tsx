'use client'

import { differenceInDays, parseISO, eachMonthOfInterval, format } from 'date-fns'
import { pt } from 'date-fns/locale'
import type { LobEntry, FaseParam } from '@/lib/lob'

const CW = 1200
const CH = 520
const LM = 52
const TM = 36
const BM = 20
const RM = 10
const GW = CW - LM - RM
const GH = CH - TM - BM
const ROW_H = GH / 24

interface LobChartProps {
  entries: LobEntry[]
  fases: FaseParam[]
  viewStart: Date
  viewEnd: Date
}

export function LobChart({ entries, fases, viewStart, viewEnd }: LobChartProps) {
  const today = new Date()
  const totalDays = Math.max(differenceInDays(viewEnd, viewStart) + 1, 1)
  const dw = GW / totalDays

  function xFor(d: Date): number {
    return LM + differenceInDays(d, viewStart) * dw
  }

  const monthTicks = eachMonthOfInterval({ start: viewStart, end: viewEnd })
  const todayX = xFor(today)
  const showToday = todayX >= LM && todayX <= CW - RM

  return (
    <div className="overflow-x-auto rounded-lg border bg-background">
      <svg
        viewBox={`0 0 ${CW} ${CH}`}
        width={CW}
        height={CH}
        aria-label="Line of Balance"
        style={{ display: 'block', fontFamily: 'inherit' }}
      >
        {/* Zebra stripes */}
        {Array.from({ length: 24 }, (_, i) =>
          i % 2 === 0 ? (
            <rect
              key={i}
              x={LM}
              y={TM + i * ROW_H}
              width={GW}
              height={ROW_H}
              fill="#f8fafc"
            />
          ) : null
        )}

        {/* Month grid lines + labels */}
        {monthTicks.map(d => {
          const x = xFor(d)
          if (x < LM || x > CW - RM) return null
          return (
            <g key={d.toISOString()}>
              <line x1={x} y1={TM} x2={x} y2={CH - BM} stroke="#e2e8f0" strokeWidth={1} />
              <text x={x + 3} y={TM - 6} fontSize={10} fill="#94a3b8">
                {format(d, 'MMM yy', { locale: pt })}
              </text>
            </g>
          )
        })}

        {/* AP labels */}
        {Array.from({ length: 24 }, (_, i) => {
          const ap = i + 1
          const y = TM + i * ROW_H + ROW_H / 2 + 4
          return (
            <text key={ap} x={LM - 4} y={y} fontSize={10} fill="#64748b" textAnchor="end">
              AP{ap}
            </text>
          )
        })}

        {/* LoB bars */}
        {entries.map((e, idx) => {
          const x0 = xFor(parseISO(e.inicio))
          const x1 = xFor(parseISO(e.fim)) + dw
          const clampedX = Math.max(x0, LM)
          const clampedW = Math.min(x1, CW - RM) - clampedX
          if (clampedW <= 0) return null

          const y = TM + (e.ap - 1) * ROW_H + ROW_H * 0.12
          const h = ROW_H * 0.76

          return (
            <rect key={idx} x={clampedX} y={y} width={clampedW} height={h} fill={e.fase_cor} rx={2} opacity={0.85}>
              <title>{`${e.fase_nome} — AP${e.ap}: ${e.inicio} → ${e.fim}`}</title>
            </rect>
          )
        })}

        {/* Today line */}
        {showToday && (
          <line
            x1={todayX} y1={TM}
            x2={todayX} y2={CH - BM}
            stroke="#ef4444"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
        )}

        {/* Border lines */}
        <line x1={LM} y1={TM} x2={LM} y2={CH - BM} stroke="#e2e8f0" strokeWidth={1} />
        <line x1={LM} y1={CH - BM} x2={CW - RM} y2={CH - BM} stroke="#e2e8f0" strokeWidth={1} />
      </svg>

      {/* Legenda */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-2 border-t">
        {fases.map(f => (
          <div key={f.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: f.cor_hex }} />
            {f.nome}
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <div className="w-3 h-px border-t-2 border-dashed border-red-400" />
          Hoje
        </div>
      </div>
    </div>
  )
}
