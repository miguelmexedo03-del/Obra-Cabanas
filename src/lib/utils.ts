import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Strip chars that PostgREST treats as delimiters in .or() filter strings
export function sanitizeIlikePattern(q: string) {
  return q.replace(/[,()]/g, ' ').trim()
}

const ELEMENTO_ORDER: Record<string, number> = {
  Teto: 0, Paredes: 1, Chão: 2, Rodapé: 3,
}

const SUB_ELEMENTO_ORDER: Record<string, number> = {
  Primário: 10, Extracoat: 20, '1ª demão': 30, '2ª demão': 40,
}

// Semantic sort order for apartment divisions (Sala → Cozinha → Suites → Quartos → WC Serviço → Varanda)
export function divisaoSortPriority(nome: string): number {
  const n = nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

  if (n === 'sala') return 100
  if (n === 'cozinha') return 200

  if (n === 'suite principal') return 300
  if (n.includes('wc') && n.includes('suite principal')) return 310
  if (n.includes('closet') && n.includes('suite principal')) return 320

  if (n.includes('suite 1') && !n.includes('wc')) return 400
  if (n.includes('wc') && n.includes('suite 1')) return 410

  if (n.includes('suite 2') && !n.includes('wc')) return 500
  if (n.includes('wc') && n.includes('suite 2')) return 510

  if (n.startsWith('suite') && !n.includes('wc')) return 600
  if (n.includes('wc') && n.includes('suite')) return 610
  if (n.includes('closet') && n.includes('suite')) return 620

  if (n.startsWith('quarto') && !n.includes('wc')) return 700
  if (n.includes('wc') && n.includes('quarto')) return 710

  if (n.includes('wc') && n.includes('servic')) return 800

  if (n.startsWith('closet')) return 840
  if (n === 'wc') return 860

  if (n.startsWith('varanda')) return 900

  if (n.startsWith('entrada')) return 50

  return 9999
}

export const TIPOS_DIVISAO = [
  'Entrada', 'Sala', 'Cozinha', 'Suites/Quartos', 'WC', 'Closet', 'Varanda',
] as const

export type TipoDivisao = typeof TIPOS_DIVISAO[number]

// Categoriza uma divisão pelo tipo de compartimento, colapsando variantes
// (WC Suite 1, WC de Serviço, WC(Suite Principal)...) numa única categoria "WC",
// e todas as suites/quartos (Suite Principal, Suite 1, Suite 2, Quarto, etc.)
// numa única categoria "Suites/Quartos" — não interessa distinguir qual suite
// específica no dia-a-dia do filtro.
export function tipoDivisao(nome: string): TipoDivisao {
  const n = nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s*\(/g, ' (')
    .replace(/\s+/g, ' ')
    .trim()

  if (n.includes('wc')) return 'WC'
  if (n.startsWith('closet')) return 'Closet'
  if (n === 'sala') return 'Sala'
  if (n === 'cozinha') return 'Cozinha'
  if (n.startsWith('entrada')) return 'Entrada'
  if (n.startsWith('varanda')) return 'Varanda'
  if (n.startsWith('suite') || n.startsWith('quarto')) return 'Suites/Quartos'
  return 'Suites/Quartos'
}

export function sortElementos<T extends {
  elemento: string
  fase_id: number
  sub_elemento: string | null
}>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const eA = ELEMENTO_ORDER[a.elemento] ?? 99
    const eB = ELEMENTO_ORDER[b.elemento] ?? 99
    if (eA !== eB) return eA - eB
    if (a.fase_id !== b.fase_id) return a.fase_id - b.fase_id
    const sA = a.sub_elemento === null ? 0 : (SUB_ELEMENTO_ORDER[a.sub_elemento] ?? 50)
    const sB = b.sub_elemento === null ? 0 : (SUB_ELEMENTO_ORDER[b.sub_elemento] ?? 50)
    if (sA !== sB) return sA - sB
    return (a.sub_elemento ?? '').localeCompare(b.sub_elemento ?? '', 'pt')
  })
}
