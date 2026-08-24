/**
 * Tipos compartilhados entre o processo principal, o preload e o renderer.
 * Este arquivo nao pode importar nada de `electron` nem do DOM.
 */

export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskStatus = 'pending' | 'in_progress' | 'done'
export type RecurrenceRule = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'
export type ThemePreference = 'light' | 'dark' | 'system'
export type DensityPreference = 'compacto' | 'espacoso'

export interface User {
  id: string
  name: string
  email: string
  createdAt: string
}

export interface Category {
  id: string
  userId: string
  name: string
  color: string
  icon: string | null
  createdAt: string
  updatedAt: string
}

export interface Task {
  id: string
  userId: string
  categoryId: string | null
  title: string
  description: string | null
  priority: TaskPriority
  status: TaskStatus
  isImportant: boolean
  dueAt: string | null
  remindMinutesBefore: number
  notifiedAt: string | null
  completedAt: string | null
  recurrence: RecurrenceRule
  recurrenceInterval: number
  /**
   * Dias da semana de uma repeticao semanal, no formato de `Date.getDay()`
   * (0 = domingo … 6 = sabado). Vazio significa "todo dia da semana do prazo".
   */
  recurrenceWeekdays: number[]
  recurrenceUntil: string | null
  parentTaskId: string | null
  /** Quanto tempo a tarefa ocupa na agenda do dia, em minutos. */
  durationMinutes: number
  /**
   * Dia em que a tarefa foi colocada na agenda (`YYYY-MM-DD`), ou `null` se nao
   * esta agendada. E separado de `dueAt` de proposito: o prazo diz *quando
   * vence*, a agenda diz *quando eu vou fazer*.
   */
  agendaDate: string | null
  /** Ordem dentro da agenda do dia. Os horarios saem daqui, encadeados. */
  agendaPosition: number
  createdAt: string
  updatedAt: string
}

export interface AppSettings {
  userId: string
  autoLaunch: boolean
  startMinimized: boolean
  closeToTray: boolean
  notificationsEnabled: boolean
  soundEnabled: boolean
  reminderLeadMinutes: number
  /**
   * Impede concluir repeticoes futuras de tarefas recorrentes — so a ocorrencia
   * de hoje (ou uma ja atrasada) pode ser marcada. Ligado por padrao.
   */
  lockFutureRecurring: boolean
  theme: ThemePreference
  /** Altura das linhas e tamanho do texto — vem do design. */
  density: DensityPreference
  /** Cor de destaque em hex. Tudo o mais na paleta deriva dela. */
  accentColor: string
  /** Duracao padrao de um bloco de trabalho na agenda. */
  pomodoroMinutes: number
  /** Intervalo inserido entre um bloco e o proximo. */
  breakMinutes: number
  /** Horario em que a agenda do dia comeca (`HH:mm`). */
  agendaStartTime: string
  updatedAt: string
}

/** Payload de criacao. `userId` vem da sessao no processo principal. */
export interface CreateTaskInput {
  title: string
  description?: string | null
  categoryId?: string | null
  priority?: TaskPriority
  status?: TaskStatus
  isImportant?: boolean
  dueAt?: string | null
  remindMinutesBefore?: number
  recurrence?: RecurrenceRule
  recurrenceInterval?: number
  recurrenceWeekdays?: number[]
  recurrenceUntil?: string | null
  durationMinutes?: number
  agendaDate?: string | null
  agendaPosition?: number
}

export type UpdateTaskInput = Partial<CreateTaskInput> & { id: string }

export interface TaskFilters {
  search?: string
  categoryId?: string | null
  status?: TaskStatus | 'all'
  priority?: TaskPriority | 'all'
  onlyImportant?: boolean
  onlyRecurring?: boolean
  /** Filtra por uma regra de repeticao especifica (abas Diariamente/Semanalmente/Mensalmente). */
  recurrence?: RecurrenceRule
  /** ISO date (inclusive) — filtra por `dueAt`. */
  from?: string
  /** ISO date (inclusive) — filtra por `dueAt`. */
  to?: string
  /**
   * Recorte por prazo, independente de `from`/`to`:
   * - `overdue`  → pendentes cujo `dueAt` ja passou
   * - `no_due`   → tarefas sem prazo definido (`dueAt IS NULL`)
   *
   * Existe porque `dueAt >= from` descarta silenciosamente as linhas com `NULL`,
   * o que fazia as tarefas sem prazo sumirem do dashboard.
   */
  dueScope?: 'overdue' | 'no_due'
}

export interface CreateCategoryInput {
  name: string
  color: string
  icon?: string | null
}

export type UpdateCategoryInput = Partial<CreateCategoryInput> & { id: string }

export interface DashboardStats {
  dueToday: number
  overdue: number
  completedThisMonth: number
  pendingTotal: number
  importantPending: number
  byCategory: Array<{
    categoryId: string | null
    name: string
    color: string
    icon: string | null
    count: number
  }>
}

/** Estado da sincronizacao exposto ao renderer. */
export interface SyncState {
  /** `false` quando `DATABASE_URL` nao foi configurada. */
  configured: boolean
  status: 'idle' | 'syncing' | 'error' | 'offline'
  lastSyncedAt: string | null
  pendingChanges: number
  lastError: string | null
}

export interface AuthResult {
  user: User
  settings: AppSettings
}

export interface Session {
  user: User
  settings: AppSettings
}

/** Formato uniforme de retorno de todos os canais IPC. */
export type IpcResult<T> = { ok: true; data: T } | { ok: false; error: string }
