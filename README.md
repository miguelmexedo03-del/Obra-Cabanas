# Obra Cabanas — App

App de gestão de obra para 24 apartamentos. Checklist de qualidade, Gantt agregado, Line of Balance e Kanban — partilhados em tempo real entre o encarregado e os operários.

---

## Arranque Rápido (tu, Miguel)

### 1. Pré-requisitos

Instala no teu computador:

- **Node.js 20 LTS** — https://nodejs.org
- **Git** — https://git-scm.com
- **Supabase CLI** — `npm install -g supabase`
- **VS Code** — https://code.visualstudio.com
- **Claude Code** — `npm install -g @anthropic-ai/claude-code`

### 2. Abre o projeto

```bash
cd "obra-cabanas-app"
code .
```

### 3. Cria projeto Supabase

1. Entra em https://supabase.com → "New project".
2. Nome: `obra-cabanas`. Região: `West EU (Ireland)` (mais próxima de Portugal).
3. Guarda a password que escolheres — precisas dela para ligar o CLI.
4. Vai a **Project Settings → API** e copia:
   - `Project URL`
   - `anon public key`
   - `service_role key` (secreta!)
5. Copia `.env.example` para `.env.local` e cola os valores.

### 4. Liga o CLI à Supabase

```bash
supabase link --project-ref <project-ref>   # tens este ref no URL do dashboard
```

### 5. Aplica schema e seed

```bash
supabase db push
```

Isto corre as migrations em `supabase/migrations/` por ordem:
- `0001_schema.sql` — tabelas, RLS, triggers, views.
- `0002_seed_checklist.sql` — 3748 items + 24 apartamentos + 144 tarefas Gantt.

### 6. Gera types da BD (para autocomplete no TS)

```bash
supabase gen types typescript --linked > lib/database.types.ts
```

### 7. Instala dependências e arranca

```bash
npm install
npm run dev
```

Abre http://localhost:3000.

### 8. Cria o teu utilizador admin

- Faz signup na app com o teu email (ex: miguelmexedo03@gmail.com).
- Depois, no dashboard Supabase, vai a **Table Editor → profiles** e muda o teu `role` para `admin`.

---

## Desenvolvimento com Claude Code

Ver `PROMPT_INICIAL.md` para a primeira mensagem a colar.

O Claude Code lê `CLAUDE.md` automaticamente em cada sessão — contém todo o contexto de domínio, tech stack e milestones.

---

## Estrutura

```
obra-cabanas-app/
├── CLAUDE.md                       # contexto persistente (lê sempre)
├── PROMPT_INICIAL.md               # primeiro prompt para Claude Code
├── README.md                       # este ficheiro
├── .claude/
│   └── settings.json               # permissões do Claude Code
├── supabase/
│   └── migrations/
│       ├── 0001_schema.sql
│       └── 0002_seed_checklist.sql # auto-gerado a partir do xlsx
├── scripts/
│   └── generate_seed_from_xlsx.py  # re-gera 0002 se o xlsx mudar
├── .env.example
├── .gitignore
└── (resto gerado pelo Claude Code no M0)
```

---

## Re-gerar seed a partir do Excel

Se atualizares o `Cabanas_Checklist.xlsx` (estrutura, não estado):

```bash
python3 scripts/generate_seed_from_xlsx.py \
  --checklist ../Cabanas_Checklist.xlsx \
  --out supabase/migrations/0002_seed_checklist.sql
```

Depois:

```bash
supabase db reset   # CUIDADO: apaga tudo em dev e re-aplica
```

**Nunca correr `db reset` em produção.**

---

## Deploy

Ver `DEPLOY.md` (será criado no M8).
