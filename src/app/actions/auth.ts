'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loginSchema, signupSchema } from '@/lib/validations/auth'

type ActionResult = { success: false; error: string } | { success: true }

export async function login(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const result = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!result.success) {
    return { success: false, error: result.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(result.data)

  if (error) {
    return { success: false, error: 'Email ou password incorretos.' }
  }

  const redirectTo = formData.get('redirectTo')?.toString() ?? '/'
  redirect(redirectTo)
}

export async function signup(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const result = signupSchema.safeParse({
    nome: formData.get('nome'),
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!result.success) {
    return { success: false, error: result.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: result.data.email,
    password: result.data.password,
    options: {
      data: { nome: result.data.nome },
    },
  })

  if (error) {
    return { success: false, error: 'Não foi possível criar a conta. Tenta novamente.' }
  }

  redirect('/')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
