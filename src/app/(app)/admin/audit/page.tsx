import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout'

type AuditRow = {
  id: number
  action: 'insert' | 'update' | 'delete'
  tabela: string
  registo_id: string
  timestamp: string
  user_id: string | null
  valores_antigos: Record<string, unknown> | null
  valores_novos: Record<string, unknown> | null
  profiles: { nome: string; email: string } | null
}

const ACTION_LABEL: Record<string, string> = {
  insert: 'Criou',
  update: 'Editou',
  delete: 'Eliminou',
}

const ACTION_COLOR: Record<string, string> = {
  insert: 'text-green-600 bg-green-50',
  update: 'text-blue-600 bg-blue-50',
  delete: 'text-red-600 bg-red-50',
}

const TABLE_LABEL: Record<string, string> = {
  elementos: 'Checklist',
  tarefas_gantt: 'Gantt',
}

function formatDate(ts: string) {
  return new Date(ts).toLocaleString('pt-PT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function diffValues(
  old: Record<string, unknown> | null,
  novo: Record<string, unknown> | null,
): string {
  if (!old || !novo) return ''
  const changed: string[] = []
  for (const key of Object.keys(novo)) {
    if (old[key] !== novo[key] && key !== 'updated_at') {
      changed.push(`${key}: ${JSON.stringify(old[key])} → ${JSON.stringify(novo[key])}`)
    }
  }
  return changed.slice(0, 3).join(' · ')
}

export default async function AuditPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/')

  const { data: logs } = await supabase
    .from('audit_log')
    .select('*, profiles(nome, email)')
    .order('timestamp', { ascending: false })
    .limit(200) as { data: AuditRow[] | null }

  return (
    <div className="space-y-4">
      <PageHeader title="Auditoria" description="Últimas 200 alterações registadas automaticamente." />

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-b">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Quando</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Utilizador</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Ação</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Tabela</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Alterações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(logs ?? []).map(row => (
              <tr key={row.id} className="hover:bg-muted/20">
                <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                  {formatDate(row.timestamp)}
                </td>
                <td className="px-4 py-2.5 truncate max-w-[140px]">
                  {row.profiles?.nome ?? row.user_id?.slice(0, 8) ?? '—'}
                </td>
                <td className="px-4 py-2.5">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${ACTION_COLOR[row.action] ?? ''}`}>
                    {ACTION_LABEL[row.action] ?? row.action}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs">
                  {TABLE_LABEL[row.tabela] ?? row.tabela}
                  <span className="text-muted-foreground ml-1">#{row.registo_id}</span>
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground hidden md:table-cell max-w-xs truncate">
                  {row.action === 'update'
                    ? diffValues(row.valores_antigos, row.valores_novos)
                    : row.action === 'insert'
                    ? 'Novo registo'
                    : 'Eliminado'}
                </td>
              </tr>
            ))}
            {!logs?.length && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Sem registos ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
