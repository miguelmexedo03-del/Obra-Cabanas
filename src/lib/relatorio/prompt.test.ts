import { describe, it, expect } from 'vitest'
import { composePrompt, DEFAULT_RULES } from '@/lib/relatorio/prompt'
import type { Facts } from '@/lib/relatorio/types'

const facts: Facts = {
  apartamento: 'AP1',
  progresso_pct: 39,
  pintura: [{ divisao: 'Cozinha', superficie: 'teto', estado: 'pintura' }],
  pendentes: [{ divisao: 'Cozinha', categoria: 'eletrodomésticos', elemento: 'Eletrodomésticos', sub_elemento: null, notas: null }],
}

describe('composePrompt', () => {
  it('inclui as regras default no system', () => {
    const { system } = composePrompt(facts, '')
    expect(system).toContain(DEFAULT_RULES)
  })
  it('soma as instruções extra quando existem', () => {
    const { system } = composePrompt(facts, 'Escreve em maiúsculas.')
    expect(system).toContain('Escreve em maiúsculas.')
  })
  it('mete os factos como JSON no user', () => {
    const { user } = composePrompt(facts, '')
    expect(user).toContain('"progresso_pct": 39')
    expect(user).toContain('AP1')
  })
})
