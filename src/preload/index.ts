import { contextBridge, ipcRenderer } from 'electron'
import { CHANNELS, EVENTS } from '@shared/channels'
import type {
  AppSettings,
  AuthResult,
  Category,
  CreateCategoryInput,
  CreateTaskInput,
  DashboardStats,
  IpcResult,
  Session,
  SyncState,
  Task,
  TaskFilters,
  UpdateCategoryInput,
  UpdateTaskInput
} from '@shared/types'

/**
 * Superficie exposta ao renderer. E a unica coisa que a UI enxerga do Node —
 * nem `fs`, nem `ipcRenderer` cru, nem a connection string do Neon.
 *
 * `invoke` desembrulha o `IpcResult` e transforma `{ ok: false }` em `throw`,
 * para o React Query tratar erro do jeito normal dele.
 */

async function invoke<T>(channel: string, payload?: unknown): Promise<T> {
  const result = (await ipcRenderer.invoke(channel, payload)) as IpcResult<T>
  if (!result.ok) throw new Error(result.error)
  return result.data
}

function subscribe(channel: string, handler: (payload: never) => void): () => void {
  const listener = (_event: unknown, payload: never): void => handler(payload)
  ipcRenderer.on(channel, listener as never)
  return () => ipcRenderer.removeListener(channel, listener as never)
}

const api = {
  auth: {
    register: (input: { name: string; email: string; password: string }) =>
      invoke<AuthResult>(CHANNELS.auth.register, input),
    login: (input: { email: string; password: string }) =>
      invoke<AuthResult>(CHANNELS.auth.login, input),
    logout: () => invoke<boolean>(CHANNELS.auth.logout),
    getSession: () => invoke<Session | null>(CHANNELS.auth.getSession)
  },
  tasks: {
    list: (filters?: TaskFilters) => invoke<Task[]>(CHANNELS.tasks.list, filters ?? {}),
    create: (input: CreateTaskInput) => invoke<Task>(CHANNELS.tasks.create, input),
    update: (input: UpdateTaskInput) => invoke<Task>(CHANNELS.tasks.update, input),
    remove: (id: string) => invoke<boolean>(CHANNELS.tasks.remove, id),
    toggleComplete: (id: string) => invoke<Task>(CHANNELS.tasks.toggleComplete, id),
    toggleImportant: (id: string) => invoke<Task>(CHANNELS.tasks.toggleImportant, id),
    stats: () => invoke<DashboardStats>(CHANNELS.tasks.stats)
  },
  agenda: {
    list: (date: string) => invoke<Task[]>(CHANNELS.agenda.list, date),
    add: (taskId: string, date: string) => invoke<Task>(CHANNELS.agenda.add, { taskId, date }),
    remove: (taskId: string) => invoke<Task>(CHANNELS.agenda.remove, taskId),
    reorder: (date: string, taskId: string, to: number) =>
      invoke<Task[]>(CHANNELS.agenda.reorder, { date, taskId, to }),
    setDuration: (taskId: string, minutes: number) =>
      invoke<Task>(CHANNELS.agenda.setDuration, { taskId, minutes })
  },
  categories: {
    list: () => invoke<Category[]>(CHANNELS.categories.list),
    create: (input: CreateCategoryInput) => invoke<Category>(CHANNELS.categories.create, input),
    update: (input: UpdateCategoryInput) => invoke<Category>(CHANNELS.categories.update, input),
    remove: (id: string) => invoke<boolean>(CHANNELS.categories.remove, id)
  },
  settings: {
    get: () => invoke<AppSettings>(CHANNELS.settings.get),
    update: (patch: Partial<AppSettings>) => invoke<AppSettings>(CHANNELS.settings.update, patch)
  },
  sync: {
    getState: () => invoke<SyncState>(CHANNELS.sync.getState),
    runNow: () => invoke<SyncState>(CHANNELS.sync.runNow)
  },
  system: {
    getAutoLaunch: () => invoke<boolean>(CHANNELS.system.getAutoLaunch)
  },
  events: {
    onSyncStateChanged: (handler: (state: SyncState) => void) =>
      subscribe(EVENTS.syncStateChanged, handler as (payload: never) => void),
    onDataChanged: (handler: () => void) =>
      subscribe(EVENTS.dataChanged, handler as (payload: never) => void),
    onPlayAlarm: (handler: (payload: { taskId: string; title: string }) => void) =>
      subscribe(EVENTS.playAlarm, handler as (payload: never) => void),
    onNavigate: (handler: (route: string) => void) =>
      subscribe(EVENTS.navigate, handler as (payload: never) => void)
  }
}

export type AppApi = typeof api

contextBridge.exposeInMainWorld('api', api)
