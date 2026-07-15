'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { addCategoria, renameCategoria } from '@/app/actions/materiais'

interface Categoria { id: number; nome: string; ordem: number }

export function GestorCategorias({ categorias }: { categorias: Categoria[] }) {
  const router = useRouter()
  const [nova, setNova] = useState('')
  const [busy, setBusy] = useState(false)

  async function adicionar() {
    setBusy(true)
    const r = await addCategoria(nova)
    setBusy(false)
    if (!r.success) { toast.error(r.error); return }
    setNova(''); toast.success('Categoria adicionada.'); router.refresh()
  }

  async function renomear(id: number, nome: string) {
    const r = await renameCategoria(id, nome)
    if (!r.success) { toast.error(r.error); return }
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input className="border rounded px-3 py-2 flex-1" placeholder="Nova categoria" value={nova}
          onChange={e => setNova(e.target.value)} />
        <button className="border rounded px-4 py-2 disabled:opacity-50" onClick={adicionar} disabled={busy || !nova.trim()}>
          Adicionar
        </button>
      </div>
      <ul className="space-y-1">
        {categorias.map(c => (
          <li key={c.id}>
            <input className="border rounded px-2 py-1 w-full" defaultValue={c.nome}
              onBlur={e => { if (e.target.value.trim() && e.target.value !== c.nome) void renomear(c.id, e.target.value) }} />
          </li>
        ))}
      </ul>
    </div>
  )
}
