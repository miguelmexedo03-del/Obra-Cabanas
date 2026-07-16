# Refinamento da Tabela de Materiais Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajustar a tabela `/materiais` ao uso real: tirar data de encomenda e a lógica de bloqueio, acrescentar um passo Sítio (armazém/obra) condicional a "em stock", e transformar as dependências numa coluna "Depende de" com ligações a categorias + notas de texto livre, linha a linha.

**Architecture:** Migration `0014` altera a tabela `materiais` (remove uma coluna, adiciona `sitio` e `notas`) e remove a view `materiais_com_estado`. A lógica pura (types/estado/validations) é testada com Vitest. A UI (`tabela-materiais.tsx`) é reescrita para ler diretamente da tabela `materiais`, esconder Sítio/Localização quando não está em stock, e misturar ligações estruturadas com notas livres na coluna "Depende de".

**Tech Stack:** Next.js 16 (App Router, Server Actions), Supabase (Postgres + RLS), TypeScript, Zod, Vitest.

## Global Constraints

- **Verificação local só com Vitest.** tsc/next build/next dev/playwright **NÃO** correm localmente (RAM ~1GB → risco de freeze do Windows). tsc e build ficam para o Vercel CI. Ver [[feedback_localhost_crash_ram]].
- **PT-PT em toda a UI. Código e nomes em inglês; `snake_case` para colunas Postgres.**
- **Server Actions devolvem `{ success: true } | { success: false, error: string }`. Nunca `throw`.**
- **Sem `any`.** Usar `unknown` + narrowing.
- **Regenerar `src/lib/database.types.ts` via MCP Supabase + cópia** (o hook de regen local corrompe o ficheiro sem auth). Ver [[supabase-gen-types-auth]].
- **Estado inalterado:** `por_encomendar` / `encomendado` / `em_stock`.

---

### Task 1: Migration 0014 + regenerar types

**Controller-run** (não delegar): aplica schema em produção após confirmação do Miguel, e regenera os types via MCP.

**Files:**
- Create: `supabase/migrations/0014_materiais_refinamento.sql`
- Modify: `src/lib/database.types.ts` (regenerado)

**Interfaces:**
- Produces: coluna `materiais.sitio text check (sitio in ('em_armazem','em_obra'))` nullable; coluna `materiais.notas text[] not null default '{}'`; **remove** `materiais.data_prevista_encomenda`; **remove** a view `materiais_com_estado`.

- [ ] **Step 1: Escrever a migration**

`supabase/migrations/0014_materiais_refinamento.sql`:

```sql
-- Refinamento da tabela de materiais (iteracao 2, 2026-07-16)

-- 1. Remover a data de encomenda (fica so a de aplicacao)
alter table materiais drop column data_prevista_encomenda;

-- 2. Sitio fisico do material (so relevante quando em stock)
alter table materiais add column sitio text
  check (sitio in ('em_armazem', 'em_obra'));

-- 3. Notas livres, uma por linha na UI
alter table materiais add column notas text[] not null default '{}';

-- 4. Deixa de haver logica de bloqueio: a view e removida e a UI le a tabela.
drop view materiais_com_estado;
```

- [ ] **Step 2: Confirmar com o Miguel e aplicar em produção**

Confirmar (a remoção de `data_prevista_encomenda` é destrutiva). Depois aplicar via MCP:
`mcp__supabase__apply_migration` com `name: "materiais_refinamento"` e o SQL do Step 1.

- [ ] **Step 3: Verificar o schema**

`mcp__supabase__execute_sql`:
```sql
select column_name, data_type from information_schema.columns
where table_name = 'materiais' order by ordinal_position;
```
Esperado: existe `sitio`, existe `notas`, **não** existe `data_prevista_encomenda`.
E confirmar que a view desapareceu:
```sql
select 1 from information_schema.views where table_name = 'materiais_com_estado';
```
Esperado: 0 linhas.

- [ ] **Step 4: Regenerar os types (via MCP, não CLI)**

`mcp__supabase__generate_typescript_types` → escrever a saída para um ficheiro temporário no scratchpad → copiar por cima de `src/lib/database.types.ts` com `cp` (o hook `check_generated.py` só bloqueia Write/Edit, não `cp`). Confirmar que o ficheiro começa com `export type Json =`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0014_materiais_refinamento.sql src/lib/database.types.ts
git commit -m "feat(db): migration 0014 — sitio + notas, remove data_encomenda e view de bloqueio"
```

---

### Task 2: Lógica pura — types, estado, validations

**Files:**
- Modify: `src/lib/materiais/types.ts`
- Modify: `src/lib/materiais/estado.ts`
- Modify: `src/lib/materiais/validations.ts`
- Test: `src/lib/materiais/estado.test.ts` (criar se não existir)
- Test: `src/lib/materiais/validations.test.ts` (criar se não existir)

**Interfaces:**
- Consumes: nada de tasks anteriores.
- Produces:
  - `type Sitio = 'em_armazem' | 'em_obra'` em `types.ts`.
  - `SITIOS: Sitio[]` e `sitioLabel(s: Sitio): string` em `estado.ts`.
  - `MaterialRow` sem `data_prevista_encomenda`, com `sitio: Sitio | null` e `notas: string[]`.
  - `materialPatchSchema` aceita `sitio` (enum nullable, opcional) e `notas` (array de strings, opcional); já **não** aceita `data_prevista_encomenda`.

- [ ] **Step 1: Escrever os testes que falham**

`src/lib/materiais/estado.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { SITIOS, sitioLabel } from './estado'

describe('sitio', () => {
  it('SITIOS tem os dois valores', () => {
    expect(SITIOS).toEqual(['em_armazem', 'em_obra'])
  })
  it('sitioLabel mapeia os dois valores', () => {
    expect(sitioLabel('em_armazem')).toBe('Em armazém')
    expect(sitioLabel('em_obra')).toBe('Em obra')
  })
})
```

`src/lib/materiais/validations.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { materialPatchSchema } from './validations'

describe('materialPatchSchema', () => {
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
```

- [ ] **Step 2: Correr os testes e confirmar que falham**

Run: `npx vitest run src/lib/materiais/estado.test.ts src/lib/materiais/validations.test.ts`
Esperado: FAIL (`SITIOS`/`sitioLabel` não existem; schema ainda tem `data_prevista_encomenda`).

- [ ] **Step 3: Atualizar `types.ts`**

```ts
export type EstadoMaterial = 'por_encomendar' | 'encomendado' | 'em_stock'
export type Sitio = 'em_armazem' | 'em_obra'

export interface MaterialRow {
  id: number
  apartamento_id: number
  categoria_id: number
  estado: EstadoMaterial
  sitio: Sitio | null
  localizacao: string | null
  data_prevista_aplicacao: string | null
  notas: string[]
}
```

- [ ] **Step 4: Atualizar `estado.ts`**

Acrescentar ao ficheiro (mantendo `ESTADOS`/`estadoLabel` inalterados):
```ts
import type { EstadoMaterial, Sitio } from '@/lib/materiais/types'

export const ESTADOS: EstadoMaterial[] = ['por_encomendar', 'encomendado', 'em_stock']

const LABELS: Record<EstadoMaterial, string> = {
  por_encomendar: 'Por encomendar',
  encomendado: 'Encomendado',
  em_stock: 'Em stock',
}

export function estadoLabel(e: EstadoMaterial): string {
  return LABELS[e]
}

export const SITIOS: Sitio[] = ['em_armazem', 'em_obra']

const SITIO_LABELS: Record<Sitio, string> = {
  em_armazem: 'Em armazém',
  em_obra: 'Em obra',
}

export function sitioLabel(s: Sitio): string {
  return SITIO_LABELS[s]
}
```

- [ ] **Step 5: Atualizar `validations.ts`**

Substituir `materialPatchSchema` (manter `categoriaSchema` e `mesmaApartamento`):
```ts
export const materialPatchSchema = z.object({
  estado: z.enum(['por_encomendar', 'encomendado', 'em_stock']).optional(),
  sitio: z.enum(['em_armazem', 'em_obra']).nullable().optional(),
  localizacao: z.string().max(200).nullable().optional(),
  data_prevista_aplicacao: z.string().date().nullable().optional(),
  notas: z.array(z.string().max(500)).optional(),
})
```

- [ ] **Step 6: Correr os testes e confirmar que passam**

Run: `npx vitest run src/lib/materiais/estado.test.ts src/lib/materiais/validations.test.ts`
Esperado: PASS (todos).

- [ ] **Step 7: Commit**

```bash
git add src/lib/materiais/
git commit -m "feat(materiais): sitio + notas na lógica pura; remove data_encomenda do schema"
```

---

### Task 3: UI — reescrever `tabela-materiais.tsx`

Sem teste local (client component; tsc/build no Vercel). Verificação: reviewer corre `tsc --noEmit` e valida no preview Vercel.

**Files:**
- Modify: `src/app/(app)/materiais/_components/tabela-materiais.tsx`

**Interfaces:**
- Consumes: `upsertMaterial(apId, categoriaId, patch)`, `addDependencia(materialId, outroId)`, `removeDependencia(materialId, outroId)` de `@/app/actions/materiais` (inalteradas — o `upsertMaterial` já espalha `parsed.data`, por isso `{ sitio }` e `{ notas }` fluem sem código novo). `ESTADOS`, `estadoLabel`, `SITIOS`, `sitioLabel` de `@/lib/materiais/estado`. `EstadoMaterial`, `Sitio` de `@/lib/materiais/types`.
- Produces: componente `TabelaMateriais` com as novas colunas.

- [ ] **Step 1: Atualizar imports, tipo de linha e leitura de dados**

- Importar `SITIOS, sitioLabel` (além de `ESTADOS, estadoLabel`) e `Sitio` (além de `EstadoMaterial`).
- Substituir `VistaRow` por um tipo que reflete a tabela `materiais` (sem `bloqueado`/`dependencias_pendentes`/`data_prevista_encomenda`; com `sitio`, `notas`):
```ts
interface MaterialLinha {
  id: number
  categoria_id: number
  estado: EstadoMaterial
  sitio: Sitio | null
  localizacao: string | null
  data_prevista_aplicacao: string | null
  notas: string[]
}
```
- Em `carregar`, ler da **tabela `materiais`** (a view foi removida):
```ts
const { data, error } = await supabase
  .from('materiais')
  .select('id, categoria_id, estado, sitio, localizacao, data_prevista_aplicacao, notas')
  .eq('apartamento_id', ap)
```
- Remover `paraVistaRow`/`MateriaisComEstadoRow*` (deixam de fazer sentido). Mapear cada `r` para `MaterialLinha` diretamente, ignorando linhas com `id`/`categoria_id`/`estado` nulos (defensivo, sem `any`). `notas: r.notas ?? []`, `sitio: (r.sitio as Sitio | null) ?? null`.
- Manter o carregamento de `deps` (ligações a categorias) de `material_dependencias` tal como está, e os `useMemo` `nomePorCategoria`/`categoriaPorMaterial`.

- [ ] **Step 2: Reescrever o cabeçalho e a ordem das colunas**

Cabeçalho (`<thead>`): `Categoria | Estado | Sítio | Localização | Data aplicação | Depende de`. Remover `Data encomenda` e `Bloqueio`. Ajustar o `colSpan` do placeholder "A carregar…" para **6**.

- [ ] **Step 3: Célula Estado (inalterada) + célula Sítio condicional**

- Estado: manter o `<select>` com `ESTADOS`/`estadoLabel`.
- Nova célula **Sítio**, a seguir a Estado:
```tsx
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
```

- [ ] **Step 4: Célula Localização condicional a em_stock**

```tsx
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
```

- [ ] **Step 5: Célula Data aplicação (sem aviso de bloqueio)**

```tsx
<td className="py-2 pr-3">
  <input
    type="date"
    className="border rounded px-2 py-1"
    defaultValue={row?.data_prevista_aplicacao ?? ''}
    onChange={e => editar(cat.id, { data_prevista_aplicacao: e.target.value || null })}
  />
</td>
```
Remover a célula `Data encomenda` e a célula `Bloqueio` (o `<span>` 🟡/🟢) por completo.

- [ ] **Step 6: Célula "Depende de" — ligações + notas linha a linha**

Substituir a antiga célula de Dependências. Mantém o mecanismo de ligações (lista com `[x]` + dropdown `+ categoria` + botão `Ligar`) e acrescenta as notas. As notas são geridas com um handler local que grava o array completo via `upsertMaterial`:
```tsx
async function gravarNotas(categoriaId: number, notas: string[]) {
  await editar(categoriaId, { notas })
}
```
Render (dentro do `!row ? aviso : (...)`):
```tsx
<div className="space-y-1">
  {/* ligações a categorias */}
  {depsAtuais.length > 0 && (
    <ul className="space-y-1">
      {depsAtuais.map(depMaterialId => {
        const depCategoriaId = categoriaPorMaterial.get(depMaterialId)
        const nome = depCategoriaId != null ? nomePorCategoria.get(depCategoriaId) : undefined
        return (
          <li key={depMaterialId} className="flex items-center gap-1">
            <span>• {nome ?? `#${depMaterialId}`}</span>
            <Button variant="ghost" size="icon-xs" onClick={() => removerDependencia(row.id, depMaterialId)}>×</Button>
          </li>
        )
      })}
    </ul>
  )}
  {/* notas livres, uma por linha */}
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
          >×</Button>
        </li>
      ))}
    </ul>
  )}
  {/* acoes */}
  <div className="flex items-center gap-1 flex-wrap">
    {candidatos.length > 0 && (
      <>
        <select
          className="border rounded px-2 py-1 text-xs"
          value={valorSelecionado}
          onChange={e => setNovaDependencia(prev => new Map(prev).set(cat.id, e.target.value))}
        >
          <option value="">+ categoria</option>
          {candidatos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <Button
          variant="outline" size="xs" disabled={!valorSelecionado}
          onClick={() => {
            const outra = rows.get(Number(valorSelecionado))
            if (!outra) return
            adicionarDependencia(row.id, outra.id)
            setNovaDependencia(prev => new Map(prev).set(cat.id, ''))
          }}
        >Ligar</Button>
      </>
    )}
    <Button
      variant="outline" size="xs"
      onClick={() => gravarNotas(cat.id, [...(row.notas ?? []), ''])}
    >+ nota</Button>
  </div>
</div>
```
Notas de implementação:
- `+ nota` adiciona uma string vazia; o input aparece e grava-se no `onBlur`. Notas vazias são filtradas ao gravar (evita acumular linhas em branco), exceto a que acabou de ser adicionada (essa fica visível até o utilizador escrever ou sair sem escrever — filtrar no gravar resolve).
- Remover toda a referência a `bloqueado`/`dependencias_pendentes`.
- `depsAtuais` continua a vir de `deps.get(row.id) ?? []`.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(app)/materiais/_components/tabela-materiais.tsx"
git commit -m "feat(materiais): coluna Sítio condicional, Depende de com ligações + notas, remove bloqueio e data encomenda"
```

---

## Notas de verificação final

- Não há mudança nas Server Actions: `upsertMaterial` já espalha `parsed.data`, por isso `sitio` e `notas` fluem só por incluí-los no schema (Task 2).
- Reviewer da Task 3 deve correr `npx tsc --noEmit` e validar o preview Vercel (Sítio/Localização só aparecem em stock; notas linha a linha; sem badge de bloqueio).
- `.superpowers/sdd/progress.md` a ser recriado para este plano no arranque da execução.
