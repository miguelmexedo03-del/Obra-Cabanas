# Checklist Zonas Comuns, Zona Técnica e Apagar Item — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ampliar o checklist de QC da app Obra Cabanas com 3 zonas comuns (Lote 1, Lote 2, Edifício), uma divisão "Zona Técnica" nos 24 apartamentos, eletrodomésticos nomeados na cozinha, e um botão de apagar item simétrico ao "Adicionar item" já existente.

**Architecture:** Zonas comuns modeladas como linhas `apartamentos` com `tipo = 'zona_comum'` (sem tabelas novas). `elementos.fase_id` passa a nullable para itens sem fase de Gantt equivalente. Uma migration de dados (`0015`) incremental insere tudo; uma segunda migration (`0016`) alarga a RLS de `DELETE` em `elementos` a `admin`+`user`. UI existente (`/apartamentos`, `/apartamentos/[id]`, `/checklist`) já é genérica por `apartamento_id` — só precisa de ajustes de tipos e de separar visualmente "Apartamentos" de "Zonas Comuns".

**Tech Stack:** Next.js 16 (App Router), TypeScript, Supabase (Postgres + RLS), Server Actions, Vitest.

## Global Constraints

- PT-PT em toda a UI e copy; código e nomes de variáveis em inglês.
- Sem `any` — usa `unknown` + type narrowing.
- Server Components por defeito; mutations via Server Actions em `src/app/actions/`, nunca `throw` — devolvem `{success:true,...} | {success:false,error:string}`.
- Comentários só quando explicam o *porquê*, nunca o *quê*.
- Sem `window.confirm`/`alert`/dialogs nativos do browser — usa os componentes `AlertDialog`/`Dialog` já existentes em `src/components/ui/`.
- **Não correr `npm run dev` localmente** — risco confirmado de esgotar RAM e crashar o Windows. Verificação visual faz-se em preview/produção Vercel.
- Migrations aplicadas diretamente via `mcp__supabase__apply_migration` no projeto `larfdydhlbqupmllxunq` (produção) — não há ambiente local Supabase neste fluxo.
- Nenhuma linha "Eletrodomésticos" existente tem `concluido=true` ou `notas`/`responsavel` preenchidos (confirmado por query antes desta spec) — a migration da Parte 3 só avança se essa condição continuar a ser verdade no momento de aplicar.

---

### Task 1: Migration 0015 — Parte A: schema + zonas comuns (Lote 1, Lote 2, Edifício)

**Files:**
- Create: `supabase/migrations/0015_checklist_zonas_comuns_zona_tecnica_eletrodomesticos.sql`

**Interfaces:**
- Produces: coluna `apartamentos.tipo` (`apartamento_tipo` enum: `'apartamento' | 'zona_comum'`), linhas `apartamentos.id` 25/26/27, `elementos.fase_id` agora nullable — usados por todas as tasks seguintes.

- [ ] **Step 1: Escrever a secção de schema + unidades no ficheiro da migration**

```sql
-- ============================================================
-- Migration 0015 — Zonas Comuns, Zona Técnica, Eletrodomésticos por nome
-- ============================================================
-- Incremental: só INSERT/ALTER, nunca apaga/regenera o checklist existente.
-- Ver docs/superpowers/specs/2026-07-29-checklist-zonas-comuns-design.md

begin;

-- ------------------------------------------------------------
-- PARTE A: schema — unidades "zona_comum" + fase_id nullable
-- ------------------------------------------------------------
create type apartamento_tipo as enum ('apartamento', 'zona_comum');

alter table apartamentos add column tipo apartamento_tipo not null default 'apartamento';

alter table elementos alter column fase_id drop not null;

insert into apartamentos (id, codigo, descricao, tipo) values
  (25, 'LOTE1', 'Lote 1 — Zonas Comuns (Rua Fernando Pessoa 17)', 'zona_comum'),
  (26, 'LOTE2', 'Lote 2 — Zonas Comuns (Rua Manoel Pedro de Mello 3)', 'zona_comum'),
  (27, 'EDIFICIO', 'Edifício — Zonas Comuns', 'zona_comum');

-- Divisões: Lote 1 e Lote 2 (idênticas) + Edifício
insert into divisoes (apartamento_id, nome, ordem) values
  (25, 'Átrio de entrada (piso 0)', 1),
  (25, 'Circulação — piso 0', 2),
  (25, 'Circulação — piso 1', 3),
  (25, 'Circulação — piso 2', 4),
  (25, 'Escada', 5),
  (25, 'Elevador', 6),
  (26, 'Átrio de entrada (piso 0)', 1),
  (26, 'Circulação — piso 0', 2),
  (26, 'Circulação — piso 1', 3),
  (26, 'Circulação — piso 2', 4),
  (26, 'Escada', 5),
  (26, 'Elevador', 6),
  (27, 'Garagem / cave (piso -1)', 1),
  (27, 'Zonas técnicas (cave)', 2),
  (27, 'Cobertura comum/técnica', 3);

-- Átrio de entrada (bloco geral + itens próprios) — Lote 1 e Lote 2
insert into elementos (apartamento_id, divisao_id, fase_id, elemento, concluido)
select d.apartamento_id, d.id, v.fase_id, v.elemento, false
from divisoes d
join (values
  (4::smallint, 'Pavimento'),
  (4::smallint, 'Rodapé'),
  (2::smallint, 'Paredes'),
  (1::smallint, 'Teto'),
  (3::smallint, 'Portas e aros'),
  (null::smallint, 'Iluminação'),
  (null::smallint, 'Pontos à vista (tomadas/botoneiras/quadros)'),
  (null::smallint, 'Sinalização e segurança'),
  (null::smallint, 'Limpeza/pronto'),
  (3::smallint, 'Porta de entrada'),
  (null::smallint, 'Caixas de correio'),
  (null::smallint, 'Videoporteiro/campainhas')
) as v(fase_id, elemento) on true
where d.nome = 'Átrio de entrada (piso 0)' and d.apartamento_id in (25, 26);

-- Circulação (só bloco geral) — pisos 0/1/2, Lote 1 e Lote 2
insert into elementos (apartamento_id, divisao_id, fase_id, elemento, concluido)
select d.apartamento_id, d.id, v.fase_id, v.elemento, false
from divisoes d
join (values
  (4::smallint, 'Pavimento'),
  (4::smallint, 'Rodapé'),
  (2::smallint, 'Paredes'),
  (1::smallint, 'Teto'),
  (3::smallint, 'Portas e aros'),
  (null::smallint, 'Iluminação'),
  (null::smallint, 'Pontos à vista (tomadas/botoneiras/quadros)'),
  (null::smallint, 'Sinalização e segurança'),
  (null::smallint, 'Limpeza/pronto')
) as v(fase_id, elemento) on true
where d.nome in ('Circulação — piso 0', 'Circulação — piso 1', 'Circulação — piso 2')
  and d.apartamento_id in (25, 26);

-- Escada (bloco geral + itens próprios)
insert into elementos (apartamento_id, divisao_id, fase_id, elemento, concluido)
select d.apartamento_id, d.id, v.fase_id, v.elemento, false
from divisoes d
join (values
  (4::smallint, 'Pavimento'),
  (4::smallint, 'Rodapé'),
  (2::smallint, 'Paredes'),
  (1::smallint, 'Teto'),
  (3::smallint, 'Portas e aros'),
  (null::smallint, 'Iluminação'),
  (null::smallint, 'Pontos à vista (tomadas/botoneiras/quadros)'),
  (null::smallint, 'Sinalização e segurança'),
  (null::smallint, 'Limpeza/pronto'),
  (null::smallint, 'Degraus'),
  (null::smallint, 'Patamares'),
  (null::smallint, 'Corrimão'),
  (null::smallint, 'Guarda-corpos')
) as v(fase_id, elemento) on true
where d.nome = 'Escada' and d.apartamento_id in (25, 26);

-- Elevador (SEM bloco geral) — "Portas de patamar" com sub_elemento por piso
insert into elementos (apartamento_id, divisao_id, fase_id, elemento, sub_elemento, concluido)
select d.apartamento_id, d.id, v.fase_id, v.elemento, v.sub_elemento, false
from divisoes d
join (values
  (null::smallint, 'Cabina', null::text),
  (null::smallint, 'Nivelamento à soleira', null::text),
  (3::smallint, 'Portas de patamar', 'Piso 0'),
  (3::smallint, 'Portas de patamar', 'Piso 1'),
  (3::smallint, 'Portas de patamar', 'Piso 2'),
  (null::smallint, 'Botoneira', null::text),
  (null::smallint, 'Certificação', null::text)
) as v(fase_id, elemento, sub_elemento) on true
where d.nome = 'Elevador' and d.apartamento_id in (25, 26);

-- Garagem / cave (piso -1) — só Edifício
insert into elementos (apartamento_id, divisao_id, fase_id, elemento, concluido)
select d.apartamento_id, d.id, v.fase_id, v.elemento, false
from divisoes d
join (values
  (4::smallint, 'Pavimento'),
  (4::smallint, 'Rodapé'),
  (2::smallint, 'Paredes'),
  (1::smallint, 'Teto'),
  (3::smallint, 'Portas e aros'),
  (null::smallint, 'Iluminação'),
  (null::smallint, 'Pontos à vista (tomadas/botoneiras/quadros)'),
  (null::smallint, 'Sinalização e segurança'),
  (null::smallint, 'Limpeza/pronto'),
  (null::smallint, 'Portão automático'),
  (null::smallint, 'Lugares marcados'),
  (null::smallint, 'Ventilação'),
  (null::smallint, 'Deteção de CO')
) as v(fase_id, elemento) on true
where d.nome = 'Garagem / cave (piso -1)' and d.apartamento_id = 27;

-- Zonas técnicas (cave) — só Edifício
insert into elementos (apartamento_id, divisao_id, fase_id, elemento, concluido)
select d.apartamento_id, d.id, v.fase_id, v.elemento, false
from divisoes d
join (values
  (4::smallint, 'Pavimento'),
  (4::smallint, 'Rodapé'),
  (2::smallint, 'Paredes'),
  (1::smallint, 'Teto'),
  (3::smallint, 'Portas e aros'),
  (null::smallint, 'Iluminação'),
  (null::smallint, 'Pontos à vista (tomadas/botoneiras/quadros)'),
  (null::smallint, 'Sinalização e segurança'),
  (null::smallint, 'Limpeza/pronto'),
  (null::smallint, 'Quadros'),
  (null::smallint, 'Equipamentos fixos e identificados'),
  (null::smallint, 'Ventilação'),
  (null::smallint, 'Drenagem')
) as v(fase_id, elemento) on true
where d.nome = 'Zonas técnicas (cave)' and d.apartamento_id = 27;

-- Cobertura comum/técnica (SEM bloco geral) — só Edifício
insert into elementos (apartamento_id, divisao_id, fase_id, elemento, concluido)
select d.apartamento_id, d.id, v.fase_id, v.elemento, false
from divisoes d
join (values
  (null::smallint, 'Estanqueidade/infiltrações'),
  (null::smallint, 'Escoamento (ralos e caleiras)'),
  (null::smallint, 'Remates e rufos'),
  (null::smallint, 'Platibanda/guarda-corpos'),
  (null::smallint, 'Equipamentos fixos e identificados'),
  (null::smallint, 'Acesso')
) as v(fase_id, elemento) on true
where d.nome = 'Cobertura comum/técnica' and d.apartamento_id = 27;
```

- [ ] **Step 2: Ler o ficheiro de volta e confirmar que tem exatamente 3 `insert into divisoes` implícitos (1 values-list) + 7 blocos `insert into elementos` (Átrio, Circulação, Escada, Elevador, Garagem, Zonas técnicas, Cobertura)**

Não há `commit;` ainda — vem no fim da Task 3.

---

### Task 2: Migration 0015 — Parte B: Zona Técnica nos 24 apartamentos

**Files:**
- Modify: `supabase/migrations/0015_checklist_zonas_comuns_zona_tecnica_eletrodomesticos.sql` (acrescentar ao fim, antes do `commit;`)

**Interfaces:**
- Consumes: `apartamentos.tipo = 'apartamento'` (Task 1).
- Produces: divisão `'Zona Técnica'` em cada um dos 24 apartamentos, `ordem` = último+1 de cada um.

- [ ] **Step 1: Acrescentar a secção Zona Técnica**

```sql
-- ------------------------------------------------------------
-- PARTE B: "Zona Técnica" nos 24 apartamentos (ordem = último+1, por AP)
-- ------------------------------------------------------------
insert into divisoes (apartamento_id, nome, ordem)
select ap.id, 'Zona Técnica',
  coalesce((select max(d.ordem) from divisoes d where d.apartamento_id = ap.id), 0) + 1
from apartamentos ap
where ap.tipo = 'apartamento';

insert into elementos (apartamento_id, divisao_id, fase_id, elemento, concluido)
select d.apartamento_id, d.id, v.fase_id, v.elemento, false
from divisoes d
join apartamentos ap on ap.id = d.apartamento_id and ap.tipo = 'apartamento'
join (values
  (null::smallint, 'Equipamento AQS / bomba de calor — fixo e identificado'),
  (null::smallint, 'Quadro elétrico'),
  (null::smallint, 'Ventilação'),
  (null::smallint, 'Dreno/escoamento'),
  (3::smallint, 'Porta e acesso'),
  (4::smallint, 'Pavimento'),
  (2::smallint, 'Paredes'),
  (1::smallint, 'Teto')
) as v(fase_id, elemento) on true
where d.nome = 'Zona Técnica';
```

- [ ] **Step 2: Confirmar visualmente que o bloco foi colado a seguir à Parte A e antes de qualquer `commit;`**

---

### Task 3: Migration 0015 — Parte C: Eletrodomésticos por nome + verificação pré-voo

**Files:**
- Modify: `supabase/migrations/0015_checklist_zonas_comuns_zona_tecnica_eletrodomesticos.sql` (acrescentar ao fim, fechar com `commit;`)

**Interfaces:**
- Consumes: ids exatos das 24 linhas "Eletrodomésticos" atuais (23 AP + AP7 duplicado), confirmados por query em produção antes desta spec: `3379, 3708, 148, 256, 410, 601, 474, 727, 944, 1077, 1249, 1421, 1572, 1718, 1857, 1992, 2208, 2346, 2517, 2687, 2836, 2989, 3116, 3246`.
- Produces: 169 elementos novos com `fase_id = 8` (23 AP × 7 + AP7 × 8).

- [ ] **Step 1: Antes de escrever o `delete`, correr esta verificação (fora da migration, via `mcp__supabase__execute_sql`) e confirmar que devolve 24 linhas, todas com `concluido = false` e `notas`/`responsavel` a `null`**

```sql
select id, apartamento_id, concluido, notas, responsavel
from elementos
where id in (3379,3708,148,256,410,601,474,727,944,1077,1249,1421,1572,1718,1857,1992,2208,2346,2517,2687,2836,2989,3116,3246);
```

Se alguma linha não bater certo com isto, **parar e avisar o Miguel** em vez de continuar — não assumir o que já não é verdade.

- [ ] **Step 2: Acrescentar a secção de eletrodomésticos ao ficheiro da migration**

```sql
-- ------------------------------------------------------------
-- PARTE C: Eletrodomésticos por nome
-- ------------------------------------------------------------
-- Guarda de segurança: só apaga se continuar sem estado real (ver verificação
-- pré-voo no plano de implementação). Se o WHERE não apanhar as 24 linhas,
-- para e investiga antes de reaplicar.
delete from elementos
where id in (3379,3708,148,256,410,601,474,727,944,1077,1249,1421,1572,1718,1857,1992,2208,2346,2517,2687,2836,2989,3116,3246)
  and concluido = false
  and notas is null
  and responsavel is null;

-- 23 apartamentos (todos menos AP7) — insere na Cozinha existente de cada um,
-- incluindo o AP2 que não tinha nenhuma linha "Eletrodomésticos" antes.
insert into elementos (apartamento_id, divisao_id, fase_id, elemento, concluido)
select d.apartamento_id, d.id, 8, v.elemento, false
from divisoes d
join apartamentos ap on ap.id = d.apartamento_id
join (values
  ('Placa vitrocerâmica'),
  ('Micro-ondas'),
  ('Forno'),
  ('Máquina de lavar louça'),
  ('Frigorífico combinado'),
  ('Máquina de lavar roupa'),
  ('Exaustor')
) as v(elemento) on true
where ap.tipo = 'apartamento' and ap.id <> 7 and d.nome = 'Cozinha';

-- AP7 — 6 aparelhos na Cozinha
insert into elementos (apartamento_id, divisao_id, fase_id, elemento, concluido)
select d.apartamento_id, d.id, 8, v.elemento, false
from divisoes d
join (values
  ('Frigorífico (americano)'),
  ('Forno'),
  ('Gaveta de aquecimento'),
  ('Máquina de lavar louça'),
  ('Placa de indução'),
  ('Exaustor')
) as v(elemento) on true
where d.apartamento_id = 7 and d.nome = 'Cozinha';

-- AP7 — 2 aparelhos no Closet (lavandaria), onde já estava hoje a máquina de lavar roupa
insert into elementos (apartamento_id, divisao_id, fase_id, elemento, concluido)
select d.apartamento_id, d.id, 8, v.elemento, false
from divisoes d
join (values
  ('Máquina de lavar roupa'),
  ('Máquina de secar')
) as v(elemento) on true
where d.apartamento_id = 7 and d.nome = 'Closet (lavandaria)';

commit;
```

- [ ] **Step 3: Ler o ficheiro completo de fio a pavio e confirmar que só tem um `begin;` (início da Task 1) e um `commit;` (fim desta task)**

---

### Task 4: Aplicar a migration 0015 e verificar

**Files:**
- (nenhum ficheiro novo — usa `mcp__supabase__apply_migration` e `mcp__supabase__execute_sql` no projeto `larfdydhlbqupmllxunq`)

**Interfaces:**
- Consumes: conteúdo completo de `0015_checklist_zonas_comuns_zona_tecnica_eletrodomesticos.sql` (Tasks 1–3).

- [ ] **Step 1: Aplicar a migration**

Chamar `mcp__supabase__apply_migration` com `project_id = 'larfdydhlbqupmllxunq'`, `name = '0015_checklist_zonas_comuns_zona_tecnica_eletrodomesticos'` e o conteúdo do ficheiro.

- [ ] **Step 2: Verificar contagens via `mcp__supabase__execute_sql`**

```sql
select
  (select count(*) from apartamentos where tipo = 'zona_comum') as unidades_zona_comum,
  (select count(*) from divisoes where apartamento_id in (25,26,27)) as divisoes_zona_comum,
  (select count(*) from elementos where apartamento_id in (25,26,27)) as elementos_zona_comum,
  (select count(*) from divisoes where nome = 'Zona Técnica') as divisoes_zona_tecnica,
  (select count(*) from elementos e join divisoes d on d.id = e.divisao_id where d.nome = 'Zona Técnica') as elementos_zona_tecnica,
  (select count(*) from elementos where fase_id = 8) as total_eletrodomesticos;
```

Esperado: `unidades_zona_comum=3`, `divisoes_zona_comum=15`, `elementos_zona_comum=150`, `divisoes_zona_tecnica=24`, `elementos_zona_tecnica=192`, `total_eletrodomesticos=169`.

- [ ] **Step 3: Se algum número não bater certo, não corrigir com mais INSERTs à mão — investigar a query da Task correspondente antes de repetir**

---

### Task 5: Regenerar `database.types.ts`

**Files:**
- Modify: `src/lib/database.types.ts`

**Interfaces:**
- Consumes: schema atualizado da BD (Task 4).
- Produces: tipos `Database['public']['Tables']['apartamentos']['Row']['tipo']` e `Database['public']['Tables']['elementos']['Row']['fase_id']: number | null`, usados pelas Tasks seguintes.

- [ ] **Step 1: Gerar os tipos**

Chamar `mcp__supabase__generate_typescript_types` com `project_id = 'larfdydhlbqupmllxunq'` e escrever o resultado em `src/lib/database.types.ts` (substituir o ficheiro inteiro).

- [ ] **Step 2: Confirmar no diff que `elementos.Row.fase_id` mudou de `number` para `number | null`, e que a tabela `apartamentos` ganhou o campo `tipo`**

```bash
git diff --stat src/lib/database.types.ts
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/database.types.ts
git commit -m "chore: regenerate database.types.ts (zonas comuns, fase_id nullable)"
```

---

### Task 6: `lib/utils.ts` — novas categorias de divisão + ordenação null-safe (TDD)

**Files:**
- Modify: `src/lib/utils.ts:57-102`
- Create: `src/lib/utils.test.ts`

**Interfaces:**
- Produces: `TIPOS_DIVISAO` com `'Zona Comum'` e `'Zona Técnica'`; `tipoDivisao(nome: string): TipoDivisao` a reconhecer as novas divisões; `sortElementos<T extends {elemento:string; fase_id:number|null; sub_elemento:string|null}>` — assinatura muda de `fase_id: number` para `fase_id: number | null`, usada pelas Tasks 7 e 9.

- [ ] **Step 1: Escrever os testes que falham**

```ts
import { describe, it, expect } from 'vitest'
import { tipoDivisao, sortElementos } from '@/lib/utils'

describe('tipoDivisao — zonas comuns e zona técnica', () => {
  it('classifica divisões de zonas comuns como Zona Comum', () => {
    expect(tipoDivisao('Átrio de entrada (piso 0)')).toBe('Zona Comum')
    expect(tipoDivisao('Circulação — piso 1')).toBe('Zona Comum')
    expect(tipoDivisao('Escada')).toBe('Zona Comum')
    expect(tipoDivisao('Elevador')).toBe('Zona Comum')
    expect(tipoDivisao('Garagem / cave (piso -1)')).toBe('Zona Comum')
    expect(tipoDivisao('Zonas técnicas (cave)')).toBe('Zona Comum')
    expect(tipoDivisao('Cobertura comum/técnica')).toBe('Zona Comum')
  })

  it('classifica a divisão Zona Técnica do apartamento à parte', () => {
    expect(tipoDivisao('Zona Técnica')).toBe('Zona Técnica')
  })

  it('não confunde Entrada do apartamento com Átrio de entrada comum', () => {
    expect(tipoDivisao('Entrada')).toBe('Entrada')
    expect(tipoDivisao('Entrada / Acessos')).toBe('Entrada')
  })
})

describe('sortElementos — itens sem fase (fase_id null)', () => {
  it('dentro do mesmo elemento, ordena fase numerada antes de fase null', () => {
    const items = [
      { elemento: 'Item X', fase_id: null, sub_elemento: null },
      { elemento: 'Item X', fase_id: 3, sub_elemento: null },
    ]
    const sorted = sortElementos(items)
    expect(sorted.map(i => i.fase_id)).toEqual([3, null])
  })

  it('itens fora do ELEMENTO_ORDER mantêm ordem estável quando ambos têm fase_id null', () => {
    const items = [
      { elemento: 'Sinalização e segurança', fase_id: null, sub_elemento: null },
      { elemento: 'Iluminação', fase_id: null, sub_elemento: null },
    ]
    const sorted = sortElementos(items)
    expect(sorted.map(i => i.elemento)).toEqual(['Sinalização e segurança', 'Iluminação'])
  })
})
```

- [ ] **Step 2: Correr os testes e confirmar que falham**

Run: `npm run test:unit -- utils`
Expected: FAIL — `tipoDivisao('Átrio de entrada (piso 0)')` devolve `'Suites/Quartos'` (fallback atual), e `sortElementos` tem erro de tipo em `fase_id: null`.

- [ ] **Step 3: Implementar**

```ts
export const TIPOS_DIVISAO = [
  'Entrada', 'Sala', 'Cozinha', 'Suites/Quartos', 'WC', 'Closet', 'Varanda', 'Zona Técnica', 'Zona Comum',
] as const

export type TipoDivisao = typeof TIPOS_DIVISAO[number]

export function tipoDivisao(nome: string): TipoDivisao {
  const n = nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s*\(/g, ' (')
    .replace(/\s+/g, ' ')
    .trim()

  if (n === 'zona tecnica') return 'Zona Técnica'
  if (
    n.startsWith('atrio de entrada') || n.startsWith('circulacao') ||
    n === 'escada' || n === 'elevador' || n.startsWith('garagem') ||
    n.startsWith('zonas tecnicas') || n.startsWith('cobertura')
  ) return 'Zona Comum'
  if (n.includes('wc')) return 'WC'
  if (n.startsWith('closet')) return 'Closet'
  if (n === 'sala') return 'Sala'
  if (n === 'cozinha') return 'Cozinha'
  if (n.startsWith('entrada')) return 'Entrada'
  if (n.startsWith('varanda')) return 'Varanda'
  if (n.startsWith('suite') || n.startsWith('quarto')) return 'Suites/Quartos'
  return 'Suites/Quartos'
}

export function sortElementos<T extends {
  elemento: string
  fase_id: number | null
  sub_elemento: string | null
}>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const eA = ELEMENTO_ORDER[a.elemento] ?? 99
    const eB = ELEMENTO_ORDER[b.elemento] ?? 99
    if (eA !== eB) return eA - eB
    const fA = a.fase_id ?? Infinity
    const fB = b.fase_id ?? Infinity
    if (fA !== fB) return fA - fB
    const sA = a.sub_elemento === null ? 0 : (SUB_ELEMENTO_ORDER[a.sub_elemento] ?? 50)
    const sB = b.sub_elemento === null ? 0 : (SUB_ELEMENTO_ORDER[b.sub_elemento] ?? 50)
    if (sA !== sB) return sA - sB
    return (a.sub_elemento ?? '').localeCompare(b.sub_elemento ?? '', 'pt')
  })
}
```

- [ ] **Step 4: Correr os testes e confirmar que passam**

Run: `npm run test:unit -- utils`
Expected: PASS (todos os testes de `tipoDivisao` e `sortElementos`)

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils.ts src/lib/utils.test.ts
git commit -m "feat: classificar zonas comuns/zona técnica e ordenar fase_id null por último"
```

---

### Task 7: Propagar `fase_id: number | null` nas páginas de checklist + build

**Files:**
- Modify: `src/app/(app)/apartamentos/[id]/page.tsx:20-50`
- Modify: `src/app/(app)/checklist/page.tsx:21-32`
- Modify: `src/components/checklist/checklist-groups.tsx:10-72`
- Modify: `src/app/actions/checklist.ts:8-68`

**Interfaces:**
- Consumes: `sortElementos` com assinatura `fase_id: number | null` (Task 6).
- Produces: `criarElemento(apartamentoId: number, divisaoId: number, faseId: number | null, nome: string)`, `ChecklistGroupData.defaultFaseId: number | null` — usados pela Task 9 sem alterações adicionais.

- [ ] **Step 1: `src/app/(app)/apartamentos/[id]/page.tsx` — `fase_id` nullable e `getDefaultFaseId` null-safe**

```ts
type RawElemento = {
  id: number
  elemento: string
  sub_elemento: string | null
  concluido: boolean
  divisao_id: number | null
  fase_id: number | null
  divisoes: { id: number; nome: string; ordem: number } | null
  fases: { nome: string; cor_hex: string } | null
}
```

```ts
function getDefaultFaseId(items: { fase_id: number | null }[]): number | null {
  if (items.length === 0) return null
  const counts = new Map<number | null, number>()
  for (const item of items) {
    counts.set(item.fase_id, (counts.get(item.fase_id) ?? 0) + 1)
  }
  let bestId = items[0].fase_id
  let bestCount = 0
  for (const [faseId, count] of counts) {
    if (count > bestCount) { bestCount = count; bestId = faseId }
  }
  return bestId
}
```

- [ ] **Step 2: `src/app/(app)/checklist/page.tsx` — `fase_id` nullable no tipo `RawElemento`**

```ts
type RawElemento = {
  id: number
  elemento: string
  sub_elemento: string | null
  concluido: boolean
  apartamento_id: number
  divisao_id: number | null
  fase_id: number | null
  divisoes: { id: number; nome: string; ordem: number } | null
  fases: { nome: string; cor_hex: string } | null
  apartamentos: { codigo: string } | null
}
```

- [ ] **Step 3: `src/components/checklist/checklist-groups.tsx` — `fase_id`/`defaultFaseId` nullable**

```ts
export type ChecklistGroupItem = {
  id: number
  elemento: string
  sub_elemento: string | null
  concluido: boolean
  fase_id: number | null
  divisao_id: number | null
}

export type ChecklistGroupData = {
  id: number | null
  nome: string
  faseColor: string
  defaultFaseId: number | null
  concluidos: number
  items: ChecklistGroupItem[]
}
```

```ts
function handleAdd(divisaoId: number, faseId: number | null, nome: string) {
```

- [ ] **Step 4: `src/app/actions/checklist.ts` — `faseId`/`BatchItem.fase_id` nullable**

```ts
export async function criarElemento(
  apartamentoId: number,
  divisaoId: number,
  faseId: number | null,
  nome: string,
): Promise<{ success: true; id: number } | { success: false; error: string }> {
```

```ts
type BatchItem = {
  apartamento_id: number
  divisao_id: number
  fase_id: number | null
  elemento: string
}
```

- [ ] **Step 5: Correr o build e corrigir qualquer erro de tipo que apareça noutros ficheiros**

Run: `npm run build`
Expected: PASS. Se aparecer erro de tipo noutro ficheiro que consome `fase_id`/`ChecklistGroupItem`/`RawElemento` fora dos 4 ficheiros acima, ajustar esse ficheiro para aceitar `number | null` da mesma forma.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(app\)/apartamentos/\[id\]/page.tsx src/app/\(app\)/checklist/page.tsx src/components/checklist/checklist-groups.tsx src/app/actions/checklist.ts
git commit -m "fix: propagar fase_id nullable nas paginas e actions de checklist"
```

---

### Task 8: Separar "Apartamentos" de "Zonas Comuns" na listagem

**Files:**
- Modify: `src/app/(app)/apartamentos/page.tsx` (ficheiro completo)

**Interfaces:**
- Consumes: `apartamentos.tipo` (Task 5).

- [ ] **Step 1: Reescrever a página com duas secções**

```tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { FileDown, PlusSquare } from 'lucide-react'

type ProgressoRow = {
  apartamento_id: number
  total: number
  concluidos: number
  percentagem: number
}

type Apartamento = { id: number; codigo: string; descricao: string | null; tipo: 'apartamento' | 'zona_comum' }

function ApartamentoCard({ ap, prog }: { ap: Apartamento; prog?: ProgressoRow }) {
  const pct = (prog?.percentagem ?? 0) * 100
  const concluidos = prog?.concluidos ?? 0
  const total = prog?.total ?? 0
  return (
    <Link
      href={`/apartamentos/${ap.id}`}
      className="rounded-lg border bg-card p-4 hover:border-ring transition-colors active:scale-[0.98]"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold">{ap.codigo}</span>
        <Badge variant="secondary">{Math.round(pct)}%</Badge>
      </div>
      <Progress value={pct} className="h-1.5" />
      <p className="text-xs text-muted-foreground mt-2">
        {concluidos}/{total} itens concluídos
      </p>
    </Link>
  )
}

export default async function ApartamentosPage() {
  const supabase = await createClient()

  const [apResult, progResult] = await Promise.all([
    supabase.from('apartamentos').select('id, codigo, descricao, tipo').order('id'),
    supabase.from('progresso_por_apartamento').select('*'),
  ])

  const apartamentos = (apResult.data as Apartamento[] | null) ?? []
  const progressos = progResult.data as ProgressoRow[] | null
  const progressMap = new Map(progressos?.map(p => [p.apartamento_id, p]) ?? [])

  const unidades = apartamentos.filter(a => a.tipo === 'apartamento')
  const zonasComuns = apartamentos.filter(a => a.tipo === 'zona_comum')

  return (
    <div>
      <PageHeader
        title="Apartamentos"
        description={`${unidades.length} unidades em reabilitação`}
        actions={
          <>
            <Button variant="outline" size="sm" render={<Link href="/gerir-itens" />} nativeButton={false}>
              <PlusSquare className="h-4 w-4" />
              Gerir Itens
            </Button>
            <Button variant="outline" size="sm" render={<Link href="/relatorio/selecionar" />} nativeButton={false}>
              <FileDown className="h-4 w-4" />
              Exportar relatórios
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {unidades.map(ap => (
          <ApartamentoCard key={ap.id} ap={ap} prog={progressMap.get(ap.id)} />
        ))}
      </div>

      {zonasComuns.length > 0 && (
        <>
          <h2 className="text-sm font-medium text-muted-foreground mt-8 mb-3">Zonas Comuns</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {zonasComuns.map(ap => (
              <ApartamentoCard key={ap.id} ap={ap} prog={progressMap.get(ap.id)} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/apartamentos/page.tsx
git commit -m "feat: separar zonas comuns dos apartamentos na listagem"
```

---

### Task 9: Apagar item — RLS + server action + botão com confirmação

**Files:**
- Create: `supabase/migrations/0016_elementos_delete_user.sql`
- Modify: `src/app/actions/checklist.ts` (acrescentar `apagarElemento`)
- Modify: `src/components/checklist/checklist-item.tsx` (ficheiro completo)

**Interfaces:**
- Produces: `apagarElemento(id: number): Promise<{success:true}|{success:false,error:string}>`.
- Nenhuma mudança em `ChecklistGroups` ou `checklist/page.tsx` — `ChecklistItem` já chama `toggleElemento` diretamente a partir de si próprio (mesmo padrão), por isso o apagar também fica autocontido dentro de `ChecklistItem` e funciona nos dois sítios onde é renderizado sem precisar de novas props.

- [ ] **Step 1: Escrever e aplicar a migration 0016**

```sql
drop policy if exists "admin can delete elementos" on elementos;
create policy "admin/user can delete elementos" on elementos
  for delete using (current_user_role() in ('admin', 'user'));
```

Aplicar via `mcp__supabase__apply_migration`, `project_id = 'larfdydhlbqupmllxunq'`, `name = '0016_elementos_delete_user'`.

- [ ] **Step 2: Verificar a policy aplicada**

```sql
select polname, polcmd, pg_get_expr(polqual, polrelid) as using_expr
from pg_policy
where polrelid = 'elementos'::regclass and polcmd = 'd';
```

Expected: 1 linha, `polname = 'admin/user can delete elementos'`.

- [ ] **Step 3: Acrescentar `apagarElemento` a `src/app/actions/checklist.ts`**

```ts
export async function apagarElemento(id: number): Promise<Result> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autenticado.' }

  const { error } = await supabase.from('elementos').delete().eq('id', id)
  if (error) return { success: false, error: error.message }

  revalidatePath('/', 'layout')
  return { success: true }
}
```

- [ ] **Step 4: Reescrever `src/components/checklist/checklist-item.tsx` com o botão de apagar**

```tsx
'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Plus, Trash2 } from 'lucide-react'
import { toggleElemento, apagarElemento } from '@/app/actions/checklist'
import { toast } from 'sonner'
import { EvidenciasDialog } from './evidencias-dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface Props {
  id: number
  elemento: string
  sub_elemento: string | null
  concluido: boolean
  faseColor: string
  evidenciasCount?: number
}

export function ChecklistItem({ id, elemento, sub_elemento, concluido, faseColor, evidenciasCount = 0 }: Props) {
  const router = useRouter()
  const [optimistic, setOptimistic] = useOptimistic(concluido)
  const [isPending, startTransition] = useTransition()
  const [openEvidencias, setOpenEvidencias] = useState(false)
  const [openDelete, setOpenDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDeleted, setIsDeleted] = useState(false)
  const [count, setCount] = useState(evidenciasCount)

  function handleChange() {
    const next = !optimistic
    startTransition(async () => {
      setOptimistic(next)
      const result = await toggleElemento(id, next)
      if (!result.success) {
        setOptimistic(!next)
        toast.error('Não foi possível atualizar', { description: result.error })
      }
    })
  }

  function handleEvidenciasClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setOpenEvidencias(true)
  }

  function handleDeleteTriggerClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
  }

  async function handleConfirmDelete() {
    setIsDeleting(true)
    const result = await apagarElemento(id)
    if (result.success) {
      setOpenDelete(false)
      setIsDeleted(true)
      router.refresh()
    } else {
      setIsDeleting(false)
      toast.error('Não foi possível apagar', { description: result.error })
    }
  }

  if (isDeleted) return null

  return (
    <label
      className={`flex items-start gap-3 px-4 py-3 min-h-[44px] cursor-pointer
        transition-colors hover:bg-muted/40 active:bg-muted/60
        ${isPending ? 'opacity-60' : ''}`}
    >
      <div className="relative mt-0.5 flex-shrink-0">
        <input
          type="checkbox"
          checked={optimistic}
          onChange={handleChange}
          className="sr-only"
          aria-label={sub_elemento ? `${elemento} — ${sub_elemento}` : elemento}
        />
        <div
          className={`w-5 h-5 rounded-[5px] border-2 flex items-center justify-center
            transition-all duration-150
            ${optimistic ? 'border-transparent' : 'border-input bg-background'}`}
          style={optimistic ? { backgroundColor: faseColor } : {}}
          aria-hidden="true"
        >
          {optimistic && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        {sub_elemento ? (
          <>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide leading-tight mb-0.5">
              {elemento}
            </p>
            <p className={`text-sm leading-relaxed break-words ${
              optimistic ? 'line-through text-muted-foreground' : 'text-foreground/90'
            }`}>
              {sub_elemento}
            </p>
          </>
        ) : (
          <p className={`text-sm leading-relaxed break-words ${
            optimistic ? 'line-through text-muted-foreground' : 'text-foreground'
          }`}>
            {elemento}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={handleEvidenciasClick}
        aria-label="Ver evidências (fotos e observações)"
        className="mt-0.5 flex h-6 min-w-[32px] shrink-0 items-center justify-center gap-1 rounded-md px-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        {count > 0 ? (
          <>
            <Camera className="h-3.5 w-3.5" />
            {count}
          </>
        ) : (
          <Plus className="h-3.5 w-3.5 text-muted-foreground/50" />
        )}
      </button>

      <AlertDialog open={openDelete} onOpenChange={setOpenDelete}>
        <AlertDialogTrigger
          onClick={handleDeleteTriggerClick}
          render={
            <button
              type="button"
              aria-label="Apagar item"
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/40 transition-colors hover:bg-destructive/10 hover:text-destructive"
            />
          }
        >
          <Trash2 className="h-3.5 w-3.5" />
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar item?</AlertDialogTitle>
            <AlertDialogDescription>
              {sub_elemento ? `${elemento} — ${sub_elemento}` : elemento}. Perde notas, responsável e fotos associadas. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={isDeleting} onClick={handleConfirmDelete}>
              {isDeleting ? 'A apagar…' : 'Apagar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EvidenciasDialog
        elementoId={id}
        open={openEvidencias}
        onOpenChange={setOpenEvidencias}
        onCountChange={setCount}
      />
    </label>
  )
}
```

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0016_elementos_delete_user.sql src/app/actions/checklist.ts src/components/checklist/checklist-item.tsx
git commit -m "feat: apagar item do checklist (admin+user), com confirmacao"
```

---

### Task 10: Verificação final e atualização do CLAUDE.md

**Files:**
- Modify: `obra-cabanas-app/CLAUDE.md` (secção "Migrations aplicadas" e "Estado dos milestones", se aplicável)

- [ ] **Step 1: Build completo**

Run: `npm run build`
Expected: PASS, zero erros de tipo.

- [ ] **Step 2: Vitest completo**

Run: `npm run test:unit`
Expected: PASS, incluindo os testes novos da Task 6.

- [ ] **Step 3: Verificação visual em preview/produção Vercel (não local)**

Checklist manual:
- `/apartamentos` mostra secção "Zonas Comuns" com LOTE1/LOTE2/EDIFICIO separada dos 24 apartamentos.
- `/apartamentos/25` (Lote 1) abre o checklist com as 6 divisões esperadas.
- Qualquer AP (ex.: `/apartamentos/1`) mostra a divisão "Zona Técnica" no fim.
- Cozinha de um AP normal mostra os 7 eletrodomésticos nomeados; AP7 mostra os 6 na Cozinha + 2 no Closet (lavandaria); AP2 mostra os 7 (antes não tinha nenhum).
- Botão de apagar (ícone lixo) aparece em qualquer item, pede confirmação, e o item desaparece da lista depois de confirmar.
- `/checklist` (global) continua a funcionar com o filtro "Tipo de Divisão" a mostrar "Zona Comum" e "Zona Técnica" como opções novas.

- [ ] **Step 4: Atualizar `obra-cabanas-app/CLAUDE.md`**

Acrescentar à lista de migrations aplicadas (secção "Migrations aplicadas"):

```
- `0015_checklist_zonas_comuns_zona_tecnica_eletrodomesticos.sql` — 3 unidades zona_comum (Lote 1, Lote 2, Edifício), divisão "Zona Técnica" nos 24 APs, eletrodomésticos nomeados na cozinha. `elementos.fase_id` passou a nullable.
- `0016_elementos_delete_user.sql` — DELETE em elementos alargado a admin+user.
```

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: registar migrations 0015/0016 no CLAUDE.md"
```

---

## Fora de âmbito (registado, não implementado neste plano)

Dashboard, Relatório Executivo, Gantt agregado e LoB continuam a assumir "24 apartamentos" e vão contar `LOTE1`/`LOTE2`/`EDIFICIO` incorretamente até serem ajustados com `where tipo = 'apartamento'`. Fica registado na spec (secção 6) como trabalho de seguimento, plano à parte.
