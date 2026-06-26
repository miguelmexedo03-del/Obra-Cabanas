'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type Result = { success: true } | { success: false; error: string }

export async function criarElemento(
  apartamentoId: number,
  divisaoId: number,
  faseId: number,
  nome: string,
): Promise<{ success: true; id: number } | { success: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autenticado.' }

  const trimmed = nome.trim()
  if (!trimmed) return { success: false, error: 'Nome do item é obrigatório.' }

  const { data, error } = await supabase
    .from('elementos')
    .insert({
      apartamento_id: apartamentoId,
      divisao_id: divisaoId,
      fase_id: faseId,
      elemento: trimmed,
      concluido: false,
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath('/', 'layout')
  return { success: true, id: data.id }
}

type BatchItem = {
  apartamento_id: number
  divisao_id: number
  fase_id: number
  elemento: string
}

export async function criarElementosBatch(
  itens: BatchItem[],
): Promise<{ success: true; count: number } | { success: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autenticado.' }
  if (itens.length === 0) return { success: false, error: 'Nenhum item a criar.' }

  const { data, error } = await supabase
    .from('elementos')
    .insert(itens.map(it => ({ ...it, concluido: false })))
    .select('id')

  if (error) return { success: false, error: error.message }

  revalidatePath('/', 'layout')
  return { success: true, count: data.length }
}

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
