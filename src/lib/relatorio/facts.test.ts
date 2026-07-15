import { describe, it, expect } from 'vitest'
import { buildFacts, type RawRow } from '@/lib/relatorio/facts'

const rows: RawRow[] = [
  // Pintura Teto — Sala: só 2ª demão pendente → ultima_demao
  { divisao: 'Sala', fase: 'Pintura Teto', elemento: 'Teto', sub_elemento: '2ª demão', notas: null },
  // Pintura Teto — Cozinha: 1ª demão + 2ª demão → pintura
  { divisao: 'Cozinha', fase: 'Pintura Teto', elemento: 'Teto', sub_elemento: '1ª demão', notas: null },
  { divisao: 'Cozinha', fase: 'Pintura Teto', elemento: 'Teto', sub_elemento: '2ª demão', notas: null },
  // Prep de pintura — omitida
  { divisao: 'Sala', fase: 'Teto', elemento: 'Teto', sub_elemento: 'Tratamento de Junta', notas: null },
  { divisao: 'Sala', fase: 'Remendos Teto', elemento: 'Teto', sub_elemento: 'Remendo foco', notas: null },
  // Chão
  { divisao: 'Sala', fase: 'Chão e Rodapé', elemento: 'Chão', sub_elemento: null, notas: null },
  // Defeito com nota
  { divisao: 'Suite 1', fase: 'Paredes', elemento: 'Paredes', sub_elemento: 'Buraco na parede', notas: 'reparar antes de pintar' },
]

describe('buildFacts', () => {
  const facts = buildFacts('AP1', 39, rows)

  it('mantém o progresso do SQL', () => {
    expect(facts.apartamento).toBe('AP1')
    expect(facts.progresso_pct).toBe(39)
  })

  it('classifica pintura por divisão+superfície', () => {
    const sala = facts.pintura.find(p => p.divisao === 'Sala' && p.superficie === 'teto')
    const cozinha = facts.pintura.find(p => p.divisao === 'Cozinha' && p.superficie === 'teto')
    expect(sala?.estado).toBe('ultima_demao')
    expect(cozinha?.estado).toBe('pintura')
  })

  it('omite a prep de pintura dos pendentes', () => {
    const temPrep = facts.pendentes.some(p => p.sub_elemento === 'Tratamento de Junta' || p.sub_elemento === 'Remendo foco')
    expect(temPrep).toBe(false)
  })

  it('inclui chão e defeitos (com notas) nos pendentes', () => {
    expect(facts.pendentes.find(p => p.categoria === 'chão e rodapé')).toBeTruthy()
    const defeito = facts.pendentes.find(p => p.categoria === 'defeito')
    expect(defeito?.notas).toBe('reparar antes de pintar')
  })
})
