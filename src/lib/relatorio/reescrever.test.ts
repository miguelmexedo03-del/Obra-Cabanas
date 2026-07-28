import { describe, it, expect } from 'vitest'
import { reescreverNotas } from '@/lib/relatorio/reescrever'
import type { LLMProvider } from '@/lib/llm/provider'

describe('reescreverNotas', () => {
  it('devolve array vazio sem chamar o provider quando não há textos', async () => {
    const provider: LLMProvider = { generate: async () => { throw new Error('não devia ser chamado') } }
    expect(await reescreverNotas([], provider)).toEqual([])
  })

  it('mapeia a resposta "N: texto" de volta para a mesma ordem/posição', async () => {
    const provider: LLMProvider = {
      generate: async () => '2: Falta selar a bancada junto à parede.\n1: Há um buraco na parede a reparar.',
    }
    const r = await reescreverNotas(['buraco parede', 'selar bancada'], provider)
    expect(r).toEqual([
      'Há um buraco na parede a reparar.',
      'Falta selar a bancada junto à parede.',
    ])
  })

  it('lança erro se faltar alguma linha na resposta (o chamador cai no texto original)', async () => {
    const provider: LLMProvider = { generate: async () => '1: Só esta.' }
    await expect(reescreverNotas(['a', 'b'], provider)).rejects.toThrow()
  })
})
