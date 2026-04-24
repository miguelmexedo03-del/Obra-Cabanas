import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, role')
    .eq('id', user!.id)
    .single() as { data: { nome: string; role: string } | null; error: unknown }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Dashboard</h1>
      <p className="text-muted-foreground text-sm">
        Bem-vindo, {profile?.nome ?? user?.email}. M2 (Checklist) a seguir.
      </p>
    </div>
  )
}
