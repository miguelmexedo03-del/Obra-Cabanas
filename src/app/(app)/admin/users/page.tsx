import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') redirect('/')

  const admin = createAdminClient()
  const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 200 })
  const users = usersData?.users ?? []

  const { data: profiles } = await admin.from('profiles').select('id, nome, role')
  const pMap = new Map(profiles?.map(p => [p.id, p]) ?? [])

  return (
    <div>
      <PageHeader
        title="Utilizadores"
        description="Gestão de acesso e permissões."
        actions={
          <Button render={<Link href="/admin/users/new" />} nativeButton={false}>
            <Plus className="h-4 w-4 mr-2" /> Novo
          </Button>
        }
      />

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-b">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Nome</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Email</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Papel</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Último login</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map(u => {
              const p = pMap.get(u.id)
              return (
                <tr key={u.id} className="hover:bg-muted/20">
                  <td className="px-4 py-2.5">{p?.nome ?? '—'}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-2.5 capitalize">{p?.role ?? 'user'}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {u.last_sign_in_at
                      ? new Date(u.last_sign_in_at).toLocaleString('pt-PT')
                      : 'Nunca'}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Button variant="ghost" size="sm" render={<Link href={`/admin/users/${u.id}`} />} nativeButton={false}>
                      Editar
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
