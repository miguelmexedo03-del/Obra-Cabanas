import { renderTemplate } from '@/lib/relatorio/template'
import { getProvider } from '@/lib/llm'
import { reescreverNotas } from '@/lib/relatorio/reescrever'
import type { Facts, RelatorioResult } from '@/lib/relatorio/types'

// A estrutura do relatório é sempre determinística (renderTemplate) — isso
// nunca depende de LLM. O que o LLM faz aqui, quando disponível, é só
// reescrever as notas de defeitos ("a registar") e as observações escritas,
// que o Miguel escreve depressa em campo e ficam abreviadas — para
// aparecerem no relatório como frase clara, com o mesmo significado. Se o
// LLM não estiver configurado, falhar ou devolver algo no formato errado,
// usa-se sempre o texto original tal como foi escrito — o relatório nunca
// falha nem muda de estrutura por causa disto.
export async function gerarDeFactos(facts: Facts): Promise<RelatorioResult> {
  const provider = getProvider()

  const defeitosComNota = facts.pendentes
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p.categoria === 'defeito' && p.notas)
  const notasOriginais = defeitosComNota.map(({ p }) => p.notas as string)
  const obsOriginais = facts.observacoes.map(o => o.texto)
  const todasOriginais = [...notasOriginais, ...obsOriginais]

  if (!provider || todasOriginais.length === 0) {
    return { apartamento: facts.apartamento, texto: renderTemplate(facts), origem: 'template' }
  }

  try {
    const reescritas = await reescreverNotas(todasOriginais, provider)
    const notasReescritas = reescritas.slice(0, notasOriginais.length)
    const obsReescritas = reescritas.slice(notasOriginais.length)

    const pendentes = facts.pendentes.map(p => ({ ...p }))
    defeitosComNota.forEach(({ i }, k) => { pendentes[i].notas = notasReescritas[k] })
    const observacoes = facts.observacoes.map((o, i) => ({ ...o, texto: obsReescritas[i] }))

    const factsReescritos: Facts = { ...facts, pendentes, observacoes }
    return { apartamento: facts.apartamento, texto: renderTemplate(factsReescritos), origem: 'llm' }
  } catch {
    return { apartamento: facts.apartamento, texto: renderTemplate(facts), origem: 'template' }
  }
}
