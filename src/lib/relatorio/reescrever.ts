import type { LLMProvider } from '@/lib/llm/provider'

// Notas de obra são escritas depressa, no telemóvel, em campo — abreviadas,
// sem pontuação, às vezes só 2-3 palavras. O LLM percebe o que querem dizer
// e devolve-as como frase curta e clara, sem inventar nada.
const SYSTEM = `Reescreves notas curtas de obra (defeitos por reparar e observações de campo) em português europeu, tornando-as claras e bem escritas, mantendo exatamente o mesmo significado.

Regras:
1. Nunca inventes factos, números, materiais ou detalhes que não estejam na nota original.
2. Mantém a nota curta — uma frase, não um parágrafo.
3. Corrige gramática, ortografia e clareza, mas não mudas o sentido nem acrescentas informação.
4. Recebes uma lista numerada e devolves exatamente o mesmo número de linhas, na mesma ordem, cada uma no formato "N: texto reescrito" — sem títulos, sem comentários, sem mais nada.`

// Devolve as notas reescritas na mesma ordem; lança erro se a resposta não
// tiver exatamente uma linha válida por nota — o chamador (gerar.ts) usa
// sempre o texto original nesse caso, nunca falha o relatório por causa disto.
export async function reescreverNotas(textos: string[], provider: LLMProvider): Promise<string[]> {
  if (textos.length === 0) return []

  const user = textos.map((t, i) => `${i + 1}: ${t}`).join('\n')
  const resposta = await provider.generate(SYSTEM, user)

  const resultado: string[] = new Array(textos.length).fill('')
  for (const linha of resposta.split('\n')) {
    const m = linha.trim().match(/^(\d+):\s*(.+)$/)
    if (!m) continue
    const idx = Number(m[1]) - 1
    if (idx >= 0 && idx < textos.length) resultado[idx] = m[2].trim()
  }

  if (resultado.some(r => !r)) {
    throw new Error('Reescrita: resposta do LLM não tem uma linha válida por nota.')
  }
  return resultado
}
