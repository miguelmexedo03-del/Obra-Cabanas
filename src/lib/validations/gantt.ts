import { z } from 'zod'

export const updateTarefaSchema = z.object({
  inicio: z.string().date().nullable().optional(),
  fim: z.string().date().nullable().optional(),
  status: z.enum(['por_fazer', 'em_curso', 'bloqueado', 'concluido']).optional(),
  notas: z.string().max(500).nullable().optional(),
}).refine(data => {
  if (data.inicio && data.fim) return data.inicio <= data.fim
  return true
}, { message: 'A data de início não pode ser posterior à data de fim.' })

export type UpdateTarefaInput = z.infer<typeof updateTarefaSchema>
