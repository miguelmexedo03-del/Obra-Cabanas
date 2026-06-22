import Link from 'next/link'
import { ChevronLeft, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  ap: { id: number; codigo: string }
  geradoEm: string
  ultimaAlteracao: string | null
  totalEmFalta: number
  totalObservacao: number
}

export function RelatorioHeader({
  ap, geradoEm, ultimaAlteracao, totalEmFalta, totalObservacao,
}: Props) {
  return (
    <div className="rounded-lg border bg-card p-5 flex items-start justify-between gap-4
      print:border-gray-300 print:shadow-none">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{ap.codigo} — Cabanas</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gerado em <strong>{geradoEm}</strong>
          {ultimaAlteracao && (
            <> · Última alteração na checklist: <strong>{ultimaAlteracao}</strong></>
          )}
        </p>
        <div className="flex gap-6 mt-3">
          <div>
            <p className="text-2xl font-bold text-red-500">{totalEmFalta}</p>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">
              Em falta
            </p>
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-600">{totalObservacao}</p>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">
              Feitos com observação
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 shrink-0 print:hidden">
        <Button variant="outline" size="sm" render={<Link href={`/apartamentos/${ap.id}`} />} nativeButton={false}>
          <ChevronLeft className="h-4 w-4" />
          Voltar
        </Button>
        <Button size="sm" render={<a href={`/relatorio?ap=${ap.id}&print=1`} target="_blank" rel="noopener noreferrer" />} nativeButton={false}>
          <Printer className="h-4 w-4" />
          Exportar PDF
        </Button>
      </div>
    </div>
  )
}
