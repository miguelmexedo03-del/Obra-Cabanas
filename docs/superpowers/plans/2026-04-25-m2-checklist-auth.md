# M2 — Checklist + Auth Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implementar M2 (checklist filtrável + vista hierárquica por AP) e melhorar M1 (alinhamento login/signup, recuperação de password, modal de confirmação).

**Architecture:** Checklist usa Server Components com URL search params para filtros (server-side rendering, nada de React Query para o load inicial). Toggles usam Server Actions com `useOptimistic` para feedback instantâneo. Password recovery usa fluxo nativo do Supabase Auth (PKCE). Session persistence já está coberta pelo refresh token do Supabase (60 dias) — nenhum código extra necessário.

**Tech Stack:** Next.js 16 App Router, React 19, @supabase/ssr, shadcn base-nova (@base-ui/react), Tailwind v4, Zod v4, Server Actions

---

### Task 1: Install shadcn components

**Files:**
- Modify: `src/components/ui/` (novos ficheiros gerados)

- [ ] Run shadcn add
```bash
cd obra-cabanas-app
npx shadcn@latest add dialog input label select badge checkbox progress
```
- [ ] Verify files exist: `src/components/ui/dialog.tsx`, `input.tsx`, `label.tsx`, `select.tsx`, `badge.tsx`, `checkbox.tsx`, `progress.tsx`
- [ ] Run `npm run build` to confirm no compile errors
- [ ] Commit: `chore: add shadcn components (dialog, input, label, select, badge, checkbox, progress)`

---

### Task 2: Fix auth validation + login/signup alignment

**Files:**
- Modify: `src/lib/validations/auth.ts`
- Modify: `src/app/(auth)/login/page.tsx`

- [ ] Update `src/lib/validations/auth.ts` — align login min to 8:
```typescript
import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Email inválido.'),
  password: z.string().min(8, 'Password deve ter pelo menos 8 caracteres.'),
})

export const signupSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres.').max(80),
  email: z.string().email('Email inválido.'),
  password: z.string().min(8, 'Password deve ter pelo menos 8 caracteres.'),
})

export type LoginInput = z.infer<typeof loginSchema>
export type SignupInput = z.infer<typeof signupSchema>
```

- [ ] Update `src/app/(auth)/login/page.tsx` — use shadcn Input/Label, add forgot password link:
```tsx
'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { login } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function LoginForm() {
  const [state, action, pending] = useActionState(login, null)
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') ?? '/'

  return (
    <div className="rounded-lg border bg-card p-8 shadow-sm">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Obra Cabanas</h1>
        <p className="text-sm text-muted-foreground mt-1">Entra na tua conta</p>
      </div>

      <form action={action} className="space-y-4">
        <input type="hidden" name="redirectTo" value={redirectTo} />

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="tu@exemplo.com"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
            >
              Esqueceste-te da password?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
          />
        </div>

        {state && !state.success && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}

        <Button type="submit" className="w-full" disabled={pending} size="lg">
          {pending ? 'A entrar…' : 'Entrar'}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Sem conta?{' '}
        <Link href="/signup" className="font-medium underline underline-offset-4">
          Regista-te
        </Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
```

- [ ] Update `src/app/(auth)/signup/page.tsx` — use shadcn Input/Label for consistency:
```tsx
'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signup } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function SignupPage() {
  const [state, action, pending] = useActionState(signup, null)

  return (
    <div className="rounded-lg border bg-card p-8 shadow-sm">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Criar conta</h1>
        <p className="text-sm text-muted-foreground mt-1">Obra Cabanas — gestão de obra</p>
      </div>

      <form action={action} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="nome">Nome</Label>
          <Input id="nome" name="nome" type="text" autoComplete="name" required placeholder="O teu nome" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required placeholder="tu@exemplo.com" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            placeholder="Mínimo 8 caracteres"
          />
        </div>

        {state && !state.success && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}

        <Button type="submit" className="w-full" disabled={pending} size="lg">
          {pending ? 'A criar conta…' : 'Criar conta'}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Já tens conta?{' '}
        <Link href="/login" className="font-medium underline underline-offset-4">
          Entrar
        </Link>
      </p>
    </div>
  )
}
```

- [ ] Commit: `fix: align login/signup UI with shadcn Input/Label; fix password min to 8`

---

### Task 3: Password recovery — Server Actions

**Files:**
- Modify: `src/app/actions/auth.ts`

- [ ] Add `forgotPassword` and `resetPassword` to `src/app/actions/auth.ts`:
```typescript
export async function forgotPassword(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const email = formData.get('email')?.toString().trim()
  if (!email) return { success: false, error: 'Email obrigatório.' }

  const supabase = await createClient()
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  })

  if (error) return { success: false, error: 'Não foi possível enviar o email. Tenta novamente.' }
  return { success: true }
}

export async function resetPassword(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const password = formData.get('password')?.toString()
  const confirm = formData.get('confirm')?.toString()

  if (!password || password.length < 8) {
    return { success: false, error: 'Password deve ter pelo menos 8 caracteres.' }
  }
  if (password !== confirm) {
    return { success: false, error: 'As passwords não coincidem.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) return { success: false, error: 'Não foi possível atualizar a password. O link pode ter expirado.' }
  redirect('/')
}
```

- [ ] Create `src/app/(auth)/forgot-password/page.tsx`:
```tsx
'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { forgotPassword } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(forgotPassword, null)

  if (state?.success) {
    return (
      <div className="rounded-lg border bg-card p-8 shadow-sm text-center">
        <h1 className="text-xl font-semibold mb-2">Email enviado</h1>
        <p className="text-sm text-muted-foreground mb-4">
          Se o email existir na nossa base de dados, receberás um link para repor a password.
        </p>
        <Link href="/login" className="text-sm font-medium underline underline-offset-4">
          Voltar ao login
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-8 shadow-sm">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Repor password</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Introduz o teu email e enviaremos um link para repor a password.
        </p>
      </div>

      <form action={action} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required placeholder="tu@exemplo.com" />
        </div>

        {state && !state.success && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}

        <Button type="submit" className="w-full" disabled={pending} size="lg">
          {pending ? 'A enviar…' : 'Enviar link'}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium underline underline-offset-4">
          Voltar ao login
        </Link>
      </p>
    </div>
  )
}
```

- [ ] Create `src/app/(auth)/reset-password/page.tsx`:
```tsx
'use client'

import { useActionState } from 'react'
import { resetPassword } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ResetPasswordPage() {
  const [state, action, pending] = useActionState(resetPassword, null)

  return (
    <div className="rounded-lg border bg-card p-8 shadow-sm">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Nova password</h1>
        <p className="text-sm text-muted-foreground mt-1">Escolhe uma nova password.</p>
      </div>

      <form action={action} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="password">Nova password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            placeholder="Mínimo 8 caracteres"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm">Confirmar password</Label>
          <Input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            placeholder="Repete a password"
          />
        </div>

        {state && !state.success && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}

        <Button type="submit" className="w-full" disabled={pending} size="lg">
          {pending ? 'A guardar…' : 'Guardar password'}
        </Button>
      </form>
    </div>
  )
}
```

- [ ] Update `middleware.ts` to allow `/forgot-password` and `/reset-password` without auth:
```typescript
const isAuthPage = pathname.startsWith('/login')
  || pathname.startsWith('/signup')
  || pathname.startsWith('/forgot-password')
  || pathname.startsWith('/reset-password')
```

- [ ] Commit: `feat: password recovery flow (forgot-password + reset-password pages)`

---

### Task 4: ConfirmDialog component

**Files:**
- Create: `src/components/shared/confirm-dialog.tsx`

- [ ] Create `src/components/shared/confirm-dialog.tsx`:
```tsx
'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'destructive'
  onConfirm: () => void
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={() => { onConfirm(); onOpenChange(false) }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] Commit: `feat: reusable ConfirmDialog component`

---

### Task 5: Checklist Server Action

**Files:**
- Create: `src/app/actions/checklist.ts`

- [ ] Create `src/app/actions/checklist.ts`:
```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type Result = { success: true } | { success: false; error: string }

export async function toggleElemento(id: number, concluido: boolean): Promise<Result> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Não autenticado.' }

  const { error } = await supabase
    .from('elementos')
    .update({
      concluido,
      concluido_em: concluido ? new Date().toISOString() : null,
      concluido_por: concluido ? user.id : null,
    })
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/', 'layout')
  return { success: true }
}
```

- [ ] Commit: `feat: toggleElemento server action`

---

### Task 6: Apartments list page

**Files:**
- Create: `src/app/(app)/apartamentos/page.tsx`

- [ ] Create `src/app/(app)/apartamentos/page.tsx`:
```tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

export default async function ApartamentosPage() {
  const supabase = await createClient()

  const [{ data: apartamentos }, { data: progressos }] = await Promise.all([
    supabase.from('apartamentos').select('id, codigo, descricao').order('id'),
    supabase.from('progresso_por_apartamento').select('*'),
  ])

  const progressMap = new Map(progressos?.map(p => [p.apartamento_id, p]) ?? [])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Apartamentos</h1>
        <p className="text-sm text-muted-foreground mt-1">24 apartamentos — seleciona para ver o checklist</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {apartamentos?.map(ap => {
          const prog = progressMap.get(ap.id)
          const pct = prog?.percentagem ?? 0

          return (
            <Link
              key={ap.id}
              href={`/apartamentos/${ap.id}`}
              className="rounded-lg border bg-card p-4 hover:border-ring transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium">{ap.codigo}</span>
                <Badge variant="secondary">{Math.round(pct)}%</Badge>
              </div>
              <Progress value={pct} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {prog?.concluidos ?? 0} / {prog?.total ?? 0} itens concluídos
              </p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] Commit: `feat: apartments list page with progress`

---

### Task 7: Checklist components

**Files:**
- Create: `src/components/checklist/checklist-item.tsx`
- Create: `src/components/checklist/checklist-filters.tsx`

- [ ] Create `src/components/checklist/checklist-item.tsx`:
```tsx
'use client'

import { useOptimistic, useTransition } from 'react'
import { toggleElemento } from '@/app/actions/checklist'

interface Props {
  id: number
  elemento: string
  sub_elemento: string | null
  concluido: boolean
  faseColor: string
}

export function ChecklistItem({ id, elemento, sub_elemento, concluido, faseColor }: Props) {
  const [optimistic, setOptimistic] = useOptimistic(concluido)
  const [isPending, startTransition] = useTransition()

  function handleChange() {
    const next = !optimistic
    startTransition(async () => {
      setOptimistic(next)
      await toggleElemento(id, next)
    })
  }

  return (
    <label className={`flex items-start gap-3 px-3 py-3 cursor-pointer rounded-md transition-colors hover:bg-muted/50 ${isPending ? 'opacity-60' : ''}`}>
      <div className="relative mt-0.5 flex-shrink-0">
        <input
          type="checkbox"
          checked={optimistic}
          onChange={handleChange}
          className="sr-only peer"
        />
        <div
          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
            ${optimistic
              ? 'border-transparent'
              : 'border-input bg-background'
            }`}
          style={optimistic ? { backgroundColor: faseColor } : {}}
        >
          {optimistic && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-relaxed ${optimistic ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
          {elemento}
        </p>
        {sub_elemento && (
          <p className="text-xs text-muted-foreground mt-0.5">{sub_elemento}</p>
        )}
      </div>
    </label>
  )
}
```

- [ ] Create `src/components/checklist/checklist-filters.tsx`:
```tsx
'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface FilterOption { id: number; label: string }

interface Props {
  apartamentos: FilterOption[]
  fases: FilterOption[]
  showApFilter?: boolean
}

export function ChecklistFilters({ apartamentos, fases, showApFilter = true }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const setParam = useCallback((key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    startTransition(() => router.replace(`${pathname}?${params.toString()}`))
  }, [router, pathname, searchParams])

  const hasFilters = searchParams.size > 0

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {showApFilter && (
        <Select
          value={searchParams.get('ap') ?? ''}
          onValueChange={v => setParam('ap', v === 'all' ? null : v)}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Apartamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os APs</SelectItem>
            {apartamentos.map(a => (
              <SelectItem key={a.id} value={String(a.id)}>{a.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select
        value={searchParams.get('fase') ?? ''}
        onValueChange={v => setParam('fase', v === 'all' ? null : v)}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Fase" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as fases</SelectItem>
          {fases.map(f => (
            <SelectItem key={f.id} value={String(f.id)}>{f.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get('status') ?? ''}
        onValueChange={v => setParam('status', v === 'all' ? null : v)}
      >
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="unchecked">Por fazer</SelectItem>
          <SelectItem value="checked">Concluídos</SelectItem>
        </SelectContent>
      </Select>

      <Input
        placeholder="Pesquisar (ex: porta)"
        defaultValue={searchParams.get('q') ?? ''}
        onChange={e => setParam('q', e.target.value || null)}
        className="w-full sm:w-[200px]"
      />

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => startTransition(() => router.replace(pathname))}
          className="gap-1.5 text-muted-foreground"
        >
          <X className="h-3.5 w-3.5" />
          Limpar
        </Button>
      )}
    </div>
  )
}
```

- [ ] Commit: `feat: ChecklistItem and ChecklistFilters components`

---

### Task 8: Global checklist page

**Files:**
- Create: `src/app/(app)/checklist/page.tsx` (replace .gitkeep)

- [ ] Create `src/app/(app)/checklist/page.tsx`:
```tsx
import { createClient } from '@/lib/supabase/server'
import { ChecklistFilters } from '@/components/checklist/checklist-filters'
import { ChecklistItem } from '@/components/checklist/checklist-item'
import { Suspense } from 'react'

interface Props {
  searchParams: Promise<{
    ap?: string; fase?: string; status?: string; q?: string
  }>
}

async function ChecklistContent({ searchParams }: Props) {
  const params = await searchParams
  const supabase = await createClient()

  const [{ data: apartamentos }, { data: fases }] = await Promise.all([
    supabase.from('apartamentos').select('id, codigo').order('id'),
    supabase.from('fases').select('id, nome, cor_hex, ordem').order('ordem'),
  ])

  let query = supabase
    .from('elementos')
    .select('id, elemento, sub_elemento, concluido, apartamento_id, divisao_id, fase_id, divisoes(id, nome, ordem), fases(nome, cor_hex), apartamentos(codigo)')
    .order('apartamento_id')
    .order('divisao_id')
    .order('id')
    .limit(500)

  if (params.ap) query = query.eq('apartamento_id', Number(params.ap))
  if (params.fase) query = query.eq('fase_id', Number(params.fase))
  if (params.status === 'checked') query = query.eq('concluido', true)
  if (params.status === 'unchecked') query = query.eq('concluido', false)
  if (params.q?.trim()) {
    const q = params.q.trim()
    query = query.or(`elemento.ilike.%${q}%,sub_elemento.ilike.%${q}%`)
  }

  const { data: elementos, error } = await query

  if (error) {
    return <p className="text-sm text-destructive">Erro ao carregar dados: {error.message}</p>
  }

  if (!elementos?.length) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-sm">Nenhum item encontrado com os filtros selecionados.</p>
      </div>
    )
  }

  // Group: apartamento → divisão → elementos
  type Elem = NonNullable<typeof elementos>[0]
  type Group = { apCodigo: string; divisaoNome: string; faseColor: string; items: Elem[] }
  const groups: Group[] = []

  for (const el of elementos) {
    const apCodigo = (el.apartamentos as { codigo: string } | null)?.codigo ?? `AP${el.apartamento_id}`
    const divisaoNome = (el.divisoes as { nome: string } | null)?.nome ?? 'Sem divisão'
    const faseColor = (el.fases as { cor_hex: string } | null)?.cor_hex ?? '#888'
    const key = `${el.apartamento_id}-${el.divisao_id ?? 'null'}`

    const existing = groups.find(g => g.apCodigo === apCodigo && g.divisaoNome === divisaoNome)
    if (existing) {
      existing.items.push(el)
    } else {
      groups.push({ apCodigo, divisaoNome, faseColor, items: [el] })
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">{elementos.length} itens</p>
      {groups.map((group, i) => (
        <div key={i} className="rounded-lg border overflow-hidden">
          <div className="bg-muted/50 px-4 py-2.5 flex items-center gap-2 border-b">
            <span className="text-xs font-medium text-muted-foreground">{group.apCodigo}</span>
            <span className="text-xs text-muted-foreground">›</span>
            <span className="text-sm font-medium">{group.divisaoNome}</span>
            <span className="ml-auto text-xs text-muted-foreground">{group.items.length} itens</span>
          </div>
          <div className="divide-y">
            {group.items.map(el => (
              <ChecklistItem
                key={el.id}
                id={el.id}
                elemento={el.elemento}
                sub_elemento={el.sub_elemento}
                concluido={el.concluido}
                faseColor={group.faseColor}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default async function ChecklistPage({ searchParams }: Props) {
  const params = await searchParams
  const supabase = await createClient()

  const [{ data: apartamentos }, { data: fases }] = await Promise.all([
    supabase.from('apartamentos').select('id, codigo').order('id'),
    supabase.from('fases').select('id, nome, cor_hex, ordem').order('ordem'),
  ])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Checklist</h1>
        <p className="text-sm text-muted-foreground mt-1">Vista global — filtra por apartamento, fase ou pesquisa</p>
      </div>

      <div className="mb-4">
        <Suspense>
          <ChecklistFilters
            apartamentos={apartamentos?.map(a => ({ id: a.id, label: a.codigo })) ?? []}
            fases={fases?.map(f => ({ id: f.id, label: f.nome })) ?? []}
          />
        </Suspense>
      </div>

      <Suspense fallback={<p className="text-sm text-muted-foreground">A carregar…</p>}>
        <ChecklistContent searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
```

- [ ] Commit: `feat: global checklist page with filters and hierarchical view`

---

### Task 9: Apartment detail page (checklist by AP)

**Files:**
- Create: `src/app/(app)/apartamentos/[id]/page.tsx`

- [ ] Create `src/app/(app)/apartamentos/[id]/page.tsx`:
```tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ChecklistFilters } from '@/components/checklist/checklist-filters'
import { ChecklistItem } from '@/components/checklist/checklist-item'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Suspense } from 'react'
import { ChevronLeft } from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ fase?: string; status?: string; q?: string }>
}

export default async function ApartamentoPage({ params, searchParams }: Props) {
  const { id } = await params
  const filters = await searchParams
  const apId = Number(id)
  if (isNaN(apId)) notFound()

  const supabase = await createClient()

  const [
    { data: ap },
    { data: fases },
    { data: progresso },
  ] = await Promise.all([
    supabase.from('apartamentos').select('id, codigo, descricao').eq('id', apId).single(),
    supabase.from('fases').select('id, nome, cor_hex, ordem').order('ordem'),
    supabase.from('progresso_por_apartamento').select('*').eq('apartamento_id', apId).single(),
  ])

  if (!ap) notFound()

  let query = supabase
    .from('elementos')
    .select('id, elemento, sub_elemento, concluido, divisao_id, fase_id, divisoes(id, nome, ordem), fases(nome, cor_hex)')
    .eq('apartamento_id', apId)
    .order('divisao_id')
    .order('id')

  if (filters.fase) query = query.eq('fase_id', Number(filters.fase))
  if (filters.status === 'checked') query = query.eq('concluido', true)
  if (filters.status === 'unchecked') query = query.eq('concluido', false)
  if (filters.q?.trim()) {
    query = query.or(`elemento.ilike.%${filters.q.trim()}%,sub_elemento.ilike.%${filters.q.trim()}%`)
  }

  const { data: elementos } = await query

  // Group by divisão
  type Elem = NonNullable<typeof elementos>[0]
  type DivisaoGroup = { id: number | null; nome: string; faseColor: string; items: Elem[] }
  const groups: DivisaoGroup[] = []

  for (const el of elementos ?? []) {
    const divisaoId = el.divisao_id
    const divisaoNome = (el.divisoes as { nome: string } | null)?.nome ?? 'Sem divisão'
    const faseColor = (el.fases as { cor_hex: string } | null)?.cor_hex ?? '#888'

    const existing = groups.find(g => g.id === divisaoId)
    if (existing) {
      existing.items.push(el)
    } else {
      groups.push({ id: divisaoId, nome: divisaoNome, faseColor, items: [el] })
    }
  }

  const pct = progresso?.percentagem ?? 0

  return (
    <div>
      <div className="mb-6">
        <Link href="/apartamentos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
          <ChevronLeft className="h-4 w-4" /> Apartamentos
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{ap.codigo}</h1>
            {ap.descricao && <p className="text-sm text-muted-foreground mt-0.5">{ap.descricao}</p>}
          </div>
          <Badge variant="secondary" className="text-sm shrink-0">{Math.round(pct)}%</Badge>
        </div>
        <Progress value={pct} className="mt-3 h-2" />
        <p className="text-xs text-muted-foreground mt-1.5">
          {progresso?.concluidos ?? 0} / {progresso?.total ?? 0} itens concluídos
        </p>
      </div>

      <div className="mb-4">
        <Suspense>
          <ChecklistFilters
            apartamentos={[]}
            fases={fases?.map(f => ({ id: f.id, label: f.nome })) ?? []}
            showApFilter={false}
          />
        </Suspense>
      </div>

      {!grupos?.length || groups.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">Nenhum item encontrado.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">{elementos?.length ?? 0} itens</p>
          {groups.map((group, i) => (
            <div key={i} className="rounded-lg border overflow-hidden">
              <div
                className="px-4 py-2.5 flex items-center gap-2 border-b"
                style={{ borderLeftColor: group.faseColor, borderLeftWidth: 3 }}
              >
                <span className="text-sm font-medium">{group.nome}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {group.items.filter(e => e.concluido).length}/{group.items.length}
                </span>
              </div>
              <div className="divide-y">
                {group.items.map(el => (
                  <ChecklistItem
                    key={el.id}
                    id={el.id}
                    elemento={el.elemento}
                    sub_elemento={el.sub_elemento}
                    concluido={el.concluido}
                    faseColor={group.faseColor}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] Commit: `feat: apartment detail page with checklist grouped by divisão`

---

### Task 10: Update app layout with navigation

**Files:**
- Modify: `src/app/(app)/layout.tsx`

- [ ] Update `src/app/(app)/layout.tsx` to add nav links:
```tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'

const navLinks = [
  { href: '/', label: 'Dashboard' },
  { href: '/apartamentos', label: 'Apartamentos' },
  { href: '/checklist', label: 'Checklist' },
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

          <nav className="hidden sm:flex items-center gap-1 flex-1">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-1.5 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3 ml-auto">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {profile?.nome ?? user.email}
              <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs capitalize">
                {profile?.role ?? 'operario'}
              </span>
            </span>
            <form action={logout}>
              <Button type="submit" variant="ghost" size="sm">Sair</Button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6">{children}</main>
    </div>
  )
}
```

- [ ] Commit: `feat: add nav links to app layout (Dashboard, Apartamentos, Checklist)`

---

### Task 11: Add permissions to settings.json

**Files:**
- Modify: `.claude/settings.json`

- [ ] Add npm run permissions and npx shadcn to allow list
- [ ] Commit: `chore: add non-sensitive permissions to settings.json`
