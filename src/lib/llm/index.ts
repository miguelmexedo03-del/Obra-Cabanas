import type { LLMProvider } from '@/lib/llm/provider'
import { GeminiProvider } from '@/lib/llm/gemini'

// null (não string vazia) quando não há chave — o chamador trata a reescrita
// como um extra opcional, nunca um requisito (ver reescrever.ts).
export function getProvider(): LLMProvider | null {
  const apiKey = process.env.LLM_API_KEY
  if (!apiKey) return null

  const provider = process.env.LLM_PROVIDER ?? 'gemini'
  const model = process.env.LLM_MODEL ?? 'gemini-flash-lite-latest'

  switch (provider) {
    case 'gemini':
      return new GeminiProvider(apiKey, model)
    default:
      return null
  }
}
