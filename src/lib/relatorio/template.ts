import { tipoDivisao, type TipoDivisao } from '@/lib/utils'
import type { Facts, PinturaFacto, PendenteItem } from '@/lib/relatorio/types'

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

const NUM_MASC = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito']
const NUM_FEM = ['zero', 'uma', 'duas', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito']

function numPalavra(n: number, fem: boolean): string {
  const arr = fem ? NUM_FEM : NUM_MASC
  return arr[n] ?? String(n)
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

// "quarto" é masculino, "suite" é feminino — o resto do tipo é sempre singular
// por AP (só há uma cozinha, uma sala...), por isso nunca precisa de contagem.
function ehQuarto(nome: string): boolean {
  return /quarto/i.test(nome) && !/suite/i.test(nome)
}

// Contração "em" + artigo, para o tipo de divisão (singular).
function prepSingular(tipo: TipoDivisao, nome: string): 'no' | 'na' {
  switch (tipo) {
    case 'WC': return 'no'
    case 'Closet': return 'no'
    case 'Suites/Quartos': return ehQuarto(nome) ? 'no' : 'na'
    default: return 'na' // Cozinha, Sala, Varanda, Entrada
  }
}

// Descreve, já com a preposição contraída, um grupo de divisões do mesmo
// tipo em prosa generalizada (spec §5 regra 1: "nos dois WCs", "nas duas
// suites"...).
function fraseTipo(tipo: TipoDivisao, nomes: string[]): string {
  const n = nomes.length
  if (n === 1) return `${prepSingular(tipo, nomes[0])} ${fraseTipoSingular(tipo, nomes[0])}`

  switch (tipo) {
    case 'WC': return `nos ${numPalavra(n, false)} WCs`
    case 'Closet': return `nos ${numPalavra(n, false)} closets`
    case 'Suites/Quartos': {
      const quartos = nomes.every(ehQuarto)
      return quartos ? `nos ${numPalavra(n, false)} quartos` : `nas ${numPalavra(n, true)} suites`
    }
    default: return `${prepSingular(tipo, nomes[0])} ${fraseTipoSingular(tipo, nomes[0])}` // não deveria repetir-se, mas por segurança
  }
}

function fraseTipoSingular(tipo: TipoDivisao, nome: string): string {
  switch (tipo) {
    case 'WC': return 'WC'
    case 'Closet': return 'closet'
    case 'Suites/Quartos': return ehQuarto(nome) ? 'quarto' : 'suite'
    case 'Cozinha': return 'cozinha'
    case 'Sala': return 'sala'
    case 'Varanda': return 'varanda'
    case 'Entrada': return 'entrada'
    default: return nome
  }
}

// Agrupa divisões pelo tipo de compartimento e devolve a frase generalizada
// de cada grupo (já com "no"/"na" incluído), na ordem em que os tipos
// aparecem pela primeira vez.
function agruparPorTipo(nomes: string[]): string[] {
  const porTipo = new Map<TipoDivisao, string[]>()
  for (const nome of nomes) {
    const tipo = tipoDivisao(nome)
    const arr = porTipo.get(tipo) ?? []
    if (!arr.includes(nome)) arr.push(nome)
    porTipo.set(tipo, arr)
  }
  return [...porTipo.entries()].map(([tipo, ns]) => fraseTipo(tipo, ns))
}

// Uma divisão específica, com preposição contraída, para os casos em que o
// detalhe (sub_elemento/notas) não pode ser generalizado — ver fraseCategoria.
function comPreposicao(nome: string): string {
  return `${prepSingular(tipoDivisao(nome), nome)} ${nome}`
}

function fraseePintura(pintura: PinturaFacto[]): string {
  if (pintura.length === 0) return ''
  const completa = agruparPorTipo(pintura.filter(p => p.estado === 'pintura').map(p => p.divisao))
  const ultima = agruparPorTipo(pintura.filter(p => p.estado === 'ultima_demao').map(p => p.divisao))
  const partes: string[] = []
  if (completa.length) partes.push(`falta pintura ${listaNatural(completa)}`)
  if (ultima.length) partes.push(`falta a última demão ${listaNatural(ultima)}`)
  return capitalizar(partes.join('; '))
}

// Frase de uma categoria de pendentes: divisões "simples" (sem sub_elemento
// nem notas) generalizam-se por tipo de compartimento; qualquer item com
// detalhe próprio (sub_elemento ou notas) fica sempre nomeado
// individualmente, para nunca se perder informação importante ao
// generalizar (é a exceção deliberada à regra de generalizar sempre).
function fraseCategoria(items: PendenteItem[]): string {
  const simples: string[] = []
  const detalhados: string[] = []
  for (const item of items) {
    if (item.sub_elemento || item.notas) {
      let rotulo = item.sub_elemento ? `${comPreposicao(item.divisao)} (${item.sub_elemento})` : comPreposicao(item.divisao)
      if (item.notas) rotulo += ` — ${item.notas}`
      if (!detalhados.includes(rotulo)) detalhados.push(rotulo)
    } else if (!simples.includes(item.divisao)) {
      simples.push(item.divisao)
    }
  }
  return listaNatural([...agruparPorTipo(simples), ...detalhados])
}

// Gerador determinístico e único do relatório — sem LLM (o LLM não garantia
// a mesma estrutura duas vezes). Escreve sempre em prosa, um parágrafo por
// tópico, na mesma ordem e com as mesmas regras (spec §5): generaliza por
// tipo de compartimento (exceto quando há um detalhe específico a
// preservar — ver fraseCategoria), pintura, chão e rodapé, portas e aros,
// móveis (quarto/cozinha/WC — na cozinha podem faltar as portas), pladur e
// pedra, equipamentos de WC, eletrodomésticos, ar condicionado, bomba de
// calor, defeitos ("a registar") e, por fim, observações escritas na
// checklist. Nunca omite uma categoria com itens pendentes — só omite as
// que não têm nada por fazer. Remendos e tratamento de juntas nunca chegam
// aqui (categorizarItem já os exclui — ver categorize.ts).
export function renderTemplate(facts: Facts): string {
  const paragrafos: string[] = [`${facts.apartamento} — ${facts.progresso_pct}% concluído.`]

  const pintura = fraseePintura(facts.pintura)
  if (pintura) paragrafos.push(pintura)

  const porCategoria = new Map<string, PendenteItem[]>()
  for (const item of facts.pendentes) {
    const arr = porCategoria.get(item.categoria) ?? []
    arr.push(item)
    porCategoria.set(item.categoria, arr)
  }

  const ordenadas = [...porCategoria.keys()].sort(
    (a, b) => ORDEM_CATEGORIAS.indexOf(a) - ORDEM_CATEGORIAS.indexOf(b),
  )
  for (const cat of ordenadas) {
    const label = LABEL_CATEGORIA[cat] ?? capitalizar(cat).replace(/\.$/, '')
    const frase = fraseCategoria(porCategoria.get(cat)!)
    if (cat === 'defeito') {
      // Defeitos não são "falta X" — são um problema a assinalar, não uma instalação em falta.
      paragrafos.push(`${label}: ${frase}.`)
      continue
    }
    const nota = cat === 'móveis de cozinha' ? ' (podem também faltar as portas)' : ''
    paragrafos.push(`${label}: falta ${frase}${nota}.`)
  }

  if (facts.observacoes.length > 0) {
    const frases = facts.observacoes.map(o => {
      const local = o.elemento ? `${comPreposicao(o.divisao)} (${o.elemento})` : comPreposicao(o.divisao)
      return `${local}: ${capitalizar(o.texto)}`
    })
    paragrafos.push(`Observações — ${frases.join(' ')}`)
  }

  return paragrafos.join('\n\n')
}
