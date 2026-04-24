# MCPs recomendados para o Claude Code

MCPs (Model Context Protocol servers) dão ao Claude Code acesso direto a ferramentas externas — Supabase, GitHub, etc. — em vez de te obrigar a copiar/colar manualmente.

Corre estes comandos **no terminal onde corres o `claude`**. O Claude Code detecta-os automaticamente.

---

## 1. Supabase MCP (essencial)

Permite ao Claude Code inspecionar o teu schema, correr queries read-only para debug, e gerar types automaticamente.

```bash
claude mcp add supabase --scope project -- \
  npx -y @supabase/mcp-server-supabase \
  --access-token=<teu-supabase-access-token>
```

O access token tiras aqui: https://supabase.com/dashboard/account/tokens

**Modo read-only é suficiente.** Não deixes o MCP fazer writes — deixa as migrations fazê-lo de forma controlada.

---

## 2. GitHub MCP (recomendado se usares GitHub)

Permite criar PRs, rever issues, etc., sem saíres do Claude Code.

```bash
claude mcp add github --scope user -- \
  npx -y @modelcontextprotocol/server-github
```

Vai pedir-te o `GITHUB_PERSONAL_ACCESS_TOKEN`. Cria em https://github.com/settings/tokens (scope: `repo`).

---

## 3. Filesystem MCP (opcional)

Já vem embutido no Claude Code via Read/Write/Edit. Não precisas de MCP separado.

---

## 4. Skills recomendadas

No Claude Code, skills vivem em `.claude/skills/` ou são instaladas via plugin marketplace. Para este projeto:

- **dbs-framework** (se quiseres estruturar skills novas mais tarde)
- **skill-creator** (para criares skills específicas do teu workflow de obra)

Podes instalar via:

```bash
claude plugin install <nome-do-plugin>
```

Ou, dentro da sessão do Claude Code, escreve `/plugin search construction` para procurar o que existe.

**Para já, não precisas de instalar skills extra.** O CLAUDE.md + PROMPT_INICIAL.md são suficientes para arrancar os milestones.

---

## 5. Verificar o que está ligado

Dentro de uma sessão do Claude Code:

```
/mcp
```

Mostra-te todos os MCPs ativos e o seu estado.

---

## Ordem sugerida

1. Configura Supabase MCP **antes** de colares o PROMPT_INICIAL.md — permite ao Claude Code validar o schema que ele próprio escreveu.
2. Configura GitHub MCP **depois do M0** — só precisas quando começares a fazer commits sérios.
