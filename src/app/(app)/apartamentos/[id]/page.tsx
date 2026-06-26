import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { ChevronLeft, ListChecks, FileText, Printer } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ChecklistFilters } from '@/components/checklist/checklist-filters'
import { ChecklistGroups } from '@/components/checklist/checklist-groups'
import type { ChecklistGroupData } from '@/components/checklist/checklist-groups'
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
  concluidos: number
  items: RawElemento[]
}

function getDefaultFaseId(items: { fase_id: number }[]): number {
  if (items.length === 0) return 1
  const counts = new Map<number, number>()
  for (const item of items) {
    counts.set(item.fase_id, (counts.get(item.fase_id) ?? 0) + 1)
  }
  let bestId = items[0].fase_id
  let bestCount = 0
  for (const [faseId, count] of counts) {
    if (count > bestCount) { bestCount = count; bestId = faseId }
  }
  return bestId
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

  // Unfiltered query — used only to compute defaultFaseId per divisão (Fix #1: avoid fase filter bias)
  const { data: allElementos } = await supabase
    .from('elementos')
    .select('id, divisao_id, fase_id')
    .eq('apartamento_id', apId)

  // Group by divisão, preserving order
  const groupMap = new Map<string, DivisaoGroup>()
  for (const el of elementos ?? []) {
    const key = String(el.divisao_id ?? 'null')
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        id: el.divisao_id,
        nome: el.divisoes?.nome ?? '—',
        concluidos: 0,
        items: [],
      })
    }
    const group = groupMap.get(key)!
    group.items.push(el)
    if (el.concluido) group.concluidos++
  }

  const groups: ChecklistGroupData[] = Array.from(groupMap.values()).map(g => {
    const sorted = sortElementos(g.items)
    // Fix #1: compute defaultFaseId from unfiltered elements so a fase filter doesn't bias the result
    const unfiltered = (allElementos ?? []).filter(el => el.divisao_id === g.id)
    const defaultFaseId = getDefaultFaseId(unfiltered.length > 0 ? unfiltered : sorted)
    // Fix #2: derive faseColor from the majority fase, not from the first item in DB order
    const faseColor = fases?.find(f => f.id === defaultFaseId)?.cor_hex ?? '#94a3b8'
    return {
      id: g.id,
      nome: g.nome,
      faseColor,
      defaultFaseId,
      concluidos: g.concluidos,
      items: sorted,
    }
  })
  const pct = (progresso?.percentagem ?? 0) * 100

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
        <ChecklistGroups initialGroups={groups} apartamentoId={apId} />
      )}
    </div>
  )
}
