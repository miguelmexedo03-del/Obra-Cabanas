'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItemProps {
  href: string
  label: string
  icon: LucideIcon
  exact?: boolean
}

export function NavItem({ href, label, icon: Icon, exact }: NavItemProps) {
  const pathname = usePathname()
  const active = exact
    ? pathname === href
    : (href !== '/' && pathname.startsWith(href))

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex items-center gap-3 rounded-md py-2 pr-3 pl-3.5 text-[0.925rem] transition-colors duration-150',
        active
          ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground before:absolute before:top-1.5 before:bottom-1.5 before:left-0 before:w-0.5 before:rounded-full before:bg-sidebar-primary'
          : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
      )}
    >
      <Icon
        className={cn(
          'h-4 w-4 shrink-0 transition-colors',
          active ? 'text-sidebar-primary' : 'text-sidebar-foreground/70',
        )}
      />
      <span className="truncate">{label}</span>
    </Link>
  )
}
