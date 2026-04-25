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

  const raw = formData.get('redirectTo')?.toString() ?? '/'
  const redirectTo = raw.startsWith('/') ? raw : '/'
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

export async function forgotPassword(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const email = formData.get('email')?.toString().trim()
  if (!email) return { success: false, error: 'Email obrigatório.' }

  const supabase = await createClient()
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/api/auth/callback?next=/reset-password`,
  })

  // Always return success to avoid leaking whether the email exists
  if (error) console.error('resetPasswordForEmail error:', error.message)
  return { success: true }
}

export async function resetPassword(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const password = formData.get('password')?.toString()
  const confirm = formData.get('confirm')?.toString()

  if (!password || password.length < 8) {
    return { success: false, error: 'Password deve ter pelo menos 8 caracteres.' }
  }
  if (password !== confirm) {
    return { success: false, error: 'As passwords não coincidem.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { success: false, error: 'Não foi possível atualizar a password. O link pode ter expirado.' }
  }

  redirect('/')
}
