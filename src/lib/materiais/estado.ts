import type { EstadoMaterial } from '@/lib/materiais/types'

export const ESTADOS: EstadoMaterial[] = ['por_encomendar', 'encomendado', 'em_stock']

const LABELS: Record<EstadoMaterial, string> = {
  por_encomendar: 'Por encomendar',
  encomendado: 'Encomendado',
  em_stock: 'Em stock',
}

export function estadoLabel(e: EstadoMaterial): string {
  return LABELS[e]
}
