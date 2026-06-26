'use client'

import { useOptimistic, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ChecklistItem } from './checklist-item'
import { AddItemInline } from './add-item-inline'
import { criarElemento } from '@/app/actions/checklist'

export type ChecklistGroupItem = {
  id: number
  elemento: string
  sub_elemento: string | null
  concluido: boolean
  fase_id: number
  divisao_id: number | null
}

export type ChecklistGroupData = {
  id: number | null
  nome: string
  faseColor: string
  defaultFaseId: number
  concluidos: number
  items: ChecklistGroupItem[]
}

interface Props {
  initialGroups: ChecklistGroupData[]
  apartamentoId: number
}

type OptimisticAction = {
  divisaoId: number
  item: ChecklistGroupItem
}

export function ChecklistGroups({ initialGroups, apartamentoId }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [groups, addOptimistic] = useOptimistic(
    initialGroups,
    (state: ChecklistGroupData[], action: OptimisticAction) =>
      state.map(g =>
        g.id === action.divisaoId
          ? { ...g, items: [...g.items, action.item] }
          : g,
      ),
  )

  function handleAdd(divisaoId: number, faseId: number, nome: string) {
    const tempItem: ChecklistGroupItem = {
      id: -Date.now(),
      elemento: nome,
      sub_elemento: null,
      concluido: false,
      fase_id: faseId,
      divisao_id: divisaoId,
    }

    startTransition(async () => {
      addOptimistic({ divisaoId, item: tempItem })
      const result = await criarElemento(apartamentoId, divisaoId, faseId, nome)
      if (result.success) {
        router.refresh()
      } else {
        toast.error('Erro ao criar item', { description: result.error })
      }
    })
  }

  const total = groups.reduce((s, g) => s + g.items.length, 0)

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{total} itens</p>
      {groups.map((group, i) => (
        <div key={group.id ?? i} className="rounded-lg border overflow-hidden">
          <div
            className="px-4 py-2.5 flex items-center gap-2 border-b bg-muted/30"
            style={{ borderLeftColor: group.faseColor, borderLeftWidth: '3px' }}
          >
            <span className="text-sm font-medium flex-1 truncate">{group.nome}</span>
            <span className="text-xs text-muted-foreground shrink-0">
              {group.concluidos}/{group.items.length}
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
          {group.id !== null && (
            <AddItemInline
              onAdd={nome => handleAdd(group.id!, group.defaultFaseId, nome)}
            />
          )}
        </div>
      ))}
    </div>
  )
}
