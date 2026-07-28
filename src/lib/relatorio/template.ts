import type { Facts, PinturaFacto } from '@/lib/relatorio/types'

const ORDEM_CATEGORIAS = [
  'chão e rodapé', 'portas e aros', 'móveis de quarto', 'móveis de cozinha',
  'móveis de WC', 'pladur e pedra', 'equipamentos de WC', 'eletrodomésticos',
  'ar condicionado', 'bomba de calor', 'defeito', 'outros',
]

// Fallback determinístico. Sem LLM: organiza por tópicos (pintura, depois cada
// categoria pendente) com bullet points por divisão, em vez de prosa corrida.
export function renderTemplate(facts: Facts): string {
  const linhas: string[] = [`${facts.apartamento} — ${facts.progresso_pct}% concluído.`]

  const pinturaCompleta = facts.pintura.filter(p => p.estado === 'pintura').map(p => `${p.divisao} (${p.superficie})`)
  const ultimaDemao = facts.pintura.filter(p => p.estado === 'ultima_demao').map(p => `${p.divisao} (${p.superficie})`)
  if (pinturaCompleta.length || ultimaDemao.length) {
    linhas.push('', 'Pintura:')
    for (const d of pinturaCompleta) linhas.push(`- Falta pintura em ${d}.`)
    for (const d of ultimaDemao) linhas.push(`- Falta a última demão em ${d}.`)
  }

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
    linhas.push('', `${label}:`)
    for (const d of divs) linhas.push(`- ${d}`)
  }

  return linhas.join('\n')
}
