# Categorias por Apartamento (Materiais Parte A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer com que cada apartamento mostre e gira apenas as categorias de material que lhe foram atribuídas (em vez de todas as categorias da paleta), com controlos para adicionar (da paleta ou criar nova) e remover categorias por AP.

**Architecture:** Sem migration — uma linha em `materiais` para `(apartamento_id, categoria_id)` já representa a atribuição. Adiciona-se uma server action `removeMaterial` (delete) e reescreve-se o componente `tabela-materiais.tsx` para renderizar só as categorias atribuídas e oferecer adicionar/remover. Atribuir reutiliza o `upsertMaterial` existente com patch vazio.

**Tech Stack:** Next.js 16 (App Router, Server Actions), Supabase (Postgres + RLS), TypeScript.

## Global Constraints

- **Verificação local só com Vitest.** tsc/next build/next dev/playwright **NÃO** correm localmente (RAM ~1GB → freeze do Windows). tsc e build ficam para o Vercel CI. Ver [[feedback_localhost_crash_ram]].
- **PT-PT em toda a UI. Código e identificadores em inglês; `snake_case` para colunas Postgres.**
- **Server Actions devolvem `{ success: true } | { success: false, error: string }`. Nunca `throw`.**
- **Sem `any`.** Usar `unknown` + narrowing ou os tipos já existentes.
- **Sem migration e sem tocar em `src/lib/database.types.ts`** — o schema não muda.
- **Não usar `window.confirm`/`alert`** (dialogs do browser). Feedback via `toast` (sonner), como no resto do ficheiro.

---

### Task 1: Server actions — `removeMaterial` + `addCategoria` devolve id

**Files:**
- Modify: `src/app/actions/materiais.ts`

**Interfaces:**
- Consumes: `Ok`, `requireUser`, `revalidatePath`, `categoriaSchema` (já existentes no ficheiro).
- Produces:
  - `removeMaterial(apartamentoId: number, categoriaId: number): Promise<Ok>` — apaga a linha `materiais` de `(apartamentoId, categoriaId)`.
  - `addCategoria(nome: string): Promise<{ success: true; id: number } | { success: false; error: string }>` — agora devolve o `id` da categoria criada (era `Promise<Ok>`).

Verificado: o único outro consumidor de `addCategoria` é `src/app/(app)/materiais/categorias/_components/gestor-categorias.tsx:17`, que só usa `r.success`/`r.error` — acrescentar `id` no sucesso é aditivo e não o parte.

- [ ] **Step 1: Adicionar a action `removeMaterial` no fim de `src/app/actions/materiais.ts`**

```ts
// Tira uma categoria de um apartamento (apaga a linha materiais desse AP x categoria).
// As dependencias caem por FK on delete cascade; as notas vivem na propria linha.
export async function removeMaterial(apartamentoId: number, categoriaId: number): Promise<Ok> {
  const { supabase, user } = await requireUser()
  if (!user) return { success: false, error: 'Não autenticado.' }

  const { error } = await supabase
    .from('materiais')
    .delete()
    .eq('apartamento_id', apartamentoId)
    .eq('categoria_id', categoriaId)
  if (error) return { success: false, error: error.message }
  revalidatePath('/materiais', 'layout')
  return { success: true }
}
```

- [ ] **Step 2: Fazer `addCategoria` devolver o id**

Substituir a assinatura e o retorno de sucesso da `addCategoria` existente (mantendo a validação e os checks de erro/RLS):
```ts
export async function addCategoria(nome: string): Promise<{ success: true; id: number } | { success: false; error: string }> {
  const parsed = categoriaSchema.safeParse({ nome })
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Inválido.' }

  const { supabase, user } = await requireUser()
  if (!user) return { success: false, error: 'Não autenticado.' }

  const { data, error } = await supabase
    .from('categorias_material')
    .insert({ nome: parsed.data.nome })
    .select('id')
  if (error) return { success: false, error: 'Já existe ou sem permissão.' }
  const id = data?.[0]?.id
  if (id == null) return { success: false, error: 'Sem permissão para gravar.' }
  revalidatePath('/materiais', 'layout')
  return { success: true, id }
}
```

- [ ] **Step 3: Verificar por leitura (sem tsc local)**

Confirmar: `removeMaterial(apId, categoriaId)` corresponde ao que a Task 2 importa; `addCategoria` devolve `id` no sucesso; `gestor-categorias.tsx` continua a compilar (só usa `r.success`/`r.error`); nada faz `throw`. Não correr tsc/build.

- [ ] **Step 4: Commit**

```bash
git add src/app/actions/materiais.ts
git commit -m "feat(materiais): action removeMaterial + addCategoria devolve id"
```

---

### Task 2: UI — categorias atribuídas por AP + adicionar/remover

Sem teste local (client component; tsc/build no Vercel). Verificação: revisor lê o diff; comportamento no preview Vercel.

**Files:**
- Modify: `src/app/(app)/materiais/_components/tabela-materiais.tsx`

**Interfaces:**
- Consumes: `upsertMaterial(apId, categoriaId, patch)`, `addCategoria(nome)`, **`removeMaterial(apId, categoriaId)`** (Task 1), `addDependencia`, `removeDependencia` de `@/app/actions/materiais`. `ESTADOS/estadoLabel/SITIOS/sitioLabel` de `@/lib/materiais/estado`.
- Produces: `TabelaMateriais` que mostra só categorias atribuídas ao AP e permite adicionar/remover.

Contexto do ficheiro atual (para o implementer): hoje o corpo da tabela faz `categorias.map(cat => { const row = rows.get(cat.id); ... })` e renderiza uma linha por **toda** a categoria da paleta, com um estado especial quando `row` é `undefined`. `rows` é um `Map<number, MaterialLinha>` (categoria_id -> linha) preenchido em `carregar` a partir da tabela `materiais` filtrada pelo AP. Já existem os helpers `editar`, `gravarNotas`, `adicionarDependencia`, `removerDependencia`, e os `useMemo` `nomePorCategoria`/`categoriaPorMaterial`.

- [ ] **Step 1: Importar `removeMaterial` e `addCategoria`**

Na linha de import das actions, juntar `removeMaterial` e `addCategoria`:
```ts
import { upsertMaterial, addCategoria, removeMaterial, addDependencia, removeDependencia } from '@/app/actions/materiais'
```

- [ ] **Step 2: Adicionar estado local para os controlos de "adicionar categoria"**

Junto aos outros `useState` do componente:
```ts
// categoria da paleta selecionada no dropdown "adicionar da paleta"
const [novaCategoriaPaleta, setNovaCategoriaPaleta] = useState<string>('')
// texto do input "criar nova categoria e adicionar a este AP"
const [nomeNovaCategoria, setNomeNovaCategoria] = useState<string>('')
```

- [ ] **Step 3: Handlers de adicionar/remover categoria**

Adicionar dentro do componente (a seguir a `removerDependencia`):
```ts
// Atribui uma categoria da paleta a este AP: cria a linha materiais com defaults.
async function atribuirCategoria(categoriaId: number) {
  const r = await upsertMaterial(apId, categoriaId, {})
  if (!r.success) { toast.error(r.error); return }
  await carregar(apId)
}

// Cria uma categoria nova na paleta (Task 1: addCategoria devolve id) e atribui-a logo a este AP.
async function criarEAtribuir(nome: string) {
  const nomeTrim = nome.trim()
  if (!nomeTrim) return
  const criada = await addCategoria(nomeTrim)
  if (!criada.success) { toast.error(criada.error); return }
  setNomeNovaCategoria('')
  await atribuirCategoria(criada.id)
}

// Tira a categoria deste AP.
async function removerCategoria(categoriaId: number) {
  const r = await removeMaterial(apId, categoriaId)
  if (!r.success) { toast.error(r.error); return }
  await carregar(apId)
}
```

Nota: a categoria nova é criada na paleta e atribuída via `atribuirCategoria(criada.id)`, que faz `carregar(apId)` — passa a aparecer atribuída ao AP. A paleta em memória (`categorias`, via props) não a inclui como "por atribuir", o que é correto (já está atribuída). Sem `window.location.reload()`.

- [ ] **Step 4: Derivar a lista de categorias atribuídas e as não-atribuídas**

Antes do `return`, com os `useMemo` existentes:
```ts
// categorias atribuidas a este AP = as que tem linha em `rows`, ordenadas pela paleta
const categoriasAtribuidas = categorias.filter(c => rows.has(c.id))
// categorias da paleta ainda nao atribuidas (para o dropdown de adicionar)
const categoriasPorAtribuir = categorias.filter(c => !rows.has(c.id))
```

- [ ] **Step 5: Trocar o corpo da tabela para iterar só as atribuídas**

Substituir `... : categorias.map(cat => {` por `... : categoriasAtribuidas.map(cat => {`, e como agora `row` existe sempre para estas categorias, obter a linha sem fallback:
```ts
}) : categoriasAtribuidas.map(cat => {
  const row = rows.get(cat.id)!
  const estado = row.estado
  const depsAtuais = deps.get(row.id) ?? []
  const candidatos = categorias.filter(c => {
    if (c.id === cat.id) return false
    const outra = rows.get(c.id)
    if (!outra) return false
    return !depsAtuais.includes(outra.id)
  })
  const valorSelecionado = novaDependencia.get(cat.id) ?? ''
  // ... (resto da linha igual ao atual, mas sem o ramo `!row ? aviso : (...)`:
  //      a célula "Depende de" usa diretamente o bloco que hoje está no ramo `else`)
```
Na célula "Categoria" (primeira `<td>`), juntar o botão de remover ao lado do nome:
```tsx
<td className="py-2 pr-3">
  <div className="flex items-center gap-1">
    <span>{cat.nome}</span>
    <Button
      variant="ghost"
      size="icon-xs"
      title="Remover esta categoria deste apartamento"
      onClick={() => removerCategoria(cat.id)}
    >
      ×
    </Button>
  </div>
</td>
```
Na célula "Depende de", remover o ramo `!row ? (<span>Edita a linha…</span>) : (...)` e deixar só o conteúdo do `(...)` (o `row` já existe). Onde o código usava `row?.notas`/`row.notas`, passa a `row.notas` sempre.

- [ ] **Step 6: Estado vazio + controlos de adicionar categoria (abaixo da tabela)**

Se `categoriasAtribuidas.length === 0` (e já carregou), mostrar uma linha de aviso no corpo da tabela:
```tsx
{loadedFor === apId && categoriasAtribuidas.length === 0 && (
  <tr><td colSpan={6} className="py-2 pr-3 text-muted-foreground">
    Nenhuma categoria atribuída a este apartamento. Adiciona uma abaixo.
  </td></tr>
)}
```
Depois da `</table>`, um bloco de controlos:
```tsx
<div className="flex items-end gap-4 flex-wrap pt-2">
  <div className="flex items-center gap-1">
    <select
      className="border rounded px-2 py-1"
      value={novaCategoriaPaleta}
      onChange={e => setNovaCategoriaPaleta(e.target.value)}
    >
      <option value="">+ adicionar categoria (da paleta)</option>
      {categoriasPorAtribuir.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
    </select>
    <Button
      variant="outline"
      size="sm"
      disabled={!novaCategoriaPaleta}
      onClick={() => {
        atribuirCategoria(Number(novaCategoriaPaleta))
        setNovaCategoriaPaleta('')
      }}
    >
      Adicionar
    </Button>
  </div>
  <div className="flex items-center gap-1">
    <input
      className="border rounded px-2 py-1"
      placeholder="nova categoria…"
      value={nomeNovaCategoria}
      onChange={e => setNomeNovaCategoria(e.target.value)}
    />
    <Button
      variant="outline"
      size="sm"
      disabled={!nomeNovaCategoria.trim()}
      onClick={() => criarEAtribuir(nomeNovaCategoria)}
    >
      Criar e adicionar
    </Button>
  </div>
</div>
```

- [ ] **Step 7: Auto-revisão por leitura**

Reler o ficheiro de ponta a ponta: sem referências a um `row` possivelmente `undefined` dentro do loop das atribuídas; `colSpan` continua 6; imports todos usados; sem `any`; controlos de adicionar/remover ligados aos handlers certos; PT-PT nos textos. Não correr tsc/build.

- [ ] **Step 8: Commit**

```bash
git add "src/app/(app)/materiais/_components/tabela-materiais.tsx" src/app/actions/materiais.ts
git commit -m "feat(materiais): mostrar só categorias atribuídas por AP; adicionar/remover categoria por apartamento"
```

---

## Self-Review (checklist do autor do plano)

**Spec coverage:**
- §3 "tabela mostra só atribuídas" → Task 2 Step 4-5. ✅
- §3 "adicionar da paleta" + "criar nova" → Task 2 Step 6 (+ Step 3/7 handlers). ✅
- §3/§4 "remover deste AP" via `removeMaterial` → Task 1 + Task 2 Step 5. ✅
- §3 "estado vazio" → Task 2 Step 6. ✅
- §2 "sem migration" → nenhum step de migration. ✅

**Placeholder scan:** sem TBD/TODO; todos os steps têm código concreto. Uma única variante (sem `reload`).

**Type consistency:** `removeMaterial(apId, categoriaId)` igual entre Task 1 (produz) e Task 2 (consome). `addCategoria` passa a devolver `{ success: true; id } | { success: false; error }` na Task 1 e a Task 2 consome `criada.id`. Consumidor existente (`gestor-categorias.tsx`) só usa `success`/`error` — compatível. `atribuirCategoria`/`criarEAtribuir`/`removerCategoria` internos ao componente.
