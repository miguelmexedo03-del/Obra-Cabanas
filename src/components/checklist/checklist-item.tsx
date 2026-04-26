'use client'

import { useOptimistic, useTransition, useState, useEffect } from 'react'
import { toggleElemento } from '@/app/actions/checklist'

interface Props {
  id: number
  elemento: string
  sub_elemento: string | null
  concluido: boolean
  faseColor: string
}

export function ChecklistItem({ id, elemento, sub_elemento, concluido, faseColor }: Props) {
  const [optimistic, setOptimistic] = useOptimistic(concluido)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!error) return
    const t = setTimeout(() => setError(null), 4000)
    return () => clearTimeout(t)
  }, [error])

  function handleChange() {
    const next = !optimistic
    startTransition(async () => {
      setOptimistic(next)
      const result = await toggleElemento(id, next)
      if (!result.success) {
        setOptimistic(!next)
        setError(result.error)
      }
    })
  }

  return (
    <>
    {/* min-h-[44px] ensures 44px touch target as per Apple HIG / WCAG 2.5.5 */}
    <label
      className={`flex items-start gap-3 px-4 py-3 min-h-[44px] cursor-pointer
        rounded-md transition-colors hover:bg-muted/40 active:bg-muted/60
        ${isPending ? 'opacity-60' : ''}`}
    >
      <div className="relative mt-0.5 flex-shrink-0">
        <input
          type="checkbox"
          checked={optimistic}
          onChange={handleChange}
          className="sr-only"
          aria-label={elemento}
        />
        {/* Custom checkbox — 20×20px visual, inside 44px touch label */}
        <div
          className={`w-5 h-5 rounded border-2 flex items-center justify-center
            transition-all duration-150
            ${optimistic ? 'border-transparent' : 'border-input bg-background'}`}
          style={optimistic ? { backgroundColor: faseColor } : {}}
          aria-hidden="true"
        >
          {optimistic && (
            <svg
              className="w-3 h-3 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p
          className={`text-sm leading-relaxed break-words ${
            optimistic ? 'line-through text-muted-foreground' : 'text-foreground'
          }`}
        >
          {elemento}
        </p>
        {sub_elemento && (
          <p className="text-xs text-muted-foreground mt-0.5 break-words">{sub_elemento}</p>
        )}
      </div>
    </label>
    {error && (
      <p role="alert" className="text-xs text-destructive px-4 pb-1">
        {error}
      </p>
    )}
    </>
  )
}
