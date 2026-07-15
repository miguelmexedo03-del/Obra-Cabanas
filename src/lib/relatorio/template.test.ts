import { describe, it, expect } from 'vitest'
import { renderTemplate } from '@/lib/relatorio/template'
import type { Facts } from '@/lib/relatorio/types'

const facts: Facts = {
  apartamento: 'AP1',
  progresso_pct: 39,
  pintura: [
    { divisao: 'Cozinha', superficie: 'teto', estado: 'pintura' },
    { divisao: 'Sala', superficie: 'parede', estado: 'ultima_demao' },
  ],
  pendentes: [
    { divisao: 'Cozinha', categoria: 'eletrodomésticos', elemento: 'Eletrodomésticos', sub_elemento: null, notas: null },
    { divisao: 'Suite 1', categoria: 'defeito', elemento: 'Paredes', sub_elemento: 'Buraco na parede', notas: null },
  ],
}

describe('renderTemplate', () => {
  const txt = renderTemplate(facts)
  it('começa com o AP e o progresso', () => {
    expect(txt).toContain('AP1')
    expect(txt).toContain('39%')
  })
  it('menciona pintura e última demão', () => {
    expect(txt.toLowerCase()).toContain('pintura')
    expect(txt.toLowerCase()).toContain('última demão')
  })
  it('lista categorias pendentes', () => {
    expect(txt.toLowerCase()).toContain('eletrodomésticos')
  })
  it('nunca fica vazio', () => {
    expect(txt.length).toBeGreaterThan(20)
  })
})
