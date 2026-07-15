export type EstadoMaterial = 'por_encomendar' | 'encomendado' | 'em_stock'

export interface MaterialRow {
  id: number
  apartamento_id: number
  categoria_id: number
  estado: EstadoMaterial
  localizacao: string | null
  data_prevista_encomenda: string | null
  data_prevista_aplicacao: string | null
}
