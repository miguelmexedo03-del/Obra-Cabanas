import type { LLMProvider } from '@/lib/llm/provider'
import { GeminiProvider } from '@/lib/llm/gemini'

// Factory agnóstica: o fornecedor é uma env var. Trocar de fornecedor = mudar
// LLM_PROVIDER/LLM_API_KEY no Vercel, zero código (spec §6).
export function getProvider(): LLMProvider {
  const provider = process.env.LLM_PROVIDER ?? 'gemini'
  const apiKey = process.env.LLM_API_KEY ?? ''
  // Alias que aponta sempre para a flash-lite atual — evita "model no longer available"
  // quando a Google descontinua versões numeradas (ex.: 2.5-flash-lite p/ contas novas).
  const model = process.env.LLM_MODEL ?? 'gemini-flash-lite-latest'

  switch (provider) {
    case 'gemini':
      return new GeminiProvider(apiKey, model)
    default:
      throw new Error(`LLM_PROVIDER desconhecido: ${provider}`)
  }
}
