# Spec — Relatório Executivo por Apartamento (com LLM)

> **Estado:** design validado no brainstorming (2026-07-14). Pronto para writing-plans.
> **Feature 1 de 2.** A Feature 2 (Tabela de Materiais por AP) é um ciclo separado, posterior.
> **Repositório:** `obra-cabanas-app` (Next.js 16 + Supabase, desktop-only).

---

## 1. Problema

A feature de relatório existente (`/relatorio/consulta`, `/relatorio/multi`, `/relatorio/export`) produz um *dump*: uma folha gigante com tudo o que está feito e por fazer, com fotos. O patrão não a lê.

O que ele quer: **um parágrafo por apartamento**, em prosa, generalizado, que diga o estado e o que falta — agrupado pela forma como se fala de obra (pintura, chão, portas, móveis...), **não** pelas 11 fases da app (essas servem para planear no Gantt/LoB, não para comunicar).

O relatório extenso atual **mantém-se** e passa a ser o anexo de evidência. Esta feature é uma saída nova que coexiste com ele.

---

## 2. Âmbito

**Dentro:**
- Parágrafo executivo por AP, gerado por LLM a partir de factos determinísticos.
- Geração de **um AP on-demand** e de **os 24 em lote**.
- Instruções do LLM com **default no código + campo avançado editável** (admin) que se soma ao default.
- Preview: regenerar um AP com instruções em rascunho antes de gravar.
- Fornecedor de LLM **agnóstico** (adapter + env var), com **fallback de template** determinístico.
- Exportar por **copiar para email** (clipboard) e vista amigável para impressão/PDF do browser.

**Fora (não implementar aqui):**
- Resumo global da obra (só parágrafos por AP).
- Tabela de materiais, subempreiteiros, criticidade, constraint log (Feature 2 e além).
- "Parado há X dias" / qualquer métrica derivada de timestamps de atualização — **rejeitado**: os timestamps refletem quando o Miguel mete os dados (visitas semanais, operários não usam a app), não atividade real da obra. Seria um número verdadeiro a contar uma mentira.
- Caixa de perguntas em linguagem natural (fica para depois; a arquitetura abaixo já a suporta).
- Fine-tuning de modelo. O controlo é por **instruções (prompt)**, não por treino.

---

## 3. Arquitetura — factos-primeiro (grounding)

A regra que dá segurança: **a app calcula os factos, o LLM só escreve a prosa.**

```
gerarRelatorio(apartamentoId, instrucoesRascunho?):
  1. SQL determinístico            → factos (JSON) desse AP   [a app conta, nunca o LLM]
  2. instruções = default (código) + override (BD)            [o controlo do Miguel]
  3. LLMProvider.generate(factos, instruções) → prosa         [o LLM raciocina e escreve]
  4. se o LLM falhar (timeout/quota/erro) → template determinístico → prosa
  5. devolve { success, texto, origem: 'llm' | 'template' }
```

**Distinção-chave (o LLM "pensa"):**
- **Raciocinar** — decidir o que importa, agrupar por tipo de divisão, generalizar, aplicar a regra das demãos, contar grupos, escolher a narrativa, realçar defeitos. Isto é 100% do LLM.
- **Inventar factos** — cuspir uma percentagem/data que não recebeu. **Proibido.**

O LLM pensa *com* os factos, não *sem* eles. O único número com peso legal — o **% de progresso** — vem sempre do SQL. Contagens de grupos ("os dois WCs", "as duas suites") o LLM deriva da lista de itens que lhe é dada (baixo risco: a lista é completa e fornecida). Se um facto não está na lista, não pode ser dito.

---

## 4. Factos que o SQL alimenta (por AP)

Tudo calculado a partir de dados que **já existem** (`elementos`, `divisoes`, `fases`, `progresso_por_apartamento`). Não depende da Feature 2.

```json
{
  "apartamento": "AP1",
  "progresso_pct": 39,
  "pendentes": [
    { "divisao": "WC (Suite 2)", "fase": "WC Equipamentos",
      "elemento": "Lavatório", "sub_elemento": null, "notas": null }
    // ... todos os elementos com concluido = false
  ]
}
```

- `progresso_pct` — de `progresso_por_apartamento` (determinístico).
- `pendentes[]` — **lista completa** dos itens por fazer, item a item, com `notas`. É esta granularidade que resolve o problema dos *"itens pequenos mas importantes que a agregação por fase esconde"* e que permite ao LLM realçar defeitos.
- Sem timestamps, sem "dias parados" (ver §2, fora de âmbito).

**Nota de implementação (a decidir no plano):** a regra das demãos (§5, regra 2) é determinística e um pouco frágil para um LLM contar sozinho. Se o preview mostrar que o LLM erra a distinção "última demão" vs "pintura", promover essa classificação para uma coluna calculada em SQL por (AP, divisão) e alimentá-la nos factos. v1 tenta com o LLM a aplicar a regra; a rede de segurança é pré-calcular em SQL.

---

## 5. Instruções default (o "prompt") — destiladas com o Miguel

O parágrafo é escrito segundo estas regras. Vivem no código como default e são **somadas** ao campo avançado da BD.

1. **Generalizar sempre.** Agrupar por tipo de divisão (suites/quartos, WCs, cozinha, sala, varanda). **Nunca** listar divisões individuais pelo nome. Pode usar números ("os dois WCs", "as duas suites").
2. **Pintura.** Se só falta a 2ª demão numa divisão → dizer **"última demão"**. Se falta qualquer coisa abaixo da 2ª demão (primário, 1ª demão, extracoat) → dizer **"pintura"**. O **tratamento de juntas** e os **remendos** (tetos e paredes) **não se mencionam** — fazem parte da pintura.
3. **Móveis.** Separar quartos / cozinha / WC. Nos móveis da **cozinha**, acrescentar que **podem faltar as portas** (sem "provavelmente").
4. **Chão e rodapé** — juntos, numa frase.
5. **Defeitos e comentários** — sempre incluídos, escritos com jeito. O LLM reconhece defeitos a partir do texto do `sub_elemento`/`notas` (ex.: "Buraco na parede").
6. **Vocabulário / ordem das categorias:** pintura · chão e rodapé · portas e aros · móveis · pladur e pedra · equipamentos de WC · eletrodomésticos · ar condicionado · bomba de calor. (Omitir categorias sem itens por fazer.)
7. **Números que não podes inventar:** só o `progresso_pct` fornecido. Nunca inventar percentagens, totais ou datas.

### 5.1 Exemplo dourado (AP1, dados reais — 39%, 92 de 150 por fazer)

> **AP1 — 39% concluído.** Falta pintura na cozinha, na varanda e nos dois WCs (tetos e paredes); a sala e as duas suites só precisam da última demão. Chão e rodapé: falta o chão na sala, nas suites, na varanda e num WC, e os rodapés na sala e nas suites. Faltam as portas e aros das duas suites e dos dois WCs. Móveis: faltam os dos quartos (2 suites) e dos dois WCs. Falta ainda pladur (num WC e na cozinha) e pedra (num WC e na varanda). Os dois WCs estão por completar — lavatório, sanita, chuveiro higiénico, rampa e resguardo de duche. Faltam os eletrodomésticos da cozinha. *A registar:* há um buraco por reparar numa parede de suite e as divisórias da varanda por fechar.

Este exemplo é o critério de aceitação da qualidade do output e deve ir no prompt como few-shot.

---

## 6. Camada LLM (adapter agnóstico)

```
lib/llm/
  provider.ts     // interface LLMProvider { generate(system, user): Promise<string> }
  gemini.ts       // implementação via fetch (sem SDK novo — mantém deps leves)
  index.ts        // getProvider() lê LLM_PROVIDER e devolve a impl certa
lib/relatorio/
  facts.ts        // constrói o JSON de factos por AP (query Supabase)
  prompt.ts       // instruções default (§5) + few-shot (§5.1); compõe default + override
  template.ts     // fallback determinístico: factos → string (feio mas funcional)
  gerar.ts        // orquestra o pipeline §3 (server action)
```

- **Env vars:** `LLM_PROVIDER` (default `gemini`), `LLM_API_KEY`, `LLM_MODEL` (default `gemini-2.5-flash-lite`). A chave fica **server-side** (Server Action), nunca no browser.
- **Troca de fornecedor:** mudar `LLM_PROVIDER`/`LLM_API_KEY` no Vercel. Zero código. Candidatos com free tier: Gemini (15 RPM / 1000 dia), Groq, Cerebras.
- **Fallback:** qualquer erro/timeout do provider → `template.ts`. A app nunca fica partida por causa de uma API externa. O `origem` diz sempre se o texto é `llm` ou `template`.
- **Timeout:** curto (ex.: 15s por chamada) antes de cair para o template.

---

## 7. Persistência das instruções

```sql
-- migration 0012 (a seguir a 0011)
create table relatorio_config (
  id smallint primary key default 1 check (id = 1),   -- single-row
  instrucoes_extra text not null default '',
  updated_at timestamptz not null default now()
);
insert into relatorio_config (id) values (1) on conflict do nothing;
```

- Uma linha. `instrucoes_extra` soma-se ao default do código.
- Reutilizar o trigger `set_updated_at()` já existente (§0001).
- **RLS:** leitura por autenticados; escrita só `admin` (padrão `current_user_role() = 'admin'`, como as outras policies admin). Ver §0008 para o modelo de policies atual (só existem roles `admin` e `user`).

---

## 8. UI

Rota nova: `/relatorio/executivo` (coexiste com `/relatorio/*` atual).

- **Gerar um AP:** dropdown de apartamento + botão "Gerar". Mostra o parágrafo. Botão "Copiar" (clipboard, para email).
- **Gerar obra toda:** botão que percorre os 24 AP **em série com espaçamento** para respeitar 15 pedidos/min do Gemini (~4 s entre chamadas ≈ ~100 s). Barra de progresso ("A gerar AP 7 de 24…"). Botão "Copiar tudo". Cada parágrafo mostra um aviso discreto se veio do `template` (fallback).
- **Impressão/PDF:** vista amigável para `window.print()` do browser — sem dependência nova. (PDF "a sério" via a rota de export existente fica para depois, se necessário.)
- **Config avançada (admin):** secção/rota `/relatorio/executivo/config` — `textarea` "instruções avançadas", dropdown de AP + "Pré-visualizar" (regenera com o rascunho, não grava), botão "Gravar". Gated a `admin`.

Server Components por defeito; a geração é Server Action (`app/actions/relatorio.ts`). Segue as convenções do projeto (retorno `{ success, ... }`, sem throw).

---

## 9. Pré-requisitos e privacidade

- **Ação do Miguel (não a faz o Claude Code):** criar a chave grátis do Gemini em Google AI Studio (sem cartão). Colocar em `.env.local` (dev) e nas env vars do Vercel (`LLM_API_KEY`, `LLM_PROVIDER=gemini`, `LLM_MODEL=gemini-2.5-flash-lite`).
- **Privacidade:** o texto dos itens por fazer (`elemento`, `sub_elemento`, `notas`) é enviado para a API do Google. Não há dados pessoais sensíveis (é estado de obra). Se algum `notas` contiver nomes/dados de pessoas, isso sai para o Google — baixo risco, mas fica registado como consciente.

---

## 10. Validações contra o código real (feitas no brainstorming)

- `apartamentos.id` é **`smallint`** (não uuid). FKs novas usam `smallint references apartamentos(id)`.
- Convenção de PK "de dados": `bigserial` (`elementos`, `divisoes`); tabelas-lookup fixas usam ints pequenos. `relatorio_config` é single-row `smallint`.
- Roles atuais: só **`admin`** e **`user`** (migrations 0006/0008). Ambos veem tudo; escrita de config é `admin`.
- Trigger `set_updated_at()` já existe — reutilizar.
- Já existe `/relatorio/consulta/export/route.ts` (usa `jszip`) — referência para exportação; o executivo é saída separada.
- Migrations têm prefixos duplicados (dois `0005_*`, dois `0007_*`) — risco de ordenação num `db reset`. Não bloqueia esta feature (a nova é `0012`), mas renumerar antes de crescer o schema é dívida a registar.

---

## 11. Ordem de construção

1. **Factos + template, sem LLM.** `facts.ts` + `template.ts` + rota que mostra o parágrafo de template. Se o template já for legível, metade do problema está resolvido e o resto do pipeline tem rede.
2. **Camada LLM.** `provider.ts` + `gemini.ts` + `index.ts`; ligar no `gerar.ts` com fallback para o template.
3. **Prompt default + few-shot** (§5) e afinação com o exemplo dourado (§5.1).
4. **Persistência + config avançada** (migration 0012 + UI admin + preview).
5. **Lote dos 24** com espaçamento e barra de progresso; copiar/imprimir.
