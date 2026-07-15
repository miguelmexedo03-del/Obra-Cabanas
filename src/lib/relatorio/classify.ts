import type { PinturaEstado } from '@/lib/relatorio/types'

// Regra destilada com o Miguel: só quando a ÚNICA demão pendente é a 2ª
// é que se diz "última demão". Qualquer coisa abaixo (primário, 1ª demão,
// extracoat) → "pintura". Ver spec §5 regra 2.
export function classifyPintura(pendingCoats: string[]): PinturaEstado {
  if (pendingCoats.length === 0) return 'ok'
  if (pendingCoats.length === 1 && pendingCoats[0] === '2ª demão') return 'ultima_demao'
  return 'pintura'
}
