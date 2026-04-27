import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { KanbanBoard } from '@/components/kanban/kanban-board'
import type { KanbanCardData } from '@/components/kanban/kanban-card'
import { PageHeader } from '@/components/layout'

export default async function KanbanPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: rawCards } = await supabase
    .from('kanban_cards')
    .select('id, apartamento_codigo, fase_nome, fase_cor, inicio, fim, status, responsavel_nome, progresso')
    .order('apartamento_id')
    .order('fase_id')

  // View columns are all nullable in generated types; filter incomplete rows
  const cards: KanbanCardData[] = (rawCards ?? [])
    .filter(r => r.id != null && r.apartamento_codigo != null && r.fase_nome != null)
    .map(r => ({
      id: r.id!,
      apartamento_codigo: r.apartamento_codigo!,
      fase_nome: r.fase_nome!,
      fase_cor: r.fase_cor ?? '#94a3b8',
      inicio: r.inicio ?? null,
      fim: r.fim ?? null,
      status: r.status ?? 'por_fazer',
      responsavel_nome: r.responsavel_nome ?? null,
      progresso: r.progresso ?? 0,
    }))

  const canEdit = true

  return (
    <div className="space-y-4">
      <PageHeader title="Kanban" description="Tarefas por estado" />

      <KanbanBoard cards={cards} canEdit={canEdit} />
    </div>
  )
}
