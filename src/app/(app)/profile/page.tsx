import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout'
import { ChangePasswordForm } from '@/components/profile/change-password-form'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('nome, role').eq('id', user.id).single()

  return (
    <div>
      <PageHeader title="Perfil" description="A tua conta." />
      <div className="space-y-6 max-w-md">
        <div className="rounded-lg border p-4 text-sm space-y-1">
          <div><span className="text-muted-foreground">Nome: </span>{profile?.nome ?? '—'}</div>
          <div><span className="text-muted-foreground">Email: </span>{user.email}</div>
          <div>
            <span className="text-muted-foreground">Papel: </span>
            <span className="capitalize">{profile?.role ?? 'user'}</span>
          </div>
        </div>
        <ChangePasswordForm />
      </div>
    </div>
  )
}
