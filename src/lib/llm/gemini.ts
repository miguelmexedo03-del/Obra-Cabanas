import type { LLMProvider, FetchImpl } from '@/lib/llm/provider'

// Chama a API Gemini via REST (sem SDK). system+user via um único prompt.
export class GeminiProvider implements LLMProvider {
  constructor(
    private apiKey: string,
    private model: string,
    private fetchImpl: FetchImpl = fetch,
  ) {}

  async generate(system: string, user: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`
    const body = {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: { temperature: 0.4 },
    }
    const res = await this.fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`)
    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[]
    }
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) throw new Error('Gemini: resposta sem texto')
    return text.trim()
  }
}
