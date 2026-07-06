import { tipoDivisao, divisaoSortPriority, type TipoDivisao } from '@/lib/utils'

export type EstadoFiltro = 'completo' | 'incompleto' | 'todos'

export type ElementoConsulta = {
  concluido: boolean
  apartamento_id: number
  divisao_id: number
  divisoes: { nome: string } | null
  apartamentos: { codigo: string } | null
}

export type ResultadoRow = {
  apartamentoId: number
  apCodigo: string
  divisaoId: number
  divisaoNome: string
  total: number
  concluidos: number
  estado: 'Completo' | 'Incompleto'
}

// Agrega elementos por (apartamento, divisão) para o tipo de divisão escolhido,
// calculando se essa divisão está 100% concluída nessa fase — evita mostrar uma
// linha por item individual (uma WC tem ~7 itens de teto), que seria ruído para
// perguntas do tipo "que WC já têm o teto pintado".
export function buildResultado(
  elementos: ElementoConsulta[],
  tipo: TipoDivisao,
  estadoFiltro: EstadoFiltro,
): ResultadoRow[] {
  const map = new Map<string, ResultadoRow>()

  for (const el of elementos) {
    if (!el.divisoes || tipoDivisao(el.divisoes.nome) !== tipo) continue
    const key = `${el.apartamento_id}__${el.divisao_id}`
    if (!map.has(key)) {
      map.set(key, {
        apartamentoId: el.apartamento_id,
        apCodigo: el.apartamentos?.codigo ?? `AP${el.apartamento_id}`,
        divisaoId: el.divisao_id,
        divisaoNome: el.divisoes.nome,
        total: 0,
        concluidos: 0,
        estado: 'Incompleto',
      })
    }
    const row = map.get(key)!
    row.total++
    if (el.concluido) row.concluidos++
  }

  const rows: ResultadoRow[] = Array.from(map.values()).map(r => ({
    ...r,
    estado: (r.total > 0 && r.concluidos === r.total ? 'Completo' : 'Incompleto') as 'Completo' | 'Incompleto',
  }))

  const filtrados = estadoFiltro === 'todos'
    ? rows
    : rows.filter(r => r.estado === (estadoFiltro === 'completo' ? 'Completo' : 'Incompleto'))

  return filtrados.sort((a, b) => {
    if (a.apartamentoId !== b.apartamentoId) return a.apartamentoId - b.apartamentoId
    return divisaoSortPriority(a.divisaoNome) - divisaoSortPriority(b.divisaoNome)
  })
}
