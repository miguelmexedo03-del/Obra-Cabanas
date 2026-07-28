export type PinturaEstado = 'pintura' | 'ultima_demao' | 'ok'

export interface PinturaFacto {
  divisao: string
  superficie: 'teto' | 'parede'
  estado: Exclude<PinturaEstado, 'ok'>
}

export interface PendenteItem {
  divisao: string
  categoria: string       // 'chão e rodapé', 'portas e aros', 'móveis', 'equipamentos de WC', ...
  elemento: string
  sub_elemento: string | null
  notas: string | null
}

export interface Facts {
  apartamento: string     // 'AP1'
  progresso_pct: number   // 39
  pintura: PinturaFacto[]
  pendentes: PendenteItem[]
}

export interface RelatorioResult {
  apartamento: string
  texto: string
  origem: 'llm' | 'template'
}
