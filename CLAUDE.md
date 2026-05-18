# Obra Cabanas — App de Gestão de Obra

Este ficheiro é o **contexto persistente** do projeto. Lê-o sempre antes de qualquer tarefa.

---

## 1. Domínio

Aplicação web colaborativa para gerir uma obra de reabilitação de **24 apartamentos** no empreendimento "Cabanas" (Algarve). Substitui um workflow atual baseado em Excel (checklist + Gantt) por uma plataforma com base de dados partilhada, com atualização em tempo real.

**Utilizadores-alvo (3 perfis):**
- `admin` — Miguel (owner). CRUD total.
- `user` — todas as funcionalidades menos o audit 


**Constraints reais:**
- Obra em construção civil, baixa digitalização, resistência à mudança.
- **Português europeu (PT-PT)** em toda a UI. Código em inglês.
- Audit trail obrigatório: quem fez check, quando, em que item. Construção tem implicações de responsabilidade.

---

## 2. Tech Stack (decidido, não re-debater)

- **Frontend:** Next.js 16 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** Supabase (Postgres + Auth + Realtime + Row-Level Security)
- **Charts/Gantt:** Custom CSS grid + barras absolutas (Pointer Events API para drag/resize). Sem biblioteca externa — otimizado para desktop.
- **Kanban:** `@dnd-kit/core` + `@dnd-kit/sortable`
- **Data fetching:** Server Components + `@tanstack/react-query` para estado do cliente
- **Forms:** `react-hook-form` + `zod` para validação
- **Deploy:** Vercel (frontend) + Supabase Cloud (backend)
- **Target:** **Desktop/PC only.** App mobile será um projeto separado no futuro, com a mesma BD Supabase. Não otimizar para mobile nesta app.

**Nunca propor:** outros frameworks (Vue, Svelte), outras BDs (Firebase, MongoDB), outros ORMs (Prisma, Drizzle), PWA/service workers — a escolha já foi feita.

---

## 3. Data Model

Entidades principais (ver `supabase/schema.sql` para detalhes):

```
profiles           (1:1 com auth.users, tem role)
apartamentos       (24 rows fixas: AP1..AP24)
fases              (5 rows: Tetos, Paredes, Carpintaria, Chão/Rodapé, WC Equipamentos)
divisoes           (por apartamento: Entrada, Suite 1, WC Suite 1, Sala, Cozinha, Varanda...)
elementos          (os items do checklist — ~3748 rows)
tarefas_gantt      (parent + children; 24 + 264 = 288 rows — 11 fases × 24 APs)
audit_log          (quem mudou o quê, quando)
```

Relações-chave:
- `elementos.fase_id → fases.id` (classificação pré-computada, não por string matching em runtime)
- `elementos.apartamento_id → apartamentos.id`
- `tarefas_gantt.parent_id → tarefas_gantt.id` (self-reference para pai-filho)
- O **Kanban é uma VIEW** sobre `tarefas_gantt` filtrada por status.

**Progresso é calculado, não armazenado:**
- Progresso de uma fase × apartamento = `COUNT(elementos WHERE checked=true) / COUNT(*)` com `fase_id` e `apartamento_id` correspondentes.
- Progresso do apartamento = média ponderada dos progressos das fases.
- Progresso da obra = média dos apartamentos.

---

## 4. Regras de Negócio

**Classificação por fase** (11 fases — classificação usa elemento + sub_elemento):
- F1 Teto (id=1): "teto" no elemento, sub_elemento nulo ou "tratamento"
- F9 Remendos Teto (id=9): "teto" no elemento, sub_elemento com parafuso/foco/fissur/humidade
- F10 Pintura Teto (id=10): "teto" no elemento, sub_elemento com dem/extracoat/prim
- F2 Paredes (id=2): "parede" no elemento, sub_elemento com pedra/pladur/fecho ou nulo
- F11 Remendo Paredes (id=11): "parede" no elemento, sub_elemento com tomad/interruptor/mecanismo
- F12 Pintura Paredes (id=12): "parede" no elemento, sub_elemento com dem/extracoat/prim
- F3 Portas (id=3): "aro", "porta"
- F6 Móveis (id=6): "vei" (móveis/movéis) + "banca"/"bancada" (Bancas integradas)
- F8 Eletrodomésticos (id=8): "eletrodom"
- F4 Chão/Rodapé (id=4): "chão", "rodapé"
- F5 WC Equipamentos (id=5): "lavat", "sanita", "chuveiro", "duche", "toalheiro"

**Sequência construtiva** (precedência entre fases, a respeitar no Gantt/LoB):
Teto → Remendos Teto → Pintura Teto → Paredes → Remendo Paredes → Pintura Paredes → Portas → Móveis → Eletrodomésticos → Chão/Rodapé → WC Equipamentos

**Permissões (RLS):**
- `user` vê e edita tudo, exceto gestão de utilizadores
- `admin` tudo

**Audit log:** trigger Postgres em INSERT/UPDATE de `elementos` e `tarefas_gantt`. Regista `user_id`, `timestamp`, `old_value`, `new_value`, `action`.

---

## 5. Convenções de Código

- **Server Components por defeito.** Client Components só quando precisas de estado, efeito ou evento.
- **Server Actions** para mutations (em vez de API routes), colocadas em `app/actions/`.
- **Supabase client:** usar `createClient` do `@supabase/ssr` — nunca o cliente do browser em Server Components.
- **Types:** gerar types da BD com `supabase gen types typescript` e importar de `lib/database.types.ts`.
- **Componentes shadcn:** instalar via `npx shadcn@latest add <component>` só quando necessário. Não instalar à frente.
- **Formulários:** `react-hook-form` + `zod` schema. O mesmo schema valida cliente E servidor.
- **Nomes:** ficheiros em `kebab-case`, componentes em `PascalCase`, funções em `camelCase`, tabelas em `snake_case` (convenção Postgres).
- **Comentários:** só quando explicam *porquê*, não *o quê*. PT-PT para comentários relacionados com regras de negócio, inglês para código.
- **Sem `any`.** Usa `unknown` + type narrowing.
- **Error handling:** mutations devolvem `{ success: true, data } | { success: false, error: string }`. Nunca throw em Server Actions.

---

## 6. Estrutura de Pastas (a criar)

```
app/
  (auth)/
    login/
    signup/
  (app)/
    layout.tsx            # auth-protected layout
    page.tsx              # dashboard
    apartamentos/
      page.tsx            # lista
      [id]/
        page.tsx          # detalhe + tabs
        checklist/
        gantt/
    checklist/            # vista global com filtros
    gantt/                # gantt agregado
    lob/                  # line of balance
    kanban/
    admin/
      users/
  actions/                # Server Actions
  api/                    # apenas se mesmo necessário
components/
  ui/                     # shadcn
  checklist/
  gantt/
  kanban/
  shared/
lib/
  supabase/
    client.ts             # browser client
    server.ts             # server client (cookies)
    middleware.ts         # auth middleware
  database.types.ts       # generated
  utils.ts
  validations/            # zod schemas
hooks/
supabase/
  migrations/
  seed.sql
scripts/
  generate_seed_from_xlsx.py   # converte Cabanas_Checklist.xlsx em seed
public/
  manifest.json           # PWA
middleware.ts             # Next.js middleware para auth
```

---

## 7. Milestones (ordem de construção)

Estado atual dos milestones:

- **M0** ✅ — Setup: scaffold Next.js, Supabase init, shadcn init, dependências base.
- **M1** ✅ — Auth: signup/login, middleware, perfis com role, tabela `profiles`, RLS base.
- **M2** ✅ — Apartamentos + Checklist: schema, seed dos 24 APs e 3748 items, UI de checklist com filtros (AP, fase, responsável, status) e pesquisa full-text.
- **M3** ✅ — Gantt interativo: `tarefas_gantt` populada (216 rows), UI com barras por fase, drag+resize, modal de edição, zoom dia/semana/mês, indicador de hoje. Vista agregada `/gantt` + vista por AP `/apartamentos/[id]/gantt`.
- **M4** ✅ — Kanban: view SQL + UI com dnd-kit. Colunas: Por Fazer / Em Curso / Bloqueado / Concluído.
- **M5** ✅ — LoB + Dashboard: página LoB (takt + durações → cronograma calculado), dashboard com KPIs (% obra, bottleneck, AP mais atrasado).
- **M6** ✅ — Realtime + Audit: subscriptions Supabase para updates em tempo real, trigger de audit log, página de histórico.
- **M7** ~~PWA + Mobile~~ — **CANCELADO.** A app é desktop-only. App mobile será projeto separado no futuro com a mesma BD Supabase. Sem PWA, sem service workers.
- **M8** — Deploy: Vercel, Supabase prod, env vars, custom domain, documentação de operação.

---

## 8. Estilo de Comunicação com o Utilizador

O Miguel é estudante de mestrado em Supply Chain, junior em engenharia industrial, nunca fez uma web app completa. Comunica:

- **PT-PT nas respostas, inglês no código.**
- **Direto, sem fluff.** Evita "Great question!", "Absolutely!", etc.
- **Push back construtivo** quando a decisão dele tiver problemas.
- **Terminologia técnica de Supply Chain/Lean** quando aplicável (lead time, takt, WIP, pull system) — ele sabe isto.
- **Sem bullet points excessivos.** Prosa quando possível.
- **Explica *porquê*** das decisões técnicas, não só o *quê*. Ele quer aprender.

---

## 9. Fontes e Ficheiros Relacionados

- `Cabanas_Checklist.xlsx` (na pasta mãe) — fonte original dos 3748 items. Usar no seed inicial.
- `Gantt_Obra_Cabanas_Agregado_v2.xlsx` (na pasta mãe) — Excel atual. Útil como referência visual.
- `sync_checklist.py` (na pasta mãe) — script Python atual que faz sync Excel → Gantt. Já não é necessário quando a app estiver pronta.

---

## 10. Regras de Ouro

1. **Valida com o Miguel antes de decisões irreversíveis** (mudanças de schema em produção, deletes, deploys).
2. **Testes básicos por milestone.** Pelo menos 1 teste e2e (Playwright) do happy path.
3. **Git: branch por milestone.** `m0-setup`, `m1-auth`, etc. PR para `main` com descrição do que foi feito.
4. **Environment separado.** `development` local, `preview` em Vercel para branches, `production` para `main`.
5. **Nunca commit de `.env.local`.** Verifica o `.gitignore` em cada milestone.
6. **Atualiza este CLAUDE.md** quando tomares decisões arquiteturais novas. É o ficheiro de memória do projeto.
