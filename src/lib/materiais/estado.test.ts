import { describe, it, expect } from 'vitest'
import { ESTADOS, estadoLabel } from '@/lib/materiais/estado'

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
