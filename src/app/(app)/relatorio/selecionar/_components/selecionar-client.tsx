'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, FileDown, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  apartamentos: Array<{ id: number; codigo: string }>
}

export function SelecionarClient({ apartamentos }: Props) {
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const toggle = (id: number) =>
    setSelected(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })

  const allSelected = selected.size === apartamentos.length

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(apartamentos.map(a => a.id)))

  const sortedIds = () => Array.from(selected).sort((a, b) => a - b)

  const exportHtml = () => {
    if (!selected.size) return
    const query = sortedIds().map(id => `ap=${id}`).join('&')
    const a = document.createElement('a')
    a.href = `/relatorio/export?${query}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const exportPdf = () => {
    if (!selected.size) return
    const query = sortedIds().map(id => `aps=${id}`).join('&')
    window.open(`/relatorio/multi?${query}&print=1`, '_blank', 'noopener,noreferrer')
  }

  const n = selected.size

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-lg border bg-card p-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Exportar Relatórios</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {n === 0
              ? 'Seleciona os apartamentos a exportar'
              : `${n} apartamento${n > 1 ? 's' : ''} selecionado${n > 1 ? 's' : ''}`}
          </p>
        </div>
        <Button variant="outline" size="sm" render={<Link href="/apartamentos" />} nativeButton={false}>
          <ChevronLeft className="h-4 w-4" />
          Voltar
        </Button>
      </div>

      <div className="rounded-lg border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium">Apartamentos</span>
          <button onClick={toggleAll} className="text-sm text-primary hover:underline">
            {allSelected ? 'Limpar seleção' : 'Selecionar todos'}
          </button>
        </div>
        <div className="grid grid-cols-6 gap-2">
          {apartamentos.map(ap => (
            <button
              key={ap.id}
              onClick={() => toggle(ap.id)}
              className={`rounded-md border py-2 text-sm font-medium transition-colors
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                ${selected.has(ap.id)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background hover:bg-muted border-border text-foreground'
                }`}
            >
              {ap.codigo}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" disabled={n === 0} onClick={exportHtml}>
          <FileDown className="h-4 w-4" />
          Exportar HTML{n > 0 ? ` (${n})` : ''}
        </Button>
        <Button disabled={n === 0} onClick={exportPdf}>
          <Printer className="h-4 w-4" />
          Exportar PDF{n > 0 ? ` (${n})` : ''}
        </Button>
      </div>
    </div>
  )
}
