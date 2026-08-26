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

export function setQuitting(value: boolean): void {
  quitting = value
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

/** `true` so para `http` e `https` — o resto nao chega ao sistema operacional. */
function ehLinkWeb(url: string): boolean {
  try {
    const protocolo = new URL(url).protocol
    return protocolo === 'http:' || protocolo === 'https:'
  } catch {
    // URL malformada nao e link nenhum.
    return false
  }
}

export function createWindow(options: { startHidden: boolean; closeToTray: () => boolean }): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    // Piso do redimensionamento. A interface se adapta acima disso, mas abaixo
    // a grade do calendario e os filtros comecariam a se sobrepor — e melhor o
    // Windows impedir de encolher do que entregar um layout quebrado.
    minWidth: 900,
    minHeight: 640,
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

  /*
    Links externos abrem no navegador padrao, nunca dentro do app — e **so**
    `http` e `https`.

    `shell.openExternal` entrega a URL ao sistema operacional, que resolve o
    esquema. No Windows isso alcanca `file:`, `smb:` e os handlers de protocolo
    registrados por outros programas, entao uma URL vinda de dado sincronizado
    poderia disparar algo fora do app. A lista de permissao inverte o padrao:
    o que nao for web nao sai daqui.
  */
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (ehLinkWeb(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })

  /*
    A janela nunca navega para fora da propria interface.

    Sem esta trava, uma navegacao de topo carregaria uma pagina remota **com o
    preload anexado** — e `window.api`, que fala com o banco e com a sessao,
    ficaria exposto a essa origem. A CSP do `index.html` nao protege aqui: ela
    morre junto com o documento que a declara.
  */
  mainWindow.webContents.on('will-navigate', (evento, url) => {
    const atual = mainWindow?.webContents.getURL() ?? ''
    if (url === atual) return

    const interno =
      url.startsWith('file://') ||
      (process.env['ELECTRON_RENDERER_URL'] !== undefined &&
        url.startsWith(process.env['ELECTRON_RENDERER_URL']))

    if (interno) return

    evento.preventDefault()
    if (ehLinkWeb(url)) void shell.openExternal(url)
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
