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

interface FilterOption {
  id: number
  label: string
}

interface Props {
  apartamentos: FilterOption[]
  fases: FilterOption[]
  showApFilter?: boolean
}

export function ChecklistFilters({ apartamentos, fases, showApFilter = true }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [searchValue, setSearchValue] = useState(searchParams.get('q') ?? '')

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) params.set(key, value)
      else params.delete(key)
      startTransition(() => router.replace(`${pathname}?${params.toString()}`))
    },
    [router, pathname, searchParams]
  )

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
          value={searchParams.get('ap') ?? ''}
          onValueChange={(v: string | null) => setParam('ap', v || null)}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Apartamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos os APs</SelectItem>
            {apartamentos.map(a => (
              <SelectItem key={a.id} value={String(a.id)}>
                {a.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select
        value={searchParams.get('fase') ?? ''}
        onValueChange={(v: string | null) => setParam('fase', v || null)}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Fase" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Todas as fases</SelectItem>
          {fases.map(f => (
            <SelectItem key={f.id} value={String(f.id)}>
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get('status') ?? ''}
        onValueChange={(v: string | null) => setParam('status', v || null)}
      >
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Todos</SelectItem>
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
