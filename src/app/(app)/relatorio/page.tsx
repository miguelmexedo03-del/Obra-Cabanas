import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { sortElementos } from '@/lib/utils'
import { PrintTrigger } from './_components/print-trigger'
import { RelatorioHeader } from './_components/relatorio-header'
import { RelatorioDivisao } from './_components/relatorio-divisao'
import type {
  ElementoRelatorio,
  DivisaoRelatorio,
} from './_components/relatorio-divisao'

interface Props {
  searchParams: Promise<{ ap?: string; print?: string }>
}

function buildDivisoes(elementos: ElementoRelatorio[]): DivisaoRelatorio[] {
  const map = new Map<number, DivisaoRelatorio>()

  for (const el of sortElementos(elementos)) {
    if (!el.divisao_id || !el.divisoes) continue

    const hasNota = el.notas !== null
    const hasEvidencias = el.item_evidencias.length > 0
    if (el.concluido && !hasNota && !hasEvidencias) continue

    if (!map.has(el.divisao_id)) {
      map.set(el.divisao_id, {
        id: el.divisao_id,
        nome: el.divisoes.nome,
        ordem: el.divisoes.ordem,
        emFalta: [],
        comObservacao: [],
      })
    }
    const div = map.get(el.divisao_id)!
    if (!el.concluido) {
      div.emFalta.push(el)
    } else {
      div.comObservacao.push(el)
    }
  }

  return Array.from(map.values())
    .filter(d => d.emFalta.length > 0 || d.comObservacao.length > 0)
    .sort((a, b) => a.ordem - b.ordem)
}

export default async function RelatorioPage({ searchParams }: Props) {
  const { ap: apParam, print: printParam } = await searchParams
  const apId = Number(apParam)
  if (!apParam || isNaN(apId)) notFound()

  const supabase = await createClient()

  const [apResult, elementosResult, lastModResult] = await Promise.all([
    supabase.from('apartamentos').select('id, codigo').eq('id', apId).single(),
    supabase.from('elementos').select(`
      id, elemento, sub_elemento, concluido, notas, fase_id, divisao_id,
      fases(nome, cor_hex),
      divisoes(id, nome, ordem),
      item_evidencias(
        id, texto, criado_em,
        evidencia_fotos(id, url_publica)
      )
    `).eq('apartamento_id', apId).not('divisao_id', 'is', null),
    supabase.from('elementos')
      .select('updated_at')
      .eq('apartamento_id', apId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const ap = apResult.data
  if (!ap) notFound()

  const elementos = (elementosResult.data ?? []) as ElementoRelatorio[]
  const divisoes = buildDivisoes(elementos)

  const totalEmFalta = divisoes.reduce((s, d) => s + d.emFalta.length, 0)
  const totalObservacao = divisoes.reduce((s, d) => s + d.comObservacao.length, 0)

  const fmt = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString('pt-PT', {
          day: 'numeric', month: 'long', year: 'numeric',
        })
      : null

  const geradoEm = new Date().toLocaleDateString('pt-PT', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  const ultimaAlteracao = fmt(lastModResult.data?.updated_at ?? null)

  return (
    <>
      {/* Hide sidebar and adjust main padding in print */}
      <style>{`
        @media print {
          aside, [data-sidebar] { display: none !important; }
          main { padding: 1rem !important; }
        }
      `}</style>

      <PrintTrigger shouldPrint={printParam === '1'} />

      <div className="max-w-3xl space-y-5">
        <RelatorioHeader
          ap={ap}
          geradoEm={geradoEm}
          ultimaAlteracao={ultimaAlteracao}
          totalEmFalta={totalEmFalta}
          totalObservacao={totalObservacao}
        />

        <div className="space-y-4">
          {divisoes.map(d => (
            <RelatorioDivisao key={d.id} divisao={d} />
          ))}
          {divisoes.length === 0 && (
            <p className="text-sm text-muted-foreground py-12 text-center">
              Nenhuma ocorrência registada. Todos os itens estão concluídos sem observações.
            </p>
          )}
        </div>
      </div>
    </>
  )
}
