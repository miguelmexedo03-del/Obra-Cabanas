import type { Facts, PinturaFacto } from '@/lib/relatorio/types'

// Ordem fixa das secções (spec §5 regra 6) — nunca varia entre relatórios.
// Om itir uma categoria sem itens é a única coisa que muda de relatório para relatório.
const ORDEM_CATEGORIAS = [
  'chão e rodapé', 'portas e aros', 'móveis de quarto', 'móveis de cozinha', 'móveis de WC',
  'pladur e pedra', 'equipamentos de WC', 'eletrodomésticos',
  'ar condicionado', 'bomba de calor', 'defeito', 'outros',
]

const LABEL_CATEGORIA: Record<string, string> = {
  'chão e rodapé': 'Chão e rodapé',
  'portas e aros': 'Portas e aros',
  'móveis de quarto': 'Móveis de quarto',
  'móveis de cozinha': 'Móveis de cozinha (podem também faltar as portas)',
  'móveis de WC': 'Móveis de WC',
  'pladur e pedra': 'Pladur e pedra',
  'equipamentos de WC': 'Equipamentos de WC',
  'eletrodomésticos': 'Eletrodomésticos',
  'ar condicionado': 'Ar condicionado',
  'bomba de calor': 'Bomba de calor',
  defeito: 'A registar',
  outros: 'Outros',
}

function capitalizar(s: string): string {
  const t = s.trim()
  if (!t) return t
  const semPonto = t.charAt(0).toUpperCase() + t.slice(1)
  return /[.!?]$/.test(semPonto) ? semPonto : `${semPonto}.`
}

function bulletsPintura(pintura: PinturaFacto[]): string[] {
  const completa = pintura.filter(p => p.estado === 'pintura').map(p => `${p.divisao} (${p.superficie})`)
  const ultima = pintura.filter(p => p.estado === 'ultima_demao').map(p => `${p.divisao} (${p.superficie})`)
  return [
    ...completa.map(d => `- Falta pintura em ${d}.`),
    ...ultima.map(d => `- Falta a última demão em ${d}.`),
  ]
}

// Gerador determinístico e único do relatório — sem LLM. Segue sempre a
// mesma estrutura (secções fixas, bullet points por divisão) para que
// todos os relatórios da obra tenham o mesmo formato visual; só o
// conteúdo (o que falta em cada AP) muda. Ver spec §5 para as regras de
// conteúdo (pintura, móveis, chão e rodapé, defeitos, ordem das secções);
// remendos e tratamento de juntas nunca chegam aqui (categorizarItem já
// os omite — ver categorize.ts).
export function renderTemplate(facts: Facts): string {
  const blocos: string[] = [`${facts.apartamento} — ${facts.progresso_pct}% concluído.`]

  const pintura = bulletsPintura(facts.pintura)
  if (pintura.length > 0) {
    blocos.push(['Pintura:', ...pintura].join('\n'))
  }

  const porCategoria = new Map<string, string[]>()
  for (const item of facts.pendentes) {
    const arr = porCategoria.get(item.categoria) ?? []
    let rotulo = item.sub_elemento ? `${item.divisao} (${item.sub_elemento})` : item.divisao
    if (item.notas) rotulo += ` — ${item.notas}`
    if (!arr.includes(rotulo)) arr.push(rotulo)
    porCategoria.set(item.categoria, arr)
  }

  const ordenadas = [...porCategoria.keys()].sort(
    (a, b) => ORDEM_CATEGORIAS.indexOf(a) - ORDEM_CATEGORIAS.indexOf(b),
  )
  for (const cat of ordenadas) {
    const divs = porCategoria.get(cat)!
    const label = LABEL_CATEGORIA[cat] ?? capitalizar(cat).replace(/\.$/, '')
    blocos.push([`${label}:`, ...divs.map(d => `- ${d}`)].join('\n'))
  }

  if (facts.observacoes.length > 0) {
    const linhas = facts.observacoes.map(
      o => `- ${o.divisao}${o.elemento ? ` (${o.elemento})` : ''}: ${capitalizar(o.texto)}`,
    )
    blocos.push(['Observações:', ...linhas].join('\n'))
  }

  return blocos.join('\n\n')
}
