import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { FileDown, PlusSquare } from 'lucide-react'

type ProgressoRow = {
  apartamento_id: number
  total: number
  concluidos: number
  percentagem: number
}

export default async function ApartamentosPage() {
  const supabase = await createClient()

  const [apResult, progResult] = await Promise.all([
    supabase.from('apartamentos').select('id, codigo, descricao').order('id'),
    supabase.from('progresso_por_apartamento').select('*'),
  ])

  const apartamentos = apResult.data as { id: number; codigo: string; descricao: string | null }[] | null
  const progressos = progResult.data as ProgressoRow[] | null
  const progressMap = new Map(progressos?.map(p => [p.apartamento_id, p]) ?? [])

  return (
    <div>
      <PageHeader
        title="Apartamentos"
        description="24 unidades em reabilitação"
        actions={
          <>
            <Button variant="outline" size="sm" render={<Link href="/gerir-itens" />} nativeButton={false}>
              <PlusSquare className="h-4 w-4" />
              Gerir Itens
            </Button>
            <Button variant="outline" size="sm" render={<Link href="/relatorio/selecionar" />} nativeButton={false}>
              <FileDown className="h-4 w-4" />
              Exportar relatórios
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {apartamentos?.map(ap => {
          const prog = progressMap.get(ap.id)
          const pct = (prog?.percentagem ?? 0) * 100
          const concluidos = prog?.concluidos ?? 0
          const total = prog?.total ?? 0

          return (
            <Link
              key={ap.id}
              href={`/apartamentos/${ap.id}`}
              className="rounded-lg border bg-card p-4 hover:border-ring transition-colors active:scale-[0.98]"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold">{ap.codigo}</span>
                <Badge variant="secondary">{Math.round(pct)}%</Badge>
              </div>
              <Progress value={pct} className="h-1.5" />
              <p className="text-xs text-muted-foreground mt-2">
                {concluidos}/{total} itens concluídos
              </p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
