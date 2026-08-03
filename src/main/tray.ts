import { Tray, Menu, app, nativeImage } from 'electron'
import { join } from 'node:path'
import { showWindow, navigateTo, setQuitting } from './window'
import { getSessionUserId } from './session'
import { runSync } from './sync/engine'

/**
 * Icone na bandeja do sistema.
 *
 * E o que permite o app "sumir" ao fechar a janela e mesmo assim continuar
 * disparando os alarmes das tarefas em segundo plano.
 */

let tray: Tray | null = null

function iconPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'icon.png')
    : join(__dirname, '../../build/icon.png')
}

export function createTray(): Tray {
  if (tray) return tray

  const image = nativeImage.createFromPath(iconPath())
  tray = new Tray(image.isEmpty() ? nativeImage.createEmpty() : image.resize({ width: 16, height: 16 }))

  tray.setToolTip('Task Manager')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Abrir Task Manager', click: () => showWindow() },
      { label: 'Nova tarefa', click: () => navigateTo('/tarefas?nova=1') },
      { type: 'separator' },
      {
        label: 'Sincronizar agora',
        click: () => {
          const userId = getSessionUserId()
          if (userId) void runSync(userId)
        }
      },
      { type: 'separator' },
      {
        label: 'Sair',
        click: () => {
          setQuitting(true)
          app.quit()
        }
      }
    ])
  )

  tray.on('double-click', () => showWindow())
  return tray
}

export function destroyTray(): void {
  tray?.destroy()
  tray = null
}
