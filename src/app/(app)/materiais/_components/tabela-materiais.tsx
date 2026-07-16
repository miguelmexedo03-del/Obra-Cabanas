'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { upsertMaterial, addDependencia, removeDependencia } from '@/app/actions/materiais'
import { ESTADOS, estadoLabel, SITIOS, sitioLabel } from '@/lib/materiais/estado'
import type { EstadoMaterial, Sitio } from '@/lib/materiais/types'
import type { Database } from '@/lib/database.types'

interface Categoria {
  id: number
  nome: string
  ordem: number
}

interface Apartamento {
  id: number
  codigo: string
}

interface MaterialLinha {
  id: number
  categoria_id: number
  estado: EstadoMaterial
  sitio: Sitio | null
  localizacao: string | null
  data_prevista_aplicacao: string | null
  notas: string[]
}

type MateriaisRow = Database['public']['Tables']['materiais']['Row']

// Só as colunas efetivamente pedidas no .select() de `carregar` — evita reclamar apartamento_id/updated_at
// que nem sequer são selecionadas (e que esta função não usa).
type MateriaisRowSelecionada = Pick<
  MateriaisRow,
  | 'id'
  | 'categoria_id'
  | 'estado'
  | 'sitio'
  | 'localizacao'
  | 'data_prevista_aplicacao'
  | 'notas'
>

// id/categoria_id/estado nunca vêm nulos para uma linha existente da tabela, mas mantemos o
// filtro defensivo (sem "any") em vez de forçar o tipo.
function paraMaterialLinha(r: MateriaisRowSelecionada): MaterialLinha | null {
  if (r.id == null || r.categoria_id == null || r.estado == null) return null
  return {
    id: r.id,
    categoria_id: r.categoria_id,
    estado: r.estado as EstadoMaterial,
    sitio: (r.sitio as Sitio | null) ?? null,
    localizacao: r.localizacao,
    data_prevista_aplicacao: r.data_prevista_aplicacao,
    notas: r.notas ?? [],
  }
}

interface Props {
  apartamentos: Apartamento[]
  categorias: Categoria[]
}

export function TabelaMateriais({ apartamentos, categorias }: Props) {
  const [apId, setApId] = useState<number>(apartamentos[0]?.id ?? 1)
  const [rows, setRows] = useState<Map<number, MaterialLinha>>(new Map())
  // AP a que os `rows` atualmente carregados pertencem — evita que os inputs "defaultValue"
  // fiquem a mostrar dados do AP anterior enquanto o fetch do novo AP ainda não resolveu.
  const [loadedFor, setLoadedFor] = useState<number | null>(null)
  // material_id -> lista de depende_de_material_id (dependências completas, não só as pendentes)
  const [deps, setDeps] = useState<Map<number, number[]>>(new Map())
  // categoria_id -> valor selecionado no combo "adicionar dependência" dessa linha
  const [novaDependencia, setNovaDependencia] = useState<Map<number, string>>(new Map())

  const carregar = useCallback(async (ap: number) => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('materiais')
      .select('id, categoria_id, estado, sitio, localizacao, data_prevista_aplicacao, notas')
      .eq('apartamento_id', ap)
    if (error) { toast.error(error.message); return }

    const m = new Map<number, MaterialLinha>()
    for (const r of data ?? []) {
      const row = paraMaterialLinha(r)
      if (row) m.set(row.categoria_id, row)
    }
    setRows(m)
    setLoadedFor(ap)

    const ids = Array.from(m.values()).map(row => row.id)
    if (ids.length === 0) { setDeps(new Map()); return }

    const { data: depsData, error: depsError } = await supabase
      .from('material_dependencias')
      .select('material_id, depende_de_material_id')
      .in('material_id', ids)
    if (depsError) { toast.error(depsError.message); return }

    const dm = new Map<number, number[]>()
    for (const d of depsData ?? []) {
      const atual = dm.get(d.material_id) ?? []
      atual.push(d.depende_de_material_id)
      dm.set(d.material_id, atual)
    }
    setDeps(dm)
  }, [])

  useEffect(() => { void carregar(apId) }, [apId, carregar])

  async function editar(categoriaId: number, patch: Record<string, unknown>) {
    const r = await upsertMaterial(apId, categoriaId, patch)
    if (!r.success) { toast.error(r.error); return }
    await carregar(apId)
  }

  async function gravarNotas(categoriaId: number, notas: string[]) {
    await editar(categoriaId, { notas })
  }

  async function adicionarDependencia(materialId: number, outroMaterialId: number) {
    const r = await addDependencia(materialId, outroMaterialId)
    if (!r.success) { toast.error(r.error); return }
    await carregar(apId)
  }

  async function removerDependencia(materialId: number, outroMaterialId: number) {
    const r = await removeDependencia(materialId, outroMaterialId)
    if (!r.success) { toast.error(r.error); return }
    await carregar(apId)
  }

  // categoria_id -> nome, para etiquetar as dependências
  const nomePorCategoria = useMemo(() => {
    const m = new Map<number, string>()
    for (const c of categorias) m.set(c.id, c.nome)
    return m
  }, [categorias])

  // material_id -> categoria_id, para resolver o nome das dependências lidas de material_dependencias
  const categoriaPorMaterial = useMemo(() => {
    const m = new Map<number, number>()
    for (const row of rows.values()) m.set(row.id, row.categoria_id)
    return m
  }, [rows])

  return (
    <div className="space-y-3 max-w-6xl">
      <select
        className="border rounded px-3 py-2"
        value={apId}
        onChange={e => setApId(Number(e.target.value))}
      >
        {apartamentos.map(a => <option key={a.id} value={a.id}>{a.codigo}</option>)}
      </select>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2 pr-3">Categoria</th>
            <th className="py-2 pr-3">Estado</th>
            <th className="py-2 pr-3">Sítio</th>
            <th className="py-2 pr-3">Localização</th>
            <th className="py-2 pr-3">Data aplicação</th>
            <th className="py-2 pr-3">Depende de</th>
          </tr>
        </thead>
        <tbody>
          {loadedFor !== apId ? (
            <tr>
              <td colSpan={6} className="py-2 pr-3 text-muted-foreground">A carregar…</td>
            </tr>
          ) : categorias.map(cat => {
            const row = rows.get(cat.id)
            const estado = row?.estado ?? 'por_encomendar'
            const depsAtuais = row ? (deps.get(row.id) ?? []) : []

            // outras categorias do mesmo AP que já têm linha criada (id existe) e ainda não são dependência
            const candidatos = row
              ? categorias.filter(c => {
                  if (c.id === cat.id) return false
                  const outra = rows.get(c.id)
                  if (!outra) return false
                  return !depsAtuais.includes(outra.id)
                })
              : []
            const valorSelecionado = novaDependencia.get(cat.id) ?? ''

            return (
              <tr key={`${apId}-${cat.id}`} className="border-b align-top">
                <td className="py-2 pr-3">{cat.nome}</td>
                <td className="py-2 pr-3">
                  <select
                    className="border rounded px-2 py-1"
                    value={estado}
                    onChange={e => editar(cat.id, { estado: e.target.value })}
                  >
                    {ESTADOS.map(s => <option key={s} value={s}>{estadoLabel(s)}</option>)}
                  </select>
                </td>
                <td className="py-2 pr-3">
                  {estado === 'em_stock' ? (
                    <select
                      className="border rounded px-2 py-1"
                      value={row?.sitio ?? ''}
                      onChange={e => editar(cat.id, { sitio: e.target.value || null })}
                    >
                      <option value="">—</option>
                      {SITIOS.map(s => <option key={s} value={s}>{sitioLabel(s)}</option>)}
                    </select>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="py-2 pr-3">
                  {estado === 'em_stock' ? (
                    <input
                      className="border rounded px-2 py-1 w-40"
                      defaultValue={row?.localizacao ?? ''}
                      onBlur={e => editar(cat.id, { localizacao: e.target.value || null })}
                    />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="py-2 pr-3">
                  <input
                    type="date"
                    className="border rounded px-2 py-1"
                    defaultValue={row?.data_prevista_aplicacao ?? ''}
                    onChange={e => editar(cat.id, { data_prevista_aplicacao: e.target.value || null })}
                  />
                </td>
                <td className="py-2 pr-3">
                  {!row ? (
                    <span className="text-muted-foreground text-xs">Edita a linha para poderes ligar dependências.</span>
                  ) : (
                    <div className="space-y-1">
                      {depsAtuais.length > 0 && (
                        <ul className="space-y-1">
                          {depsAtuais.map(depMaterialId => {
                            const depCategoriaId = categoriaPorMaterial.get(depMaterialId)
                            const nome = depCategoriaId != null ? nomePorCategoria.get(depCategoriaId) : undefined
                            return (
                              <li key={depMaterialId} className="flex items-center gap-1">
                                <span>• {nome ?? `#${depMaterialId}`}</span>
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  onClick={() => removerDependencia(row.id, depMaterialId)}
                                >
                                  ×
                                </Button>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                      {(row.notas ?? []).length > 0 && (
                        <ul className="space-y-1">
                          {row.notas.map((nota, i) => (
                            <li key={i} className="flex items-center gap-1">
                              <input
                                className="border rounded px-2 py-1 text-xs w-56"
                                defaultValue={nota}
                                onBlur={e => {
                                  const next = [...row.notas]
                                  next[i] = e.target.value
                                  gravarNotas(cat.id, next.filter(n => n.trim() !== ''))
                                }}
                              />
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => gravarNotas(cat.id, row.notas.filter((_, j) => j !== i))}
                              >
                                ×
                              </Button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="flex items-center gap-1 flex-wrap">
                        {candidatos.length > 0 && (
                          <>
                            <select
                              className="border rounded px-2 py-1 text-xs"
                              value={valorSelecionado}
                              onChange={e => setNovaDependencia(prev => new Map(prev).set(cat.id, e.target.value))}
                            >
                              <option value="">+ categoria</option>
                              {candidatos.map(c => (
                                <option key={c.id} value={c.id}>{c.nome}</option>
                              ))}
                            </select>
                            <Button
                              variant="outline"
                              size="xs"
                              disabled={!valorSelecionado}
                              onClick={() => {
                                const outra = rows.get(Number(valorSelecionado))
                                if (!outra) return
                                adicionarDependencia(row.id, outra.id)
                                setNovaDependencia(prev => new Map(prev).set(cat.id, ''))
                              }}
                            >
                              Ligar
                            </Button>
                          </>
                        )}
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => gravarNotas(cat.id, [...(row.notas ?? []), ''])}
                        >
                          + nota
                        </Button>
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
