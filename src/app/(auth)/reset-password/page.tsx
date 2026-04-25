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
        <p className="text-sm text-muted-foreground mt-1">Escolhe uma nova password para a tua conta.</p>
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
          <p className="text-sm text-destructive" role="alert">{state.error}</p>
        )}

        <Button type="submit" className="w-full h-10" disabled={pending}>
          {pending ? 'A guardar…' : 'Guardar password'}
        </Button>
      </form>
    </div>
  )
}
