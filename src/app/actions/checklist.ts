'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type Result = { success: true } | { success: false; error: string }

export async function toggleElemento(id: number, concluido: boolean): Promise<Result> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Não autenticado.' }

  const { error } = await supabase
    .from('elementos')
    .update({
      concluido,
      concluido_em: concluido ? new Date().toISOString() : null,
      concluido_por: concluido ? user.id : null,
    })
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/', 'layout')
  return { success: true }
}
