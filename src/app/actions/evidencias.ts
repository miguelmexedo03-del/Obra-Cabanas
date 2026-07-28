'use server'

import { createClient } from '@/lib/supabase/server'

type Foto = { storage_path: string; url_publica: string }
type Input = { elementoId: number; texto: string; fotos: Foto[] }
type Result = { success: true; evidenciaId: string } | { success: false; error: string }

export async function criarEvidencia({ elementoId, texto, fotos }: Input): Promise<Result> {
  const textoTrimmed = texto?.trim() ?? ''
  if (!textoTrimmed && fotos.length === 0) {
    return { success: false, error: 'Precisa de texto ou pelo menos uma foto.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autenticado.' }

  const { data: evidencia, error: evErr } = await supabase
    .from('item_evidencias')
    .insert({
      elemento_id: elementoId,
      texto: textoTrimmed || null,
      criado_por: user.id,
    })
    .select('id')
    .single()

  if (evErr || !evidencia) {
    return { success: false, error: evErr?.message ?? 'Erro ao criar evidência.' }
  }

  if (fotos.length > 0) {
    const { error: fotosErr } = await supabase.from('evidencia_fotos').insert(
      fotos.map(f => ({
        evidencia_id: evidencia.id,
        storage_path: f.storage_path,
        url_publica: f.url_publica,
      }))
    )
    if (fotosErr) return { success: false, error: fotosErr.message }
  }

  return { success: true, evidenciaId: evidencia.id }
}

type DeleteResult = { success: true } | { success: false; error: string }

export async function apagarEvidencia(evidenciaId: string): Promise<DeleteResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autenticado.' }

  // Buscar paths de storage antes de apagar
  const { data: fotos } = await supabase
    .from('evidencia_fotos')
    .select('storage_path')
    .eq('evidencia_id', evidenciaId)

  const { error } = await supabase
    .from('item_evidencias')
    .delete()
    .eq('id', evidenciaId)

  if (error) return { success: false, error: error.message }

  // Limpar ficheiros do Storage (best-effort, sem bloquear em falha)
  if (fotos && fotos.length > 0) {
    await supabase.storage
      .from('evidencias')
      .remove(fotos.map(f => f.storage_path))
  }

  return { success: true }
}
