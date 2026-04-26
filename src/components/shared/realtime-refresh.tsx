'use client'

import { useRealtimeRefresh } from '@/hooks/use-realtime-refresh'

interface RealtimeRefreshProps {
  table: string
}

/**
 * Mount inside a Server Component to get automatic refresh when the table changes.
 * Renders nothing — side effect only.
 */
export function RealtimeRefresh({ table }: RealtimeRefreshProps) {
  useRealtimeRefresh(table)
  return null
}
