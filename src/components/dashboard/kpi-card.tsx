interface KpiCardProps {
  label: string
  value: string
  sub?: string
  accent?: string
}

export function KpiCard({ label, value, sub, accent }: KpiCardProps) {
  return (
    <div
      className="rounded-lg border bg-card p-4"
      style={accent ? { borderLeftColor: accent, borderLeftWidth: 4 } : undefined}
    >
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-semibold mt-1 truncate">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}
