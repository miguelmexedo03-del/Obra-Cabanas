# Relatório Executivo por AP (com LLM) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gerar um parágrafo executivo em prosa por apartamento, escrito por um LLM a partir de factos determinísticos, com fallback de template e instruções afináveis.

**Architecture:** Pipeline factos-primeiro — SQL/código determinístico calcula os factos (progresso, classificação de pintura, categorização), o LLM só escreve a prosa. Toda a lógica de negócio vive em **funções puras** (`src/lib/relatorio/*`, `src/lib/llm/*`) testáveis com Vitest sem arrancar o servidor. A UI e a server action são camadas finas por cima.

**Tech Stack:** Next.js 16 (App Router, Server Actions), TypeScript, Supabase (`@supabase/ssr`), Vitest (novo, dev-only), Google Gemini via `fetch` (sem SDK).

## Global Constraints

- UI em **PT-PT**, código e identificadores em **inglês**. Comentários de regra de negócio em PT-PT.
- Server Actions devolvem `{ success: true, ... } | { success: false, error: string }` — **nunca `throw`**.
- Server Components por defeito; Client Components só com estado/efeito/evento (`'use client'`).
- Cliente Supabase: `createClient` de `@/lib/supabase/server` (nunca o browser client em Server Components/Actions).
- **Sem `any`** — usar `unknown` + narrowing.
- **Sem novas dependências de runtime.** Vitest entra só como `devDependency`. **Sem SDK de LLM** — usar `fetch`.
- `apartamentos.id` é **`smallint`** (número em TS). Roles existentes: só **`admin`** e **`user`** (migrations 0006/0008). Escrita de config só `admin`.
- Reutilizar o trigger `set_updated_at()` já existente (migration 0001).
- **A chave do LLM fica server-side.** Env: `LLM_PROVIDER` (default `gemini`), `LLM_API_KEY`, `LLM_MODEL` (default `gemini-2.5-flash-lite`).
- **Factos-primeiro:** o único número com peso é `progresso_pct`, vindo do SQL. O LLM nunca inventa percentagens/totais/datas.

---

## File Structure

```
src/lib/relatorio/
  types.ts        # tipos partilhados (Facts, PinturaEstado, PendenteItem, RelatorioResult)
  classify.ts     # classifyPintura() — pura
  categorize.ts   # categorizarItem() — pura (fase/elemento/sub → categoria de artigo)
  facts.ts        # buildFacts() pura + getFacts() (query Supabase)
  prompt.ts       # DEFAULT_RULES + GOLDEN_EXAMPLE + composePrompt() pura
  template.ts     # renderTemplate() — pura (fallback determinístico)
  gerar.ts        # gerarRelatorio() — orquestra o pipeline com fallback
src/lib/llm/
  provider.ts     # interface LLMProvider + tipos
  gemini.ts       # GeminiProvider (fetch)
  index.ts        # getProvider() — factory por env var
src/lib/validations/
  relatorio.ts    # zod: instrucoesSchema
src/app/actions/
  relatorio.ts    # server actions: gerarRelatorioAction, previewRelatorioAction, gravarInstrucoesAction
src/app/(app)/relatorio/executivo/
  page.tsx                     # Server Component: carrega APs + instruções, monta UI
  _components/gerador.tsx      # Client: dropdown AP, gerar, copiar, lote 24
  config/page.tsx              # Server Component (admin): editor de instruções + preview
  config/_components/editor.tsx# Client: textarea + preview + gravar
supabase/migrations/
  0012_relatorio_config.sql    # tabela single-row + RLS
e2e/
  relatorio-executivo.spec.ts  # smoke (corre em CI/preview, não local)
vitest.config.ts               # config Vitest com alias @ -> src
```

---

## Task 1: Infraestrutura de testes unitários (Vitest)

**Files:**
- Modify: `package.json` (devDependencies + script `test:unit`)
- Create: `vitest.config.ts`
- Create: `src/lib/relatorio/smoke.test.ts` (apagado no fim da tarefa)

**Interfaces:**
- Produces: comando `npm run test:unit` funcional para todas as tarefas seguintes.

- [ ] **Step 1: Instalar Vitest (dev-only)**

Run: `npm install -D vitest@^2`
Expected: adiciona `vitest` a `devDependencies`, sem alterar dependencies de runtime.

- [ ] **Step 2: Criar `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
```

- [ ] **Step 3: Adicionar script ao `package.json`**

Em `"scripts"`, adicionar: `"test:unit": "vitest run"`

- [ ] **Step 4: Escrever um teste smoke temporário**

`src/lib/relatorio/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest'

describe('vitest infra', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 5: Correr e verificar que passa**

Run: `npm run test:unit`
Expected: PASS (1 test).

- [ ] **Step 6: Apagar o smoke e commit**

```bash
rm src/lib/relatorio/smoke.test.ts
git add package.json package-lock.json vitest.config.ts
git commit -m "test: add vitest for pure-logic unit tests"
```

---

## Task 2: Migration `relatorio_config`

**Files:**
- Create: `supabase/migrations/0012_relatorio_config.sql`

**Interfaces:**
- Produces: tabela `relatorio_config` single-row com `instrucoes_extra text`, lida por autenticados, escrita por `admin`.

- [ ] **Step 1: Escrever a migration**

`supabase/migrations/0012_relatorio_config.sql`:

```sql
-- Instruções avançadas do relatório executivo (single-row).
-- O texto aqui SOMA-SE às regras default do código (src/lib/relatorio/prompt.ts).
create table relatorio_config (
  id smallint primary key default 1 check (id = 1),
  instrucoes_extra text not null default '',
  updated_at timestamptz not null default now()
);

insert into relatorio_config (id) values (1) on conflict do nothing;

-- Reutiliza o trigger já existente
create trigger set_updated_at_relatorio_config
  before update on relatorio_config
  for each row execute function set_updated_at();

alter table relatorio_config enable row level security;

create policy "authenticated can read relatorio_config" on relatorio_config
  for select using (auth.uid() is not null);

create policy "admin can update relatorio_config" on relatorio_config
  for update using (current_user_role() = 'admin')
  with check (current_user_role() = 'admin');
```

- [ ] **Step 2: Aplicar em produção**

Aplicar via MCP Supabase `apply_migration` (project ref `larfdydhlbqupmllxunq`, name `relatorio_config`) OU `supabase db push` se autenticado. Confirmar que corre sem erro.

- [ ] **Step 3: Verificar**

Run (MCP `execute_sql` ou psql): `select id, instrucoes_extra from relatorio_config;`
Expected: 1 linha, `id=1`, `instrucoes_extra=''`.

- [ ] **Step 4: Regenerar tipos**

Run (autenticado): `npx supabase gen types typescript --linked > src/lib/database.types.ts`
**Atenção:** só redirecionar se o comando arrancou com tipos válidos (ver memória `supabase-gen-types-auth` — sem login, o erro corrompe o ficheiro). Em caso de dúvida, gerar para ficheiro temporário e só depois substituir.
Expected: `database.types.ts` inclui `relatorio_config` em `Tables`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0012_relatorio_config.sql src/lib/database.types.ts
git commit -m "feat(db): relatorio_config single-row table with admin-write RLS"
```

---

## Task 3: Tipos + classificação de pintura (puro)

**Files:**
- Create: `src/lib/relatorio/types.ts`
- Create: `src/lib/relatorio/classify.ts`
- Test: `src/lib/relatorio/classify.test.ts`

**Interfaces:**
- Produces:
  - `type PinturaEstado = 'pintura' | 'ultima_demao' | 'ok'`
  - `classifyPintura(pendingCoats: string[]): PinturaEstado`
  - tipos `PendenteItem`, `PinturaFacto`, `Facts`, `RelatorioResult` (consumidos por tarefas 4-9).

- [ ] **Step 1: Escrever os tipos partilhados**

`src/lib/relatorio/types.ts`:

```ts
export type PinturaEstado = 'pintura' | 'ultima_demao' | 'ok'

export interface PinturaFacto {
  divisao: string
  superficie: 'teto' | 'parede'
  estado: Exclude<PinturaEstado, 'ok'>
}

export interface PendenteItem {
  divisao: string
  categoria: string       // 'chão e rodapé', 'portas e aros', 'móveis', 'equipamentos de WC', ...
  elemento: string
  sub_elemento: string | null
  notas: string | null
}

export interface Facts {
  apartamento: string     // 'AP1'
  progresso_pct: number   // 39
  pintura: PinturaFacto[]
  pendentes: PendenteItem[]
}

export interface RelatorioResult {
  apartamento: string
  texto: string
  origem: 'llm' | 'template'
}
```

- [ ] **Step 2: Escrever o teste da classificação**

`src/lib/relatorio/classify.test.ts`:

```ts
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
```

- [ ] **Step 3: Correr o teste e ver falhar**

Run: `npm run test:unit -- classify`
Expected: FAIL (`classifyPintura` não existe).

- [ ] **Step 4: Implementar**

`src/lib/relatorio/classify.ts`:

```ts
import type { PinturaEstado } from '@/lib/relatorio/types'

// Regra destilada com o Miguel: só quando a ÚNICA demão pendente é a 2ª
// é que se diz "última demão". Qualquer coisa abaixo (primário, 1ª demão,
// extracoat) → "pintura". Ver spec §5 regra 2.
export function classifyPintura(pendingCoats: string[]): PinturaEstado {
  if (pendingCoats.length === 0) return 'ok'
  if (pendingCoats.length === 1 && pendingCoats[0] === '2ª demão') return 'ultima_demao'
  return 'pintura'
}
```

- [ ] **Step 5: Correr o teste e ver passar**

Run: `npm run test:unit -- classify`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/relatorio/types.ts src/lib/relatorio/classify.ts src/lib/relatorio/classify.test.ts
git commit -m "feat(relatorio): shared facts types + pintura coat classifier"
```

---

## Task 4: Categorização de itens (puro)

**Files:**
- Create: `src/lib/relatorio/categorize.ts`
- Test: `src/lib/relatorio/categorize.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `categorizarItem(fase: string, elemento: string, sub: string | null, divisao: string): string | null` — devolve a categoria de artigo, ou `null` se o item deve ser **omitido** do parágrafo (prep de pintura: tetos/remendos, dobrado na pintura).

- [ ] **Step 1: Escrever o teste**

`src/lib/relatorio/categorize.test.ts`:

```ts
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
```

- [ ] **Step 2: Correr e ver falhar**

Run: `npm run test:unit -- categorize`
Expected: FAIL.

- [ ] **Step 3: Implementar**

`src/lib/relatorio/categorize.ts`:

```ts
// Mapeia um elemento de checklist para a categoria de artigo usada no parágrafo
// (spec §5 regra 6). Devolve null quando o item deve ser OMITIDO — a prep de
// pintura (tratamento de juntas, remendos de teto e de paredes) dobra-se dentro
// da pintura e não se menciona (spec §5 regra 2). As fases de pintura
// ('Pintura Teto'/'Pintura Paredes') são tratadas à parte em buildFacts e nunca
// chegam aqui.
export function categorizarItem(
  fase: string,
  elemento: string,
  sub: string | null,
  divisao: string,
): string | null {
  const el = elemento.toLowerCase()
  const d = divisao.toLowerCase()

  // Ar condicionado / bomba de calor — por elemento, independentemente da fase
  if (el.includes('ar condicionado')) return 'ar condicionado'
  if (el.includes('bomba de calor') || el.includes('bomba')) return 'bomba de calor'

  switch (fase) {
    case 'Teto':
    case 'Remendos Teto':
    case 'Remendo Paredes':
      return null // prep de pintura — dobrada na pintura, não mencionar

    case 'Chão e Rodapé':
      return 'chão e rodapé'

    case 'Portas':
      return 'portas e aros'

    case 'Móveis': {
      if (d.includes('cozinha')) return 'móveis de cozinha'
      if (d.includes('wc')) return 'móveis de WC'
      return 'móveis de quarto'
    }

    case 'Eletrodomésticos':
      return 'eletrodomésticos'

    case 'WC Equipamentos':
      return 'equipamentos de WC'

    case 'Paredes': {
      const s = (sub ?? '').toLowerCase()
      if (s.includes('pladur') || s.includes('pedra')) return 'pladur e pedra'
      return 'defeito'
    }

    default:
      return 'outros'
  }
}
```

- [ ] **Step 4: Correr e ver passar**

Run: `npm run test:unit -- categorize`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/relatorio/categorize.ts src/lib/relatorio/categorize.test.ts
git commit -m "feat(relatorio): deterministic item categorization by fase/elemento/divisao"
```

---

## Task 5: Construção dos factos (puro + query)

**Files:**
- Create: `src/lib/relatorio/facts.ts`
- Test: `src/lib/relatorio/facts.test.ts`

**Interfaces:**
- Consumes: `classifyPintura` (T3), `categorizarItem` (T4), tipos (T3).
- Produces:
  - `type RawRow = { divisao: string; fase: string; elemento: string; sub_elemento: string | null; notas: string | null }`
  - `buildFacts(apartamento: string, progressoPct: number, rows: RawRow[]): Facts` — pura.
  - `getFacts(apartamentoId: number): Promise<Facts>` — query Supabase + `buildFacts`.

- [ ] **Step 1: Escrever o teste da parte pura (fixture AP1 reduzido)**

`src/lib/relatorio/facts.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildFacts, type RawRow } from '@/lib/relatorio/facts'

const rows: RawRow[] = [
  // Pintura Teto — Sala: só 2ª demão pendente → ultima_demao
  { divisao: 'Sala', fase: 'Pintura Teto', elemento: 'Teto', sub_elemento: '2ª demão', notas: null },
  // Pintura Teto — Cozinha: 1ª demão + 2ª demão → pintura
  { divisao: 'Cozinha', fase: 'Pintura Teto', elemento: 'Teto', sub_elemento: '1ª demão', notas: null },
  { divisao: 'Cozinha', fase: 'Pintura Teto', elemento: 'Teto', sub_elemento: '2ª demão', notas: null },
  // Prep de pintura — omitida
  { divisao: 'Sala', fase: 'Teto', elemento: 'Teto', sub_elemento: 'Tratamento de Junta', notas: null },
  { divisao: 'Sala', fase: 'Remendos Teto', elemento: 'Teto', sub_elemento: 'Remendo foco', notas: null },
  // Chão
  { divisao: 'Sala', fase: 'Chão e Rodapé', elemento: 'Chão', sub_elemento: null, notas: null },
  // Defeito com nota
  { divisao: 'Suite 1', fase: 'Paredes', elemento: 'Paredes', sub_elemento: 'Buraco na parede', notas: 'reparar antes de pintar' },
]

describe('buildFacts', () => {
  const facts = buildFacts('AP1', 39, rows)

  it('mantém o progresso do SQL', () => {
    expect(facts.apartamento).toBe('AP1')
    expect(facts.progresso_pct).toBe(39)
  })

  it('classifica pintura por divisão+superfície', () => {
    const sala = facts.pintura.find(p => p.divisao === 'Sala' && p.superficie === 'teto')
    const cozinha = facts.pintura.find(p => p.divisao === 'Cozinha' && p.superficie === 'teto')
    expect(sala?.estado).toBe('ultima_demao')
    expect(cozinha?.estado).toBe('pintura')
  })

  it('omite a prep de pintura dos pendentes', () => {
    const temPrep = facts.pendentes.some(p => p.sub_elemento === 'Tratamento de Junta' || p.sub_elemento === 'Remendo foco')
    expect(temPrep).toBe(false)
  })

  it('inclui chão e defeitos (com notas) nos pendentes', () => {
    expect(facts.pendentes.find(p => p.categoria === 'chão e rodapé')).toBeTruthy()
    const defeito = facts.pendentes.find(p => p.categoria === 'defeito')
    expect(defeito?.notas).toBe('reparar antes de pintar')
  })
})
```

- [ ] **Step 2: Correr e ver falhar**

Run: `npm run test:unit -- facts`
Expected: FAIL.

- [ ] **Step 3: Implementar `buildFacts` + `getFacts`**

`src/lib/relatorio/facts.ts`:

```ts
import { createClient } from '@/lib/supabase/server'
import { classifyPintura } from '@/lib/relatorio/classify'
import { categorizarItem } from '@/lib/relatorio/categorize'
import type { Facts, PinturaFacto, PendenteItem } from '@/lib/relatorio/types'

export interface RawRow {
  divisao: string
  fase: string
  elemento: string
  sub_elemento: string | null
  notas: string | null
}

const FASES_PINTURA = new Set(['Pintura Teto', 'Pintura Paredes'])

// Pura: transforma linhas de elementos pendentes nos factos que o LLM recebe.
export function buildFacts(apartamento: string, progressoPct: number, rows: RawRow[]): Facts {
  // 1) Pintura — agrupar demãos pendentes por (divisão, superfície) e classificar
  const coats = new Map<string, string[]>() // chave `${divisao}||${superficie}`
  for (const r of rows) {
    if (!FASES_PINTURA.has(r.fase)) continue
    const superficie = r.fase === 'Pintura Teto' ? 'teto' : 'parede'
    const key = `${r.divisao}||${superficie}`
    const arr = coats.get(key) ?? []
    if (r.sub_elemento) arr.push(r.sub_elemento)
    coats.set(key, arr)
  }
  const pintura: PinturaFacto[] = []
  for (const [key, pending] of coats) {
    const [divisao, superficie] = key.split('||') as [string, 'teto' | 'parede']
    const estado = classifyPintura(pending)
    if (estado !== 'ok') pintura.push({ divisao, superficie, estado })
  }

  // 2) Restantes itens — categorizar; null = omitir (prep de pintura)
  const pendentes: PendenteItem[] = []
  for (const r of rows) {
    if (FASES_PINTURA.has(r.fase)) continue
    const categoria = categorizarItem(r.fase, r.elemento, r.sub_elemento, r.divisao)
    if (categoria === null) continue
    pendentes.push({
      divisao: r.divisao,
      categoria,
      elemento: r.elemento,
      sub_elemento: r.sub_elemento,
      notas: r.notas,
    })
  }

  return { apartamento, progresso_pct: progressoPct, pintura, pendentes }
}

// Query: lê progresso + itens pendentes do AP e devolve os factos.
export async function getFacts(apartamentoId: number): Promise<Facts> {
  const supabase = await createClient()

  const [{ data: apRow }, { data: progRow }, { data: elementos }] = await Promise.all([
    supabase.from('apartamentos').select('codigo').eq('id', apartamentoId).single(),
    supabase.from('progresso_por_apartamento').select('percentagem').eq('apartamento_id', apartamentoId).single(),
    supabase
      .from('elementos')
      .select('elemento, sub_elemento, notas, fase_id, fases(nome), divisoes(nome)')
      .eq('apartamento_id', apartamentoId)
      .eq('concluido', false),
  ])

  const codigo = apRow?.codigo ?? `AP${apartamentoId}`
  const progressoPct = Math.round((progRow?.percentagem ?? 0) * 100)

  const rows: RawRow[] = (elementos ?? []).map((e) => ({
    divisao: (e.divisoes as { nome: string } | null)?.nome ?? 'Sem divisão',
    fase: (e.fases as { nome: string } | null)?.nome ?? '',
    elemento: e.elemento,
    sub_elemento: e.sub_elemento,
    notas: e.notas,
  }))

  return buildFacts(codigo, progressoPct, rows)
}
```

> **Nota:** os nomes exactos das relações (`fases(nome)`, `divisoes(nome)`) e os tipos gerados podem exigir um cast conforme o `database.types.ts`. Ajustar o narrowing do `map` ao que o cliente Supabase devolve; manter **sem `any`**.

- [ ] **Step 4: Correr e ver passar**

Run: `npm run test:unit -- facts`
Expected: PASS.

- [ ] **Step 5: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: exit 0 (sem erros novos).

- [ ] **Step 6: Commit**

```bash
git add src/lib/relatorio/facts.ts src/lib/relatorio/facts.test.ts
git commit -m "feat(relatorio): buildFacts (pure) + getFacts (supabase query)"
```

---

## Task 6: Prompt default + composição (puro)

**Files:**
- Create: `src/lib/relatorio/prompt.ts`
- Test: `src/lib/relatorio/prompt.test.ts`

**Interfaces:**
- Consumes: `Facts` (T3).
- Produces:
  - `DEFAULT_RULES: string` (as 6 regras + exemplo dourado)
  - `composePrompt(facts: Facts, instrucoesExtra: string): { system: string; user: string }`

- [ ] **Step 1: Escrever o teste**

`src/lib/relatorio/prompt.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { composePrompt, DEFAULT_RULES } from '@/lib/relatorio/prompt'
import type { Facts } from '@/lib/relatorio/types'

const facts: Facts = {
  apartamento: 'AP1',
  progresso_pct: 39,
  pintura: [{ divisao: 'Cozinha', superficie: 'teto', estado: 'pintura' }],
  pendentes: [{ divisao: 'Cozinha', categoria: 'eletrodomésticos', elemento: 'Eletrodomésticos', sub_elemento: null, notas: null }],
}

describe('composePrompt', () => {
  it('inclui as regras default no system', () => {
    const { system } = composePrompt(facts, '')
    expect(system).toContain(DEFAULT_RULES)
  })
  it('soma as instruções extra quando existem', () => {
    const { system } = composePrompt(facts, 'Escreve em maiúsculas.')
    expect(system).toContain('Escreve em maiúsculas.')
  })
  it('mete os factos como JSON no user', () => {
    const { user } = composePrompt(facts, '')
    expect(user).toContain('"progresso_pct": 39')
    expect(user).toContain('AP1')
  })
})
```

- [ ] **Step 2: Correr e ver falhar**

Run: `npm run test:unit -- prompt`
Expected: FAIL.

- [ ] **Step 3: Implementar**

`src/lib/relatorio/prompt.ts`:

```ts
import type { Facts } from '@/lib/relatorio/types'

// Regras destiladas com o Miguel (spec §5). Este texto é o "treino" default do LLM.
export const DEFAULT_RULES = `És um assistente que escreve um resumo de obra, um parágrafo por apartamento, em português europeu, para o dono da obra ler rapidamente. Recebes FACTOS em JSON e escreves SÓ prosa. Regras:

1. Generaliza sempre. Agrupa por tipo de divisão (suites/quartos, WCs, cozinha, sala, varanda). Nunca listes divisões individuais pelo nome; podes usar números ("os dois WCs", "as duas suites").
2. Pintura: cada entrada em "pintura" traz o estado já classificado — "ultima_demao" diz-se "última demão"; "pintura" diz-se "pintura". Não menciones tratamento de juntas nem remendos (já estão dobrados na pintura).
3. Móveis: separa quartos / cozinha / WC. Nos móveis de cozinha, acrescenta que podem faltar as portas.
4. Chão e rodapé: junta numa frase.
5. Defeitos e comentários (campo "notas" ou categoria "defeito"): inclui sempre, escritos com jeito.
6. Ordem das categorias no parágrafo: pintura, chão e rodapé, portas e aros, móveis, pladur e pedra, equipamentos de WC, eletrodomésticos, ar condicionado, bomba de calor. Omite categorias sem itens.
7. Nunca inventes números, percentagens ou datas. Usa só o "progresso_pct" fornecido. Um único parágrafo, sem títulos nem listas.

Exemplo dourado (AP1, factos reais):
"AP1 — 39% concluído. Falta pintura na cozinha, na varanda e nos dois WCs (tetos e paredes); a sala e as duas suites só precisam da última demão. Chão e rodapé: falta o chão na sala, nas suites, na varanda e num WC, e os rodapés na sala e nas suites. Faltam as portas e aros das duas suites e dos dois WCs. Móveis: faltam os dos quartos (2 suites) e dos dois WCs. Falta ainda pladur (num WC e na cozinha) e pedra (num WC e na varanda). Os dois WCs estão por completar — lavatório, sanita, chuveiro higiénico, rampa e resguardo de duche. Faltam os eletrodomésticos da cozinha. A registar: há um buraco por reparar numa parede de suite e as divisórias da varanda por fechar."`

export function composePrompt(facts: Facts, instrucoesExtra: string): { system: string; user: string } {
  const extra = instrucoesExtra.trim()
  const system = extra ? `${DEFAULT_RULES}\n\nInstruções adicionais do utilizador (têm prioridade):\n${extra}` : DEFAULT_RULES
  const user = `Factos do apartamento (JSON):\n${JSON.stringify(facts, null, 2)}\n\nEscreve o parágrafo.`
  return { system, user }
}
```

- [ ] **Step 4: Correr e ver passar**

Run: `npm run test:unit -- prompt`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/relatorio/prompt.ts src/lib/relatorio/prompt.test.ts
git commit -m "feat(relatorio): default LLM rules + prompt composition"
```

---

## Task 7: Template de fallback (puro)

**Files:**
- Create: `src/lib/relatorio/template.ts`
- Test: `src/lib/relatorio/template.test.ts`

**Interfaces:**
- Consumes: `Facts` (T3).
- Produces: `renderTemplate(facts: Facts): string` — prosa determinística, feia mas funcional.

- [ ] **Step 1: Escrever o teste**

`src/lib/relatorio/template.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { renderTemplate } from '@/lib/relatorio/template'
import type { Facts } from '@/lib/relatorio/types'

const facts: Facts = {
  apartamento: 'AP1',
  progresso_pct: 39,
  pintura: [
    { divisao: 'Cozinha', superficie: 'teto', estado: 'pintura' },
    { divisao: 'Sala', superficie: 'parede', estado: 'ultima_demao' },
  ],
  pendentes: [
    { divisao: 'Cozinha', categoria: 'eletrodomésticos', elemento: 'Eletrodomésticos', sub_elemento: null, notas: null },
    { divisao: 'Suite 1', categoria: 'defeito', elemento: 'Paredes', sub_elemento: 'Buraco na parede', notas: null },
  ],
}

describe('renderTemplate', () => {
  const txt = renderTemplate(facts)
  it('começa com o AP e o progresso', () => {
    expect(txt).toContain('AP1')
    expect(txt).toContain('39%')
  })
  it('menciona pintura e última demão', () => {
    expect(txt.toLowerCase()).toContain('pintura')
    expect(txt.toLowerCase()).toContain('última demão')
  })
  it('lista categorias pendentes', () => {
    expect(txt.toLowerCase()).toContain('eletrodomésticos')
  })
  it('nunca fica vazio', () => {
    expect(txt.length).toBeGreaterThan(20)
  })
})
```

- [ ] **Step 2: Correr e ver falhar**

Run: `npm run test:unit -- template`
Expected: FAIL.

- [ ] **Step 3: Implementar**

`src/lib/relatorio/template.ts`:

```ts
import type { Facts, PinturaFacto } from '@/lib/relatorio/types'

const ORDEM_CATEGORIAS = [
  'chão e rodapé', 'portas e aros', 'móveis de quarto', 'móveis de cozinha',
  'móveis de WC', 'pladur e pedra', 'equipamentos de WC', 'eletrodomésticos',
  'ar condicionado', 'bomba de calor', 'defeito', 'outros',
]

function frasePintura(pintura: PinturaFacto[]): string {
  if (pintura.length === 0) return ''
  const completa = pintura.filter(p => p.estado === 'pintura').map(p => `${p.divisao} (${p.superficie})`)
  const ultima = pintura.filter(p => p.estado === 'ultima_demao').map(p => `${p.divisao} (${p.superficie})`)
  const partes: string[] = []
  if (completa.length) partes.push(`falta pintura em ${completa.join(', ')}`)
  if (ultima.length) partes.push(`falta a última demão em ${ultima.join(', ')}`)
  return partes.join('; ')
}

// Fallback determinístico. Sem LLM: agrupa por categoria e enumera divisões.
export function renderTemplate(facts: Facts): string {
  const frases: string[] = [`${facts.apartamento} — ${facts.progresso_pct}% concluído.`]

  const p = frasePintura(facts.pintura)
  if (p) frases.push(p.charAt(0).toUpperCase() + p.slice(1) + '.')

  const porCategoria = new Map<string, string[]>()
  for (const item of facts.pendentes) {
    const arr = porCategoria.get(item.categoria) ?? []
    const rotulo = item.sub_elemento ? `${item.divisao} (${item.sub_elemento})` : item.divisao
    if (!arr.includes(rotulo)) arr.push(rotulo)
    porCategoria.set(item.categoria, arr)
  }

  const ordenadas = [...porCategoria.keys()].sort(
    (a, b) => ORDEM_CATEGORIAS.indexOf(a) - ORDEM_CATEGORIAS.indexOf(b),
  )
  for (const cat of ordenadas) {
    const divs = porCategoria.get(cat)!
    const label = cat === 'defeito' ? 'A registar' : cat.charAt(0).toUpperCase() + cat.slice(1)
    frases.push(`${label}: ${divs.join(', ')}.`)
  }

  return frases.join(' ')
}
```

- [ ] **Step 4: Correr e ver passar**

Run: `npm run test:unit -- template`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/relatorio/template.ts src/lib/relatorio/template.test.ts
git commit -m "feat(relatorio): deterministic template fallback renderer"
```

---

## Task 8: Adapter de LLM (interface + Gemini + factory)

**Files:**
- Create: `src/lib/llm/provider.ts`
- Create: `src/lib/llm/gemini.ts`
- Create: `src/lib/llm/index.ts`
- Test: `src/lib/llm/gemini.test.ts`

**Interfaces:**
- Produces:
  - `interface LLMProvider { generate(system: string, user: string): Promise<string> }`
  - `class GeminiProvider implements LLMProvider` (recebe `apiKey`, `model`, opcional `fetchImpl`)
  - `getProvider(): LLMProvider` — lê `LLM_PROVIDER`/`LLM_API_KEY`/`LLM_MODEL`.

- [ ] **Step 1: Escrever a interface**

`src/lib/llm/provider.ts`:

```ts
export interface LLMProvider {
  generate(system: string, user: string): Promise<string>
}

export type FetchImpl = typeof fetch
```

- [ ] **Step 2: Escrever o teste do Gemini (fetch mockado)**

`src/lib/llm/gemini.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { GeminiProvider } from '@/lib/llm/gemini'

describe('GeminiProvider', () => {
  it('extrai o texto da resposta da API', async () => {
    const fakeFetch = vi.fn(async () => new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: 'Parágrafo gerado.' }] } }],
    }), { status: 200 }))
    const p = new GeminiProvider('KEY', 'gemini-2.5-flash-lite', fakeFetch)
    const out = await p.generate('sys', 'usr')
    expect(out).toBe('Parágrafo gerado.')
    expect(fakeFetch).toHaveBeenCalledOnce()
  })

  it('lança em erro HTTP (para o orquestrador cair no template)', async () => {
    const fakeFetch = vi.fn(async () => new Response('quota', { status: 429 }))
    const p = new GeminiProvider('KEY', 'gemini-2.5-flash-lite', fakeFetch)
    await expect(p.generate('sys', 'usr')).rejects.toThrow()
  })
})
```

- [ ] **Step 3: Correr e ver falhar**

Run: `npm run test:unit -- gemini`
Expected: FAIL.

- [ ] **Step 4: Implementar Gemini + factory**

`src/lib/llm/gemini.ts`:

```ts
import type { LLMProvider, FetchImpl } from '@/lib/llm/provider'

// Chama a API Gemini via REST (sem SDK). system+user via um único prompt.
export class GeminiProvider implements LLMProvider {
  constructor(
    private apiKey: string,
    private model: string,
    private fetchImpl: FetchImpl = fetch,
  ) {}

  async generate(system: string, user: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`
    const body = {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: { temperature: 0.4 },
    }
    const res = await this.fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`)
    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[]
    }
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) throw new Error('Gemini: resposta sem texto')
    return text.trim()
  }
}
```

`src/lib/llm/index.ts`:

```ts
import type { LLMProvider } from '@/lib/llm/provider'
import { GeminiProvider } from '@/lib/llm/gemini'

// Factory agnóstica: o fornecedor é uma env var. Trocar de fornecedor = mudar
// LLM_PROVIDER/LLM_API_KEY no Vercel, zero código (spec §6).
export function getProvider(): LLMProvider {
  const provider = process.env.LLM_PROVIDER ?? 'gemini'
  const apiKey = process.env.LLM_API_KEY ?? ''
  const model = process.env.LLM_MODEL ?? 'gemini-2.5-flash-lite'

  switch (provider) {
    case 'gemini':
      return new GeminiProvider(apiKey, model)
    default:
      throw new Error(`LLM_PROVIDER desconhecido: ${provider}`)
  }
}
```

- [ ] **Step 5: Correr e ver passar**

Run: `npm run test:unit -- gemini`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/llm/provider.ts src/lib/llm/gemini.ts src/lib/llm/index.ts src/lib/llm/gemini.test.ts
git commit -m "feat(llm): provider interface + Gemini (fetch) + env-var factory"
```

---

## Task 9: Orquestrador com fallback

**Files:**
- Create: `src/lib/relatorio/gerar.ts`
- Test: `src/lib/relatorio/gerar.test.ts`

**Interfaces:**
- Consumes: `Facts` (T3), `composePrompt` (T6), `renderTemplate` (T7), `LLMProvider` (T8).
- Produces: `gerarDeFactos(facts: Facts, instrucoesExtra: string, provider: LLMProvider): Promise<RelatorioResult>` — pura em relação a I/O (recebe o provider injetado).

- [ ] **Step 1: Escrever o teste (sucesso e fallback)**

`src/lib/relatorio/gerar.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { gerarDeFactos } from '@/lib/relatorio/gerar'
import type { Facts } from '@/lib/relatorio/types'
import type { LLMProvider } from '@/lib/llm/provider'

const facts: Facts = {
  apartamento: 'AP1', progresso_pct: 39,
  pintura: [], pendentes: [{ divisao: 'Cozinha', categoria: 'eletrodomésticos', elemento: 'Eletrodomésticos', sub_elemento: null, notas: null }],
}

const ok: LLMProvider = { generate: async () => 'Prosa do LLM.' }
const falha: LLMProvider = { generate: async () => { throw new Error('quota') } }

describe('gerarDeFactos', () => {
  it('usa o LLM quando funciona', async () => {
    const r = await gerarDeFactos(facts, '', ok)
    expect(r.origem).toBe('llm')
    expect(r.texto).toBe('Prosa do LLM.')
  })
  it('cai no template quando o LLM falha', async () => {
    const r = await gerarDeFactos(facts, '', falha)
    expect(r.origem).toBe('template')
    expect(r.texto).toContain('AP1')
  })
})
```

- [ ] **Step 2: Correr e ver falhar**

Run: `npm run test:unit -- gerar`
Expected: FAIL.

- [ ] **Step 3: Implementar**

`src/lib/relatorio/gerar.ts`:

```ts
import { composePrompt } from '@/lib/relatorio/prompt'
import { renderTemplate } from '@/lib/relatorio/template'
import type { Facts, RelatorioResult } from '@/lib/relatorio/types'
import type { LLMProvider } from '@/lib/llm/provider'

// Pipeline factos → prosa, com fallback determinístico. Nunca lança:
// se o LLM falhar, devolve o template. O `origem` diz sempre a proveniência.
export async function gerarDeFactos(
  facts: Facts,
  instrucoesExtra: string,
  provider: LLMProvider,
): Promise<RelatorioResult> {
  const { system, user } = composePrompt(facts, instrucoesExtra)
  try {
    const texto = await provider.generate(system, user)
    if (!texto.trim()) throw new Error('LLM devolveu vazio')
    return { apartamento: facts.apartamento, texto, origem: 'llm' }
  } catch {
    return { apartamento: facts.apartamento, texto: renderTemplate(facts), origem: 'template' }
  }
}
```

- [ ] **Step 4: Correr e ver passar**

Run: `npm run test:unit -- gerar`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/relatorio/gerar.ts src/lib/relatorio/gerar.test.ts
git commit -m "feat(relatorio): orchestrator with template fallback (never throws)"
```

---

## Task 10: Server actions + validação

**Files:**
- Create: `src/lib/validations/relatorio.ts`
- Create: `src/app/actions/relatorio.ts`

**Interfaces:**
- Consumes: `getFacts` (T5), `gerarDeFactos` (T9), `getProvider` (T8).
- Produces (Server Actions):
  - `gerarRelatorioAction(apartamentoId: number): Promise<{ success: true; data: RelatorioResult } | { success: false; error: string }>`
  - `previewRelatorioAction(apartamentoId: number, instrucoesRascunho: string): Promise<...mesmo shape...>`
  - `gravarInstrucoesAction(instrucoes: string): Promise<{ success: true } | { success: false; error: string }>`
  - helper interno `lerInstrucoes(): Promise<string>`

- [ ] **Step 1: Zod schema**

`src/lib/validations/relatorio.ts`:

```ts
import { z } from 'zod'

export const instrucoesSchema = z.object({
  instrucoes: z.string().max(4000, 'Máximo 4000 caracteres.'),
})
```

- [ ] **Step 2: Implementar as actions**

`src/app/actions/relatorio.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getFacts } from '@/lib/relatorio/facts'
import { gerarDeFactos } from '@/lib/relatorio/gerar'
import { getProvider } from '@/lib/llm'
import { instrucoesSchema } from '@/lib/validations/relatorio'
import type { RelatorioResult } from '@/lib/relatorio/types'

type Result<T> = { success: true; data: T } | { success: false; error: string }
type Ok = { success: true } | { success: false; error: string }

async function lerInstrucoes(): Promise<string> {
  const supabase = await createClient()
  const { data } = await supabase.from('relatorio_config').select('instrucoes_extra').eq('id', 1).single()
  return data?.instrucoes_extra ?? ''
}

export async function gerarRelatorioAction(apartamentoId: number): Promise<Result<RelatorioResult>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autenticado.' }

  try {
    const [facts, instrucoes] = await Promise.all([getFacts(apartamentoId), lerInstrucoes()])
    const data = await gerarDeFactos(facts, instrucoes, getProvider())
    return { success: true, data }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Erro ao gerar.' }
  }
}

export async function previewRelatorioAction(
  apartamentoId: number,
  instrucoesRascunho: string,
): Promise<Result<RelatorioResult>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autenticado.' }

  try {
    const facts = await getFacts(apartamentoId)
    const data = await gerarDeFactos(facts, instrucoesRascunho, getProvider())
    return { success: true, data }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Erro ao gerar.' }
  }
}

export async function gravarInstrucoesAction(instrucoes: string): Promise<Ok> {
  const parsed = instrucoesSchema.safeParse({ instrucoes })
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Inválido.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autenticado.' }

  // RLS já garante que só admin escreve; o erro do update reflete isso.
  const { error } = await supabase.from('relatorio_config').update({ instrucoes_extra: parsed.data.instrucoes }).eq('id', 1)
  if (error) return { success: false, error: 'Sem permissão ou erro ao gravar.' }
  revalidatePath('/relatorio/executivo', 'layout')
  return { success: true }
}
```

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/lib/validations/relatorio.ts src/app/actions/relatorio.ts
git commit -m "feat(relatorio): server actions (gerar, preview, gravar instrucoes)"
```

---

## Task 11: UI — página do gerador (1 AP + copiar)

**Files:**
- Create: `src/app/(app)/relatorio/executivo/page.tsx`
- Create: `src/app/(app)/relatorio/executivo/_components/gerador.tsx`

**Interfaces:**
- Consumes: `gerarRelatorioAction` (T10).
- Produces: rota `/relatorio/executivo` que gera e mostra o parágrafo de um AP e permite copiar.

- [ ] **Step 1: Server Component que carrega os APs**

`src/app/(app)/relatorio/executivo/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { Gerador } from './_components/gerador'

export default async function RelatorioExecutivoPage() {
  const supabase = await createClient()
  const { data: apartamentos } = await supabase.from('apartamentos').select('id, codigo').order('id')

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Relatório Executivo</h1>
      <p className="text-sm text-muted-foreground">Um parágrafo por apartamento, gerado a partir do estado atual da obra.</p>
      <Gerador apartamentos={apartamentos ?? []} />
    </div>
  )
}
```

- [ ] **Step 2: Client component do gerador**

`src/app/(app)/relatorio/executivo/_components/gerador.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { gerarRelatorioAction } from '@/app/actions/relatorio'
import type { RelatorioResult } from '@/lib/relatorio/types'

interface Props {
  apartamentos: { id: number; codigo: string }[]
}

export function Gerador({ apartamentos }: Props) {
  const [apId, setApId] = useState<number>(apartamentos[0]?.id ?? 1)
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState<RelatorioResult | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  async function gerar() {
    setLoading(true); setErro(null); setResultado(null)
    const r = await gerarRelatorioAction(apId)
    if (r.success) setResultado(r.data)
    else setErro(r.error)
    setLoading(false)
  }

  function copiar() {
    if (resultado) navigator.clipboard.writeText(resultado.texto)
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center gap-2">
        <select className="border rounded px-3 py-2" value={apId} onChange={(e) => setApId(Number(e.target.value))}>
          {apartamentos.map((a) => <option key={a.id} value={a.id}>{a.codigo}</option>)}
        </select>
        <button className="border rounded px-4 py-2 bg-primary text-primary-foreground disabled:opacity-50" onClick={gerar} disabled={loading}>
          {loading ? 'A gerar…' : 'Gerar'}
        </button>
      </div>

      {erro && <p className="text-sm text-destructive">{erro}</p>}

      {resultado && (
        <div className="border rounded p-4 space-y-2">
          {resultado.origem === 'template' && (
            <p className="text-xs text-amber-600">⚠ Gerado por template (LLM indisponível).</p>
          )}
          <p className="whitespace-pre-wrap leading-relaxed">{resultado.texto}</p>
          <button className="text-sm underline" onClick={copiar}>Copiar</button>
        </div>
      )}
    </div>
  )
}
```

> Usar componentes `shadcn/ui` (`Button`, `Select`) se já instalados no projeto, mantendo o padrão existente; o markup acima é o comportamento mínimo e pode ser adaptado ao design system.

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/relatorio/executivo/page.tsx" "src/app/(app)/relatorio/executivo/_components/gerador.tsx"
git commit -m "feat(relatorio): executivo page — generate one AP + copy"
```

---

## Task 12: UI — lote dos 24 (com espaçamento)

**Files:**
- Modify: `src/app/(app)/relatorio/executivo/_components/gerador.tsx`

**Interfaces:**
- Consumes: `gerarRelatorioAction` (T10).
- Produces: botão "Gerar obra toda" que percorre os APs em série com espaçamento e mostra todos os parágrafos, com "Copiar tudo".

- [ ] **Step 1: Adicionar estado e função de lote ao `Gerador`**

Adicionar dentro do componente `Gerador` (a seguir ao estado existente):

```tsx
  const [lote, setLote] = useState<RelatorioResult[]>([])
  const [progresso, setProgresso] = useState<string | null>(null)

  const delay = (ms: number) => new Promise((res) => setTimeout(res, ms))

  async function gerarObraToda() {
    setLoading(true); setErro(null); setLote([]); setResultado(null)
    const acc: RelatorioResult[] = []
    for (let i = 0; i < apartamentos.length; i++) {
      const a = apartamentos[i]
      setProgresso(`A gerar ${a.codigo} (${i + 1} de ${apartamentos.length})…`)
      const r = await gerarRelatorioAction(a.id)
      if (r.success) acc.push(r.data)
      else acc.push({ apartamento: a.codigo, texto: `(erro: ${r.error})`, origem: 'template' })
      setLote([...acc])
      // Espaçamento para respeitar 15 pedidos/min do Gemini free tier (spec §8)
      if (i < apartamentos.length - 1) await delay(4000)
    }
    setProgresso(null); setLoading(false)
  }

  function copiarTudo() {
    navigator.clipboard.writeText(lote.map((r) => r.texto).join('\n\n'))
  }
```

- [ ] **Step 2: Adicionar o botão e a lista ao JSX**

No JSX do `Gerador`, a seguir ao botão "Gerar", acrescentar:

```tsx
        <button className="border rounded px-4 py-2 disabled:opacity-50" onClick={gerarObraToda} disabled={loading}>
          Gerar obra toda
        </button>
```

E, no fim do componente (antes do `</div>` exterior), a lista do lote:

```tsx
      {progresso && <p className="text-sm text-muted-foreground">{progresso}</p>}

      {lote.length > 0 && (
        <div className="space-y-3">
          <button className="text-sm underline" onClick={copiarTudo}>Copiar tudo</button>
          {lote.map((r) => (
            <div key={r.apartamento} className="border rounded p-4">
              {r.origem === 'template' && <p className="text-xs text-amber-600">⚠ Template</p>}
              <p className="whitespace-pre-wrap leading-relaxed">{r.texto}</p>
            </div>
          ))}
        </div>
      )}
```

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/relatorio/executivo/_components/gerador.tsx"
git commit -m "feat(relatorio): batch-generate all 24 APs with rate-limit spacing"
```

---

## Task 13: UI — config avançada (admin) + preview

**Files:**
- Create: `src/app/(app)/relatorio/executivo/config/page.tsx`
- Create: `src/app/(app)/relatorio/executivo/config/_components/editor.tsx`

**Interfaces:**
- Consumes: `previewRelatorioAction`, `gravarInstrucoesAction` (T10), `lerInstrucoes` via query no server component.
- Produces: rota `/relatorio/executivo/config` (admin) para editar instruções, pré-visualizar e gravar.

- [ ] **Step 1: Server Component (carrega instruções + APs; gate admin)**

`src/app/(app)/relatorio/executivo/config/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Editor } from './_components/editor'

export default async function ConfigPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (perfil?.role !== 'admin') redirect('/relatorio/executivo')

  const [{ data: cfg }, { data: apartamentos }] = await Promise.all([
    supabase.from('relatorio_config').select('instrucoes_extra').eq('id', 1).single(),
    supabase.from('apartamentos').select('id, codigo').order('id'),
  ])

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Instruções do Relatório</h1>
      <p className="text-sm text-muted-foreground">
        Estas instruções somam-se às regras default. Pré-visualiza num AP antes de gravar.
      </p>
      <Editor instrucoesIniciais={cfg?.instrucoes_extra ?? ''} apartamentos={apartamentos ?? []} />
    </div>
  )
}
```

- [ ] **Step 2: Client component do editor**

`src/app/(app)/relatorio/executivo/config/_components/editor.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { previewRelatorioAction, gravarInstrucoesAction } from '@/app/actions/relatorio'
import type { RelatorioResult } from '@/lib/relatorio/types'

interface Props {
  instrucoesIniciais: string
  apartamentos: { id: number; codigo: string }[]
}

export function Editor({ instrucoesIniciais, apartamentos }: Props) {
  const [texto, setTexto] = useState(instrucoesIniciais)
  const [apId, setApId] = useState<number>(apartamentos[0]?.id ?? 1)
  const [preview, setPreview] = useState<RelatorioResult | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function preVisualizar() {
    setBusy(true); setMsg(null)
    const r = await previewRelatorioAction(apId, texto)
    if (r.success) setPreview(r.data); else setMsg(r.error)
    setBusy(false)
  }

  async function gravar() {
    setBusy(true); setMsg(null)
    const r = await gravarInstrucoesAction(texto)
    setMsg(r.success ? 'Gravado.' : r.error)
    setBusy(false)
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <textarea
        className="w-full border rounded p-3 min-h-[200px] font-mono text-sm"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Instruções adicionais (ex.: 'Começa sempre pelo que falta que é visível ao cliente.')"
      />
      <div className="flex items-center gap-2">
        <select className="border rounded px-3 py-2" value={apId} onChange={(e) => setApId(Number(e.target.value))}>
          {apartamentos.map((a) => <option key={a.id} value={a.id}>{a.codigo}</option>)}
        </select>
        <button className="border rounded px-4 py-2 disabled:opacity-50" onClick={preVisualizar} disabled={busy}>Pré-visualizar</button>
        <button className="border rounded px-4 py-2 bg-primary text-primary-foreground disabled:opacity-50" onClick={gravar} disabled={busy}>Gravar</button>
      </div>

      {msg && <p className="text-sm">{msg}</p>}
      {preview && (
        <div className="border rounded p-4">
          {preview.origem === 'template' && <p className="text-xs text-amber-600">⚠ Template (LLM indisponível)</p>}
          <p className="whitespace-pre-wrap leading-relaxed">{preview.texto}</p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/relatorio/executivo/config/page.tsx" "src/app/(app)/relatorio/executivo/config/_components/editor.tsx"
git commit -m "feat(relatorio): admin config editor with live preview"
```

---

## Task 14: e2e smoke + documentação de setup

**Files:**
- Create: `e2e/relatorio-executivo.spec.ts`
- Create: `docs/relatorio-executivo-setup.md`

**Interfaces:**
- Consumes: rota `/relatorio/executivo`.

- [ ] **Step 1: Documentar o setup da chave (a ação do Miguel)**

`docs/relatorio-executivo-setup.md`:

```markdown
# Relatório Executivo — setup do LLM

1. Criar chave grátis: https://aistudio.google.com/apikey (conta Google, sem cartão).
2. Variáveis de ambiente (Vercel → Project → Settings → Environment Variables, e `.env.local` em dev):
   - `LLM_PROVIDER=gemini`
   - `LLM_API_KEY=<a-tua-chave>`
   - `LLM_MODEL=gemini-2.5-flash-lite`
3. Sem chave/quota, a app cai automaticamente no template determinístico (parágrafo mais simples). Nunca fica partida.
4. Trocar de fornecedor (se a Google cortar o free tier): mudar `LLM_PROVIDER`/`LLM_API_KEY` no Vercel. Zero código.

**Privacidade:** o texto dos itens por fazer (elemento, sub-elemento, notas) é enviado para a API do Google. É estado de obra, sem dados pessoais sensíveis. Evitar pôr nomes/dados de pessoas no campo `notas`.
```

- [ ] **Step 2: Escrever o e2e smoke**

`e2e/relatorio-executivo.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

// Smoke. Corre em CI/preview (precisa da app a servir + sessão), NÃO localmente
// (ver constrangimento de RAM/localhost do projeto). Assume storageState autenticado
// como os outros specs em e2e/.
test('página do relatório executivo carrega e gera um AP', async ({ page }) => {
  await page.goto('/relatorio/executivo')
  await expect(page.getByRole('heading', { name: 'Relatório Executivo' })).toBeVisible()
  await page.getByRole('button', { name: 'Gerar' }).click()
  // Aparece um parágrafo (LLM ou template) num tempo razoável
  await expect(page.locator('p.whitespace-pre-wrap')).toBeVisible({ timeout: 30_000 })
})
```

> Alinhar o setup de autenticação/`storageState` com os specs existentes em `e2e/` (ex.: `e2e/relatorio.spec.ts`). Se eles usam um fixture de login partilhado, reutilizá-lo.

- [ ] **Step 3: Suite unitária completa verde**

Run: `npm run test:unit`
Expected: PASS (todos os ficheiros `*.test.ts`).

- [ ] **Step 4: Commit**

```bash
git add e2e/relatorio-executivo.spec.ts docs/relatorio-executivo-setup.md
git commit -m "test(relatorio): e2e smoke + LLM setup docs"
```

---

## Self-Review (feita)

**Spec coverage:**
- §3 pipeline factos-primeiro → T5 (facts), T6 (prompt), T9 (gerar). ✅
- §4 factos + demãos pré-calculadas em SQL/código → T3 (classify), T5 (buildFacts). ✅
- §5 regras default + exemplo dourado → T6. ✅
- §6 adapter agnóstico + fallback → T7 (template), T8 (provider/gemini/factory), T9 (fallback). ✅
- §7 persistência (migration + RLS admin) → T2, `lerInstrucoes`/`gravarInstrucoesAction` em T10. ✅
- §8 UI (1 AP, lote 24, copiar, preview, config admin) → T11, T12, T13. ✅
- §9 pré-requisitos/privacidade → T14 (docs). ✅
- §10 validações contra o código (smallint, roles admin/user, set_updated_at) → refletidas em T2, T5, T10. ✅

**Placeholder scan:** sem TBD/TODO; todos os passos de código têm código real. ✅

**Type consistency:** `Facts`, `PinturaFacto`, `PendenteItem`, `RelatorioResult` definidos em T3 e usados com os mesmos nomes/campos em T5-T13. `LLMProvider.generate(system, user)` consistente T8↔T9. `gerarDeFactos(facts, instrucoesExtra, provider)` consistente T9↔T10. ✅

**Nota de risco conhecida:** os nomes das relações Supabase (`fases(nome)`, `divisoes(nome)`) e os tipos gerados podem exigir narrowing/cast em T5 — assinalado no próprio passo. Não altera a arquitetura.
```
