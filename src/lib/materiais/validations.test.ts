import { describe, it, expect } from 'vitest'
import { materialPatchSchema, categoriaSchema, mesmaApartamento } from '@/lib/materiais/validations'

describe('materialPatchSchema', () => {
  it('aceita um estado valido e datas opcionais', () => {
    const r = materialPatchSchema.safeParse({ estado: 'em_stock', localizacao: 'Armazem 1' })
    expect(r.success).toBe(true)
  })
  it('rejeita estado invalido', () => {
    expect(materialPatchSchema.safeParse({ estado: 'aplicado' }).success).toBe(false)
  })
  it('aceita sitio válido e null', () => {
    expect(materialPatchSchema.safeParse({ sitio: 'em_armazem' }).success).toBe(true)
    expect(materialPatchSchema.safeParse({ sitio: null }).success).toBe(true)
  })
  it('rejeita sitio fora do enum', () => {
    expect(materialPatchSchema.safeParse({ sitio: 'algures' }).success).toBe(false)
  })
  it('aceita notas como array de strings', () => {
    expect(materialPatchSchema.safeParse({ notas: ['a', 'b'] }).success).toBe(true)
  })
  it('já não aceita data_prevista_encomenda', () => {
    const r = materialPatchSchema.safeParse({ data_prevista_encomenda: '2026-01-01' })
    // strip: o campo desconhecido é ignorado; o objeto resultante não o contém
    expect(r.success).toBe(true)
    if (r.success) expect('data_prevista_encomenda' in r.data).toBe(false)
  })
})

describe('categoriaSchema', () => {
  it('exige nome nao vazio', () => {
    expect(categoriaSchema.safeParse({ nome: '' }).success).toBe(false)
    expect(categoriaSchema.safeParse({ nome: 'Rodapes' }).success).toBe(true)
  })
})

describe('mesmaApartamento', () => {
  it('true quando o AP coincide', () => {
    expect(mesmaApartamento({ apartamento_id: 3 }, { apartamento_id: 3 })).toBe(true)
    expect(mesmaApartamento({ apartamento_id: 3 }, { apartamento_id: 4 })).toBe(false)
  })
})
