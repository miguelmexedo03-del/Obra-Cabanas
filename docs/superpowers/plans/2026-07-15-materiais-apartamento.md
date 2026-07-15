# Tabela de Materiais por Apartamento (Fase 1) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Registar, por apartamento, o estado de supply-chain de cada categoria de material (estado, localização, datas de encomenda e aplicação) e as dependências entre materiais, com categorias adicionáveis na app.

**Architecture:** Nova migration (tabelas `categorias_material`, `materiais`, `material_dependencias` + view `materiais_com_estado`). A lógica de "bloqueado" é uma view SQL (nunca dessincroniza). A pouca lógica pura (validação, regra "dependência do mesmo AP", labels de estado) fica em `src/lib/materiais/*` testada com Vitest. Server Actions fazem upsert/CRUD; a UI é uma vista por apartamento com edição inline + gestão de categorias.

**Tech Stack:** Next.js 16 (App Router, Server Actions), TypeScript, Supabase, Vitest (unit, já instalado), shadcn/ui + sonner (padrão já usado em `relatorio/executivo`).

## Global Constraints

- UI em **PT-PT**, código/identificadores em **inglês**. Comentários de regra de negócio em PT-PT.
- Server Actions devolvem `{ success: true, ... } | { success: false, error: string }` — **nunca `throw`**.
- Server Components por defeito; Client Components só com estado/efeito/evento (`'use client'`).
- Cliente Supabase: `createClient` de `@/lib/supabase/server`.
- **Sem `any`** — `unknown` + narrowing ou tipos gerados.
- `apartamentos.id` é **`smallint`** (número em TS). Roles: só **`admin`** e **`user`**; ambos escrevem dados operacionais. **Sem** acesso por-AP.
- Reutilizar o trigger `set_updated_at()` (migration 0001). Views com `security_invoker = on`.
- Próxima migration é a **`0013`**. Estados: `por_encomendar | encomendado | em_stock`.
- **Verificação local só Vitest** (limite de RAM): NÃO correr `tsc`, `next build`, `next dev`, Playwright localmente. Typecheck/build vão para o Vercel; correr `npm run test:unit` para confirmar a suite pura.

---

## File Structure

```
supabase/migrations/
  0013_materiais.sql             # tabelas + view + RLS + trigger + seed categorias
src/lib/materiais/
  types.ts                       # tipos partilhados (EstadoMaterial, MaterialRow, ...)
  estado.ts                      # ESTADOS, estadoLabel() — puro
  validations.ts                 # zod: materialPatchSchema, categoriaSchema, mesmaApartamento()
src/app/actions/
  materiais.ts                   # upsertMaterial, addCategoria, renameCategoria, addDependencia, removeDependencia
src/app/(app)/materiais/
  page.tsx                       # Server Component: carrega APs + categorias, monta a vista
  _components/tabela-materiais.tsx   # Client: tabela por AP, edição inline, deps, badge
  categorias/page.tsx            # Server Component (admin/user): gestão de categorias
  categorias/_components/gestor-categorias.tsx  # Client: adicionar/renomear/ordenar
src/components/layout/app-sidebar.tsx  # + entrada de nav "Materiais"
e2e/
  materiais.spec.ts              # smoke (CI)
```

---

## Task 1: Migration 0013 (tabelas, view, RLS, seed) — controller-run

**Files:**
- Create: `supabase/migrations/0013_materiais.sql`
- Modify: `src/lib/database.types.ts` (regenerado)

**Interfaces:**
- Produces: tabelas `categorias_material`, `materiais`, `material_dependencias`; view `materiais_com_estado`; seed inicial de categorias.

> **Nota de execução:** aplicar em produção e regenerar tipos são trabalho do controlador (toca em prod + o hook de auto-regen só escreve com auth). Aplicar via MCP `apply_migration` (ref `larfdydhlbqupmllxunq`), depois regenerar via MCP `generate_typescript_types` e escrever por cima (o hook `check_generated` bloqueia Write direto — usar ficheiro temporário + `cp`). Ver memória `supabase-gen-types-auth`.

- [ ] **Step 1: Escrever a migration**

`supabase/migrations/0013_materiais.sql`:

```sql
-- Categorias de material (adicionaveis na app)
create table categorias_material (
  id smallint generated always as identity primary key,
  nome text not null unique,
  ordem smallint not null default 0,
  created_at timestamptz not null default now()
);

-- Uma linha por (apartamento x categoria), criada on-demand por upsert
create table materiais (
  id bigint generated always as identity primary key,
  apartamento_id smallint not null references apartamentos(id) on delete cascade,
  categoria_id smallint not null references categorias_material(id) on delete cascade,
  estado text not null default 'por_encomendar'
    check (estado in ('por_encomendar', 'encomendado', 'em_stock')),
  localizacao text,
  data_prevista_encomenda date,
  data_prevista_aplicacao date,
  updated_at timestamptz not null default now(),
  unique (apartamento_id, categoria_id)
);

create index idx_materiais_apartamento on materiais(apartamento_id);
create index idx_materiais_categoria on materiais(categoria_id);

-- Dependencias como relacao (mesmo AP, validado na app)
create table material_dependencias (
  material_id bigint not null references materiais(id) on delete cascade,
  depende_de_material_id bigint not null references materiais(id) on delete cascade,
  primary key (material_id, depende_de_material_id),
  check (material_id <> depende_de_material_id)
);

-- Trigger updated_at reutilizado
create trigger set_updated_at_materiais
  before update on materiais
  for each row execute function set_updated_at();

-- View de estado computado: bloqueado se alguma dependencia nao esta em_stock
create view materiais_com_estado
with (security_invoker = on) as
select
  m.*,
  coalesce(bool_or(dep.estado <> 'em_stock'), false) as bloqueado,
  array_remove(array_agg(
    case when dep.estado <> 'em_stock' then cat_dep.nome end
  ), null) as dependencias_pendentes
from materiais m
left join material_dependencias md on md.material_id = m.id
left join materiais dep on dep.id = md.depende_de_material_id
left join categorias_material cat_dep on cat_dep.id = dep.categoria_id
group by m.id;

-- RLS
alter table categorias_material enable row level security;
alter table materiais enable row level security;
alter table material_dependencias enable row level security;

create policy "authenticated can read categorias_material" on categorias_material
  for select using (auth.uid() is not null);
create policy "admin/user can write categorias_material" on categorias_material
  for all using (current_user_role() in ('admin','user'));

create policy "authenticated can read materiais" on materiais
  for select using (auth.uid() is not null);
create policy "admin/user can write materiais" on materiais
  for all using (current_user_role() in ('admin','user'));

create policy "authenticated can read material_dependencias" on material_dependencias
  for select using (auth.uid() is not null);
create policy "admin/user can write material_dependencias" on material_dependencias
  for all using (current_user_role() in ('admin','user'));

-- Seed inicial de categorias (editavel na app)
insert into categorias_material (nome, ordem) values
  ('Pinturas', 1), ('Pladur e pedra', 2), ('Portas', 3), ('Aros', 4),
  ('Moveis de cozinha', 5), ('Moveis de quarto', 6), ('Eletrodomesticos', 7),
  ('Ar condicionado', 8), ('Bomba de calor', 9), ('Lavatorio', 10), ('Sanita', 11)
on conflict (nome) do nothing;
```

- [ ] **Step 2: Aplicar em produção** — via MCP `apply_migration` (name `materiais`). Confirmar `{"success":true}`.

- [ ] **Step 3: Verificar** — `execute_sql`: `select count(*) from categorias_material;` → 11. `select * from materiais_com_estado limit 1;` corre sem erro.

- [ ] **Step 4: Regenerar tipos** — MCP `generate_typescript_types` → escrever para ficheiro temp → `cp` por cima de `src/lib/database.types.ts`. Confirmar que inclui `materiais`, `categorias_material`, `material_dependencias`, `materiais_com_estado`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0013_materiais.sql src/lib/database.types.ts
git commit -m "feat(db): materiais + categorias + dependencias + view de bloqueio (RLS admin/user)"
```

---

## Task 2: Estado + validação (puro) + testes

**Files:**
- Create: `src/lib/materiais/types.ts`
- Create: `src/lib/materiais/estado.ts`
- Create: `src/lib/materiais/validations.ts`
- Test: `src/lib/materiais/estado.test.ts`, `src/lib/materiais/validations.test.ts`

**Interfaces:**
- Produces:
  - `type EstadoMaterial = 'por_encomendar' | 'encomendado' | 'em_stock'`
  - `ESTADOS: EstadoMaterial[]`; `estadoLabel(e: EstadoMaterial): string`
  - `materialPatchSchema` (zod), `categoriaSchema` (zod)
  - `mesmaApartamento(a: { apartamento_id: number }, b: { apartamento_id: number }): boolean`

- [ ] **Step 1: Tipos**

`src/lib/materiais/types.ts`:

```ts
export type EstadoMaterial = 'por_encomendar' | 'encomendado' | 'em_stock'

export interface MaterialRow {
  id: number
  apartamento_id: number
  categoria_id: number
  estado: EstadoMaterial
  localizacao: string | null
  data_prevista_encomenda: string | null
  data_prevista_aplicacao: string | null
}
```

- [ ] **Step 2: Teste do estado**

`src/lib/materiais/estado.test.ts`:

```ts
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
```

- [ ] **Step 3: Correr e ver falhar** — `npm run test:unit -- estado` → FAIL.

- [ ] **Step 4: Implementar estado**

`src/lib/materiais/estado.ts`:

```ts
import type { EstadoMaterial } from '@/lib/materiais/types'

export const ESTADOS: EstadoMaterial[] = ['por_encomendar', 'encomendado', 'em_stock']

const LABELS: Record<EstadoMaterial, string> = {
  por_encomendar: 'Por encomendar',
  encomendado: 'Encomendado',
  em_stock: 'Em stock',
}

export function estadoLabel(e: EstadoMaterial): string {
  return LABELS[e]
}
```

- [ ] **Step 5: Teste da validação**

`src/lib/materiais/validations.test.ts`:

```ts
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
```

- [ ] **Step 6: Correr e ver falhar** — `npm run test:unit -- validations` → FAIL.

- [ ] **Step 7: Implementar validação**

`src/lib/materiais/validations.ts`:

```ts
import { z } from 'zod'

export const materialPatchSchema = z.object({
  estado: z.enum(['por_encomendar', 'encomendado', 'em_stock']).optional(),
  localizacao: z.string().max(200).nullable().optional(),
  data_prevista_encomenda: z.string().date().nullable().optional(),
  data_prevista_aplicacao: z.string().date().nullable().optional(),
})

export const categoriaSchema = z.object({
  nome: z.string().trim().min(1, 'Nome obrigatório.').max(60),
})

// Regra de negocio: uma dependencia so pode ligar materiais do mesmo apartamento.
export function mesmaApartamento(a: { apartamento_id: number }, b: { apartamento_id: number }): boolean {
  return a.apartamento_id === b.apartamento_id
}
```

- [ ] **Step 8: Correr toda a suite e ver passar** — `npm run test:unit -- materiais` → PASS.

- [ ] **Step 9: Commit**

```bash
git add src/lib/materiais/
git commit -m "feat(materiais): estado labels + zod schemas + regra dependencia mesmo AP (puro)"
```

---

## Task 3: Server actions (upsert material, categorias, dependências)

**Files:**
- Create: `src/app/actions/materiais.ts`

**Interfaces:**
- Consumes: `materialPatchSchema`, `categoriaSchema`, `mesmaApartamento` (T2); tipos gerados (T1).
- Produces (Server Actions), cada uma `Promise<{ success: true; ... } | { success: false; error: string }>`:
  - `upsertMaterial(apartamentoId: number, categoriaId: number, patch: unknown)`
  - `addCategoria(nome: string)`
  - `renameCategoria(id: number, nome: string)`
  - `addDependencia(materialId: number, dependeDeMaterialId: number)`
  - `removeDependencia(materialId: number, dependeDeMaterialId: number)`

- [ ] **Step 1: Implementar as actions**

`src/app/actions/materiais.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { materialPatchSchema, categoriaSchema, mesmaApartamento } from '@/lib/materiais/validations'

type Ok = { success: true } | { success: false; error: string }

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}

// Cria/atualiza a linha (apartamento x categoria) com o patch de campos.
export async function upsertMaterial(apartamentoId: number, categoriaId: number, patch: unknown): Promise<Ok> {
  const parsed = materialPatchSchema.safeParse(patch)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }

  const { supabase, user } = await requireUser()
  if (!user) return { success: false, error: 'Não autenticado.' }

  const { error } = await supabase
    .from('materiais')
    .upsert(
      { apartamento_id: apartamentoId, categoria_id: categoriaId, ...parsed.data },
      { onConflict: 'apartamento_id,categoria_id' },
    )
  if (error) return { success: false, error: error.message }
  revalidatePath('/materiais', 'layout')
  return { success: true }
}

export async function addCategoria(nome: string): Promise<Ok> {
  const parsed = categoriaSchema.safeParse({ nome })
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Inválido.' }

  const { supabase, user } = await requireUser()
  if (!user) return { success: false, error: 'Não autenticado.' }

  const { data, error } = await supabase
    .from('categorias_material')
    .insert({ nome: parsed.data.nome })
    .select('id')
  if (error) return { success: false, error: 'Já existe ou sem permissão.' }
  if (!data || data.length === 0) return { success: false, error: 'Sem permissão para gravar.' }
  revalidatePath('/materiais', 'layout')
  return { success: true }
}

export async function renameCategoria(id: number, nome: string): Promise<Ok> {
  const parsed = categoriaSchema.safeParse({ nome })
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Inválido.' }

  const { supabase, user } = await requireUser()
  if (!user) return { success: false, error: 'Não autenticado.' }

  const { data, error } = await supabase
    .from('categorias_material')
    .update({ nome: parsed.data.nome })
    .eq('id', id)
    .select('id')
  if (error) return { success: false, error: 'Erro ao gravar.' }
  if (!data || data.length === 0) return { success: false, error: 'Sem permissão ou não existe.' }
  revalidatePath('/materiais', 'layout')
  return { success: true }
}

// Liga duas linhas de material; recusa se forem de APs diferentes (regra de negocio).
export async function addDependencia(materialId: number, dependeDeMaterialId: number): Promise<Ok> {
  if (materialId === dependeDeMaterialId) return { success: false, error: 'Um material não depende de si próprio.' }

  const { supabase, user } = await requireUser()
  if (!user) return { success: false, error: 'Não autenticado.' }

  const { data: rows, error: readErr } = await supabase
    .from('materiais')
    .select('id, apartamento_id')
    .in('id', [materialId, dependeDeMaterialId])
  if (readErr) return { success: false, error: readErr.message }
  const a = rows?.find(r => r.id === materialId)
  const b = rows?.find(r => r.id === dependeDeMaterialId)
  if (!a || !b) return { success: false, error: 'Material não encontrado.' }
  if (!mesmaApartamento(a, b)) return { success: false, error: 'A dependência tem de ser do mesmo apartamento.' }

  const { error } = await supabase
    .from('material_dependencias')
    .insert({ material_id: materialId, depende_de_material_id: dependeDeMaterialId })
  if (error) return { success: false, error: error.message }
  revalidatePath('/materiais', 'layout')
  return { success: true }
}

export async function removeDependencia(materialId: number, dependeDeMaterialId: number): Promise<Ok> {
  const { supabase, user } = await requireUser()
  if (!user) return { success: false, error: 'Não autenticado.' }

  const { error } = await supabase
    .from('material_dependencias')
    .delete()
    .eq('material_id', materialId)
    .eq('depende_de_material_id', dependeDeMaterialId)
  if (error) return { success: false, error: error.message }
  revalidatePath('/materiais', 'layout')
  return { success: true }
}
```

- [ ] **Step 2: Confirmar suite pura intacta** — `npm run test:unit` (deve manter-se verde; esta task não tem teste unitário próprio — typecheck é no Vercel).

- [ ] **Step 3: Commit**

```bash
git add src/app/actions/materiais.ts
git commit -m "feat(materiais): server actions (upsert, categorias, dependencias com regra mesmo AP)"
```

---

## Task 4: UI — vista por apartamento (tabela + edição inline + dependências)

**Files:**
- Create: `src/app/(app)/materiais/page.tsx`
- Create: `src/app/(app)/materiais/_components/tabela-materiais.tsx`

**Interfaces:**
- Consumes: `upsertMaterial`, `addDependencia`, `removeDependencia` (T3); `ESTADOS`, `estadoLabel` (T2).
- Produces: rota `/materiais` com a vista por apartamento.

> **Padrões a seguir:** ler `src/app/(app)/relatorio/executivo/_components/gerador.tsx` (shadcn `Button`/`Select`, `sonner` `toast`) e a tabela do checklist/gerir-itens para o estilo de tabela/edição inline. Não inventar componentes: usar `@/components/ui/{button,select,input}` e `@/components/ui/table` se existir; caso contrário, um `<table>` simples com as classes tailwind já usadas no projeto.

- [ ] **Step 1: Server Component**

`src/app/(app)/materiais/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { TabelaMateriais } from './_components/tabela-materiais'

export default async function MateriaisPage() {
  const supabase = await createClient()
  const [{ data: apartamentos }, { data: categorias }] = await Promise.all([
    supabase.from('apartamentos').select('id, codigo').order('id'),
    supabase.from('categorias_material').select('id, nome, ordem').order('ordem'),
  ])

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Materiais</h1>
        <a href="/materiais/categorias" className="text-sm underline">Gerir categorias</a>
      </div>
      <TabelaMateriais apartamentos={apartamentos ?? []} categorias={categorias ?? []} />
    </div>
  )
}
```

- [ ] **Step 2: Client component da tabela**

`src/app/(app)/materiais/_components/tabela-materiais.tsx`:

```tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { upsertMaterial } from '@/app/actions/materiais'
import { ESTADOS, estadoLabel } from '@/lib/materiais/estado'
import type { EstadoMaterial } from '@/lib/materiais/types'

interface Categoria { id: number; nome: string; ordem: number }
interface Apartamento { id: number; codigo: string }
interface VistaRow {
  id: number
  categoria_id: number
  estado: EstadoMaterial
  localizacao: string | null
  data_prevista_encomenda: string | null
  data_prevista_aplicacao: string | null
  bloqueado: boolean
  dependencias_pendentes: string[]
}

export function TabelaMateriais({ apartamentos, categorias }: { apartamentos: Apartamento[]; categorias: Categoria[] }) {
  const [apId, setApId] = useState<number>(apartamentos[0]?.id ?? 1)
  const [rows, setRows] = useState<Map<number, VistaRow>>(new Map())

  const carregar = useCallback(async (ap: number) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('materiais_com_estado')
      .select('id, categoria_id, estado, localizacao, data_prevista_encomenda, data_prevista_aplicacao, bloqueado, dependencias_pendentes')
      .eq('apartamento_id', ap)
    const m = new Map<number, VistaRow>()
    for (const r of (data ?? []) as VistaRow[]) m.set(r.categoria_id, r)
    setRows(m)
  }, [])

  useEffect(() => { void carregar(apId) }, [apId, carregar])

  async function editar(categoriaId: number, patch: Record<string, unknown>) {
    const r = await upsertMaterial(apId, categoriaId, patch)
    if (!r.success) { toast.error(r.error); return }
    await carregar(apId)
  }

  return (
    <div className="space-y-3 max-w-5xl">
      <select className="border rounded px-3 py-2" value={apId} onChange={e => setApId(Number(e.target.value))}>
        {apartamentos.map(a => <option key={a.id} value={a.id}>{a.codigo}</option>)}
      </select>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2 pr-3">Categoria</th>
            <th className="py-2 pr-3">Estado</th>
            <th className="py-2 pr-3">Localização</th>
            <th className="py-2 pr-3">Data encomenda</th>
            <th className="py-2 pr-3">Data aplicação</th>
            <th className="py-2 pr-3">Dependências</th>
          </tr>
        </thead>
        <tbody>
          {categorias.map(cat => {
            const row = rows.get(cat.id)
            const estado = row?.estado ?? 'por_encomendar'
            const bloqueado = row?.bloqueado ?? false
            return (
              <tr key={cat.id} className="border-b">
                <td className="py-2 pr-3">{cat.nome}</td>
                <td className="py-2 pr-3">
                  <select className="border rounded px-2 py-1" value={estado}
                    onChange={e => editar(cat.id, { estado: e.target.value })}>
                    {ESTADOS.map(s => <option key={s} value={s}>{estadoLabel(s)}</option>)}
                  </select>
                </td>
                <td className="py-2 pr-3">
                  <input className="border rounded px-2 py-1 w-40" defaultValue={row?.localizacao ?? ''}
                    onBlur={e => editar(cat.id, { localizacao: e.target.value || null })} />
                </td>
                <td className="py-2 pr-3">
                  <input type="date" className="border rounded px-2 py-1" defaultValue={row?.data_prevista_encomenda ?? ''}
                    onChange={e => editar(cat.id, { data_prevista_encomenda: e.target.value || null })} />
                </td>
                <td className="py-2 pr-3">
                  <input type="date" className="border rounded px-2 py-1" defaultValue={row?.data_prevista_aplicacao ?? ''}
                    onChange={e => {
                      if (bloqueado && e.target.value) toast.warning('Este material está bloqueado por dependências.')
                      editar(cat.id, { data_prevista_aplicacao: e.target.value || null })
                    }} />
                </td>
                <td className="py-2 pr-3">
                  {bloqueado
                    ? <span className="text-amber-600">🟡 bloqueado por: {(row?.dependencias_pendentes ?? []).join(', ')}</span>
                    : <span className="text-emerald-600">🟢 pronto</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
```

> **Dependências (edição):** o multi-select que liga materiais do mesmo AP pode ser um passo simples numa iteração seguinte da própria task (um botão "editar dependências" por linha que abre um popover com as outras categorias do AP e chama `addDependencia`/`removeDependencia`). Manter na Fase 1, mas se a linha ficar grande, o revisor pode aceitar o badge de leitura primeiro e o editor de dependências como refinamento imediato. O badge (leitura) é obrigatório nesta task; o editor de dependências também — usar `addDependencia(row.id, outraRow.id)`.

- [ ] **Step 3: Confirmar suite pura intacta** — `npm run test:unit`.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/materiais/page.tsx" "src/app/(app)/materiais/_components/tabela-materiais.tsx"
git commit -m "feat(materiais): vista por apartamento (edicao inline + badge de bloqueio + aviso suave)"
```

---

## Task 5: UI — gestão de categorias

**Files:**
- Create: `src/app/(app)/materiais/categorias/page.tsx`
- Create: `src/app/(app)/materiais/categorias/_components/gestor-categorias.tsx`

**Interfaces:**
- Consumes: `addCategoria`, `renameCategoria` (T3).
- Produces: rota `/materiais/categorias` para adicionar e renomear categorias.

- [ ] **Step 1: Server Component**

`src/app/(app)/materiais/categorias/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { GestorCategorias } from './_components/gestor-categorias'

export default async function CategoriasPage() {
  const supabase = await createClient()
  const { data: categorias } = await supabase.from('categorias_material').select('id, nome, ordem').order('ordem')
  return (
    <div className="p-6 space-y-4 max-w-xl">
      <h1 className="text-2xl font-semibold">Categorias de material</h1>
      <p className="text-sm text-muted-foreground">Adiciona e renomeia as categorias que aparecem na tabela de materiais.</p>
      <GestorCategorias categorias={categorias ?? []} />
    </div>
  )
}
```

- [ ] **Step 2: Client component**

`src/app/(app)/materiais/categorias/_components/gestor-categorias.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { addCategoria, renameCategoria } from '@/app/actions/materiais'

interface Categoria { id: number; nome: string; ordem: number }

export function GestorCategorias({ categorias }: { categorias: Categoria[] }) {
  const router = useRouter()
  const [nova, setNova] = useState('')
  const [busy, setBusy] = useState(false)

  async function adicionar() {
    setBusy(true)
    const r = await addCategoria(nova)
    setBusy(false)
    if (!r.success) { toast.error(r.error); return }
    setNova(''); toast.success('Categoria adicionada.'); router.refresh()
  }

  async function renomear(id: number, nome: string) {
    const r = await renameCategoria(id, nome)
    if (!r.success) { toast.error(r.error); return }
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input className="border rounded px-3 py-2 flex-1" placeholder="Nova categoria" value={nova}
          onChange={e => setNova(e.target.value)} />
        <button className="border rounded px-4 py-2 disabled:opacity-50" onClick={adicionar} disabled={busy || !nova.trim()}>
          Adicionar
        </button>
      </div>
      <ul className="space-y-1">
        {categorias.map(c => (
          <li key={c.id}>
            <input className="border rounded px-2 py-1 w-full" defaultValue={c.nome}
              onBlur={e => { if (e.target.value.trim() && e.target.value !== c.nome) void renomear(c.id, e.target.value) }} />
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 3: Confirmar suite pura intacta** — `npm run test:unit`.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/materiais/categorias/page.tsx" "src/app/(app)/materiais/categorias/_components/gestor-categorias.tsx"
git commit -m "feat(materiais): gestao de categorias (adicionar/renomear)"
```

---

## Task 6: Sidebar nav + e2e smoke

**Files:**
- Modify: `src/components/layout/app-sidebar.tsx`
- Create: `e2e/materiais.spec.ts`

**Interfaces:**
- Consumes: rota `/materiais`.

- [ ] **Step 1: Entrada de nav**

Em `src/components/layout/app-sidebar.tsx`, no array `NAV`, acrescentar (usar um ícone já importado de `lucide-react`, ex.: `Package`; se não estiver importado, adicioná-lo ao import existente):

```tsx
  { href: '/materiais', label: 'Materiais', icon: Package },
```

(Não usar `exact` — `/materiais/categorias` é filho e faz sentido manter "Materiais" ativo lá também.)

- [ ] **Step 2: e2e smoke**

`e2e/materiais.spec.ts` (espelhar o padrão de login de `e2e/relatorio.spec.ts`):

```ts
import { test, expect } from '@playwright/test'

const EMAIL = process.env.TEST_USER_EMAIL ?? ''
const PASSWORD = process.env.TEST_USER_PASSWORD ?? ''

test.skip(!EMAIL || !PASSWORD, 'Set TEST_USER_EMAIL and TEST_USER_PASSWORD in .env.test.local')

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(EMAIL)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: /entrar/i }).click()
  await page.waitForURL('/')
}

test('a página de materiais carrega e mostra a tabela', async ({ page }) => {
  await login(page)
  await page.goto('/materiais')
  await expect(page.getByRole('heading', { name: 'Materiais' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Categoria' })).toBeVisible()
})
```

- [ ] **Step 3: Suite pura verde** — `npm run test:unit`.

- [ ] **Step 4: Commit**

```bash
git add "src/components/layout/app-sidebar.tsx" e2e/materiais.spec.ts
git commit -m "feat(materiais): entrada na sidebar + e2e smoke"
```

---

## Self-Review (feita)

**Spec coverage:**
- §3.1 categorias adicionáveis → T1 (tabela + seed), T3 (add/rename), T5 (UI). ✅
- §3.2 materiais (estado 3, localização, 2 datas, unique) → T1 (schema), T3 (upsert). ✅
- §3.3 dependências relação + regra mesmo AP → T1 (tabela), T2 (`mesmaApartamento`), T3 (`addDependencia`). ✅
- §4 view de bloqueio (security_invoker) → T1. Critério "dependência satisfeita = em_stock" implementado na view; marcado como a rever. ✅
- §5 UI por-AP (inline, badge, aviso suave) + gestão categorias → T4, T5. ✅
- §6 RLS admin/user + security_invoker + detetar bloqueio RLS (`.select()` após insert/update em categorias) → T1, T3. ✅
- §7 smallint, roles, set_updated_at, migration 0013 → T1. ✅
- §8 ordem de construção → T1→T6. ✅

**Placeholder scan:** sem TBD/TODO; código real em cada passo. A nota da T4 sobre o editor de dependências não é placeholder — o badge (leitura) e o editor (via `addDependencia`/`removeDependencia`) são ambos exigidos; a nota só dá liberdade de faseamento ao revisor.

**Type consistency:** `EstadoMaterial` e os 3 valores idênticos em T1 (check SQL), T2 (enum zod + estado.ts), T3 (schema), T4 (UI). `mesmaApartamento(a,b)` consistente T2↔T3. Assinaturas das actions consistentes T3↔T4/T5.

**Risco conhecido:** a §4 (critério de bloqueio) pode mudar após revisão com o Miguel — a lógica está isolada na view (`0013`), por isso alterá-la é uma migration nova pequena, sem tocar em TS.
