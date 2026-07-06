'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { TIPOS_DIVISAO } from '@/lib/utils'

interface FaseOption {
  id: number
  label: string
}

interface Props {
  fases: FaseOption[]
}

export function ConsultaFilters({ fases }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value === null) params.delete(key)
      else params.set(key, value)
      startTransition(() => router.replace(`${pathname}?${params.toString()}`))
    },
    [router, pathname, searchParams]
  )

  const tipo = searchParams.get('tipo') ?? undefined
  const fase = searchParams.get('fase') ?? undefined
  const estado = searchParams.get('estado') ?? 'completo'

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <Select value={tipo} onValueChange={(v: string | null) => { if (v) setParam('tipo', v) }}>
        <SelectTrigger className="w-[160px]">
          <SelectValue>
            {tipo ?? <span className="text-muted-foreground">Tipo de Divisão</span>}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {TIPOS_DIVISAO.map(t => (
            <SelectItem key={t} value={t}>{t}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={fase} onValueChange={(v: string | null) => { if (v) setParam('fase', v) }}>
        <SelectTrigger className="w-[160px]">
          <SelectValue>
            {fase
              ? (fases.find(f => String(f.id) === fase)?.label ?? 'Fase')
              : <span className="text-muted-foreground">Fase</span>}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {fases.map(f => (
            <SelectItem key={f.id} value={String(f.id)}>{f.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={estado} onValueChange={(v: string | null) => { if (v) setParam('estado', v) }}>
        <SelectTrigger className="w-[140px]">
          <SelectValue>
            {estado === 'incompleto' ? 'Incompleto' : estado === 'todos' ? 'Todos' : 'Completo'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="completo">Completo</SelectItem>
          <SelectItem value="incompleto">Incompleto</SelectItem>
          <SelectItem value="todos">Todos</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
