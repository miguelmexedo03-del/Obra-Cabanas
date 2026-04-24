# Prompt Inicial — Obra Cabanas App

Este é o ficheiro para copiar como **primeira mensagem** no Claude Code depois de abrires a pasta do projeto no VS Code e correres `claude` no terminal integrado.

---

## Passos ANTES de colares o prompt

1. Instala o Claude Code globalmente:
   ```bash
   npm install -g @anthropic-ai/claude-code
   ```

2. Abre a pasta `obra-cabanas-app/` no VS Code:
   ```bash
   code "/caminho/para/obra-cabanas-app"
   ```

3. Abre o terminal integrado (Ctrl+`) e corre:
   ```bash
   claude
   ```

4. Autoriza o acesso quando pedido.

5. **Cola o prompt abaixo** (tudo o que está entre as linhas `---`).

---

## PROMPT (copia a partir daqui)

---

Olá. Estou a construir uma app de gestão de obra — "Obra Cabanas" — a partir de um workflow atual em Excel. Lê primeiro o `CLAUDE.md` na raiz do projeto — tem todo o contexto de domínio, tech stack, data model, convenções e milestones.

Depois de leres o CLAUDE.md:

1. Confirma-me que entendeste o essencial respondendo em menos de 10 linhas a estas três perguntas:
   - Qual é o stack e porquê foi escolhido?
   - Quantas entidades principais há na BD e qual o papel da tabela `elementos`?
   - Porque é que a sequência construtiva Tetos → Paredes → Carpintaria → Chão → WC importa?

2. Lista as ferramentas/MCPs que precisas que eu configure no Claude Code antes de começarmos:
   - Recomenda se faz sentido instalar o MCP da Supabase (para poderes inspecionar a BD diretamente).
   - Recomenda se faz sentido ativar o GitHub MCP (para PRs).
   - Diz-me se há alguma skill do Claude Code que queres que instale.

3. Começa o **Milestone 0 (Setup)**:
   - Inicializa um projeto Next.js 15 com TypeScript, Tailwind, App Router e ESLint.
   - Inicializa shadcn/ui (tema: `slate` base, radius `0.5rem`).
   - Instala as dependências necessárias para os milestones futuros (`@supabase/ssr`, `@supabase/supabase-js`, `@tanstack/react-query`, `react-hook-form`, `zod`, `@hookform/resolvers`, `date-fns`, `lucide-react`).
   - Configura o `tailwind.config.ts` com os design tokens de cor das fases (que estão no CLAUDE.md, secção 4 — mas vou listar aqui):
     - Fase 1 Tetos: `#4F81BD`
     - Fase 2 Paredes: `#E7A33B`
     - Fase 3 Carpintaria: `#9BBB59`
     - Fase 4 Chão/Rodapé: `#C0504D`
     - Fase 5 WC Equipamentos: `#8064A2`
   - Cria a estrutura de pastas descrita na secção 6 do CLAUDE.md (só as pastas, sem ficheiros ainda).
   - Cria um `README.md` no projeto que descreva em 5 linhas o que é a app, e como correr `dev`.
   - Cria `.env.example` com as vars do Supabase (URL, ANON_KEY, SERVICE_ROLE_KEY).
   - Faz o primeiro commit: "chore: M0 — project scaffold".

4. **Não avances para M1 sem me mostrares:**
   - O output do `npm run build` (deve passar).
   - O output do `npm run dev` a subir sem erros.
   - Uma listagem de `tree -L 3 -I 'node_modules|.next|.git'` para eu ver a estrutura.

Se alguma coisa correr mal ou tiveres dúvida sobre uma escolha, **pergunta antes de decidir**. Prefiro pushback honesto a seguires em frente com uma decisão duvidosa. Lembra-te que sou junior — não assumas conhecimentos, mas também não sejas condescendente.

Quando terminares o M0, dá-me um resumo de 5 linhas e espera que eu confirme antes de avançar para o M1.

---

## Depois do M0 (para teu conhecimento, não precisas de agir ainda)

Os milestones seguintes estão descritos no CLAUDE.md secção 7. Vou invocá-los um a um, à medida que validarmos cada um. A ordem é rígida: M0 → M1 → M2 → ... → M8.

Entre milestones posso pedir-te ajustes, adicionar testes, ou dar feedback visual. Responde sempre considerando o estilo de comunicação descrito no CLAUDE.md secção 8.

---

## Como usar este prompt em cada sessão

- **Primeira vez:** cola este prompt completo.
- **Sessões seguintes:** basta dizeres `continua` ou `vamos para o Mx` — o Claude Code lê o CLAUDE.md automaticamente em cada sessão. Mantém o CLAUDE.md atualizado com decisões arquiteturais novas.
