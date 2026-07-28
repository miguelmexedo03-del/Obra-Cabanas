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
    { divisao: 'WC(Suite 1)', categoria: 'equipamentos de WC', elemento: 'Sanita', sub_elemento: null, notas: null },
    { divisao: 'WC (Suite 2)', categoria: 'equipamentos de WC', elemento: 'Lavatório', sub_elemento: null, notas: null },
    { divisao: 'Varanda', categoria: 'pladur e pedra', elemento: 'Paredes', sub_elemento: 'Pedra da fachada', notas: null },
    { divisao: 'Suite 1', categoria: 'defeito', elemento: 'Paredes', sub_elemento: 'Buraco na parede', notas: null },
  ],
  observacoes: [
    { divisao: 'Cozinha', elemento: 'Bancada', texto: 'falta selar o encontro com a parede' },
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
  it('nunca fica vazio', () => {
    expect(txt.length).toBeGreaterThan(20)
  })
  it('escreve em prosa, um parágrafo por secção, sem bullets', () => {
    expect(txt).toContain('Eletrodomésticos: falta na cozinha.')
    expect(txt).not.toContain('- ')
  })
  it('generaliza divisões do mesmo tipo sem itens a preservar ("nos dois WCs")', () => {
    expect(txt).toContain('Equipamentos de WC: falta nos dois WCs.')
  })
  it('nunca generaliza um item com detalhe específico (sub_elemento/notas)', () => {
    expect(txt).toContain('Pladur e pedra: falta na Varanda (Pedra da fachada).')
    expect(txt).toContain('A registar: na Suite 1 (Buraco na parede).')
  })
  it('inclui observações escritas, com a divisão e o elemento', () => {
    expect(txt).toContain('Observações —')
    expect(txt).toContain('na Cozinha (Bancada)')
    expect(txt).toContain('Falta selar o encontro com a parede')
  })
  it('omite o parágrafo de observações quando não há nenhuma', () => {
    const semObs = renderTemplate({ ...facts, observacoes: [] })
    expect(semObs).not.toContain('Observações —')
  })
})
