# Refinamento da Tabela de Materiais (F2 — iteração 2)

**Data:** 2026-07-16
**Estado:** desenho aprovado
**Contexto:** iteração sobre a F2 (`/materiais`) entregue em 2026-07-15. Feedback do Miguel após ver a tabela em produção (screenshot `Captura de ecrã 2026-07-16 131121.png`).

---

## 1. Objetivo

Ajustar a tabela de materiais por apartamento a como o Miguel a usa na prática:

1. Tirar a data de encomenda (fica só a data de aplicação).
2. Tirar a coluna/badge de **Bloqueio** — deixa de haver lógica de bloqueio.
3. Renomear a dependência para **Depende de**, com linhas mistas (ligações a categorias **+** notas de texto livre), uma por linha (não separadas por vírgulas).
4. Acrescentar um passo intermédio de **Sítio** (Em armazém / Em obra) que só aparece quando o material já está **Em stock**, seguido da **Localização** (qual armazém / qual AP).

O estado (`Por encomendar / Encomendado / Em stock`) **não muda**.

---

## 2. Colunas da tabela (nova ordem)

| Categoria | Estado | Sítio | Localização | Data aplicação | Depende de |
|---|---|---|---|---|---|

Saíram, face à versão anterior: `Data encomenda` e a coluna `Bloqueio`.

### Comportamento

- **Estado** — dropdown inalterado: `por_encomendar` / `encomendado` / `em_stock`.
- **Sítio** — dropdown `Em armazém` / `Em obra`. **Renderizado só quando `estado === 'em_stock'`**; caso contrário a célula mostra `—`. Nullable.
- **Localização** — input de texto livre. **Renderizado só quando `estado === 'em_stock'`**; caso contrário `—`. Serve para indicar qual armazém, ou qual AP quando está em obra.
- **Data aplicação** — input `date`, inalterado (`data_prevista_aplicacao`).
- **Depende de** — ver secção 3.

Nota: ao sair de `em_stock`, os valores de `sitio`/`localizacao` **não são apagados**, apenas deixam de ser mostrados; se voltar a `em_stock` reaparecem.

---

## 3. Coluna "Depende de"

Substitui a antiga coluna `Bloqueio` + `Dependências`. Apresenta, **linha a linha**, dois tipos de linha misturados:

1. **Ligações a categorias** do mesmo AP — estruturadas, via a tabela `material_dependencias` existente. Cada uma removível com `[x]`. Adicionadas por um dropdown `+ categoria ▼` que lista as outras categorias do AP com linha já criada e que ainda não são dependência.
2. **Notas de texto livre** — cada nota na sua própria linha, removível com `[x]`. Adicionadas por um botão `+ nota` que insere uma linha editável. Guardadas em `materiais.notas` (lista de texto).

**Sem lógica de bloqueio.** A coluna é puramente informativa; não há badge 🟡/🟢 nem avisos ao marcar datas.

Exemplo visual:

```
Depende de:
 • Portas [x]
 • Pladur e pedra [x]
 falta confirmar medidas [x]

 [ + categoria ▼ ]  [ + nota ]
```

---

## 4. Mudanças de schema — migration `0014_materiais_refinamento.sql`

```sql
-- 1. Remover a data de encomenda (fica só a de aplicação)
alter table materiais drop column data_prevista_encomenda;

-- 2. Sítio físico (só relevante quando em stock)
alter table materiais add column sitio text
  check (sitio in ('em_armazem', 'em_obra'));

-- 3. Notas livres, uma por linha na UI
alter table materiais add column notas text[] not null default '{}';

-- 4. View deixa de calcular "bloqueado"; a UI passa a ler a tabela `materiais`.
drop view materiais_com_estado;
```

- `material_dependencias` **mantém-se** tal como está (ligações a categorias do mesmo AP).
- A view `materiais_com_estado` é **removida**. A UI passa a fazer `select` diretamente sobre `materiais` (RLS de leitura já permite). As ligações a categorias continuam a ser lidas por query separada a `material_dependencias`, como já acontece hoje.
- `notas` como `text[]` (uma nota por elemento) permite render linha a linha e remoção individual.

⚠️ **Destrutivo:** `drop column data_prevista_encomenda` apaga o conteúdo dessa coluna. A feature é de 2026-07-15 (um dia antes), sem dados reais esperados. Confirmar com o Miguel antes de aplicar em produção.

---

## 5. Ficheiros afetados

- `supabase/migrations/0014_materiais_refinamento.sql` — **novo**.
- `src/lib/materiais/types.ts` — tipo `Sitio` (`'em_armazem' | 'em_obra'`); tirar `data_prevista_encomenda`; adicionar `sitio`, `notas: string[]`.
- `src/lib/materiais/estado.ts` — `SITIOS`, `sitioLabel()`. `ESTADOS`/`estadoLabel` inalterados.
- `src/lib/materiais/validations.ts` — `materialPatchSchema`: remover `data_prevista_encomenda`; adicionar `sitio` (enum nullable) e `notas` (array de strings).
- `src/app/actions/materiais.ts` — `upsertMaterial` aceita `sitio` e `notas`; `addDependencia`/`removeDependencia` inalteradas.
- `src/app/(app)/materiais/_components/tabela-materiais.tsx` — nova ordem de colunas; Sítio + Localização condicionais a `em_stock`; coluna "Depende de" com ligações + notas linha a linha; remover coluna Bloqueio e a leitura de `bloqueado`/`dependencias_pendentes`; passar a ler de `materiais` em vez da view.
- `src/lib/database.types.ts` — regenerar (via MCP + cópia; ver [[supabase-gen-types-auth]]).

---

## 6. Testes

Vitest (lógica pura, único que corre localmente por causa da RAM):

- `estado.ts`: `sitioLabel` mapeia os dois valores; `SITIOS` tem os dois.
- `validations.ts`: `materialPatchSchema` aceita `sitio` válido/null, rejeita valor fora do enum; aceita `notas` como array de strings; já não aceita `data_prevista_encomenda`.

tsc/build deferidos para o Vercel CI (constraint de RAM ~1GB local).

---

## 7. Fora de âmbito (não fazer agora)

- Preenchimento em massa por categoria (Fase 2 dos materiais).
- Exportar do relatório F1 o que falta para criar linhas aqui.
- Qualquer reintrodução de lógica de bloqueio.
