import { format, isToday, isTomorrow, isYesterday, isPast, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { RecurrenceRule, TaskPriority, TaskStatus } from '@shared/types'

/** Rotulos e formatacoes de data em pt-BR usados na interface toda. */

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta'
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pendente',
  in_progress: 'Em andamento',
  done: 'Concluída'
}

export const RECURRENCE_LABELS: Record<RecurrenceRule, string> = {
  none: 'Não repete',
  daily: 'Diariamente',
  weekly: 'Semanalmente',
  monthly: 'Mensalmente',
  yearly: 'Anualmente'
}

export const REMINDER_OPTIONS = [
  { value: 0, label: 'Na hora' },
  { value: 5, label: '5 minutos antes' },
  { value: 15, label: '15 minutos antes' },
  { value: 30, label: '30 minutos antes' },
  { value: 60, label: '1 hora antes' },
  { value: 120, label: '2 horas antes' },
  { value: 1440, label: '1 dia antes' }
]

export function formatDueDate(iso: string | null): string {
  if (!iso) return 'Sem prazo'
  const date = parseISO(iso)
  const time = format(date, 'HH:mm')

  if (isToday(date)) return `Hoje, ${time}`
  if (isTomorrow(date)) return `Amanhã, ${time}`
  if (isYesterday(date)) return `Ontem, ${time}`
  return format(date, "dd 'de' MMM, HH:mm", { locale: ptBR })
}

export function formatFullDate(iso: string): string {
  return format(parseISO(iso), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
}

export function formatMonth(date: Date): string {
  return format(date, "MMMM 'de' yyyy", { locale: ptBR })
}

export function isOverdue(dueAt: string | null, status: TaskStatus): boolean {
  if (!dueAt || status === 'done') return false
  return isPast(parseISO(dueAt))
}

/** Junta a data escolhida no calendario com o horario digitado. */
export function combineDateTime(date: Date, time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  const result = new Date(date)
  result.setHours(hours || 0, minutes || 0, 0, 0)
  return result.toISOString()
}

export function extractTime(iso: string | null): string {
  if (!iso) return '09:00'
  return format(parseISO(iso), 'HH:mm')
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}
