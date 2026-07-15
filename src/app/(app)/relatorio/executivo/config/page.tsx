import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Editor } from './_components/editor'

export default async function ConfigPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (perfil?.role !== 'admin') redirect('/relatorio/executivo')

  const [{ data: cfg }, { data: apartamentos }] = await Promise.all([
    supabase.from('relatorio_config').select('instrucoes_extra').eq('id', 1).single(),
    supabase.from('apartamentos').select('id, codigo').order('id'),
  ])

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Instruções do Relatório</h1>
      <p className="text-sm text-muted-foreground">
        Estas instruções somam-se às regras default. Pré-visualiza num AP antes de gravar.
      </p>
      <Editor instrucoesIniciais={cfg?.instrucoes_extra ?? ''} apartamentos={apartamentos ?? []} />
    </div>
  )
}
