import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'

const navLinks = [
  { href: '/', label: 'Dashboard' },
  { href: '/apartamentos', label: 'Apartamentos' },
  { href: '/checklist', label: 'Checklist' },
  { href: '/gantt', label: 'Gantt' },
  { href: '/kanban', label: 'Kanban' },
  { href: '/lob', label: 'LoB' },
]

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, role')
    .eq('id', user.id)
    .single() as { data: { nome: string; role: string } | null; error: unknown }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-background sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 h-14 flex items-center gap-4">
          <span className="font-semibold text-sm shrink-0">Obra Cabanas</span>

          <nav className="hidden sm:flex items-center gap-0.5 flex-1" aria-label="Navegação principal">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-1.5 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                {link.label}
              </Link>
            ))}
            {profile?.role === 'admin' && (
              <Link
                href="/admin/audit"
                className="px-3 py-1.5 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                Audit
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-3 ml-auto">
            <span className="text-sm text-muted-foreground hidden sm:inline-flex items-center gap-2">
              {profile?.nome ?? user.email}
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">
                {profile?.role ?? 'operario'}
              </span>
            </span>
            <form action={logout}>
              <Button type="submit" variant="ghost" size="sm">Sair</Button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6">
        {children}
      </main>
    </div>
  )
}
