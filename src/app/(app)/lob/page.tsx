import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LobView } from '@/components/lob/lob-view'
import type { FaseParam, LobEntry } from '@/lib/lob'
import { PageHeader } from '@/components/layout'

export default async function LobPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: fases }, { data: tarefas }] = await Promise.all([
    supabase
      .from('fases')
      .select('id, nome, cor_hex, duracao_dias_default')
      .order('ordem'),
    supabase
      .from('tarefas_gantt')
      .select('fase_id, apartamento_id, inicio, fim')
      .eq('nivel', 2)
      .not('inicio', 'is', null)
      .not('fim', 'is', null),
  ])

  const faseParams: FaseParam[] = (fases ?? []).map(f => ({
    id: f.id,
    nome: f.nome,
    cor_hex: f.cor_hex,
    duracao: f.duracao_dias_default,
  }))

  const faseMap = new Map((fases ?? []).map(f => [f.id, f]))

  const actualEntries: LobEntry[] = (tarefas ?? [])
    .filter(t => t.fase_id != null && t.apartamento_id != null)
    .map(t => ({
      fase_id: t.fase_id!,
      fase_nome: faseMap.get(t.fase_id!)?.nome ?? '',
      fase_cor: faseMap.get(t.fase_id!)?.cor_hex ?? '#94a3b8',
      ap: t.apartamento_id!,
      inicio: t.inicio!,
      fim: t.fim!,
    }))

  return (
    <div className="space-y-4">
      <PageHeader title="Line of Balance" description='Cronograma de fluxo de trabalho pelos 24 apartamentos. Ajusta o takt e as durações e clica em "Calcular".' />
      <LobView fases={faseParams} actualEntries={actualEntries} />
    </div>
  )
}
