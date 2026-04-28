'use client'

import { useState, useEffect } from 'react'
import { differenceInDays, parseISO, addDays, format } from 'date-fns'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { updateTarefaSchema, type UpdateTarefaInput } from '@/lib/validations/gantt'
import { updateTarefa } from '@/app/actions/gantt'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

interface EditTarefaModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  tarefaId: number
  nome: string
  defaultValues: UpdateTarefaInput
  canEdit: boolean
}

export function EditTarefaModal({ open, onOpenChange, tarefaId, nome, defaultValues, canEdit }: EditTarefaModalProps) {
  const [serverError, setServerError] = useState<string | null>(null)
  const [isClearing, setIsClearing] = useState(false)

  const hasDates = !!(defaultValues.inicio || defaultValues.fim)

  async function clearDates() {
    setIsClearing(true)
    const result = await updateTarefa(tarefaId, { inicio: null, fim: null })
    setIsClearing(false)
    if (!result.success) { setServerError(result.error); return }
    onOpenChange(false)
  }

  const form = useForm<UpdateTarefaInput>({
    resolver: zodResolver(updateTarefaSchema),
    defaultValues,
  })

  // Duração em dias — campo UI-only, não vai para o schema
  const [duracao, setDuracao] = useState<string>(() => {
    if (defaultValues.inicio && defaultValues.fim) {
      const d = differenceInDays(parseISO(defaultValues.fim), parseISO(defaultValues.inicio)) + 1
      return String(d)
    }
    return ''
  })

  const watchedInicio = form.watch('inicio')
  const watchedFim = form.watch('fim')

  // Quando inicio ou fim mudam pelo date picker → recalcular duração
  useEffect(() => {
    if (watchedInicio && watchedFim && watchedInicio <= watchedFim) {
      const d = differenceInDays(parseISO(watchedFim), parseISO(watchedInicio)) + 1
      setDuracao(String(d))
    }
  }, [watchedInicio, watchedFim])

  function handleDuracaoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setDuracao(val)
    const dias = parseInt(val)
    const inicio = form.getValues('inicio')
    if (!isNaN(dias) && dias >= 1 && inicio) {
      const fimDate = addDays(parseISO(inicio), dias - 1)
      form.setValue('fim', format(fimDate, 'yyyy-MM-dd'), { shouldValidate: true })
    }
  }

  async function onSubmit(data: UpdateTarefaInput) {
    setServerError(null)
    const result = await updateTarefa(tarefaId, data)
    if (!result.success) {
      setServerError(result.error)
      return
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{nome}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="inicio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Início</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={field.value ?? ''}
                        disabled={!canEdit}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Duração (dias)</label>
                <Input
                  type="number"
                  min="1"
                  value={duracao}
                  onChange={handleDuracaoChange}
                  disabled={!canEdit}
                  placeholder="dias"
                />
              </div>
              <FormField
                control={form.control}
                name="fim"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fim</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={field.value ?? ''}
                        disabled={!canEdit}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!canEdit}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleciona..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="por_fazer">Por fazer</SelectItem>
                      <SelectItem value="em_curso">Em curso</SelectItem>
                      <SelectItem value="bloqueado">Bloqueado</SelectItem>
                      <SelectItem value="concluido">Concluído</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notas"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value ?? ''}
                      rows={3}
                      disabled={!canEdit}
                      placeholder={canEdit ? 'Observações sobre esta fase...' : 'Sem notas.'}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {serverError && (
              <p role="alert" className="text-sm text-destructive">{serverError}</p>
            )}
            {canEdit && (
              <DialogFooter className="flex-col sm:flex-row sm:justify-between gap-2">
                <div>
                  {hasDates && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      disabled={isClearing}
                      onClick={clearDates}
                    >
                      {isClearing ? 'A limpar...' : 'Limpar datas'}
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'A guardar...' : 'Guardar'}
                  </Button>
                </div>
              </DialogFooter>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
