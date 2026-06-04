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

// Estados do Gantt em linguagem humana
const STATUS_LABEL: Record<string, string> = {
  por_fazer: 'Por fazer',
  em_curso: 'Em curso',
  bloqueado: 'Bloqueado',
  concluido: 'Concluído',
}

function formatDate(ts: string) {
  return new Date(ts).toLocaleString('pt-PT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function str(v: unknown): string | null {
  return typeof v === 'string' ? v : null
}
function num(v: unknown): number | null {
  return typeof v === 'number' ? v : null
}

// "AP13 · Cozinha · Teto — Parafuso" para Checklist; "AP2 · Portas" para Gantt
function describeTarget(
  row: AuditRow,
  apMap: Map<number, string>,
  divMap: Map<number, string>,
): string {
  const snap = row.valores_novos ?? row.valores_antigos
  if (!snap) return `${TABLE_LABEL[row.tabela] ?? row.tabela} #${row.registo_id}`

  const apCodigo = apMap.get(num(snap.apartamento_id) ?? -1)

  if (row.tabela === 'elementos') {
    const divNome = divMap.get(num(snap.divisao_id) ?? -1)
    const elemento = str(snap.elemento) ?? '—'
    const sub = str(snap.sub_elemento)
    const partes = [apCodigo, divNome, sub ? `${elemento} — ${sub}` : elemento].filter(Boolean)
    return partes.join(' · ')
  }

  if (row.tabela === 'tarefas_gantt') {
    const nome = str(snap.nome) ?? '—'
    return [apCodigo, nome].filter(Boolean).join(' · ')
  }

  return `${TABLE_LABEL[row.tabela] ?? row.tabela} #${row.registo_id}`
}

// Mudança em linguagem humana
function describeChange(row: AuditRow): string {
  if (row.action === 'insert') return 'Novo registo'
  if (row.action === 'delete') return 'Eliminado'

  const old = row.valores_antigos
  const novo = row.valores_novos
  if (!old || !novo) return ''

  // Checklist: o que interessa é o concluido
  if (row.tabela === 'elementos') {
    if (old.concluido !== novo.concluido) {
      return novo.concluido ? '✓ Marcou como concluído' : '↺ Reabriu (desmarcou)'
    }
  }

  // Gantt: estado da tarefa
  if (row.tabela === 'tarefas_gantt') {
    if (old.status !== novo.status) {
      const de = STATUS_LABEL[str(old.status) ?? ''] ?? String(old.status)
      const para = STATUS_LABEL[str(novo.status) ?? ''] ?? String(novo.status)
      return `Estado: ${de} → ${para}`
    }
    if (old.inicio !== novo.inicio || old.fim !== novo.fim) {
      return 'Alterou datas'
    }
  }

  // Fallback genérico: lista campos alterados (ignorando ruído)
  const ignore = new Set(['updated_at', 'created_at', 'concluido_em', 'concluido_por'])
  const changed: string[] = []
  for (const key of Object.keys(novo)) {
    if (ignore.has(key)) continue
    if (old[key] !== novo[key]) {
      changed.push(`${key}: ${JSON.stringify(old[key])} → ${JSON.stringify(novo[key])}`)
    }
  }
  return changed.slice(0, 2).join(' · ') || 'Sem alterações relevantes'
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

  const [logsResult, apResult, divResult] = await Promise.all([
    supabase
      .from('audit_log')
      .select('*, profiles(nome, email)')
      .order('timestamp', { ascending: false })
      .limit(200),
    supabase.from('apartamentos').select('id, codigo'),
    supabase.from('divisoes').select('id, nome'),
  ])

  const logs = logsResult.data as AuditRow[] | null
  const apMap = new Map((apResult.data ?? []).map(a => [a.id, a.codigo]))
  const divMap = new Map((divResult.data ?? []).map(d => [d.id, d.nome]))

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
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Onde</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">O que mudou</th>
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
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide shrink-0">
                      {TABLE_LABEL[row.tabela] ?? row.tabela}
                    </span>
                    <span className="font-medium">{describeTarget(row, apMap, divMap)}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground hidden md:table-cell max-w-xs truncate">
                  {describeChange(row)}
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
