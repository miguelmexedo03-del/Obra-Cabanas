import { addDays, format } from 'date-fns'

export interface FaseParam {
  id: number
  nome: string
  cor_hex: string
  duracao: number
}

export interface LobEntry {
  fase_id: number
  fase_nome: string
  fase_cor: string
  ap: number
  inicio: string
  fim: string
}

export interface LobParams {
  inicioBase: Date
  takt: number
  fases: FaseParam[]
}

/**
 * Calcula o cronograma LoB a partir de parâmetros takt.
 *
 * Para cada AP j (1..24) e cada fase i:
 *   inicio = inicioBase + (j-1)*takt + sum(duracao[0..i-1])
 *   fim    = inicio + duracao[i] - 1
 */
export function calcLobSchedule({ inicioBase, takt, fases }: LobParams): LobEntry[] {
  const entries: LobEntry[] = []

  for (let j = 1; j <= 24; j++) {
    const apDayOffset = (j - 1) * takt
    let phaseOffset = 0

    for (const fase of fases) {
      const inicioDate = addDays(inicioBase, apDayOffset + phaseOffset)
      const fimDate = addDays(inicioDate, fase.duracao - 1)

      entries.push({
        fase_id: fase.id,
        fase_nome: fase.nome,
        fase_cor: fase.cor_hex,
        ap: j,
        inicio: format(inicioDate, 'yyyy-MM-dd'),
        fim: format(fimDate, 'yyyy-MM-dd'),
      })

      phaseOffset += fase.duracao
    }
  }

  return entries
}

export function lobDateRange(entries: LobEntry[]): { start: Date; end: Date } | null {
  if (entries.length === 0) return null
  const starts = entries.map(e => new Date(e.inicio).getTime())
  const ends = entries.map(e => new Date(e.fim).getTime())
  return {
    start: new Date(Math.min(...starts)),
    end: new Date(Math.max(...ends)),
  }
}
