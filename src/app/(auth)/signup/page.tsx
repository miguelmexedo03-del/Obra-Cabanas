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
        <h1 className="text-2xl font-semibold tracking-tight">Obra Cabanas</h1>
        <p className="text-sm text-muted-foreground mt-1">Cria a tua conta</p>
      </div>

      <form action={action} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="nome">Nome</Label>
          <Input
            id="nome"
            name="nome"
            type="text"
            autoComplete="name"
            required
            placeholder="O teu nome"
          />
        </div>

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
          <p className="text-sm text-destructive" role="alert">{state.error}</p>
        )}

        <Button type="submit" className="w-full h-10" disabled={pending}>
          {pending ? 'A criar conta…' : 'Criar conta'}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Já tens conta?{' '}
        <Link href="/login" className="font-medium underline underline-offset-4">
          Entra aqui
        </Link>
      </p>
    </div>
  )
}
