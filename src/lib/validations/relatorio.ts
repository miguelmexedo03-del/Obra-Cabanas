import { z } from 'zod'

export const instrucoesSchema = z.object({
  instrucoes: z.string().max(4000, 'Máximo 4000 caracteres.'),
})
