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
