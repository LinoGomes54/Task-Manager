import { BrowserWindow, shell } from 'electron'
import { join } from 'node:path'
import { is } from '@electron-toolkit/utils'
import { EVENTS } from '@shared/channels'

/**
 * Janela principal.
 *
 * `contextIsolation: true` + `nodeIntegration: false` + `sandbox: false` — o
 * renderer nao tem acesso a Node nem ao banco; tudo passa pelo preload. A
 * `DATABASE_URL` do Neon jamais cruza essa fronteira.
 */

let mainWindow: BrowserWindow | null = null
let quitting = false

export function isQuitting(): boolean {
  return quitting
}

export function setQuitting(value: boolean): void {
  quitting = value
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

export function createWindow(options: { startHidden: boolean; closeToTray: () => boolean }): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 940,
    minHeight: 620,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0b0f19',
    title: 'Task Manager',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    if (!options.startHidden) mainWindow?.show()
  })

  // Fechar vira "esconder na bandeja" para o alarme continuar rodando.
  mainWindow.on('close', (event) => {
    if (!quitting && options.closeToTray()) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Links externos abrem no navegador padrao, nunca dentro do app.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

/** Traz a janela de volta, recriando-a se ja tiver sido destruida. */
export function showWindow(): void {
  if (!mainWindow) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

/** Abre o app direto em uma rota — usado pelo clique na notificacao e pela bandeja. */
export function navigateTo(route: string): void {
  showWindow()
  mainWindow?.webContents.send(EVENTS.navigate, route)
}
