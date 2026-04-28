'use client'
import {
  LayoutDashboard, Building2, ListChecks, GanttChartSquare,
  KanbanSquare, BarChart3, Users, FileClock, User, BookOpen, LucideIcon,
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
  { href: '/guia', label: 'Guia', icon: BookOpen },
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
    <aside className="w-60 shrink-0 border-r border-slate-800 bg-slate-900 flex flex-col h-screen sticky top-0">
      {/* Brand */}
      <div className="px-4 h-14 flex items-center border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded bg-emerald-500 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold leading-none">OC</span>
          </div>
          <span className="font-semibold text-sm text-slate-100 tracking-tight">Obra Cabanas</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5" aria-label="Navegação principal">
        {NAV.map(item => <NavItem key={item.href} {...item} />)}

        {isAdmin && (
          <>
            <div className="px-3 pt-4 pb-1 text-[10px] font-semibold text-slate-500 uppercase tracking-[0.12em]">
              Admin
            </div>
            {ADMIN_NAV.map(item => <NavItem key={item.href} {...item} />)}
          </>
        )}
      </nav>

      {/* User */}
      <div className="border-t border-slate-800 p-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors hover:bg-slate-800 text-left"
          >
            <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-slate-200">
                {userName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex flex-col items-start min-w-0 flex-1">
              <span className="text-sm font-medium text-slate-200 truncate w-full">{userName}</span>
              <span className="text-[11px] text-slate-500 capitalize">{role}</span>
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
