import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GerirItensClient } from './_components/gerir-itens-client'

type DivisaoRow = {
  id: number
  nome: string
  apartamento_id: number
  apartamentos: { codigo: string } | null
}

function normalizarNome(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/\s+\d+$/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export default async function GerirItensPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [fasesResult, divisoesResult] = await Promise.all([
    supabase.from('fases').select('id, nome').order('ordem'),
    supabase
      .from('divisoes')
      .select('id, nome, apartamento_id, apartamentos(codigo)')
      .order('apartamento_id')
      .order('ordem'),
  ])

  const fases = (fasesResult.data ?? []).map(f => ({ id: f.id as number, nome: f.nome as string }))
  const divisoes = (divisoesResult.data ?? []) as DivisaoRow[]

  // Group divisions by normalized name so the wizard can offer "Quarto" (24 instances) as one group
  const groupMap = new Map<string, {
    displayName: string
    divisoes: { id: number; nome: string; apartamentoId: number; apartamentoCodigo: string }[]
  }>()

  for (const d of divisoes) {
    const key = normalizarNome(d.nome)
    if (!groupMap.has(key)) {
      groupMap.set(key, { displayName: d.nome, divisoes: [] })
    }
    const g = groupMap.get(key)!
    g.divisoes.push({
      id: d.id,
      nome: d.nome,
      apartamentoId: d.apartamento_id,
      apartamentoCodigo: d.apartamentos?.codigo ?? '—',
    })
  }

  const grupos = Array.from(groupMap.entries())
    .map(([key, g]) => ({ key, displayName: g.displayName, divisoes: g.divisoes }))
    // Sort by group size descending — most common divisions appear first
    .sort((a, b) => b.divisoes.length - a.divisoes.length)

  return (
    <GerirItensClient fases={fases} grupos={grupos} />
  )
}
