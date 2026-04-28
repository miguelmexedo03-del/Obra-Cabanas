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
  const msg = searchParams.get('msg')

  return (
    <div className="rounded-lg border bg-card p-8 shadow-sm">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Obra Cabanas</h1>
        <p className="text-sm text-muted-foreground mt-1">Entra na tua conta</p>
      </div>

      {msg === 'confirma-email' && (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Conta criada! Confirma o teu email antes de entrar.
        </div>
      )}

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
          <p className="text-sm text-destructive" role="alert">{state.error}</p>
        )}

        <Button type="submit" className="w-full h-10" disabled={pending}>
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
