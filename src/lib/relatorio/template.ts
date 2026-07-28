import type { Facts, PinturaFacto } from '@/lib/relatorio/types'

// Ordem fixa das secções (spec §5 regra 6) — nunca varia entre relatórios.
// Omitir uma categoria sem itens é a única coisa que muda de relatório para relatório.
const ORDEM_CATEGORIAS = [
  'chão e rodapé', 'portas e aros', 'móveis de quarto', 'móveis de cozinha', 'móveis de WC',
  'pladur e pedra', 'equipamentos de WC', 'eletrodomésticos',
  'ar condicionado', 'bomba de calor', 'defeito', 'outros',
]

const LABEL_CATEGORIA: Record<string, string> = {
  'chão e rodapé': 'Chão e rodapé',
  'portas e aros': 'Portas e aros',
  'móveis de quarto': 'Móveis de quarto',
  'móveis de cozinha': 'Móveis de cozinha',
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

// Junta uma lista em prosa natural em português: "A, B e C".
function listaNatural(itens: string[]): string {
  if (itens.length === 0) return ''
  if (itens.length === 1) return itens[0]
  return `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`
}

function fraseePintura(pintura: PinturaFacto[]): string {
  if (pintura.length === 0) return ''
  const completa = pintura.filter(p => p.estado === 'pintura').map(p => `${p.divisao} (${p.superficie})`)
  const ultima = pintura.filter(p => p.estado === 'ultima_demao').map(p => `${p.divisao} (${p.superficie})`)
  const partes: string[] = []
  if (completa.length) partes.push(`falta pintura em ${listaNatural(completa)}`)
  if (ultima.length) partes.push(`falta a última demão em ${listaNatural(ultima)}`)
  return capitalizar(partes.join('; '))
}

// Gerador determinístico e único do relatório — sem LLM (o LLM não garantia
// a mesma estrutura duas vezes). Escreve sempre em prosa, um parágrafo por
// tópico, na mesma ordem e com as mesmas regras (spec §5): pintura, chão e
// rodapé, portas e aros, móveis (quarto/cozinha/WC — na cozinha podem faltar
// as portas), pladur e pedra, equipamentos de WC, eletrodomésticos, ar
// condicionado, bomba de calor, defeitos ("a registar") e, por fim,
// observações escritas na checklist. Nunca omite uma categoria com itens
// pendentes — só omite as que não têm nada por fazer. Remendos e
// tratamento de juntas nunca chegam aqui (categorizarItem já os exclui —
// ver categorize.ts).
export function renderTemplate(facts: Facts): string {
  const paragrafos: string[] = [`${facts.apartamento} — ${facts.progresso_pct}% concluído.`]

  const pintura = fraseePintura(facts.pintura)
  if (pintura) paragrafos.push(pintura)

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
    if (cat === 'defeito') {
      // Defeitos não são "falta X" — são um problema a assinalar, não uma instalação em falta.
      paragrafos.push(`${label}: ${listaNatural(divs)}.`)
      continue
    }
    const nota = cat === 'móveis de cozinha' ? ' (podem também faltar as portas)' : ''
    paragrafos.push(`${label}: falta em ${listaNatural(divs)}${nota}.`)
  }

  if (facts.observacoes.length > 0) {
    const frases = facts.observacoes.map(o => {
      const local = o.elemento ? `${o.divisao} (${o.elemento})` : o.divisao
      return `${local}: ${capitalizar(o.texto)}`
    })
    paragrafos.push(`Observações — ${frases.join(' ')}`)
  }

  return paragrafos.join('\n\n')
}
