import { createClient } from '@/lib/supabase/server'
import { sortElementos } from '@/lib/utils'
import '../relatorio.module.css'
import { PrintTrigger } from '../_components/print-trigger'
import { RelatorioDivisao } from '../_components/relatorio-divisao'
import type { ElementoRelatorio, DivisaoRelatorio } from '../_components/relatorio-divisao'

interface Props {
  searchParams: Promise<{ aps?: string | string[]; print?: string }>
}

function buildDivisoes(elementos: ElementoRelatorio[]): DivisaoRelatorio[] {
  const map = new Map<number, DivisaoRelatorio>()
  for (const el of sortElementos(elementos)) {
    if (!el.divisao_id || !el.divisoes) continue
    const hasEvidencias = el.item_evidencias.length > 0
    if (el.concluido && !hasEvidencias) continue
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
    if (!el.concluido) div.emFalta.push(el)
    else div.comObservacao.push(el)
  }
  return Array.from(map.values())
    .filter(d => d.emFalta.length > 0 || d.comObservacao.length > 0)
    .sort((a, b) => a.ordem - b.ordem)
}

export default async function MultiRelatorioPage({ searchParams }: Props) {
  const { aps: apsRaw, print: printParam } = await searchParams
  const apIds = (Array.isArray(apsRaw) ? apsRaw : apsRaw ? [apsRaw] : [])
    .map(Number)
    .filter(n => !isNaN(n) && n > 0)

  if (apIds.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-12 text-center">
        Nenhum apartamento selecionado.
      </p>
    )
  }

  const supabase = await createClient()

  const apsData = await Promise.all(
    apIds.map(async apId => {
      const [apResult, elementosResult] = await Promise.all([
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
      ])
      return {
        ap: apResult.data,
        elementos: (elementosResult.data ?? []) as ElementoRelatorio[],
      }
    })
  )

  const geradoEm = new Date().toLocaleDateString('pt-PT', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <>
      <PrintTrigger shouldPrint={printParam === '1'} />

      <div className="space-y-12">
        {apsData.map(({ ap, elementos }, i) => {
          if (!ap) return null
          const divisoes = buildDivisoes(elementos)
          const totalEmFalta = divisoes.reduce((s, d) => s + d.emFalta.length, 0)
          const totalObservacao = divisoes.reduce((s, d) => s + d.comObservacao.length, 0)

          return (
            <div
              key={ap.id}
              className={i > 0 ? 'print:break-before-page' : undefined}
            >
              {/* AP header */}
              <div className="rounded-lg border bg-card p-5 mb-5
                print:border-gray-300 print:shadow-none">
                <h2 className="text-xl font-bold tracking-tight">{ap.codigo} — Cabanas</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Gerado em <strong>{geradoEm}</strong>
                </p>
                <div className="flex gap-6 mt-3">
                  <div>
                    <p className="text-2xl font-bold text-red-500">{totalEmFalta}</p>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">
                      Em falta
                    </p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-600">{totalObservacao}</p>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">
                      Feitos com observação
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 max-w-3xl">
                {divisoes.map(d => (
                  <RelatorioDivisao key={d.id} divisao={d} />
                ))}
                {divisoes.length === 0 && (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    Nenhuma ocorrência registada.
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
