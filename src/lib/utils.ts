import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Strip chars that PostgREST treats as delimiters in .or() filter strings
export function sanitizeIlikePattern(q: string) {
  return q.replace(/[,()]/g, ' ').trim()
}
