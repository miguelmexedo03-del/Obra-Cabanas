'use client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { deleteUser } from '@/app/actions/users'

interface Props {
  userId: string
  userName: string
  disabled?: boolean
}

export function DeleteUserButton({ userId, userName, disabled }: Props) {
  const router = useRouter()

  async function confirm() {
    const res = await deleteUser(userId)
    if (!res.success) {
      toast.error('Não foi possível eliminar', { description: res.error })
      return
    }
    toast.success('Utilizador eliminado.')
    router.push('/admin/users')
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="destructive" disabled={disabled} />}>
        <Trash2 className="h-4 w-4 mr-2" /> Eliminar
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar {userName}?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser revertida. O acesso é removido imediatamente.
            As entradas no audit log são preservadas.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={confirm}>Eliminar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
