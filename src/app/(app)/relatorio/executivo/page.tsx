import { createClient } from '@/lib/supabase/server'
import { Gerador } from './_components/gerador'

export default async function RelatorioExecutivoPage() {
  const supabase = await createClient()
  const { data: apartamentos } = await supabase
    .from('apartamentos')
    .select('id, codigo')
    .order('id')

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Relatório Executivo</h1>
      <p className="text-sm text-muted-foreground">
        Um parágrafo por apartamento, gerado a partir do estado atual da obra.
      </p>
      <Gerador apartamentos={apartamentos ?? []} />
    </div>
  )
}
