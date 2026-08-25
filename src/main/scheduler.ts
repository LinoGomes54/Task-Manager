import { Notification, BrowserWindow } from 'electron'
import { completeExpired, findTasksToNotify, markNotified } from './services/tasks.service'
import { getSettings } from './services/settings.service'
import { getSessionUserId } from './session'
import { EVENTS } from '@shared/channels'

/**
 * Alarme das tarefas com prazo.
 *
 * Roda no processo principal — e nao no renderer — de proposito: com o app
 * minimizado na bandeja e a janela destruida, o alarme continua disparando.
 *
 * A cada varredura busca tarefas nao concluidas cujo horario de lembrete
 * (`due_at` menos `remind_minutes_before`) ja passou e que ainda nao foram
 * notificadas, dispara o toast nativo do Windows e marca `notified_at` para
 * nao repetir na varredura seguinte.
 */

const INTERVAL_MS = 30_000

let timer: NodeJS.Timeout | null = null
let onOpenTask: ((taskId: string) => void) | null = null

export function setTaskOpenHandler(handler: (taskId: string) => void): void {
  onOpenTask = handler
}

function formatDue(dueAt: string | null): string {
  if (!dueAt) return ''
  return new Date(dueAt).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function tick(): void {
  const userId = getSessionUserId()
  if (!userId) return

  // Fecha as tarefas de conclusao automatica cujo tempo acabou. Vem antes das
  // notificacoes e fora do `notificationsEnabled`: desligar os avisos nao deveria
  // deixar "dormir" pendente para sempre.
  try {
    if (completeExpired(userId).length > 0) {
      for (const window of BrowserWindow.getAllWindows()) {
        window.webContents.send(EVENTS.dataChanged)
      }
    }
  } catch {
    // Uma falha aqui nao pode impedir o alarme de rodar.
  }

  let settings: ReturnType<typeof getSettings>
  try {
    settings = getSettings(userId)
  } catch {
    return
  }
  if (!settings.notificationsEnabled) return
  if (!Notification.isSupported()) return

  for (const task of findTasksToNotify(userId, settings.reminderLeadMinutes)) {
    const overdue = task.dueAt !== null && new Date(task.dueAt).getTime() < Date.now()

    const notification = new Notification({
      title: overdue ? 'Tarefa vencida' : 'Lembrete de tarefa',
      body: `${task.title}${task.dueAt ? ` — ${formatDue(task.dueAt)}` : ''}`,
      silent: !settings.soundEnabled,
      urgency: task.isImportant ? 'critical' : 'normal'
    })

    notification.on('click', () => onOpenTask?.(task.id))
    notification.show()

    // O som customizado toca no renderer, que tem acesso ao <audio>.
    // Sem janela aberta, o proprio toast do Windows ja emite o som padrao.
    if (settings.soundEnabled) {
      for (const window of BrowserWindow.getAllWindows()) {
        window.webContents.send(EVENTS.playAlarm, { taskId: task.id, title: task.title })
      }
    }

    markNotified(userId, task.id)
  }
}

export function startScheduler(): void {
  if (timer) return
  tick()
  timer = setInterval(tick, INTERVAL_MS)
}

export function stopScheduler(): void {
  if (timer) clearInterval(timer)
  timer = null
}
