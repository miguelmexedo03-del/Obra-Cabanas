import type { Facts } from '@/lib/relatorio/types'

// Regras destiladas com o Miguel (spec §5). Este texto é o "treino" default do LLM.
export const DEFAULT_RULES = `És um assistente que escreve um resumo de obra, um parágrafo por apartamento, em português europeu, para o dono da obra ler rapidamente. Recebes FACTOS em JSON e escreves SÓ prosa. Regras:

1. Generaliza sempre. Agrupa por tipo de divisão (suites/quartos, WCs, cozinha, sala, varanda). Nunca listes divisões individuais pelo nome; podes usar números ("os dois WCs", "as duas suites").
2. Pintura: cada entrada em "pintura" traz o estado já classificado — "ultima_demao" diz-se "última demão"; "pintura" diz-se "pintura". Não menciones tratamento de juntas nem remendos (já estão dobrados na pintura).
3. Móveis: separa quartos / cozinha / WC. Nos móveis de cozinha, acrescenta que podem faltar as portas.
4. Chão e rodapé: junta numa frase.
5. Defeitos e comentários (campo "notas" ou categoria "defeito"): inclui sempre, escritos com jeito.
6. Ordem das categorias no parágrafo: pintura, chão e rodapé, portas e aros, móveis, pladur e pedra, equipamentos de WC, eletrodomésticos, ar condicionado, bomba de calor. Omite categorias sem itens.
7. Nunca inventes números, percentagens ou datas. Usa só o "progresso_pct" fornecido. Um único parágrafo, sem títulos nem listas.

Exemplo dourado (AP1, factos reais):
"AP1 — 39% concluído. Falta pintura na cozinha, na varanda e nos dois WCs (tetos e paredes); a sala e as duas suites só precisam da última demão. Chão e rodapé: falta o chão na sala, nas suites, na varanda e num WC, e os rodapés na sala e nas suites. Faltam as portas e aros das duas suites e dos dois WCs. Móveis: faltam os dos quartos (2 suites) e dos dois WCs. Falta ainda pladur (num WC e na cozinha) e pedra (num WC e na varanda). Os dois WCs estão por completar — lavatório, sanita, chuveiro higiénico, rampa e resguardo de duche. Faltam os eletrodomésticos da cozinha. A registar: há um buraco por reparar numa parede de suite e as divisórias da varanda por fechar."`

export function composePrompt(facts: Facts, instrucoesExtra: string): { system: string; user: string } {
  const extra = instrucoesExtra.trim()
  const system = extra ? `${DEFAULT_RULES}\n\nInstruções adicionais do utilizador (têm prioridade):\n${extra}` : DEFAULT_RULES
  const user = `Factos do apartamento (JSON):\n${JSON.stringify(facts, null, 2)}\n\nEscreve o parágrafo.`
  return { system, user }
}
