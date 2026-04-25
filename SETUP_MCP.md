# MCPs para o Claude Code — Obra Cabanas

MCPs (Model Context Protocol servers) dão ao Claude Code acesso direto a ferramentas externas — Supabase, GitHub, etc.

Corre estes comandos **no terminal onde corres o `claude`** (PowerShell ou bash).  
Substitui `SEU_TOKEN` pelo token real **sem nunca o colar numa conversa com o Claude**.

---

## Regras de segurança

- Tokens ficam guardados em `~/.claude.json` (fora de qualquer git repo).
- Usa **sempre** `--scope user` para MCPs com tokens — nunca `--scope project`.
- Usa **sempre** `-e "VAR=token"` para passar o token — nunca `--access-token=` na linha de comando (ficaria visível em logs).
- **Nunca coles tokens na janela do chat** do Claude Code.

---

## 1. Supabase MCP

Permite inspecionar o schema, correr queries read-only e validar migrações.

```bash
claude mcp add supabase --scope user \
  -e "SUPABASE_ACCESS_TOKEN=sbp_SEU_TOKEN_AQUI" \
  -- npx -y @supabase/mcp-server-supabase
```

Token: https://supabase.com/dashboard/account/tokens → "Generate new token"

Para revogar e reconfigurar (ex: token comprometido):
```bash
claude mcp remove supabase
# Gera novo token no dashboard, depois corre o add acima com o novo token
```

---

## 2. GitHub MCP

Permite criar PRs, rever issues, etc., sem saíres do Claude Code.

```bash
claude mcp add github --scope user \
  -e "GITHUB_PERSONAL_ACCESS_TOKEN=github_pat_SEU_TOKEN_AQUI" \
  -- npx -y @github/mcp-server
```

Token: https://github.com/settings/tokens → "Generate new token (classic)" com scope `repo`.

> **Nota:** O package correto é `@github/mcp-server`. O `@modelcontextprotocol/server-github` está deprecated.

---

## 3. Verificar estado

```bash
claude mcp list
```

Deves ver `✓ Connected` para ambos. Se vires `✗ Failed`, verifica se o token ainda é válido.

---

## Ordem recomendada

1. Cria o projeto Supabase em supabase.com.
2. Gera token Supabase e configura o MCP.
3. Aplica o schema: `supabase db push` (ou SQL Editor no dashboard).
4. Preenche `.env.local` com `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
5. Configura GitHub MCP depois do M1 validado.
