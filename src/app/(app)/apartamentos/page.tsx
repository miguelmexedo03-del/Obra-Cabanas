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

type Apartamento = { id: number; codigo: string; descricao: string | null; tipo: 'apartamento' | 'zona_comum' }

function ApartamentoCard({ ap, prog }: { ap: Apartamento; prog?: ProgressoRow }) {
  const pct = (prog?.percentagem ?? 0) * 100
  const concluidos = prog?.concluidos ?? 0
  const total = prog?.total ?? 0
  return (
    <Link
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
}

export default async function ApartamentosPage() {
  const supabase = await createClient()

  const [apResult, progResult] = await Promise.all([
    supabase.from('apartamentos').select('id, codigo, descricao, tipo').order('id'),
    supabase.from('progresso_por_apartamento').select('*'),
  ])

  const apartamentos = (apResult.data as Apartamento[] | null) ?? []
  const progressos = progResult.data as ProgressoRow[] | null
  const progressMap = new Map(progressos?.map(p => [p.apartamento_id, p]) ?? [])

  const unidades = apartamentos.filter(a => a.tipo === 'apartamento')
  const zonasComuns = apartamentos.filter(a => a.tipo === 'zona_comum')

  return (
    <div>
      <PageHeader
        title="Apartamentos"
        description={`${unidades.length} unidades em reabilitação`}
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
        {unidades.map(ap => (
          <ApartamentoCard key={ap.id} ap={ap} prog={progressMap.get(ap.id)} />
        ))}
      </div>

      {zonasComuns.length > 0 && (
        <>
          <h2 className="text-sm font-medium text-muted-foreground mt-8 mb-3">Zonas Comuns</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {zonasComuns.map(ap => (
              <ApartamentoCard key={ap.id} ap={ap} prog={progressMap.get(ap.id)} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
