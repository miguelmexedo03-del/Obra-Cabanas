# Spec — Tabela de Materiais por Apartamento (Fase 1)

> **Estado:** design validado no brainstorming (2026-07-15). Pronto para writing-plans.
> **Nota:** a §4 (view de estado computado / bloqueio) fica marcada para rever com o Miguel antes de implementar.
> **Feature 2 do projeto** (F1 = Relatório Executivo, já entregue). Substitui/atualiza `SPEC_Materiais_Apartamento.md` da raiz, reconciliada com o código real.
> **Repositório:** `obra-cabanas-app` (Next.js 16 + Supabase, desktop-only).

---

## 1. Problema

A app tem o checklist de qualidade (`elementos` → `fases` → `apartamentos`), que responde a **"está feito?"**. Não tem nenhuma noção de **material físico** — se está encomendado, em stock, onde está, quando é aplicado — nem de **dependências entre trabalhos**. Isto é o que falta para responder a **"pode ser feito?"** e para planear.

O sócio/patrão (que na app é um `user` normal, com acesso a tudo) quer ver, por apartamento, o que falta em material. O Miguel quer registar o estado de supply-chain de cada artigo e as dependências ("o lavatório depende das pinturas").

## 2. Âmbito

**Dentro (Fase 1):**
- Tabela de materiais por apartamento: por cada (AP × categoria), o **estado**, **localização**, **data prevista de encomenda**, **data prevista de aplicação**.
- **Categorias adicionáveis na app** (gestão CRUD leve), não um seed fixo.
- **Dependências como relação** entre materiais do mesmo AP, com badge de bloqueio calculado.
- UI: vista por apartamento com edição inline.

**Fora (fases/ciclos seguintes, documentado):**
- **Preenchimento em massa** por categoria (aplicar estado+datas+localização a vários APs de uma vez). É a Fase 2, ciclo próprio logo a seguir — o eixo "por categoria" para planeamento.
- **Exportar do relatório (F1) para a tabela de materiais** (o relatório lista o que falta → cria linhas de material para planear). Passo futuro.
- Tabelas `fornecedores` e `subempreiteiros`; templates de dependência reutilizáveis entre APs; validação dura que impeça gravar data sem dependências resolvidas.
- **Sem controlo de acesso por apartamento** — o patrão é `user` e vê tudo, como qualquer user. RLS igual às outras tabelas.

## 3. Modelo de dados

Reconciliado com o código real: `apartamentos.id` é **`smallint`**; convenção de PK "de dados" é identidade (`bigint`/`smallint generated always as identity`); nomes de tabela em `snake_case` PT; reutilizar o trigger `set_updated_at()` (migration 0001).

### 3.1 `categorias_material` (adicionável na app)

```sql
create table categorias_material (
  id smallint generated always as identity primary key,
  nome text not null unique,
  ordem smallint not null default 0,      -- ordem de apresentação na tabela
  created_at timestamptz not null default now()
);
```

Seed inicial pequeno (o Miguel acrescenta o resto na app; lista a confirmar):
`pinturas, pladur e pedra, portas, aros, móveis de cozinha, móveis de quarto, eletrodomésticos, ar condicionado, bomba de calor, lavatório, sanita`.

### 3.2 `materiais` (uma linha por AP × categoria, criada on-demand)

```sql
create table materiais (
  id bigint generated always as identity primary key,
  apartamento_id smallint not null references apartamentos(id) on delete cascade,
  categoria_id smallint not null references categorias_material(id) on delete cascade,
  estado text not null default 'por_encomendar'
    check (estado in ('por_encomendar', 'encomendado', 'em_stock')),
  localizacao text,                        -- texto livre: "Armazém 1", "Fornecedor X", "AP7", "em obra"
  data_prevista_encomenda date,
  data_prevista_aplicacao date,
  updated_at timestamptz not null default now(),
  unique (apartamento_id, categoria_id)
);
```

- **Estado (3):** `por_encomendar` → `encomendado` → `em_stock` (= já chegou / disponível). O *onde* vive em `localizacao`, não no estado — foi a distinção que resolveu a confusão "em stock vs armazém".
- **Duas datas:** encomenda e aplicação, para o Miguel ver o lead time.
- **`localizacao`** texto livre (não criar tabela de fornecedores agora).
- Trigger `set_updated_at` em `before update`.

### 3.3 `material_dependencias` (relação, não texto livre)

```sql
create table material_dependencias (
  material_id bigint not null references materiais(id) on delete cascade,
  depende_de_material_id bigint not null references materiais(id) on delete cascade,
  primary key (material_id, depende_de_material_id),
  check (material_id <> depende_de_material_id)
);
```

Restrição de negócio (validada na aplicação, não em SQL): uma dependência só aponta para outro material do **mesmo `apartamento_id`**.

## 4. Estado computado — view de bloqueio  *(REVER com o Miguel antes de implementar)*

Não guardar "bloqueado" como coluna; calcular numa view para nunca dessincronizar.

```sql
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
```

- `bloqueado` = true se alguma dependência ainda não está `em_stock`.
- `dependencias_pendentes` = nomes das categorias em falta, para o badge.
- `security_invoker = on` — regra fixada no hardening (0011): views não vazam a anónimos.

> **A rever:** o critério de "dependência satisfeita". Aqui está `estado = 'em_stock'` (a dependência está disponível). Alternativa: satisfeita só quando **aplicada** — mas não há estado "aplicado" na Fase 1 (o checklist `elementos` é que marca o "feito"). Confirmar com o Miguel se "bloqueado" deve olhar para o estado do material dependente, para o checklist correspondente, ou ambos. Esta secção pode mudar.

## 5. UI

Rota nova `/materiais` (na sidebar, para todos os users).

**Vista por apartamento:** dropdown de AP + tabela, uma linha por categoria (todas as categorias, via left join; a linha de `materiais` cria-se por *upsert* ao editar).

Colunas: **Categoria · Estado (dropdown) · Localização (texto) · Data encomenda (date) · Data aplicação (date) · Dependências (badge)**.

- **Edição inline** em todos os campos, com *upsert* por (apartamento_id, categoria_id).
- **Dependências:** multi-select que lista só as outras categorias do mesmo AP. Badge lido da view: 🟢 "pronto" se `bloqueado = false`; 🟡 "bloqueado por: {dependencias_pendentes}" se `true`.
- **Aviso suave:** se o utilizador puser `data_prevista_aplicacao` numa linha com `bloqueado = true`, mostrar aviso inline — **não** bloquear a gravação (sinal, não validação dura).

**Gestão de categorias** (admin/user): ecrã/modal simples para adicionar, renomear e ordenar categorias (ex.: `/materiais/categorias`). É o que torna a lista "adicionável na app".

Server Components por defeito; mutações via Server Actions em `app/actions/` (retorno `{ success, ... }`, sem throw), seguindo as convenções do projeto.

## 6. Segurança / RLS

- `categorias_material`, `materiais`, `material_dependencias`: RLS ativa. Leitura por autenticados (`auth.uid() is not null`); escrita por `admin`/`user` (`current_user_role() in ('admin','user')`), como `elementos`/`tarefas_gantt` após a migration 0008.
- View `materiais_com_estado` com `security_invoker = on`.
- Detetar escrita bloqueada por RLS quando aplicável (padrão `.select()` após `update`, como em `gravarInstrucoesAction`).

## 7. Validações contra o código real (feitas)

- `apartamentos.id` = **`smallint`** → FKs `smallint`; `materiais.id`/deps `bigint`.
- Roles: só **`admin`** e **`user`**; ambos escrevem dados operacionais (migrations 0006/0008). Sem acesso por-AP.
- Trigger `set_updated_at()` já existe — reutilizar em `materiais`.
- Views devem ter `security_invoker = on` (hardening 0011).
- Próxima migration é a **`0013`** (a última aplicada foi `0012_relatorio_config`).
- Convenção PT snake_case, sem `any`, mutações sem throw.

## 8. Ordem de construção (Fase 1)

1. **Migration 0013** — `categorias_material`, `materiais`, `material_dependencias`, view `materiais_com_estado`, RLS, trigger, seed inicial de categorias.
2. **Server actions** — upsert de material (estado/localização/datas), CRUD de categorias, gerir dependências.
3. **UI vista por apartamento** — tabela com edição inline + badge de dependências + aviso suave.
4. **UI gestão de categorias**.

(Fase 2, ciclo próprio: preenchimento em massa por categoria.)
