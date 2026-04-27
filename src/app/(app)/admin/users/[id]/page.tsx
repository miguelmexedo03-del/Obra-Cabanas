import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/layout'
import { EditUserForm } from '@/components/admin/edit-user-form'
import { MagicLinkButton } from '@/components/admin/magic-link-button'
import { DeleteUserButton } from '@/components/admin/delete-user-button'

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') redirect('/')

  const admin = createAdminClient()
  const { data: target, error } = await admin.auth.admin.getUserById(id)
  if (error || !target.user) notFound()

  const { data: profile } = await admin
    .from('profiles').select('nome, role').eq('id', id).single()

  return (
    <div>
      <PageHeader
        title={profile?.nome ?? target.user.email ?? 'Utilizador'}
        description={target.user.email ?? ''}
        actions={
          <div className="flex gap-2">
            <MagicLinkButton email={target.user.email!} />
            <DeleteUserButton
              userId={id}
              userName={profile?.nome ?? target.user.email!}
              disabled={id === user.id}
            />
          </div>
        }
      />

      <div className="max-w-md">
        <EditUserForm
          userId={id}
          defaults={{
            nome: profile?.nome ?? '',
            isAdmin: profile?.role === 'admin',
          }}
        />
      </div>
    </div>
  )
}
