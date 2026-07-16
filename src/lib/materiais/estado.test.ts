import { describe, it, expect } from 'vitest'
import { ESTADOS, estadoLabel, SITIOS, sitioLabel } from '@/lib/materiais/estado'

describe('estado', () => {
  it('tem os 3 estados pela ordem do fluxo', () => {
    expect(ESTADOS).toEqual(['por_encomendar', 'encomendado', 'em_stock'])
  })
  it('mapeia labels PT', () => {
    expect(estadoLabel('por_encomendar')).toBe('Por encomendar')
    expect(estadoLabel('encomendado')).toBe('Encomendado')
    expect(estadoLabel('em_stock')).toBe('Em stock')
  })
})

describe('sitio', () => {
  it('SITIOS tem os dois valores', () => {
    expect(SITIOS).toEqual(['em_armazem', 'em_obra'])
  })
  it('sitioLabel mapeia os dois valores', () => {
    expect(sitioLabel('em_armazem')).toBe('Em armazém')
    expect(sitioLabel('em_obra')).toBe('Em obra')
  })
})
