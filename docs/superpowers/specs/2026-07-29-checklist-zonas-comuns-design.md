# Ampliar Checklist de QC — Zonas Comuns, Zona Técnica e Eletrodomésticos

**Data:** 2026-07-29
**Estado:** desenho aprovado
**Contexto:** documento-fonte `Checklist_ZonasComuns_ESPEC_para_Code.md` (pasta Cerebro TAR, LDA). O checklist atual (`Cabanas_Checklist.xlsx` + BD da app) só cobre os 24 apartamentos (AP1–AP24), hierarquia Divisão → Elemento → sub-item, colunas ✓ / Notas / Responsável / Data. Faltam: zonas comuns do edifício, uma divisão "Zona Técnica" por apartamento, e os eletrodomésticos da cozinha por nome (hoje é uma única linha "Eletrodomésticos").

Contexto do edifício (confirmado ao fazer as FTH):
- Duas entradas/lotes: **Lote 1** (Rua Fernando Pessoa 17: A,B,C / I,J,K / Q,R,S) e **Lote 2** (Rua Manoel Pedro de Mello 3: D–H / L–P / T–X).
- Pisos: -1 (cave/garagem), 0, 1, 2 + cobertura. 2 elevadores.
- O que é do apartamento fica no apartamento — os terraços privados dos duplexes (Q–X) ficam nas folhas dos APs, não nas comuns.

---

## 1. Decisões de arquitetura (confirmadas com o Miguel)

1. **Fonte única de dados:** o documento de espec. é só molde, usado uma vez para gerar uma migration incremental (`INSERT`/`ALTER`, nunca regenerar tudo). A partir daí a app é a única fonte de verdade — sem sincronização Excel↔BD no futuro. `generate_seed_from_xlsx.py` mantém-se intocado, dedicado só ao seed histórico dos 3748 itens.
2. **Zonas comuns modeladas como "unidades" na tabela `apartamentos`**, não como pseudo-apartamentos nem como entidade paralela:
   - Novo enum `apartamento_tipo` ('apartamento' | 'zona_comum') e coluna `apartamentos.tipo` (default `'apartamento'`, não quebra as 24 linhas existentes).
   - 3 linhas novas, `tipo = 'zona_comum'`: `LOTE1` ("Lote 1 — Zonas Comuns"), `LOTE2` ("Lote 2 — Zonas Comuns"), `EDIFICIO` ("Edifício — Zonas Comuns").
   - `divisoes`/`elementos` continuam a apontar para `apartamento_id` sem qualquer alteração de schema — só ganham linhas novas.
3. **`elementos.fase_id` passa a nullable.** Itens sem fase equivalente nas 11 fases existentes (elétrica, ventilação, sinalização, AQS, etc.) ficam `fase_id = NULL`: aparecem no checklist e contam para o progresso geral do apartamento/unidade, mas não geram tarefa de Gantt nem aparecem no Kanban. Não se cria uma 12ª fase — isso implicaria alterar o cronograma/LoB dos 24 apartamentos, fora de âmbito.
4. **Sem novas tabelas de permissões.** Confirmado nas migrations 0006/0008: o modelo de roles já é só `admin`/`user`, e `divisoes`/`elementos` são legíveis e editáveis por qualquer `user` autenticado independentemente do `apartamento_id` — as novas linhas herdam isto automaticamente.
5. **Garagem/cave técnica são partilhadas** pelas duas entradas — ficam só em `EDIFICIO`, não duplicadas por lote.
6. **Circulações do piso 0/1/2 são iguais entre si** — mesmo bloco geral repetido, só muda o nome da divisão.
7. **Registo por item mantém-se só ✓** (campo `concluido` booleano) — sem introduzir estado rico (Ok/Corrigir/Aprovado) nesta expansão, para não ter dois modelos em paralelo com os 3748 itens existentes.
8. **Inspeção continua a ser uma vez no fim** (`concluido` + `concluido_em`) — sem múltiplas datas por fase de obra.
9. **Fotos por item já existem** (`item_evidencias` + `evidencia_fotos`, migration 0009) — funcionam automaticamente para os elementos novos, sem trabalho extra. "Prioridade do defeito" não é adicionado (YAGNI — ninguém pediu, usa-se `notas` por agora).

---

## 2. Conteúdo — Parte 1: Zonas Comuns

Regra de classificação de fase usada abaixo (atribuída à mão em SQL, não corre `classify_fase()` em runtime): **Pavimento→4 (Chão/Rodapé), Rodapé→4, Paredes→2, Teto→1, Porta(s)/aros/acesso→3 (Portas). Tudo o resto → NULL.**

**Bloco geral** (9 itens, quando indicado): Pavimento(4) · Rodapé(4) · Paredes(2) · Teto(1) · Portas e aros(3) · Iluminação(NULL) · Pontos à vista — tomadas/botoneiras/quadros(NULL) · Sinalização e segurança(NULL) · Limpeza/pronto(NULL).

### `LOTE1` e `LOTE2` (divisões idênticas nos dois)

| Divisão | Itens | Bloco geral? |
|---|---|---|
| Átrio de entrada (piso 0) | + Porta de entrada(3) · Caixas de correio(NULL) · Videoporteiro/campainhas(NULL) | Sim |
| Circulação — piso 0 | — | Sim |
| Circulação — piso 1 | — | Sim |
| Circulação — piso 2 | — | Sim |
| Escada | + Degraus(NULL) · Patamares(NULL) · Corrimão(NULL) · Guarda-corpos(NULL) | Sim |
| Elevador | Cabina(NULL) · Nivelamento à soleira(NULL) · Portas de patamar — Piso 0/1/2 (3 linhas, sub_elemento="Piso 0"/"Piso 1"/"Piso 2", fase 3) · Botoneira(NULL) · Certificação(NULL) | **Não** |

### `EDIFICIO` (serve as duas entradas)

| Divisão | Itens | Bloco geral? |
|---|---|---|
| Garagem / cave (piso -1) | + Portão automático(NULL) · Lugares marcados(NULL) · Ventilação(NULL) · Deteção de CO(NULL) | Sim |
| Zonas técnicas (cave) | + Quadros(NULL) · Equipamentos fixos e identificados(NULL) · Ventilação(NULL) · Drenagem(NULL) | Sim |
| Cobertura comum/técnica | Estanqueidade/infiltrações(NULL) · Escoamento — ralos e caleiras(NULL) · Remates e rufos(NULL) · Platibanda/guarda-corpos(NULL) · Equipamentos fixos e identificados(NULL) · Acesso(NULL) | **Não** |

Nota: cobertura tem duas naturezas — privada (terraços dos duplexes, já nas folhas AP) vs comum/técnica (aqui, `EDIFICIO`). Não se mistura.

---

## 3. Conteúdo — Parte 2: Zona Técnica (por apartamento)

Nova divisão em cada uma das 24 `divisoes` existentes, `ordem` calculada dinamicamente por subquery `select max(ordem)+1 from divisoes where apartamento_id = <ap>` — nunca um número fixo (as divisões variam de AP para Ap).

Itens: Equipamento AQS / bomba de calor — fixo e identificado(NULL) · Quadro elétrico(NULL) · Ventilação(NULL) · Dreno/escoamento(NULL) · Porta e acesso(3) · Pavimento(4) · Paredes(2) · Teto(1).

---

## 4. Conteúdo — Parte 3: Eletrodomésticos por nome

Todas as linhas novas com `fase_id = 8` (Eletrodomésticos), sem exceção.

- **23 apartamentos** (todos menos AP7), divisão **Cozinha**: Placa vitrocerâmica · Micro-ondas · Forno · Máquina de lavar louça · Frigorífico combinado · Máquina de lavar roupa · Exaustor.
- **AP7** (único diferente, e único já parcialmente dividido na BD real): 6 linhas em **Cozinha** (Frigorífico americano, Forno, Gaveta de aquecimento, Máquina de lavar louça, Placa de indução, Exaustor) substituindo o `elemento_id = 601`; 2 linhas em **Closet (lavandaria)** (Máquina de lavar roupa, Máquina de secar) substituindo o `elemento_id = 474`. Nomes mantidos exatamente como no documento original.

**Casos verificados na BD de produção antes de decidir** (nenhum tinha estado real — confirmado por query):
- **AP2** não tem nenhuma linha "Eletrodomésticos" na Cozinha hoje — é um `INSERT` puro das 7 linhas, sem nada para substituir/apagar.
- Restantes 21 APs: `DELETE` da linha única existente (por `id` explícito, nunca por padrão de texto genérico) + `INSERT` das 7 linhas novas na mesma divisão Cozinha.
- Nenhuma das linhas "Eletrodomésticos" existentes (incluindo AP7) estava `concluido = true` ou tinha `notas`/`responsavel` preenchidos — confirmado por `SELECT` antes de escrever esta spec. Se isto tiver mudado entre a escrita da spec e a aplicação da migration, a migration para e avisa em vez de apagar dados.

---

## 5. Plano de migração

Uma migration nova: `supabase/migrations/0015_checklist_zonas_comuns_zona_tecnica_eletrodomesticos.sql`. Aplicada uma vez via `apply_migration` diretamente na BD de produção (não passa pelo script Python).

Ordem dentro da migration:

1. `CREATE TYPE apartamento_tipo AS ENUM ('apartamento', 'zona_comum')`; `ALTER TABLE apartamentos ADD COLUMN tipo apartamento_tipo NOT NULL DEFAULT 'apartamento'`; `ALTER TABLE elementos ALTER COLUMN fase_id DROP NOT NULL`.
2. `INSERT INTO apartamentos` — as 3 unidades (`LOTE1`, `LOTE2`, `EDIFICIO`, ids 25–27, `tipo = 'zona_comum'`).
3. `INSERT INTO divisoes` + `INSERT INTO elementos` para as 3 unidades, conforme secção 2.
4. `INSERT INTO divisoes` (Zona Técnica, `ordem` por subquery) + `INSERT INTO elementos` para os 24 APs existentes, conforme secção 3.
5. `DELETE FROM elementos WHERE id IN (...)` — lista explícita dos 23 ids de "Eletrodomésticos" a substituir (incluindo os 2 do AP7) — seguido de `INSERT INTO elementos` das linhas novas nomeadas, conforme secção 4. `INSERT` puro para o AP2 (sem `DELETE` correspondente).
6. Comentário de auditoria no topo do bloco 5 com o resultado das queries de verificação (nenhuma linha tinha `concluido = true` nem `notas` antes da substituição), para deixar rasto de que nada real foi apagado.

**Verificação pós-migration:**
- `SELECT count(*)` por unidade/divisão esperado (3 unidades × divisões definidas na secção 2; 24 Zonas Técnicas; 169 linhas de eletrodomésticos: 23 APs × 7 + 8 do AP7).
- Confirmação visual no checklist da app em produção/preview do Vercel (não correr `npm run dev` local — risco de esgotar RAM e crash do Windows).

---

## 6. Fora de âmbito (follow-up separado, não implementado agora)

Dashboard, Relatório Executivo, Gantt agregado e LoB assumem hoje "24 apartamentos" em, pelo menos, estes pontos (~14 ficheiros identificados):
- `src/app/(app)/relatorio/executivo/config/_components/editor.tsx`
- `src/app/(app)/relatorio/executivo/_components/gerador.tsx`
- `src/app/(app)/guia/page.tsx`
- `src/app/layout.tsx`
- `src/app/(app)/relatorio/selecionar/_components/selecionar-client.tsx`
- `e2e/kanban.spec.ts`
- (+ documentação/planos históricos que não precisam de alteração)

Precisam de passar a filtrar `where tipo = 'apartamento'` para não contar `LOTE1`/`LOTE2`/`EDIFICIO` como apartamentos reais (% de obra, "AP mais atrasado", cronograma). A geração automática de `tarefas_gantt` (11 fases × apartamento) também tem de ignorar `tipo = 'zona_comum'` — as 3 unidades novas não recebem tarefas de Gantt nem aparecem no Kanban.

Isto fica registado aqui para não se perder, mas é uma spec/plano à parte.

---

## 7. Testes

Sem lógica pura nova (é uma migration de dados). Verificação:
- Contagens pós-migration (secção 5).
- Revisão manual do SQL antes de aplicar (`apply_migration`), incluindo confirmar os ids exatos da secção 4.
- Comportamento no checklist da app (preview/produção Vercel): as 3 unidades aparecem na lista de "apartamentos", Zona Técnica aparece no fim de cada AP, eletrodomésticos aparecem nomeados na Cozinha (e Closet, no AP7).
