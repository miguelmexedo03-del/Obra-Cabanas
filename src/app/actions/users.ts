'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  createUserSchema,
  updateUserSchema,
  toRole,
  type CreateUserInput,
  type UpdateUserInput,
} from '@/lib/validations/users'

type Result<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string }

async function requireAdmin(): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Não autenticado.' }
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { ok: false, error: 'Sem permissão.' }
  return { ok: true }
}

export async function createUser(input: CreateUserInput): Promise<Result<{ id: string }>> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  const parsed = createUserSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { nome: parsed.data.nome },
  })
  if (error || !data.user) return { success: false, error: error?.message ?? 'Falha ao criar.' }

  // handle_new_user trigger creates the profile row; update nome + role
  const { error: updErr } = await admin
    .from('profiles')
    .update({ nome: parsed.data.nome, role: toRole(parsed.data.isAdmin) })
    .eq('id', data.user.id)
  if (updErr) return { success: false, error: updErr.message }

  revalidatePath('/admin/users')
  return { success: true, data: { id: data.user.id } }
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<Result> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  const parsed = updateUserSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const admin = createAdminClient()
  const { isAdmin, nome } = parsed.data
  type ProfileUpdate = { nome?: string; role?: 'admin' | 'user' }
  const update: ProfileUpdate = {}
  if (nome !== undefined) update.nome = nome
  if (isAdmin !== undefined) update.role = toRole(isAdmin)
  const { error } = await admin.from('profiles').update(update).eq('id', id)
  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/users')
  revalidatePath(`/admin/users/${id}`)
  return { success: true }
}

export async function deleteUser(id: string): Promise<Result> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/users')
  return { success: true }
}

export async function sendMagicLink(email: string): Promise<Result<{ link: string }>> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
  if (error || !data?.properties?.action_link) {
    return { success: false, error: error?.message ?? 'Falha a gerar link.' }
  }
  return { success: true, data: { link: data.properties.action_link } }
}
