'use client'
import {
  LayoutDashboard, Building2, ListChecks, GanttChartSquare,
  KanbanSquare, BarChart3, Users, FileClock, User, LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import { NavItem } from './nav-item'
import { logout } from '@/app/actions/auth'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'

interface AppSidebarProps {
  userName: string
  userEmail: string
  role: string
}

const NAV: { href: string; label: string; icon: LucideIcon; exact?: boolean }[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/apartamentos', label: 'Apartamentos', icon: Building2 },
  { href: '/checklist', label: 'Checklist', icon: ListChecks },
  { href: '/gantt', label: 'Gantt', icon: GanttChartSquare },
  { href: '/kanban', label: 'Kanban', icon: KanbanSquare },
  { href: '/lob', label: 'LoB', icon: BarChart3 },
]

const ADMIN_NAV: { href: string; label: string; icon: LucideIcon; exact?: boolean }[] = [
  { href: '/admin/users', label: 'Utilizadores', icon: Users },
  { href: '/admin/audit', label: 'Auditoria', icon: FileClock },
]

export function AppSidebar({ userName, userEmail, role }: AppSidebarProps) {
  const isAdmin = role === 'admin'

  return (
    <aside className="w-60 shrink-0 border-r bg-background flex flex-col h-screen sticky top-0">
      <div className="px-4 h-14 flex items-center border-b">
        <span className="font-semibold text-sm">Obra Cabanas</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5" aria-label="Navegação principal">
        {NAV.map(item => <NavItem key={item.href} {...item} />)}

        {isAdmin && (
          <>
            <div className="px-3 pt-4 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Admin
            </div>
            {ADMIN_NAV.map(item => <NavItem key={item.href} {...item} />)}
          </>
        )}
      </nav>

      <div className="border-t p-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            className="w-full flex items-start gap-2 px-3 py-2 rounded-md text-sm transition-colors hover:bg-muted text-left"
          >
            <div className="flex flex-col items-start min-w-0 flex-1">
              <span className="text-sm font-medium truncate w-full">{userName}</span>
              <span className="text-xs text-muted-foreground truncate w-full capitalize">{role}</span>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col">
                <span className="text-sm font-medium">{userName}</span>
                <span className="text-xs text-muted-foreground">{userEmail}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              render={<Link href="/profile" className="flex items-center gap-2 cursor-pointer" />}
            >
              <User className="h-4 w-4" /> Perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <form action={logout}>
              <DropdownMenuItem render={<button type="submit" className="w-full cursor-pointer" />}>
                Sair
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
