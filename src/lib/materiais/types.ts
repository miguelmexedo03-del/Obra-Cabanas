export type EstadoMaterial = 'por_encomendar' | 'encomendado' | 'em_stock'
export type Sitio = 'em_armazem' | 'em_obra'

export interface MaterialRow {
  id: number
  apartamento_id: number
  categoria_id: number
  estado: EstadoMaterial
  sitio: Sitio | null
  localizacao: string | null
  data_prevista_aplicacao: string | null
  notas: string[]
}
