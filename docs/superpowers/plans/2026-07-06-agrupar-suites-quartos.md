# Agrupar Suites/Quartos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Colapsar as 5 categorias de tipo de divisão ligadas a suites/quartos
(Suite Principal, Suite 1, Suite 2, Outra Suite, Quarto) numa única categoria
"Suites/Quartos", nas duas apps (desktop e mobile), afetando automaticamente os
dois consumidores existentes desta categorização (Checklist global e Consulta
cruzada).

**Architecture:** Edição pontual de `TIPOS_DIVISAO`/`tipoDivisao` em
`src/lib/utils.ts` de cada app — nenhum outro ficheiro muda, porque
`ChecklistFilters`, `MobileFilters`, `ConsultaFilters` e a página/rota de export
da Consulta já leem `TIPOS_DIVISAO` dinamicamente.

**Tech Stack:** TypeScript puro — sem dependências novas, sem alterações de schema.

## Global Constraints

- Nenhuma das duas apps tem framework de testes unitários — a verificação de
  cada tarefa é `npm run build`, mais um script `node` temporário (mesmo padrão
  já usado nas features anteriores) para validar os 27 nomes de divisão reais
  conhecidos contra a nova categorização.
- `divisaoSortPriority` **não muda** — é uma função diferente (ordenação física
  dentro do apartamento), não a categorização do filtro.
- Nenhum outro ficheiro deve ser tocado além de `src/lib/utils.ts` em cada app —
  `TIPOS_DIVISAO` é lido dinamicamente por todos os consumidores existentes.

---

### Task 1: Desktop — colapsar categorias em `utils.ts`

**Files:**
- Modify: `obra-cabanas-app/src/lib/utils.ts`

**Interfaces:**
- Consumes: nada
- Produces: `TIPOS_DIVISAO` (7 categorias), `TipoDivisao`, `tipoDivisao(nome: string): TipoDivisao` — mesmos nomes de sempre, comportamento simplificado. Consumido automaticamente por `checklist-filters.tsx`, `checklist/page.tsx`, `consulta-filters.tsx`, `relatorio/consulta/page.tsx` e `relatorio/consulta/export/route.ts` (nenhum destes ficheiros precisa de ser modificado).

- [ ] **Step 1: Substituir `TIPOS_DIVISAO` e `tipoDivisao`**

Substitui:

```typescript
export const TIPOS_DIVISAO = [
  'Entrada', 'Sala', 'Cozinha', 'Suite Principal', 'Suite 1', 'Suite 2',
  'Outra Suite', 'Quarto', 'WC', 'Closet', 'Varanda',
] as const

export type TipoDivisao = typeof TIPOS_DIVISAO[number]

// Categoriza uma divisão pelo tipo de compartimento, colapsando variantes
// (WC Suite 1, WC de Serviço, WC(Suite Principal)...) numa única categoria "WC"
// para responder a perguntas do tipo "todas as casas de banho".
export function tipoDivisao(nome: string): TipoDivisao {
  const n = nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s*\(/g, ' (')
    .replace(/\s+/g, ' ')
    .trim()

  if (n.includes('wc')) return 'WC'
  if (n.startsWith('closet')) return 'Closet'
  if (n === 'sala') return 'Sala'
  if (n === 'cozinha') return 'Cozinha'
  if (n.startsWith('entrada')) return 'Entrada'
  if (n.startsWith('varanda')) return 'Varanda'
  if (n.startsWith('quarto')) return 'Quarto'
  if (n === 'suite principal') return 'Suite Principal'
  if (n.startsWith('suite 1')) return 'Suite 1'
  if (n.startsWith('suite 2')) return 'Suite 2'
  return 'Outra Suite'
}
```

por:

```typescript
export const TIPOS_DIVISAO = [
  'Entrada', 'Sala', 'Cozinha', 'Suites/Quartos', 'WC', 'Closet', 'Varanda',
] as const

export type TipoDivisao = typeof TIPOS_DIVISAO[number]

// Categoriza uma divisão pelo tipo de compartimento, colapsando variantes
// (WC Suite 1, WC de Serviço, WC(Suite Principal)...) numa única categoria "WC",
// e todas as suites/quartos (Suite Principal, Suite 1, Suite 2, Quarto, etc.)
// numa única categoria "Suites/Quartos" — não interessa distinguir qual suite
// específica no dia-a-dia do filtro.
export function tipoDivisao(nome: string): TipoDivisao {
  const n = nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s*\(/g, ' (')
    .replace(/\s+/g, ' ')
    .trim()

  if (n.includes('wc')) return 'WC'
  if (n.startsWith('closet')) return 'Closet'
  if (n === 'sala') return 'Sala'
  if (n === 'cozinha') return 'Cozinha'
  if (n.startsWith('entrada')) return 'Entrada'
  if (n.startsWith('varanda')) return 'Varanda'
  if (n.startsWith('suite') || n.startsWith('quarto')) return 'Suites/Quartos'
  return 'Suites/Quartos'
}
```

- [ ] **Step 2: Escrever script de verificação temporário**

Cria `obra-cabanas-app/scratch-verify-tipo-divisao.ts` (ficheiro temporário, NÃO
committed) com os 27 nomes de divisão reais conhecidos e as categorias
esperadas depois da mudança:

```typescript
import { tipoDivisao } from './src/lib/utils.ts'

const casos: [string, string][] = [
  ['Closet', 'Closet'],
  ['Closet (lavandaria)', 'Closet'],
  ['Closet (Suite Principal)', 'Closet'],
  ['Closet (Suite)', 'Closet'],
  ['Cozinha', 'Cozinha'],
  ['Entrada', 'Entrada'],
  ['Entrada / Acessos', 'Entrada'],
  ['Quarto', 'Suites/Quartos'],
  ['Quarto em frente', 'Suites/Quartos'],
  ['Sala', 'Sala'],
  ['Suite', 'Suites/Quartos'],
  ['Suite 1 em frente', 'Suites/Quartos'],
  ['Suite 2 à esquerda', 'Suites/Quartos'],
  ['Suite á direita (escritório)', 'Suites/Quartos'],
  ['Suite Principal', 'Suites/Quartos'],
  ['Varanda', 'Varanda'],
  ['WC', 'WC'],
  ['WC  (Suite Principal)', 'WC'],
  ['WC (Quarto)', 'WC'],
  ['WC (Suite 1)', 'WC'],
  ['WC (Suite 2)', 'WC'],
  ['WC (Suite Principal)', 'WC'],
  ['WC (Suite)', 'WC'],
  ['WC de Serviço', 'WC'],
  ['WC Serviço', 'WC'],
  ['WC(Suite 1)', 'WC'],
  ['WC(Suite Principal)', 'WC'],
]

let falhas = 0
for (const [nome, esperado] of casos) {
  const obtido = tipoDivisao(nome)
  if (obtido !== esperado) {
    falhas++
    console.log(`FALHA: "${nome}" -> "${obtido}" (esperado "${esperado}")`)
  }
}
console.log(falhas === 0 ? `OK: ${casos.length} casos passaram` : `${falhas} falhas`)
```

- [ ] **Step 3: Correr o script e confirmar que passa**

```bash
cd obra-cabanas-app
node scratch-verify-tipo-divisao.ts
```

Esperado: `OK: 27 casos passaram` (o aviso `MODULE_TYPELESS_PACKAGE_JSON` do Node
é inofensivo, ignora).

- [ ] **Step 4: Apagar o script temporário**

```bash
rm scratch-verify-tipo-divisao.ts
```

- [ ] **Step 5: Verificar build**

```bash
npm run build
```

Esperado: build sem erros de TypeScript (isto também confirma que
`checklist-filters.tsx`, `consulta-filters.tsx`, etc. continuam a compilar
corretamente com a nova lista de 7 categorias, sem precisar de alterações).

- [ ] **Step 6: Commit**

```bash
git add src/lib/utils.ts
git commit -m "feat: agrupar Suite Principal/Suite 1/Suite 2/Outra Suite/Quarto em Suites/Quartos"
```

---

### Task 2: Mobile — colapsar categorias em `utils.ts`

**Files:**
- Modify: `cabanas-mobile/src/lib/utils.ts`

**Interfaces:**
- Consumes: nada
- Produces: mesma coisa que a Task 1, cópia exata para o repo `cabanas-mobile`.
  Consumido automaticamente por `mobile-filters.tsx` e `checklist/page.tsx` —
  nenhum destes precisa de ser modificado.

- [ ] **Step 1: Substituir `TIPOS_DIVISAO` e `tipoDivisao`**

Substitui:

```typescript
export const TIPOS_DIVISAO = [
  'Entrada', 'Sala', 'Cozinha', 'Suite Principal', 'Suite 1', 'Suite 2',
  'Outra Suite', 'Quarto', 'WC', 'Closet', 'Varanda',
] as const

export type TipoDivisao = typeof TIPOS_DIVISAO[number]

// Categoriza uma divisão pelo tipo de compartimento, colapsando variantes
// (WC Suite 1, WC de Serviço, WC(Suite Principal)...) numa única categoria "WC"
// para responder a perguntas do tipo "todas as casas de banho".
export function tipoDivisao(nome: string): TipoDivisao {
  const n = nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s*\(/g, ' (')
    .replace(/\s+/g, ' ')
    .trim()

  if (n.includes('wc')) return 'WC'
  if (n.startsWith('closet')) return 'Closet'
  if (n === 'sala') return 'Sala'
  if (n === 'cozinha') return 'Cozinha'
  if (n.startsWith('entrada')) return 'Entrada'
  if (n.startsWith('varanda')) return 'Varanda'
  if (n.startsWith('quarto')) return 'Quarto'
  if (n === 'suite principal') return 'Suite Principal'
  if (n.startsWith('suite 1')) return 'Suite 1'
  if (n.startsWith('suite 2')) return 'Suite 2'
  return 'Outra Suite'
}
```

por (idêntico à Task 1):

```typescript
export const TIPOS_DIVISAO = [
  'Entrada', 'Sala', 'Cozinha', 'Suites/Quartos', 'WC', 'Closet', 'Varanda',
] as const

export type TipoDivisao = typeof TIPOS_DIVISAO[number]

// Categoriza uma divisão pelo tipo de compartimento, colapsando variantes
// (WC Suite 1, WC de Serviço, WC(Suite Principal)...) numa única categoria "WC",
// e todas as suites/quartos (Suite Principal, Suite 1, Suite 2, Quarto, etc.)
// numa única categoria "Suites/Quartos" — não interessa distinguir qual suite
// específica no dia-a-dia do filtro.
export function tipoDivisao(nome: string): TipoDivisao {
  const n = nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s*\(/g, ' (')
    .replace(/\s+/g, ' ')
    .trim()

  if (n.includes('wc')) return 'WC'
  if (n.startsWith('closet')) return 'Closet'
  if (n === 'sala') return 'Sala'
  if (n === 'cozinha') return 'Cozinha'
  if (n.startsWith('entrada')) return 'Entrada'
  if (n.startsWith('varanda')) return 'Varanda'
  if (n.startsWith('suite') || n.startsWith('quarto')) return 'Suites/Quartos'
  return 'Suites/Quartos'
}
```

- [ ] **Step 2: Escrever script de verificação temporário**

Cria `cabanas-mobile/scratch-verify-tipo-divisao.ts` (mesmo conteúdo do Step 2 da
Task 1):

```typescript
import { tipoDivisao } from './src/lib/utils.ts'

const casos: [string, string][] = [
  ['Closet', 'Closet'],
  ['Closet (lavandaria)', 'Closet'],
  ['Closet (Suite Principal)', 'Closet'],
  ['Closet (Suite)', 'Closet'],
  ['Cozinha', 'Cozinha'],
  ['Entrada', 'Entrada'],
  ['Entrada / Acessos', 'Entrada'],
  ['Quarto', 'Suites/Quartos'],
  ['Quarto em frente', 'Suites/Quartos'],
  ['Sala', 'Sala'],
  ['Suite', 'Suites/Quartos'],
  ['Suite 1 em frente', 'Suites/Quartos'],
  ['Suite 2 à esquerda', 'Suites/Quartos'],
  ['Suite á direita (escritório)', 'Suites/Quartos'],
  ['Suite Principal', 'Suites/Quartos'],
  ['Varanda', 'Varanda'],
  ['WC', 'WC'],
  ['WC  (Suite Principal)', 'WC'],
  ['WC (Quarto)', 'WC'],
  ['WC (Suite 1)', 'WC'],
  ['WC (Suite 2)', 'WC'],
  ['WC (Suite Principal)', 'WC'],
  ['WC (Suite)', 'WC'],
  ['WC de Serviço', 'WC'],
  ['WC Serviço', 'WC'],
  ['WC(Suite 1)', 'WC'],
  ['WC(Suite Principal)', 'WC'],
]

let falhas = 0
for (const [nome, esperado] of casos) {
  const obtido = tipoDivisao(nome)
  if (obtido !== esperado) {
    falhas++
    console.log(`FALHA: "${nome}" -> "${obtido}" (esperado "${esperado}")`)
  }
}
console.log(falhas === 0 ? `OK: ${casos.length} casos passaram` : `${falhas} falhas`)
```

- [ ] **Step 3: Correr o script e confirmar que passa**

```bash
cd cabanas-mobile
node scratch-verify-tipo-divisao.ts
```

Esperado: `OK: 27 casos passaram`.

- [ ] **Step 4: Apagar o script temporário**

```bash
rm scratch-verify-tipo-divisao.ts
```

- [ ] **Step 5: Verificar build**

```bash
npm run build
```

Esperado: build sem erros de TypeScript.

- [ ] **Step 6: Commit**

```bash
git add src/lib/utils.ts
git commit -m "feat: agrupar Suite Principal/Suite 1/Suite 2/Outra Suite/Quarto em Suites/Quartos"
```

---

### Task 3: Deploy e verificação final

**Files:** nenhum (só comandos)

- [ ] **Step 1: Push do repositório desktop**

```bash
cd obra-cabanas-app
git push origin main
```

- [ ] **Step 2: Push do repositório mobile**

```bash
cd cabanas-mobile
git push origin main
```

- [ ] **Step 3: Confirmar os dois deploys no Vercel**

Usa as ferramentas MCP do Vercel (`list_deployments`/`get_deployment`) com os
projectId/teamId já conhecidos:
`prj_oZRdE4TToeMdidycIpYc2nlwyVNI` (desktop) / `prj_s76lJDIk77PijtNmuymAb1QluJGv`
(mobile), `team_iCZ8qTkXtdMWAgj1wxgDIgnn`. Confirma `state: "READY"` para o
commit mais recente de cada projeto.

- [ ] **Step 4: Pedir ao Miguel para validar em produção**

Abrir `/checklist` (desktop e mobile) e `/relatorio/consulta` (desktop), confirmar
que o dropdown "Tipo de Divisão" mostra 7 categorias (não 11), com "Suites/Quartos"
a agrupar todas as suites e quartos.
