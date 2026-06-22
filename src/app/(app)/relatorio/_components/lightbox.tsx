'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'

interface Props {
  url: string
  onClose: () => void
}

export function Lightbox({ url, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[300] bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        type="button"
        aria-label="Fechar foto"
        onClick={onClose}
        className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/20 text-white
          flex items-center justify-center hover:bg-white/30 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
      <img
        src={url}
        alt=""
        className="max-w-[92vw] max-h-[88vh] object-contain rounded"
        onClick={e => e.stopPropagation()}
      />
    </div>
  )
}
