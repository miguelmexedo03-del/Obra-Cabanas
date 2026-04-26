import { createClient } from '@/lib/supabase/server'
import { GanttChart } from '@/components/gantt/gantt-chart'
import { redirect } from 'next/navigation'

export default async function GanttPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: tarefas }, { data: fases }, { data: profile }] = await Promise.all([
    supabase.from('tarefas_gantt').select('*').order('apartamento_id').order('nivel'),
    supabase.from('fases').select('id, nome, cor_hex').order('ordem'),
    supabase.from('profiles').select('role').eq('id', user.id).single(),
  ])

  const canEdit = profile?.role === 'admin' || profile?.role === 'encarregado'

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Gantt — Obra Cabanas</h1>
        <p className="text-sm text-muted-foreground">
          {canEdit ? 'Arrasta as barras ou clica para editar datas.' : 'Só leitura.'}
        </p>
      </div>
      <GanttChart
        tarefas={tarefas ?? []}
        fases={fases ?? []}
        canEdit={canEdit}
      />
    </div>
  )
}
