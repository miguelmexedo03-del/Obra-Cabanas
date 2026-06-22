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
