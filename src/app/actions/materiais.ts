'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { materialPatchSchema, categoriaSchema, mesmaApartamento } from '@/lib/materiais/validations'

type Ok = { success: true } | { success: false; error: string }

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}

// Cria/atualiza a linha (apartamento x categoria) com o patch de campos.
export async function upsertMaterial(apartamentoId: number, categoriaId: number, patch: unknown): Promise<Ok> {
  const parsed = materialPatchSchema.safeParse(patch)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }

  const { supabase, user } = await requireUser()
  if (!user) return { success: false, error: 'Não autenticado.' }

  const { error } = await supabase
    .from('materiais')
    .upsert(
      { apartamento_id: apartamentoId, categoria_id: categoriaId, ...parsed.data },
      { onConflict: 'apartamento_id,categoria_id' },
    )
  if (error) return { success: false, error: error.message }
  revalidatePath('/materiais', 'layout')
  return { success: true }
}

export async function addCategoria(nome: string): Promise<{ success: true; id: number } | { success: false; error: string }> {
  const parsed = categoriaSchema.safeParse({ nome })
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Inválido.' }

  const { supabase, user } = await requireUser()
  if (!user) return { success: false, error: 'Não autenticado.' }

  const { data, error } = await supabase
    .from('categorias_material')
    .insert({ nome: parsed.data.nome })
    .select('id')
  if (error) return { success: false, error: 'Já existe ou sem permissão.' }
  const id = data?.[0]?.id
  if (id == null) return { success: false, error: 'Sem permissão para gravar.' }
  revalidatePath('/materiais', 'layout')
  return { success: true, id }
}

export async function renameCategoria(id: number, nome: string): Promise<Ok> {
  const parsed = categoriaSchema.safeParse({ nome })
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Inválido.' }

  const { supabase, user } = await requireUser()
  if (!user) return { success: false, error: 'Não autenticado.' }

  const { data, error } = await supabase
    .from('categorias_material')
    .update({ nome: parsed.data.nome })
    .eq('id', id)
    .select('id')
  if (error) return { success: false, error: 'Erro ao gravar.' }
  if (!data || data.length === 0) return { success: false, error: 'Sem permissão ou não existe.' }
  revalidatePath('/materiais', 'layout')
  return { success: true }
}

// Liga duas linhas de material; recusa se forem de APs diferentes (regra de negocio).
export async function addDependencia(materialId: number, dependeDeMaterialId: number): Promise<Ok> {
  if (materialId === dependeDeMaterialId) return { success: false, error: 'Um material não depende de si próprio.' }

  const { supabase, user } = await requireUser()
  if (!user) return { success: false, error: 'Não autenticado.' }

  const { data: rows, error: readErr } = await supabase
    .from('materiais')
    .select('id, apartamento_id')
    .in('id', [materialId, dependeDeMaterialId])
  if (readErr) return { success: false, error: readErr.message }
  const a = rows?.find(r => r.id === materialId)
  const b = rows?.find(r => r.id === dependeDeMaterialId)
  if (!a || !b) return { success: false, error: 'Material não encontrado.' }
  if (!mesmaApartamento(a, b)) return { success: false, error: 'A dependência tem de ser do mesmo apartamento.' }

  const { error } = await supabase
    .from('material_dependencias')
    .insert({ material_id: materialId, depende_de_material_id: dependeDeMaterialId })
  if (error) return { success: false, error: error.message }
  revalidatePath('/materiais', 'layout')
  return { success: true }
}

export async function removeDependencia(materialId: number, dependeDeMaterialId: number): Promise<Ok> {
  const { supabase, user } = await requireUser()
  if (!user) return { success: false, error: 'Não autenticado.' }

  const { error } = await supabase
    .from('material_dependencias')
    .delete()
    .eq('material_id', materialId)
    .eq('depende_de_material_id', dependeDeMaterialId)
  if (error) return { success: false, error: error.message }
  revalidatePath('/materiais', 'layout')
  return { success: true }
}

// Tira uma categoria de um apartamento (apaga a linha materiais desse AP x categoria).
// As dependencias caem por FK on delete cascade; as notas vivem na propria linha.
export async function removeMaterial(apartamentoId: number, categoriaId: number): Promise<Ok> {
  const { supabase, user } = await requireUser()
  if (!user) return { success: false, error: 'Não autenticado.' }

  const { error } = await supabase
    .from('materiais')
    .delete()
    .eq('apartamento_id', apartamentoId)
    .eq('categoria_id', categoriaId)
  if (error) return { success: false, error: error.message }
  revalidatePath('/materiais', 'layout')
  return { success: true }
}
