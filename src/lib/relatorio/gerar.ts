import { composePrompt } from '@/lib/relatorio/prompt'
import { renderTemplate } from '@/lib/relatorio/template'
import type { Facts, RelatorioResult } from '@/lib/relatorio/types'
import type { LLMProvider } from '@/lib/llm/provider'

// Pipeline factos → prosa, com fallback determinístico. Nunca lança:
// se o LLM falhar, devolve o template. O `origem` diz sempre a proveniência.
export async function gerarDeFactos(
  facts: Facts,
  instrucoesExtra: string,
  provider: LLMProvider,
): Promise<RelatorioResult> {
  const { system, user } = composePrompt(facts, instrucoesExtra)
  try {
    const texto = await provider.generate(system, user)
    if (!texto.trim()) throw new Error('LLM devolveu vazio')
    return { apartamento: facts.apartamento, texto, origem: 'llm' }
  } catch {
    return { apartamento: facts.apartamento, texto: renderTemplate(facts), origem: 'template' }
  }
}
