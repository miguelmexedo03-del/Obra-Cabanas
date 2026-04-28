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
        'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-150',
        active
          ? 'bg-slate-800 text-slate-100 font-medium'
          : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200',
      )}
    >
      <Icon
        className={cn(
          'h-4 w-4 shrink-0 transition-colors',
          active ? 'text-emerald-400' : 'text-slate-500',
        )}
      />
      <span className="truncate">{label}</span>
    </Link>
  )
}
