'use client'

import { useState } from 'react'
import { Copy, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { gerarRelatorioAction } from '@/app/actions/relatorio'
import type { RelatorioResult } from '@/lib/relatorio/types'

interface Apartamento {
  id: number
  codigo: string
}

interface Props {
  apartamentos: Apartamento[]
}

export function Gerador({ apartamentos }: Props) {
  const [apId, setApId] = useState<number>(apartamentos[0]?.id ?? 1)
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState<RelatorioResult | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  async function gerar() {
    setLoading(true)
    setErro(null)
    setResultado(null)
    const r = await gerarRelatorioAction(apId)
    if (r.success) setResultado(r.data)
    else setErro(r.error)
    setLoading(false)
  }

  async function copiar() {
    if (!resultado) return
    await navigator.clipboard.writeText(resultado.texto)
    toast.success('Texto copiado para a área de transferência')
  }

  const apSelecionado = apartamentos.find(a => a.id === apId)

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center gap-2">
        <Select
          value={String(apId)}
          onValueChange={(v: string | null) => { if (v) setApId(Number(v)) }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue>
              {apSelecionado?.codigo ?? <span className="text-muted-foreground">Apartamento</span>}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {apartamentos.map(a => (
              <SelectItem key={a.id} value={String(a.id)}>{a.codigo}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={gerar} disabled={loading || apartamentos.length === 0}>
          {loading ? 'A gerar…' : 'Gerar'}
        </Button>
      </div>

      {erro && <p className="text-sm text-destructive">{erro}</p>}

      {resultado && (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          {resultado.origem === 'template' && (
            <p className="flex items-center gap-1.5 text-xs text-amber-600">
              <TriangleAlert className="h-3.5 w-3.5" />
              Gerado por template (LLM indisponível).
            </p>
          )}
          <p className="whitespace-pre-wrap leading-relaxed">{resultado.texto}</p>
          <Button variant="outline" size="sm" onClick={copiar}>
            <Copy className="h-4 w-4" />
            Copiar
          </Button>
        </div>
      )}
    </div>
  )
}
