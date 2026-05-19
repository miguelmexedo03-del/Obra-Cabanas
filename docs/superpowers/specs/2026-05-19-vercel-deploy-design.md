# Deploy M8 — Vercel + GitHub Integration

**Data:** 2026-05-19  
**Milestone:** M8  
**Âmbito:** Deploy da `obra-cabanas-app/` em Vercel com CI/CD via GitHub Integration

---

## Contexto

M0–M6 estão concluídos. A app Next.js 16 + Supabase está funcional em local. Este spec cobre o processo completo de deploy para produção (M8), incluindo configuração de ambiente, CI/CD automático e verificação pós-deploy.

---

## Abordagem Escolhida

**Vercel CLI + GitHub Integration** (Opção A).

Push para `main` → deploy de produção automático.  
Push para outros branches → preview deployment com URL único.  
Sem ficheiros `.github/workflows/` — integração nativa Vercel-GitHub.

---

## Secção 1 — Project Linking

A `obra-cabanas-app/` é uma subpasta do repo Git (não a raiz). O Vercel precisa de saber isto via **Root Directory**.

**Passos:**
1. Instalar CLI: `npm i -g vercel`
2. Login: `vercel login` (autenticar com a conta Vercel)
3. Dentro de `obra-cabanas-app/`: `vercel link`
   - Criar novo projeto Vercel: `obra-cabanas-app`
   - Quando perguntar pela framework: Next.js
4. No dashboard Vercel → Project Settings → General → **Root Directory: `obra-cabanas-app`**
5. Adicionar `.vercel/` ao `.gitignore` da raiz do repo (se ainda não estiver)

**Resultado:** `.vercel/project.json` criado com `projectId` e `orgId`.

---

## Secção 2 — Environment Variables

Configurar via `vercel env add` para os ambientes `production` e `preview`.

| Variável | Visibilidade | Descrição |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Pública (client + server) | URL do projeto Supabase prod |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Pública (client + server) | Anon key Supabase prod |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-only** | Service role key — nunca exposta ao cliente |
| `NEXT_PUBLIC_APP_URL` | Pública | `https://<nome-projeto>.vercel.app` (confirmado após primeiro deploy) |
| `NEXT_PUBLIC_APP_NAME` | Pública | `Obra Cabanas` |
| `NEXT_TELEMETRY_DISABLED` | Server | `1` |

**Regra crítica:** `SUPABASE_SERVICE_ROLE_KEY` nunca deve ter prefixo `NEXT_PUBLIC_`. Só é usada em Server Actions — nunca chega ao bundle do cliente.

---

## Secção 3 — GitHub Integration & CI/CD

**Passos no dashboard Vercel:**
1. Settings → Git → Connect Git Repository → selecionar o repo GitHub
2. Confirmar configurações:
   - **Root Directory:** `obra-cabanas-app`
   - **Framework Preset:** Next.js (auto-detectado)
   - **Build Command:** `npm run build`
   - **Production Branch:** `main`

**Comportamento resultante:**
- Push para `main` → deploy em `https://obra-cabanas.vercel.app`
- Push para outros branches → preview deployment com URL único (ex: `https://obra-cabanas-git-m8-deploy-xxx.vercel.app`)
- Preview deployments usam as mesmas env vars de `preview` → confirmam que o build funciona antes de mergear para main

---

## Secção 4 — Supabase Production

**Auth Redirect URLs** — Supabase dashboard → Authentication → URL Configuration:
- **Site URL:** `https://obra-cabanas.vercel.app`
- **Redirect URLs adicionais:**
  - `https://obra-cabanas.vercel.app/**`
  - `https://obra-cabanas-git-*.vercel.app/**` (para preview deployments com auth)

Sem alterações de CORS necessárias — `SUPABASE_SERVICE_ROLE_KEY` é exclusivamente server-side.

---

## Secção 5 — Verificação Pós-Deploy

Após o primeiro deploy bem-sucedido:

1. Abrir `https://obra-cabanas.vercel.app` — confirmar que a página carrega
2. Testar login e logout
3. Navegar para `/checklist` — confirmar que os dados Supabase aparecem
4. Navegar para `/gantt` — confirmar que as barras Gantt carregam
5. Testar check de um elemento (confirma auth + write ao Supabase)
6. Se algo falhar: Vercel Dashboard → Deployments → selecionar o deploy → Functions / Logs

---

## Ficheiros Afetados

| Ficheiro | Ação |
|---|---|
| `.gitignore` (raiz) | Adicionar `.vercel/` se não estiver |
| `obra-cabanas-app/.vercel/project.json` | Criado pelo `vercel link` (não comitar) |
| `obra-cabanas-app/next.config.ts` | Sem alterações necessárias |

---

## Fora de Âmbito (M8)

- Domínio personalizado — não necessário agora
- Separação de projetos Supabase dev/prod — pode ser feita depois
- Monitoring/alertas Vercel — fora de âmbito para este milestone
- PWA/mobile — cancelado (M7)
