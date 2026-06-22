'use client'

import { useEffect } from 'react'

interface Props {
  shouldPrint: boolean
}

export function PrintTrigger({ shouldPrint }: Props) {
  useEffect(() => {
    if (!shouldPrint) return
    // Delay to allow images to load before print dialog opens
    const t = setTimeout(() => window.print(), 800)
    return () => clearTimeout(t)
  }, [shouldPrint])

  return null
}
