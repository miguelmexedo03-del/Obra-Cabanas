import { createClient } from '@/lib/supabase/server'
import { TabelaMateriais } from './_components/tabela-materiais'

export default async function MateriaisPage() {
  const supabase = await createClient()
  const [{ data: apartamentos }, { data: categorias }] = await Promise.all([
    supabase.from('apartamentos').select('id, codigo').order('id'),
    supabase.from('categorias_material').select('id, nome, ordem').order('ordem'),
  ])

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Materiais</h1>
      </div>
      <TabelaMateriais apartamentos={apartamentos ?? []} categorias={categorias ?? []} />
    </div>
  )
}
