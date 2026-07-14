// Mapeia um elemento de checklist para a categoria de artigo usada no parágrafo
// (spec §5 regra 6). Devolve null quando o item deve ser OMITIDO — a prep de
// pintura (tratamento de juntas, remendos de teto e de paredes) dobra-se dentro
// da pintura e não se menciona (spec §5 regra 2). As fases de pintura
// ('Pintura Teto'/'Pintura Paredes') são tratadas à parte em buildFacts e nunca
// chegam aqui.
export function categorizarItem(
  fase: string,
  elemento: string,
  sub: string | null,
  divisao: string,
): string | null {
  const el = elemento.toLowerCase()
  const d = divisao.toLowerCase()

  // Ar condicionado / bomba de calor — por elemento, independentemente da fase
  if (el.includes('ar condicionado')) return 'ar condicionado'
  if (el.includes('bomba de calor') || el.includes('bomba')) return 'bomba de calor'

  switch (fase) {
    case 'Teto':
    case 'Remendos Teto':
    case 'Remendo Paredes':
      return null // prep de pintura — dobrada na pintura, não mencionar

    case 'Chão e Rodapé':
      return 'chão e rodapé'

    case 'Portas':
      return 'portas e aros'

    case 'Móveis': {
      if (d.includes('cozinha')) return 'móveis de cozinha'
      if (d.includes('wc')) return 'móveis de WC'
      return 'móveis de quarto'
    }

    case 'Eletrodomésticos':
      return 'eletrodomésticos'

    case 'WC Equipamentos':
      return 'equipamentos de WC'

    case 'Paredes': {
      const s = (sub ?? '').toLowerCase()
      if (s.includes('pladur') || s.includes('pedra')) return 'pladur e pedra'
      return 'defeito'
    }

    default:
      return 'outros'
  }
}
