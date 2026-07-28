import { describe, it, expect } from 'vitest'
import { gerarDeFactos } from '@/lib/relatorio/gerar'
import type { Facts } from '@/lib/relatorio/types'

const facts: Facts = {
  apartamento: 'AP1', progresso_pct: 39,
  pintura: [],
  pendentes: [{ divisao: 'Cozinha', categoria: 'eletrodomésticos', elemento: 'Eletrodomésticos', sub_elemento: null, notas: null }],
  observacoes: [],
}

describe('gerarDeFactos', () => {
  it('gera sempre pelo template, de forma determinística', () => {
    const r = gerarDeFactos(facts)
    expect(r.origem).toBe('template')
    expect(r.texto).toContain('AP1')
    expect(r.texto.toLowerCase()).toContain('eletrodomésticos')
  })
})
