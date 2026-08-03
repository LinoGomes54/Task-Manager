import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Une classes do Tailwind resolvendo conflitos. Usado por todos os componentes shadcn. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
