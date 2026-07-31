import { describe, it, expect } from 'vitest'
import { tipoDivisao, sortElementos } from '@/lib/utils'

describe('tipoDivisao — zonas comuns e zona técnica', () => {
  it('classifica divisões de zonas comuns como Zona Comum', () => {
    expect(tipoDivisao('Átrio de entrada (piso 0)')).toBe('Zona Comum')
    expect(tipoDivisao('Circulação — piso 1')).toBe('Zona Comum')
    expect(tipoDivisao('Escada')).toBe('Zona Comum')
    expect(tipoDivisao('Elevador')).toBe('Zona Comum')
    expect(tipoDivisao('Garagem / cave (piso -1)')).toBe('Zona Comum')
    expect(tipoDivisao('Zonas técnicas (cave)')).toBe('Zona Comum')
    expect(tipoDivisao('Cobertura comum/técnica')).toBe('Zona Comum')
  })

  it('classifica a divisão Zona Técnica do apartamento à parte', () => {
    expect(tipoDivisao('Zona Técnica')).toBe('Zona Técnica')
  })

  it('não confunde Entrada do apartamento com Átrio de entrada comum', () => {
    expect(tipoDivisao('Entrada')).toBe('Entrada')
    expect(tipoDivisao('Entrada / Acessos')).toBe('Entrada')
  })
})

describe('sortElementos — itens sem fase (fase_id null)', () => {
  it('dentro do mesmo elemento, ordena fase numerada antes de fase null', () => {
    const items = [
      { elemento: 'Item X', fase_id: null, sub_elemento: null },
      { elemento: 'Item X', fase_id: 3, sub_elemento: null },
    ]
    const sorted = sortElementos(items)
    expect(sorted.map(i => i.fase_id)).toEqual([3, null])
  })

  it('itens fora do ELEMENTO_ORDER mantêm ordem estável quando ambos têm fase_id null', () => {
    const items = [
      { elemento: 'Sinalização e segurança', fase_id: null, sub_elemento: null },
      { elemento: 'Iluminação', fase_id: null, sub_elemento: null },
    ]
    const sorted = sortElementos(items)
    expect(sorted.map(i => i.elemento)).toEqual(['Sinalização e segurança', 'Iluminação'])
  })
})
