'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ChevronLeft, Check } from 'lucide-react'
import { toast } from 'sonner'
import { criarElementosBatch } from '@/app/actions/checklist'
import { Button } from '@/components/ui/button'

type Fase = { id: number; nome: string }
type DivisaoItem = { id: number; nome: string; apartamentoId: number; apartamentoCodigo: string }
type GrupoNormalizado = { key: string; displayName: string; divisoes: DivisaoItem[] }

interface Props {
  fases: Fase[]
  grupos: GrupoNormalizado[]
}

type Step = 1 | 2 | 3

export function GerirItensClient({ fases, grupos }: Props) {
  const [step, setStep] = useState<Step>(1)
  const [nome, setNome] = useState('')
  const [faseId, setFaseId] = useState<number>(fases[0]?.id ?? 1)
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [step3Snapshot, setStep3Snapshot] = useState<DivisaoItem[]>([])
  const [isPending, startTransition] = useTransition()
  const [done, setDone] = useState<{ nome: string; count: number } | null>(null)

  function toggleGroup(key: string, divisaoIds: number[]) {
    setSelectedKeys(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
        setSelectedIds(prevIds => {
          const n = new Set(prevIds)
          for (const id of divisaoIds) n.delete(id)
          return n
        })
      } else {
        next.add(key)
        setSelectedIds(prevIds => {
          const n = new Set(prevIds)
          for (const id of divisaoIds) n.add(id)
          return n
        })
      }
      return next
    })
  }

  function toggleDivisao(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      // Update selectedKeys to reflect partial/full group state
      const group = grupos.find(g => g.divisoes.some(d => d.id === id))
      if (group) {
        const allSelected = group.divisoes.every(d => next.has(d.id))
        const noneSelected = group.divisoes.every(d => !next.has(d.id))
        setSelectedKeys(prev2 => {
          const next2 = new Set(prev2)
          if (allSelected) next2.add(group.key)
          else if (noneSelected) next2.delete(group.key)
          // partially selected: keep key present (group checkbox shows checked to return)
          return next2
        })
      }
      return next
    })
  }

  function selectAll() {
    setSelectedKeys(new Set(grupos.map(g => g.key)))
    setSelectedIds(new Set(grupos.flatMap(g => g.divisoes.map(d => d.id))))
  }

  function clearAll() {
    setSelectedKeys(new Set())
    setSelectedIds(new Set())
  }

  function goToStep3() {
    setStep3Snapshot(grupos.flatMap(g => g.divisoes).filter(d => selectedIds.has(d.id)))
    setStep(3)
  }

  function handleConfirm() {
    const selected = step3Snapshot.filter(d => selectedIds.has(d.id))
    const itens = selected.map(d => ({
      apartamento_id: d.apartamentoId,
      divisao_id: d.id,
      fase_id: faseId,
      elemento: nome.trim(),
    }))

    startTransition(async () => {
      const result = await criarElementosBatch(itens)
      if (result.success) {
        setDone({ nome: nome.trim(), count: result.count })
      } else {
        toast.error('Erro ao criar itens', { description: result.error })
      }
    })
  }

  function resetForm() {
    setDone(null)
    setStep(1)
    setNome('')
    setFaseId(fases[0]?.id ?? 1)
    setSelectedKeys(new Set())
    setSelectedIds(new Set())
    setStep3Snapshot([])
  }

  const selectedFaseName = fases.find(f => f.id === faseId)?.nome ?? ''

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="rounded-lg border bg-card p-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Gerir Itens em Massa</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Adiciona o mesmo item a várias divisões de uma vez
          </p>
        </div>
        <Button variant="outline" size="sm" render={<Link href="/apartamentos" />}>
          <ChevronLeft className="h-4 w-4" />
          Voltar
        </Button>
      </div>

      {/* Success state */}
      {done && (
        <div className="rounded-lg border bg-card p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium">Item adicionado com sucesso</p>
              <p className="text-sm text-muted-foreground">
                &ldquo;{done.nome}&rdquo; criado em {done.count}{' '}
                {done.count === 1 ? 'divisão' : 'divisões'}
              </p>
            </div>
          </div>
          <Button onClick={resetForm} variant="outline" size="sm">
            Adicionar outro item
          </Button>
        </div>
      )}

      {!done && (
        <>
          {/* Step 1 — Nome e fase */}
          <div className="rounded-lg border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                  ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
              >
                1
              </span>
              <span className="text-sm font-medium">Nome e fase do item</span>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                value={nome}
                onChange={e => setNome(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && nome.trim()) setStep(2) }}
                placeholder="Ex: Verificar rodapé"
                disabled={step > 1}
                className="w-full px-3 py-2 text-sm border rounded-md bg-background outline-none
                  focus:ring-2 focus:ring-ring disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <select
                value={faseId}
                onChange={e => setFaseId(Number(e.target.value))}
                disabled={step > 1}
                className="w-full px-3 py-2 text-sm border rounded-md bg-background outline-none
                  focus:ring-2 focus:ring-ring disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {fases.map(f => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
              </select>
              {step === 1 && (
                <Button
                  onClick={() => setStep(2)}
                  disabled={!nome.trim()}
                  size="sm"
                >
                  Seguinte
                </Button>
              )}
              {step > 1 && (
                <p className="text-xs text-muted-foreground">
                  Fase: <strong>{selectedFaseName}</strong>
                  {' · '}
                  <button
                    onClick={() => setStep(1)}
                    className="underline hover:no-underline"
                  >
                    Alterar
                  </button>
                </p>
              )}
            </div>
          </div>

          {/* Step 2 — Selecionar grupos */}
          {step >= 2 && (
            <div className="rounded-lg border bg-card p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                    ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                >
                  2
                </span>
                <span className="text-sm font-medium">Selecionar divisões</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{grupos.length} grupos</span>
                <div className="flex gap-3">
                  <button onClick={selectAll} className="text-xs text-primary hover:underline">
                    Selecionar todos
                  </button>
                  <button onClick={clearAll} className="text-xs text-muted-foreground hover:underline">
                    Limpar
                  </button>
                </div>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {grupos.map(g => {
                  const apCount = new Set(g.divisoes.map(d => d.apartamentoId)).size
                  return (
                    <label
                      key={g.key}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedKeys.has(g.key)}
                        onChange={() => toggleGroup(g.key, g.divisoes.map(d => d.id))}
                        className="h-4 w-4 rounded border-input"
                      />
                      <span className="text-sm flex-1">{g.displayName}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {g.divisoes.length} {g.divisoes.length !== 1 ? 'divisões' : 'divisão'} em {apCount} AP{apCount !== 1 ? 's' : ''}
                      </span>
                    </label>
                  )
                })}
              </div>
              {step === 2 && (
                <Button
                  onClick={goToStep3}
                  disabled={selectedIds.size === 0}
                  size="sm"
                >
                  Seguinte ({selectedIds.size} {selectedIds.size !== 1 ? 'divisões' : 'divisão'})
                </Button>
              )}
              {step > 2 && (
                <p className="text-xs text-muted-foreground">
                  {selectedIds.size} divisões selecionadas
                  {' · '}
                  <button
                    onClick={() => setStep(2)}
                    className="underline hover:no-underline"
                  >
                    Alterar
                  </button>
                </p>
              )}
            </div>
          )}

          {/* Step 3 — Refinar + confirmar */}
          {step === 3 && (
            <div className="rounded-lg border bg-card p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-primary text-primary-foreground">
                  3
                </span>
                <span className="text-sm font-medium">Confirmar divisões</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Desmarca as divisões onde <strong>não</strong> queres adicionar o item.
              </p>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {step3Snapshot.map(d => (
                  <label
                    key={d.id}
                    className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-muted/50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(d.id)}
                      onChange={() => toggleDivisao(d.id)}
                      className="h-4 w-4 rounded border-input"
                    />
                    <span className="text-sm flex-1">{d.nome}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{d.apartamentoCodigo}</span>
                  </label>
                ))}
              </div>
              <Button
                onClick={handleConfirm}
                disabled={selectedIds.size === 0 || isPending}
              >
                {isPending
                  ? 'A criar...'
                  : `Adicionar "${nome.trim()}" a ${selectedIds.size} ${selectedIds.size !== 1 ? 'divisões' : 'divisão'}`
                }
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
