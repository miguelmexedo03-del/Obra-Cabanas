'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, Check } from 'lucide-react'

interface Props {
  onAdd: (nome: string) => void
}

export function AddItemInline({ onAdd }: Props) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  function handleSubmit() {
    const trimmed = value.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setValue('')
    setOpen(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); handleSubmit() }
    if (e.key === 'Escape') { setValue(''); setOpen(false) }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-muted-foreground
          hover:text-foreground hover:bg-muted/40 transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        Adicionar item
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-t">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Nome do item..."
        className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
      />
      <button
        onClick={handleSubmit}
        disabled={!value.trim()}
        className="flex-shrink-0 p-1 rounded text-primary hover:bg-primary/10
          disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Confirmar"
      >
        <Check className="h-4 w-4" />
      </button>
    </div>
  )
}
