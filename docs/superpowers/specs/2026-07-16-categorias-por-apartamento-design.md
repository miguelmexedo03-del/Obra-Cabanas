# Categorias por Apartamento (Materiais — Parte A)

**Data:** 2026-07-16
**Estado:** desenho aprovado
**Contexto:** iteração sobre a tabela de materiais (`/materiais`). Hoje as categorias são globais e **todas** aparecem em **todos** os APs. O Miguel quer que cada apartamento tenha o **seu próprio conjunto** de categorias.

Esta é a **Parte A** (a base). A **Parte B** (atribuição em massa a vários APs) fica desenhada como seguimento, spec própria.

---

## 1. Objetivo

Passar de "todas as categorias em todos os APs" para "cada AP tem as categorias que lhe foram atribuídas":

- A tabela de um AP mostra **só as categorias atribuídas** a esse AP.
- Adicionar uma categoria a um AP (a partir de uma paleta partilhada, ou criando uma nova).
- Remover uma categoria de um AP (só desse AP).

---

## 2. Modelo (sem migration)

O schema atual já suporta isto — **não é preciso migration**:

- **Paleta partilhada** = tabela `categorias_material` (a lista-mestra de opções). Já existe. Gerida em `/materiais/categorias`.
- **Atribuição** = existir uma linha em `materiais` para esse `(apartamento_id, categoria_id)` (unique já garantido). Uma linha = "esta categoria está atribuída a este AP".

Mudança de comportamento: **adicionar uma categoria à paleta deixa de a fazer aparecer em todos os APs.** Só aparece num AP quando lhe é explicitamente atribuída.

---

## 3. Comportamento da tabela do AP

- Renderiza **apenas** as categorias com linha em `materiais` para o AP selecionado (as atribuídas), ordenadas por `categorias_material.ordem`.
- Consequência: dentro do loop de linhas, a linha (`row`) existe **sempre** — desaparece o estado "Edita a linha para poderes ligar dependências"; as colunas Estado/Sítio/Localização/Data/Depende-de funcionam como já fazem hoje.
- **Estado vazio:** se o AP não tem nenhuma categoria atribuída, mostrar "Nenhuma categoria atribuída a este apartamento. Adiciona uma abaixo." + o controlo de adicionar.

### Adicionar categoria a este AP
Abaixo da tabela, um controlo com dois caminhos:
1. **Da paleta:** dropdown com as categorias da paleta **ainda não atribuídas** a este AP + botão "Adicionar". Atribuir = criar a linha via `upsertMaterial(apId, categoriaId, {})` (cria com defaults: estado `por_encomendar`).
2. **Nova categoria:** input de texto + botão "Criar e adicionar". Cria a categoria na paleta (`addCategoria(nome)`) e a seguir atribui-a a este AP. Fica na paleta disponível para outros APs, mas atribuída só a este.

### Remover categoria deste AP
- Um `×` (ou "remover") em cada linha → apaga a linha de `materiais` desse `(AP, categoria)` via **nova server action `removeMaterial(apId, categoriaId)`**. As dependências (`material_dependencias`) caem por FK `on delete cascade`; as notas vivem na própria linha, por isso também desaparecem.
- Remoção é imediata (sem modal de confirmação — é reversível re-adicionando), com toast de sucesso. Não usar `window.confirm` (dialog do browser).

---

## 4. Server action nova — `removeMaterial`

Em `src/app/actions/materiais.ts`:

```ts
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

`Ok`, `requireUser` e `revalidatePath` já existem no ficheiro. RLS (`admin/user`) já cobre delete.

Atribuir usa o `upsertMaterial` existente (sem action nova).

---

## 5. Ficheiros afetados

- `src/app/actions/materiais.ts` — adicionar `removeMaterial`.
- `src/app/(app)/materiais/_components/tabela-materiais.tsx` — renderizar só categorias atribuídas; controlo "adicionar categoria a este AP" (paleta + criar nova); botão remover por linha; estado vazio. Simplificar o loop (o `row` passa a existir sempre).
- **Sem migration. Sem mudança em `src/lib/database.types.ts`.** `/materiais/categorias` (gestão da paleta) fica igual.

---

## 6. Testes

Vitest só corre lógica pura; as server actions e a UI não têm teste local (constraint de RAM → tsc/build no Vercel). Não há lógica pura nova nesta parte (a `removeMaterial` é um delete direto). Por isso:

- **Sem testes Vitest novos** (nada de puro a testar).
- Verificação: revisor lê o diff; build/tsc e comportamento no preview Vercel (mostrar só atribuídas; adicionar da paleta; criar nova; remover; estado vazio).

Se durante a implementação surgir lógica pura extraível (ex.: cálculo de "categorias não atribuídas"), essa sim leva teste — mas mantém-se trivial e inline.

---

## 7. Fora de âmbito (Parte B e outros)

- **Parte B — atribuição em massa:** escolher categoria(s) + vários APs, opcionalmente preencher estado/sítio/datas/localização, aplicar com escolha "só-vazios / sobrescrever" no momento (mostra "vais afetar N APs"). Spec própria depois da Parte A.
- Exportar do relatório F1 o que falta para criar linhas (stand-by, decisão do Miguel).
- "Depende de" continua por-AP e relacional; nunca entra no fluxo de massa.
