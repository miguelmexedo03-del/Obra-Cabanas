'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { updateTarefaSchema, type UpdateTarefaInput } from '@/lib/validations/gantt'

type Result = { success: true } | { success: false; error: string }

export async function updateTarefa(id: number, input: UpdateTarefaInput): Promise<Result> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autenticado.' }

  const parsed = updateTarefaSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }

  const { error } = await supabase
    .from('tarefas_gantt')
    .update(parsed.data)
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/', 'layout')
  return { success: true }
}
