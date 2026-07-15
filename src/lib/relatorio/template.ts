import type { Facts, PinturaFacto } from '@/lib/relatorio/types'

const ORDEM_CATEGORIAS = [
  'chão e rodapé', 'portas e aros', 'móveis de quarto', 'móveis de cozinha',
  'móveis de WC', 'pladur e pedra', 'equipamentos de WC', 'eletrodomésticos',
  'ar condicionado', 'bomba de calor', 'defeito', 'outros',
]

function frasePintura(pintura: PinturaFacto[]): string {
  if (pintura.length === 0) return ''
  const completa = pintura.filter(p => p.estado === 'pintura').map(p => `${p.divisao} (${p.superficie})`)
  const ultima = pintura.filter(p => p.estado === 'ultima_demao').map(p => `${p.divisao} (${p.superficie})`)
  const partes: string[] = []
  if (completa.length) partes.push(`falta pintura em ${completa.join(', ')}`)
  if (ultima.length) partes.push(`falta a última demão em ${ultima.join(', ')}`)
  return partes.join('; ')
}

// Fallback determinístico. Sem LLM: agrupa por categoria e enumera divisões.
export function renderTemplate(facts: Facts): string {
  const frases: string[] = [`${facts.apartamento} — ${facts.progresso_pct}% concluído.`]

  const p = frasePintura(facts.pintura)
  if (p) frases.push(p.charAt(0).toUpperCase() + p.slice(1) + '.')

  const porCategoria = new Map<string, string[]>()
  for (const item of facts.pendentes) {
    const arr = porCategoria.get(item.categoria) ?? []
    const rotulo = item.sub_elemento ? `${item.divisao} (${item.sub_elemento})` : item.divisao
    if (!arr.includes(rotulo)) arr.push(rotulo)
    porCategoria.set(item.categoria, arr)
  }

  const ordenadas = [...porCategoria.keys()].sort(
    (a, b) => ORDEM_CATEGORIAS.indexOf(a) - ORDEM_CATEGORIAS.indexOf(b),
  )
  for (const cat of ordenadas) {
    const divs = porCategoria.get(cat)!
    const label = cat === 'defeito' ? 'A registar' : cat.charAt(0).toUpperCase() + cat.slice(1)
    frases.push(`${label}: ${divs.join(', ')}.`)
  }

  return frases.join(' ')
}
