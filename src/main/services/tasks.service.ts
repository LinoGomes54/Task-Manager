import { queryAll, queryOne, execute, transaction, now, newId, toBool } from '../db/local'
import { getSettings } from './settings.service'
import { completionBlock } from '@shared/task-rules'
import { conflitosDe, mensagemDeConflito } from '@shared/conflicts'
import type {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilters,
  DashboardStats,
  TaskPriority,
  TaskStatus,
  TaskKind,
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
    kind: String(row.kind) as TaskKind,
    durationMinutes: Number(row.duration_minutes),
    autoComplete: toBool(row.auto_complete),
    breakAfterMinutes: Number(row.break_after_minutes),
    focusMinutes: Number(row.focus_minutes),
    cycleBreakMinutes: Number(row.cycle_break_minutes),
    agendaDate: row.agenda_date === null ? null : String(row.agenda_date),
    agendaPosition: Number(row.agenda_position),
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
    // Aspas SIMPLES no literal vazio: em SQLite, "" e um identificador entre
    // aspas, nao uma string. O `node:sqlite` roda com o modo estrito, entao a
    // consulta inteira falhava com `no such column: ""` — e a busca nunca
    // devolvia nada, sem erro visivel na tela.
    where.push("(lower(title) LIKE ? OR lower(ifnull(description, '')) LIKE ?)")
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
  if (filters.kind) {
    where.push('kind = ?')
    params.push(filters.kind)
  } else if (!filters.includeDates) {
    // Data marcada so aparece para quem pede: ela nao e uma pendencia, e nas
    // listas de tarefas inflaria o contador de coisas em aberto sem que houvesse
    // nada a fazer.
    where.push("kind <> 'date'")
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

/**
 * Recusa a gravacao quando o horario ja e de outra tarefa.
 *
 * A checagem e do lado do servidor e nao so do formulario: tarefas tambem entram
 * pelo encadeamento do dia e pela sincronizacao, e por esses caminhos ninguem
 * veria um aviso na tela.
 *
 * So olha o dia da propria tarefa — comparar com a agenda inteira seria varrer
 * o historico a cada gravacao sem nenhum ganho.
 */
function recusarSeConflitar(userId: string, candidata: Task): void {
  if (!candidata.dueAt) return
  if (candidata.kind !== 'task') return

  const inicio = new Date(candidata.dueAt)
  const de = new Date(inicio)
  de.setDate(de.getDate() - 1)
  de.setHours(0, 0, 0, 0)
  const ate = new Date(inicio)
  ate.setHours(23, 59, 59, 999)

  const vizinhas = queryAll<Row>(
    `SELECT * FROM tasks
      WHERE user_id = ? AND deleted_at IS NULL AND kind = 'task'
        AND due_at IS NOT NULL AND due_at >= ? AND due_at <= ?`,
    [userId, de.toISOString(), ate.toISOString()]
  ).map(mapTask)

  const conflitos = conflitosDe(candidata, vizinhas)
  if (conflitos.length > 0) throw new Error(mensagemDeConflito(conflitos))
}

export function createTask(userId: string, input: CreateTaskInput): Task {
  const title = input.title.trim()
  if (!title) throw new Error('O título da tarefa é obrigatório.')

  const id = newId()
  const timestamp = now()

  // Monta a tarefa como ela ficaria e confere o horario antes de gravar: assim
  // uma recusa nao deixa linha nenhuma para tras.
  recusarSeConflitar(userId, {
    id,
    userId,
    categoryId: input.categoryId ?? null,
    title,
    description: null,
    priority: input.priority ?? 'medium',
    status: input.status ?? 'pending',
    isImportant: input.isImportant ?? false,
    dueAt: input.dueAt ?? null,
    remindMinutesBefore: input.remindMinutesBefore ?? 15,
    notifiedAt: null,
    completedAt: null,
    recurrence: input.recurrence ?? 'none',
    recurrenceInterval: input.recurrenceInterval ?? 1,
    recurrenceWeekdays: input.recurrenceWeekdays ?? [],
    recurrenceUntil: input.recurrenceUntil ?? null,
    parentTaskId: null,
    kind: input.kind ?? 'task',
    durationMinutes: input.durationMinutes ?? 25,
    autoComplete: input.autoComplete ?? false,
    breakAfterMinutes: input.breakAfterMinutes ?? 0,
    focusMinutes: input.focusMinutes ?? 0,
    cycleBreakMinutes: input.cycleBreakMinutes ?? 0,
    agendaDate: input.agendaDate ?? null,
    agendaPosition: input.agendaPosition ?? 0,
    createdAt: timestamp,
    updatedAt: timestamp
  })

  execute(
    `INSERT INTO tasks (
       id, user_id, category_id, title, description, priority, status, is_important,
       due_at, remind_minutes_before, recurrence, recurrence_interval, recurrence_weekdays,
       recurrence_until, parent_task_id, kind, duration_minutes, auto_complete,
       break_after_minutes, focus_minutes, cycle_break_minutes,
       agenda_date, agenda_position, created_at, updated_at, dirty
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
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
      input.kind ?? 'task',
      input.durationMinutes ?? 25,
      input.autoComplete ?? false,
      input.breakAfterMinutes ?? 0,
      input.focusMinutes ?? 0,
      input.cycleBreakMinutes ?? 0,
      input.agendaDate ?? null,
      input.agendaPosition ?? 0,
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
  recurrenceUntil: 'recurrence_until',
  kind: 'kind',
  durationMinutes: 'duration_minutes',
  autoComplete: 'auto_complete',
  breakAfterMinutes: 'break_after_minutes',
  focusMinutes: 'focus_minutes',
  cycleBreakMinutes: 'cycle_break_minutes',
  agendaDate: 'agenda_date',
  agendaPosition: 'agenda_position'
} as const

export function updateTask(userId: string, input: UpdateTaskInput): Task {
  const existing = getTask(userId, input.id)
  if (!existing) throw new Error('Tarefa não encontrada.')

  // O choque e avaliado sobre como a tarefa VAI ficar, e nao como estava: mudar
  // so a duracao tambem pode fazer ela invadir a proxima.
  recusarSeConflitar(userId, { ...existing, ...input } as Task)

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

  const completing = task.status !== 'done'

  // A interface ja desabilita o controle; esta checagem existe porque o backend
  // nao pode confiar em validacao feita do outro lado do IPC. So vale ao
  // concluir: reabrir nunca e bloqueado.
  if (completing) {
    const bloqueio = completionBlock(task, getSettings(userId).lockFutureRecurring)
    if (bloqueio) throw new Error(bloqueio)
  }

  const timestamp = now()

  execute(
    `UPDATE tasks SET status = ?, completed_at = ?, updated_at = ?, dirty = 1
     WHERE id = ? AND user_id = ?`,
    [completing ? 'done' : 'pending', completing ? timestamp : null, timestamp, id, userId]
  )

  if (completing && task.recurrence !== 'none') createNextOccurrence(userId, task)

  return getTask(userId, id)!
}

/**
 * Conclui sozinhas as tarefas marcadas para isso cujo bloco ja terminou.
 *
 * Roda no processo principal junto com o alarme, e nao no renderer, porque
 * "dormir das 23h as 7h" precisa ser fechada as 7h mesmo com o app na bandeja e
 * a janela destruida.
 *
 * O corte e o **fim** do bloco (`due_at` + duracao). Tudo numa transacao: a
 * varredura pode fechar varias tarefas de uma vez, e meia conclusao gravada
 * deixaria a recorrencia sem a proxima ocorrencia.
 */
export function completeExpired(userId: string): Task[] {
  const candidatos = queryAll<Row>(
    `SELECT * FROM tasks
      WHERE user_id = ? AND deleted_at IS NULL AND auto_complete = 1
        AND status != 'done' AND due_at IS NOT NULL`,
    [userId]
  ).map(mapTask)

  const agora = Date.now()
  const vencidas = candidatos.filter((task) => {
    const fim =
      new Date(task.dueAt!).getTime() + Math.max(1, task.durationMinutes) * 60_000
    if (fim > agora) return false

    // Quem mexeu na tarefa DEPOIS do fim do bloco decidiu algo sobre ela — em
    // geral reabrindo. Fechar de novo na varredura seguinte anularia a decisao,
    // e a tarefa voltaria sozinha para "feita" alguns segundos depois.
    return new Date(task.updatedAt).getTime() <= fim
  })

  if (vencidas.length === 0) return []

  const timestamp = now()
  transaction(() => {
    for (const task of vencidas) {
      execute(
        `UPDATE tasks SET status = 'done', completed_at = ?, updated_at = ?, dirty = 1
          WHERE id = ? AND user_id = ?`,
        [timestamp, timestamp, task.id, userId]
      )
      if (task.recurrence !== 'none') createNextOccurrence(userId, task)
    }
  })

  return vencidas.map((task) => getTask(userId, task.id)!).filter(Boolean)
}

/**
 * Empurra para o proximo ano as datas anuais que ja passaram.
 *
 * Um aniversario nao e "concluido" — ele acontece e volta no ano seguinte. Sem
 * isso a lista de datas mostraria para sempre o aniversario do ano passado, e o
 * aviso de "faltam 7 dias" nunca mais dispararia.
 *
 * `notified_at` volta a NULL porque a data e outra: o aviso precisa poder tocar
 * de novo na proxima vez.
 */
export function rollForwardDates(userId: string): number {
  const candidatas = queryAll<Row>(
    `SELECT * FROM tasks
      WHERE user_id = ? AND deleted_at IS NULL AND kind = 'date'
        AND recurrence = 'yearly' AND status != 'done' AND due_at IS NOT NULL`,
    [userId]
  ).map(mapTask)

  const inicioDeHoje = new Date()
  inicioDeHoje.setHours(0, 0, 0, 0)

  const vencidas = candidatas.filter(
    (task) => new Date(task.dueAt!).getTime() < inicioDeHoje.getTime()
  )
  if (vencidas.length === 0) return 0

  const timestamp = now()
  transaction(() => {
    for (const task of vencidas) {
      const proxima = new Date(task.dueAt!)
      // Avanca ano a ano ate alcancar hoje: uma data parada ha tres anos precisa
      // de tres saltos, e um salto so a deixaria ainda no passado.
      while (proxima.getTime() < inicioDeHoje.getTime()) {
        proxima.setFullYear(proxima.getFullYear() + 1)
      }

      execute(
        `UPDATE tasks SET due_at = ?, notified_at = NULL, updated_at = ?, dirty = 1
          WHERE id = ? AND user_id = ?`,
        [proxima.toISOString(), timestamp, task.id, userId]
      )
    }
  })

  return vencidas.length
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
function advanceDate(
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
       recurrence_until, parent_task_id, kind, duration_minutes, auto_complete,
       break_after_minutes, focus_minutes, cycle_break_minutes,
       agenda_date, agenda_position, created_at, updated_at, dirty
     ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, ?, ?, 1)`,
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
      task.kind,
      task.durationMinutes,
      // A conclusao automatica acompanha a repeticao: uma diaria de dormir que
      // so fechasse sozinha na primeira noite pediria o clique em todas as outras.
      task.autoComplete,
      task.breakAfterMinutes,
      task.focusMinutes,
      task.cycleBreakMinutes,
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


/* ------------------------------------------------------------------ */
/* Agenda do dia                                                       */
/* ------------------------------------------------------------------ */

/**
 * Tarefas planejadas para um dia, na ordem em que serao feitas.
 *
 * Os horarios nao saem daqui: sao calculados a partir desta ordem em
 * `shared/agenda.ts`. Guardar horario por linha obrigaria a reescrever a agenda
 * inteira a cada reordenacao.
 */
export function listAgenda(userId: string, date: string): Task[] {
  return queryAll<Row>(
    `SELECT * FROM tasks
     WHERE user_id = ? AND deleted_at IS NULL AND agenda_date = ?
     ORDER BY agenda_position ASC, created_at ASC`,
    [userId, date]
  ).map(mapTask)
}

/** Coloca a tarefa no fim da agenda do dia. */
export function addToAgenda(userId: string, taskId: string, date: string): Task {
  const ultimo = queryOne<{ pos: number | null }>(
    `SELECT MAX(agenda_position) AS pos FROM tasks
     WHERE user_id = ? AND deleted_at IS NULL AND agenda_date = ?`,
    [userId, date]
  )
  const proxima = (ultimo?.pos ?? -1) + 1
  const timestamp = now()

  execute(
    `UPDATE tasks SET agenda_date = ?, agenda_position = ?, updated_at = ?, dirty = 1
     WHERE id = ? AND user_id = ?`,
    [date, proxima, timestamp, taskId, userId]
  )
  return getTask(userId, taskId)!
}

export function removeFromAgenda(userId: string, taskId: string): Task {
  const timestamp = now()
  execute(
    `UPDATE tasks SET agenda_date = NULL, agenda_position = 0, updated_at = ?, dirty = 1
     WHERE id = ? AND user_id = ?`,
    [timestamp, taskId, userId]
  )
  return getTask(userId, taskId)!
}

/**
 * Move uma tarefa para outra posicao e renumera a agenda inteira.
 *
 * A renumeracao completa evita buracos e empates de posicao, que fariam a ordem
 * depender do desempate por `created_at` e mudar sozinha.
 */
export function reorderAgenda(userId: string, date: string, taskId: string, para: number): Task[] {
  const atual = listAgenda(userId, date)
  const de = atual.findIndex((t) => t.id === taskId)
  if (de === -1) return atual

  const destino = Math.max(0, Math.min(para, atual.length - 1))
  const [movida] = atual.splice(de, 1)
  atual.splice(destino, 0, movida)

  const timestamp = now()
  transaction(() => {
    atual.forEach((task, index) => {
      execute(
        `UPDATE tasks SET agenda_position = ?, updated_at = ?, dirty = 1
         WHERE id = ? AND user_id = ?`,
        [index, timestamp, task.id, userId]
      )
    })
  })

  return listAgenda(userId, date)
}

/** Ajusta quanto tempo a tarefa ocupa na agenda. */
export function setDuration(userId: string, taskId: string, minutes: number): Task {
  const minutos = Math.max(1, Math.min(600, Math.round(minutes)))
  execute(
    'UPDATE tasks SET duration_minutes = ?, updated_at = ?, dirty = 1 WHERE id = ? AND user_id = ?',
    [minutos, now(), taskId, userId]
  )
  return getTask(userId, taskId)!
}

/**
 * Grava de uma vez os horarios calculados pelo encadeamento.
 *
 * Numa transacao so: aplicar tarefa por tarefa deixaria a agenda meio montada
 * se algo falhasse no meio, com metade dos horarios novos e metade dos antigos.
 *
 * `notified_at` volta a NULL porque o horario mudou — o alarme precisa poder
 * disparar de novo no horario certo.
 */
export function applySchedule(
  userId: string,
  date: string,
  items: Array<{ taskId: string; dueAt: string }>
): Task[] {
  const timestamp = now()

  transaction(() => {
    items.forEach((item, index) => {
      execute(
        `UPDATE tasks
            SET due_at = ?, agenda_date = ?, agenda_position = ?, notified_at = NULL,
                updated_at = ?, dirty = 1
          WHERE id = ? AND user_id = ?`,
        [item.dueAt, date, index, timestamp, item.taskId, userId]
      )
    })
  })

  return listAgenda(userId, date)
}
