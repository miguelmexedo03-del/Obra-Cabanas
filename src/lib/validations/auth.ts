import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Email inválido.'),
  password: z.string().min(6, 'Password deve ter pelo menos 6 caracteres.'),
})

export const signupSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres.').max(80),
  email: z.string().email('Email inválido.'),
  password: z.string().min(8, 'Password deve ter pelo menos 8 caracteres.'),
})

export type LoginInput = z.infer<typeof loginSchema>
export type SignupInput = z.infer<typeof signupSchema>
