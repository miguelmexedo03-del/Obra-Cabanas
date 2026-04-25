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
        <p className="text-sm text-muted-foreground mb-6">
          Se o email existir na nossa base de dados, receberás um link para repor a password nos próximos minutos.
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
          Introduz o teu email e enviamos um link de recuperação.
        </p>
      </div>

      <form action={action} className="space-y-4">
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

        {state && !state.success && (
          <p className="text-sm text-destructive" role="alert">{state.error}</p>
        )}

        <Button type="submit" className="w-full h-10" disabled={pending}>
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
