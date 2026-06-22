'use client'

import { useState } from 'react'
import { Lightbox } from './lightbox'

interface Props {
  fotos: Array<{ id: string; url_publica: string }>
}

export function FotoGrid({ fotos }: Props) {
  const [activeUrl, setActiveUrl] = useState<string | null>(null)

  return (
    <>
      <div className="ml-7 mt-2 flex flex-wrap gap-1.5 print:gap-2">
        {fotos.map(f => (
          <button
            key={f.id}
            type="button"
            onClick={() => setActiveUrl(f.url_publica)}
            className="w-16 h-16 rounded-lg overflow-hidden border border-border
              hover:opacity-90 transition-opacity print:pointer-events-none"
          >
            <img
              src={f.url_publica}
              alt=""
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>

      {activeUrl && (
        <Lightbox url={activeUrl} onClose={() => setActiveUrl(null)} />
      )}
    </>
  )
}
