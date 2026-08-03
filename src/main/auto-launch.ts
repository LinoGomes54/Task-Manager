import { app } from 'electron'

/**
 * Inicializacao automatica junto com o login do Windows.
 *
 * Usa a API nativa do Electron (`setLoginItemSettings`), que grava em
 * `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` — a mesma chave que os
 * outros aplicativos usam e que aparece no Gerenciador de Tarefas > Inicializar.
 *
 * O app sobe com `--hidden`, entrando direto na bandeja: os alarmes comecam a
 * rodar sem uma janela pipocar na cara do usuario toda vez que ele liga o PC.
 *
 * Observacao: em modo de desenvolvimento `process.execPath` aponta para o
 * binario do Electron, nao para o app. O ajuste so tem efeito real depois de
 * instalar o `.exe` gerado por `npm run build:win`.
 */

export const HIDDEN_FLAG = '--hidden'

export function setAutoLaunch(enabled: boolean): void {
  app.setLoginItemSettings({
    openAtLogin: enabled,
    path: process.execPath,
    args: [HIDDEN_FLAG]
  })
}

/** Le o estado direto do SO, para a tela de configuracoes nunca mostrar algo falso. */
export function isAutoLaunchEnabled(): boolean {
  return app.getLoginItemSettings({ path: process.execPath, args: [HIDDEN_FLAG] }).openAtLogin
}

/** `true` quando o app foi aberto pelo autostart do Windows. */
export function launchedHidden(): boolean {
  return (
    process.argv.includes(HIDDEN_FLAG) ||
    app.getLoginItemSettings({ path: process.execPath, args: [HIDDEN_FLAG] }).wasOpenedAtLogin
  )
}
