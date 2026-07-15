import { describe, it, expect, vi } from 'vitest'
import { GeminiProvider } from '@/lib/llm/gemini'

describe('GeminiProvider', () => {
  it('extrai o texto da resposta da API', async () => {
    const fakeFetch = vi.fn(async () => new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: 'Parágrafo gerado.' }] } }],
    }), { status: 200 }))
    const p = new GeminiProvider('KEY', 'gemini-2.5-flash-lite', fakeFetch)
    const out = await p.generate('sys', 'usr')
    expect(out).toBe('Parágrafo gerado.')
    expect(fakeFetch).toHaveBeenCalledOnce()
  })

  it('lança em erro HTTP (para o orquestrador cair no template)', async () => {
    const fakeFetch = vi.fn(async () => new Response('quota', { status: 429 }))
    const p = new GeminiProvider('KEY', 'gemini-2.5-flash-lite', fakeFetch)
    await expect(p.generate('sys', 'usr')).rejects.toThrow()
  })
})
