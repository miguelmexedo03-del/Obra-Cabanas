import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppSidebar } from '@/components/layout/app-sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, role')
    .eq('id', user.id)
    .single() as { data: { nome: string; role: string } | null }

  return (
    <div className="flex min-h-screen">
      <AppSidebar
        userName={profile?.nome ?? user.email ?? 'Utilizador'}
        userEmail={user.email ?? ''}
        role={profile?.role ?? 'user'}
      />
      <main className="flex-1 min-w-0 px-8 py-6 overflow-x-auto">
        {children}
      </main>
    </div>
  )
}
