'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createUserSchema, type CreateUserInput } from '@/lib/validations/users'
import { createUser } from '@/app/actions/users'
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'

function randomPassword() {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6).toUpperCase()
}

export function CreateUserForm() {
  const router = useRouter()
  const form = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { email: '', nome: '', isAdmin: false, password: randomPassword() },
  })

  async function onSubmit(data: CreateUserInput) {
    const res = await createUser(data)
    if (!res.success) {
      toast.error('Não foi possível criar', { description: res.error })
      return
    }
    toast.success('Utilizador criado.', {
      description: `Password inicial: ${data.password} — copia e envia ao colaborador.`,
      duration: 15000,
    })
    router.push('/admin/users')
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-md">
        <FormField name="nome" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>Nome</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField name="email" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl><Input type="email" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField name="password" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>Password inicial</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <p className="text-xs text-muted-foreground">Será mostrada após criar para copiares.</p>
            <FormMessage />
          </FormItem>
        )} />

        <FormField name="isAdmin" control={form.control} render={({ field }) => (
          <FormItem className="flex items-center gap-3 rounded-md border p-3">
            <FormControl>
              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
            <div>
              <FormLabel className="cursor-pointer">Administrador</FormLabel>
              <p className="text-xs text-muted-foreground">Pode gerir utilizadores e aceder a /admin/*</p>
            </div>
          </FormItem>
        )} />

        <Button type="submit" disabled={form.formState.isSubmitting}>
          Criar utilizador
        </Button>
      </form>
    </Form>
  )
}
