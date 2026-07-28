'use server'

import { createClient } from '@/lib/supabase/server'
import { getFacts } from '@/lib/relatorio/facts'
import { gerarDeFactos } from '@/lib/relatorio/gerar'
import type { RelatorioResult } from '@/lib/relatorio/types'

type Result<T> = { success: true; data: T } | { success: false; error: string }

export async function gerarRelatorioAction(apartamentoId: number): Promise<Result<RelatorioResult>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autenticado.' }

  try {
    const facts = await getFacts(apartamentoId)
    return { success: true, data: await gerarDeFactos(facts) }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Erro ao gerar.' }
  }
}
