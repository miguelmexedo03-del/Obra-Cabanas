'use client'
import {
  LayoutDashboard, Building2, ListChecks, GanttChartSquare,
  KanbanSquare, BarChart3, Users, FileClock, User, BookOpen, PlusSquare, Search, FileText, Settings, Package, LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
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
  { href: '/gerir-itens', label: 'Gerir Itens', icon: PlusSquare },
  { href: '/materiais', label: 'Materiais', icon: Package },
  { href: '/relatorio/consulta', label: 'Consulta', icon: Search },
  { href: '/relatorio/executivo', label: 'Relatório executivo', icon: FileText, exact: true },
  { href: '/gantt', label: 'Gantt', icon: GanttChartSquare },
  { href: '/kanban', label: 'Kanban', icon: KanbanSquare },
  { href: '/lob', label: 'LoB', icon: BarChart3 },
]

const ADMIN_NAV: { href: string; label: string; icon: LucideIcon; exact?: boolean }[] = [
  { href: '/admin/users', label: 'Utilizadores', icon: Users },
  { href: '/admin/audit', label: 'Auditoria', icon: FileClock },
  { href: '/relatorio/executivo/config', label: 'Instruções do relatório', icon: Settings },
]

export function AppSidebar({ userName, userEmail, role }: AppSidebarProps) {
  const isAdmin = role === 'admin'

  return (
    <aside className="w-60 shrink-0 border-r border-sidebar-border bg-sidebar flex flex-col h-screen sticky top-0">
      {/* Brand */}
      <div className="px-4 h-14 flex items-center border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white p-1">
            <Image src="/logo-tar.png" alt="tar" width={28} height={28} className="h-full w-full object-contain" priority />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-sm font-semibold tracking-tight text-sidebar-accent-foreground">tar</span>
            <span className="text-[10px] tracking-wide text-sidebar-foreground/70">Obra Cabanas</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5" aria-label="Navegação principal">
        {NAV.map(item => <NavItem key={item.href} {...item} />)}

        {isAdmin && (
          <>
            <div className="px-3 pt-4 pb-1 text-[10px] font-semibold text-sidebar-foreground/50 uppercase tracking-[0.12em]">
              Admin
            </div>
            {ADMIN_NAV.map(item => <NavItem key={item.href} {...item} />)}
          </>
        )}
      </nav>

      {/* User */}
      <div className="border-t border-sidebar-border p-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors hover:bg-sidebar-accent text-left"
          >
            <div className="w-7 h-7 rounded-full bg-sidebar-accent flex items-center justify-center shrink-0 text-sidebar-accent-foreground ring-1 ring-sidebar-border">
              <span className="text-xs font-semibold">
                {userName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex flex-col items-start min-w-0 flex-1">
              <span className="text-sm font-medium text-sidebar-accent-foreground truncate w-full">{userName}</span>
              <span className="text-[11px] text-sidebar-foreground/60 capitalize">{role}</span>
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
