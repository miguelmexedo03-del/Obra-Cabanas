'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { changeOwnPassword } from '@/app/actions/auth'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export function ChangePasswordForm() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      toast.error('Mínimo 8 caracteres.')
      return
    }
    if (password !== confirm) {
      toast.error('As passwords não coincidem.')
      return
    }
    setPending(true)
    const res = await changeOwnPassword(password)
    setPending(false)
    if (!res.success) {
      toast.error('Não foi possível atualizar', { description: res.error })
      return
    }
    toast.success('Password atualizada.')
    setPassword('')
    setConfirm('')
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border p-4 space-y-4">
      <p className="text-sm font-medium">Alterar password</p>

      <div className="space-y-1.5">
        <Label htmlFor="new-password">Nova password</Label>
        <Input
          id="new-password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirm-password">Confirmar password</Label>
        <Input
          id="confirm-password"
          type="password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          autoComplete="new-password"
          placeholder="Repetir password"
        />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? 'A guardar…' : 'Guardar'}
      </Button>
    </form>
  )
}
