'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Subscribes to postgres_changes on a table and calls router.refresh()
 * so Server Components re-fetch fresh data automatically.
 * Multiple events within debounceMs are coalesced into a single refresh.
 */
export function useRealtimeRefresh(table: string, debounceMs = 300) {
  const router = useRouter()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`realtime:${table}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => {
          if (timerRef.current) clearTimeout(timerRef.current)
          timerRef.current = setTimeout(() => router.refresh(), debounceMs)
        },
      )
      .subscribe()

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      supabase.removeChannel(channel)
    }
  }, [table, router, debounceMs])
}
