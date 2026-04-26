'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { FaseParam } from '@/lib/lob'

interface LobTaktFormProps {
  fases: FaseParam[]
  onCalculate: (params: { inicioBase: Date; takt: number; fases: FaseParam[] }) => void
  isLoading?: boolean
}

export function LobTaktForm({ fases, onCalculate, isLoading }: LobTaktFormProps) {
  const [inicioBase, setInicioBase] = useState(new Date().toISOString().slice(0, 10))
  const [takt, setTakt] = useState(7)
  const [duracoes, setDuracoes] = useState<Record<number, number>>(
    Object.fromEntries(fases.map(f => [f.id, f.duracao])),
  )

  const totalDays = fases.reduce((s, f) => s + (duracoes[f.id] ?? f.duracao), 0) + 23 * takt

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!inicioBase) return
    const updatedFases = fases.map(f => ({ ...f, duracao: Math.max(1, duracoes[f.id] ?? f.duracao) }))
    onCalculate({ inicioBase: new Date(inicioBase + 'T00:00:00'), takt, fases: updatedFases })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Data início (AP1, Fase 1)</label>
          <Input
            type="date"
            value={inicioBase}
            onChange={e => setInicioBase(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Takt (dias entre APs)</label>
          <Input
            type="number"
            min={1}
            max={90}
            value={takt}
            onChange={e => setTakt(Math.max(1, Number(e.target.value)))}
          />
        </div>
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Duração por fase (dias)</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {fases.map(f => (
            <div key={f.id} className="space-y-1">
              <label className="text-xs flex items-center gap-1.5 text-muted-foreground">
                <span
                  className="w-2.5 h-2.5 rounded-sm inline-block shrink-0"
                  style={{ backgroundColor: f.cor_hex }}
                />
                {f.nome}
              </label>
              <Input
                type="number"
                min={1}
                className="h-8 text-sm"
                value={duracoes[f.id] ?? f.duracao}
                onChange={e =>
                  setDuracoes(prev => ({ ...prev, [f.id]: Math.max(1, Number(e.target.value)) }))
                }
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={isLoading}>
          Calcular LoB
        </Button>
        <p className="text-xs text-muted-foreground">
          Duração total estimada: <strong>{totalDays} dias</strong>{' '}
          ({Math.ceil(totalDays / 7)} semanas)
        </p>
      </div>
    </form>
  )
}
