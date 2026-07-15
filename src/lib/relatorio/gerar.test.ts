import { describe, it, expect } from 'vitest'
import { gerarDeFactos } from '@/lib/relatorio/gerar'
import type { Facts } from '@/lib/relatorio/types'
import type { LLMProvider } from '@/lib/llm/provider'

const facts: Facts = {
  apartamento: 'AP1', progresso_pct: 39,
  pintura: [], pendentes: [{ divisao: 'Cozinha', categoria: 'eletrodomésticos', elemento: 'Eletrodomésticos', sub_elemento: null, notas: null }],
}

const ok: LLMProvider = { generate: async () => 'Prosa do LLM.' }
const falha: LLMProvider = { generate: async () => { throw new Error('quota') } }

describe('gerarDeFactos', () => {
  it('usa o LLM quando funciona', async () => {
    const r = await gerarDeFactos(facts, '', ok)
    expect(r.origem).toBe('llm')
    expect(r.texto).toBe('Prosa do LLM.')
  })
  it('cai no template quando o LLM falha', async () => {
    const r = await gerarDeFactos(facts, '', falha)
    expect(r.origem).toBe('template')
    expect(r.texto).toContain('AP1')
  })
})
