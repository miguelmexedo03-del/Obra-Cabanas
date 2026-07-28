import { renderTemplate } from '@/lib/relatorio/template'
import type { Facts, RelatorioResult } from '@/lib/relatorio/types'

// Gerador determinístico — sem LLM (ver DESIGN.md / decisão de 2026-07-28:
// o formato tinha de ser sempre igual entre relatórios, o que um LLM não
// garante). A app calcula os factos e escreve a prosa; nunca falha, nunca
// varia de estrutura entre apartamentos.
export function gerarDeFactos(facts: Facts): RelatorioResult {
  return { apartamento: facts.apartamento, texto: renderTemplate(facts), origem: 'template' }
}
