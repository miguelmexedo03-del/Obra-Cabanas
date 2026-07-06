import { Suspense } from 'react'
import { FileDown, ListChecks } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ConsultaFilters } from './_components/consulta-filters'
import { buildResultado } from './_lib/build-resultado'
import type { ElementoConsulta, EstadoFiltro } from './_lib/build-resultado'
import { TIPOS_DIVISAO, type TipoDivisao } from '@/lib/utils'
import { PageHeader, EmptyState } from '@/components/layout'
import { Button } from '@/components/ui/button'

interface Props {
  searchParams: Promise<{ tipo?: string; fase?: string; estado?: string }>
}

function parseEstado(v: string | undefined): EstadoFiltro {
  return v === 'incompleto' || v === 'todos' ? v : 'completo'
}

async function ConsultaResultado({ searchParams }: Props) {
  const params = await searchParams
  const tipoParam = params.tipo
  const tipo: TipoDivisao | null =
    tipoParam && (TIPOS_DIVISAO as readonly string[]).includes(tipoParam)
      ? (tipoParam as TipoDivisao)
      : null
  const faseId = params.fase ? Number(params.fase) : null
  const estado = parseEstado(params.estado)

  if (!tipo || !faseId) {
    return (
      <EmptyState
        icon={ListChecks}
        title="Escolhe um tipo de divisão e uma fase"
        description="A tabela aparece depois de escolheres os dois filtros."
      />
    )
  }

  const supabase = await createClient()
  const { data } = await supabase
    .from('elementos')
    .select('concluido, apartamento_id, divisao_id, divisoes(nome), apartamentos(codigo)')
    .eq('fase_id', faseId)
    .not('divisao_id', 'is', null)

  const elementos = (data ?? []) as ElementoConsulta[]
  const linhas = buildResultado(elementos, tipo, estado)

  if (linhas.length === 0) {
    return (
      <EmptyState
        icon={ListChecks}
        title="Nenhum resultado"
        description="Não há divisões deste tipo que correspondam ao filtro de estado escolhido."
      />
    )
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 border-b">
          <tr>
            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Apartamento</th>
            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Divisão</th>
            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Concluídos/Total</th>
            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {linhas.map(l => (
            <tr key={`${l.apartamentoId}__${l.divisaoId}`}>
              <td className="px-4 py-2.5">{l.apCodigo}</td>
              <td className="px-4 py-2.5">{l.divisaoNome}</td>
              <td className="px-4 py-2.5">{l.concluidos}/{l.total}</td>
              <td className="px-4 py-2.5">
                <span className={l.estado === 'Completo' ? 'text-green-700' : 'text-amber-700'}>
                  {l.estado}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default async function ConsultaPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: fasesData } = await supabase.from('fases').select('id, nome').order('ordem')
  const fases = (fasesData ?? []).map(f => ({ id: f.id, label: f.nome }))

  const params = await searchParams
  const exportQuery = new URLSearchParams(
    Object.entries(params).filter((e): e is [string, string] => Boolean(e[1]))
  ).toString()

  return (
    <div>
      <PageHeader
        title="Consulta"
        description="Filtra por tipo de divisão, fase e estado, em todos os apartamentos"
        actions={
          <Button
            size="sm"
            render={<a href={`/relatorio/consulta/export?${exportQuery}`} target="_blank" rel="noopener noreferrer" />}
            nativeButton={false}
          >
            <FileDown className="h-4 w-4" />
            Exportar
          </Button>
        }
      />

      <div className="mb-4">
        <Suspense>
          <ConsultaFilters fases={fases} />
        </Suspense>
      </div>

      <Suspense fallback={<p className="text-sm text-muted-foreground py-4">A carregar…</p>}>
        <ConsultaResultado searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
