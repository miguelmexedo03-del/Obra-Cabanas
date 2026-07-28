import { tipoDivisao, type TipoDivisao } from '@/lib/utils'
import type { Facts, PinturaFacto, PendenteItem } from '@/lib/relatorio/types'

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

// Só maiúscula a primeira letra, sem forçar pontuação final — para frases
// que ainda vão continuar (ex.: antes de " — elemento: ...").
function comMaiuscula(s: string): string {
  const t = s.trim()
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t
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
// detalhe (sub_elemento/notas) não pode ser generalizado — ver fraseLocais.
function comPreposicao(nome: string): string {
  return `${prepSingular(tipoDivisao(nome), nome)} ${nome}`
}

// Frase de localização a partir de uma lista de itens: divisões "simples"
// (sem sub_elemento nem notas) generalizam-se por tipo de compartimento;
// qualquer item com detalhe próprio (sub_elemento ou notas) fica sempre
// nomeado individualmente, para nunca se perder informação importante ao
// generalizar — é a única exceção deliberada à regra de generalizar sempre.
function fraseLocais(items: PendenteItem[]): string {
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

function fraseePintura(pintura: PinturaFacto[]): string {
  if (pintura.length === 0) return ''
  const completa = agruparPorTipo(pintura.filter(p => p.estado === 'pintura').map(p => p.divisao))
  const ultima = agruparPorTipo(pintura.filter(p => p.estado === 'ultima_demao').map(p => p.divisao))
  const partes: string[] = []
  if (completa.length) partes.push(`falta pintura ${listaNatural(completa)}`)
  if (ultima.length) partes.push(`falta a última demão ${listaNatural(ultima)}`)
  return capitalizar(partes.join('; '))
}

function fraseMoveis(quarto: PendenteItem[], cozinha: PendenteItem[], wc: PendenteItem[]): string {
  const partes: string[] = []
  if (quarto.length) partes.push(fraseLocais(quarto))
  if (cozinha.length) partes.push(`${fraseLocais(cozinha)} (podem também faltar as portas)`)
  if (wc.length) partes.push(fraseLocais(wc))
  if (partes.length === 0) return ''
  return capitalizar(`móveis: faltam ${listaNatural(partes)}`)
}

function frasePladurPedra(items: PendenteItem[]): string {
  const pladur = items.filter(i => /pladur/i.test(i.sub_elemento ?? ''))
  const pedra = items.filter(i => /pedra/i.test(i.sub_elemento ?? '') && !/pladur/i.test(i.sub_elemento ?? ''))
  const outros = items.filter(i => !pladur.includes(i) && !pedra.includes(i))
  const partes: string[] = []
  if (pladur.length) partes.push(`pladur ${fraseLocais(pladur)}`)
  if (pedra.length) partes.push(`pedra ${fraseLocais(pedra)}`)
  if (outros.length) partes.push(fraseLocais(outros))
  if (partes.length === 0) return ''
  return capitalizar(`falta ainda ${listaNatural(partes)}`)
}

function fraseEquipamentosWC(items: PendenteItem[]): string {
  if (items.length === 0) return ''
  // O que falta pode não ser igual em todos os WCs (ex.: só falta a sanita
  // num, e lavatório+sanita+chuveiro noutro) — nunca juntar divisões numa
  // frase só se o conjunto de equipamento em falta for exatamente o mesmo,
  // para não dizer que falta algo num sítio onde já está feito. Um item com
  // nota própria fica sempre à parte, nunca resumido em "por completar".
  const semNota = items.filter(i => !i.notas)
  const comNota = items.filter(i => i.notas)

  // Agrupar por divisão → conjunto de elementos em falta; depois juntar as
  // divisões cujo conjunto é idêntico.
  const porDivisao = new Map<string, Set<string>>()
  for (const item of semNota) {
    const set = porDivisao.get(item.divisao) ?? new Set<string>()
    set.add(item.elemento.toLowerCase())
    porDivisao.set(item.divisao, set)
  }
  const porAssinatura = new Map<string, string[]>() // assinatura -> divisões
  for (const [divisao, elementos] of porDivisao) {
    const assinatura = [...elementos].sort().join('|')
    const arr = porAssinatura.get(assinatura) ?? []
    arr.push(divisao)
    porAssinatura.set(assinatura, arr)
  }

  // Só generaliza o nome da divisão ("nos dois WCs") quando TODAS têm
  // exatamente o mesmo equipamento em falta — caso contrário nomeia cada
  // uma (senão "o WC" fica ambíguo entre WCs com necessidades diferentes).
  const generalizavel = porAssinatura.size === 1

  const partes: string[] = []
  for (const [assinatura, divisoes] of porAssinatura) {
    const sujeito = generalizavel
      ? agruparPorTipo(divisoes).join(' e ')
      : listaNatural(divisoes.map(comPreposicao))
    const verbo = divisoes.length === 1 ? 'está' : 'estão'
    partes.push(`${sujeito} ${verbo} por completar — ${listaNatural(assinatura.split('|'))}`)
  }
  if (comNota.length) partes.push(fraseLocais(comNota))
  return capitalizar(partes.join('; '))
}

function fraseSimples(abertura: string, items: PendenteItem[]): string {
  if (items.length === 0) return ''
  return capitalizar(`${abertura} ${fraseLocais(items)}`)
}

// Gerador determinístico e único do relatório — sem LLM (o LLM não garantia
// a mesma estrutura duas vezes, mesmo com as mesmas instruções). Escreve em
// prosa natural, mas em vários parágrafos — um por tópico, não tudo num só
// bloco corrido — sempre na mesma ordem e com as mesmas regras (spec §5):
// generaliza por tipo de compartimento ("nos dois WCs", "nas duas suites")
// exceto quando há um detalhe específico a preservar (sub_elemento/notas —
// nunca se perde informação ao generalizar). Pintura, chão e rodapé, portas
// e aros, móveis (com nota de portas em falta na cozinha), pladur e pedra,
// equipamentos de WC, eletrodomésticos, ar condicionado, bomba de calor,
// defeitos ("a registar") e, por fim, observações escritas na checklist —
// nunca omitido se existir. Remendos e tratamento de juntas nunca chegam
// aqui (categorizarItem já os exclui — ver categorize.ts).
export function renderTemplate(facts: Facts): string {
  const frases: string[] = [`${facts.apartamento} — ${facts.progresso_pct}% concluído.`]

  const pintura = fraseePintura(facts.pintura)
  if (pintura) frases.push(pintura)

  const por = (categoria: string) => facts.pendentes.filter(p => p.categoria === categoria)

  const chao = fraseSimples('Chão e rodapé: falta', por('chão e rodapé'))
  if (chao) frases.push(chao)

  const portas = fraseSimples('Faltam as portas e aros', por('portas e aros'))
  if (portas) frases.push(portas)

  const moveis = fraseMoveis(por('móveis de quarto'), por('móveis de cozinha'), por('móveis de WC'))
  if (moveis) frases.push(moveis)

  const pladurPedra = frasePladurPedra(por('pladur e pedra'))
  if (pladurPedra) frases.push(pladurPedra)

  const equipWC = fraseEquipamentosWC(por('equipamentos de WC'))
  if (equipWC) frases.push(equipWC)

  const eletro = fraseSimples('Faltam os eletrodomésticos', por('eletrodomésticos'))
  if (eletro) frases.push(eletro)

  const ac = fraseSimples('Falta o ar condicionado', por('ar condicionado'))
  if (ac) frases.push(ac)

  const bombaCalor = fraseSimples('Falta a bomba de calor', por('bomba de calor'))
  if (bombaCalor) frases.push(bombaCalor)

  const outros = por('outros')
  if (outros.length) frases.push(capitalizar(`falta ainda ${fraseLocais(outros)}`))

  const defeitos = por('defeito')
  if (defeitos.length) frases.push(`A registar: ${fraseLocais(defeitos)}.`)

  if (facts.observacoes.length > 0) {
    // Cada observação é a sua própria frase (local — elemento: texto.), não um
    // item de lista separado por vírgulas — lê-se mal quando há várias.
    const obs = facts.observacoes.map(o => {
      const local = comMaiuscula(comPreposicao(o.divisao))
      const contexto = o.elemento ? ` — ${o.elemento}` : ''
      return `${local}${contexto}: ${capitalizar(o.texto)}`
    })
    frases.push(`Observações: ${obs.join(' ')}`)
  }

  return frases.join('\n\n')
}
