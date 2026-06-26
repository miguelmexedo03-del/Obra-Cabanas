# Design — Gestão de Itens de Checklist

**Data:** 2026-06-26  
**Âmbito:** Desktop (`obra-cabanas-app`) + Mobile (`cabanas-mobile`)  
**Estado:** Aprovado

---

## Contexto

A checklist tem 3748 itens importados do Excel. Os utilizadores precisam de adicionar itens novos durante a obra — tanto individualmente (um item numa divisão específica) como em massa (o mesmo item em múltiplas divisões de vários apartamentos). Não há alterações ao schema da BD — usa-se a tabela `elementos` existente.

---

## Decisões Arquiteturais

**`fase_id` em adição individual:** campo obrigatório na tabela, mas não exposto ao utilizador. É determinado automaticamente como a fase mais frequente nos itens existentes da divisão. Se a divisão estiver vazia, usa `fase_id = 1` como fallback. O utilizador pode reclassificar o item manualmente noutro momento se necessário.

**`fase_id` em adição em massa:** o utilizador escolhe explicitamente a fase no Passo 1 do wizard — é uma ação deliberada sobre muitas divisões, por isso justifica-se pedir.

**Refinamento no wizard em massa:** só por divisão individual. Desmarcar por apartamento inteiro fica como melhoria futura (Opção B).

---

## Parte 1 — Adição Individual

### Desktop (`/apartamentos/[id]`)

Cada divisão ganha um botão `+ Adicionar item` no fundo da sua lista de itens.

**UX inline:**
1. Estado inicial: botão cinzento subtil `+ Adicionar item` após o último item
2. Ao clicar: botão substitui-se por input de texto + botão de confirmar `✓`
3. `Enter` ou clique em `✓` → cria item, fecha input, item aparece imediatamente
4. `Escape` → cancela, volta ao botão
5. Campo vazio → ignora (não cria)

**Comportamento técnico:**
- O bloco de grupos da página `/apartamentos/[id]` é extraído para um `ChecklistGroups` Client Component
- `useOptimistic` + `startTransition` para item aparecer antes da confirmação do Supabase
- Item temporário tem `id` negativo (ex: `-Date.now()`)
- Quando Server Action confirma, `router.refresh()` substitui o temp pelo item real
- Em caso de erro: item temporário desaparece + `toast.error()`

### Mobile (`/apartamentos/[id]` em `cabanas-mobile`)

Mesmo comportamento. `ApartamentoChecklist` já é um Client Component — o botão inline é adicionado no fundo de cada `<details>` de divisão. Usa `useState` + `router.refresh()` (consistente com o padrão já existente na mobile).

### Server Action — `criarElemento`

```
criarElemento(apartamentoId, divisaoId, faseId, nome)
→ { success: true, id: number } | { success: false, error: string }
```

Criada em `app/actions/checklist.ts` em ambas as apps.

---

## Parte 2 — Adição em Massa (desktop only)

### Acesso

- Link **"Gerir Itens"** na sidebar (entre Checklist e Gantt)
- Botão **"Gerir Itens"** na página `/apartamentos` (junto ao "Exportar relatórios")

### Rota

`/gerir-itens` — Server Component que pré-carrega fases e divisões normalizadas, passa para `GerirItensClient` (Client Component).

### Normalização de nomes de divisões

```
normalizarNome("WC 2") → "wc"
normalizarNome("Casa de Banho") → "casa de banho"
```

Passos: lowercase → remover acentos (NFD + strip combining chars) → trim → remover sufixo numérico (`/\s+\d+$/`) → normalizar espaços. Os nomes originais **nunca são alterados** — a normalização é só para agrupamento.

### Wizard — 3 passos

**Passo 1 — Setup**
- Campo de texto: "Nome do item" (obrigatório)
- Dropdown: "Fase" (11 opções ordenadas por `ordem`)
- Botão "Seguinte" (desativado se nome vazio)

**Passo 2 — Selecionar grupos**
- Lista de grupos normalizados, ex: "WC (9 divisões em 7 APs)", "Quarto (14 divisões em 8 APs)"
- Checkbox por grupo; "Selecionar todos" / "Limpar seleção"
- Botão "Seguinte" (desativado se nenhum grupo selecionado)

**Passo 3 — Refinar + confirmar**
- Lista das divisões individuais resultantes: "✓ WC — AP1", "✓ WC 1 — AP3", etc.
- Checkbox individual por divisão para excluir casos específicos
- Botão **"Adicionar item a X divisões"** (X atualiza em tempo real)
- Após confirmar: resultado inline "Item criado em X divisões" + botão "Adicionar outro item"

### Server Action — `criarElementosBatch`

```
criarElementosBatch(itens: Array<{apartamento_id, divisao_id, fase_id, elemento}>)
→ { success: true, count: number } | { success: false, error: string }
```

INSERT em batch via Supabase, com `revalidatePath`.

---

## Ficheiros a Criar / Modificar

### Desktop (`obra-cabanas-app`)

| Ficheiro | Tipo | Alteração |
|---|---|---|
| `src/app/actions/checklist.ts` | Editar | + `criarElemento`, `criarElementosBatch` |
| `src/components/checklist/add-item-inline.tsx` | Novo | Botão + input inline |
| `src/components/checklist/checklist-groups.tsx` | Novo | Wrapper Client Component com `useOptimistic` |
| `src/app/(app)/apartamentos/[id]/page.tsx` | Editar | Usar `ChecklistGroups` em vez de inline; calcular `defaultFaseId` |
| `src/components/layout/app-sidebar.tsx` | Editar | + link "Gerir Itens" |
| `src/app/(app)/apartamentos/page.tsx` | Editar | + botão "Gerir Itens" |
| `src/app/(app)/gerir-itens/page.tsx` | Novo | Server Component — fetch fases + divisões |
| `src/app/(app)/gerir-itens/_components/gerir-itens-client.tsx` | Novo | Wizard 3 passos |

### Mobile (`cabanas-mobile`)

| Ficheiro | Tipo | Alteração |
|---|---|---|
| `src/app/actions/checklist.ts` | Editar | + `criarElemento` |
| `src/components/apartamento-checklist.tsx` | Editar | + botão inline + lógica de add |
| `src/app/(app)/apartamentos/[id]/page.tsx` | Editar | + `id` e `defaultFaseId` nos grupos |

---

## Fora de Âmbito

- Painel em massa na mobile (só desktop)
- Desmarcar por apartamento inteiro no wizard (melhoria futura — Opção B)
- Edição ou remoção de itens existentes
- Alterações ao schema da BD
