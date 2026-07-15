import { createClient } from '@/lib/supabase/server'
import { GestorCategorias } from './_components/gestor-categorias'

export default async function CategoriasPage() {
  const supabase = await createClient()
  const { data: categorias } = await supabase.from('categorias_material').select('id, nome, ordem').order('ordem')
  return (
    <div className="p-6 space-y-4 max-w-xl">
      <h1 className="text-2xl font-semibold">Categorias de material</h1>
      <p className="text-sm text-muted-foreground">Adiciona e renomeia as categorias que aparecem na tabela de materiais.</p>
      <GestorCategorias categorias={categorias ?? []} />
    </div>
  )
}
