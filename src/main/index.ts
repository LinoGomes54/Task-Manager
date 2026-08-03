import 'dotenv/config'
import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { initLocalDb, closeLocalDb } from './db/local'
import { registerIpcHandlers } from './ipc'
import { createWindow, showWindow, navigateTo, setQuitting, getMainWindow } from './window'
import { createTray, destroyTray } from './tray'
import { startScheduler, stopScheduler, setTaskOpenHandler } from './scheduler'
import { launchedHidden } from './auto-launch'
import { getSessionUserId } from './session'
import { getSettings } from './services/settings.service'
import { runSync, onSyncStateChange } from './sync/engine'
import { EVENTS } from '@shared/channels'

/**
 * Bootstrap do processo principal.
 *
 * Ordem importa: banco local → handlers IPC → janela → bandeja → alarme → sync.
 * O sync e sempre o ultimo e nunca bloqueia a abertura do app: sem internet ou
 * sem `DATABASE_URL`, o usuario ja esta trabalhando no cache local.
 */

const SYNC_INTERVAL_MS = 5 * 60 * 1000

let syncTimer: NodeJS.Timeout | null = null

/** Instancia unica: abrir o app de novo apenas traz a janela existente de volta. */
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => showWindow())

  app.whenReady().then(() => {
    electronApp.setAppUserModelId('com.lino.taskmanager')

    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    initLocalDb()
    registerIpcHandlers()

    createWindow({
      startHidden: launchedHidden() && closeToTrayEnabled(),
      closeToTray: closeToTrayEnabled
    })

    createTray()

    setTaskOpenHandler((taskId) => navigateTo(`/tarefas?tarefa=${taskId}`))
    startScheduler()

    onSyncStateChange((state) => {
      for (const window of BrowserWindow.getAllWindows()) {
        window.webContents.send(EVENTS.syncStateChanged, state)
      }
    })

    startPeriodicSync()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow({ startHidden: false, closeToTray: closeToTrayEnabled })
      } else {
        showWindow()
      }
    })
  })
}

/** Le a preferencia "fechar para a bandeja" do usuario logado (padrao: ligado). */
function closeToTrayEnabled(): boolean {
  const userId = getSessionUserId()
  if (!userId) return false
  try {
    return getSettings(userId).closeToTray
  } catch {
    return true
  }
}

function startPeriodicSync(): void {
  const trigger = (): void => {
    const userId = getSessionUserId()
    if (userId) void runSync(userId)
  }

  trigger()
  syncTimer = setInterval(trigger, SYNC_INTERVAL_MS)
}

// Sem `window-all-closed` fechando o app: no Windows ele fica na bandeja.
app.on('window-all-closed', () => {
  if (process.platform === 'darwin') return
  if (!getMainWindow()) app.quit()
})

app.on('before-quit', () => {
  setQuitting(true)
  stopScheduler()
  if (syncTimer) clearInterval(syncTimer)
  destroyTray()
  closeLocalDb()
})
