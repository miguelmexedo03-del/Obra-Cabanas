import { cn } from '@/lib/utils'
import { FotoGrid } from './foto-grid'

export type Foto = { id: string; url_publica: string }
export type Evidencia = {
  id: string
  texto: string | null
  criado_em: string
  evidencia_fotos: Foto[]
}
export type ElementoRelatorio = {
  id: number
  elemento: string
  sub_elemento: string | null
  concluido: boolean
  notas: string | null
  fase_id: number
  divisao_id: number
  fases: { nome: string; cor_hex: string } | null
  divisoes: { id: number; nome: string; ordem: number } | null
  item_evidencias: Evidencia[]
}
export type DivisaoRelatorio = {
  id: number
  nome: string
  ordem: number
  emFalta: ElementoRelatorio[]
  comObservacao: ElementoRelatorio[]
}

interface Props {
  divisao: DivisaoRelatorio
}

export function RelatorioDivisao({ divisao }: Props) {
  const badgeParts = [
    divisao.emFalta.length > 0 ? `${divisao.emFalta.length} em falta` : null,
    divisao.comObservacao.length > 0
      ? `${divisao.comObservacao.length} feito com observação`
      : null,
  ].filter(Boolean).join(' · ')

  return (
    <div className="rounded-lg border bg-card overflow-hidden
      print:break-inside-avoid print:border-gray-300 print:shadow-none">

      {/* Divisão header */}
      <div className="bg-muted/30 px-5 py-2.5 border-b flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {divisao.nome}
        </span>
        <span className="text-xs text-muted-foreground">{badgeParts}</span>
      </div>

      {/* Em falta */}
      {divisao.emFalta.length > 0 && (
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-5 h-5 rounded flex items-center justify-center
              bg-red-100 text-xs font-bold text-red-600">
              {divisao.emFalta.length}
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-red-600">
              Em falta
            </span>
          </div>
          <div className="space-y-2">
            {divisao.emFalta.map(el => (
              <ItemRow key={el.id} el={el} tipo="falta" />
            ))}
          </div>
        </div>
      )}

      {/* Feito com observação */}
      {divisao.comObservacao.length > 0 && (
        <div className={cn('p-4', divisao.emFalta.length > 0 && 'border-t')}>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-5 h-5 rounded flex items-center justify-center
              bg-amber-100 text-xs font-bold text-amber-700">
              {divisao.comObservacao.length}
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
              Feito com observação
            </span>
          </div>
          <div className="space-y-2">
            {divisao.comObservacao.map(el => (
              <ItemRow key={el.id} el={el} tipo="observacao" />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ItemRow({
  el, tipo,
}: {
  el: ElementoRelatorio
  tipo: 'falta' | 'observacao'
}) {
  const allFotos = el.item_evidencias.flatMap(ev => ev.evidencia_fotos)
  const evidenciaNotas = el.item_evidencias
    .map(ev => ev.texto)
    .filter((t): t is string => t !== null && t.length > 0)

  return (
    <div className="py-1">
      {/* Item line */}
      <div className="flex items-center gap-2.5">
        {tipo === 'falta' ? (
          <div className="w-5 h-5 rounded border-2 border-muted-foreground/30 flex-shrink-0" />
        ) : (
          <div className="w-5 h-5 rounded bg-green-600 flex items-center justify-center flex-shrink-0">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
        <span className="text-sm">
          {el.sub_elemento ? (
            <>
              <span className="text-[11px] font-semibold uppercase tracking-wide
                text-muted-foreground mr-1.5">
                {el.elemento} ›
              </span>
              {el.sub_elemento}
            </>
          ) : (
            el.elemento
          )}
        </span>
      </div>

      {/* Direct nota from elementos.notas */}
      {el.notas && (
        <div className="ml-7 mt-1.5 text-sm text-muted-foreground
          bg-amber-50 border-l-2 border-amber-300 pl-2.5 py-1 rounded-r
          print:bg-yellow-50">
          {el.notas}
        </div>
      )}

      {/* Notas from item_evidencias.texto */}
      {evidenciaNotas.map((nota, i) => (
        <div key={i} className="ml-7 mt-1.5 text-sm text-muted-foreground
          bg-amber-50 border-l-2 border-amber-300 pl-2.5 py-1 rounded-r
          print:bg-yellow-50">
          {nota}
        </div>
      ))}

      {/* Fotos */}
      {allFotos.length > 0 && <FotoGrid fotos={allFotos} />}
    </div>
  )
}
