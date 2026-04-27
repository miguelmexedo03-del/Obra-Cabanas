import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout'
import { CreateUserForm } from '@/components/admin/create-user-form'

export default async function NewUserPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/')

  return (
    <div>
      <PageHeader title="Novo utilizador" description="Cria conta com password inicial." />
      <CreateUserForm />
    </div>
  )
}
