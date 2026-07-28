import { createClient } from '@/lib/supabase/server'
import { Gerador } from './_components/gerador'

// A estrutura do relatório é sempre determinística, mas quando há defeitos ou
// observações escritas, gerarDeFactos chama o LLM (Gemini) uma vez para as
// reescrever — dá margem à Server Action para essa chamada de rede.
export const maxDuration = 30

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
        Um resumo por apartamento, gerado a partir do estado atual da checklist.
      </p>
      <Gerador apartamentos={apartamentos ?? []} />
    </div>
  )
}
