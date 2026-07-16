import { z } from 'zod'

export const materialPatchSchema = z.object({
  estado: z.enum(['por_encomendar', 'encomendado', 'em_stock']).optional(),
  sitio: z.enum(['em_armazem', 'em_obra']).nullable().optional(),
  localizacao: z.string().max(200).nullable().optional(),
  data_prevista_aplicacao: z.string().date().nullable().optional(),
  notas: z.array(z.string().max(500)).optional(),
})

export const categoriaSchema = z.object({
  nome: z.string().trim().min(1, 'Nome obrigatório.').max(60),
})

// Regra de negocio: uma dependencia so pode ligar materiais do mesmo apartamento.
export function mesmaApartamento(a: { apartamento_id: number }, b: { apartamento_id: number }): boolean {
  return a.apartamento_id === b.apartamento_id
}
