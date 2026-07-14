import { describe, it, expect } from 'vitest'
import { categorizarItem } from '@/lib/relatorio/categorize'

describe('categorizarItem', () => {
  it('chão e rodapé', () => {
    expect(categorizarItem('Chão e Rodapé', 'Chão', null, 'Sala')).toBe('chão e rodapé')
    expect(categorizarItem('Chão e Rodapé', 'Rodapé', null, 'Sala')).toBe('chão e rodapé')
  })
  it('portas e aros', () => {
    expect(categorizarItem('Portas', 'Aro', null, 'Suite 1')).toBe('portas e aros')
    expect(categorizarItem('Portas', 'Porta', null, 'Suite 1')).toBe('portas e aros')
  })
  it('móveis por divisão', () => {
    expect(categorizarItem('Móveis', 'Móveis', null, 'Cozinha')).toBe('móveis de cozinha')
    expect(categorizarItem('Móveis', 'Móveis', null, 'Suite 1 em frente')).toBe('móveis de quarto')
    expect(categorizarItem('Móveis', 'Móveis', null, 'WC (Suite 2)')).toBe('móveis de WC')
  })
  it('equipamentos de WC', () => {
    expect(categorizarItem('WC Equipamentos', 'Lavatório', null, 'WC (Suite 1)')).toBe('equipamentos de WC')
  })
  it('eletrodomésticos', () => {
    expect(categorizarItem('Eletrodomésticos', 'Eletrodomésticos', null, 'Cozinha')).toBe('eletrodomésticos')
  })
  it('pladur e pedra dentro de Paredes', () => {
    expect(categorizarItem('Paredes', 'Paredes', 'Pladur', 'WC (Suite 2)')).toBe('pladur e pedra')
    expect(categorizarItem('Paredes', 'Paredes', 'Pedra da fachada', 'Varanda')).toBe('pladur e pedra')
  })
  it('defeitos dentro de Paredes', () => {
    expect(categorizarItem('Paredes', 'Paredes', 'Buraco na parede', 'Suite 1')).toBe('defeito')
  })
  it('prep de pintura é omitida (null): tetos, remendos', () => {
    expect(categorizarItem('Teto', 'Teto', 'Tratamento de Junta', 'Sala')).toBeNull()
    expect(categorizarItem('Remendos Teto', 'Teto', 'Remendo foco', 'Sala')).toBeNull()
    expect(categorizarItem('Remendo Paredes', 'Paredes', 'Remendo tomadas', 'Sala')).toBeNull()
  })
  it('ar condicionado / bomba de calor por elemento', () => {
    expect(categorizarItem('WC Equipamentos', 'Ar condicionado', null, 'Sala')).toBe('ar condicionado')
    expect(categorizarItem('WC Equipamentos', 'Bomba de calor', null, 'Sala')).toBe('bomba de calor')
  })
})
