import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { ChevronLeft, ListChecks, FileText, Printer } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ChecklistFilters } from '@/components/checklist/checklist-filters'
import { ChecklistItem } from '@/components/checklist/checklist-item'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { sanitizeIlikePattern, sortElementos } from '@/lib/utils'
import { PageHeader, EmptyState } from '@/components/layout'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ fase?: string; status?: string; q?: string; divisao?: string }>
}

type RawElemento = {
  id: number
  elemento: string
  sub_elemento: string | null
  concluido: boolean
  divisao_id: number | null
  fase_id: number
  divisoes: { id: number; nome: string; ordem: number } | null
  fases: { nome: string; cor_hex: string } | null
}

type DivisaoGroup = {
  id: number | null
  nome: string
  faseColor: string
  concluidos: number
  items: RawElemento[]
}

export default async function ApartamentoPage({ params, searchParams }: Props) {
  const { id } = await params
  const filters = await searchParams
  const apId = Number(id)
  if (isNaN(apId)) notFound()

  const supabase = await createClient()

  type ApRow = { id: number; codigo: string; descricao: string | null }
  type ProgressoRow = { apartamento_id: number; total: number; concluidos: number; percentagem: number }

  const apResult = await supabase.from('apartamentos').select('id, codigo, descricao').eq('id', apId).single()
  const ap = apResult.data as ApRow | null

  type FaseRow = { id: number; nome: string; cor_hex: string; ordem: number }

  const [fasesResult, progressoResult, divisoesResult] = await Promise.all([
    supabase.from('fases').select('id, nome, cor_hex, ordem').order('ordem'),
    supabase.from('progresso_por_apartamento').select('*').eq('apartamento_id', apId).single(),
    supabase.from('divisoes').select('id, nome, ordem').eq('apartamento_id', apId).order('ordem'),
  ])
  const fases = fasesResult.data as FaseRow[] | null
  const progresso = progressoResult.data as ProgressoRow | null
  const divisoes = divisoesResult.data as { id: number; nome: string; ordem: number }[] | null

  if (!ap) notFound()

  let query = supabase
    .from('elementos')
    .select(`
      id, elemento, sub_elemento, concluido, divisao_id, fase_id,
      divisoes(id, nome, ordem),
      fases(nome, cor_hex)
    `)
    .eq('apartamento_id', apId)
    .order('divisao_id')
    .order('id')
    .not('divisao_id', 'is', null)

  if (filters.fase) query = query.eq('fase_id', Number(filters.fase))
  if (filters.divisao) query = query.eq('divisao_id', Number(filters.divisao))
  if (filters.status === 'checked') query = query.eq('concluido', true)
  if (filters.status === 'unchecked') query = query.eq('concluido', false)
  if (filters.q?.trim()) {
    const q = sanitizeIlikePattern(filters.q)
    if (q) query = query.or(`elemento.ilike.%${q}%,sub_elemento.ilike.%${q}%`)
  }

  const { data: elementos } = await query as { data: RawElemento[] | null; error: unknown }

  // Group by divisão, preserving order
  const groupMap = new Map<string, DivisaoGroup>()
  for (const el of elementos ?? []) {
    const key = String(el.divisao_id ?? 'null')
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        id: el.divisao_id,
        nome: el.divisoes?.nome ?? '—',
        faseColor: el.fases?.cor_hex ?? '#888888',
        concluidos: 0,
        items: [],
      })
    }
    const group = groupMap.get(key)!
    group.items.push(el)
    if (el.concluido) group.concluidos++
  }

  const groups = Array.from(groupMap.values()).map(g => ({
    ...g,
    items: sortElementos(g.items),
  }))
  const pct = (progresso?.percentagem ?? 0) * 100
  const totalFiltered = elementos?.length ?? 0

  return (
    <div>
      {/* Back link */}
      <Link
        href="/apartamentos"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Apartamentos
      </Link>

      {/* Header */}
      <PageHeader
        title={ap.codigo}
        description={ap.descricao ?? undefined}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm">
              {Math.round(pct)}%
            </Badge>
            <Button variant="outline" size="sm" render={<a href={`/relatorio?ap=${ap.id}`} target="_blank" rel="noopener noreferrer" />}>
              <FileText className="h-4 w-4" />
              Ver Relatório
            </Button>
            <Button size="sm" render={<a href={`/relatorio?ap=${ap.id}&print=1`} target="_blank" rel="noopener noreferrer" />}>
              <Printer className="h-4 w-4" />
              Exportar PDF
            </Button>
          </div>
        }
      />

      <Progress value={pct} className="mb-6 h-1.5" />
      <p className="text-xs text-muted-foreground mb-6">
        {progresso?.concluidos ?? 0} / {progresso?.total ?? 0} itens concluídos
      </p>

      {/* Filters */}
      <div className="mb-4">
        <Suspense>
          <ChecklistFilters
            apartamentos={[]}
            fases={fases?.map(f => ({ id: f.id, label: f.nome })) ?? []}
            divisoes={divisoes?.map(d => ({ id: d.id, label: d.nome })) ?? []}
            showApFilter={false}
          />
        </Suspense>
      </div>

      {/* List */}
      {groups.length === 0 ? (
        <EmptyState icon={ListChecks} title="Nenhum item encontrado" description="Ajusta os filtros para ver resultados." />
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">{totalFiltered} itens</p>
          {groups.map((group, i) => (
            <div key={i} className="rounded-lg border overflow-hidden">
              <div
                className="px-4 py-2.5 flex items-center gap-2 border-b bg-muted/30"
                style={{ borderLeftColor: group.faseColor, borderLeftWidth: '3px' }}
              >
                <span className="text-sm font-medium flex-1 truncate">{group.nome}</span>
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
      )}
    </div>
  )
}
