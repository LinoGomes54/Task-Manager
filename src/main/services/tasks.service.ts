import { queryAll, queryOne, execute, now, newId, toBool } from '../db/local'
import { getSettings } from './settings.service'
import { isFutureRecurrence, FUTURE_RECURRENCE_MESSAGE } from '@shared/task-rules'
import type {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilters,
  DashboardStats,
  TaskPriority,
  TaskStatus,
  RecurrenceRule
} from '@shared/types'

type Row = Record<string, unknown>

/** Os dias da semana viajam como CSV ("1,3,5") para caber numa coluna de texto. */
function parseWeekdays(value: unknown): number[] {
  if (typeof value !== 'string' || value.trim() === '') return []
  return value
    .split(',')
    .map((n) => Number(n.trim()))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)
}

function serializeWeekdays(days: number[] | undefined): string {
  if (!days || days.length === 0) return ''
  return [...new Set(days)].filter((n) => n >= 0 && n <= 6).sort((a, b) => a - b).join(',')
}

function mapTask(row: Row): Task {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    categoryId: row.category_id === null ? null : String(row.category_id),
    title: String(row.title),
    description: row.description === null ? null : String(row.description),
    priority: String(row.priority) as TaskPriority,
    status: String(row.status) as TaskStatus,
    isImportant: toBool(row.is_important),
    dueAt: row.due_at === null ? null : String(row.due_at),
    remindMinutesBefore: Number(row.remind_minutes_before),
    notifiedAt: row.notified_at === null ? null : String(row.notified_at),
    completedAt: row.completed_at === null ? null : String(row.completed_at),
    recurrence: String(row.recurrence) as RecurrenceRule,
    recurrenceInterval: Number(row.recurrence_interval),
    recurrenceWeekdays: parseWeekdays(row.recurrence_weekdays),
    recurrenceUntil: row.recurrence_until === null ? null : String(row.recurrence_until),
    parentTaskId: row.parent_task_id === null ? null : String(row.parent_task_id),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  }
}

/* ------------------------------------------------------------------ */
/* Leitura                                                             */
/* ------------------------------------------------------------------ */

export function listTasks(userId: string, filters: TaskFilters = {}): Task[] {
  const where: string[] = ['user_id = ?', 'deleted_at IS NULL']
  const params: unknown[] = [userId]

  if (filters.search?.trim()) {
    where.push('(lower(title) LIKE ? OR lower(ifnull(description, "")) LIKE ?)')
    const term = `%${filters.search.trim().toLowerCase()}%`
    params.push(term, term)
  }
  if (filters.categoryId !== undefined && filters.categoryId !== null) {
    where.push('category_id = ?')
    params.push(filters.categoryId)
  }
  if (filters.status && filters.status !== 'all') {
    where.push('status = ?')
    params.push(filters.status)
  }
  if (filters.priority && filters.priority !== 'all') {
    where.push('priority = ?')
    params.push(filters.priority)
  }
  if (filters.onlyImportant) where.push('is_important = 1')
  if (filters.onlyRecurring) where.push("recurrence <> 'none'")
  if (filters.recurrence) {
    where.push('recurrence = ?')
    params.push(filters.recurrence)
  }
  if (filters.from) {
    where.push('due_at >= ?')
    params.push(filters.from)
  }
  if (filters.to) {
    where.push('due_at <= ?')
    params.push(filters.to)
  }
  if (filters.dueScope === 'no_due') {
    where.push('due_at IS NULL')
  }
  if (filters.dueScope === 'overdue') {
    where.push("due_at IS NOT NULL AND due_at < ? AND status <> 'done'")
    params.push(now())
  }

  return queryAll<Row>(
    `SELECT * FROM tasks
     WHERE ${where.join(' AND ')}
     ORDER BY
       CASE status WHEN 'done' THEN 1 ELSE 0 END,
       due_at IS NULL,
       due_at ASC,
       CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
       created_at DESC`,
    params
  ).map(mapTask)
}

export function getTask(userId: string, id: string): Task | null {
  const row = queryOne<Row>('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [id, userId])
  return row ? mapTask(row) : null
}

/* ------------------------------------------------------------------ */
/* Escrita                                                             */
/* ------------------------------------------------------------------ */

export function createTask(userId: string, input: CreateTaskInput): Task {
  const title = input.title.trim()
  if (!title) throw new Error('O título da tarefa é obrigatório.')

  const id = newId()
  const timestamp = now()

  execute(
    `INSERT INTO tasks (
       id, user_id, category_id, title, description, priority, status, is_important,
       due_at, remind_minutes_before, recurrence, recurrence_interval, recurrence_weekdays,
       recurrence_until, parent_task_id, created_at, updated_at, dirty
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, 1)`,
    [
      id,
      userId,
      input.categoryId ?? null,
      title,
      input.description?.trim() || null,
      input.priority ?? 'medium',
      input.status ?? 'pending',
      input.isImportant ?? false,
      input.dueAt ?? null,
      input.remindMinutesBefore ?? 15,
      input.recurrence ?? 'none',
      input.recurrenceInterval ?? 1,
      serializeWeekdays(input.recurrenceWeekdays),
      input.recurrenceUntil ?? null,
      timestamp,
      timestamp
    ]
  )

  return getTask(userId, id)!
}

const UPDATABLE = {
  categoryId: 'category_id',
  title: 'title',
  description: 'description',
  priority: 'priority',
  status: 'status',
  isImportant: 'is_important',
  dueAt: 'due_at',
  remindMinutesBefore: 'remind_minutes_before',
  recurrence: 'recurrence',
  recurrenceInterval: 'recurrence_interval',
  recurrenceWeekdays: 'recurrence_weekdays',
  recurrenceUntil: 'recurrence_until'
} as const

export function updateTask(userId: string, input: UpdateTaskInput): Task {
  const existing = getTask(userId, input.id)
  if (!existing) throw new Error('Tarefa não encontrada.')

  const assignments: string[] = []
  const params: unknown[] = []

  for (const [key, column] of Object.entries(UPDATABLE)) {
    const value = input[key as keyof typeof UPDATABLE]
    if (value === undefined) continue
    assignments.push(`${column} = ?`)
    if (key === 'recurrenceWeekdays') params.push(serializeWeekdays(value as number[]))
    else params.push(typeof value === 'string' && key === 'title' ? value.trim() : value)
  }

  // Mudou o prazo? O lembrete precisa poder disparar de novo.
  if (input.dueAt !== undefined && input.dueAt !== existing.dueAt) {
    assignments.push('notified_at = NULL')
  }

  // Concluir/reabrir pela edicao tambem ajusta o `completed_at`.
  if (input.status !== undefined && input.status !== existing.status) {
    assignments.push('completed_at = ?')
    params.push(input.status === 'done' ? now() : null)
  }

  if (assignments.length === 0) return existing

  assignments.push('updated_at = ?', 'dirty = 1')
  params.push(now(), input.id, userId)

  execute(`UPDATE tasks SET ${assignments.join(', ')} WHERE id = ? AND user_id = ?`, params)
  return getTask(userId, input.id)!
}

/** Exclusao logica: e o que permite a remocao se propagar ate o Neon. */
export function removeTask(userId: string, id: string): void {
  const timestamp = now()
  execute(
    'UPDATE tasks SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE id = ? AND user_id = ?',
    [timestamp, timestamp, id, userId]
  )
}

/**
 * Alterna concluida/pendente.
 *
 * Ao concluir uma tarefa recorrente, a proxima ocorrencia e criada na hora —
 * assim o historico do que foi feito continua intacto e o usuario nunca fica
 * sem a proxima repeticao agendada.
 */
export function toggleComplete(userId: string, id: string): Task {
  const task = getTask(userId, id)
  if (!task) throw new Error('Tarefa não encontrada.')

  // A interface ja desabilita o controle; esta checagem existe porque o backend
  // nao pode confiar em validacao feita do outro lado do IPC.
  if (isFutureRecurrence(task, getSettings(userId).lockFutureRecurring)) {
    throw new Error(FUTURE_RECURRENCE_MESSAGE)
  }

  const completing = task.status !== 'done'
  const timestamp = now()

  execute(
    `UPDATE tasks SET status = ?, completed_at = ?, updated_at = ?, dirty = 1
     WHERE id = ? AND user_id = ?`,
    [completing ? 'done' : 'pending', completing ? timestamp : null, timestamp, id, userId]
  )

  if (completing && task.recurrence !== 'none') createNextOccurrence(userId, task)

  return getTask(userId, id)!
}

export function toggleImportant(userId: string, id: string): Task {
  const task = getTask(userId, id)
  if (!task) throw new Error('Tarefa não encontrada.')

  execute(
    'UPDATE tasks SET is_important = ?, updated_at = ?, dirty = 1 WHERE id = ? AND user_id = ?',
    [!task.isImportant, now(), id, userId]
  )
  return getTask(userId, id)!
}

/* ------------------------------------------------------------------ */
/* Recorrencia                                                         */
/* ------------------------------------------------------------------ */

/**
 * Avanca uma data conforme a regra de recorrencia.
 *
 * Na regra semanal com dias marcados, o proximo prazo e o **proximo dia marcado**
 * — uma tarefa de segunda, quarta e sexta anda de dois em dois dias dentro da
 * semana, e so aplica o intervalo ao virar para a semana seguinte.
 */
export function advanceDate(
  date: Date,
  rule: RecurrenceRule,
  interval: number,
  weekdays: number[] = []
): Date {
  const next = new Date(date)
  const step = Math.max(1, interval)

  switch (rule) {
    case 'daily':
      next.setDate(next.getDate() + step)
      break
    case 'weekly': {
      const dias = [...new Set(weekdays)].sort((a, b) => a - b)
      if (dias.length === 0) {
        next.setDate(next.getDate() + 7 * step)
        break
      }
      const atual = next.getDay()
      const aindaEstaSemana = dias.find((d) => d > atual)
      if (aindaEstaSemana !== undefined) {
        next.setDate(next.getDate() + (aindaEstaSemana - atual))
      } else {
        // Volta para o primeiro dia marcado, ja na proxima rodada de semanas.
        next.setDate(next.getDate() + (7 - atual + dias[0]) + 7 * (step - 1))
      }
      break
    }
    case 'monthly':
      next.setMonth(next.getMonth() + step)
      break
    case 'yearly':
      next.setFullYear(next.getFullYear() + step)
      break
    default:
      break
  }
  return next
}

function createNextOccurrence(userId: string, task: Task): void {
  const base = task.dueAt ? new Date(task.dueAt) : new Date()
  let next = advanceDate(base, task.recurrence, task.recurrenceInterval, task.recurrenceWeekdays)

  // Se o prazo original ja passou ha varias repeticoes, pula para a proxima futura.
  const limit = 500
  let steps = 0
  while (next.getTime() <= Date.now() && steps < limit) {
    next = advanceDate(next, task.recurrence, task.recurrenceInterval, task.recurrenceWeekdays)
    steps++
  }

  if (task.recurrenceUntil && next.getTime() > new Date(task.recurrenceUntil).getTime()) return

  const timestamp = now()
  execute(
    `INSERT INTO tasks (
       id, user_id, category_id, title, description, priority, status, is_important,
       due_at, remind_minutes_before, recurrence, recurrence_interval, recurrence_weekdays,
       recurrence_until, parent_task_id, created_at, updated_at, dirty
     ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      newId(),
      userId,
      task.categoryId,
      task.title,
      task.description,
      task.priority,
      task.isImportant,
      next.toISOString(),
      task.remindMinutesBefore,
      task.recurrence,
      task.recurrenceInterval,
      serializeWeekdays(task.recurrenceWeekdays),
      task.recurrenceUntil,
      task.parentTaskId ?? task.id,
      timestamp,
      timestamp
    ]
  )
}

/* ------------------------------------------------------------------ */
/* Estatisticas do dashboard                                           */
/* ------------------------------------------------------------------ */

function startOfDay(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function endOfDay(date: Date): string {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d.toISOString()
}

export function getStats(userId: string): DashboardStats {
  const today = new Date()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999)

  const count = (sql: string, params: unknown[]): number =>
    queryOne<{ n: number }>(sql, params)?.n ?? 0

  const dueToday = count(
    `SELECT COUNT(*) AS n FROM tasks
     WHERE user_id = ? AND deleted_at IS NULL AND status <> 'done'
       AND due_at BETWEEN ? AND ?`,
    [userId, startOfDay(today), endOfDay(today)]
  )

  const overdue = count(
    `SELECT COUNT(*) AS n FROM tasks
     WHERE user_id = ? AND deleted_at IS NULL AND status <> 'done'
       AND due_at IS NOT NULL AND due_at < ?`,
    [userId, now()]
  )

  const completedThisMonth = count(
    `SELECT COUNT(*) AS n FROM tasks
     WHERE user_id = ? AND deleted_at IS NULL AND status = 'done'
       AND completed_at BETWEEN ? AND ?`,
    [userId, monthStart.toISOString(), monthEnd.toISOString()]
  )

  const pendingTotal = count(
    `SELECT COUNT(*) AS n FROM tasks
     WHERE user_id = ? AND deleted_at IS NULL AND status <> 'done'`,
    [userId]
  )

  const importantPending = count(
    `SELECT COUNT(*) AS n FROM tasks
     WHERE user_id = ? AND deleted_at IS NULL AND status <> 'done' AND is_important = 1`,
    [userId]
  )

  const byCategory = queryAll<Row>(
    `SELECT c.id AS category_id, c.name AS name, c.color AS color, c.icon AS icon,
            COUNT(t.id) AS count
     FROM categories c
     LEFT JOIN tasks t
       ON t.category_id = c.id AND t.deleted_at IS NULL AND t.status <> 'done'
     WHERE c.user_id = ? AND c.deleted_at IS NULL
     GROUP BY c.id, c.name, c.color, c.icon
     ORDER BY count DESC, c.name COLLATE NOCASE`,
    [userId]
  ).map((row) => ({
    categoryId: row.category_id === null ? null : String(row.category_id),
    name: String(row.name),
    color: String(row.color),
    icon: row.icon === null ? null : String(row.icon),
    count: Number(row.count)
  }))

  return { dueToday, overdue, completedThisMonth, pendingTotal, importantPending, byCategory }
}

/* ------------------------------------------------------------------ */
/* Alarmes                                                             */
/* ------------------------------------------------------------------ */

/**
 * Tarefas cujo lembrete ja venceu e que ainda nao foram notificadas.
 * `leadMinutes` vem das configuracoes e serve de fallback por tarefa.
 */
export function findTasksToNotify(userId: string, leadMinutes: number): Task[] {
  return queryAll<Row>(
    `SELECT * FROM tasks
     WHERE user_id = ? AND deleted_at IS NULL AND status <> 'done'
       AND due_at IS NOT NULL AND notified_at IS NULL
       AND datetime(due_at, '-' || COALESCE(NULLIF(remind_minutes_before, 0), ?) || ' minutes')
           <= datetime('now')
     ORDER BY due_at ASC`,
    [userId, leadMinutes]
  ).map(mapTask)
}

/** Marca a tarefa como notificada, para o alarme nao repetir a cada varredura. */
export function markNotified(userId: string, id: string): void {
  const timestamp = now()
  execute(
    'UPDATE tasks SET notified_at = ?, updated_at = ?, dirty = 1 WHERE id = ? AND user_id = ?',
    [timestamp, timestamp, id, userId]
  )
}
