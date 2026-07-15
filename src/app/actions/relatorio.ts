'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getFacts } from '@/lib/relatorio/facts'
import { gerarDeFactos } from '@/lib/relatorio/gerar'
import { getProvider } from '@/lib/llm'
import { instrucoesSchema } from '@/lib/validations/relatorio'
import type { RelatorioResult } from '@/lib/relatorio/types'

type Result<T> = { success: true; data: T } | { success: false; error: string }
type Ok = { success: true } | { success: false; error: string }

async function lerInstrucoes(): Promise<string> {
  const supabase = await createClient()
  const { data } = await supabase.from('relatorio_config').select('instrucoes_extra').eq('id', 1).single()
  return data?.instrucoes_extra ?? ''
}

export async function gerarRelatorioAction(apartamentoId: number): Promise<Result<RelatorioResult>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autenticado.' }

  try {
    const [facts, instrucoes] = await Promise.all([getFacts(apartamentoId), lerInstrucoes()])
    const data = await gerarDeFactos(facts, instrucoes, getProvider())
    return { success: true, data }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Erro ao gerar.' }
  }
}

export async function previewRelatorioAction(
  apartamentoId: number,
  instrucoesRascunho: string,
): Promise<Result<RelatorioResult>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autenticado.' }

  try {
    const facts = await getFacts(apartamentoId)
    const data = await gerarDeFactos(facts, instrucoesRascunho, getProvider())
    return { success: true, data }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Erro ao gerar.' }
  }
}

export async function gravarInstrucoesAction(instrucoes: string): Promise<Ok> {
  const parsed = instrucoesSchema.safeParse({ instrucoes })
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Inválido.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autenticado.' }

  // RLS já garante que só admin escreve; o erro do update reflete isso.
  const { error } = await supabase.from('relatorio_config').update({ instrucoes_extra: parsed.data.instrucoes }).eq('id', 1)
  if (error) return { success: false, error: 'Sem permissão ou erro ao gravar.' }
  revalidatePath('/relatorio/executivo', 'layout')
  return { success: true }
}
