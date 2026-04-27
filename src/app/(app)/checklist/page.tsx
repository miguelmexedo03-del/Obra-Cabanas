import { Suspense } from 'react'
import { ListChecks } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ChecklistFilters } from '@/components/checklist/checklist-filters'
import { ChecklistItem } from '@/components/checklist/checklist-item'
import { RealtimeRefresh } from '@/components/shared/realtime-refresh'
import { sanitizeIlikePattern } from '@/lib/utils'
import { PageHeader, EmptyState } from '@/components/layout'

interface Props {
  searchParams: Promise<{
    ap?: string
    fase?: string
    status?: string
    q?: string
  }>
}

type RawElemento = {
  id: number
  elemento: string
  sub_elemento: string | null
  concluido: boolean
  apartamento_id: number
  divisao_id: number | null
  fase_id: number
  divisoes: { id: number; nome: string; ordem: number } | null
  fases: { nome: string; cor_hex: string } | null
  apartamentos: { codigo: string } | null
}

type Group = {
  apCodigo: string
  divisaoNome: string
  faseColor: string
  concluidos: number
  items: RawElemento[]
}

async function ChecklistContent({ searchParams }: Props) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('elementos')
    .select(`
      id, elemento, sub_elemento, concluido, apartamento_id, divisao_id, fase_id,
      divisoes(id, nome, ordem),
      fases(nome, cor_hex),
      apartamentos(codigo)
    `)
    .order('apartamento_id')
    .order('divisao_id')
    .order('id')
    .limit(500)

  if (params.ap) query = query.eq('apartamento_id', Number(params.ap))
  if (params.fase) query = query.eq('fase_id', Number(params.fase))
  if (params.status === 'checked') query = query.eq('concluido', true)
  if (params.status === 'unchecked') query = query.eq('concluido', false)
  if (params.q?.trim()) {
    const q = sanitizeIlikePattern(params.q)
    if (q) query = query.or(`elemento.ilike.%${q}%,sub_elemento.ilike.%${q}%`)
  }

  const { data: elementos, error } = await query as { data: RawElemento[] | null; error: unknown }

  if (error) {
    return <p className="text-sm text-destructive py-8">Erro ao carregar dados.</p>
  }

  if (!elementos?.length) {
    return (
      <EmptyState
        icon={ListChecks}
        title="Nenhum item encontrado"
        description={
          Object.keys(params).length === 0
            ? 'Seleciona um apartamento ou usa a pesquisa para ver itens.'
            : 'Ajusta os filtros para ver resultados.'
        }
      />
    )
  }

  // Group: apartamento → divisão
  const groupMap = new Map<string, Group>()
  for (const el of elementos) {
    const apCodigo = el.apartamentos?.codigo ?? `AP${el.apartamento_id}`
    const divisaoNome = el.divisoes?.nome ?? 'Sem divisão'
    const faseColor = el.fases?.cor_hex ?? '#888888'
    const key = `${el.apartamento_id}__${el.divisao_id ?? 'null'}`

    if (!groupMap.has(key)) {
      groupMap.set(key, { apCodigo, divisaoNome, faseColor, concluidos: 0, items: [] })
    }
    const group = groupMap.get(key)!
    group.items.push(el)
    if (el.concluido) group.concluidos++
  }

  const groups = Array.from(groupMap.values())

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {elementos.length} itens {elementos.length === 500 ? '(limite 500 — aplica filtros para ver mais)' : ''}
      </p>
      {groups.map((group, i) => (
        <div key={i} className="rounded-lg border overflow-hidden">
          <div className="bg-muted/40 px-4 py-2.5 flex items-center gap-2 border-b">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: group.faseColor }}
              aria-hidden="true"
            />
            <span className="text-xs font-medium text-muted-foreground">{group.apCodigo}</span>
            <span className="text-xs text-muted-foreground" aria-hidden="true">›</span>
            <span className="text-sm font-medium flex-1 truncate">{group.divisaoNome}</span>
            <span className="text-xs text-muted-foreground shrink-0">
              {group.concluidos}/{group.items.length}
            </span>
          </div>
          <div className="divide-y">
            {group.items.map(el => (
              <ChecklistItem
                key={el.id}
                id={el.id}
                elemento={el.elemento}
                sub_elemento={el.sub_elemento}
                concluido={el.concluido}
                faseColor={group.faseColor}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default async function ChecklistPage({ searchParams }: Props) {
  const supabase = await createClient()

  const [apResult, fasesResult] = await Promise.all([
    supabase.from('apartamentos').select('id, codigo').order('id'),
    supabase.from('fases').select('id, nome, cor_hex, ordem').order('ordem'),
  ])

  const apartamentos = apResult.data as { id: number; codigo: string }[] | null
  const fases = fasesResult.data as { id: number; nome: string; cor_hex: string; ordem: number }[] | null

  return (
    <div>
      <RealtimeRefresh table="elementos" />
      <PageHeader
        title="Checklist global"
        description="Filtra por apartamento, fase, estado ou pesquisa direta"
      />

      <div className="mb-4">
        <Suspense>
          <ChecklistFilters
            apartamentos={apartamentos?.map(a => ({ id: a.id, label: a.codigo })) ?? []}
            fases={fases?.map(f => ({ id: f.id, label: f.nome })) ?? []}
          />
        </Suspense>
      </div>

      <Suspense fallback={<p className="text-sm text-muted-foreground py-4">A carregar…</p>}>
        <ChecklistContent searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
