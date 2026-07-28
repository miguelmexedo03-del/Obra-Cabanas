import { describe, it, expect, vi, beforeEach } from 'vitest'
import { gerarDeFactos } from '@/lib/relatorio/gerar'
import type { Facts } from '@/lib/relatorio/types'
import type { LLMProvider } from '@/lib/llm/provider'

const { getProvider } = vi.hoisted(() => ({ getProvider: vi.fn() }))
vi.mock('@/lib/llm', () => ({ getProvider }))

const facts: Facts = {
  apartamento: 'AP1', progresso_pct: 39,
  pintura: [],
  pendentes: [
    { divisao: 'Cozinha', categoria: 'eletrodomésticos', elemento: 'Eletrodomésticos', sub_elemento: null, notas: null },
    { divisao: 'Suite 1', categoria: 'defeito', elemento: 'Paredes', sub_elemento: null, notas: 'buraco parede reparar' },
  ],
  observacoes: [{ divisao: 'Cozinha', elemento: 'Bancada', texto: 'falta selar' }],
}

beforeEach(() => {
  getProvider.mockReset()
})

describe('gerarDeFactos', () => {
  it('usa sempre o template para a estrutura, mesmo sem defeitos/observações', async () => {
    getProvider.mockReturnValue(null)
    const semNotas: Facts = { ...facts, pendentes: [facts.pendentes[0]], observacoes: [] }
    const r = await gerarDeFactos(semNotas)
    expect(r.origem).toBe('template')
    expect(r.texto).toContain('AP1')
    expect(r.texto.toLowerCase()).toContain('eletrodomésticos')
  })

  it('sem LLM configurado, mantém o texto original das notas/observações', async () => {
    getProvider.mockReturnValue(null)
    const r = await gerarDeFactos(facts)
    expect(r.origem).toBe('template')
    expect(r.texto).toContain('buraco parede reparar')
    expect(r.texto).toContain('Falta selar')
  })

  it('com LLM disponível, substitui as notas/observações pela versão reescrita', async () => {
    const provider: LLMProvider = {
      generate: async (_system, user) => user
        .split('\n')
        .map(linha => linha.replace(/^(\d+): .+$/, '$1: Há um buraco na parede a reparar na suite.'))
        .join('\n'),
    }
    getProvider.mockReturnValue(provider)
    const r = await gerarDeFactos(facts)
    expect(r.origem).toBe('llm')
    expect(r.texto).toContain('Há um buraco na parede a reparar na suite.')
    expect(r.texto).not.toContain('buraco parede reparar')
  })

  it('se o LLM falhar ou devolver um formato inválido, cai sempre no texto original', async () => {
    const provider: LLMProvider = { generate: async () => { throw new Error('timeout') } }
    getProvider.mockReturnValue(provider)
    const r = await gerarDeFactos(facts)
    expect(r.origem).toBe('template')
    expect(r.texto).toContain('buraco parede reparar')
  })
})
