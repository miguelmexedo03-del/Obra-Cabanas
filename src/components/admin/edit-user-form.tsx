'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { updateUserSchema, type UpdateUserInput } from '@/lib/validations/users'
import { updateUser } from '@/app/actions/users'
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'

interface Props {
  userId: string
  defaults: { nome: string; isAdmin: boolean }
}

export function EditUserForm({ userId, defaults }: Props) {
  const form = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: { nome: defaults.nome, isAdmin: defaults.isAdmin },
  })

  async function onSubmit(data: UpdateUserInput) {
    const res = await updateUser(userId, data)
    if (!res.success) {
      toast.error('Não foi possível atualizar', { description: res.error })
      return
    }
    toast.success('Atualizado.')
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField name="nome" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>Nome</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField name="isAdmin" control={form.control} render={({ field }) => (
          <FormItem className="flex items-center gap-3 rounded-md border p-3">
            <FormControl>
              <Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} />
            </FormControl>
            <div>
              <FormLabel className="cursor-pointer">Administrador</FormLabel>
              <p className="text-xs text-muted-foreground">Acesso a /admin/*</p>
            </div>
          </FormItem>
        )} />

        <Button type="submit" disabled={form.formState.isSubmitting}>
          Guardar
        </Button>
      </form>
    </Form>
  )
}
