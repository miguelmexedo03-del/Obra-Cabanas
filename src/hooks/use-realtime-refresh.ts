'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Subscribes to postgres_changes on a table and calls router.refresh()
 * so Server Components re-fetch fresh data automatically.
 */
export function useRealtimeRefresh(table: string) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`realtime:${table}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => router.refresh(),
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [table, router])
}
