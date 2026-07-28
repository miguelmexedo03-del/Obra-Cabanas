'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { Camera, Plus } from 'lucide-react'
import { toggleElemento } from '@/app/actions/checklist'
import { toast } from 'sonner'
import { EvidenciasDialog } from './evidencias-dialog'

interface Props {
  id: number
  elemento: string
  sub_elemento: string | null
  concluido: boolean
  faseColor: string
  evidenciasCount?: number
}

export function ChecklistItem({ id, elemento, sub_elemento, concluido, faseColor, evidenciasCount = 0 }: Props) {
  const [optimistic, setOptimistic] = useOptimistic(concluido)
  const [isPending, startTransition] = useTransition()
  const [openEvidencias, setOpenEvidencias] = useState(false)
  const [count, setCount] = useState(evidenciasCount)

  function handleChange() {
    const next = !optimistic
    startTransition(async () => {
      setOptimistic(next)
      const result = await toggleElemento(id, next)
      if (!result.success) {
        setOptimistic(!next)
        toast.error('Não foi possível atualizar', { description: result.error })
      }
    })
  }

  function handleEvidenciasClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setOpenEvidencias(true)
  }

  return (
    <label
      className={`flex items-start gap-3 px-4 py-3 min-h-[44px] cursor-pointer
        transition-colors hover:bg-muted/40 active:bg-muted/60
        ${isPending ? 'opacity-60' : ''}`}
    >
      <div className="relative mt-0.5 flex-shrink-0">
        <input
          type="checkbox"
          checked={optimistic}
          onChange={handleChange}
          className="sr-only"
          aria-label={sub_elemento ? `${elemento} — ${sub_elemento}` : elemento}
        />
        <div
          className={`w-5 h-5 rounded-[5px] border-2 flex items-center justify-center
            transition-all duration-150
            ${optimistic ? 'border-transparent' : 'border-input bg-background'}`}
          style={optimistic ? { backgroundColor: faseColor } : {}}
          aria-hidden="true"
        >
          {optimistic && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        {sub_elemento ? (
          <>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide leading-tight mb-0.5">
              {elemento}
            </p>
            <p className={`text-sm leading-relaxed break-words ${
              optimistic ? 'line-through text-muted-foreground' : 'text-foreground/90'
            }`}>
              {sub_elemento}
            </p>
          </>
        ) : (
          <p className={`text-sm leading-relaxed break-words ${
            optimistic ? 'line-through text-muted-foreground' : 'text-foreground'
          }`}>
            {elemento}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={handleEvidenciasClick}
        aria-label="Ver evidências (fotos e observações)"
        className="mt-0.5 flex h-6 min-w-[32px] shrink-0 items-center justify-center gap-1 rounded-md px-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        {count > 0 ? (
          <>
            <Camera className="h-3.5 w-3.5" />
            {count}
          </>
        ) : (
          <Plus className="h-3.5 w-3.5 text-muted-foreground/50" />
        )}
      </button>

      <EvidenciasDialog
        elementoId={id}
        open={openEvidencias}
        onOpenChange={setOpenEvidencias}
        onCountChange={setCount}
      />
    </label>
  )
}
