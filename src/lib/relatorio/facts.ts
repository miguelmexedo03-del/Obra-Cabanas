import { createClient } from '@/lib/supabase/server'
import { classifyPintura } from '@/lib/relatorio/classify'
import { categorizarItem } from '@/lib/relatorio/categorize'
import type { Facts, PinturaFacto, PendenteItem } from '@/lib/relatorio/types'

export interface RawRow {
  divisao: string
  fase: string
  elemento: string
  sub_elemento: string | null
  notas: string | null
}

const FASES_PINTURA = new Set(['Pintura Teto', 'Pintura Paredes'])

// Pura: transforma linhas de elementos pendentes nos factos que o LLM recebe.
export function buildFacts(apartamento: string, progressoPct: number, rows: RawRow[]): Facts {
  // 1) Pintura — agrupar demãos pendentes por (divisão, superfície) e classificar
  const coats = new Map<string, string[]>() // chave `${divisao}||${superficie}`
  for (const r of rows) {
    if (!FASES_PINTURA.has(r.fase)) continue
    const superficie = r.fase === 'Pintura Teto' ? 'teto' : 'parede'
    const key = `${r.divisao}||${superficie}`
    const arr = coats.get(key) ?? []
    if (r.sub_elemento) arr.push(r.sub_elemento)
    coats.set(key, arr)
  }
  const pintura: PinturaFacto[] = []
  for (const [key, pending] of coats) {
    const [divisao, superficie] = key.split('||') as [string, 'teto' | 'parede']
    const estado = classifyPintura(pending)
    if (estado !== 'ok') pintura.push({ divisao, superficie, estado })
  }

  // 2) Restantes itens — categorizar; null = omitir (prep de pintura)
  const pendentes: PendenteItem[] = []
  for (const r of rows) {
    if (FASES_PINTURA.has(r.fase)) continue
    const categoria = categorizarItem(r.fase, r.elemento, r.sub_elemento, r.divisao)
    if (categoria === null) continue
    pendentes.push({
      divisao: r.divisao,
      categoria,
      elemento: r.elemento,
      sub_elemento: r.sub_elemento,
      notas: r.notas,
    })
  }

  return { apartamento, progresso_pct: progressoPct, pintura, pendentes }
}

// Tipo da linha devolvida por `elementos.select(...)` com as relações
// fases/divisoes embutidas — segue o mesmo padrão de
// `src/app/(app)/relatorio/_components/relatorio-divisao.tsx` (ElementoRelatorio):
// FK many-to-one → objeto único (não array) tipado manualmente e usado com `as`
// sobre o resultado do Supabase (ver nota no brief da Task 5 sobre o cast).
type ElementoPendenteRow = {
  elemento: string
  sub_elemento: string | null
  notas: string | null
  fases: { nome: string } | null
  divisoes: { nome: string } | null
}

// Query: lê progresso + itens pendentes do AP e devolve os factos.
export async function getFacts(apartamentoId: number): Promise<Facts> {
  const supabase = await createClient()

  const [{ data: apRow }, { data: progRow }, { data: elementos }] = await Promise.all([
    supabase.from('apartamentos').select('codigo').eq('id', apartamentoId).single(),
    supabase.from('progresso_por_apartamento').select('percentagem').eq('apartamento_id', apartamentoId).single(),
    supabase
      .from('elementos')
      .select('elemento, sub_elemento, notas, fases(nome), divisoes(nome)')
      .eq('apartamento_id', apartamentoId)
      .eq('concluido', false),
  ])

  const codigo = apRow?.codigo ?? `AP${apartamentoId}`
  const progressoPct = Math.round((progRow?.percentagem ?? 0) * 100)

  const rows: RawRow[] = ((elementos ?? []) as ElementoPendenteRow[]).map((e) => ({
    divisao: e.divisoes?.nome ?? 'Sem divisão',
    fase: e.fases?.nome ?? '',
    elemento: e.elemento,
    sub_elemento: e.sub_elemento,
    notas: e.notas,
  }))

  return buildFacts(codigo, progressoPct, rows)
}
