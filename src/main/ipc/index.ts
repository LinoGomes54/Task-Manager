import { ipcMain, BrowserWindow } from 'electron'
import { CHANNELS, EVENTS } from '@shared/channels'
import type { IpcResult } from '@shared/types'
import { requireUserId } from '../session'
import * as auth from '../services/auth.service'
import * as tasks from '../services/tasks.service'
import * as categories from '../services/categories.service'
import * as settings from '../services/settings.service'
import { getSyncState, runSync, scheduleSync } from '../sync/engine'
import { setAutoLaunch, isAutoLaunchEnabled } from '../auto-launch'
import type { AppSettings, CreateCategoryInput, CreateTaskInput, TaskFilters, UpdateCategoryInput, UpdateTaskInput } from '@shared/types'

/**
 * Ponte entre o renderer e o processo principal.
 *
 * Todo handler devolve `IpcResult<T>` — nunca lanca para o outro lado. Isso
 * evita que uma excecao vire uma mensagem crua e ilegivel na UI e permite tratar
 * erro de negocio ("e-mail ja cadastrado") e falha tecnica do mesmo jeito.
 */

function broadcast(channel: string, payload?: unknown): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(channel, payload)
  }
}

/** Sinaliza ao renderer que os dados mudaram e agenda o envio ao Neon. */
function afterMutation(userId: string): void {
  broadcast(EVENTS.dataChanged)
  scheduleSync(userId)
}

function handle<T>(channel: string, fn: (...args: never[]) => T | Promise<T>): void {
  ipcMain.handle(channel, async (_event, ...args): Promise<IpcResult<T>> => {
    try {
      return { ok: true, data: await fn(...(args as never[])) }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  })
}

export function registerIpcHandlers(): void {
  /* ---------------------------- auth ---------------------------- */

  handle(CHANNELS.auth.register, async (input: { name: string; email: string; password: string }) => {
    const result = await auth.register(input.name, input.email, input.password)
    void runSync(result.user.id)
    return result
  })

  handle(CHANNELS.auth.login, async (input: { email: string; password: string }) => {
    const result = await auth.login(input.email, input.password)
    void runSync(result.user.id)
    return result
  })

  handle(CHANNELS.auth.logout, () => {
    auth.logout()
    return true
  })

  handle(CHANNELS.auth.getSession, () => auth.getCurrentSession())

  /* --------------------------- tarefas -------------------------- */

  handle(CHANNELS.tasks.list, (filters: TaskFilters = {}) => tasks.listTasks(requireUserId(), filters))

  handle(CHANNELS.tasks.create, (input: CreateTaskInput) => {
    const userId = requireUserId()
    const task = tasks.createTask(userId, input)
    afterMutation(userId)
    return task
  })

  handle(CHANNELS.tasks.update, (input: UpdateTaskInput) => {
    const userId = requireUserId()
    const task = tasks.updateTask(userId, input)
    afterMutation(userId)
    return task
  })

  handle(CHANNELS.tasks.remove, (id: string) => {
    const userId = requireUserId()
    tasks.removeTask(userId, id)
    afterMutation(userId)
    return true
  })

  handle(CHANNELS.tasks.toggleComplete, (id: string) => {
    const userId = requireUserId()
    const task = tasks.toggleComplete(userId, id)
    afterMutation(userId)
    return task
  })

  handle(CHANNELS.tasks.toggleImportant, (id: string) => {
    const userId = requireUserId()
    const task = tasks.toggleImportant(userId, id)
    afterMutation(userId)
    return task
  })

  handle(CHANNELS.tasks.stats, () => tasks.getStats(requireUserId()))

  /* --------------------------- agenda --------------------------- */

  handle(CHANNELS.agenda.list, (date: string) => tasks.listAgenda(requireUserId(), date))

  handle(CHANNELS.agenda.add, (input: { taskId: string; date: string }) => {
    const userId = requireUserId()
    const task = tasks.addToAgenda(userId, input.taskId, input.date)
    afterMutation(userId)
    return task
  })

  handle(CHANNELS.agenda.remove, (taskId: string) => {
    const userId = requireUserId()
    const task = tasks.removeFromAgenda(userId, taskId)
    afterMutation(userId)
    return task
  })

  handle(CHANNELS.agenda.reorder, (input: { date: string; taskId: string; to: number }) => {
    const userId = requireUserId()
    const lista = tasks.reorderAgenda(userId, input.date, input.taskId, input.to)
    afterMutation(userId)
    return lista
  })

  handle(CHANNELS.agenda.setDuration, (input: { taskId: string; minutes: number }) => {
    const userId = requireUserId()
    const task = tasks.setDuration(userId, input.taskId, input.minutes)
    afterMutation(userId)
    return task
  })

  handle(
    CHANNELS.agenda.applySchedule,
    (input: { date: string; items: Array<{ taskId: string; dueAt: string }> }) => {
      const userId = requireUserId()
      const lista = tasks.applySchedule(userId, input.date, input.items)
      afterMutation(userId)
      return lista
    }
  )

  /* -------------------------- categorias ------------------------ */

  handle(CHANNELS.categories.list, () => categories.listCategories(requireUserId()))

  handle(CHANNELS.categories.create, (input: CreateCategoryInput) => {
    const userId = requireUserId()
    const category = categories.createCategory(userId, input)
    afterMutation(userId)
    return category
  })

  handle(CHANNELS.categories.update, (input: UpdateCategoryInput) => {
    const userId = requireUserId()
    const category = categories.updateCategory(userId, input)
    afterMutation(userId)
    return category
  })

  handle(CHANNELS.categories.remove, (id: string) => {
    const userId = requireUserId()
    categories.removeCategory(userId, id)
    afterMutation(userId)
    return true
  })

  /* ------------------------ configuracoes ----------------------- */

  handle(CHANNELS.settings.get, () => settings.getSettings(requireUserId()))

  handle(CHANNELS.settings.update, (patch: Partial<AppSettings>) => {
    const userId = requireUserId()

    // O autostart e estado do sistema operacional, nao so uma linha no banco.
    if (patch.autoLaunch !== undefined) setAutoLaunch(patch.autoLaunch)

    const updated = settings.updateSettings(userId, patch)
    afterMutation(userId)
    return updated
  })

  /* --------------------------- sync ----------------------------- */

  handle(CHANNELS.sync.getState, () => getSyncState())

  handle(CHANNELS.sync.runNow, async () => {
    const state = await runSync(requireUserId())
    broadcast(EVENTS.dataChanged)
    return state
  })

  /* -------------------------- sistema --------------------------- */

  handle(CHANNELS.system.getAutoLaunch, () => isAutoLaunchEnabled())
}
