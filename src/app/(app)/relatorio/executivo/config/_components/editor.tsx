'use client'

import { useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { previewRelatorioAction, gravarInstrucoesAction } from '@/app/actions/relatorio'
import type { RelatorioResult } from '@/lib/relatorio/types'

interface Apartamento {
  id: number
  codigo: string
}

interface Props {
  instrucoesIniciais: string
  apartamentos: Apartamento[]
}

export function Editor({ instrucoesIniciais, apartamentos }: Props) {
  const [texto, setTexto] = useState(instrucoesIniciais)
  const [apId, setApId] = useState<number>(apartamentos[0]?.id ?? 1)
  const [preview, setPreview] = useState<RelatorioResult | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const apSelecionado = apartamentos.find(a => a.id === apId)

  async function preVisualizar() {
    setBusy(true)
    setErro(null)
    const r = await previewRelatorioAction(apId, texto)
    if (r.success) setPreview(r.data)
    else setErro(r.error)
    setBusy(false)
  }

  async function gravar() {
    setBusy(true)
    setErro(null)
    const r = await gravarInstrucoesAction(texto)
    if (r.success) toast.success('Instruções gravadas.')
    else { setErro(r.error); toast.error(r.error) }
    setBusy(false)
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <Textarea
        className="min-h-[200px] font-mono text-sm"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Instruções adicionais (ex.: 'Começa sempre pelo que falta que é visível ao cliente.')"
      />

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

        <Button
          variant="outline"
          onClick={preVisualizar}
          disabled={busy || apartamentos.length === 0}
        >
          {busy ? 'A gerar…' : 'Pré-visualizar'}
        </Button>

        <Button onClick={gravar} disabled={busy}>
          Gravar
        </Button>
      </div>

      {erro && <p className="text-sm text-destructive">{erro}</p>}

      {preview && (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          {preview.origem === 'template' && (
            <p className="flex items-center gap-1.5 text-xs text-amber-600">
              <TriangleAlert className="h-3.5 w-3.5" />
              Gerado por template (LLM indisponível).
            </p>
          )}
          <p className="whitespace-pre-wrap leading-relaxed">{preview.texto}</p>
        </div>
      )}
    </div>
  )
}
