'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useRef, useState, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { TIPOS_DIVISAO } from '@/lib/utils'

const ALL = '__all__'

interface FilterOption {
  id: number
  label: string
}

interface Props {
  apartamentos: FilterOption[]
  fases: FilterOption[]
  divisoes?: FilterOption[]
  showApFilter?: boolean
  showTipoFilter?: boolean
}

export function ChecklistFilters({ apartamentos, fases, divisoes, showApFilter = true, showTipoFilter = false }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [searchValue, setSearchValue] = useState(searchParams.get('q') ?? '')

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value === null) params.delete(key)
      else params.set(key, value)
      startTransition(() => router.replace(`${pathname}?${params.toString()}`))
    },
    [router, pathname, searchParams]
  )

  function handleApChange(v: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (v === null || v === ALL) {
      params.delete('ap')
      params.delete('divisao')
    } else {
      params.set('ap', v)
      params.delete('divisao')
    }
    startTransition(() => router.replace(`${pathname}?${params.toString()}`))
  }

  function handleSearch(value: string) {
    setSearchValue(value)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      setParam('q', value.trim() || null)
    }, 300)
  }

  function clearAll() {
    setSearchValue('')
    startTransition(() => router.replace(pathname))
  }

  const hasFilters = searchParams.size > 0

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {showApFilter && (
        <Select
          value={searchParams.get('ap') ?? undefined}
          onValueChange={handleApChange}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue>
              {searchParams.get('ap')
                ? (apartamentos.find(a => String(a.id) === searchParams.get('ap'))?.label ?? 'Apartamento')
                : <span className="text-muted-foreground">Apartamento</span>}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os APs</SelectItem>
            {apartamentos.map(a => (
              <SelectItem key={a.id} value={String(a.id)}>
                {a.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select
        value={searchParams.get('fase') ?? undefined}
        onValueChange={(v: string | null) => setParam('fase', v === null || v === ALL ? null : v)}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue>
            {searchParams.get('fase')
              ? (fases.find(f => String(f.id) === searchParams.get('fase'))?.label ?? 'Fase')
              : <span className="text-muted-foreground">Fase</span>}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todas as fases</SelectItem>
          {fases.map(f => (
            <SelectItem key={f.id} value={String(f.id)}>
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showTipoFilter && (
        <Select
          value={searchParams.get('tipo') ?? undefined}
          onValueChange={(v: string | null) => setParam('tipo', v === null || v === ALL ? null : v)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue>
              {searchParams.get('tipo') ?? <span className="text-muted-foreground">Tipo de Divisão</span>}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os tipos</SelectItem>
            {TIPOS_DIVISAO.map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {divisoes && divisoes.length > 0 && (
        <Select
          value={searchParams.get('divisao') ?? undefined}
          onValueChange={(v: string | null) => setParam('divisao', v === null || v === ALL ? null : v)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue>
              {searchParams.get('divisao')
                ? (divisoes.find(d => String(d.id) === searchParams.get('divisao'))?.label ?? 'Divisão')
                : <span className="text-muted-foreground">Divisão</span>}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas as divisões</SelectItem>
            {divisoes.map(d => (
              <SelectItem key={d.id} value={String(d.id)}>{d.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select
        value={searchParams.get('status') ?? undefined}
        onValueChange={(v: string | null) => setParam('status', v === null || v === ALL ? null : v)}
      >
        <SelectTrigger className="w-[120px]">
          <SelectValue>
            {searchParams.get('status') === 'unchecked' ? 'Por fazer'
              : searchParams.get('status') === 'checked' ? 'Concluídos'
              : <span className="text-muted-foreground">Estado</span>}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos</SelectItem>
          <SelectItem value="unchecked">Por fazer</SelectItem>
          <SelectItem value="checked">Concluídos</SelectItem>
        </SelectContent>
      </Select>

      <Input
        placeholder="Pesquisar (ex: porta)"
        value={searchValue}
        onChange={e => handleSearch(e.target.value)}
        className="w-full sm:w-[200px]"
        aria-label="Pesquisar elementos"
      />

      {(hasFilters || searchValue) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAll}
          className="gap-1.5 text-muted-foreground"
          aria-label="Limpar filtros"
        >
          <X className="h-3.5 w-3.5" />
          Limpar
        </Button>
      )}
    </div>
  )
}
