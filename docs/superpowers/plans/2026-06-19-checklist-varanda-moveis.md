# Checklist — Novos Itens Varanda + Móveis Cozinha/WC

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar subitems de pintura e pedra à Varanda, e Móveis às Cozinhas e WCs que não os têm — só BD, sem tocar no código das apps.

**Architecture:** Uma única migration SQL idempotente com `NOT EXISTS` em cada INSERT. Aplica-se uma vez ao Supabase partilhado — as duas apps (desktop e mobile) refletem os novos itens automaticamente.

**Tech Stack:** SQL (Supabase/Postgres). Nenhuma dependência nova.

---

## O que é adicionado

### Varanda (todas as 24)
- `Paredes` base (fase 2, sub_elemento null) — categoria de paredes
- `Teto` + Primário / Extracoat / 1ª demão / 2ª demão (fase 10 — Pintura Teto)
- `Paredes` + Primário / Extracoat / 1ª demão / 2ª demão (fase 12 — Pintura Paredes)
- `Paredes` + Pedra do peitoril (fase 2 — Paredes)
- `Paredes` + Pedra da fachada (fase 2 — Paredes)

**Total por varanda:** 11 novos itens × 24 APs = 264 itens

### Cozinha (todas as 24)
- `Móveis` (fase 6, sub_elemento null) — onde não existe

### WC (todos)
- `Móveis` (fase 6, sub_elemento null) — onde não existe (WCs que já têm ficam intactos)

---

## Task 1: Aplicar a migration ao Supabase

**Files:**
- Already created: `obra-cabanas-app/supabase/migrations/0007_checklist_varanda_moveis.sql`

- [ ] **Step 1.1: Aplicar via CLI**

```bash
cd obra-cabanas-app
npx supabase db push
```

Esperado: `Applied migration 0007_checklist_varanda_moveis`.

Se falhar a ligação ou o CLI não estiver configurado, copiar o conteúdo do ficheiro e correr no **Supabase Dashboard → SQL Editor → Run**.

- [ ] **Step 1.2: Verificar contagem de novos itens**

No Supabase SQL Editor:

```sql
-- Confirmar itens da varanda
SELECT d.nome, COUNT(*) as total_itens
FROM elementos e
JOIN divisoes d ON e.divisao_id = d.id
WHERE LOWER(d.nome) = 'varanda'
GROUP BY d.nome
LIMIT 5;
```

Esperado: cada varanda tem agora mais itens do que antes (mínimo 13: Chão + Teto base + 11 novos).

```sql
-- Confirmar Móveis na cozinha
SELECT COUNT(*) FROM elementos
WHERE elemento = 'Móveis'
AND divisao_id IN (SELECT id FROM divisoes WHERE LOWER(nome) = 'cozinha');
```

Esperado: 24 (um por apartamento).

- [ ] **Step 1.3: Commit da migration**

```bash
cd obra-cabanas-app
git add supabase/migrations/0007_checklist_varanda_moveis.sql
git commit -m "feat: novos itens checklist — pintura varanda, pedras, móveis cozinha/WC"
```

---

## Task 2: Verificar nas apps

Nenhuma alteração de código é necessária — os dados aparecem automaticamente.

- [ ] **Step 2.1: Verificar na app mobile**

```bash
cd cabanas-mobile
npm run dev -- -p 3001
```

Abrir um apartamento → Varanda → confirmar que aparecem os subitems de Teto e Paredes (Primário, Extracoat, 1ª demão, 2ª demão) e as pedras.

- [ ] **Step 2.2: Verificar na app desktop**

```bash
cd obra-cabanas-app
npm run dev
```

Abrir `/apartamentos/[id]` → tab Checklist → filtrar por Varanda → confirmar novos itens.

---

## Notas

- A migration usa `NOT EXISTS` em todos os INSERTs — é segura de correr mais do que uma vez.
- `LOWER(d.nome) = 'varanda'` assume que todas as varandas têm nome exato "Varanda". Se algum AP tiver nome diferente (ex: "Varanda 1"), ajustar o WHERE.
- `LOWER(d.nome) LIKE 'wc%'` apanha "WC(Suite 1)", "WC (Suite 2)", "WC Serviço", etc.
