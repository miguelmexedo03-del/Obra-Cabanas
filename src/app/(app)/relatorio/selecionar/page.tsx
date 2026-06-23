import { createClient } from '@/lib/supabase/server'
import { SelecionarClient } from './_components/selecionar-client'

export default async function SelecionarPage() {
  const supabase = await createClient()
  const { data: apartamentos } = await supabase
    .from('apartamentos')
    .select('id, codigo')
    .order('id')

  return <SelecionarClient apartamentos={apartamentos ?? []} />
}
