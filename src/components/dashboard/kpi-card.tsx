import { LucideIcon, TrendingDown, TrendingUp } from 'lucide-react'

interface KpiCardProps {
  label: string
  value: string
  sub?: string
  accent?: string
  icon?: LucideIcon
  trend?: 'up' | 'down'
}

export function KpiCard({ label, value, sub, accent = '#626D3A', icon: Icon, trend }: KpiCardProps) {
  const TrendIcon = trend === 'down' ? TrendingDown : TrendingUp

  return (
    <div className="rounded-xl border border-border bg-card p-5 ring-1 ring-foreground/5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        {Icon && (
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
            style={{ backgroundColor: `${accent}1A`, color: accent }}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
      <p className="mt-2 text-[1.75rem] leading-none font-semibold tabular-nums tracking-tight text-foreground truncate">
        {value}
      </p>
      {sub && (
        <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          {trend && <TrendIcon className="h-3 w-3" style={{ color: accent }} />}
          {sub}
        </p>
      )}
    </div>
  )
}
