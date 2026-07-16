import type { EstadoMaterial, Sitio } from '@/lib/materiais/types'

export const ESTADOS: EstadoMaterial[] = ['por_encomendar', 'encomendado', 'em_stock']

const LABELS: Record<EstadoMaterial, string> = {
  por_encomendar: 'Por encomendar',
  encomendado: 'Encomendado',
  em_stock: 'Em stock',
}

export function estadoLabel(e: EstadoMaterial): string {
  return LABELS[e]
}

export const SITIOS: Sitio[] = ['em_armazem', 'em_obra']

const SITIO_LABELS: Record<Sitio, string> = {
  em_armazem: 'Em armazém',
  em_obra: 'Em obra',
}

export function sitioLabel(s: Sitio): string {
  return SITIO_LABELS[s]
}
