import { z } from 'zod'

export const createUserSchema = z.object({
  email: z.string().email('Email inválido'),
  nome: z.string().min(2, 'Nome demasiado curto').max(80),
  isAdmin: z.boolean(),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
})

export const updateUserSchema = z.object({
  nome: z.string().min(2).max(80).optional(),
  isAdmin: z.boolean().optional(),
})

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>

export const toRole = (isAdmin: boolean) => isAdmin ? 'admin' : 'user'
