'use client'

import { useEffect } from 'react'

interface Props {
  shouldPrint: boolean
}

export function PrintTrigger({ shouldPrint }: Props) {
  useEffect(() => {
    if (!shouldPrint) return

    const trigger = () => {
      const images = Array.from(document.querySelectorAll('img'))
      if (images.length === 0) {
        window.print()
        return
      }
      Promise.all(
        images.map(img =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>(resolve => {
                img.onload = () => resolve()
                img.onerror = () => resolve()
              })
        )
      ).then(() => window.print())
    }

    // Small delay for layout to settle, then wait for images
    const t = setTimeout(trigger, 300)
    return () => clearTimeout(t)
  }, [shouldPrint])

  return null
}
