import { describe, it, expect } from 'vitest'
import { classifyPintura } from '@/lib/relatorio/classify'

describe('classifyPintura', () => {
  it('sem demãos pendentes → ok', () => {
    expect(classifyPintura([])).toBe('ok')
  })
  it('só a 2ª demão pendente → ultima_demao', () => {
    expect(classifyPintura(['2ª demão'])).toBe('ultima_demao')
  })
  it('primário/1ª demão pendentes → pintura', () => {
    expect(classifyPintura(['Primário', '1ª demão', '2ª demão'])).toBe('pintura')
  })
  it('extracoat conta como pintura (abaixo da 2ª demão)', () => {
    expect(classifyPintura(['2ª demão', 'Extracoat'])).toBe('pintura')
  })
  it('só a 1ª demão pendente → pintura', () => {
    expect(classifyPintura(['1ª demão'])).toBe('pintura')
  })
})
