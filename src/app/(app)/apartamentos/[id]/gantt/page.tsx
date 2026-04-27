import { createClient } from '@/lib/supabase/server'
import { GanttChart } from '@/components/gantt/gantt-chart'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ApartamentoGanttPage({ params }: Props) {
  const { id } = await params
  const apId = Number(id)
  if (isNaN(apId) || apId < 1 || apId > 24) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: tarefas }, { data: fases }, { data: ap }] = await Promise.all([
    supabase.from('tarefas_gantt').select('*').eq('apartamento_id', apId).order('nivel'),
    supabase.from('fases').select('id, nome, cor_hex').order('ordem'),
    supabase.from('apartamentos').select('codigo, descricao').eq('id', apId).single(),
  ])

  if (!ap) notFound()

  const canEdit = true

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <Link href={`/apartamentos/${apId}`} className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold">Gantt — {ap.codigo}</h1>
          {ap.descricao && <p className="text-sm text-muted-foreground">{ap.descricao}</p>}
        </div>
      </div>
      <GanttChart
        tarefas={tarefas ?? []}
        fases={fases ?? []}
        canEdit={canEdit}
      />
    </div>
  )
}
