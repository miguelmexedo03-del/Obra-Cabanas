# Relatório por Apartamento — Documentação de Features

Sessão de desenvolvimento: **junho 2026**

---

## 1. Relatório por Apartamento (`/relatorio?ap=X`)

Página que mostra apenas os itens com ocorrências de um apartamento — substitui a necessidade de percorrer a checklist completa.

### Filtro de conteúdo
Só aparecem itens em duas categorias:
- **Em falta** — `concluido = false`
- **Feito com observação** — `concluido = true` com fotos ou notas adicionadas pela app

Itens concluídos sem evidências não aparecem. Notas importadas do Excel (`elementos.notas`) foram removidas porque tinham encoding corrompido — o sistema de notas actual usa `item_evidencias.texto`.

### Estrutura visual
- Cabeçalho com nome do AP, data de geração, data de última alteração na checklist
- Contadores em destaque: total em falta (vermelho) e feitos com observação (âmbar)
- Agrupamento por divisão (Suite Principal, WC, Sala, Cozinha, etc.)
- Dentro de cada divisão: secção vermelha "Em falta" + secção âmbar "Feito com observação"
- Fotos em grelha com lightbox ao clicar (abre fullscreen, fecha com Escape ou clique fora)

### Ordenação dos itens (`sortElementos`)
Função genérica em `lib/utils.ts` que ordena por:
1. `ELEMENTO_ORDER`: Teto → Paredes → Chão → Rodapé
2. `fase_id` (para elementos fora do mapeamento acima)
3. `SUB_ELEMENTO_ORDER`: Primário → Extracoat → 1ª demão → 2ª demão

### Acesso
- Botão **"Ver Relatório"** na página de detalhe de cada apartamento (`/apartamentos/[id]`)
- URL directa: `/relatorio?ap=3`

---

## 2. Exportar PDF

Gera um PDF do relatório via impressão do browser (`window.print()`).

### Como funciona
- Parâmetro `?print=1` na URL activa o `PrintTrigger`
- O `PrintTrigger` aguarda o carregamento de todas as imagens antes de chamar `window.print()` (baseado em Promise, não em timeout fixo)
- CSS `@media print` em `relatorio.module.css` esconde a sidebar e ajusta o layout

### Ajustes de impressão
- Fotos: **64×64px** no ecrã → **160×160px** no PDF (`print:w-40 print:h-40`)
- Fundos coloridos (caixas âmbar das notas, badges) imprimem com cor (`print-color-adjust: exact`)
- Cada divisão tem `print:break-inside-avoid`
- Botões de exportação ficam ocultos no PDF (`print:hidden`)

### Acesso
- Botão **"Exportar PDF"** no cabeçalho do relatório
- Abre em nova aba com `?print=1` → impressão dispara automaticamente

---

## 3. Exportar HTML (`/relatorio/export?ap=X`)

Gera um ficheiro `.html` descarregável que qualquer pessoa pode abrir num browser sem conta nem acesso à app.

### Características
- Estilos todos **inline** — não depende de CDN, Tailwind, nem internet
- Fotos carregam via URL pública do Supabase (requerem internet)
- **Lightbox** embutido em JavaScript puro: clica na foto → fullscreen, Escape ou clique fora fecha
- Nome do ficheiro automático: `relatorio-AP3.html`
- Rota protegida por autenticação (só utilizadores com sessão podem gerar)

### Acesso
- Botão **"Exportar HTML"** no cabeçalho do relatório (ao lado do "Exportar PDF")

---

## 4. Exportação de Múltiplos Apartamentos (`/relatorio/selecionar`)

Página de seleção para exportar vários apartamentos de uma só vez.

### Interface
- Grelha 6×4 com os 24 APs (AP1–AP24) como botões toggling
- Ficam azuis quando selecionados
- Botão "Selecionar todos" / "Limpar seleção"
- Contador dinâmico: "X apartamentos selecionados"
- Botões de exportação desactivados quando nenhum AP está selecionado

### Exportar HTML (múltiplos)
- Gera **um único ficheiro `.html`** com todos os apartamentos selecionados
- Inclui índice clicável no topo com links para cada secção (AP1, AP2, ...)
- Cada AP tem o seu cabeçalho com estatísticas
- Quebras de página entre APs para impressão
- Lightbox partilhado funciona em todas as fotos do ficheiro
- Nome do ficheiro: `relatorio-AP1-AP3-AP5.html` (lista os códigos)

### Exportar PDF (múltiplos)
- Abre `/relatorio/multi?aps=1&aps=2&...&print=1` em nova aba
- Página combinada com todos os APs em sequência
- Quebra de página (`print:break-before-page`) entre cada apartamento
- Impressão dispara automaticamente após carregamento das imagens

### Acesso
- Botão **"Exportar relatórios"** na página `/apartamentos` (canto superior direito)

---

## 5. Correcções (Bug Fixes)

### Caracteres portugueses com símbolo ◆
- **Causa:** Fonts `Outfit` e `IBM Plex Mono` carregados apenas com `subsets: ["latin"]`, que não inclui caracteres como "í", "ã", "ç", "ê" (Latin Extended)
- **Fix:** `subsets: ["latin", "latin-ext"]` em ambos os fonts em `src/app/layout.tsx`
- **Impacto:** Corrige em toda a aplicação, não só no relatório

### Fotos pequenas no PDF
- **Causa:** Thumbnails de 64×64px sem override para impressão
- **Fix:** Classes `print:w-40 print:h-40` em `foto-grid.tsx` → 160×160px no PDF

### Fundos sem cor no PDF
- **Causa:** Browsers omitem fundos coloridos por defeito na impressão
- **Fix:** `print-color-adjust: exact` em `relatorio.module.css`

### Notas do Excel com encoding corrompido
- **Causa:** Campo `elementos.notas` foi preenchido na importação do Excel com encoding errado — caracteres como "é", "ó" aparecem como "♦"
- **Fix:** Campo `el.notas` removido do relatório. Notas válidas usam `item_evidencias.texto` (adicionadas pela app)
- **Efeito:** Itens concluídos que tinham apenas nota do Excel deixam de aparecer como "Feito com observação"

---

## 6. Ficheiros Criados / Modificados

| Ficheiro | Alteração |
|---|---|
| `src/app/layout.tsx` | `latin-ext` nos subsets dos fonts |
| `src/lib/utils.ts` | Função `sortElementos` |
| `src/app/(app)/relatorio/page.tsx` | Página principal do relatório |
| `src/app/(app)/relatorio/relatorio.module.css` | CSS de impressão |
| `src/app/(app)/relatorio/_components/relatorio-header.tsx` | Cabeçalho com botões de exportação |
| `src/app/(app)/relatorio/_components/relatorio-divisao.tsx` | Componente de divisão + ItemRow |
| `src/app/(app)/relatorio/_components/foto-grid.tsx` | Grelha de fotos com lightbox |
| `src/app/(app)/relatorio/_components/lightbox.tsx` | Overlay fullscreen para fotos |
| `src/app/(app)/relatorio/_components/print-trigger.tsx` | Auto-print aguardando imagens |
| `src/app/(app)/relatorio/export/route.ts` | Route handler HTML export (single + multi) |
| `src/app/(app)/relatorio/selecionar/page.tsx` | Página de seleção multi-AP |
| `src/app/(app)/relatorio/selecionar/_components/selecionar-client.tsx` | UI de seleção (Client Component) |
| `src/app/(app)/relatorio/multi/page.tsx` | Página PDF combinada multi-AP |
| `src/app/(app)/apartamentos/[id]/page.tsx` | Botões "Ver Relatório" e "Exportar PDF" |
| `src/app/(app)/apartamentos/page.tsx` | Botão "Exportar relatórios" |
| `src/lib/database.types.ts` | Tipos para `evidencia_fotos` e `item_evidencias` |

---

## 7. Rotas Novas

| Rota | Descrição |
|---|---|
| `GET /relatorio?ap=X` | Relatório de um apartamento |
| `GET /relatorio?ap=X&print=1` | Mesmo relatório com auto-print |
| `GET /relatorio/export?ap=X` | Download HTML (AP único) |
| `GET /relatorio/export?ap=X&ap=Y&...` | Download HTML (múltiplos APs, ficheiro combinado) |
| `GET /relatorio/selecionar` | Página de seleção para exportação em massa |
| `GET /relatorio/multi?aps=X&aps=Y` | Relatório combinado multi-AP |
| `GET /relatorio/multi?aps=X&aps=Y&print=1` | Mesmo com auto-print |
